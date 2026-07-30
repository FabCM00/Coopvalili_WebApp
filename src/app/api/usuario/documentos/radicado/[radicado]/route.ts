
import { NextResponse } from "next/server";

import { auth } from "../../../../../../../auth";
import { listarPorRadicado } from "@/lib/documentos";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ radicado: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const { radicado } = await params;

  try {
    const documentos = await listarPorRadicado(radicado);
    return NextResponse.json({ ok: true, documentos });
  } catch (error: unknown) {
    console.error("[documentos/radicado]", error);
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
