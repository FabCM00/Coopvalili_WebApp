import { randomBytes, randomInt } from "crypto";

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/** Código numérico de 6 dígitos, zero-padded. Usa crypto.randomInt (no Math.random). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function expiresIn(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const TOKEN_EXPIRY = {
  RESET_PASSWORD_MIN: 60,
  INVITATION_MIN: 7 * 24 * 60,
  LOGIN_OTP_MIN: 10,
} as const;

/** Tope de intentos de verificación por código de OTP emitido. */
export const MAX_OTP_ATTEMPTS = 5;
