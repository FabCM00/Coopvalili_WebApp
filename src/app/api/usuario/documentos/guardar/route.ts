
import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { DocumentoError, guardarDocumento } from "@/lib/documentos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Se esperaba multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Archivo requerido (campo 'file')." },
      { status: 400 },
    );
  }

  const radicado = String(form.get("radicado") ?? "").trim();
  if (!radicado) {
    return NextResponse.json(
      { ok: false, message: "Radicado requerido (campo 'radicado')." },
      { status: 400 },
    );
  }

  try {
    const documento = await guardarDocumento({
      radicado,
      file,
      tipoDocumento: form.get("tipo_documento")?.toString() ?? null,
      subidoPor: session.user.email ?? null,
    });
    return NextResponse.json({ ok: true, documento }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof DocumentoError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[documentos/guardar]", error);
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
