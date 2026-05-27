import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(ip, 5, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos." },
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
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error?.message ?? "Datos inválidos.",
      },
      { status: 400 },
    );
  }

  const { token, password, name } = parsed.data;

  const invite = await prisma.invitationToken.findUnique({
    where: { token },
  });

  if (!invite || invite.accepted || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, message: "Invitación inválida o expirada." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const derivedName = name?.trim() || invite.email.split("@")[0];

  // Upsert: crea el usuario o activa uno ya existente (re-invitado)
  await prisma.$transaction([
    prisma.user.upsert({
      where: { email: invite.email },
      create: {
        email: invite.email,
        name: derivedName,
        passwordHash,
        role: invite.role,
        active: true,
        emailVerified: new Date(),
      },
      update: {
        name: derivedName,
        passwordHash,
        role: invite.role,
        active: true,
        emailVerified: new Date(),
      },
    }),
    prisma.invitationToken.update({
      where: { id: invite.id },
      data: { accepted: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
