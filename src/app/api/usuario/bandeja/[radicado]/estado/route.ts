// PATCH /api/usuario/bandeja/[radicado]/estado → fija o quita el override manual
//
// El estado de una solicitud normalmente se deriva de los payloads del motor;
// esta ruta es la única forma de fijarlo a mano. La regla de negocio (incluido
// el bloqueo de los estados terminales) vive en @/lib/solicitud-estado.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../../../../../auth";
import { SOLICITUD_ESTADOS } from "@/lib/bandeja-estados";
import {
  SolicitudEstadoError,
  cambiarEstadoSolicitud,
} from "@/lib/solicitud-estado";

// `estado: null` es explícito y significa "quitar el override".
const bodySchema = z.object({
  estado: z.enum(SOLICITUD_ESTADOS).nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const { radicado } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cuerpo inválido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Estado inválido." },
      { status: 400 },
    );
  }

  try {
    const data = await cambiarEstadoSolicitud({
      radicado,
      estado: parsed.data.estado,
      actorEmail: session.user.email ?? null,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    if (error instanceof SolicitudEstadoError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("[bandeja/estado]", error);
    return NextResponse.json(
      { ok: false, message: "Error interno." },
      { status: 500 },
    );
  }
}
