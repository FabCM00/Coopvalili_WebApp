import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  BANDEJA_INCLUDE,
  buildBandejaWhere,
  countByEstado,
  mapBandejaRows,
} from "@/lib/bandeja-query";
import { withPrismaRetry } from "@/lib/prisma-retry";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const cedulaFilter = sp.get("cedulaFilter") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const gestionadoParam = sp.get("gestionado");
  const gestionado =
    gestionadoParam === "true" ? true : gestionadoParam === "false" ? false : undefined;

  try {
    const rows = await withPrismaRetry(() =>
      prisma.valida1_results.findMany({
        where: buildBandejaWhere({ cedulaFilter, q, gestionado }),
        include: BANDEJA_INCLUDE,
        orderBy: { created_at: "desc" },
      }),
    );

    return NextResponse.json({
      ok: true,
      data: countByEstado(mapBandejaRows(rows)),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
