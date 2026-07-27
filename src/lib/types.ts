// Taxonomía de estados de una solicitud (frontend). Las reglas que derivan el
// estado viven en src/lib/bandeja-estados.ts (documentadas y en orden).
//   `revision` es el fallback cuando los datos están incompletos.
export type SolicitudEstado =
  | "valida_1"
  | "no_valida_1"
  | "val_identidad"
  | "no_val_identidad"
  | "fallo_servicios"
  | "no_viable"
  | "aprobado"
  | "revision";

export interface ValidacionItem {
  label: string;
  key: string;
  estado: 1 | 2 | null;
}

type Json = Record<string, any> | null;

export interface Valida1ResultRow {
  radicado: string;
  cedula: string;
  valida1: number | null;
  valida_activo: number | null;
  valida_edad: number | null;
  valida_asociado: number | null;
  valida_no_retirado: number | null;
  mensaje: string | null;
  nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  email: string | null;
  celular: string | null;
  telefono: string | null;
  cliente_empresa: string | null;
  fecha_generacion: string | null;
  fecha_ingreso: string | null;
  fecha_ingreso_empresa: string | null;
  numero_identificacion: string | null;
  tipo_identificacion: string | null;
  created_at: string;
  gestionado_at: string | null;
  gestionado_by: string | null;
  request_json: Json;
  response_json: Json;
}

export interface MotorProcessResultRow {
  radicado: string;
  cedula: string;
  status: string | null;
  perfil: string | null;
  concepto_definitivo: string | null;
  monto_definitivo: number | null;
  ingresos: number | null;
  egresos: number | null;
  minimo_vital: number | null;
  solvencia: number | null;
  disponible: number | null;
  desprotegido: number | null;
  endeudamiento_actual: number | null;
  endeudamiento_proyectado: number | null;
  cumple_end: number | null;
  cumple_sol: number | null;
  cumple_disp: number | null;
  cumple_des: number | null;
  cumplimiento_4_criterios: number | null;
  viable_cmd: number | null;
  instancia_aprobacion: number | null;
  created_at: string;
  request_json: Json;
  response_json: Json;
  // Escenarios B1/B2/B3 — opcionales: no vienen en el payload actual del motor.
  monto_credito_b1?: number | null;
  monto_credito_b2?: number | null;
  monto_credito_b3?: number | null;
  cuota_b1?: number | null;
  cuota_b2?: number | null;
  cuota_b3?: number | null;
  cumple_4_criterios_b1?: string | number | null;
  cumple_4_criterios_b2?: string | number | null;
  cumple_4_criterios_b3?: string | number | null;
}

export interface MotorDataResultRow {
  radicado: string | null;
  cedula: string;
  status: string | null;
  monto_solicitado: number | null;
  linea_credito: string | null;
  salario: number | null;
  egresos_volante: number | null;
  deuda_coopvalili: number | null;
  score_cifin: number | null;
  edad: number | null;
  antiguedad_laboral: number | null;
  fecha_ingreso: string | null;
  fecha_nacimiento: string | null;
  tipo_salario: string | null;
  frecuencia_pagos: string | null;
  created_at: string;
  request_json: Json;
  response_json: Json;
}

export interface IdentityValidationRow {
  radicado: string | null;
  cedula: string;
  tipo_validacion: string | null;
  status_document: string | null;
  status_face: string | null;
  estado_validacion: string | null;
  created_at: string;
  request_json: Json;
  response_json: Json;
}

export interface CreditoDecisionRow {
  radicado: string;
  opcion_elegida: string | null;
  response: Json;
  created_at: string;
  request_json: Json;
  response_json: Json;
}

// Fila de la lista (ligera): solo lo necesario para tabla/lista/CSV. Sin `raw`.
export interface SolicitudResumen {
  radicado: string;
  cedula: string;
  solicitante: string;
  fecha: string;
  valor: number;
  estado: SolicitudEstado;
  score: number | null;
  decisionTexto: string;
  sinMotor: boolean;
  gestionado: boolean;
  gestionadoAt: string | null;
  validaciones: ValidacionItem[];
}

// Detalle completo (por radicado): resumen + payloads crudos para el visor.
export interface SolicitudUI extends SolicitudResumen {
  raw: {
    valida1: Valida1ResultRow;
    motor_process: MotorProcessResultRow | null;
    motor_data: MotorDataResultRow | null;
    identity_validation: IdentityValidationRow | null;
    credito_decision: CreditoDecisionRow | null;
  };
}

// Página de resultados de la bandeja (paginación server-side).
export interface SolicitudesPage {
  data: SolicitudResumen[];
  total: number;
  totalPages: number;
  totalActivas: number;
  totalGestionadas: number;
}
