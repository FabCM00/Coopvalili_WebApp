import type { NextAuthConfig } from "next-auth";

/**
 * Prefijo propio de ESTA app para sus cookies de sesión. Debe ser DISTINTO en
 * cada despliegue que comparta dominio (p. ej. "coopvalili", "coop"); así la cookie
 * de una app no es leída ni sobrescrita por la otra y no se "roban" la sesión.
 */
const COOKIE_PREFIX = "coopvalili";
const useSecureCookies = process.env.NODE_ENV === "production";
const cookieBase = `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}`;

/**
 * Configuración base de Auth.js — 100% compatible con Edge Runtime.
 * No importa Prisma, bcrypt ni ningún módulo exclusivo de Node.js.
 * El middleware y auth.ts la reutilizan para compartir callbacks.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  // Cookies con nombre propio de la app: evita que sesiones de otras apps del
  // mismo dominio se compartan (ver COOKIE_PREFIX).
  cookies: {
    sessionToken: {
      name: `${cookieBase}.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookieBase}.callback-url`,
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${useSecureCookies ? "__Host-" : ""}${COOKIE_PREFIX}.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    /**
     * Se ejecuta en el middleware (Edge Runtime).
     * Protege rutas y redirige según rol sin consultar la base de datos,
     * porque el rol ya viene codificado en el JWT (cookie).
     */
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user as { role?: string } | undefined;
      const isLoggedIn = !!user;
      const role = user?.role;

      const isApiRoute = nextUrl.pathname.startsWith("/api/");
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isUserRoute = nextUrl.pathname.startsWith("/usuario");
      const isProtectedRoute = isAdminRoute || isUserRoute || isApiRoute;

      // Rutas API sin sesión → 401 JSON (no redirect al login)
      if (isApiRoute && !isLoggedIn) {
        return new Response(
          JSON.stringify({ ok: false, message: "No autorizado." }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      // Páginas protegidas sin sesión → redirect a /login
      if (isProtectedRoute && !isLoggedIn) return false;

      // Usuario normal intentando acceder a rutas de admin
      if (isLoggedIn && isAdminRoute && role !== "admin") {
        return Response.redirect(new URL(nextUrl.basePath + "/usuario/bandeja", nextUrl));
      }

      // Admin intentando acceder a rutas de usuario
      if (isLoggedIn && isUserRoute && role === "admin") {
        return Response.redirect(new URL(nextUrl.basePath + "/admin/usuarios", nextUrl));
      }

      return true;
    },

    // Codifica id y role en el JWT tras autenticar
    jwt({ token, user }) {
      if (user) {
        const u = user as { role?: string; id?: string };
        token.role = u.role;
        token.id = u.id ?? token.sub;
      }
      return token;
    },

    // Expone id y role del JWT a useSession() y auth()
    session({ session, token }) {
      const u = session.user as any;
      u.id = token.id ?? token.sub;
      u.role = token.role;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
