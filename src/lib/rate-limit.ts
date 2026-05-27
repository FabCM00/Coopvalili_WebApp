// Rate limiter en memoria — se resetea con cada cold start del servidor.
// Suficiente para un portal interno de ≤50 usuarios.
const store = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= max) return true;

  entry.count++;
  return false;
}
