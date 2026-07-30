// GET /api/usuario/documentos/download?id=<id>&radicado=<radicado>&mode=view|download
//
// Sirve el contenido del blob por proxy: el contenedor es privado, así que nunca
// se expone una URL de Azure al navegador.
//
// `id` es el id de la fila en `documentos` (antes era el nombre del blob), y
// `radicado` actúa como control de acceso: obliga a que quien pide el archivo ya
// sepa a qué solicitud pertenece, de modo que un id suelto no alcance para leer
// documentos de otra persona (ver obtenerBuffer en @/lib/documentos).

import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { DocumentoError, obtenerBuffer } from "@/lib/documentos";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const radicado = req.nextUrl.searchParams.get("radicado") ?? "";
  const disposition =
    req.nextUrl.searchParams.get("mode") === "download" ? "attachment" : "inline";

  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Parámetro 'id' requerido." },
      { status: 400 },
    );
  }

  try {
    const doc = await obtenerBuffer(id, radicado || undefined);
    if (!doc) {
      return NextResponse.json(
        { ok: false, message: "Documento no encontrado." },
        { status: 404 },
      );
    }

    const filename = encodeURIComponent(doc.nombre);
    return new NextResponse(new Uint8Array(doc.buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
        "Content-Length": String(doc.buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    if (error instanceof DocumentoError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[documentos/download]", error);
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
