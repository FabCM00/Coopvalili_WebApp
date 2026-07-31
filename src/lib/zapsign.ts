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


interface ZapSignSignerResponse {
  token?: string;
  sign_url?: string;
  status?: string;
  name?: string;
  email?: string;
}

/** Anexo dentro de un sobre: token y archivo firmado propios. */
interface ZapSignExtraDocResponse {
  token?: string;
  name?: string;
  open_id?: number;
  signed_file?: string | null;
  original_file?: string | null;
}

interface ZapSignDocResponse {
  open_id?: number;
  token?: string;
  status?: string;
  name?: string;
  signed_file?: string | null;
  original_file?: string | null;
  signers?: ZapSignSignerResponse[];
  /** Anexos del sobre. Solo viene al consultar (o notificar) el principal. */
  extra_docs?: ZapSignExtraDocResponse[];
  /**
   * Solo aparece al consultar el token de un anexo: apunta al principal, que es
   * donde viven el estado del sobre y la lista completa de anexos.
   */
  parent_doc_token?: string | null;
}


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


/** Tope del sobre: cuántos documentos pueden ir en un solo link de firma. */
export const MAX_LOTE_FIRMA = 5;

export interface FirmanteFirma {
  nombre: string;
  email?: string | null;
  celular?: string | null;
}

export interface EnviarAFirmaInput {
  /** Id de la fila en `documentos`. */
  documentoId: string;
  /** Control de acceso: el documento debe pertenecer a este radicado. */
  radicado: string;
  firmante: FirmanteFirma;
  canales: { email: boolean; whatsapp: boolean };
  /** Email del colaborador que dispara el envío (auditoría). */
  enviadoPor?: string | null;
}

export interface EnviarAFirmaResult {
  firmaId: string;
  zapsignToken: string;
  signUrl: string | null;
}

export interface EnviarLoteAFirmaInput {
  /** El primero es el principal del sobre; el resto van como anexos. */
  documentoIds: string[];
  radicado: string;
  firmante: FirmanteFirma;
  canales: { email: boolean; whatsapp: boolean };
  enviadoPor?: string | null;
}

export interface EnviarLoteAFirmaResult {
  firmaId: string;
  zapsignToken: string;
  signUrl: string | null;
  /** Total de documentos del sobre (principal + anexos). */
  total: number;
}

/** Normaliza y valida los datos del firmante. Devuelve email/celular limpios. */
function validarFirmante(
  firmante: FirmanteFirma,
  canales: { email: boolean; whatsapp: boolean },
): { email: string | null; celular: string | null } {
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
  return { email, celular };
}

/** Armado del firmante de ZapSign. Compartido por envío simple y lote. */
function buildSigners(
  firmante: FirmanteFirma,
  canales: { email: boolean; whatsapp: boolean },
  email: string | null,
  celular: string | null,
) {
  return [
    {
      name: firmante.nombre,
      email: email ?? "",
      blank_email: !email,
      phone_country: celular ? PHONE_COUNTRY : "",
      phone_number: celular ?? "",
      blank_phone: !celular,
      send_automatic_email: canales.email,
      send_automatic_whatsapp: canales.whatsapp,
      // Solo firma dibujada en pantalla, sin código de verificación: el
      // añadido `-tokenEmail` obligaba al firmante a copiar un código que
      // ZapSign le mandaba al correo. La identidad ya se validó antes en el
      // flujo (identity_validations), así que ese segundo paso sobraba.
      auth_mode: "assinaturaTela",
    },
  ];
}

/** Documento ya cargado y validado para crear el sobre en ZapSign. */
interface DocParaFirma {
  id: string;
  nombre: string;
  etag: string | null;
  buffer: Buffer;
}

/**
 * Valida la lista de documentos ANTES de crear nada en ZapSign: un sobre a
 * medias (algunos docs creados, otros no) es peor que un error temprano.
 * Comprueba cantidad, pertenencia al radicado, no estar en flujo de firma y
 * que todos sean PDF. Conserva el orden recibido: el primero es el principal.
 */
