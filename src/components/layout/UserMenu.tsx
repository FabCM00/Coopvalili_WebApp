"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
    const { profile, user, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleLogout = async () => {
        setOpen(false);
        await logout();
        router.replace("/login");
    };

    const initial = profile?.username?.[0]?.toUpperCase() || "?";
    const roleLabel = profile?.role === "admin" ? "Administrador" : "Usuario";
    const perfilHref = profile?.role === "admin" ? "/admin/perfil" : "/usuario/perfil";

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="group flex items-center gap-2.5 rounded-xl p-1.5 outline-none transition-all hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#F29A2E] active:scale-[0.98]"
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F29A2E] to-[#d87c14] text-sm font-bold text-white shadow-sm ring-2 ring-white">
                    {initial}
                </div>
                <div className="hidden flex-col items-start text-left sm:flex">
                    <span className="text-sm font-semibold text-[#012340] leading-tight">
                        {profile?.username || user?.email?.split("@")[0] || "Usuario"}
                    </span>
                    <span className="text-[11px] text-[#0D0D0D]/45">{roleLabel}</span>
                </div>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-[#0D0D0D]/35 transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 origin-top-right rounded-xl border border-[#0D0D0D]/10 bg-white shadow-lg animate-in fade-in zoom-in-95">
                    {/* Info usuario */}
                    <div className="px-4 py-3 border-b border-[#0D0D0D]/8">
                        <p className="text-sm font-bold text-[#012340] truncate">
                            {profile?.username || user?.email?.split("@")[0] || "Usuario"}
                        </p>
                        <p className="text-xs text-[#0D0D0D]/45 truncate mt-0.5">{user?.email}</p>
                        <span className="mt-2 inline-block rounded-full bg-[#012340]/8 px-2.5 py-0.5 text-[10px] font-bold text-[#012340]/55 tracking-wide">
                            {roleLabel}
                        </span>
                    </div>

                    {/* Acciones */}
                    <div className="p-1.5">
                        <Link
                            href={perfilHref}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#012340]/70 transition hover:bg-[#012340]/5 hover:text-[#012340]"
                        >
                            <User className="h-4 w-4" />
                            Mi Perfil
                        </Link>

                        <div className="my-1 border-t border-[#0D0D0D]/8" />

                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
