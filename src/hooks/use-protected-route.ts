"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Profile } from "@/contexts/AuthContext";

type Role = "admin" | "user";

interface UseProtectedRouteOptions {
  allowedRoles?: Role[];
}

function mapToProfile(user: {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}): Profile {
  return {
    id: user.id ?? "",
    email: user.email ?? "",
    username: user.name ?? (user.email?.split("@")[0] ?? ""),
    role: (user.role === "admin" ? "admin" : "user") as Role,
    estado: true,
    created_at: "",
  };
}

export function useProtectedRoute({
  allowedRoles,
}: UseProtectedRouteOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const loading = status === "loading";
  const user = session?.user ?? null;
  const role = user?.role as Role | undefined;
  const profile = user ? mapToProfile(user) : null;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.push(role === "admin" ? "/admin/usuarios" : "/usuario/bandeja");
    }
  }, [user, role, loading, allowedRoles, router]);

  const isAuthorized =
    !loading &&
    !!user &&
    (!allowedRoles || (role !== undefined && allowedRoles.includes(role)));

  return { user, profile, loading, isAuthorized };
}
