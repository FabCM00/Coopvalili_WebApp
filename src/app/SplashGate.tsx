"use client";

import Image from "next/image";

interface LoadingScreenProps {
  message?: string;
  /** true = pantalla completa (splash); false = llena el contenedor padre. */
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = "Cargando...",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center bg-white gap-10 ${fullScreen ? "h-[100dvh]" : "h-full"}`}
    >
      {/* Logo */}
      <Image
        src="/Imagen1.png"
        alt="WANT N' Get"
        width={140}
        height={42}
        className="h-10 w-auto object-contain"
        priority
      />

      {/* Barra de progreso industrial */}
      <div className="flex flex-col items-center gap-4 w-48">
        <div className="relative h-[3px] w-full bg-[#0D0D0D]/8 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[#F29A2E] animate-[loading-bar_1.4s_ease-in-out_infinite]" />
        </div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#0D0D0D]/40">
          {message}
        </p>
      </div>

      <style>{`
                @keyframes loading-bar {
                    0%   { left: -60%; width: 60%; }
                    50%  { left: 40%; width: 60%; }
                    100% { left: 100%; width: 60%; }
                }
            `}</style>
    </div>
  );
}
