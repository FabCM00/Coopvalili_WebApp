"use client";

import Image from "next/image";

interface BusyOverlayProps {
  message: string;
  /**
   * true = cubre la ventana (acciones que recargan toda la vista, p. ej.
   * gestionar una solicitud). false = cubre el contenedor con `relative`
   * más cercano (acciones dentro de un panel).
   */
  fullScreen?: boolean;
}

/**
 * Velo de "trabajando": se muestra mientras una acción escribe en el servidor
 * (guardar, cambiar estado, eliminar, gestionar).
 *
 * Reutiliza el lenguaje visual de LoadingScreen (logo + barra naranja) pero como
 * overlay traslúcido, así el contenido sigue visible detrás y no se pierde el
 * contexto de lo que se está modificando.
 */
export function BusyOverlay({ message, fullScreen = false }: BusyOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-8 bg-white/80 backdrop-blur-[2px] ${
        fullScreen ? "fixed inset-0 z-[80]" : "absolute inset-0 z-20"
      }`}
    >
      <Image
        src="/Imagen1.png"
        alt="WANT N' Get"
        width={140}
        height={42}
        className="h-9 w-auto object-contain"
        priority
      />

      <div className="flex w-48 flex-col items-center gap-4">
        <div className="relative h-[3px] w-full overflow-hidden bg-[#0D0D0D]/8">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-brand-orange animate-[busy-bar_1.4s_ease-in-out_infinite]" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]/40">
          {message}
        </p>
      </div>

      <style>{`
        @keyframes busy-bar {
          0%   { left: -60%; width: 60%; }
          50%  { left: 40%;  width: 60%; }
          100% { left: 100%; width: 60%; }
        }
      `}</style>
    </div>
  );
}
