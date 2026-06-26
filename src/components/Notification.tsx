"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error" | "warning" | "info";

/**
 * Estilo por tipo, alineado al modal nativo de la app (p. ej. el de
 * "Marcar como Gestionado" en BandejaView): tarjeta sólida, esquinas
 * rectas y un acento de color en el borde izquierdo + un icono pequeño
 * en el encabezado, en lugar de un círculo grande centrado.
 * `kicker` es la etiqueta corta en mayúsculas sobre el título.
 */
const TYPE_STYLES: Record<
  NotificationType,
  { accent: string; iconColor: string; kicker: string; icon: ReactNode }
> = {
  success: {
    accent: "border-l-emerald-500",
    iconColor: "text-emerald-600",
    kicker: "Listo",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  error: {
    accent: "border-l-red-500",
    iconColor: "text-red-600",
    kicker: "Error",
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
  warning: {
    accent: "border-l-[#F29A2E]",
    iconColor: "text-[#F29A2E]",
    kicker: "Atención",
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
  info: {
    accent: "border-l-[#012340]",
    iconColor: "text-[#012340]",
    kicker: "Aviso",
    icon: <Info className="h-4 w-4" aria-hidden />,
  },
};

export interface NotificationProps {
  type?: NotificationType;
  /** Título en negrita del encabezado. */
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Si se pasa, el modal entra en modo confirmación (botón cancelar + confirmar). */
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function Notification({
  type = "info",
  title = "Notificación",
  message,
  confirmLabel = "Ok",
  cancelLabel,
  confirmTone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: NotificationProps) {
  const style = TYPE_STYLES[type];
  const dismiss = onCancel ?? onConfirm;

  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // Escape para descartar (deshabilitado mientras carga).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss, loading]);

  // Foco en el botón de confirmación al montar (a11y).
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 duration-200 animate-in fade-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) dismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "w-full max-w-sm border border-l-4 border-[#0D0D0D]/15 bg-white shadow-2xl duration-200 animate-in zoom-in-95",
          style.accent,
        )}
      >
        {/* Encabezado: logo + kicker + icono + título. */}
        <div className="border-b border-[#0D0D0D]/10 px-5 py-4">
          <Image
            src="/Imagen1.png"
            alt="WANT N' Get"
            width={140}
            height={42}
            className="mb-3 h-6 w-auto object-contain"
            priority
          />
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]/40">
            <span className={style.iconColor}>{style.icon}</span>
            {style.kicker}
          </p>
          <h3 id={titleId} className="mt-1.5 text-sm font-bold text-[#012340]">
            {title}
          </h3>
        </div>

        {/* Cuerpo: mensaje. */}
        <div className="px-5 py-4">
          <div
            id={descId}
            className="text-sm leading-relaxed text-[#0D0D0D]/70 [&_strong]:font-semibold [&_strong]:text-[#012340]"
          >
            {message}
          </div>
        </div>

        {/* Acciones: alineadas a la derecha (cancelar + confirmar). */}
        <div className="flex justify-end gap-2 border-t border-[#0D0D0D]/10 px-5 py-3">
          {cancelLabel && (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onCancel}
              className="h-8 rounded-none border-[#0D0D0D]/15 px-4 text-[11px] font-semibold"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            ref={confirmRef}
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "h-8 gap-1.5 rounded-none px-4 text-[11px] font-semibold text-white",
              confirmTone === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[#012340] hover:bg-[#012340]/90",
            )}
          >
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
