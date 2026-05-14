"use client";

import { useState } from "react";
import { Mail, ArrowLeft, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("El correo es obligatorio");
      return;
    }

    setLoading(true);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl.replace(/\/$/, "")}/set-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const showErrorState = !!error;

  const inputBase =
    "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
  const inputNormal =
    "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
  const inputError =
    "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-white p-[10px]">
      <div className="flex w-full max-w-[384px] flex-col gap-6 px-[16px]">
        {/* Logo de Want siempre arriba */}
        <div className="flex w-full justify-center">
          <img
            src="https://i.imgur.com/kBwQizJ.jpeg"
            alt="Want logo"
            className="h-20 w-20"
          />
        </div>

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="text-left text-2xl font-semibold tracking-tight text-[#012340]">
            Recuperar contraseña
          </h1>

          <p className="text-left text-base font-medium text-[#0D0D0D]/60">
            Ingresa tu correo para recibir un enlace de recuperación
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center rounded-xl bg-green-50 border border-green-200 p-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
            <div className="space-y-1">
              <p className="font-semibold text-green-800">Enlace enviado</p>
              <p className="text-sm text-green-700">
                Revisa tu bandeja de entrada para continuar con la recuperación.
              </p>
            </div>
            <a
              href="/login"
              className="mt-4 text-sm font-medium text-[#012340] hover:underline"
            >
              Volver al inicio de sesión
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-[#012340]"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className={cn(
                    "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                    showErrorState ? "text-red-500" : "text-[#0D0D0D]/40",
                  )}
                />
                <input
                  id="email"
                  type="email"
                  placeholder="Ingresa tu correo"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (showErrorState) setError(null);
                  }}
                  required
                  className={cn(
                    inputBase,
                    showErrorState ? inputError : inputNormal,
                  )}
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail("")}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 transition"
                    aria-label="Limpiar email"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Mensaje de error */}
              {showErrorState && (
                <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </Button>

            <div className="text-center mt-2">
              <a
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0D0D0D]/60 hover:text-[#0D0D0D] transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
