"use client";

import { useProtectedRoute } from "@/hooks/use-protected-route";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BandejaView } from "@/components/bandeja/BandejaView";

export default function UsuarioBandejaPage() {
    const { isAuthorized, loading: authLoading, profile } = useProtectedRoute({
        allowedRoles: ["user"],
    });

    if (authLoading) return <LoadingScreen message="Cargando tu bandeja..." />;
    if (!isAuthorized || !profile) return null;


    return <BandejaView mode="user" />;
}
