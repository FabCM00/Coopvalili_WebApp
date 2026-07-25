import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { buildResumen } from "@/lib/bandeja-mappers";
import { withPrismaRetry } from "@/lib/prisma-retry";

// ─────────────────────────────────────────────────────────────────────────────
// GET — página de solicitudes (resumen ligero, sin payloads crudos).
// El detalle completo se consulta aparte por radicado en [radicado]/route.ts.
//
// `q` solo filtra por columnas reales (cedula/radicado): `solicitante` es
// derivado de JSON en buildResumen, no una columna, así que no se puede
// filtrar por nombre en SQL sin aplanar ese campo en la tabla.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = parseInt(sp.get("limit") || "20");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const cedulaFilter = sp.get("cedulaFilter") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const gestionadoParam = sp.get("gestionado");

  const where: Prisma.valida1_resultsWhereInput = {};
  if (cedulaFilter) where.cedula = cedulaFilter;
  if (q) {
    where.OR = [
      { cedula: { contains: q, mode: "insensitive" } },
      { radicado: { contains: q, mode: "insensitive" } },
    ];
  }
  if (gestionadoParam === "true") where.gestionado_at = { not: null };
  else if (gestionadoParam === "false") where.gestionado_at = null;

  try {
    const [rows, total, totalActivas, totalGestionadas] = await withPrismaRetry(() =>
      Promise.all([
        prisma.valida1_results.findMany({
          where,
          include: {
            motor_process_results: true,
            motor_data_results: { orderBy: { created_at: "desc" }, take: 1 },
            identity_validations: true,
            credito_decisiones: true,
          },
          orderBy: { created_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.valida1_results.count({ where }),
        prisma.valida1_results.count({
          where: { ...(cedulaFilter ? { cedula: cedulaFilter } : {}), gestionado_at: null },
        }),
        prisma.valida1_results.count({
          where: { ...(cedulaFilter ? { cedula: cedulaFilter } : {}), gestionado_at: { not: null } },
        }),
      ]),
    );

    const data = rows.map(buildResumen);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({
      ok: true,
      data: { data, total, totalPages, totalActivas, totalGestionadas },
    });
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
