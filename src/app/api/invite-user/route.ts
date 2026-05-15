import { NextRequest, NextResponse } from "next/server";
import { inviteUser } from "@/lib/api/invitations";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Rate limiter en memoria: IP → { count, resetAt }
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_MAX) return true;
    entry.count++;
    return false;
}

export async function POST(req: NextRequest) {
    // 1. Rate limiting por IP
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
        return NextResponse.json(
            {
                ok: false,
                code: "rate_limited",
                message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar.",
            },
            { status: 429 },
        );
    }

    // 2. Verificar sesión y rol del solicitante
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
        return NextResponse.json(
            { ok: false, code: "unauthorized", message: "No autorizado." },
            { status: 401 },
        );
    }

    const admin = getSupabaseAdmin();
    const {
        data: { user: caller },
        error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !caller) {
        return NextResponse.json(
            { ok: false, code: "unauthorized", message: "Sesión inválida." },
            { status: 401 },
        );
    }

    const { data: callerProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

    if (callerProfile?.role !== "admin") {
        return NextResponse.json(
            {
                ok: false,
                code: "forbidden",
                message: "No tienes permisos para invitar usuarios.",
            },
            { status: 403 },
        );
    }

    // 3. Validar body
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, code: "invalid_json", message: "Body inválido." },
            { status: 400 },
        );
    }

    const email: string | undefined = body?.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
        return NextResponse.json(
            {
                ok: false,
                code: "invalid_email",
                message: "El email es requerido y debe ser válido.",
            },
            { status: 400 },
        );
    }

    const username: string | undefined =
        typeof body?.username === "string" && body.username.trim()
            ? body.username.trim()
            : undefined;

    const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        req.headers.get("origin") ||
        "http://localhost:3000";

    const result = await inviteUser({ email, username, appOrigin: origin });

    const status = result.ok
        ? 200
        : result.code === "invalid_email"
            ? 400
            : result.code === "exists"
                ? 409
                : 500;

    return NextResponse.json(result, { status });
}
