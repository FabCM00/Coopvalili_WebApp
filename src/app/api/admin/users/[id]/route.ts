import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { prisma } from "@/lib/prisma";
// PATCH /api/auth/users/[id] — activa o desactiva un usuario (solo admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
  }

  const { active } = body as { active?: boolean };
  if (typeof active !== "boolean") {
    return NextResponse.json(
      { ok: false, message: "El campo 'active' debe ser booleano." },
      { status: 400 },
    );
  }

  // Verificar que el usuario existe y no es admin
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, message: "Usuario no encontrado." }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { ok: false, message: "No se puede modificar una cuenta de administrador." },
      { status: 403 },
    );
  }

  await prisma.user.update({
    where: { id },
    data: { active },
  });

  return NextResponse.json({ ok: true, active });
}
