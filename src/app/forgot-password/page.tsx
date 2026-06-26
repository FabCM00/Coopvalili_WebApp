"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, X, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthStateCard } from "@/components/auth/AuthStateCard";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio.")
    .email("Ingresa un correo válido."),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const email = watch("email", "");
  const emailError = errors.email?.message;

  const callApi = async (addr: string) => {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addr }),
    });
  };

  const onSubmit = async (data: ForgotFormValues) => {
    const addr = data.email.trim().toLowerCase();
    setLoading(true);
    try {
      await callApi(addr);
      setSentEmail(addr);
      setSent(true);
    } catch {
      setError("email", {
        type: "server",
        message: "Error de conexión. Inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await callApi(sentEmail);
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  if (sent) {
    return (
      <AuthStateCard
        icon={<Mail className="h-6 w-6 text-[#F29A2E]" />}
        iconBg="bg-[#F29A2E]/10"
        title="Revisa tu correo"
        description={
          <>
            Enviamos un enlace a{" "}
            <strong className="font-semibold text-[#012340]">
              {sentEmail}
            </strong>
            . Puede tardar unos minutos.
          </>
        }
      >
        <a
          href="mailto:"
          className="flex h-11 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-sm font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28]"
        >
          Abrir cliente de correo
        </a>
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="flex items-center justify-center gap-1.5 text-sm text-[#0D0D0D]/45 transition hover:text-[#0D0D0D]/70 disabled:opacity-50"
        >
          {resending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reenviando…
            </>
          ) : resent ? (
            "¡Enlace reenviado!"
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> ¿No lo recibiste? Reenviar
            </>
          )}
        </button>
      </AuthStateCard>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#012340]">
          Recuperar contraseña
        </h1>
        <p className="text-base font-medium text-[#0D0D0D]/60">
          Ingresa tu correo para recibir un enlace de recuperación
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                emailError ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              id="email"
              type="email"
              placeholder="Ingresa tu correo"
              autoFocus
              {...register("email")}
              className={cn(inputBase, emailError ? inputError : inputNormal)}
            />
            {email && (
              <button
                type="button"
                onClick={() => {
                  setValue("email", "");
                  clearErrors("email");
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0D0D0D]/40 transition hover:text-[#0D0D0D]/70"
                aria-label="Limpiar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {emailError && (
            <p className="text-sm font-medium text-red-600">{emailError}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
            </>
          ) : (
            "Enviar enlace"
          )}
        </Button>

        <div className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0D0D0D]/60 transition hover:text-[#0D0D0D]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
