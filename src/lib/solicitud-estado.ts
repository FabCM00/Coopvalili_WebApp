// Cambio manual del estado de una solicitud.
//
// El estado normalmente se DERIVA de los payloads del motor (bandeja-estados.ts).
// Este módulo es la excepción: permite que un colaborador lo fije a mano, sobre
// todo para pasar a `aprobado` cuando el asociado ya firmó el pagaré — un hecho
// que ocurre fuera del motor y que por tanto ninguna regla puede detectar.
//
// El override se guarda en su propia columna y NO pisa los payloads: quitarlo
// devuelve la solicitud a su estado derivado sin haber perdido nada.

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  esEstadoTerminal,
  isSolicitudEstado,
  parseEstadoManual,
} from "@/lib/bandeja-estados";
import type { SolicitudEstado } from "@/lib/types";

/** Error con código HTTP sugerido, para que la ruta no tenga que adivinar. */
export class SolicitudEstadoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SolicitudEstadoError";
  }
}

export interface CambiarEstadoInput {
  radicado: string;
  /** `null` quita el override y devuelve la solicitud al estado derivado. */
  estado: SolicitudEstado | null;
  /** Email del colaborador, para la traza de auditoría. */
  actorEmail: string | null;
}

export interface CambiarEstadoResult {
  radicado: string;
  estadoManual: SolicitudEstado | null;
}

/**
 * Fija (o quita) el override de estado.
 *
 * Se lee el estado manual actual antes de escribir para hacer cumplir la regla
 * terminal. Se comprueba solo contra el override y no contra el estado derivado
 * porque derivarlo aquí exigiría cargar todos los payloads del motor: una
 * solicitud que el motor dejó en `aprobado` por sí sola no está "aprobada por
 * decisión de nadie", y bloquear ese caso impediría corregir un dato malo.
 */
export async function cambiarEstadoSolicitud(
  input: CambiarEstadoInput,
): Promise<CambiarEstadoResult> {
  const radicado = input.radicado.trim();
  if (!radicado) {
    throw new SolicitudEstadoError("Radicado requerido.", 400);
  }
  if (input.estado !== null && !isSolicitudEstado(input.estado)) {
    throw new SolicitudEstadoError(
      `El estado "${input.estado}" no es válido.`,
      400,
    );
  }

  const actual = await withPrismaRetry(() =>
    prisma.valida1_results.findUnique({
      where: { radicado },
      select: { radicado: true, estado_manual: true },
    }),
  );
  if (!actual) {
    throw new SolicitudEstadoError(`La solicitud ${radicado} no existe.`, 404);
  }

  const manualActual = parseEstadoManual(actual.estado_manual);
  if (manualActual && esEstadoTerminal(manualActual)) {
    throw new SolicitudEstadoError(
      `La solicitud está en "${manualActual}" y ese estado no admite cambios.`,
      409,
    );
  }

  const ahora = new Date();
  const updated = await withPrismaRetry(() =>
    prisma.valida1_results.update({
      where: { radicado },
      data: {
        estado_manual: input.estado,
        // Al quitar el override se limpia también la traza: dejarla colgando
        // haría creer que sigue habiendo un estado puesto a mano.
        estado_manual_at: input.estado ? ahora : null,
        estado_manual_by: input.estado ? input.actorEmail : null,
      },
      select: { radicado: true, estado_manual: true },
    }),
  );

  return {
    radicado: updated.radicado,
    estadoManual: parseEstadoManual(updated.estado_manual),
  };
}
