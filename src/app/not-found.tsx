"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function NotFound() {
  const { profile } = useAuth();

  const homeHref =
    profile?.role === "admin"
      ? "/admin/usuarios"
      : profile?.role === "user"
        ? "/usuario/bandeja"
        : "/login";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center px-6 py-5">
        <Image
          src="/Imagen1.png"
          alt="Want Tech 4 All"
          width={130}
          height={40}
          priority
          className="h-9 w-auto"
        />
      </header>

      {/* Content */}
      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <Image
          src="/404.png"
          alt="Error 404"
          width={900}
          height={600}
          priority
          className="mb-8 w-full max-w-3xl select-none object-contain"
          draggable={false}
        />

        <h1 className="mb-3 text-4xl font-bold text-[#012340]">
          Página no encontrada
        </h1>

        <p className="mb-8 max-w-md text-base text-slate-500">
          La página que intentas visitar no existe, fue movida o el enlace es
          incorrecto.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={homeHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 font-semibold text-white transition-all hover:bg-brand-orange-hover"
          >
            Ir al inicio
            <ArrowRight size={18} />
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 font-semibold text-[#012340] transition-all hover:border-[#012340]"
          >
            <ArrowLeft size={18} />
            Volver atrás
          </button>
        </div>
      </main>
    </div>
  );
}
