"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-white">
      <header className="flex w-full items-center px-6 py-4">
        <Image
          src="/Imagen1.png"
          alt="WANT N' Get"
          width={120}
          height={36}
          className="h-8 w-auto object-contain sm:h-9"
        />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-[#012340] mb-3">
          Algo salió mal
        </h1>
        <p className="text-base leading-relaxed text-[#0D0D0D]/55 max-w-sm mb-2">
          Ocurrió un error inesperado. Intenta de nuevo o regresa al inicio.
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-[#0D0D0D]/30 mb-6">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm mt-6">
          <button
            onClick={reset}
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-[10px] border border-[#0D0D0D]/15 text-base font-semibold text-[#0D0D0D]/60 transition hover:border-[#012340] hover:text-[#012340]"
          >
            Ir al login
          </Link>
        </div>
      </div>
    </div>
  );
}
