"use client";

import { type SolicitudUI, type SolicitudEstado } from "@/lib/supabase";
import { X } from "lucide-react";

export type DetailModalTab = "campos" | "motor_json";

interface ModalHeaderProps {
    solicitud: SolicitudUI;
    onClose?: () => void;
}

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
    aprobado: "Aprobado",
    preaprobado: "Preaprobado",
    en_revision: "En revisión",
    pendiente: "Pendiente",
    rechazado: "Rechazado",
    no_viable: "No viable",
};

const ESTADO_STYLE: Record<SolicitudEstado, { border: string; badge: string }> = {
    aprobado: { border: "border-l-green-500", badge: "bg-green-100 text-green-700 border-green-200" },
    preaprobado: { border: "border-l-blue-400", badge: "bg-blue-100 text-blue-700 border-blue-200" },
    en_revision: { border: "border-l-amber-400", badge: "bg-amber-100 text-amber-700 border-amber-200" },
    pendiente: { border: "border-l-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
    rechazado: { border: "border-l-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
    no_viable: { border: "border-l-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function ModalHeader({ solicitud, onClose }: ModalHeaderProps) {
    const style = solicitud.sinMotor
        ? { border: "border-l-amber-400", badge: "bg-amber-100 text-amber-700 border-amber-200" }
        : ESTADO_STYLE[solicitud.estado];
    const badgeLabel = solicitud.sinMotor ? "Sin motor" : ESTADO_LABEL[solicitud.estado];

    return (
        <div className={`border-b border-[#0D0D0D]/10 border-l-4 ${style.border} px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0 bg-white`}>
            <div className="flex-1 min-w-0">

                {/* Estado + decisión */}
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 border ${style.badge}`}>
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

            {/* Score + close */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="bg-[#012340] text-white px-3 py-2 text-center min-w-[60px]">
                    <p className="text-[9px] font-bold tracking-[0.14em] uppercase opacity-60">CIFIN</p>
                    <p className="text-lg font-bold mt-0.5 leading-none">{solicitud.score ?? "—"}</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        title="Cerrar"
                        className="h-8 w-8 flex items-center justify-center text-[#0D0D0D]/30 hover:text-[#012340] transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<DetailModalTab, string> = {
    campos: "Resumen",
    motor_json: "Datos JSON",
};

export const TAB_LABELS_EXPORT = TAB_LABELS;

interface ModalTabsProps {
    active: DetailModalTab;
    onChange: (tab: DetailModalTab) => void;
}

export function ModalTabs({ active, onChange }: ModalTabsProps) {
    return (
        <div className="flex items-center bg-white">
            {(Object.entries(TAB_LABELS) as [DetailModalTab, string][]).map(([id, label]) => (
                <button
                    key={id}
                    onClick={() => onChange(id)}
                    className={`relative px-4 py-3 text-xs font-semibold tracking-wide transition-colors ${active === id
                        ? "text-[#012340]"
                        : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70"
                        }`}
                >
                    {label}
                    {active === id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#012340]" />
                    )}
                </button>
            ))}
        </div>
    );
}
