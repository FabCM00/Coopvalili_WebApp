"use client";

import {
  type SolicitudUI,
  ESTADO_LABEL,
  ESTADO_BADGE,
} from "@/lib/bandeja";
import { X } from "lucide-react";

export type DetailModalTab = "campos" | "motor_json" | "documentos";

interface ModalHeaderProps {
  solicitud: SolicitudUI;
  onClose?: () => void;
  onGestionar?: () => void;
}

export function ModalHeader({
  solicitud,
  onClose,
  onGestionar,
}: ModalHeaderProps) {
  const showGestionar = !solicitud.gestionado && onGestionar;
  // Sin acciones no hay nada que pintar: evita una fila vacía con margen.
  if (!showGestionar && !onClose) return null;

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      {/* Botón gestionar — solo si no está gestionada */}
      {showGestionar && (
        <button
          onClick={onGestionar}
          className="h-9 px-4 bg-[#012340] hover:bg-[#012340]/85 text-white text-[11px] font-semibold tracking-wide rounded-sm transition-colors whitespace-nowrap"
        >
          Marcar gestionado
        </button>
      )}

      {/* El estado "Gestionada" se muestra junto al badge de estado
          en SolicitanteHeader, no aquí. */}

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
  );
}

export function SolicitanteHeader({ solicitud }: { solicitud: SolicitudUI }) {
  const badge = ESTADO_BADGE[solicitud.estado];
  const badgeLabel = ESTADO_LABEL[solicitud.estado];

  return (
    <div className="flex items-start justify-between gap-4 mb-1">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2">
          Información del solicitante
        </p>
        <p className="text-sm font-semibold text-[#012340] truncate">
          {solicitud.solicitante}
        </p>

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

      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2">
          Estado de la solicitud
        </p>
        <div className="flex items-center justify-end gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 border ${badge}`}>
            {badgeLabel}
          </span>
          {solicitud.gestionado && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-emerald-700">
                Gestionada
              </span>
            </span>
          )}
        </div>
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
