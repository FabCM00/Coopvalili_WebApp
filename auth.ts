import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { isRateLimited } from "@/lib/rate-limit";
import { MAX_OTP_ATTEMPTS } from "@/lib/tokens";
import { sendNewLoginNotificationEmail } from "@/lib/mailer";
import { authConfig } from "./auth.config";

class InactiveAccountError extends CredentialsSignin {
  code = "InactiveAccount";
}

class OtpRequiredError extends CredentialsSignin {
  code = "OtpRequired";
}

class InvalidOtpError extends CredentialsSignin {
  code = "InvalidOtp";
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().length(6).regex(/^\d{6}$/).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        otp: { label: "Código", type: "text" },
      },
      async authorize(credentials, request) {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        // Guard grueso sobre el submit completo (email+password+otp)
        if (await isRateLimited(`login-submit:${ip}`, 10, 60 * 1000)) {
          return null;
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, otp } = parsed.data;

        const user = await withPrismaRetry(() =>
          prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
              role: true,
              active: true,
              otpEnabled: true,
            },
          }),
        );

        if (!user?.passwordHash) return null;

        if (!user.active) throw new InactiveAccountError();

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        // El usuario desactivó la verificación en dos pasos: se salta por
        // completo la búsqueda/comparación de LoginOtp.
        if (user.otpEnabled) {
          const otpRow = await withPrismaRetry(() =>
            prisma.loginOtp.findFirst({
              where: { userId: user.id, used: false },
              orderBy: { createdAt: "desc" },
            }),
          );

          if (!otpRow) throw new OtpRequiredError();

          if (otpRow.expiresAt < new Date()) {
            await withPrismaRetry(() =>
              prisma.loginOtp.update({
                where: { id: otpRow.id },
                data: { used: true },
              }),
            );
            throw new InvalidOtpError();
          }

          if (otpRow.attempts >= MAX_OTP_ATTEMPTS) {
            throw new InvalidOtpError();
          }

          if (!otp) throw new OtpRequiredError();

          const otpOk = await bcrypt.compare(otp, otpRow.codeHash);
          if (!otpOk) {
            await withPrismaRetry(() =>
              prisma.loginOtp.update({
                where: { id: otpRow.id },
                data: { attempts: { increment: 1 } },
              }),
            );
            throw new InvalidOtpError();
          }

          await withPrismaRetry(() =>
            prisma.loginOtp.update({
              where: { id: otpRow.id },
              data: { used: true },
            }),
          );
        }

        const userAgent = request.headers.get("user-agent") ?? "unknown";

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role === "ADMIN" ? "admin" : "user",
          otpEnabled: user.otpEnabled,
          // Campos transitorios: solo para pasar IP/user-agent al callback
          // jwt() dentro del mismo ciclo de request. Se leen y descartan ahí,
          // nunca se persisten en el token/cookie.
          __loginIp: ip,
          __loginUserAgent: userAgent,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, ...rest }) {
      const base = await authConfig.callbacks.jwt({ token, user, ...rest });

      if (user) {
        const u = user as {
          email?: string | null;
          name?: string | null;
          __loginIp?: string;
          __loginUserAgent?: string;
        };
        if (u.email) {
          sendNewLoginNotificationEmail(
            u.email,
            {
              ip: u.__loginIp ?? "unknown",
              userAgent: u.__loginUserAgent ?? "unknown",
            },
            u.name ?? undefined,
          ).catch(console.error);
        }
      }

      return base;
    },
  },
});
