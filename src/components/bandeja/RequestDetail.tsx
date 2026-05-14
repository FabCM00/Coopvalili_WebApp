"use client";

import { type SolicitudUI } from "@/lib/supabase";
import { type DetailModalTab } from "./ModalHeader";
import { ModalHeader } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";

interface RequestDetailProps {
    solicitud: SolicitudUI | null;
    activeTab: DetailModalTab;
    onGestionar?: () => void;
}

export function RequestDetail({ solicitud, activeTab, onGestionar }: RequestDetailProps) {
    if (!solicitud) return null;

    return (
        <div className="flex flex-col bg-white border-l-0 border border-[#0D0D0D]/10 h-full overflow-hidden">
            <div className="flex-shrink-0">
                <ModalHeader solicitud={solicitud} />
            </div>

            <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {activeTab === "campos" && <ResumenSolicitud solicitud={solicitud} />}
                {activeTab === "motor_json" && <MotorJsonView solicitud={solicitud} />}
            </div>

            {solicitud.gestionado && (
                <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-4 py-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] text-[#0D0D0D]/45 font-medium">Solicitud gestionada</span>
                    {solicitud.gestionadoAt && (
                        <span className="text-[11px] text-[#0D0D0D]/35 ml-auto">
                            {new Date(solicitud.gestionadoAt).toLocaleDateString("es-CO")}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
