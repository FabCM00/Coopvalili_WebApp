import { randomBytes } from "crypto";

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function expiresIn(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const TOKEN_EXPIRY = {
  RESET_PASSWORD_MIN: 60,
  INVITATION_MIN: 7 * 24 * 60,
} as const;
