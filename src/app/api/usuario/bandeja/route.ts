import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

function serializeDbRow(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === "bigint") return val.toString();
  if (val instanceof Date) return val.toISOString();
  if (val && typeof val === "object" && "d" in val && "c" in val) {
    return Number(val);
  }
  if (Array.isArray(val)) return val.map(serializeDbRow);
  if (typeof val === "object") {
    const copy: any = {};
    for (const key in val) {
      copy[key] = serializeDbRow(val[key]);
    }
    return copy;
  }
  return val;
}

function normalizeFecha(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return String(raw);
}

function buildSolicitante(valida1: any): string {
  const nombre = (valida1.nombre ?? "").trim();
  const apellido = (valida1.primer_apellido ?? "").trim();
  const full = `${nombre} ${apellido}`.trim();
  return full || "—";
}

function extractMonto(motorData: any, motor: any): number {
  if (motorData?.monto_solicitado != null) {
    const n = Number(motorData.monto_solicitado);
    if (Number.isFinite(n)) return n;
  }
  if (motor?.monto_definitivo != null) {
    const n = Number(motor.monto_definitivo);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function deriveEstado(valida1: any, motor: any): string {
  if (motor) {
    const concepto = (motor.concepto_definitivo ?? "").toUpperCase();
    if (concepto === "PREAPROBADO") return "preaprobado";
    if (concepto === "NO VIABLE") return "no_viable";
    if (concepto === "REVISAR") return "en_revision";

    const status = (motor.status ?? "").toUpperCase();
    if (status === "APROBADO" || Number(motor.viable_cmd) === 1) return "aprobado";
    if (status === "RECHAZADO" || Number(motor.viable_cmd) === 0) return "no_viable";
    
    return "en_revision";
  }
  if (valida1.valida1 === 2) return "rechazado";
  if (valida1.valida1 === 1) return "en_revision";
  return "pendiente";
}

function extractScore(motorData: any): number | null {
  if (!motorData) return null;
  if (typeof motorData.score_cifin === "number") return motorData.score_cifin;
  return null;
}

function decisionTexto(motor: any, valida1: any): string {
  if (!motor) {
    if (valida1.valida1 === 1) return "Pendiente de motor";
    if (valida1.valida1 === 2) return valida1.mensaje ?? "No apto en validación inicial";
    return "Pendiente de validación";
  }
  if (motor.concepto_definitivo) return motor.concepto_definitivo;
  if (Number(motor.viable_cmd) === 1) return "Crédito Preaprobado";
  if (Number(motor.viable_cmd) === 0) return "Crédito No Viable";
  return motor.status ?? "—";
}

function norm(v: any): 1 | 2 | null {
  const num = Number(v);
  if (num === 1) return 1;
  if (num === 2) return 2;
  return null;
}

function buildValidaciones(valida1: any, motor: any): any[] {
  const v: any[] = [
    { label: "Resultado Validación 1", key: "valida1", estado: norm(valida1.valida1) },
    { label: "Validación Activo", key: "valida_activo", estado: norm(valida1.valida_activo) },
    { label: "Validación Edad", key: "valida_edad", estado: norm(valida1.valida_edad) },
    { label: "Validación Asociado", key: "valida_asociado", estado: norm(valida1.valida_asociado) },
    { label: "Validación No Retirado", key: "valida_no_retirado", estado: norm(valida1.valida_no_retirado) },
  ];

  if (motor) {
    v.push(
      { label: "Cumple endeudamiento", key: "cumple_end", estado: norm(motor.cumple_end) },
      { label: "Cumple solvencia", key: "cumple_sol", estado: norm(motor.cumple_sol) },
      { label: "Cumple disponible", key: "cumple_disp", estado: norm(motor.cumple_disp) },
      { label: "Cumple desprotegido", key: "cumple_des", estado: norm(motor.cumple_des) },
      { label: "4 criterios", key: "cumplimiento_4_criterios", estado: norm(motor.cumplimiento_4_criterios) },
    );
  }

  return v;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200");
  const cedulaFilter = req.nextUrl.searchParams.get("cedulaFilter") || undefined;

  const where: any = {};
  if (cedulaFilter) {
    where.cedula = cedulaFilter;
  }

  try {
    const v1Rows = await prisma.valida1_results.findMany({
      where,
      include: {
        motor_process_results: true,
        motor_data_results: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        identity_validations: true,
        credito_decisiones: true,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });

    const data = v1Rows.map((v1) => {
      const motor = v1.motor_process_results ?? null;
      const md = v1.motor_data_results?.[0] ?? null;
      const iv = v1.identity_validations ?? null;
      const cd = v1.credito_decisiones ?? null;

      const fecha =
        normalizeFecha(md?.fecha_ingreso) ||
        normalizeFecha(v1.fecha_generacion) ||
        normalizeFecha(v1.created_at?.toISOString());

      return {
        radicado: v1.radicado,
        cedula: v1.cedula ?? "",
        solicitante: buildSolicitante(v1),
        fecha,
        valor: extractMonto(md, motor),
        estado: deriveEstado(v1, motor),
        score: extractScore(md),
        decisionTexto: decisionTexto(motor, v1),
        sinMotor: !motor,
        gestionado: !!v1.gestionado_at,
        gestionadoAt: v1.gestionado_at ? v1.gestionado_at.toISOString() : null,
        validaciones: buildValidaciones(v1, motor),
        raw: {
          valida1: serializeDbRow(v1),
          motor_process: serializeDbRow(motor),
          motor_data: serializeDbRow(md),
          identity_validation: serializeDbRow(iv),
          credito_decision: serializeDbRow(cd),
        },
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { radicado } = body;
    if (!radicado) {
      return NextResponse.json({ ok: false, message: "Radicado requerido." }, { status: 400 });
    }

    await prisma.valida1_results.update({
      where: { radicado },
      data: {
        gestionado_at: new Date(),
        gestionado_by: session.user.email ?? "unknown",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
