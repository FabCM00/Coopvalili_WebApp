"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

type AlertType = "expired" | "closed" | null;

export function LoginForm() {
  const { login, error, loading } = useAuth();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeAlert, setActiveAlert] = useState<AlertType>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Inicializar alerta desde URL
  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam === "expired") {
      setActiveAlert("expired");
    } else if (sessionParam === "closed") {
      setActiveAlert("closed");
    }
  }, [searchParams]);

  // Temporizador para desaparecer la alerta (5 segundos)
  useEffect(() => {
    if (activeAlert) {
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeAlert]);

  // Redirección por sesión activa
  useEffect(() => {
    if (session?.user) {
      setRedirecting(true);
      const role = session.user.role;
      router.replace(role === "admin" ? "/admin/usuarios" : "/usuario/bandeja");
    }
  }, [session, router]);

  useEffect(() => {
    if (error) setHasAuthError(true);
  }, [error]);

  useEffect(() => {
    if (step === 2) setTimeout(() => passwordRef.current?.focus(), 50);
  }, [step]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email) {
      setFormError("Ingresa tu correo electrónico.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Ingresa un correo válido.");
      return;
    }

    // Activa el estado de carga simulado antes de pasar al paso de contraseña
    setIsCheckingEmail(true);
    setTimeout(() => {
      setIsCheckingEmail(false);
      setStep(2);
    }, 600); // Pequeña transición fluida de carga
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setHasAuthError(false);
    if (!password) {
      setFormError("Ingresa tu contraseña.");
      return;
    }
    setIsSigningIn(true);
    await login(email, password);
    setIsSigningIn(false);
  };

  const handleBack = () => {
    setStep(1);
    setPassword("");
    setFormError(null);
    setHasAuthError(false);
  };

  const errorMessage =
    formError ||
    (hasAuthError ? (error ?? "Correo o contraseña incorrectos.") : null);
  const showErr = !!errorMessage;

  return (
    <AuthShell>
      {/* Alerta de Sesión Expirada */}
      {activeAlert === "expired" && (
        <div className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 relative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm font-medium text-amber-800 pr-6">
            Tu sesión expiró. Por favor inicia sesión nuevamente.
          </p>
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="absolute top-3 right-3 text-amber-500 hover:text-amber-700 transition"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Alerta de Sesión Cerrada (Estilizada en color corporativo ámbar/naranja similar al botón) */}
      {activeAlert === "closed" && (
        <div className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 relative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F29A2E]" />
          <p className="text-sm font-medium text-amber-900 pr-6">
            Tu sesión ha sido cerrada correctamente.
          </p>
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="absolute top-3 right-3 text-amber-500 hover:text-amber-700 transition"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-left text-2xl font-semibold tracking-tight text-[#012340]">
          Inicia sesión en WANT N&apos; GET
        </h1>
        <p className="text-left text-base font-medium text-[#0D0D0D]/60">
          {step === 1
            ? "Ingresa tu correo para continuar"
            : "Ingresa tu contraseña"}
        </p>
      </div>

      {/* Step 1 — Correo */}
      {step === 1 && (
        <form onSubmit={handleContinue} className="flex flex-col gap-5">
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
                  if (formError) setFormError(null);
                }}
                className={cn(inputBase, showErr ? inputError : inputNormal)}
              />
              {email && (
                <button
                  type="button"
                  onClick={() => setEmail("")}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 transition"
                  aria-label="Limpiar correo"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {showErr && (
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isCheckingEmail}
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
          >
            {isCheckingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </form>
      )}

      {/* Step 2 — Contraseña */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#012340]">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-[#0D0D0D]/30" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full h-12 rounded-[10px] border-[1.2px] border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.03] pl-11 pr-10 text-base text-[#0D0D0D]/50 outline-none"
              />
              <button
                type="button"
                onClick={handleBack}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#F29A2E] transition"
                aria-label="Editar correo"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-[#012340]"
            >
              Contraseña
            </label>
            <div className="relative">
              <ShieldCheck
                className={cn(
                  "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                  showErr ? "text-red-500" : "text-[#0D0D0D]/40",
                )}
              />
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (showErr) setHasAuthError(false);
                }}
                className={cn(inputBase, showErr ? inputError : inputNormal)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={cn(
                  "absolute top-1/2 right-3.5 -translate-y-1/2 transition",
                  showErr
                    ? "text-red-500 hover:text-red-700"
                    : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
                )}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {showErr && (
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSigningIn || redirecting}
            className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
          >
            {redirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirigiendo...
              </>
            ) : isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>
      )}

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm font-medium text-[#F28A2E] hover:underline"
        >
          Olvidé mi contraseña
        </a>
      </div>
    </AuthShell>
  );
}