async function cargarDocsParaFirma(
  documentoIds: string[],
  radicado: string,
): Promise<DocParaFirma[]> {
  if (documentoIds.length === 0) {
    throw new DocumentoError("No hay documentos para enviar a firma.", 400);
  }
  if (documentoIds.length > MAX_LOTE_FIRMA) {
    throw new DocumentoError(
      `Máximo ${MAX_LOTE_FIRMA} documentos por envío a firma.`,
      400,
    );
  }
  if (new Set(documentoIds).size !== documentoIds.length) {
    throw new DocumentoError("Hay documentos repetidos en el envío.", 400);
  }

  const bigIds: bigint[] = [];
  for (const id of documentoIds) {
    try {
      bigIds.push(BigInt(id));
    } catch {
      throw new DocumentoError("Id de documento inválido.", 400);
    }
  }

  const filas = await withPrismaRetry(() =>
    prisma.documentos.findMany({
      where: { id: { in: bigIds }, eliminado: false },
      select: {
        id: true,
        radicado: true,
        estado: true,
        etag: true,
        nombre_original: true,
      },
    }),
  );
  if (filas.length !== documentoIds.length) {
    throw new DocumentoError("Alguno de los documentos no existe.", 404);
  }

  const porId = new Map(filas.map((f) => [f.id.toString(), f]));
  const ordenadas = documentoIds.map((id) => porId.get(id)!);

  for (const fila of ordenadas) {
    if (fila.radicado !== radicado) {
      throw new DocumentoError(
        "El documento no pertenece a la solicitud indicada.",
        403,
      );
    }
    if (fila.estado === "pendiente_firma") {
      throw new DocumentoError(
        `"${fila.nombre_original}" ya está en proceso de firma.`,
        409,
      );
    }
    if (fila.estado === "firmado") {
      throw new DocumentoError(
        `"${fila.nombre_original}" ya fue firmado.`,
        409,
      );
    }
  }

  const docs: DocParaFirma[] = [];
  for (const fila of ordenadas) {
    // obtenerBuffer vuelve a validar la pertenencia al radicado.
    const contenido = await obtenerBuffer(fila.id.toString(), radicado);
    if (!contenido) {
      throw new DocumentoError(
        `No se encontró el archivo de "${fila.nombre_original}".`,
        404,
      );
    }
    if (contenido.contentType !== "application/pdf") {
      throw new DocumentoError(
        `"${fila.nombre_original}" no es PDF: solo se firman PDF.`,
        415,
      );
    }
    docs.push({
      id: fila.id.toString(),
      nombre: fila.nombre_original,
      etag: fila.etag,
      buffer: contenido.buffer,
    });
  }
  return docs;
}

/** Payload base del documento en ZapSign (compartido por simple y lote). */
function buildDocPayload(doc: DocParaFirma) {
  return {
    name: doc.nombre.slice(0, 255),
    // Sin el prefijo `data:application/pdf;base64,`: ZapSign lo rechaza.
    base64_pdf: doc.buffer.toString("base64"),
  };
}

interface PersistirFirmasInput {
  radicado: string;
  firmante: FirmanteFirma;
  email: string | null;
  celular: string | null;
  canales: { email: boolean; whatsapp: boolean };
  enviadoPor?: string | null;
}

/**
 * Persiste las filas de `firma_solicitudes` (una por documento) y marca los
 * documentos como `pendiente_firma`, todo en una sola transacción: o quedan
 * todos o no queda ninguno. La URL de firma es la del principal: los anexos
 * se firman en el mismo link.
 */
