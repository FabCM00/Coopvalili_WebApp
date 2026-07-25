"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  ShieldCheck,
  KeyRound,
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

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
  otp: z
    .string()
    .length(6, "Ingresa los 6 dígitos.")
    .regex(/^\d{6}$/, "El código solo contiene números.")
    .optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const RESEND_COOLDOWN_SECONDS = 30;

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

type AlertType = "expired" | "closed" | null;

export function LoginForm() {
  const { requestOtp, login, error } = useAuth();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeAlert, setActiveAlert] = useState<AlertType>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const email = watch("email", "");
  const password = watch("password", "");

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam === "expired") setActiveAlert("expired");
    else if (sessionParam === "closed") setActiveAlert("closed");
  }, [searchParams]);

  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => setActiveAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  useEffect(() => {
    if (session?.user) {
      setRedirecting(true);
      const role = session.user.role;
      router.replace(role === "admin" ? "/admin/usuarios" : "/usuario/bandeja");
    }
  }, [session, router]);

  useEffect(() => {
    if (error) {
      setError(step === 3 ? "otp" : "password", {
        type: "server",
        message: error ?? "Código o credenciales incorrectos.",
      });
    }
  }, [error, setError, step]);

  useEffect(() => {
    if (step === 2) setTimeout(() => setFocus("password"), 50);
    if (step === 3) setTimeout(() => setFocus("otp"), 50);
  }, [step, setFocus]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleContinue = async () => {
    const valid = await trigger("email");
    if (!valid) return;
    setIsCheckingEmail(true);
    setTimeout(() => {
      setIsCheckingEmail(false);
      setStep(2);
    }, 600);
  };

  const handleBack = () => {
    setStep(1);
    setValue("password", "");
    setValue("otp", "");
    clearErrors("password");
    clearErrors("otp");
  };

  const handleBackToPassword = () => {
    setStep(2);
    setValue("otp", "");
    clearErrors("otp");
  };

  const handleSendOtp = async () => {
    const valid = await trigger("password");
    if (!valid) return;

    setIsSendingOtp(true);
    const result = await requestOtp(email, password);
    setIsSendingOtp(false);

    if (!result.ok) {
      setError("password", {
        type: "server",
        message: result.message ?? "No se pudo enviar el código.",
      });
      return;
    }

    // El usuario tiene la verificación en dos pasos desactivada: entra
    // directo con email+contraseña, sin pasar por el Step 3.
    if (!result.otpRequired) {
      setIsSigningIn(true);
      await login(email, password);
      setIsSigningIn(false);
      return;
    }

    setValue("otp", "");
    clearErrors("otp");
    setStep(3);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    const result = await requestOtp(email, password);
    setIsSendingOtp(false);

    if (!result.ok) {
      setError("otp", {
        type: "server",
        message: result.message ?? "No se pudo reenviar el código.",
      });
      return;
    }

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsSigningIn(true);
    await login(data.email, data.password, data.otp);
    setIsSigningIn(false);
  };

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const otpError = errors.otp?.message;

  return (
    <AuthShell>
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

      {activeAlert === "closed" && (
        <div className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 relative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
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
            : step === 2
              ? "Ingresa tu contraseña"
              : "Ingresa el código que enviamos a tu correo"}
        </p>
      </div>

      {/* Step 1 — Correo */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleContinue();
          }}
          className="flex flex-col gap-5"
        >
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
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 transition"
                  aria-label="Limpiar correo"
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
            disabled={isCheckingEmail}
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-brand-orange text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-brand-orange-hover disabled:opacity-50"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendOtp();
          }}
          className="flex flex-col gap-5"
        >
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
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-brand-orange transition"
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
                  passwordError ? "text-red-500" : "text-[#0D0D0D]/40",
                )}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                {...register("password")}
                className={cn(
                  inputBase,
                  passwordError ? inputError : inputNormal,
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={cn(
                  "absolute top-1/2 right-3.5 -translate-y-1/2 transition",
                  passwordError
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
            {passwordError && (
              <p className="text-sm font-medium text-red-600">
                {passwordError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSendingOtp}
            className="h-12 w-full rounded-[10px] bg-brand-orange text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {isSendingOtp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando código...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </form>
      )}

      {/* Step 3 — Código de verificación */}
      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
                onClick={handleBackToPassword}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-brand-orange transition"
                aria-label="Volver a la contraseña"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="otp"
              className="text-sm font-semibold text-[#012340]"
            >
              Código de verificación
            </label>
            <div className="relative">
              <KeyRound
                className={cn(
                  "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                  otpError ? "text-red-500" : "text-[#0D0D0D]/40",
                )}
              />
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                {...register("otp")}
                className={cn(
                  inputBase,
                  "tracking-[0.4em] font-mono",
                  otpError ? inputError : inputNormal,
                )}
              />
            </div>
            {otpError && (
              <p className="text-sm font-medium text-red-600">{otpError}</p>
            )}
            <p className="text-sm text-[#0D0D0D]/50">
              Revisa tu correo — si no llega en unos segundos, verifica tu
              contraseña y vuelve a intentar.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSigningIn || redirecting}
            className="h-12 w-full rounded-[10px] bg-brand-orange text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-brand-orange-hover disabled:opacity-50"
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

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isSendingOtp}
              className="text-sm font-medium text-brand-orange hover:underline disabled:text-[#0D0D0D]/30 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Reenviar código (${resendCooldown}s)`
                : isSendingOtp
                  ? "Enviando..."
                  : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm font-medium text-brand-orange hover:underline"
        >
          Olvidé mi contraseña
        </a>
      </div>
    </AuthShell>
  );
}
