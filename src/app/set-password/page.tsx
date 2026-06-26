"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  LockKeyhole,
  AlertCircle,
  ArrowLeft,
  LogIn,
  CheckCircle2,
  Clock,
  MailX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthStateCard } from "@/components/auth/AuthStateCard";
import { LoadingScreen } from "@/components/LoadingScreen";

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula.")
      .regex(/[0-9]/, "La contraseña debe contener al menos un número."),
    confirm: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

type TokenStatus =
  | "checking"
  | "valid"
  | "already_used"
  | "expired"
  | "invalid";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isInvite = searchParams.get("type") === "invite";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(
    token ? "checking" : "invalid",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (!token) return;
    const endpoint = isInvite
      ? "/api/auth/accept-invite"
      : "/api/auth/reset-password";
    fetch(`${endpoint}?token=${token}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; code?: string }) => {
        if (data.ok) {
          setTokenStatus("valid");
          return;
        }
        if (data.code === "ALREADY_ACCEPTED" || data.code === "ALREADY_USED") {
          setTokenStatus("already_used");
        } else if (data.code === "EXPIRED") {
          setTokenStatus(isInvite ? "already_used" : "expired");
        } else {
          setTokenStatus("invalid");
        }
      })
      .catch(() => setTokenStatus("invalid"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tokenStatus === "checking")
    return <LoadingScreen message="Validando enlace…" />;

  if (tokenStatus === "already_used") {
    return (
      <AuthStateCard
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
        iconBg="bg-emerald-100"
        title="Tu cuenta ya está activa"
        description="Esta invitación ya fue utilizada. Tu contraseña ya fue creada, puedes iniciar sesión directamente."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="h-11 w-full rounded-[10px] bg-[#F29A2E] text-sm font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28]"
        >
          <LogIn className="mr-2 h-4 w-4" /> Ir al inicio de sesión
        </Button>
      </AuthStateCard>
    );
  }

  if (tokenStatus === "expired") {
    return (
      <AuthStateCard
        icon={<Clock className="h-6 w-6 text-amber-600" />}
        iconBg="bg-amber-100"
        title="Enlace expirado"
        description={
          isInvite
            ? "Esta invitación ha vencido. Solicita al administrador que te envíe una nueva."
            : "Este enlace de recuperación ha vencido. Solicita uno nuevo."
        }
      >
        {!isInvite && (
          <Button
            onClick={() => router.replace("/forgot-password")}
            className="h-11 w-full rounded-[10px] bg-[#F29A2E] text-sm font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28]"
          >
            Solicitar nuevo enlace
          </Button>
        )}
      </AuthStateCard>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <AuthStateCard
        icon={<MailX className="h-6 w-6 text-red-500" />}
        iconBg="bg-red-100"
        title="Enlace inválido"
        description="Este enlace no es válido o no existe. Verifica que hayas copiado la URL completa del correo."
      />
    );
  }

  if (done) {
    return (
      <AuthStateCard
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
        iconBg="bg-emerald-100"
        title="Contraseña definida"
        description="Tu contraseña fue creada exitosamente. Ya puedes iniciar sesión con tus credenciales."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="h-11 w-full rounded-[10px] bg-[#F29A2E] text-sm font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28]"
        >
          <LogIn className="mr-2 h-4 w-4" /> Continuar
        </Button>
      </AuthStateCard>
    );
  }

  const onSubmit = async (data: SetPasswordValues) => {
    setLoading(true);
    try {
      const endpoint = isInvite
        ? "/api/auth/accept-invite"
        : "/api/auth/reset-password";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError("root", {
          type: "server",
          message:
            json?.message ??
            "Token inválido o expirado. Solicita un nuevo enlace.",
        });
        return;
      }
      setDone(true);
    } catch {
      setError("root", {
        type: "server",
        message: "Error de conexión. Inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordError = errors.password?.message;
  const confirmError = errors.confirm?.message;
  const rootError = errors.root?.message;

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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Nueva contraseña
          </label>
          <div className="relative">
            <ShieldCheck
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                passwordError ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Escribe tu nueva contraseña"
              autoFocus
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
                "absolute right-3.5 top-1/2 -translate-y-1/2 transition",
                passwordError
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
          {passwordError && (
            <p className="text-sm font-medium text-red-600">{passwordError}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <LockKeyhole
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                confirmError ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              {...register("confirm")}
              className={cn(inputBase, confirmError ? inputError : inputNormal)}
            />
          </div>
          {confirmError && (
            <p className="text-sm font-medium text-red-600">{confirmError}</p>
          )}
        </div>

        {rootError && (
          <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-600">{rootError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#e08c28] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
            </>
          ) : isInvite ? (
            "Crear contraseña"
          ) : (
            "Guardar contraseña"
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

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
