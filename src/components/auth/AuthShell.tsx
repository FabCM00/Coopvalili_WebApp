import React from "react";

/**
 * Contenedor base para las páginas de auth con formulario.
 * Centra el contenido verticalmente y asegura el footer abajo de forma absoluta.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-white p-4">
      {/* Contenedor del Formulario Centrado */}
      <div className="flex w-full max-w-[400px] flex-col gap-6 px-4 pb-16">
        <div className="flex w-full justify-start">
          <img
            src="https://i.imgur.com/kBwQizJ.jpeg"
            alt="Want N' Get"
            className="h-20 w-20 object-contain"
          />
        </div>
        {children}
      </div>

      {/* Footer fijado abajo del todo */}
      <footer className="absolute bottom-0 left-0 w-full py-4 text-center">
        <p className="text-sm font-medium text-[#0D0D0D]/40">
          © 2026 WANT N&apos; GET. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
