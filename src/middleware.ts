import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Excluir assets estáticos, API de next-auth, imágenes y archivos internos
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
