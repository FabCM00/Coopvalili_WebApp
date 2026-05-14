import type { Session, User } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";
import { safeCall } from "./safe-call";
import type { SafeResult } from "./types";

/**
 * Capa de auth de la app. Toda interaccion con `supabase.auth` deberia pasar
 * por aqui. Cada funcion devuelve SafeResult uniforme y tiene timeout.
 *
 * Nota sobre updatePassword: usa fetch directo al endpoint REST en vez de
 * `supabase.auth.updateUser`. Razon: updateUser adquiere un lock interno del
 * SDK, y si algun listener en onAuthStateChange ejecuta otra llamada al
 * cliente (consultar profiles, etc), se produce un deadlock que cuelga la
 * operacion indefinidamente. Esto es un comportamiento conocido del SDK.
 * Bypass por REST = inmune al deadlock.
 */

export async function signIn(
    email: string,
    password: string,
): Promise<SafeResult<{ session: Session; user: User }>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) return { data: null, error };
            if (!data.session || !data.user) {
                return {
                    data: null,
                    error: { message: "Sesion vacia tras signIn." },
                };
            }
            return {
                data: { session: data.session, user: data.user },
                error: null,
            };
        },
        { label: "auth.signIn" },
    );
}

export async function signUp(
    email: string,
    password: string,
    username: string,
): Promise<SafeResult<{ user: User | null; session: Session | null }>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });
            if (error) return { data: null, error };
            return { data, error: null };
        },
        { label: "auth.signUp" },
    );
}

export async function signOut(
    scope: "global" | "local" | "others" = "local",
): Promise<SafeResult<true>> {
    return safeCall(
        async () => {
            const { error } = await supabase.auth.signOut({ scope });
            if (error) return { data: null, error };
            return { data: true as const, error: null };
        },
        { label: "auth.signOut", timeoutMs: 8_000 },
    );
}

export async function getSession(): Promise<SafeResult<Session | null>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) return { data: null, error };
            return { data: data.session, error: null };
        },
        { label: "auth.getSession", timeoutMs: 5_000 },
    );
}

/**
 * Establece manualmente una sesion a partir de tokens (los del hash del
 * email de invitacion / recuperacion de contrasena).
 */
export async function setSessionFromTokens(
    access_token: string,
    refresh_token: string,
): Promise<SafeResult<Session>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });
            if (error) return { data: null, error };
            if (!data.session) {
                return {
                    data: null,
                    error: { message: "Sesion no establecida." },
                };
            }
            return { data: data.session, error: null };
        },
        { label: "auth.setSessionFromTokens", timeoutMs: 10_000 },
    );
}

/**
 * Actualiza la contrasena del usuario. Llama al endpoint REST directamente
 * para evitar el deadlock del SDK con AuthContext.
 */
export async function updatePassword(
    password: string,
    accessToken?: string,
): Promise<SafeResult<true>> {
    return safeCall(
        async () => {
            let token = accessToken;
            if (!token) {
                const { data } = await supabase.auth.getSession();
                token = data.session?.access_token;
            }
            if (!token) {
                return {
                    data: null,
                    error: {
                        status: 401,
                        message: "No hay sesion activa.",
                    },
                };
            }

            const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + token,
                    apikey: SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                return {
                    data: null,
                    error: {
                        status: res.status,
                        message:
                            body?.msg ||
                            body?.error_description ||
                            body?.message ||
                            "HTTP " + res.status,
                    },
                };
            }
            return { data: true as const, error: null };
        },
        { label: "auth.updatePassword" },
    );
}
