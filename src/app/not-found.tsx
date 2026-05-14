"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function NotFound() {
    const { profile } = useAuth();

    const homeHref = profile?.role === "admin"
        ? "/admin/usuarios"
        : profile?.role === "user"
            ? "/usuario/bandeja"
            : "/login";

    return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-white px-6">
            {/* Logo */}
            <img
                src="/Imagen1.png"
                alt="WANT Tech 4 All"
                className="h-14 w-auto object-contain mb-10"
            />

            {/* 404 */}
            <div className="relative mb-6 select-none">
                <span className="text-[120px] sm:text-[160px] font-black leading-none text-[#012340]/6 tracking-tighter">
                    404
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-[52px] sm:text-[72px] font-black text-[#012340] tracking-tighter leading-none">
                    404
                </span>
            </div>

            {/* Divider con acento naranja */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-[#0D0D0D]/10" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#F29A2E]" />
                <div className="h-px w-12 bg-[#0D0D0D]/10" />
            </div>

            {/* Mensaje */}
            <h1 className="text-lg font-bold text-[#012340] mb-2 text-center">
                Página no encontrada
            </h1>
            <p className="text-sm text-[#0D0D0D]/45 text-center max-w-xs leading-relaxed mb-10">
                La ruta que intentas acceder no existe o fue movida.
                Verifica la URL o regresa a la plataforma.
            </p>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                    href={homeHref}
                    className="inline-flex h-11 items-center justify-center bg-[#012340] px-8 text-sm font-bold text-white tracking-widest uppercase transition hover:bg-[#012340]/90"
                >
                    Ir al inicio
                </Link>
                <button
                    onClick={() => history.back()}
                    className="inline-flex h-11 items-center justify-center border border-[#0D0D0D]/15 px-8 text-sm font-bold text-[#0D0D0D]/60 tracking-widest uppercase transition hover:border-[#012340] hover:text-[#012340]"
                >
                    Volver atrás
                </button>
            </div>

            {/* Footer */}
            <p className="mt-16 text-[11px] text-[#0D0D0D]/25 tracking-wide">
                WANT Tech 4 All · CoproDigital
            </p>
        </div>
    );
}
