import { supabase } from "./client";
import { safeCall } from "./safe-call";
import type { SafeResult } from "./types";

/**
 * Capa de datos para la Bandeja de Solicitudes (rol usuario).
 *
 * Universo de filas: `valida1_results`. Cada radicado pasa primero por la
 * validación inicial, y SOLO si pasa puede llegar a tener un registro en
 * `motor_process_results`. Por eso valida1_results es la fuente de verdad para
 * la lista, y motor_process_results se hace LEFT JOIN — puede faltar.
 *
 * Tablas relacionadas (todas por `radicado`):
 *   - valida1_results       : universo principal
 *   - motor_process_results : decisión del motor (puede no existir)
 *   - motor_data_results    : payloads de APIs (puede no existir)
 *   - identity_validations  : validación de identidad (radicado_valida1)
 */

// ─── Tipos crudos ─────────────────────────────────────────────────────────────

export interface Valida1ResultRow {
    radicado: string;
    cedula: string;
    valida_activo: number | null;
    valida_edad: number | null;
    valida_asociado: number | null;
    valida_no_retirado: number | null;
    valida1: number | null;
    mensaje: string | null;
    fecha_generacion: string | null;
    tipo_identificacion: string | null;
    numero_identificacion: string | null;
    cliente_empresa: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    nombre: string | null;
    fecha_ingreso: string | null;
    fecha_ingreso_empresa: string | null;
    telefono: string | null;
    direccion: string | null;
    asociado: number | null;
    activo: number | null;
    actividad_economica: string | null;
    codigo_municipal: number | null;
    email: string | null;
    genero: number | null;
    empleado: number | null;
    tipo_contrato: number | null;
    nivel_escolar: number | null;
    estrato: number | null;
    fecha_nacimiento: string | null;
    estado_civil: number | null;
    mujer_cabeza_familia: number | null;
    sector_economico: number | null;
    jornada_laboral: number | null;
    fecha_retiro: string | null;
    celular: string | null;
    raw_json: Record<string, any> | null;
    created_at: string;
    // Campos de gestión (se pueden agregar via migration o directamente si existen)
    gestionado_at?: string | null;
    gestionado_by?: string | null;
}

export interface MotorProcessResultRow {
    radicado: string;
    cedula: string;
    status: string | null;
    perfil: string | null;
    totales_scor: number | null;
    usario_credito: number | null;
    scor_nivel_riesgo: number | null;
    scor_edad: number | null;
    scor_pcargo: number | null;
    scor_vivienda: number | null;
    scor_ant_coop: number | null;
    scor_ant_laboral: number | null;
    scor_ingresos: number | null;
    ingresos: number | null;
    egresos: number | null;
    minimo_vital: number | null;
    resumen_salarial: number | null;
    cuota_tdc: number | null;
    descuentos_ley: number | null;
    cuota_max_endeudamiento_mensual: number | null;
    cuota_max_capacidad_mensual: number | null;
    cuota_max_capacidad: number | null;
    cuota_periodica_solicitada: number | null;
    cuota_definitiva: number | null;
    maximo_deuda_endeudamiento: number | null;
    maximo_deuda_desprotegido: number | null;
    valor_final_credito_motor: number | null;
    monto_definitivo: number | null;
    endeudamiento_actual: number | null;
    endeudamiento_proyectado: number | null;
    maximo_endeudamiento: number | null;
    cumple_end: number | null;
    cumple_sol: number | null;
    cumple_disp: number | null;
    cumple_des: number | null;
    cumplimiento_4_criterios: number | null;
    solvencia: number | null;
    disponible: number | null;
    desprotegido: number | null;
    concepto_definitivo: string | null;
    viable_cmd: number | null;
    // Bloques de escenarios
    cumple_4_criterios_b1: number | null;
    capacidad_pago_b1: number | null;
    monto_credito_b1: number | null;
    cumple_4_criterios_b2: number | null;
    capacidad_pago_b2: number | null;
    monto_credito_b2: number | null;
    cumple_4_criterios_b3: number | null;
    capacidad_pago_b3: number | null;
    monto_credito_b3: number | null;
    raw_json: Record<string, any> | null;
    created_at: string;
}

export interface MotorDataResultRow {
    radicado_valida1: string | null;
    cedula: string;
    status: string | null;
    garantia: string | null;
    aportes: number | null;
    aporte_mensual: number | null;
    deuda_coopvalili: number | null;
    deuda_sector: number | null;
    cuota_recoge_coopvalili: number | null;
    cuota_recoge_sector: number | null;
    salario: number | null;
    tipo_salario: string | null;
    egresos_volante: number | null;
    egresos_sector: number | null;
    score_cifin: number | null;
    frecuencia_pagos: string | null;
    aportes_ahorros: number | null;
    linea_credito: string | null;
    monto_solicitado: number | null;
    parametro_credito: number | null;
    instancia_aprobacion: string | null;
    ahorros_fondo: number | null;
    fecha_ingreso: string | null;
    fecha_nacimiento: string | null;
    edad: number | null;
    personas_cargo: number | null;
    tipo_vivienda: number | null;
    antiguedad_fondo: number | null;
    antiguedad_laboral: number | null;
    tasa_usura: number | null;
    meta_coopvalili: string | null;
    meta_transunion: string | null;
    meta_mensaje: string | null;
    raw_json: Record<string, any> | null;
    created_at: string;
}

