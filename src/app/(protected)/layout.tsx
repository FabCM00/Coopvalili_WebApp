"use client";


import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useProtectedRoute } from "@/hooks/use-protected-route";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    "/admin": { title: "Dashboard", subtitle: "Panel de administración" },
    "/admin/usuarios": { title: "Usuarios", subtitle: "Gestión de cuentas" },
    "/admin/asociados": { title: "Asociados", subtitle: "Datos de asociados" },
    "/admin/solicitudes": { title: "Solicitudes", subtitle: "Bandeja de solicitudes" },
    "/admin/reportes": { title: "Reportes", subtitle: "Análisis y métricas" },
    "/admin/configuracion": { title: "Configuración", subtitle: "Ajustes del sistema" },
    "/admin/perfil": { title: "Mi Perfil", subtitle: "Información personal" },
    "/usuario": { title: "Crédito en Línea", subtitle: "Bandeja de solicitudes" },
    "/usuario/bandeja": { title: "Crédito en Línea", subtitle: "Mis solicitudes" },
    "/usuario/solicitudes": { title: "Mis Solicitudes", subtitle: "Historial" },
    "/usuario/perfil": { title: "Mi Perfil", subtitle: "Información personal" },
};

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, isAuthorized, loading } = useProtectedRoute();
    const pathname = usePathname();


    if (loading) {
        return <LoadingScreen message="Cargando tu sesión..." />;
    }

    if (user && !profile) {
        return <LoadingScreen message="Cargando tu perfil..." />;
    }

    if (!isAuthorized || !profile) return null;

    const pageInfo = pageTitles[pathname] || { title: "" };

    return (
        <div className="flex h-[100dvh] w-full flex-col bg-background">
            <Navbar role={profile.role} title={pageInfo.title} subtitle={pageInfo.subtitle} />
            <main className="flex-1 min-h-0 w-full max-w-9xl mx-auto overflow-y-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}