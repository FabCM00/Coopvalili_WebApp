import React from "react";
import Image from "next/image";

interface AuthIllustrationPageProps {
    imageSrc: string;
    imageAlt: string;
    title: string;
    body: string;
    children?: React.ReactNode;
}

/**
 * Página de estado completa (éxito / error) para los flujos de auth.
 * Muestra una ilustración centrada, un título, un cuerpo de texto y
 * slots para los botones de acción.
 */
export function AuthIllustrationPage({
    imageSrc,
    imageAlt,
    title,
    body,
    children,
}: AuthIllustrationPageProps) {
    return (
        <div className="relative flex min-h-screen flex-col bg-white">
            <header className="flex w-full items-center px-6 py-4">
                <Image
                    src="/Imagen1.png"
                    alt="Want N' Get"
                    width={120}
                    height={36}
                    className="h-8 w-auto object-contain sm:h-9"
                />
            </header>
            <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
                <img
                    src={imageSrc}
                    alt={imageAlt}
                    className="w-full max-w-[320px] select-none"
                    draggable={false}
                />
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-3xl font-bold text-[#012340]">{title}</h1>
                    <p className="text-base leading-relaxed text-[#0D0D0D]/55">{body}</p>
                </div>
                {children && (
                    <div className="flex w-full flex-col gap-3">{children}</div>
                )}
            </div>
            </div>
        </div>
    );
}
