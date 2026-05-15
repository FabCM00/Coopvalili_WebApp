import React from "react";

/**
 * Contenedor base para las páginas de auth con formulario.
 * Centra el contenido, aplica el fondo y muestra el logo arriba.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[100dvh] w-full items-center justify-center bg-white p-4">
            <div className="flex w-full max-w-[400px] flex-col gap-6 px-4">
                <div className="flex w-full justify-center">
                    <img
                        src="https://i.imgur.com/kBwQizJ.jpeg"
                        alt="Want N' Get"
                        className="h-20 w-20"
                    />
                </div>
                {children}
            </div>
        </div>
    );
}
