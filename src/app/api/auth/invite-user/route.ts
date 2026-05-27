import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, expiresIn, TOKEN_EXPIRY } from "@/lib/tokens";
import { sendInvitationEmail } from "@/lib/mailer";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  role: z.enum(["USER", "ADMIN"]).optional().default("USER"),
});

export async function POST(req: NextRequest) {
  // 1. Verificar sesión y rol admin
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "Solo los administradores pueden invitar usuarios." },
      { status: 403 },
    );
  }

  // 2. Rate limiting por IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(ip, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 },
    );
  }

  // 3. Validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error?.message ?? "Datos inválidos.",
      },
      { status: 400 },
    );
  }

  const { email, role } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 4. Verificar que no exista una cuenta ya activa
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, active: true },
  });

  if (existing?.active) {
    return NextResponse.json(
      { ok: false, message: "Ya existe una cuenta activa con ese correo." },
      { status: 409 },
    );
  }

  // 5. Invalidar invitaciones anteriores al mismo correo
  await prisma.invitationToken.updateMany({
    where: { email: normalizedEmail, accepted: false },
    data: { accepted: true },
  });

  // 6. Crear token de invitación
  const token = generateSecureToken();

  await prisma.invitationToken.create({
    data: {
      email: normalizedEmail,
      token,
      role,
      invitedById: session.user.id,
      expiresAt: expiresIn(TOKEN_EXPIRY.INVITATION_MIN),
    },
  });

  // 7. Enviar email de invitación (fire-and-forget)
  sendInvitationEmail(
    normalizedEmail,
    token,
    session.user.name ?? undefined,
  ).catch(console.error);

  return NextResponse.json({
    ok: true,
    message: `Invitación enviada a ${normalizedEmail}`,
  });
}
