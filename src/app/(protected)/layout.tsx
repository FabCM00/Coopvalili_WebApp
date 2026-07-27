"use client";


import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { NotificationProvider } from "@/contexts/NotificationContext";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    "/admin": { title: "Dashboard", subtitle: "Panel de administración" },
    "/admin/usuarios": { title: "Usuarios", subtitle: "Gestión de cuentas" },
    "/admin/asociados": { title: "Asociados", subtitle: "Datos de asociados" },
    "/admin/perfil": { title: "Mi Perfil", subtitle: "Información personal" },
    "/usuario": { title: "Crédito en Línea", subtitle: "Bandeja de solicitudes" },
    "/usuario/bandeja": { title: "Crédito en Línea", subtitle: "Mis solicitudes" },
    "/usuario/perfil": { title: "Mi Perfil", subtitle: "Información personal" },
};

/** Duración mínima del overlay de transición entre rutas, en ms. */
const ROUTE_TRANSITION_MS = 450;

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, isAuthorized, loading } = useProtectedRoute();
    const pathname = usePathname();
    const [navigating, setNavigating] = useState(false);
    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current === pathname) return;
        previousPathname.current = pathname;
        setNavigating(true);
        const timer = setTimeout(() => setNavigating(false), ROUTE_TRANSITION_MS);
        return () => clearTimeout(timer);
    }, [pathname]);

    if (loading) {
        return <LoadingScreen message="Cargando tu sesión..." />;
    }

    if (user && !profile) {
        return <LoadingScreen message="Cargando tu perfil..." />;
    }

    if (!isAuthorized || !profile) return null;

    const pageInfo = pageTitles[pathname] || { title: "" };

    return (
        <NotificationProvider>
            <div className="flex h-[100dvh] w-full flex-col bg-background">
                <Navbar role={profile.role} title={pageInfo.title} subtitle={pageInfo.subtitle} />
                <main className="relative flex-1 min-h-0 w-full max-w-9xl mx-auto overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {navigating && (
                        <div className="absolute inset-0 z-20 bg-white">
                            <LoadingScreen message="Cargando vista..." fullScreen={false} />
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </NotificationProvider>
    );
}