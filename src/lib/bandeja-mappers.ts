// Mapeadores y derivaciones de la bandeja (lado servidor).
// La BD solo guarda request_json / response_json (JSONB). Aquí aplanamos esos
// payloads a las formas que consume el frontend y derivamos estado/valor/score.
// Usado por la lista (resumen) y el detalle por radicado.

import type {
  SolicitudResumen,
  SolicitudUI,
  ValidacionItem,
} from "@/lib/types";
import { deriveEstado, parseEstadoManual } from "@/lib/bandeja-estados";

function asObj(v: unknown): Record<string, any> | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return p && typeof p === "object" ? (p as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
  if (typeof v === "object") return v as Record<string, any>;
  return null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s === "" ? null : s;
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

function mapValida1(row: any) {
  const res = asObj(row.response_json);
  const req = asObj(row.request_json);
  const result = asObj(res?.result) ?? {};
  const da = asObj(res?.datos_asociado) ?? {};
  return {
    radicado: row.radicado,
    cedula: row.cedula ?? str(da.numero_identificacion) ?? "",
    valida1: num(result.valida1),
    valida_activo: num(result.valida_activo),
    valida_edad: num(result.valida_edad),
    valida_asociado: num(result.valida_asociado),
    valida_no_retirado: num(result.valida_no_retirado),
    mensaje: str(result.mensaje),
    nombre: str(da.nombre),
    primer_apellido: str(da.primer_apellido),
    segundo_apellido: str(da.segundo_apellido),
    email: str(da.email),
    celular: str(da.celular),
    telefono: str(da.telefono),
    cliente_empresa: str(da.cliente_empresa),
    fecha_generacion: str(da.fecha_generacion),
    fecha_ingreso: str(da.fecha_ingreso),
    fecha_ingreso_empresa: str(da.fecha_ingreso_empresa),
    numero_identificacion: str(da.numero_identificacion),
    tipo_identificacion: str(da.tipo_identificacion),
    created_at: toIso(row.created_at),
    gestionado_at: row.gestionado_at ? toIso(row.gestionado_at) : null,
    gestionado_by: row.gestionado_by ?? null,
    request_json: req,
    response_json: res,
  };
}

function mapMotorData(row: any | null) {
  if (!row) return null;
  const res = asObj(row.response_json);
  const req = asObj(row.request_json);
  const dw = asObj(res?.detallado_want) ?? {};
  return {
    radicado: row.radicado ?? null,
    cedula: row.cedula ?? "",
    status: str(res?.status),
    monto_solicitado: num(dw.montoSolicitado),
    linea_credito: str(dw.lineaCredito),
    salario: num(dw.salario),
    egresos_volante: num(dw.egresosVolante),
    deuda_coopvalili: num(dw.deudaCoopvalili),
    score_cifin: num(dw.scoreCifin),
    edad: num(dw.edad),
    antiguedad_laboral: num(dw.antiguedadLaboral),
    fecha_ingreso: str(dw.fechaIngreso),
    fecha_nacimiento: str(dw.fechaNacimiento),
    tipo_salario: str(dw.tipoSalario),
    frecuencia_pagos: str(dw.frecuenciaPagos),
    created_at: toIso(row.created_at),
    request_json: req,
    response_json: res,
  };
}

function mapMotorProcess(row: any | null) {
  if (!row) return null;
  const res = asObj(row.response_json);
  const req = asObj(row.request_json);
  const p = asObj(res?.processing) ?? {};
  return {
    radicado: row.radicado,
    cedula: row.cedula ?? "",
    status: str(res?.status),
    perfil: str(p.perfil),
    concepto_definitivo: str(p.conceptoDefinitivo),
    monto_definitivo: num(p.montoDefinitivo),
    ingresos: num(p.ingresos),
    egresos: num(p.egresos),
    minimo_vital: num(p.minimoVital),
    solvencia: num(p.solvencia),
    disponible: num(p.disponible),
    desprotegido: num(p.desprotegido),
    endeudamiento_actual: num(p.endActual),
    endeudamiento_proyectado: num(p.endProyectado),
    cumple_end: num(p.cumpleEnd),
    cumple_sol: num(p.cumpleSol),
    cumple_disp: num(p.cumpleDis),
    cumple_des: num(p.cumpleDes),
    cumplimiento_4_criterios: num(p.cumpl4Criterios),
    viable_cmd: num(p.viableCmd),
    instancia_aprobacion: num(p.instanciaAprobacion),
    // Oferta — el motor ya entrega el monto formateado en `montoDefinitivo`
    // ("$3.500.000"), así que va como texto y la UI lo muestra tal cual (sin
    // `currency`). Igual `tasaPer` ("0.45%"). `cuotaPeriodica` sí es numérico.
    periodos: num(p.periodos),
    tasa_periodica: str(p.tasaPer),
    cuota_periodica: num(p.cuotaPeriodica),
    monto_oferta: str(p.montoDefinitivo),
    created_at: toIso(row.created_at),
    request_json: req,
    response_json: res,
  };
}

function mapIdentity(row: any | null) {
  if (!row) return null;
  const res = asObj(row.response_json);
  const req = asObj(row.request_json);
  return {
    radicado: row.radicado ?? null,
    cedula: row.cedula ?? str(res?.cedula) ?? "",
    tipo_validacion: str(res?.tipo_validacion),
    status_document: str(res?.status_document),
    status_face: str(res?.status_face),
    estado_validacion: str(res?.estado_validacion),
    created_at: toIso(row.created_at),
    request_json: req,
    response_json: res,
  };
}

function mapCredito(row: any | null) {
  if (!row) return null;
  const res = asObj(row.response_json);
  const req = asObj(row.request_json);
  const opcion =
    str(res?.opcion_elegida) ??
    str(res?.opcionElegida) ??
    str(req?.opcion_elegida) ??
    str(req?.opcionElegida) ??
    null;
  return {
    radicado: row.radicado,
    opcion_elegida: opcion,
    response: res,
    created_at: toIso(row.created_at),
    request_json: req,
    response_json: res,
  };
}

type Mapped = {
  v1: ReturnType<typeof mapValida1>;
  md: ReturnType<typeof mapMotorData>;
  mp: ReturnType<typeof mapMotorProcess>;
  iv: ReturnType<typeof mapIdentity>;
  cd: ReturnType<typeof mapCredito>;
};

function mapAll(row: any): Mapped {
  return {
    v1: mapValida1(row),
    md: mapMotorData(row.motor_data_results?.[0] ?? null),
    mp: mapMotorProcess(row.motor_process_results ?? null),
    iv: mapIdentity(row.identity_validations ?? null),
    cd: mapCredito(row.credito_decisiones ?? null),
  };
}

function normalizeFecha(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = String(raw).match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return String(raw);
}

function buildSolicitante(v1: Mapped["v1"]): string {
  const full =
    `${(v1.nombre ?? "").trim()} ${(v1.primer_apellido ?? "").trim()}`.trim();
  return full || "—";
}

function extractMonto(md: Mapped["md"], mp: Mapped["mp"]): number {
  if (md?.monto_solicitado != null) return md.monto_solicitado;
  if (mp?.monto_definitivo != null) return mp.monto_definitivo;
  return 0;
}

function extractScore(md: Mapped["md"]): number | null {
  return md?.score_cifin ?? null;
}

// La derivación de estado vive en @/lib/bandeja-estados (reglas documentadas).

function decisionTexto(mp: Mapped["mp"], v1: Mapped["v1"]): string {
  if (!mp) {
    if (v1.valida1 === 1) return "Pendiente de motor";
    if (v1.valida1 === 2) return v1.mensaje ?? "No apto en validación inicial";
    return "Pendiente de validación";
  }
  if (mp.concepto_definitivo) return mp.concepto_definitivo;
  if (mp.viable_cmd === 1) return "Crédito Preaprobado";
  if (mp.viable_cmd === 0) return "Crédito No Viable";
  return mp.status ?? "—";
}

function norm(v: unknown): 1 | 2 | null {
  const n = Number(v);
  if (n === 1) return 1;
  if (n === 2) return 2;
  return null;
}

function buildValidaciones(
  v1: Mapped["v1"],
  mp: Mapped["mp"],
): ValidacionItem[] {
  const items: ValidacionItem[] = [
    {
      label: "Resultado Validación 1",
      key: "valida1",
      estado: norm(v1.valida1),
    },
    {
      label: "Validación Activo",
      key: "valida_activo",
      estado: norm(v1.valida_activo),
    },
    {
      label: "Validación Edad",
      key: "valida_edad",
      estado: norm(v1.valida_edad),
    },
    {
      label: "Validación Asociado",
      key: "valida_asociado",
      estado: norm(v1.valida_asociado),
    },
    {
      label: "Validación No Retirado",
      key: "valida_no_retirado",
      estado: norm(v1.valida_no_retirado),
    },
  ];
  if (mp) {
    items.push(
      {
        label: "Cumple endeudamiento",
        key: "cumple_end",
        estado: norm(mp.cumple_end),
      },
      {
        label: "Cumple solvencia",
        key: "cumple_sol",
        estado: norm(mp.cumple_sol),
      },
      {
        label: "Cumple disponible",
        key: "cumple_disp",
        estado: norm(mp.cumple_disp),
      },
      {
        label: "Cumple desprotegido",
        key: "cumple_des",
        estado: norm(mp.cumple_des),
      },
      {
        label: "4 criterios",
        key: "cumplimiento_4_criterios",
        estado: norm(mp.cumplimiento_4_criterios),
      },
    );
  }
  return items;
}

function resumenFrom(row: any, m: Mapped): SolicitudResumen {
  const fecha =
    normalizeFecha(m.v1.created_at) ||
    normalizeFecha(m.md?.fecha_ingreso) ||
    normalizeFecha(m.v1.fecha_generacion);
  const estadoManual = parseEstadoManual(row.estado_manual);
  return {
    radicado: m.v1.radicado,
    cedula: m.v1.cedula,
    solicitante: buildSolicitante(m.v1),
    fecha,
    valor: extractMonto(m.md, m.mp),
    estado: deriveEstado({
      valida1: m.v1.valida1,
      identityExists: m.iv !== null,
      statusFace: m.iv?.status_face ?? null,
      statusDocument: m.iv?.status_document ?? null,
      tipoValidacion:
        m.iv?.tipo_validacion != null ? Number(m.iv.tipo_validacion) : null,
      motorDataExists: m.md !== null,
      motorProcessExists: m.mp !== null,
      motorStatus: m.mp?.status ?? null,
      motorInstancia: m.mp?.instancia_aprobacion ?? null,
      // Columna, no JSON: es el único input que no sale de los payloads.
      estadoManual,
    }),
    estadoEsManual: estadoManual !== null,
    estadoManualPor: estadoManual ? (row.estado_manual_by ?? null) : null,
    estadoManualAt: estadoManual && row.estado_manual_at ? toIso(row.estado_manual_at) : null,
    score: extractScore(m.md),
    decisionTexto: decisionTexto(m.mp, m.v1),
    sinMotor: !m.mp,
    gestionado: !!row.gestionado_at,
    gestionadoAt: row.gestionado_at ? toIso(row.gestionado_at) : null,
    validaciones: buildValidaciones(m.v1, m.mp),
  };
}

/** Fila ligera para la lista (sin payloads crudos). */
export function buildResumen(row: any): SolicitudResumen {
  return resumenFrom(row, mapAll(row));
}

/** Detalle completo por radicado (incluye request_json/response_json crudos). */
export function buildSolicitudUI(row: any): SolicitudUI {
  const m = mapAll(row);
  return {
    ...resumenFrom(row, m),
    raw: {
      valida1: m.v1,
      motor_process: m.mp,
      motor_data: m.md,
      identity_validation: m.iv,
      credito_decision: m.cd,
    },
  };
}
