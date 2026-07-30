import { NextRequest, NextResponse } from "next/server";

import {
  WEBHOOK_SECRET,
  procesarWebhook,
  type ZapSignWebhookPayload,
} from "@/lib/zapsign";

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[webhook/zapsign] ZAPSIGN_WEBHOOK_SECRET no configurado.");
    return NextResponse.json(
      { ok: false, message: "Webhook no configurado." },
      { status: 503 },
    );
  }

  const secret =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-webhook-secret") ??
    "";
  if (secret !== WEBHOOK_SECRET) {
    // 404 en lugar de 401: no revela que la ruta existe.
    return NextResponse.json(
      { ok: false, message: "No encontrado." },
      { status: 404 },
    );
  }

  let payload: ZapSignWebhookPayload;
  try {
    payload = (await req.json()) as ZapSignWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cuerpo inválido." },
      { status: 400 },
    );
  }

  try {
    const outcome = await procesarWebhook(payload);
    if (!outcome.handled) {
      // Token desconocido o payload incompleto: no sirve reintentar, pero queda
      // el log para diagnóstico.
      console.warn("[webhook/zapsign] no procesado:", outcome.detail);
      return NextResponse.json({ ok: true, ignored: outcome.detail });
    }
    console.info(`[webhook/zapsign] ${outcome.action}: ${outcome.detail}`);
    return NextResponse.json({ ok: true, action: outcome.action });
  } catch (error: unknown) {
    // Error real (BD caída, Azure inaccesible): 500 para que ZapSign reintente.
    console.error("[webhook/zapsign]", error);
    return NextResponse.json(
      { ok: false, message: "Error procesando el evento." },
      { status: 500 },
    );
  }
}