async function persistirFirmas(
  docs: DocParaFirma[],
  tokens: string[],
  data: PersistirFirmasInput,
  principal: ZapSignDocResponse,
) {
  const { radicado, firmante, email, celular, canales } = data;
  const signer = principal.signers?.[0];

  return withPrismaRetry(() =>
    prisma.$transaction(async (tx) => {
      const filas = [];
      for (let i = 0; i < docs.length; i++) {
        const esPrincipal = i === 0;
        filas.push(
          await tx.firma_solicitudes.create({
            data: {
              documento_id: BigInt(docs[i].id),
              radicado,
              zapsign_token: tokens[i],
              zapsign_open_id: esPrincipal ? (principal.open_id ?? null) : null,
              sign_url: esPrincipal ? (signer?.sign_url ?? null) : null,
              signer_token: esPrincipal ? (signer?.token ?? null) : null,
              firmante_nombre: firmante.nombre,
              firmante_email: email,
              firmante_phone: celular,
              canal_email: canales.email,
              canal_whatsapp: canales.whatsapp,
              status: "pending",
              // Rastro de la versión sin firmar, que se sobrescribirá al firmar.
              etag_original: docs[i].etag,
              enviado_por: data.enviadoPor ?? null,
            },
          }),
        );
      }
      await tx.documentos.updateMany({
        where: { id: { in: docs.map((d) => BigInt(d.id)) } },
        data: { estado: "pendiente_firma" },
      });
      return filas;
    }),
  );
}

/**
 * Envía un documento a firma. El PDF se manda en base64 porque el contenedor de
 * Azure es privado: no hay URL pública que darle a ZapSign.
 */
export async function enviarDocumentoAFirma(
  input: EnviarAFirmaInput,
): Promise<EnviarAFirmaResult> {
  const { documentoId, radicado, firmante, canales } = input;
  const { email, celular } = validarFirmante(firmante, canales);
  const [doc] = await cargarDocsParaFirma([documentoId], radicado);

  const created = await zapFetch<ZapSignDocResponse>("/docs/", {
    ...buildDocPayload(doc),
    lang: "es",
    // Amarra el documento de ZapSign con la solicitud de este lado.
    external_id: radicado,
    signers: buildSigners(firmante, canales, email, celular),
  });

  const zapsignToken = created.token;
  if (!zapsignToken) {
    throw new DocumentoError(
      "ZapSign no devolvió el token del documento.",
      502,
    );
  }

  const [firma] = await persistirFirmas(
    [doc],
    [zapsignToken],
    { radicado, firmante, email, celular, canales, enviadoPor: input.enviadoPor ?? null },
    created,
  );

  const signer = created.signers?.[0];
  return {
    firmaId: firma.id.toString(),
    zapsignToken,
    signUrl: signer?.sign_url ?? null,
  };
}

/**
 * Envía varios documentos en un solo sobre de ZapSign: el primero como
 * documento principal y el resto como anexos. El firmante recibe UN solo link
 * y firma todos los documentos con una sola firma.
 *
 * El orden importa: primero se crean TODOS los documentos en ZapSign y recién
 * después se persiste localmente, en una transacción. Si ZapSign falla a la
 * mitad, localmente no cambió nada y reintentar crea un sobre nuevo; si falla
 * la persistencia, los documentos de ZapSign quedan huérfanos (solo en el
 * panel de ZapSign, nunca se marcaron localmente).
 */
