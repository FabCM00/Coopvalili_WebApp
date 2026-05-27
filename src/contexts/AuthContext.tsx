"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Mantiene la misma interfaz que la versión Supabase para no romper
// los componentes existentes que dependen de useAuth()
export interface Profile {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  estado: boolean;
  created_at: string;
}

interface AuthContextType {
  user: { id: string; email?: string | null; name?: string | null } | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapToProfile(
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  } | null,
): Profile | null {
  if (!user?.email || !user.id) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.name ?? user.email.split("@")[0],
    role: user.role === "admin" ? "admin" : "user",
    estado: true, // Solo llegan aquí usuarios activos
    created_at: "",
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loading = status === "loading";
  const sessionUser = session?.user ?? null;
  const profile = mapToProfile(
    sessionUser as Parameters<typeof mapToProfile>[0],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // beta.31 siempre devuelve "CredentialsSignin" — consultamos el estado
        // de la cuenta para dar un mensaje preciso sin revelar usuarios inexistentes
        try {
          const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";
          const res = await fetch(`${prefix}/api/auth/account-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const { inactive } = await res.json();
          if (inactive) {
            setError(
              "Tu cuenta ha sido desactivada. Contacta al administrador.",
            );
            return;
          }
        } catch {
          /* ignora errores de red — cae al mensaje genérico */
        }

        setError(traducirError(result.error));
        return;
      }

      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    await signOut({ redirectTo: "/login?session=closed" });
    setIsLoggingOut(false);
  }, []);

  // No-op con JWT: el perfil viene del token, no hay llamada a BD
  const refreshProfile = useCallback(
    async (): Promise<Profile | null> => profile,
    [profile],
  );

  return (
    <AuthContext.Provider
      value={{
        user: sessionUser
          ? {
              id: sessionUser.id ?? "",
              email: sessionUser.email,
              name: sessionUser.name,
            }
          : null,
        profile,
        loading,
        error,
        isLoggingOut,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function traducirError(code: string): string {
  if (code === "InactiveAccount")
    return "Tu cuenta ha sido desactivada. Contacta al administrador.";
  if (code === "CredentialsSignin") return "Correo o contraseña incorrectos.";
  if (/rate/i.test(code)) return "Demasiados intentos. Espera un momento.";
  return "Correo o contraseña incorrectos.";
}
