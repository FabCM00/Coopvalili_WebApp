import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Acceso denegado." }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "100"));
  const skip = (page - 1) * pageSize;

  try {
    const [rows, total] = await Promise.all([
      prisma.datos_asociado.findMany({
        skip,
        take: pageSize,
        orderBy: {
          updated_at: "desc",
        },
      }),
      prisma.datos_asociado.count(),
    ]);

    const data = rows.map((row) => ({
      id: row.cedula,
      cedula: row.cedula,
      nombre: row.nombre,
      primer_apellido: row.primer_apellido,
      nombre_asociado: row.nombre_asociado,
      ciudad: row.ciudad,
      estado_civil: row.estado_civil,
      estado_civil_norm: row.estado_civil_norm,
      salario: row.salario ? Number(row.salario) : null,
      aportes: row.aportes ? Number(row.aportes) : null,
      deuda_coopvalili: row.deuda_coopvalili ? Number(row.deuda_coopvalili) : null,
      cuota_disponible: row.cuota_disponible ? Number(row.cuota_disponible) : null,
      antiguedad_coop: row.antiguedad_coop ? Number(row.antiguedad_coop) : null,
      antiguedad_laboral: row.antiguedad_laboral ? Number(row.antiguedad_laboral) : null,
      edad: row.edad,
      personas_cargo: row.personas_cargo,
      cliente_empresa: row.cliente_empresa,
      fecha_ingreso: row.fecha_ingreso,
      fecha_ingreso_empresa: row.fecha_ingreso_empresa,
      usuario_credito: row.usuario_credito,
      tipo_vivienda: row.tipo_vivienda,
      nivel: row.nivel,
      raw_json: row.raw_json,
      created_at: row.created_at ? row.created_at.toISOString() : null,
      updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    }));

    return NextResponse.json({ ok: true, data, total });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
