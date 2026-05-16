import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
        return NextResponse.json({ ok: false, message: "El correo es obligatorio." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (!profile) {
        return NextResponse.json(
            { ok: false, message: "No encontramos una cuenta con ese correo." },
            { status: 404 },
        );
    }

    return NextResponse.json({ ok: true });
}
