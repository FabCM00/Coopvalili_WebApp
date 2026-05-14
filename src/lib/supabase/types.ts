/**
 * Tipos compartidos para todas las llamadas a Supabase del proyecto.
 *
 * El tipo central es `SafeResult<T>`: una "discriminated union" que fuerza
 * al consumidor a comprobar `ok` antes de acceder a `data` o `error`. Esto
 * elimina los `try/catch` repartidos por la app y unifica el formato.
 */

export type SafeResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: SafeError };

export interface SafeError {
    /**
     * Código identificador estable, útil para lógica programática:
     *   - "timeout"     : la operación superó el timeout configurado
     *   - "network"     : error de red (fetch falló, sin internet, etc.)
     *   - "auth"        : credenciales inválidas, token expirado, no autenticado
     *   - "not_found"   : recurso inexistente
     *   - "validation"  : error 4xx con detalle del servidor
     *   - "server"      : error 5xx
     *   - "unknown"     : cualquier otro caso no clasificable
     */
    code:
    | "timeout"
    | "network"
    | "auth"
    | "not_found"
    | "validation"
    | "server"
    | "unknown";
    /** Mensaje legible para mostrar al usuario o loggear. */
    message: string;
    /** Error original sin procesar. */
    cause?: unknown;
}

/** Perfil del usuario, almacenado en la tabla `profiles`. */
export interface Profile {
    id: string;
    email: string;
    username: string;
    role: "admin" | "user";
    estado?: boolean;
    created_at?: string;
}
