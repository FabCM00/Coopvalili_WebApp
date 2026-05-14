/**
 * Punto de entrada unico para Supabase del lado cliente.
 *
 * Reglas del proyecto:
 *   - NO instanciar otro createClient en codigo cliente.
 *   - NO llamar directo a supabase.auth.* o supabase.from(...) en componentes
 *     nuevos: usa los helpers de auth/profiles, o envuelve la llamada en
 *     safeCall para mantener formato uniforme con timeout.
 *   - El cliente raw `supabase` se exporta porque hay casos puntuales (como
 *     onAuthStateChange) que lo necesitan.
 */
export {
    supabase,
    CAPTURED_AUTH_HASH,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
} from "./client";

export { safeCall } from "./safe-call";
export type { SafeCallOptions } from "./safe-call";
export type { SafeResult, SafeError, Profile } from "./types";

export * as auth from "./auth";
export * as profiles from "./profiles";
export * as bandeja from "./bandeja";
export type {
    SolicitudUI,
    SolicitudEstado,
    ValidacionItem,
    Valida1ResultRow,
    MotorProcessResultRow,
    MotorDataResultRow,
    IdentityValidationRow,
    ListSolicitudesOptions,
} from "./bandeja";

export interface DatosAsociado {
    id: number;
    cedula: string;
    primer_apellido: string | null;
    nombre: string | null;
    ciudad: string | null;
    estado_civil: string | null;
    salario: number | null;
    aportes: number | null;
    deuda_coopvalili: number | null;
    edad: number | null;
    tipo_vivienda: number | null;
    fecha_ingreso: string | null;
    fecha_ingreso_empresa: string | null;
    personas_cargo: number | null;
    cliente_empresa: string | null;
    nivel: number | null;
    cuota_disponible: number | null;
    nombre_asociado: string | null;
    antiguedad_coop: number | null;
    antiguedad_laboral: number | null;
    usuario_credito: number | null;
    estado_civil_norm: string | null;
    updated_at: string;
}
