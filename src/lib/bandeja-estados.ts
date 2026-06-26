// ─────────────────────────────────────────────────────────────────────────────
// REGLAS DE ESTADO DE UNA SOLICITUD  (única fuente de verdad)
// ─────────────────────────────────────────────────────────────────────────────
// El estado se deriva en el backend recorriendo las reglas EN ORDEN; gana la
// primera que se cumple. Refleja la etapa del flujo en la que está la solicitud.
//
//  #  Estado              Regla
//  ─  ──────────────────  ───────────────────────────────────────────────────────
//  1  valida_1            valida1 === 1            && NO existe identity
//  2  no_valida_1         valida1 !== 1            && NO existe identity
//  3  val_identidad       status_face ∈ {1,success} && ( (tipo_validacion===1 &&
//                         status_document ∈ {1,success}) || tipo_validacion===2 )
//                         && NO existe motor_data
//  4  no_val_identidad    ( status_document ∈ {2,failed} || status_face ∈ {2,failed} )
//                         && NO existe motor_data
//  5  fallo_servicios     motor_process.status !== "ok"
//  6  no_viable           motor_process.instanciaAprobacion === 2
//  7  aprobado            motor_process.instanciaAprobacion === 1
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

import type { SolicitudEstado } from "@/lib/types";

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
}

/**
 * Deriva el estado de la solicitud aplicando las 7 reglas de negocio en orden.
 * Gana la primera regla que se cumple. `revision` es el fallback cuando los
 * datos aún están incompletos o ninguna regla aplica.
 */
export function deriveEstado(i: EstadoInputs): SolicitudEstado {
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
  if (i.motorInstancia === 1) return "aprobado";

  // Motor respondió ok pero la instancia de aprobación es indeterminada.
  return "revision";
}
