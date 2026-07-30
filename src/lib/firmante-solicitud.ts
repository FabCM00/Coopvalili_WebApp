// Datos del firmante para el envío a ZapSign. Se extraen del mismo payload
// valida1 que alimenta el resumen de la solicitud (nombre, correo, celular).

import type { SolicitudUI, Valida1ResultRow } from "@/lib/types";

export interface FirmanteContacto {
  nombre: string;
  email: string;
  celular: string;
}

function limpiar(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

/** Nombre completo a partir de los campos de valida1. */
export function nombreCompletoFromValida1(v1: Valida1ResultRow): string {
  return [v1.nombre, v1.primer_apellido, v1.segundo_apellido]
    .map(limpiar)
    .filter(Boolean)
    .join(" ");
}

/**
 * Contacto del asociado para prellenar el modal de firma.
 * `fallbackNombre` suele ser `solicitud.solicitante` del resumen.
 */
export function firmanteFromValida1(
  v1: Valida1ResultRow,
  fallbackNombre?: string,
): FirmanteContacto {
  const nombre =
    nombreCompletoFromValida1(v1) ||
    limpiar(fallbackNombre === "—" ? undefined : fallbackNombre);

  return {
    nombre,
    email: limpiar(v1.email),
    celular: limpiar(v1.celular) || limpiar(v1.telefono),
  };
}

/** Atajo cuando ya se tiene el detalle completo de la solicitud. */
export function firmanteFromSolicitud(solicitud: SolicitudUI): FirmanteContacto {
  return firmanteFromValida1(solicitud.raw.valida1, solicitud.solicitante);
}
