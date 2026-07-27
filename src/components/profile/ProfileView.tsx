"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Clock,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Database,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function ProfileView() {
  const { profile } = useAuth();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPwd: "", confirmPwd: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult, setPwResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(profile?.otpEnabled ?? false);
  const [otpSaving, setOtpSaving] = useState(false);
  const [otpResult, setOtpResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  // Estado de la base de datos (health-check contra /api/health).
  const [dbStatus, setDbStatus] = useState<"loading" | "ok" | "down">(
    "loading",
  );
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [dbChecking, setDbChecking] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    const check = async () => {
      setDbChecking(true);
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const json = (await res.json()) as { db?: string; latencyMs?: number };
        if (!active) return;
        if (res.ok && json.db === "ok") {
          setDbStatus("ok");
          setDbLatency(
            typeof json.latencyMs === "number" ? json.latencyMs : null,
          );
        } else {
          setDbStatus("down");
          setDbLatency(null);
        }
      } catch {
        if (active) {
          setDbStatus("down");
          setDbLatency(null);
        }
      } finally {
        if (active) setDbChecking(false);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [refreshTick]);

  useEffect(() => {
    if (profile) setOtpEnabled(profile.otpEnabled);
  }, [profile]);

  if (!profile) return null;

  const inicial = (profile.username ?? profile.email ?? "?")
    .charAt(0)
    .toUpperCase();

  const fechaRegistro = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "—";

  const rolLabel = profile.role === "admin" ? "Administrador" : "Usuario";

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwResult(null);
    if (pwForm.newPwd.length < 6) {
      setPwResult({
        ok: false,
        msg: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }
    if (pwForm.newPwd !== pwForm.confirmPwd) {
      setPwResult({ ok: false, msg: "Las contraseñas no coinciden." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwForm.newPwd }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (json.ok) {
        setPwResult({ ok: true, msg: "Contraseña actualizada correctamente." });
        setPwForm({ newPwd: "", confirmPwd: "" });
      } else {
        setPwResult({
          ok: false,
          msg: json.message || "Error al actualizar la contraseña.",
        });
      }
    } catch {
      setPwResult({ ok: false, msg: "Error de conexión. Inténtalo de nuevo." });
    } finally {
      setPwLoading(false);
    }
  };

  const handleToggleOtp = async (checked: boolean) => {
    setOtpSaving(true);
    setOtpResult(null);
    try {
      const res = await fetch("/api/auth/toggle-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) {
        setOtpResult({
          ok: false,
          msg: json.message || "No se pudo actualizar.",
        });
        return;
      }
      setOtpEnabled(checked);
      setOtpResult({
        ok: true,
        msg: checked
          ? "Verificación en dos pasos activada. Se pedirá desde tu próximo inicio de sesión."
          : "Verificación en dos pasos desactivada.",
      });
    } catch {
      setOtpResult({ ok: false, msg: "Error de conexión. Inténtalo de nuevo." });
    } finally {
      setOtpSaving(false);
    }
  };

  const dbBadge = {
    loading: {
      accent: "border-l-[#0D0D0D]/20",
      dot: "bg-[#0D0D0D]/30",
      badge: "border-[#0D0D0D]/15 bg-[#0D0D0D]/[0.03] text-[#0D0D0D]/50",
      label: "Verificando…",
      detail: "Comprobando conexión…",
    },
    ok: {
      accent: "border-l-emerald-500",
      dot: "bg-emerald-500",
      badge: "border-green-200 bg-green-50 text-green-700",
      label: "OK",
      detail:
        dbLatency != null
          ? `Conexión verificada · ${dbLatency} ms`
          : "Conexión verificada",
    },
    down: {
      accent: "border-l-red-500",
      dot: "bg-red-500",
      badge: "border-red-200 bg-red-50 text-red-700",
      label: "Sin conexión",
      detail: "No se pudo conectar con la base de datos",
    },
  }[dbStatus];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#012340]">Mi perfil</h2>
        <p className="mt-0.5 text-xs text-[#0D0D0D]/40">
          Información de tu cuenta
        </p>
      </div>

      {/* Identidad */}
      <div className="bg-white border border-[#0D0D0D]/10 p-6 flex items-start gap-6">
        <div className="h-16 w-16 flex-shrink-0 bg-[#012340] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{inicial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-1">
            Nombre de usuario
          </p>
          <h3 className="text-xl font-bold text-[#012340] truncate">
            {profile.username}
          </h3>
          <p className="mt-1 text-sm text-[#0D0D0D]/55 truncate">
            {profile.email}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2">
            Estado
          </p>
          {profile.estado ? (
            <div className="inline-flex items-center gap-1.5 border border-green-200 bg-green-50 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] font-bold text-green-700">
                Activo
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold text-red-700">
                Inactivo
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detalles */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-4">
          Detalles de la cuenta
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            color="border-l-blue-500"
            icon={<Shield className="h-4 w-4 text-[#012340]/50" />}
            label="Rol"
            value={rolLabel}
          />
          <InfoCard
            color="border-l-amber-500"
            icon={<Clock className="h-4 w-4 text-[#012340]/50" />}
            label="Miembro desde"
            value={fechaRegistro}
          />
          <InfoCard
            color="border-l-[#012340]"
            icon={<Mail className="h-4 w-4 text-[#012340]/50" />}
            label="Correo electrónico"
            value={profile.email}
          />
        </div>
      </div>

      {/* Estado del sistema */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-4">
          Estado del sistema
        </p>
        <div
          className={cn(
            "flex items-center justify-between gap-4 border border-[#0D0D0D]/10 border-l-4 bg-white p-4",
            dbBadge.accent,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Database className="h-5 w-5 flex-shrink-0 text-[#012340]/50" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#012340]">Base de datos</p>
              <p className="truncate text-xs text-[#0D0D0D]/45">
                {dbBadge.detail}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border px-3 py-1",
                dbBadge.badge,
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  dbBadge.dot,
                  dbStatus === "loading" && "animate-pulse",
                )}
              />
              <span className="text-[11px] font-bold">{dbBadge.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              disabled={dbChecking}
              title="Volver a comprobar"
              aria-label="Volver a comprobar el estado de la base de datos"
              className="flex h-7 w-7 items-center justify-center border border-[#0D0D0D]/15 text-[#0D0D0D]/50 transition hover:border-[#012340]/30 hover:text-[#012340] disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", dbChecking && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Card acordeón — Cambiar contraseña */}
      <div className="bg-white border border-[#0D0D0D]/10">
        <button
          type="button"
          onClick={() => {
            setPwOpen((v) => !v);
            setPwResult(null);
          }}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-[#0D0D0D]/[0.02]"
        >
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-[#012340]/50" />
            <span className="text-sm font-bold text-[#012340]">
              Cambiar contraseña
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#0D0D0D]/35 transition-transform duration-200",
              pwOpen && "rotate-180",
            )}
          />
        </button>

        {pwOpen && (
          <div className="border-t border-[#0D0D0D]/8 px-6 py-5">
            <form
              onSubmit={handlePasswordChange}
              className="flex flex-col gap-4 max-w-sm"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0D0D0D]/50">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={pwForm.newPwd}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, newPwd: e.target.value }))
                    }
                    required
                    className="w-full h-10 border border-[#0D0D0D]/20 pl-3 pr-10 text-sm outline-none focus:border-[#012340] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 transition"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0D0D0D]/50">
                  Confirmar contraseña
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={pwForm.confirmPwd}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, confirmPwd: e.target.value }))
                  }
                  required
                  className="w-full h-10 border border-[#0D0D0D]/20 px-3 text-sm outline-none focus:border-[#012340] transition"
                />
              </div>

              {pwResult && (
                <p
                  className={`text-sm font-medium ${pwResult.ok ? "text-green-700" : "text-red-600"
                    }`}
                >
                  {pwResult.msg}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="h-10 px-6 bg-[#012340] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#012340]/90 transition disabled:opacity-50"
                >
                  {pwLoading ? "Guardando..." : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Card acordeón — Verificación en dos pasos (OTP) */}
      <div className="bg-white border border-[#0D0D0D]/10">
        <button
          type="button"
          onClick={() => {
            setOtpOpen((v) => !v);
            setOtpResult(null);
          }}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-[#0D0D0D]/[0.02]"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-[#012340]/50" />
            <span className="text-sm font-bold text-[#012340]">
              Verificación en dos pasos
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#0D0D0D]/35 transition-transform duration-200",
              otpOpen && "rotate-180",
            )}
          />
        </button>

        {otpOpen && (
          <div className="border-t border-[#0D0D0D]/8 px-6 py-5">
            <div className="flex items-center justify-between gap-4 max-w-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0D0D0D]/80">
                  Pedir un código por correo al iniciar sesión
                </p>
                <p className="mt-1 text-xs text-[#0D0D0D]/45">
                  Refuerza la seguridad de tu cuenta. Solo tú puedes
                  activarla o desactivarla.
                </p>
              </div>
              <Switch
                checked={otpEnabled}
                onCheckedChange={handleToggleOtp}
                disabled={otpSaving}
              />
            </div>

            {otpResult && (
              <p
                className={`mt-4 text-sm font-medium ${otpResult.ok ? "text-green-700" : "text-red-600"
                  }`}
              >
                {otpResult.msg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


interface InfoCardProps {
  color: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCard({ color, icon, label, value }: InfoCardProps) {
  return (
    <div
      className={`bg-white border border-[#0D0D0D]/10 border-l-4 ${color} p-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/40">
          {label}
        </p>
      </div>
      <p className="text-base font-bold text-[#012340]">{value}</p>
    </div>
  );
}
