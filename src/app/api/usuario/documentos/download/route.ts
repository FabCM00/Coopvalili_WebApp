import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { getDocumentBuffer, sanitizeCedula } from "@/lib/azure-blob";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const disposition =
    req.nextUrl.searchParams.get("mode") === "download" ? "attachment" : "inline";

  if (!sanitizeCedula(cedula) || !id) {
    return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
  }

  try {
    const doc = await getDocumentBuffer(cedula, id);
    if (!doc) {
      return NextResponse.json({ ok: false, message: "Documento no encontrado." }, { status: 404 });
    }

    const filename = encodeURIComponent(doc.name);
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
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
