"use client";

import { useProtectedRoute } from "@/hooks/use-protected-route";
import { ProfileView } from "@/components/profile/ProfileView";

export default function AdminPerfilPage() {
    useProtectedRoute({ allowedRoles: ["admin"] });
    return <ProfileView />;
}
