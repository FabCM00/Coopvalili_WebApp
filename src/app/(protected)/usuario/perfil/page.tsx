"use client";

import { useProtectedRoute } from "@/hooks/use-protected-route";
import { ProfileView } from "@/components/profile/ProfileView";

export default function UsuarioPerfilPage() {
    useProtectedRoute({ allowedRoles: ["user"] });
    return <ProfileView />;
}
