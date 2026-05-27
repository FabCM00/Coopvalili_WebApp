import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, expiresIn, TOKEN_EXPIRY } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 3 intentos por minuto por IP
  if (await isRateLimited(ip, 3, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos. Espera un minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);

  // Respuesta siempre exitosa para no revelar si el correo existe en la BD
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, active: true },
    });

    if (user?.active) {
      // Invalida tokens anteriores del mismo usuario
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      const token = generateSecureToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: expiresIn(TOKEN_EXPIRY.RESET_PASSWORD_MIN),
        },
      });

      // Fire-and-forget — no bloquear la respuesta por el envío del email
      sendPasswordResetEmail(email, token).catch(console.error);
    }
  } catch (err) {
    console.error("[forgot-password]", err);
    // Error interno silencioso — el cliente siempre recibe ok:true
  }

  return NextResponse.json({ ok: true });
}
