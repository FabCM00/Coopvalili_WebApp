"use client";

// Cambio manual del estado de una solicitud. El estado normalmente lo derivan
// las reglas de bandeja-estados.ts; este control es la excepción, pensada para
// marcar `preaprobado` o `aprobado` cuando el colaborador confirma el avance.

import { useState } from "react";
import { Lock, MoreVertical, RotateCcw, TriangleAlert } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ESTADOS_ASIGNABLES,
  ESTADO_BADGE,
  ESTADO_DOT,
  ESTADO_LABEL,
  esEstadoTerminal,
  type SolicitudEstado,
} from "@/lib/bandeja";

interface EstadoSelectorProps {
  estado: SolicitudEstado;
  /** `true` si el estado actual viene de un override y no de las reglas. */
  esManual: boolean;
  manualPor: string | null;
  /** Estado terminal: no admite más cambios (ver esEstadoTerminal). */
  bloqueado: boolean;
  guardando: boolean;
  /** Resuelve cuando el cambio se guardó; rechaza si el servidor lo negó. */
  onCambiar: (estado: SolicitudEstado | null) => Promise<void>;
}

export function EstadoSelector({
  estado,
  esManual,
  manualPor,
  bloqueado,
  guardando,
  onCambiar,
}: EstadoSelectorProps) {
  // Confirmación explícita solo para `aprobado`: una vez guardado no hay vuelta
  // atrás desde la app, así que un clic accidental no debe bastar.
  const [confirmando, setConfirmando] = useState<SolicitudEstado | null>(null);

  // El error de guardado lo reporta el llamador (banner de la bandeja); aquí
  // solo se captura para que la promesa rechazada no quede suelta.
  const guardar = async (siguiente: SolicitudEstado | null) => {
    try {
      await onCambiar(siguiente);
    } catch {
      // Silencio deliberado: ver comentario arriba.
    } finally {
      setConfirmando(null);
    }
  };

  if (confirmando) {
    return (
      <ConfirmarAprobado
        guardando={guardando}
        onCancelar={() => setConfirmando(null)}
        onConfirmar={() => void guardar(confirmando)}
      />
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <EstadoBadge estado={estado} esManual={esManual} manualPor={manualPor} />

      {bloqueado ? (
        <span
          title={`${ESTADO_LABEL[estado]} es definitivo y no admite cambios`}
          className="flex h-7 w-7 items-center justify-center text-[#0D0D0D]/25"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={guardando}>
            <button
              title="Cambiar estado"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#0D0D0D]/45 transition-colors hover:bg-[#0D0D0D]/5 hover:text-[#012340] disabled:opacity-40 data-[state=open]:bg-[#012340] data-[state=open]:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[210px] rounded-md">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-[#0D0D0D]/40">
              Cambiar estado
            </DropdownMenuLabel>

            {ESTADOS_ASIGNABLES.map((e) => (
              <DropdownMenuCheckboxItem
                key={e}
                checked={e === estado}
                // Radix pasa el `checked` siguiente; solo interesa marcar, no desmarcar.
                onCheckedChange={(next) => {
                  if (!next || e === estado) return;
                  if (esEstadoTerminal(e)) {
                    setConfirmando(e);
                    return;
                  }
                  void guardar(e);
                }}
                className="cursor-pointer text-[11px] font-medium text-[#0D0D0D]/75"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${ESTADO_DOT[e]}`}
                  />
                  {ESTADO_LABEL[e]}
                </span>
              </DropdownMenuCheckboxItem>
            ))}

            {esManual && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void guardar(null)}
                  className="cursor-pointer text-[11px] font-semibold text-[#0D0D0D]/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Volver al automático
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Badge del estado actual + nota de que lo puso una persona. */
function EstadoBadge({
  estado,
  esManual,
  manualPor,
}: Pick<EstadoSelectorProps, "estado" | "esManual" | "manualPor">) {
  return (
    <span
      className={`border px-2 py-0.5 text-[10px] font-bold ${ESTADO_BADGE[estado]}`}
      title={
        esManual
          ? `Estado puesto a mano${manualPor ? ` por ${manualPor}` : ""}`
          : "Estado derivado automáticamente"
      }
    >
      {ESTADO_LABEL[estado]}
      {esManual && <span className="ml-1 opacity-50">·  manual</span>}
    </span>
  );
}

interface ConfirmarAprobadoProps {
  guardando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function ConfirmarAprobado({
  guardando,
  onCancelar,
  onConfirmar,
}: ConfirmarAprobadoProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <TriangleAlert
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
          aria-hidden
        />
        <p className="text-[11px] leading-snug text-amber-900">
          ¿Deseas marcar la solicitud como <strong>Aprobado</strong>? Este estado
          es definitivo y no se puede cambiar después.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="px-2.5 py-1 text-[11px] font-semibold text-[#0D0D0D]/55 transition-colors hover:text-[#0D0D0D]/80 disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={guardando}
          className="rounded-sm bg-[#012340] px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#012340]/85 disabled:opacity-40"
        >
          {guardando ? "Guardando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
