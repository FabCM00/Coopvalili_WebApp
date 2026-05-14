import { Database, DatabaseBackup, Inbox, LayoutDashboard, User, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

export interface NavSection {
    title?: string;
    items: NavItem[];
}

export const navigation: NavSection[] = [
    {
        items: [
            { label: "Usuarios", href: "/admin/usuarios", icon: Users },
            { label: "Datos Asociados", href: "/admin/asociados", icon: Database },
            { label: "Mi Perfil", href: "/admin/perfil", icon: User },

        ],
    },
];

export const userNavigation: NavSection[] = [
    {
        items: [
            { label: "Bandeja", href: "/usuario/bandeja", icon: Inbox },
            { label: "Mi Perfil", href: "/usuario/perfil", icon: User },
        ],
    },
];

export function getNavigationByRole(role: "admin" | "user"): NavSection[] {
    return role === "admin" ? navigation : userNavigation;
}