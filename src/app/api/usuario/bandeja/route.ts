import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { buildResumen } from "@/lib/bandeja-mappers";
import { withPrismaRetry } from "@/lib/prisma-retry";

// ─────────────────────────────────────────────────────────────────────────────
// GET — lista de solicitudes (resumen ligero, sin payloads crudos).
// El detalle completo se consulta aparte por radicado en [radicado]/route.ts.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200");
  const cedulaFilter = req.nextUrl.searchParams.get("cedulaFilter") || undefined;

  const where: { cedula?: string } = {};
  if (cedulaFilter) where.cedula = cedulaFilter;

  try {
    const rows = await withPrismaRetry(() =>
      prisma.valida1_results.findMany({
        where,
        include: {
          motor_process_results: true,
          motor_data_results: { orderBy: { created_at: "desc" }, take: 1 },
          identity_validations: true,
          credito_decisiones: true,
        },
        orderBy: { created_at: "desc" },
        take: limit,
      }),
    );

    const data = rows.map(buildResumen);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — marcar una solicitud como gestionada.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const { radicado } = await req.json();
    if (!radicado) {
      return NextResponse.json({ ok: false, message: "Radicado requerido." }, { status: 400 });
    }

    await withPrismaRetry(() =>
      prisma.valida1_results.update({
        where: { radicado },
        data: {
          gestionado_at: new Date(),
          gestionado_by: session.user.email ?? "unknown",
        },
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
