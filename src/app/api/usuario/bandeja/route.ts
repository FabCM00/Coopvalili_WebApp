import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  BANDEJA_INCLUDE,
  buildBandejaWhere,
  buildGestionWhere,
  isSolicitudEstado,
  mapBandejaRows,
} from "@/lib/bandeja-query";
import { withPrismaRetry } from "@/lib/prisma-retry";

// GET — página de solicitudes (resumen ligero, sin payloads crudos).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") || "20", 10)));
  const page = Math.max(1, Number.parseInt(sp.get("page") || "1", 10));
  const cedulaFilter = sp.get("cedulaFilter") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const gestionadoParam = sp.get("gestionado");
  const gestionado =
    gestionadoParam === "true" ? true : gestionadoParam === "false" ? false : undefined;
  const estadoParam = sp.get("estado");

  if (estadoParam && !isSolicitudEstado(estadoParam)) {
    return NextResponse.json({ ok: false, message: "Estado inválido." }, { status: 400 });
  }

  const where = buildBandejaWhere({ cedulaFilter, q, gestionado });

  try {
    // Secuencial a propósito: el pool es pequeño (connection_limit=3) y varias
    // queries en paralelo desde el mismo handler compiten entre sí y con las de
    // otras pestañas, agotando los slots de Postgres.
    const totalActivas = await withPrismaRetry(() =>
      prisma.valida1_results.count({ where: buildGestionWhere(cedulaFilter, false) }),
    );
    const totalGestionadas = await withPrismaRetry(() =>
      prisma.valida1_results.count({ where: buildGestionWhere(cedulaFilter, true) }),
    );

    if (estadoParam) {
      const rows = await withPrismaRetry(() =>
        prisma.valida1_results.findMany({
          where,
          include: BANDEJA_INCLUDE,
          orderBy: { created_at: "desc" },
        }),
      );
      const filtered = mapBandejaRows(rows).filter((row) => row.estado === estadoParam);
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;

      return NextResponse.json({
        ok: true,
        data: {
          data: filtered.slice(start, start + limit),
          total,
          totalPages,
          totalActivas,
          totalGestionadas,
        },
      });
    }

    const [rows, total] = await withPrismaRetry(() =>
      Promise.all([
        prisma.valida1_results.findMany({
          where,
          include: BANDEJA_INCLUDE,
          orderBy: { created_at: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.valida1_results.count({ where }),
      ]),
    );

    return NextResponse.json({
      ok: true,
      data: {
        data: mapBandejaRows(rows),
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalActivas,
        totalGestionadas,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

// PATCH — marcar una solicitud como gestionada.
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
