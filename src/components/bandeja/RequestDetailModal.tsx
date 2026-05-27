"use client";

import { useState } from "react";
import { type SolicitudUI } from "@/lib/types";
import { ModalHeader, ModalTabs, type DetailModalTab } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";

interface RequestDetailModalProps {
    solicitud: SolicitudUI;
    initialTab: DetailModalTab;
    onClose: () => void;
    onGestionar?: () => void;
}

export function RequestDetailModal({
    solicitud,
    initialTab,
    onClose,
    onGestionar,
}: RequestDetailModalProps) {
    const [activeTab, setActiveTab] = useState<DetailModalTab>(initialTab);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative flex flex-col bg-white w-[98vw] max-w-[98vw] h-[94vh] shadow-2xl border border-[#0D0D0D]/10 rounded-none">
                <ModalHeader solicitud={solicitud} onClose={onClose} />
                <ModalTabs active={activeTab} onChange={setActiveTab} />
                <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {activeTab === "campos" && <ResumenSolicitud solicitud={solicitud} />}
                    {activeTab === "motor_json" && <MotorJsonView solicitud={solicitud} hideExpand />}
                </div>

                {!solicitud.gestionado && onGestionar ? (
                    <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 p-3">
                        <button
                            onClick={onGestionar}
                            className="w-full h-9 bg-[#012340] hover:bg-[#012340]/90 text-white text-[11px] font-semibold tracking-wide transition-colors"
                        >
                            Marcar como Gestionado
                        </button>
                    </div>
                ) : solicitud.gestionado ? (
                    <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-4 py-3 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-[11px] text-[#0D0D0D]/45 font-medium">Solicitud gestionada</span>
                        {solicitud.gestionadoAt && (
                            <span className="text-[11px] text-[#0D0D0D]/35 ml-auto">
                                {new Date(solicitud.gestionadoAt).toLocaleDateString("es-CO")}
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
