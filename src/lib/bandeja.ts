// Cliente de la bandeja: wrappers de fetch hacia los endpoints + metadata de
// estados para la UI. Re-exporta los tipos canónicos de @/lib/types.

import type {
  SolicitudEstado,
  SolicitudResumen,
  SolicitudUI,
  SolicitudesPage,
} from "@/lib/types";

export type {
  SolicitudEstado,
  SolicitudResumen,
  SolicitudUI,
  SolicitudesPage,
  ValidacionItem,
  Valida1ResultRow,
  MotorProcessResultRow,
  MotorDataResultRow,
  IdentityValidationRow,
  CreditoDecisionRow,
} from "@/lib/types";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: { message: string } };
export type Result<T> = Ok<T> | Err;

const PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX || "";

async function request<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        error: { message: body?.message || `Error ${res.status}` },
      };
    }
    return { ok: true, data: body.data as T };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error de red";
    return { ok: false, error: { message } };
  }
}

export const bandeja = {
  listSolicitudes(
    opts: {
      limit?: number;
      page?: number;
      cedulaFilter?: string;
      q?: string;
      gestionado?: boolean;
    } = {},
  ): Promise<Result<SolicitudesPage>> {
    const qs = new URLSearchParams({
      limit: String(opts.limit ?? 20),
      page: String(opts.page ?? 1),
    });
    if (opts.cedulaFilter) qs.set("cedulaFilter", opts.cedulaFilter);
    if (opts.q) qs.set("q", opts.q);
    if (opts.gestionado !== undefined) qs.set("gestionado", String(opts.gestionado));
    return request<SolicitudesPage>(`${PREFIX}/api/usuario/bandeja?${qs}`);
  },

  getSolicitud(radicado: string): Promise<Result<SolicitudUI>> {
    return request<SolicitudUI>(
      `${PREFIX}/api/usuario/bandeja/${encodeURIComponent(radicado)}`,
    );
  },

  // `email` es opcional; el servidor usa la sesión, pero lo aceptamos para
  // que el llamador pueda pasarlo sin romper tipos.
  marcarGestionado(radicado: string, email?: string): Promise<Result<null>> {
    return request<null>(`${PREFIX}/api/usuario/bandeja`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radicado, email }),
    });
  },
};

export const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  valida_1: "Valida 1",
  no_valida_1: "No valida 1",
  val_identidad: "Val. identidad",
  no_val_identidad: "No val. identidad",
  fallo_servicios: "Fallo en servicios",
  no_viable: "No viable",
  aprobado: "Aprobado",
  revision: "Revisión",
};

export const ESTADO_DOT: Record<SolicitudEstado, string> = {
  valida_1: "bg-teal-500",
  no_valida_1: "bg-pink-500",
  val_identidad: "bg-indigo-500",
  no_val_identidad: "bg-yellow-600",
  fallo_servicios: "bg-red-600",
  no_viable: "bg-orange-500",
  aprobado: "bg-emerald-500",
  revision: "bg-amber-500",
};

export const ESTADO_BADGE: Record<SolicitudEstado, string> = {
  valida_1: "bg-teal-50 text-teal-700 border-teal-200",
  no_valida_1: "bg-pink-50 text-pink-700 border-pink-200",
  val_identidad: "bg-indigo-50 text-indigo-700 border-indigo-200",
  no_val_identidad: "bg-yellow-50 text-yellow-800 border-yellow-300",
  fallo_servicios: "bg-red-50 text-red-700 border-red-200",
  no_viable: "bg-orange-50 text-orange-700 border-orange-200",
  aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revision: "bg-amber-50 text-amber-700 border-amber-200",
};

export const ESTADO_BORDER: Record<SolicitudEstado, string> = {
  valida_1: "border-l-teal-500",
  no_valida_1: "border-l-pink-500",
  val_identidad: "border-l-indigo-500",
  no_val_identidad: "border-l-yellow-600",
  fallo_servicios: "border-l-red-600",
  no_viable: "border-l-orange-500",
  aprobado: "border-l-emerald-500",
  revision: "border-l-amber-400",
};
