"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, X, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthIllustrationPage } from "@/components/auth/AuthIllustrationPage";

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg("El correo es obligatorio.");
      return;
    }

    setLoading(true);

    try {
      // El endpoint siempre responde ok:true para no revelar si el correo existe
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSent(true);
    } catch {
      setErrorMsg("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-exitoso.png"
        imageAlt="Correo enviado"
        title="Revisa tu correo"
        body="Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña en los próximos minutos."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al login
        </Button>
      </AuthIllustrationPage>
    );
  }

  const showErr = !!errorMsg;

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="text-left text-2xl font-semibold tracking-tight text-[#012340]">
          Recuperar contraseña
        </h1>
        <p className="text-left text-base font-medium text-[#0D0D0D]/60">
          Ingresa tu correo para recibir un enlace de recuperación
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-[#012340]">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail
              className={cn(
                "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                showErr ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              id="email"
              type="email"
              placeholder="Ingresa tu correo"
              value={email}
              autoFocus
              onChange={(e) => {
                setEmail(e.target.value);
                if (showErr) setErrorMsg(null);
              }}
              required
              className={cn(inputBase, showErr ? inputError : inputNormal)}
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
          {showErr && (
            <p className="mt-1 text-sm font-medium text-red-600">{errorMsg}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar enlace"
          )}
        </Button>

        <div className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0D0D0D]/60 hover:text-[#0D0D0D] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
