import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email() });

// Solo revela "inactivo" si el usuario tiene contraseña configurada
// (previene enumerar cuentas pendientes o inexistentes)
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ inactive: false });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ inactive: false });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
    select: { active: true, passwordHash: true },
  });

  // Solo informa "inactivo" si el usuario ya configuró su contraseña pero fue desactivado
  const inactive = !!(user?.passwordHash && !user.active);
  return NextResponse.json({ inactive });
}
