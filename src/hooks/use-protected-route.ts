"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Role = "admin" | "user";

interface UseProtectedRouteOptions {
    allowedRoles?: Role[];
}

export function useProtectedRoute({ allowedRoles }: UseProtectedRouteOptions = {}) {
    const { user, profile, loading, error, refreshProfile, isLoggingOut } = useAuth();
    const router = useRouter();
    const wasAuthenticatedRef = useRef(false);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            const expired = wasAuthenticatedRef.current && !isLoggingOut;
            router.push(expired ? "/login?session=expired" : "/login");
            return;
        }

        if (error) {
            router.push("/login");
            return;
        }

        wasAuthenticatedRef.current = true;

        if (!profile) {
            refreshProfile();
            return;
        }

        if (profile && profile.estado !== true) {
            router.push("/login");
            return;
        }

        if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
            if (profile.role === "admin") {
                router.push("/admin/usuarios");
            } else {
                router.push("/usuario/bandeja");
            }
        }
    }, [user, profile, loading, allowedRoles, router, refreshProfile, error]);

    const isAuthorized =
        !loading &&
        !!user &&
        !!profile &&
        (!allowedRoles || allowedRoles.includes(profile.role));

    return { user, profile, loading, isAuthorized };
}