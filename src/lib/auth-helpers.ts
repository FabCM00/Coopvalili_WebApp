import { auth } from "../../auth";
import { redirect } from "next/navigation";

// Para Server Components y Route Handlers — nunca en Client Components
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// Redirige a /login si no hay sesión activa
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Redirige si el usuario no tiene rol admin
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/usuario/bandeja");
  return user;
}
