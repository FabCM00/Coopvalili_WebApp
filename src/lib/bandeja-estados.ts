// ─────────────────────────────────────────────────────────────────────────────
// REGLAS DE ESTADO DE UNA SOLICITUD  (única fuente de verdad)
// ─────────────────────────────────────────────────────────────────────────────
// El estado se deriva en el backend recorriendo las reglas EN ORDEN; gana la
// primera que se cumple. Refleja la etapa del flujo en la que está la solicitud.
//
//  #  Estado              Regla
//  ─  ──────────────────  ───────────────────────────────────────────────────────
//  0  (override manual)   estado_manual != null  → gana sobre todo lo demás
//  1  valida_1            valida1 === 1            && NO existe identity
//  2  no_valida_1         valida1 !== 1            && NO existe identity
//  3  val_identidad       status_face ∈ {1,success} && ( (tipo_validacion===1 &&
//                         status_document ∈ {1,success}) || tipo_validacion===2 )
//                         && NO existe motor_data
//  4  no_val_identidad    ( status_document ∈ {2,failed} || status_face ∈ {2,failed} )
//                         && NO existe motor_data
//  5  fallo_servicios     motor_process.status !== "ok"
//  6  no_viable           motor_process.instanciaAprobacion === 2
//  7  preaprobado         motor_process.instanciaAprobacion === 1
//  ·  revision            (fallback) ninguna regla anterior aplicó / datos incompletos
//
// Mapeo a la BD real (payloads JSON):
//   valida1                -> valida1_results.response_json.result.valida1
//   existe identity        -> hay fila en identity_validations (radicado != null)
//   status_face/document    -> identity_validations.response_json.status_*
//   tipo_validacion        -> identity_validations.response_json.tipo_validacion
//   existe motor_data      -> hay fila en motor_data_results (radicado != null)
//   motor_process.status   -> motor_process_results.response_json.status
//   instanciaAprobacion    -> motor_process_results.response_json.processing.instanciaAprobacion
//   estado_manual          -> valida1_results.estado_manual (columna, no JSON)

import type { SolicitudEstado } from "@/lib/types";

/**
 * Lista canónica de estados. Vive aquí, junto a las reglas que los producen,
 * para que no haya dos fuentes que puedan divergir: `bandeja-query.ts` la
 * reexporta. El `satisfies` hace que TypeScript avise si se añade un estado al
 * tipo `SolicitudEstado` y se olvida aquí.
 */
export const SOLICITUD_ESTADOS = [
  "valida_1",
  "no_valida_1",
  "val_identidad",
  "no_val_identidad",
  "fallo_servicios",
  "no_viable",
  "preaprobado",
  "aprobado",
  "revision",
] as const satisfies readonly SolicitudEstado[];

export function isSolicitudEstado(value: string | null): value is SolicitudEstado {
  return (SOLICITUD_ESTADOS as readonly string[]).includes(value ?? "");
}

/**
 * Estados que un colaborador puede asignar a mano. Es un subconjunto pequeño a
 * propósito: los demás los derivan las reglas a partir de los payloads del
 * motor, y ofrecerlos en la UI invitaría a contradecir datos que el sistema ya
 * conoce. Solo `preaprobado` y `aprobado`: el primero cuando el motor ya
 * preaprobó pero hace falta marcarlo a mano; el segundo cuando el asociado
 * ya firmó el pagaré.
 */
export const ESTADOS_ASIGNABLES = [
  "preaprobado",
  "aprobado",
] as const satisfies readonly SolicitudEstado[];

export function esEstadoAsignable(estado: SolicitudEstado): boolean {
  return (ESTADOS_ASIGNABLES as readonly string[]).includes(estado);
}

/**
 * Estados que, una vez fijados a mano, no admiten más cambios desde la app.
 * `aprobado` implica desembolso: revertirlo por la UI sería una vía silenciosa
 * para deshacer un crédito ya autorizado. Vive aquí (y no en solicitud-estado.ts,
 * que importa Prisma) para que el cliente pueda pintar el bloqueo sin duplicar
 * la lista; quien manda es el servidor, que igual responde 409.
 */
