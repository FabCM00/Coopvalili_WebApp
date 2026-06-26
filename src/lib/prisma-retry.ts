import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1017"]);

// Fragmentos de mensaje típicos de un socket cerrado/reseteado por el host remoto.
const CONNECTION_ERROR_PATTERNS = [
  "server has closed the connection",
  "connection reset",
  "econnreset",
  "10054",
  "connection closed",
  "can't reach database server",
  "cannot reach database server",
];

// P1001 = servidor inalcanzable (p.ej. Azure despertando tras una pausa por
// inactividad). Reconectar puede tardar segundos, no milisegundos.
const UNREACHABLE_PATTERNS = [
  "can't reach database server",
  "cannot reach database server",
];

function errorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (
    error instanceof Prisma.PrismaClientInitializationError &&
    error.errorCode != null
  ) {
    return error.errorCode;
  }
  return null;
}

function isTransientConnectionError(error: unknown): boolean {
  const code = errorCode(error);
  if (code != null && CONNECTION_ERROR_CODES.has(code)) return true;
  // PrismaClientUnknownRequestError y otros no exponen un code estable, así que
  // se inspecciona el mensaje como red de seguridad.
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return CONNECTION_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

function isUnreachableError(error: unknown): boolean {
  if (errorCode(error) === "P1001") return true;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return UNREACHABLE_PATTERNS.some((pattern) => msg.includes(pattern));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PrismaRetryOptions {
  /** Reintentos adicionales tras el primer intento (default 3 → 4 intentos en total). */
  maxRetries?: number;
  /**
   * Backoff en ms por reintento. Si se omite, se elige automáticamente según el
   * tipo de error: más largo para P1001 (servidor despertando), más corto para
   * un socket cerrado.
   */
  backoffMs?: number[];
}

// Servidor de Azure despertando: hasta ~5s acumulados de espera.
const SLOW_BACKOFF = [500, 1500, 3000];
// Socket cerrado por idle: reconexión casi inmediata.
const FAST_BACKOFF = [200, 800, 1500];

/**
 * Ejecuta `fn` y, si falla por un error de conexión transitorio (P1001/P1017,
 * ConnectionReset, socket cerrado o servidor inalcanzable), fuerza una
 * reconexión y reintenta con backoff. El backoff es más largo para P1001 porque
 * un servidor de Azure que despierta tras una pausa tarda varios segundos.
 * Cualquier otro error (validación, P2xxx, lógica) se propaga tal cual.
 */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  options: PrismaRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !isTransientConnectionError(error)) {
        throw error;
      }

      const schedule =
        options.backoffMs ??
        (isUnreachableError(error) ? SLOW_BACKOFF : FAST_BACKOFF);
      const waitMs = schedule[attempt] ?? schedule[schedule.length - 1] ?? 500;

      console.warn(
        `[prisma-retry] intento ${attempt + 1}/${maxRetries + 1} falló` +
        ` (${errorCode(error) ?? "conexión"}); reintentando en ${waitMs}ms…`,
      );

      // Conexión stale / servidor despertando: fuerza una nueva conexión.
      try {
        await prisma.$connect();
      } catch {
        // Si $connect falla, el siguiente intento volverá a intentarlo.
      }
      await delay(waitMs);
    }
  }
  throw lastError;
}