export interface IdentityValidationRow {
    id: number;
    radicado_valida1: string | null;
    cedula: string;
    tipo_validacion: string | null;
    status_document: number | null;
    status_face: number | null;
    estado_validacion: number | null;
    request_json: Record<string, any> | null;
    created_at: string;
}

// ─── Tipos UI ─────────────────────────────────────────────────────────────────

export type SolicitudEstado =
    | "aprobado"
    | "preaprobado"
    | "en_revision"
    | "pendiente"
    | "rechazado"
    | "no_viable";

export interface ValidacionItem {
    label: string;
    key: string;
    estado: 1 | 2 | null;
}

export interface SolicitudUI {
    radicado: string;
    cedula: string;
    solicitante: string;
    fecha: string;
    /** Monto solicitado (de motor_data_results.monto_solicitado o 0). */
    valor: number;
    estado: SolicitudEstado;
    /** Score CIFIN del motor. null si no hay motor_data_results aún. */
    score: number | null;
    /** Texto a mostrar en el header del detalle. */
    decisionTexto: string;
    /** True si NO hay motor_process_results para este radicado. */
    sinMotor: boolean;
    /** True si el operador ya marcó esta solicitud como gestionada. */
    gestionado: boolean;
    /** ISO timestamp de cuándo fue gestionada. null si no lo está. */
    gestionadoAt: string | null;
    /** Lista de validaciones para el panel de campos clave. */
    validaciones: ValidacionItem[];
    raw: {
        valida1: Valida1ResultRow;
        motor_process: MotorProcessResultRow | null;
        motor_data: MotorDataResultRow | null;
        identity_validation: IdentityValidationRow | null;
    };
}

// ─── Lógica de derivación ─────────────────────────────────────────────────────

/**
 * Estado de la solicitud derivado de los datos disponibles:
 *   - Sin motor_process_results:
 *       valida1 = 1 → en_revision (pasó valida1 pero motor no corrió)
 *       valida1 = 2 → rechazado (no pasó validación inicial)
 *   - Con motor_process_results, usa concepto_definitivo o viable_cmd:
 *       viable_cmd = 1 → aprobado/viable
 *       viable_cmd = 0 → no_viable
 *       si status = "APROBADO" → aprobado
 *       si status = "RECHAZADO" → rechazado
 */
function deriveEstado(
    valida1: Valida1ResultRow,
    motor: MotorProcessResultRow | null,
): SolicitudEstado {
    if (motor) {
        const concepto = (motor.concepto_definitivo ?? "").toUpperCase();
        if (concepto === "PREAPROBADO") return "preaprobado";
        if (concepto === "NO VIABLE") return "no_viable";
        if (concepto === "REVISAR") return "en_revision";

        const status = (motor.status ?? "").toUpperCase();
        if (status === "APROBADO" || motor.viable_cmd === 1) return "aprobado";
        if (status === "RECHAZADO" || motor.viable_cmd === 0) return "no_viable";
        
        return "en_revision";
    }
    if (valida1.valida1 === 2) return "rechazado";
    if (valida1.valida1 === 1) return "en_revision";
    return "pendiente";
}

