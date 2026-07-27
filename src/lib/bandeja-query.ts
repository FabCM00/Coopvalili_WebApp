import { Prisma } from "@prisma/client";
import { buildResumen } from "@/lib/bandeja-mappers";
import type { SolicitudEstado, SolicitudResumen } from "@/lib/types";

export const SOLICITUD_ESTADOS = [
  "valida_1",
  "no_valida_1",
  "val_identidad",
  "no_val_identidad",
  "fallo_servicios",
  "no_viable",
  "aprobado",
  "revision",
] as const satisfies readonly SolicitudEstado[];

export const BANDEJA_INCLUDE = {
  motor_process_results: true,
  motor_data_results: { orderBy: { created_at: "desc" as const }, take: 1 },
  identity_validations: true,
  credito_decisiones: true,
} satisfies Prisma.valida1_resultsInclude;

export type BandejaRow = Prisma.valida1_resultsGetPayload<{
  include: typeof BANDEJA_INCLUDE;
}>;

export interface BandejaFilters {
  cedulaFilter?: string;
  q?: string;
  gestionado?: boolean;
}

export function isSolicitudEstado(value: string | null): value is SolicitudEstado {
  return SOLICITUD_ESTADOS.some((estado) => estado === value);
}

export function buildBandejaWhere({
  cedulaFilter,
  q,
  gestionado,
}: BandejaFilters): Prisma.valida1_resultsWhereInput {
  const where: Prisma.valida1_resultsWhereInput = {};

  if (cedulaFilter) where.cedula = cedulaFilter;
  if (q) {
    where.OR = [
      { cedula: { contains: q, mode: "insensitive" } },
      { radicado: { contains: q, mode: "insensitive" } },
    ];
  }
  if (gestionado === true) where.gestionado_at = { not: null };
  if (gestionado === false) where.gestionado_at = null;

  return where;
}

export function buildGestionWhere(
  cedulaFilter: string | undefined,
  gestionado: boolean,
): Prisma.valida1_resultsWhereInput {
  return {
    ...(cedulaFilter ? { cedula: cedulaFilter } : {}),
    gestionado_at: gestionado ? { not: null } : null,
  };
}

export function mapBandejaRows(rows: BandejaRow[]): SolicitudResumen[] {
  return rows.map(buildResumen);
}

export type ConteoPorEstado = Record<"todos" | SolicitudEstado, number>;

export function countByEstado(rows: SolicitudResumen[]): ConteoPorEstado {
  const counts = Object.fromEntries([
    ["todos", rows.length],
    ...SOLICITUD_ESTADOS.map((estado) => [estado, 0]),
  ]) as ConteoPorEstado;

  for (const row of rows) counts[row.estado] += 1;
  return counts;
}
