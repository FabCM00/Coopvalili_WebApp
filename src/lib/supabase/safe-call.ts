import type { SafeError, SafeResult } from "./types";

export interface SafeCallOptions {
    label: string;
    timeoutMs?: number;
    debug?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const isDev =
    typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

export async function safeCall<T>(
    fn: () => Promise<{ data: T | null; error: any } | T>,
    options: SafeCallOptions,
): Promise<SafeResult<T>> {
    const { label, timeoutMs = DEFAULT_TIMEOUT_MS, debug = isDev } = options;
    const start = Date.now();

    if (debug) console.log("[supabase] -> " + label);

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<SafeResult<T>>((resolve) => {
        timeoutHandle = setTimeout(() => {
            const err: SafeError = {
                code: "timeout",
                message: 'La operacion "' + label + '" supero el limite de ' + timeoutMs + "ms.",
            };
            if (debug) console.warn("[supabase] x " + label + " TIMEOUT after " + timeoutMs + "ms");
            resolve({ ok: false, error: err });
        }, timeoutMs);
    });

    const work = (async (): Promise<SafeResult<T>> => {
        try {
            const result = await fn();
            if (
                result !== null &&
                typeof result === "object" &&
                ("data" in (result as object) || "error" in (result as object))
            ) {
                const r = result as { data: T | null; error: any };
                if (r.error) {
                    return { ok: false, error: classifySupabaseError(r.error) };
                }
                return { ok: true, data: r.data as T };
            }
            return { ok: true, data: result as T };
        } catch (e: any) {
            return { ok: false, error: classifyException(e) };
        }
    })();

    const winner = await Promise.race([work, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (debug) {
        const elapsed = Date.now() - start;
        if (winner.ok) {
            console.log("[supabase] OK " + label + " (" + elapsed + "ms)");
        } else if (winner.error.code !== "timeout") {
            console.warn("[supabase] x " + label + " (" + elapsed + "ms)", winner.error.code, winner.error.message);
        }
    }

    return winner;
}

function classifySupabaseError(err: any): SafeError {
    const message: string = err?.message || err?.error_description || err?.msg || "Error desconocido";
    const status: number | undefined = err?.status;
    const code: string | undefined = err?.code;

    if (code === "PGRST116" || status === 404) return { code: "not_found", message, cause: err };
    if (status === 401 || status === 403 || /invalid.*credentials/i.test(message) || /jwt/i.test(message) || /not authenticated/i.test(message)) {
        return { code: "auth", message, cause: err };
    }
    if (status && status >= 400 && status < 500) return { code: "validation", message, cause: err };
    if (status && status >= 500) return { code: "server", message, cause: err };
    return { code: "unknown", message, cause: err };
}

function classifyException(e: any): SafeError {
    if (e?.name === "AbortError") return { code: "timeout", message: "La operacion fue cancelada.", cause: e };
    if (e?.name === "TypeError" && /fetch|network/i.test(e?.message ?? "")) {
        return { code: "network", message: "No se pudo conectar al servidor.", cause: e };
    }
    return { code: "unknown", message: e?.message ?? String(e), cause: e };
}