const ESTADOS_TERMINALES: readonly SolicitudEstado[] = ["aprobado"];

export function esEstadoTerminal(estado: SolicitudEstado): boolean {
  return ESTADOS_TERMINALES.includes(estado);
}

/**
 * Normaliza el override que viene de BD. La columna es `String?` (texto libre a
 * ojos de Postgres), así que un valor viejo o escrito a mano podría no ser un
 * estado válido; en ese caso se ignora y la solicitud vuelve al estado derivado
 * en vez de romper los `Record<SolicitudEstado, …>` de la UI.
 */
export function parseEstadoManual(
  v: string | null | undefined,
): SolicitudEstado | null {
  return isSolicitudEstado(v ?? null) ? (v as SolicitudEstado) : null;
}

/** Valores "ok": numérico 1 o texto "success"/"1". */
function isSuccess(v: unknown): boolean {
  if (v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "success";
}

/** Valores "falla": numérico 2 o texto "failed"/"2". */
function isFailed(v: unknown): boolean {
  if (v === 2) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "2" || s === "failed";
}

/** Datos crudos que necesitan las reglas, ya extraídos de los payloads. */
export interface EstadoInputs {
  /** valida1_results.response_json.result.valida1 (1 = aprueba Validación 1). */
  valida1: number | null;
  /** ¿Existe fila en identity_validations para el radicado? */
  identityExists: boolean;
  statusFace: unknown;
  statusDocument: unknown;
  tipoValidacion: number | null;
  /** ¿Existe fila en motor_data_results para el radicado? */
  motorDataExists: boolean;
  /** ¿Existe fila en motor_process_results para el radicado? */
  motorProcessExists: boolean;
  /** motor_process_results.response_json.status */
  motorStatus: string | null;
  /** motor_process_results.response_json.processing.instanciaAprobacion */
  motorInstancia: number | null;
  /**
   * Override manual puesto por un colaborador (valida1_results.estado_manual).
   * Si viene, gana sobre las 7 reglas. `null` = usar el estado derivado.
   */
  estadoManual?: SolicitudEstado | null;
}

/**
 * Deriva el estado de la solicitud aplicando las 7 reglas de negocio en orden.
 * Gana la primera regla que se cumple. `revision` es el fallback cuando los
 * datos aún están incompletos o ninguna regla aplica.
 */
export function deriveEstado(i: EstadoInputs): SolicitudEstado {
  // ── Regla 0 — override manual ──
  // Gana sobre todo. No sustituye a las reglas: las cortocircuita. Si el
  // override se borra (NULL), el estado vuelve solo a lo que digan los datos,
  // por eso abajo no hace falta ninguna limpieza.
  if (i.estadoManual) return i.estadoManual;

  // ── Etapa Validación 1 (aún sin validación de identidad) ──
  if (!i.identityExists) {
    // Regla 1 / 2
    return i.valida1 === 1 ? "valida_1" : "no_valida_1";
  }

  // ── Etapa Identidad (validada la identidad, aún sin motor) ──
  if (!i.motorDataExists) {
    // Regla 3
    if (
      isSuccess(i.statusFace) &&
      ((i.tipoValidacion === 1 && isSuccess(i.statusDocument)) ||
        i.tipoValidacion === 2)
    ) {
      return "val_identidad";
    }
    // Regla 4
    if (isFailed(i.statusDocument) || isFailed(i.statusFace)) {
      return "no_val_identidad";
    }
    // Identidad registrada pero sin resultado concluyente todavía.
    return "revision";
  }

  // ── Etapa Motor (ya hay motor_data) ──
  // Regla 5 — el servicio del motor no respondió "ok" (o no hay motor_process).
  if (!i.motorProcessExists || (i.motorStatus ?? "").trim().toLowerCase() !== "ok") {
    return "fallo_servicios";
  }
  // Regla 6
  if (i.motorInstancia === 2) return "no_viable";
  // Regla 7
  if (i.motorInstancia === 1) return "preaprobado";

  // Motor respondió ok pero la instancia de aprobación es indeterminada.
  return "revision";
}
