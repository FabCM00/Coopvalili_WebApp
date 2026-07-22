"use client";

import { useEffect } from "react";
import { SlidersHorizontal, X, FilterX, Info } from "lucide-react";
import type { SolicitudEstado } from "@/lib/bandeja";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export type FiltroTab = "todos" | SolicitudEstado;

export const FILTROS: { id: FiltroTab; label: string; regla?: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "valida_1", label: "Valida 1", regla: "Aprobó la Validación 1." },
  { id: "no_valida_1", label: "No Valida 1", regla: "No aprobó la Validación 1." },
  { id: "val_identidad", label: "Val Identidad", regla: "Validó identidad: rostro y documento OK." },
  { id: "no_val_identidad", label: "No Val Identidad", regla: "Falló la validación de rostro o documento." },
  { id: "fallo_servicios", label: "Fallo Servicios", regla: "El motor respondió con error de servicio." },
  { id: "no_viable", label: "No viable", regla: "El motor decidió: no viable." },
  { id: "aprobado", label: "Aprobado", regla: "El motor decidió: aprobado." },
  { id: "revision", label: "Revisión", regla: "No aplicó ninguna regla anterior; pendiente de revisión." },
];

interface BandejaFiltrosProps {
  open: boolean;
  filtro: FiltroTab;
  conteoPorEstado: Map<FiltroTab, number>;
  filtrosActivos: number;
  onFiltroChange: (f: FiltroTab) => void;
  onLimpiar: () => void;
  onClose: () => void;
}

export function BandejaFiltros({
  open,
  filtro,
  conteoPorEstado,
  filtrosActivos,
  onFiltroChange,
  onLimpiar,
  onClose,
}: BandejaFiltrosProps) {
  // Cerrar con tecla Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <div
      className={`flex-shrink-0 overflow-hidden border-r border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.015] transition-all duration-300 ease-in-out ${
        open ? "w-[260px] opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="w-[260px] h-full flex flex-col">
        {/* Cabecera */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-[#0D0D0D]/8">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#012340]" />
            <span className="text-[11px] font-bold tracking-wide text-[#012340]">
              Filtros
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#0D0D0D]/35 hover:text-[#012340] hover:bg-[#0D0D0D]/5 rounded-md transition-colors"
            title="Cerrar filtros"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sección Estado */}
        <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#0D0D0D]/10">
          <p className="px-1 mb-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-[#0D0D0D]/35">
            Estado
          </p>
          <TooltipProvider>
          <div className="flex flex-col gap-0.5">
            {FILTROS.map((f, i) => {
              const activo = filtro === f.id;
              const iconClass = `h-3 w-3 flex-shrink-0 ${activo ? "opacity-70" : "opacity-40"}`;
              return (
                <button
                  key={f.id}
                  onClick={() => onFiltroChange(f.id)}
                  style={open ? { animationDelay: `${i * 40}ms` } : undefined}
                  className={`${open ? "animate-in fade-in slide-in-from-left-2 fill-mode-both duration-300" : ""} w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
                    activo
                      ? "bg-[#012340] text-white"
                      : "text-[#0D0D0D]/65 hover:bg-[#0D0D0D]/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    {f.regla ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            onClick={(e) => e.stopPropagation()}
                            className={`flex-shrink-0 hover:opacity-100 ${activo ? "opacity-70" : "opacity-40"}`}
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[180px] bg-[#012340] text-white">
                          {f.regla}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Info className={iconClass} />
                    )}
                    <span className="truncate">{f.label}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums flex-shrink-0 ${activo ? "opacity-70" : "opacity-40"}`}
                  >
                    {conteoPorEstado.get(f.id) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          </TooltipProvider>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#0D0D0D]/8 px-2 py-2">
          <button
            onClick={onLimpiar}
            disabled={filtrosActivos === 0}
            className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-semibold border border-[#0D0D0D]/12 text-[#0D0D0D]/70 hover:border-[#012340]/40 hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#0D0D0D]/12 disabled:hover:text-[#0D0D0D]/70 transition-colors"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpiar todo
          </button>
        </div>
      </div>
    </div>
  );
}
