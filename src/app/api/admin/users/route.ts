import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

// Lista usuarios (excluye admins) para el panel de administración
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Acceso denegado." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      passwordHash: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Mapea al shape que espera la UI
  // passwordSet distingue "Pendiente" (invitado, sin contraseña) de "Inactivo" (desactivado)
  const data = users.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.name ?? u.email.split("@")[0],
    role: "user" as const,
    estado: u.active,
    passwordSet: !!u.passwordHash,
    created_at: u.createdAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, data });
}
