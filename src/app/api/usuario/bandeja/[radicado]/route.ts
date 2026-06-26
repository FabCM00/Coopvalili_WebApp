import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { prisma } from "@/lib/prisma";
import { buildSolicitudUI } from "@/lib/bandeja-mappers";
import { withPrismaRetry } from "@/lib/prisma-retry";

export async function GET(
  _req: NextRequest,
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
    const row = await withPrismaRetry(() =>
      prisma.valida1_results.findUnique({
        where: { radicado },
        include: {
          motor_process_results: true,
          motor_data_results: { orderBy: { created_at: "desc" }, take: 1 },
          identity_validations: true,
          credito_decisiones: true,
        },
      }),
    );

    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Solicitud no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: buildSolicitudUI(row) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
