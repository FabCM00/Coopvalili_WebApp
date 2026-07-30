
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  DocumentoError,
  cambiarEstado,
  obtenerBuffer,
  reemplazarContenido,
} from "@/lib/documentos";

const API_URL = (process.env.ZAPSIGN_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.ZAPSIGN_TOKEN ?? "";
/** Secreto propio que ZapSign devuelve en la URL del webhook (ver route). */
export const WEBHOOK_SECRET = process.env.ZAPSIGN_WEBHOOK_SECRET ?? "";

/** Código de país por defecto de los firmantes (Colombia). */
const PHONE_COUNTRY = "57";

// ── Contrato de ZapSign (solo los campos que se usan) ────────────────────────

interface ZapSignSignerResponse {
  token?: string;
  sign_url?: string;
  status?: string;
  name?: string;
  email?: string;
}

interface ZapSignDocResponse {
  open_id?: number;
  token?: string;
  status?: string;
  name?: string;
  signed_file?: string | null;
  original_file?: string | null;
  signers?: ZapSignSignerResponse[];
}

// ── Transporte ───────────────────────────────────────────────────────────────

/**
 * Punto único de salida hacia ZapSign: centraliza el header de autorización y
 * la traducción de errores. Si mañana cambia el esquema de auth o hay que
 * agregar reintentos, se toca solo aquí.
 */
async function zapFetch<T>(
  path: string,
  body?: unknown,
  method: "POST" | "GET" = "POST",
): Promise<T> {
  if (!API_URL || !TOKEN) {
    throw new DocumentoError(
      "ZapSign no está configurado (falta ZAPSIGN_API_URL o ZAPSIGN_TOKEN).",
      503,
    );
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    // ZapSign devuelve el detalle del error en el cuerpo; se propaga recortado
    // para que el colaborador vea la causa real (p. ej. "email inválido").
    throw new DocumentoError(
      `ZapSign respondió ${res.status}: ${text.slice(0, 300)}`,
      res.status === 400 || res.status === 422 ? 422 : 502,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DocumentoError("Respuesta de ZapSign no es JSON válido.", 502);
  }
}

// ── Envío a firma ────────────────────────────────────────────────────────────

export interface EnviarAFirmaInput {
  /** Id de la fila en `documentos`. */
  documentoId: string;
  /** Control de acceso: el documento debe pertenecer a este radicado. */
  radicado: string;
  firmante: {
    nombre: string;
    email?: string | null;
    celular?: string | null;
  };
  canales: { email: boolean; whatsapp: boolean };
  /** Email del colaborador que dispara el envío (auditoría). */
  enviadoPor?: string | null;
}

export interface EnviarAFirmaResult {
  firmaId: string;
  zapsignToken: string;
  signUrl: string | null;
}

/**
 * Envía un documento a firma. El PDF se manda en base64 porque el contenedor de
 * Azure es privado: no hay URL pública que darle a ZapSign.
 */
export async function enviarDocumentoAFirma(
  input: EnviarAFirmaInput,
): Promise<EnviarAFirmaResult> {
  const { documentoId, radicado, firmante, canales } = input;

  const email = firmante.email?.trim() || null;
  const celular = firmante.celular?.replace(/[^0-9]/g, "") || null;

  // ZapSign exige al menos un canal de contacto del firmante.
  if (!email && !celular) {
    throw new DocumentoError(
      "El firmante necesita al menos un correo o un celular.",
      400,
    );
  }
  if (canales.email && !email) {
    throw new DocumentoError(
      "Se pidió notificar por correo pero el firmante no tiene correo.",
      400,
    );
  }
  if (canales.whatsapp && !celular) {
    throw new DocumentoError(
      "Se pidió notificar por WhatsApp pero el firmante no tiene celular.",
      400,
    );
  }

  // obtenerBuffer valida que el documento exista y pertenezca al radicado.
  const doc = await obtenerBuffer(documentoId, radicado);
  if (!doc) throw new DocumentoError("Documento no encontrado.", 404);
  if (doc.contentType !== "application/pdf") {
    throw new DocumentoError(
      "Solo se pueden enviar a firma documentos PDF.",
      415,
    );
  }

  const fila = await withPrismaRetry(() =>
    prisma.documentos.findFirst({
      where: { id: BigInt(documentoId), eliminado: false },
      select: { id: true, estado: true, etag: true, nombre_original: true },
    }),
  );
  if (!fila) throw new DocumentoError("Documento no encontrado.", 404);
  if (fila.estado === "pendiente_firma") {
    throw new DocumentoError(
      "El documento ya está en proceso de firma.",
      409,
    );
  }
  if (fila.estado === "firmado") {
    throw new DocumentoError("El documento ya fue firmado.", 409);
  }

  const created = await zapFetch<ZapSignDocResponse>("/docs/", {
    name: fila.nombre_original.slice(0, 255),
    // Sin el prefijo `data:application/pdf;base64,`: ZapSign lo rechaza.
    base64_pdf: doc.buffer.toString("base64"),
    lang: "es",
    // Amarra el documento de ZapSign con la solicitud de este lado.
    external_id: radicado,
    signers: [
      {
        name: firmante.nombre,
        email: email ?? "",
        blank_email: !email,
        phone_country: celular ? PHONE_COUNTRY : "",
        phone_number: celular ?? "",
        blank_phone: !celular,
        send_automatic_email: canales.email,
        send_automatic_whatsapp: canales.whatsapp,
        auth_mode: "assinaturaTela-tokenEmail",
      },
    ],
  });

  const zapsignToken = created.token;
  if (!zapsignToken) {
    throw new DocumentoError(
      "ZapSign no devolvió el token del documento.",
      502,
    );
  }

  const signer = created.signers?.[0];

  const firma = await withPrismaRetry(() =>
    prisma.firma_solicitudes.create({
      data: {
        documento_id: fila.id,
        radicado,
        zapsign_token: zapsignToken,
        zapsign_open_id: created.open_id ?? null,
        sign_url: signer?.sign_url ?? null,
        signer_token: signer?.token ?? null,
        firmante_nombre: firmante.nombre,
        firmante_email: email,
        firmante_phone: celular,
        canal_email: canales.email,
        canal_whatsapp: canales.whatsapp,
        status: "pending",
        // Rastro de la versión sin firmar, que se sobrescribirá al firmar.
        etag_original: fila.etag,
        enviado_por: input.enviadoPor ?? null,
      },
    }),
  );

  await cambiarEstado(documentoId, "pendiente_firma", {
    permitirSistema: true,
    radicadoEsperado: radicado,
  });

  return {
    firmaId: firma.id.toString(),
    zapsignToken,
    signUrl: signer?.sign_url ?? null,
  };
}

// ── Webhook ──────────────────────────────────────────────────────────────────

/** Payload del webhook (ZapSign varía el nombre del evento entre versiones). */
export interface ZapSignWebhookPayload {
  event_type?: string;
  status?: string;
  token?: string;
  signed_file?: string | null;
  external_id?: string | null;
  signers?: ZapSignSignerResponse[];
}

export type WebhookOutcome =
  | { handled: true; action: "firmado" | "rechazado" | "sin_cambio"; detail: string }
  | { handled: false; detail: string };

/** Eventos que ZapSign usa para "el documento quedó firmado". */
const SIGNED_EVENTS = new Set(["doc_signed", "signed", "document_signed"]);
const REFUSED_EVENTS = new Set(["doc_refused", "refused", "signature_refused"]);

/**
 * Procesa un evento de ZapSign. Es idempotente: si el mismo evento llega dos
 * veces (ZapSign reintenta ante errores), el segundo no vuelve a descargar ni a
 * sobrescribir nada.
 */
export async function procesarWebhook(
  payload: ZapSignWebhookPayload,
): Promise<WebhookOutcome> {
  const token = payload.token?.trim();
  if (!token) return { handled: false, detail: "Payload sin token." };

  const firma = await withPrismaRetry(() =>
    prisma.firma_solicitudes.findUnique({
      where: { zapsign_token: token },
      include: { documento: true },
    }),
  );
  if (!firma) {
    return { handled: false, detail: `Token desconocido: ${token}` };
  }

  // Se guarda el payload aunque el evento no cambie nada: sirve de auditoría.
  await withPrismaRetry(() =>
    prisma.firma_solicitudes.update({
      where: { id: firma.id },
      data: { webhook_json: payload as object },
    }),
  );

  const evento = (payload.event_type ?? payload.status ?? "").toLowerCase();

  if (REFUSED_EVENTS.has(evento)) {
    await withPrismaRetry(() =>
      prisma.firma_solicitudes.update({
        where: { id: firma.id },
        data: { status: "refused" },
      }),
    );
    // El documento vuelve a un estado manejable por el colaborador.
    await cambiarEstado(firma.documento_id.toString(), "revision", {
      permitirSistema: true,
    });
    return {
      handled: true,
      action: "rechazado",
      detail: "El firmante rechazó la firma; documento en revisión.",
    };
  }

  const esFirmado =
    SIGNED_EVENTS.has(evento) || (payload.status ?? "").toLowerCase() === "signed";
  if (!esFirmado) {
    return {
      handled: true,
      action: "sin_cambio",
      detail: `Evento "${evento}" registrado sin cambio de estado.`,
    };
  }

  // Idempotencia: si ya se procesó la firma, no se repite la descarga.
  if (firma.status === "signed" && firma.documento.estado === "firmado") {
    return {
      handled: true,
      action: "sin_cambio",
      detail: "La firma ya había sido procesada.",
    };
  }

  const signedUrl = payload.signed_file;
  if (!signedUrl) {
    return {
      handled: false,
      detail: "Evento de firma sin signed_file: no se puede descargar el PDF.",
    };
  }

  // La URL caduca en ~60 min: se descarga ahora y se guarda en el blob.
  const res = await fetch(signedUrl);
  if (!res.ok) {
    return {
      handled: false,
      detail: `No se pudo descargar el PDF firmado (${res.status}).`,
    };
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  await reemplazarContenido(firma.documento_id.toString(), buffer, "application/pdf");

  await withPrismaRetry(() =>
    prisma.firma_solicitudes.update({
      where: { id: firma.id },
      data: { status: "signed", signed_at: new Date() },
    }),
  );

  await cambiarEstado(firma.documento_id.toString(), "firmado", {
    permitirSistema: true,
  });

  return {
    handled: true,
    action: "firmado",
    detail: `Documento ${firma.documento_id} firmado y actualizado.`,
  };
}

// ── Sincronización manual (respaldo del webhook) ──────────────────────────────

/**
 * Consulta a ZapSign el estado real de un envío y aplica el resultado.
 *
 * Es el respaldo del webhook: sirve cuando el evento se perdió (webhook no
 * configurado, app caída, firma hecha antes de montar el endpoint) y como
 * verificación manual. Reutiliza `procesarWebhook` para que la lógica de
 * descarga y cambio de estado exista en un solo lugar.
 *
 * Nota: `signed_file` que devuelve el detalle caduca en ~60 minutos, pero como
 * se descarga en el acto, siempre está vigente.
 */
export async function sincronizarFirma(
  zapsignToken: string,
): Promise<WebhookOutcome> {
  const token = zapsignToken.trim();
  if (!token) return { handled: false, detail: "Token vacío." };

  const firma = await withPrismaRetry(() =>
    prisma.firma_solicitudes.findUnique({
      where: { zapsign_token: token },
      select: { id: true },
    }),
  );
  if (!firma) {
    return { handled: false, detail: `Token desconocido: ${token}` };
  }

  const detalle = await zapFetch<ZapSignDocResponse>(
    `/docs/${encodeURIComponent(token)}/`,
    undefined,
    "GET",
  );

  // El detalle no trae `event_type`; se deriva del `status` del documento para
  // que procesarWebhook lo interprete igual que un evento entrante.
  const status = (detalle.status ?? "").toLowerCase();
  return procesarWebhook({
    event_type: status === "signed" ? "doc_signed" : status,
    status,
    token,
    signed_file: detalle.signed_file ?? null,
    signers: detalle.signers,
  });
}
