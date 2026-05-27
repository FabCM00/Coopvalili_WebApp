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
  asociado: string | null;
  activo: string | null;
  actividad_economica: string | null;
  codigo_municipal: string | null;
  email: string | null;
  genero: string | null;
  empleado: string | null;
  tipo_contrato: string | null;
  nivel_escolar: string | null;
  estrato: string | null;
  fecha_nacimiento: string | null;
  estado_civil: string | null;
  mujer_cabeza_familia: string | null;
  sector_economico: string | null;
  jornada_laboral: string | null;
  fecha_retiro: string | null;
  celular: string | null;
  raw_json: Record<string, any> | null;
  created_at: string;
  gestionado_at?: string | null;
  gestionado_by?: string | null;
}

export interface MotorProcessResultRow {
  radicado: string;
  cedula: string;
  status: string | null;
  perfil: string | null;
  totales_scor: number | null;
  usario_credito: string | null;
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
  endeudamiento_actual: string | null;
  endeudamiento_proyectado: string | null;
  maximo_endeudamiento: string | null;
  cumple_end: string | null;
  cumple_sol: string | null;
  cumple_disp: string | null;
  cumple_des: string | null;
  cumplimiento_4_criterios: string | null;
  solvencia: string | null;
  disponible: string | null;
  desprotegido: string | null;
  concepto_definitivo: string | null;
  viable_cmd: string | null;
  raw_json: Record<string, any> | null;
  cuota_b1: number | null;
  cuota_b2: number | null;
  cuota_b3: number | null;
  monto_credito_b1: number | null;
  monto_credito_b2: number | null;
  monto_credito_b3: number | null;
  cumple_4_criterios_b1: string | number | null;
  cumple_4_criterios_b2: string | number | null;
  cumple_4_criterios_b3: string | number | null;
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
  tipo_vivienda: string | null;
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
  id: string;
  radicado_valida1: string | null;
  cedula: string;
  tipo_validacion: string | null;
  status_document: string | null;
  status_face: string | null;
  estado_validacion: string | null;
  request_json: Record<string, any> | null;
  created_at: string;
}

export interface CreditoDecisionRow {
  radicado: string;
  opcion_elegida: string;
  response: Record<string, any> | null;
  created_at: string;
}

export interface SolicitudUI {
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
  raw: {
    valida1: Valida1ResultRow;
    motor_process: MotorProcessResultRow | null;
    motor_data: MotorDataResultRow | null;
    identity_validation: IdentityValidationRow | null;
    credito_decision: CreditoDecisionRow | null;
  };
}
