import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(`change-pw:${session.user.id}:${ip}`, 5, 60 * 1000)) {
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
        message: parsed.error?.message ?? "Contraseña inválida.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
