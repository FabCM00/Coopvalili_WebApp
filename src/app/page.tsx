"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CAPTURED_AUTH_HASH } from "@/lib/supabase";

/**
 * Pagina raiz: orquesta el ruteo segun rol.
 *
 * Importante: si la app fue cargada con un hash de invitacion, el cliente
 * de Supabase ya lo capturo en CAPTURED_AUTH_HASH y limpio la URL. Si por
 * alguna razon el usuario aterrizo aqui en vez de en /set-password (p.ej.
 * porque el redirectTo no estaba configurado), redirigimos manualmente.
 */
export default function Home() {
    const { user, profile, loading, error, refreshProfile } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Si hay un hash de invitacion, mandar a /set-password con el hash.
        if (
            CAPTURED_AUTH_HASH &&
            (CAPTURED_AUTH_HASH.includes("type=invite") ||
                CAPTURED_AUTH_HASH.includes("type=signup") ||
                CAPTURED_AUTH_HASH.includes("type=recovery"))
        ) {
            router.replace("/set-password" + CAPTURED_AUTH_HASH);
            return;
        }

        if (loading) return;

        if (!user) {
            router.push("/login");
            return;
        }

        if (!profile) {
            if (error) {
                router.push("/login");
                return;
            }
            refreshProfile();
            return;
        }

        if (profile.role === "admin") {
            router.push("/admin");
        } else {
            router.push("/usuario");
        }
    }, [user, profile, loading, router, refreshProfile, error]);

    if (loading) return <LoadingScreen message="Cargando tu sesion..." />;
    if (!user)
        return <LoadingScreen message="Redirigiendo al inicio de sesion..." />;
    if (error)
        return (
            <LoadingScreen message="No pudimos cargar tu perfil. Redirigiendo..." />
        );
    if (!profile) return <LoadingScreen message="Cargando tu perfil..." />;
    return <LoadingScreen message="Entrando..." />;
}
