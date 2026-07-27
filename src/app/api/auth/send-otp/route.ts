import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { generateOtpCode, expiresIn, TOKEN_EXPIRY } from "@/lib/tokens";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 3 intentos por minuto por IP — igual que forgot-password
  if (await isRateLimited(`otp-send:${ip}`, 3, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos. Espera un minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Correo o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Límite adicional por email (no solo por IP): evita que alguien con la
  // contraseña correcta pero rotando IPs bombardee de correos a un usuario.
  // Se revisa siempre, antes del lookup, para que su presencia/ausencia no
  // delate si la cuenta existe.
  if (await isRateLimited(`otp-send-email:${email}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos para este correo." },
      { status: 429 },
    );
  }

  try {
    const user = await withPrismaRetry(() =>
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          active: true,
          passwordHash: true,
          otpEnabled: true,
        },
      }),
    );

    if (!user?.passwordHash) {
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tu cuenta ha sido desactivada. Contacta al administrador.",
        },
        { status: 403 },
      );
    }

    const passwordOk = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, message: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    // El usuario tiene la verificación en dos pasos desactivada: no hace
    // falta generar ni enviar ningún código.
    if (!user.otpEnabled) {
      return NextResponse.json({ ok: true, otpRequired: false });
    }

    // Invalida códigos anteriores no usados del mismo usuario
    await withPrismaRetry(() =>
      prisma.loginOtp.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      }),
    );

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);

    await withPrismaRetry(() =>
      prisma.loginOtp.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt: expiresIn(TOKEN_EXPIRY.LOGIN_OTP_MIN),
        },
      }),
    );

    // Fire-and-forget — no bloquear la respuesta por el envío del email
    sendLoginOtpEmail(email, code, user.name ?? undefined).catch(
      console.error,
    );

    return NextResponse.json({ ok: true, otpRequired: true });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json(
      { ok: false, message: "No se pudo enviar el código. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
