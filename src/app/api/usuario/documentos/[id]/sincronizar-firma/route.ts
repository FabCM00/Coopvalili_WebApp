// POST /api/usuario/documentos/[id]/sincronizar-firma?radicado=<radicado>
//
// Pregunta a ZapSign el estado real del último envío a firma de este documento y
// aplica el resultado (si ya se firmó: descarga el PDF, sobrescribe el blob y
// pasa el documento a `firmado`).
//
// Es el respaldo del webhook: se usa cuando el evento se perdió —webhook no
// configurado todavía, app caída, o firma hecha antes de montar el endpoint— y
// como verificación manual desde la UI o Postman.

import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../../../../auth";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { DocumentoError } from "@/lib/documentos";
import { sincronizarFirma } from "@/lib/zapsign";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const radicado = req.nextUrl.searchParams.get("radicado") ?? "";
  if (!radicado) {
    return NextResponse.json(
      { ok: false, message: "Parámetro 'radicado' requerido." },
      { status: 400 },
    );
  }

  let documentoId: bigint;
  try {
    documentoId = BigInt(id);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Id inválido." },
      { status: 400 },
    );
  }

  try {
    // El envío vigente es el más reciente; `radicado` actúa como control de
    // acceso igual que en el resto de las rutas de documentos.
    const firma = await withPrismaRetry(() =>
      prisma.firma_solicitudes.findFirst({
        where: { documento_id: documentoId, radicado },
        orderBy: { created_at: "desc" },
        select: { zapsign_token: true },
      }),
    );
    if (!firma) {
      return NextResponse.json(
        {
          ok: false,
          message: "Este documento no tiene envíos a firma para esa solicitud.",
        },
        { status: 404 },
      );
    }

    const outcome = await sincronizarFirma(firma.zapsign_token);
    return NextResponse.json({
      ok: outcome.handled,
      action: outcome.handled ? outcome.action : undefined,
      message: outcome.detail,
    });
  } catch (error: unknown) {
    if (error instanceof DocumentoError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[documentos/sincronizar-firma]", error);
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
