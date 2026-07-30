"use client";

import { type SolicitudUI } from "@/lib/types";
import { firmanteFromSolicitud } from "@/lib/firmante-solicitud";
import { type CambioEstadoControl, type DetailModalTab } from "./ModalHeader";
import { ModalHeader } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";
import { DocumentosTab } from "./documentos/DocumentosTab";
import { LoadingScreen } from "../LoadingScreen";

interface RequestDetailProps {
  solicitud: SolicitudUI;
  activeTab: DetailModalTab;
  /** Ausente = no se ofrece cambiar el estado. */
  cambioEstado?: CambioEstadoControl;
}

export function RequestDetail({
  solicitud,
  activeTab,
  cambioEstado,
}: RequestDetailProps) {
  const firmante = firmanteFromSolicitud(solicitud);

  return (
    <div className="flex flex-col bg-white border-l-0 border border-[#0D0D0D]/10 h-full overflow-hidden">
      {activeTab !== "documentos" && (
        <div className="flex-shrink-0">
          <ModalHeader solicitud={solicitud} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {activeTab === "documentos" ? (
          <DocumentosTab
            cedula={solicitud.cedula}
            radicado={solicitud.radicado}
            firmante={firmante}
          />
        ) : (
          <>
            {activeTab === "campos" && (
              <ResumenSolicitud solicitud={solicitud} cambioEstado={cambioEstado} />
            )}
            {activeTab === "motor_json" && <MotorJsonView solicitud={solicitud} />}
          </>
        )}
      </div>

      {solicitud.gestionado && (
        <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-4 py-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-[11px] text-[#0D0D0D]/45 font-medium">
            Solicitud gestionada
          </span>
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
