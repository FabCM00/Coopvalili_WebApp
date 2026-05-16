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
        <div className="relative flex h-[100dvh] w-full flex-col bg-white">
            {/* Navbar logo */}
            <header className="flex w-full items-center px-6 py-4">
                <img
                    src="/Imagen1.png"
                    alt="WANT N' Get"
                    className="h-8 w-auto object-contain sm:h-9"
                />
            </header>

            {/* Contenido centrado */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <img
                    src="/404.png"
                    alt="Página no encontrada"
                    className="w-full max-w-[320px] select-none mb-8"
                    draggable={false}
                />

                <h1 className="text-3xl font-bold text-[#012340] mb-3">
                    Página no encontrada
                </h1>
                <p className="text-base leading-relaxed text-[#0D0D0D]/55 max-w-sm mb-8">
                    La ruta que intentas acceder no existe o fue movida.
                    Verifica la URL o regresa a la plataforma.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <Link
                        href={homeHref}
                        className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
                    >
                        Ir al inicio
                    </Link>
                    <button
                        onClick={() => history.back()}
                        className="flex h-12 w-full items-center justify-center rounded-[10px] border border-[#0D0D0D]/15 text-base font-semibold text-[#0D0D0D]/60 transition hover:border-[#012340] hover:text-[#012340]"
                    >
                        Volver atrás
                    </button>
                </div>
            </div>
        </div>
    );
}
