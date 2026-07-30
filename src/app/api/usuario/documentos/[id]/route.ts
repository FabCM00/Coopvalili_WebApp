// PATCH  /api/usuario/documentos/[id]  → cambia el estado
// DELETE /api/usuario/documentos/[id]  → borrado lógico
//
// Ambas exigen `radicado` (query param) como control de acceso: la API verifica
// que el documento pertenezca a esa solicitud antes de tocarlo.
//
// Los estados `pendiente_firma` y `firmado` NO se aceptan aquí: los asigna el
// flujo de firma. Un documento que está en esos estados tampoco admite cambio
// manual ni eliminación (ver cambiarEstado/eliminarDocumento en @/lib/documentos).

import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import {
  DocumentoError,
  cambiarEstado,
  eliminarDocumento,
  isDocumentoEstado,
} from "@/lib/documentos";

/** Traduce un error de dominio a su respuesta HTTP. */
function toErrorResponse(error: unknown, tag: string) {
  if (error instanceof DocumentoError) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.status },
    );
  }
  console.error(tag, error);
  const msg = error instanceof Error ? error.message : "Error interno.";
  return NextResponse.json({ ok: false, message: msg }, { status: 500 });
}

export async function PATCH(
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

  let estado = "";
  try {
    const body = (await req.json()) as { estado?: string };
    estado = body.estado ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cuerpo inválido." },
      { status: 400 },
    );
  }

  if (!isDocumentoEstado(estado)) {
    return NextResponse.json(
      { ok: false, message: `Estado "${estado}" no válido.` },
      { status: 400 },
    );
  }

  try {
    // Sin `permitirSistema`: esta ruta es la acción manual del colaborador.
    const documento = await cambiarEstado(id, estado, {
      radicadoEsperado: radicado,
    });
    return NextResponse.json({ ok: true, documento });
  } catch (error: unknown) {
    return toErrorResponse(error, "[documentos/patch]");
  }
}

export async function DELETE(
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

  try {
    await eliminarDocumento(id, { radicadoEsperado: radicado });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return toErrorResponse(error, "[documentos/delete]");
  }
}
