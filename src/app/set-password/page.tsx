"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  LockKeyhole,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
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

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const isInvite = searchParams.get("type") === "invite";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Token ausente en la URL
  if (!token) {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-error.png"
        imageAlt="Enlace inválido"
        title="Enlace inválido"
        body="Este enlace no contiene un token válido. Solicita un nuevo enlace."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  if (done) {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-exitoso.png"
        imageAlt="Contraseña creada"
        title="¡Contraseña guardada!"
        body="Tu acceso está listo. Inicia sesión para continuar."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ir al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos una mayúscula.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe contener al menos un número.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isInvite
        ? "/api/auth/accept-invite"
        : "/api/auth/reset-password";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(
          json?.message ?? "Token inválido o expirado. Solicita un nuevo enlace.",
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const showErr = !!error;

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#012340]">
          {isInvite ? "Crea tu contraseña" : "Nueva contraseña"}
        </h1>
        <p className="text-base font-medium text-[#0D0D0D]/60">
          {isInvite
            ? "Configura el acceso seguro para tu nueva cuenta."
            : "Elige una contraseña segura para recuperar tu acceso."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Nueva contraseña
          </label>
          <div className="relative">
            <ShieldCheck
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                showErr ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Escribe tu nueva contraseña"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(inputBase, showErr ? inputError : inputNormal)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cn(
                "absolute right-3.5 top-1/2 -translate-y-1/2 transition",
                showErr
                  ? "text-red-500 hover:text-red-700"
                  : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
              )}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <LockKeyhole
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                showErr ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={cn(inputBase, showErr ? inputError : inputNormal)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : isInvite ? (
            "Crear contraseña"
          ) : (
            "Guardar contraseña"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