export async function enviarLoteAFirma(
  input: EnviarLoteAFirmaInput,
): Promise<EnviarLoteAFirmaResult> {
  const { documentoIds, radicado, firmante, canales } = input;
  const { email, celular } = validarFirmante(firmante, canales);

  // Todo se valida antes de crear nada en ZapSign.
  const docs = await cargarDocsParaFirma(documentoIds, radicado);
  const [principal, ...anexos] = docs;

  // 1. El sobre nace con el documento principal. El correo automático se envía
  //    al crearlo; como los anexos entran en la misma petición, el link llega
  //    completo al firmante.
  const creadoPrincipal = await zapFetch<ZapSignDocResponse>("/docs/", {
    ...buildDocPayload(principal),
    lang: "es",
    external_id: radicado,
    signers: buildSigners(firmante, canales, email, celular),
  });
  const zapsignToken = creadoPrincipal.token;
  if (!zapsignToken) {
    throw new DocumentoError(
      "ZapSign no devolvió el token del documento.",
      502,
    );
  }

  // 2. Cada anexo entra al sobre con su propio token (una llamada por archivo,
  //    como exige la API de ZapSign). Los anexos heredan la configuración del
  //    principal (firmante, modo de autenticación, idioma).
  const tokens = [zapsignToken];
  for (const anexo of anexos) {
    const creado = await zapFetch<ZapSignDocResponse>(
      `/docs/${encodeURIComponent(zapsignToken)}/upload-extra-doc/`,
      buildDocPayload(anexo),
    );
    if (!creado.token) {
      throw new DocumentoError(
        "ZapSign no devolvió el token de un anexo.",
        502,
      );
    }
    tokens.push(creado.token);
  }

  // 3. Persistencia atómica de todas las firmas + estados.
  const filas = await persistirFirmas(
    docs,
    tokens,
    { radicado, firmante, email, celular, canales, enviadoPor: input.enviadoPor ?? null },
    creadoPrincipal,
  );

  const signer = creadoPrincipal.signers?.[0];
  return {
    firmaId: filas[0].id.toString(),
    zapsignToken,
    signUrl: signer?.sign_url ?? null,
    total: filas.length,
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
  /**
   * Anexos del sobre. ZapSign notifica UNA sola vez, con el token del documento
   * principal, y mete acá los anexos con su propio `signed_file`. Sin leer esto,
   * los anexos se quedan en `pendiente_firma` para siempre.
   */
  extra_docs?: ZapSignExtraDocResponse[];
}

export type WebhookOutcome =
  | {
    handled: true;
    action: "firmado" | "rechazado" | "sin_cambio";
    detail: string;
  }
  | { handled: false; detail: string };

/** Eventos que ZapSign usa para "el documento quedó firmado". */
const SIGNED_EVENTS = new Set(["doc_signed", "signed", "document_signed"]);
const REFUSED_EVENTS = new Set(["doc_refused", "refused", "signature_refused"]);

/** Qué pasó con un documento concreto del sobre. */
type ResultadoDoc =
  | { estado: "firmado" | "ya_estaba"; detalle: string }
  | { estado: "desconocido" | "sin_archivo" | "error_descarga"; detalle: string };

/**
 * Aplica la firma a UN documento: baja el PDF firmado, sobrescribe el blob y
 * mueve los estados.
 *
 * La idempotencia se evalúa por documento y no por sobre: el mismo evento puede
 * reprocesarse para recuperar un anexo que quedó atrás, sin volver a descargar
 * lo que ya está guardado.
 */
async function aplicarFirmaDocumento(
  token: string,
  signedUrl: string | null | undefined,
): Promise<ResultadoDoc> {
  if (!token) {
    return { estado: "desconocido", detalle: "Documento del sobre sin token." };
  }

  const firma = await withPrismaRetry(() =>
    prisma.firma_solicitudes.findUnique({
      where: { zapsign_token: token },
      include: { documento: true },
    }),
  );
  if (!firma) {
    return { estado: "desconocido", detalle: `Token desconocido: ${token}` };
  }

  if (firma.status === "signed" && firma.documento.estado === "firmado") {
    return {
      estado: "ya_estaba",
      detalle: `Documento ${firma.documento_id} ya estaba firmado.`,
    };
  }

  if (!signedUrl) {
    return {
      estado: "sin_archivo",
      detalle: `Documento ${firma.documento_id} sin signed_file.`,
    };
  }

  // La URL caduca en ~60 min: se descarga ahora y se guarda en el blob.
  const res = await fetch(signedUrl);
  if (!res.ok) {
    return {
      estado: "error_descarga",
      detalle: `No se pudo descargar el PDF de ${firma.documento_id} (${res.status}).`,
    };
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  await reemplazarContenido(
    firma.documento_id.toString(),
    buffer,
    "application/pdf",
  );

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
    estado: "firmado",
    detalle: `Documento ${firma.documento_id} firmado y actualizado.`,
  };
}

/**
 * Procesa un evento de ZapSign. Es idempotente: si el mismo evento llega dos
 * veces (ZapSign reintenta ante errores), el segundo no vuelve a descargar ni a
 * sobrescribir nada.
 *
 * Un sobre notifica UNA sola vez, con el token del documento principal; los
 * anexos llegan dentro de `extra_docs`, cada uno con su propio `signed_file`.
 * Por eso el evento se aplica a todos los documentos del sobre y no solo al que
 * identifica el `token` de primer nivel.
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
  const anexos = payload.extra_docs ?? [];

  if (REFUSED_EVENTS.has(evento)) {
    // El rechazo es de la sesión de firma, no de un archivo suelto: todo el
    // sobre vuelve a un estado manejable por el colaborador.
    const tokens = [token, ...anexos.map((a) => a.token ?? "")].filter(Boolean);
    const ids: bigint[] = [];
    for (const t of tokens) {
      const fila = await withPrismaRetry(() =>
        prisma.firma_solicitudes.findUnique({
          where: { zapsign_token: t },
          select: { id: true, documento_id: true },
        }),
      );
      if (!fila) continue;
      await withPrismaRetry(() =>
        prisma.firma_solicitudes.update({
          where: { id: fila.id },
          data: { status: "refused" },
        }),
      );
      await cambiarEstado(fila.documento_id.toString(), "revision", {
        permitirSistema: true,
      });
      ids.push(fila.documento_id);
    }
    return {
      handled: true,
      action: "rechazado",
      detail: `El firmante rechazó la firma; ${ids.length} documento(s) en revisión.`,
    };
  }

  const esFirmado =
    SIGNED_EVENTS.has(evento) ||
    (payload.status ?? "").toLowerCase() === "signed";
  if (!esFirmado) {
    return {
      handled: true,
      action: "sin_cambio",
      detail: `Evento "${evento}" registrado sin cambio de estado.`,
    };
  }

  // Principal primero, después cada anexo. Secuencial a propósito: cada paso
  // toca la BD y el blob, y el pool de Postgres es de 3 conexiones.
  const resultados: ResultadoDoc[] = [
    await aplicarFirmaDocumento(token, payload.signed_file),
  ];
  for (const anexo of anexos) {
    resultados.push(
      await aplicarFirmaDocumento(anexo.token ?? "", anexo.signed_file),
    );
  }

  const nuevos = resultados.filter((r) => r.estado === "firmado");
  const fallidos = resultados.filter(
    (r) => r.estado === "sin_archivo" || r.estado === "error_descarga",
  );
  const detalle = resultados.map((r) => r.detalle).join(" · ");

  // Si algo del sobre no se pudo aplicar, no se declara resuelto: queda el log
  // y `sincronizarFirma` puede recuperarlo pidiendo URLs frescas.
  if (fallidos.length > 0) {
    return { handled: false, detail: detalle };
  }

  return {
    handled: true,
    action: nuevos.length > 0 ? "firmado" : "sin_cambio",
    detail: detalle,
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

  let detalle = await zapFetch<ZapSignDocResponse>(
    `/docs/${encodeURIComponent(token)}/`,
    undefined,
    "GET",
  );

  // Consultar el token de un anexo devuelve una respuesta corta: el estado del
  // sobre y la lista de anexos solo existen en el principal. Se re-consulta
  // desde ahí para poder sincronizar el sobre completo, no un archivo suelto.
  if (detalle.parent_doc_token) {
    detalle = await zapFetch<ZapSignDocResponse>(
      `/docs/${encodeURIComponent(detalle.parent_doc_token)}/`,
      undefined,
      "GET",
    );
  }

  // El detalle no trae `event_type`; se deriva del `status` del documento para
  // que procesarWebhook lo interprete igual que un evento entrante.
  const status = (detalle.status ?? "").toLowerCase();
  return procesarWebhook({
    event_type: status === "signed" ? "doc_signed" : status,
    status,
    token: detalle.token ?? token,
    signed_file: detalle.signed_file ?? null,
    extra_docs: detalle.extra_docs,
    signers: detalle.signers,
  });
}
