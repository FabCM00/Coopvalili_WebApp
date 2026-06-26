"use client";

import { type SolicitudUI, type SolicitudEstado } from "@/lib/bandeja";
import { X } from "lucide-react";

export type DetailModalTab = "campos" | "motor_json" | "documentos";

interface ModalHeaderProps {
  solicitud: SolicitudUI;
  onClose?: () => void;
  onGestionar?: () => void;
}

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  valida_1: "Valida 1",
  no_valida_1: "No valida 1",
  val_identidad: "Val. identidad",
  no_val_identidad: "No val. identidad",
  fallo_servicios: "Fallo en servicios",
  no_viable: "No viable",
  aprobado: "Aprobado",
  revision: "Revisión",
};

const ESTADO_STYLE: Record<SolicitudEstado, { border: string; badge: string }> =
  {
    valida_1: {
      border: "border-l-cyan-500",
      badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    },
    no_valida_1: {
      border: "border-l-red-500",
      badge: "bg-red-100 text-red-700 border-red-200",
    },
    val_identidad: {
      border: "border-l-sky-500",
      badge: "bg-sky-100 text-sky-700 border-sky-200",
    },
    no_val_identidad: {
      border: "border-l-red-500",
      badge: "bg-red-100 text-red-700 border-red-200",
    },
    fallo_servicios: {
      border: "border-l-purple-500",
      badge: "bg-purple-100 text-purple-700 border-purple-200",
    },
    no_viable: {
      border: "border-l-orange-500",
      badge: "bg-orange-100 text-orange-700 border-orange-200",
    },
    aprobado: {
      border: "border-l-green-500",
      badge: "bg-green-100 text-green-700 border-green-200",
    },
    revision: {
      border: "border-l-amber-400",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
    },
  };

export function ModalHeader({
  solicitud,
  onClose,
  onGestionar,
}: ModalHeaderProps) {
  const style = solicitud.sinMotor
    ? {
        border: "border-l-amber-400",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
      }
    : ESTADO_STYLE[solicitud.estado];
  const badgeLabel = solicitud.sinMotor
    ? "Sin motor"
    : ESTADO_LABEL[solicitud.estado];

  return (
    <div
      className={`border-b border-[#0D0D0D]/10 border-l-4 ${style.border} px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0 bg-white`}
    >
      <div className="flex-1 min-w-0">
        {/* Estado + decisión */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 border ${style.badge}`}
          >
            {badgeLabel}
          </span>
          <h2 className="text-sm font-bold text-[#012340] truncate">
            {solicitud.decisionTexto}
          </h2>
        </div>

        {/* Nombre */}
        <p className="text-sm font-semibold text-[#012340] truncate">
          {solicitud.solicitante}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#0D0D0D]/45 mt-1">
          <span>
            <span className="opacity-60">CC</span> {solicitud.cedula}
          </span>

          <span className="opacity-30">•</span>

          <span>
            <span className="opacity-60">Radicado</span>{" "}
            <span className="font-mono">{solicitud.radicado}</span>
          </span>
        </div>
      </div>

      {/* Score + acciones + close */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Botón gestionar — solo si no está gestionada */}
        {!solicitud.gestionado && onGestionar && (
          <button
            onClick={onGestionar}
            className="h-9 px-4 bg-[#012340] hover:bg-[#012340]/85 text-white text-[11px] font-semibold tracking-wide rounded-sm transition-colors whitespace-nowrap"
          >
            Marcar gestionado
          </button>
        )}

        {/* Badge gestionada */}
        {solicitud.gestionado && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700">
              Gestionada
            </span>
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar"
            className="h-8 w-8 flex items-center justify-center text-[#0D0D0D]/30 hover:text-[#012340] transition-colors rounded-sm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const TAB_LABELS: Record<DetailModalTab, string> = {
  campos: "Resumen",
  motor_json: "Datos JSON",
  documentos: "Documentos",
};

export const TAB_LABELS_EXPORT = TAB_LABELS;

interface ModalTabsProps {
  active: DetailModalTab;
  onChange: (tab: DetailModalTab) => void;
  onClose?: () => void;
}

export function ModalTabs({ active, onChange, onClose }: ModalTabsProps) {
  return (
    <div className="flex items-center justify-between bg-white">
      <div className="flex items-center">
        {(Object.entries(TAB_LABELS) as [DetailModalTab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative px-4 py-3 text-xs font-semibold tracking-wide transition-colors ${
                active === id
                  ? "text-[#012340]"
                  : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70"
              }`}
            >
              {label}
              {active === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#012340]" />
              )}
            </button>
          ),
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          title="Cerrar"
          className="h-8 w-8 mr-1 flex items-center justify-center text-[#0D0D0D]/30 hover:text-[#012340] transition-colors rounded-sm"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
