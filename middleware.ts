import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Usa solo authConfig (sin Prisma ni bcrypt) para correr en Edge Runtime
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Excluye: rutas de API de auth, archivos estáticos y de imagen
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
