
import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { DocumentoError } from "@/lib/documentos";
import { enviarLoteAFirma } from "@/lib/zapsign";

interface Body {
  ids?: string[];
  firmante?: { nombre?: string; email?: string | null; celular?: string | null };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const radicado = req.nextUrl.searchParams.get("radicado") ?? "";
  if (!radicado) {
    return NextResponse.json(
      { ok: false, message: "Parámetro 'radicado' requerido." },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cuerpo inválido." },
      { status: 400 },
    );
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, message: "El parámetro 'ids' es requerido." },
      { status: 400 },
    );
  }

  const nombre = body.firmante?.nombre?.trim();
  if (!nombre) {
    return NextResponse.json(
      { ok: false, message: "El nombre del firmante es obligatorio." },
      { status: 400 },
    );
  }

  try {
    const result = await enviarLoteAFirma({
      documentoIds: ids,
      radicado,
      firmante: {
        nombre,
        email: body.firmante?.email ?? null,
        celular: body.firmante?.celular ?? null,
      },
      // El correo es el único canal: WhatsApp consumía créditos de ZapSign y se
      // retiró de la UI. `enviarLoteAFirma` sigue soportando ambos, pero no se
      // expone por API para que no se active sin querer desde un cliente.
      canales: { email: true, whatsapp: false },
      enviadoPor: session.user.email ?? null,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof DocumentoError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[documentos/firmar-lote]", error);
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