function buildValidaciones(
    valida1: Valida1ResultRow,
    motor: MotorProcessResultRow | null,
): ValidacionItem[] {
    const v: ValidacionItem[] = [
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

function norm(v: number | null | undefined): 1 | 2 | null {
    if (v === 1) return 1;
    if (v === 2) return 2;
    return null;
}

function extractScore(motorData: MotorDataResultRow | null): number | null {
    if (!motorData) return null;
    if (typeof motorData.score_cifin === "number") return motorData.score_cifin;
    return null;
}

function extractMonto(motorData: MotorDataResultRow | null, motor: MotorProcessResultRow | null): number {
    // Prioridad: monto solicitado del data, luego el definitivo del process
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

function normalizeFecha(raw: string | null | undefined): string {
    if (!raw) return "";
    // Formato "YYYYMMDD" o "YYYY-MM-DD" o ISO
    const m = String(raw).match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return String(raw);
}

function buildSolicitante(valida1: Valida1ResultRow): string {
    const nombre = (valida1.nombre ?? "").trim();
    const apellido = (valida1.primer_apellido ?? "").trim();
    const full = `${nombre} ${apellido}`.trim();
    return full || "—";
}

function decisionTexto(
    motor: MotorProcessResultRow | null,
    valida1: Valida1ResultRow,
): string {
    if (!motor) {
        if (valida1.valida1 === 1) return "Pendiente de motor";
        if (valida1.valida1 === 2) return valida1.mensaje ?? "No apto en validación inicial";
        return "Pendiente de validación";
    }
    if (motor.concepto_definitivo) return motor.concepto_definitivo;
    if (motor.viable_cmd === 1) return "Crédito Preaprobado";
    if (motor.viable_cmd === 0) return "Crédito No Viable";
    return motor.status ?? "—";
}

// ─── Opciones ────────────────────────────────────────────────────────────────

export interface ListSolicitudesOptions {
    limit?: number;
    /** Si se pasa, filtra por cédula exacta. */
    cedulaFilter?: string;
}

// ─── Marcar como gestionado ───────────────────────────────────────────────────

/**
 * Marca una solicitud como gestionada actualizando valida1_results.
 * Requiere que la tabla tenga columnas gestionado_at y gestionado_by
 * (si no existen, fallará — la tabla puede necesitar una migration).
 */
export async function marcarGestionado(
    radicado: string,
    por?: string,
): Promise<SafeResult<null>> {
    return safeCall<null>(
        async () => {
            const { error } = await supabase
                .from("valida1_results")
                .update({
                    gestionado_at: new Date().toISOString(),
                    gestionado_by: por ?? null,
                })
                .eq("radicado", radicado);
            if (error) throw error;
            return null;
        },
        { label: "bandeja.marcarGestionado", timeoutMs: 10_000 },
    );
}

// ─── Listado principal ────────────────────────────────────────────────────────

export async function listSolicitudes(
    options: ListSolicitudesOptions = {},
): Promise<SafeResult<SolicitudUI[]>> {
    const limit = options.limit ?? 200;

    return safeCall(
        async () => {
            // 1) valida1_results es el universo principal
            let v1Query = supabase
                .from("valida1_results")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);

            if (options.cedulaFilter)
                v1Query = v1Query.eq("cedula", options.cedulaFilter);

            const v1Res = await v1Query;
            if (v1Res.error) return { data: null, error: v1Res.error };

            const v1Rows = (v1Res.data ?? []) as Valida1ResultRow[];
            if (v1Rows.length === 0)
                return { data: [] as SolicitudUI[], error: null };

            const radicados = v1Rows.map((r) => r.radicado);

            // 2) En paralelo: motor_process_results, motor_data_results, identity_validations
            const [mpRes, mdRes, ivRes] = await Promise.all([
                supabase
                    .from("motor_process_results")
                    .select("*")
                    .in("radicado", radicados),
                supabase
                    .from("motor_data_results")
                    .select("*")
                    .in("radicado_valida1", radicados),
                supabase
                    .from("identity_validations")
                    .select("*")
                    .in("radicado_valida1", radicados),
            ]);

            const mpRows = (mpRes.data ?? []) as MotorProcessResultRow[];
            const mdRows = (mdRes.data ?? []) as MotorDataResultRow[];
            const ivRows = ivRes.error
                ? []
                : ((ivRes.data ?? []) as IdentityValidationRow[]);

            if (mpRes.error)
                console.warn("[bandeja] motor_process_results:", mpRes.error.message);
            if (mdRes.error)
                console.warn("[bandeja] motor_data_results:", mdRes.error.message);
            if (ivRes.error)
                console.warn("[bandeja] identity_validations:", ivRes.error.message);

            // Indexar por radicado (usando radicado_valida1 para motor_data e identity)
            const mpByRad = new Map<string, MotorProcessResultRow>();
            for (const r of mpRows) mpByRad.set(r.radicado, r);

            const mdByRad = new Map<string, MotorDataResultRow>();
            for (const r of mdRows) {
                if (r.radicado_valida1) mdByRad.set(r.radicado_valida1, r);
            }

            const ivByRad = new Map<string, IdentityValidationRow>();
            for (const r of ivRows) {
                if (r.radicado_valida1) ivByRad.set(r.radicado_valida1, r);
            }

            const out: SolicitudUI[] = v1Rows.map((v1) => {
                const motor = mpByRad.get(v1.radicado) ?? null;
                const md = mdByRad.get(v1.radicado) ?? null;
                const iv = ivByRad.get(v1.radicado) ?? null;

                // Fecha: del motor_data si existe; sino de valida1 fecha_generacion
                const fecha =
                    normalizeFecha(md?.fecha_ingreso) ||
                    normalizeFecha(v1.fecha_generacion) ||
                    normalizeFecha(v1.created_at);

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
                    gestionadoAt: v1.gestionado_at ?? null,
                    validaciones: buildValidaciones(v1, motor),
                    raw: {
                        valida1: v1,
                        motor_process: motor,
                        motor_data: md,
                        identity_validation: iv,
                    },
                };
            });

            return { data: out, error: null };
        },
        { label: "bandeja.list", timeoutMs: 20_000 },
    );
}
