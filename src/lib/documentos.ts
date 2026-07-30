
import { createHash, randomUUID } from "node:crypto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";

// ── Constantes de dominio ────────────────────────────────────────────────────

const CONTAINER_NAME = "documentos";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

/**
 * Estados de un documento. Los tres primeros los cambia el colaborador a mano;
 * `pendiente_firma` y `firmado` los pone el sistema (envío a ZapSign y webhook
 * de firma) y NO deben ofrecerse como opción manual en la UI.
 */
const DOCUMENTO_ESTADOS = [
  "pendiente",
  "revision",
  "validado",
  "pendiente_firma",
  "firmado",
] as const;
export type DocumentoEstado = (typeof DOCUMENTO_ESTADOS)[number];

/** Subconjunto que un colaborador puede asignar manualmente. */
const ESTADOS_MANUALES: readonly DocumentoEstado[] = [
  "pendiente",
  "revision",
  "validado",
];

const DEFAULT_TIPO_DOCUMENTO = "Documentos generales";
const MAX_TIPO_LEN = 60;

export function isDocumentoEstado(v: string): v is DocumentoEstado {
  return (DOCUMENTO_ESTADOS as readonly string[]).includes(v);
}

function isEstadoManual(v: string): boolean {
  return (ESTADOS_MANUALES as readonly string[]).includes(v);
}

function isAllowedContentType(type: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(type);
}

// ── Cliente de Azure (singleton) ─────────────────────────────────────────────

// Evita crear un cliente nuevo en cada Hot Reload de Next.js.
const globalForBlob = globalThis as unknown as {
  documentosContainer: ContainerClient | undefined;
};

function getContainerClient(): ContainerClient {
  if (globalForBlob.documentosContainer) return globalForBlob.documentosContainer;

  const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_BLOB_CONNECTION_STRING no está configurada.");
  }

  const service = BlobServiceClient.fromConnectionString(connectionString);
  const container = service.getContainerClient(CONTAINER_NAME);
  globalForBlob.documentosContainer = container;
  return container;
}

// ── Saneamiento de entradas ──────────────────────────────────────────────────

/** La cédula solo debe contener dígitos: evita inyección de path en el blob. */
function sanitizeCedula(cedula: string): string {
  return cedula.replace(/[^0-9]/g, "");
}

/** El radicado se usa en el nombre del blob: se limita a caracteres seguros. */
function sanitizeRadicado(radicado: string): string {
  return radicado.trim().replace(/[^a-zA-Z0-9._-]/g, "");
}

function sanitizeFilename(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.slice(-120) || "archivo";
}

function sanitizeTipo(value: string | null | undefined): string {
  const v = (value ?? "").trim().replace(/\s+/g, " ");
  return v ? v.slice(0, MAX_TIPO_LEN) : DEFAULT_TIPO_DOCUMENTO;
}

// ── Forma que consume el frontend ────────────────────────────────────────────

export interface DocumentoDTO {
  /** Id de la fila en `documentos` (no el nombre del blob). */
  id: string;
  radicado: string;
  cedula: string;
  nombre: string;
  mimeType: string | null;
  sizeBytes: number | null;
  tipoDocumento: string;
  estado: DocumentoEstado;
  sha256: string | null;
  createdAt: string;
  updatedAt: string;
  subidoPor: string | null;
}

/** `size_bytes` es BIGINT en Postgres: Prisma lo devuelve como BigInt. */
function toDTO(row: {
  id: bigint;
  radicado: string;
  cedula: string;
  nombre_original: string;
  mime_type: string | null;
  size_bytes: bigint | null;
  tipo_documento: string;
  estado: string;
  sha256: string | null;
  created_at: Date;
  updated_at: Date;
  subido_por: string | null;
}): DocumentoDTO {
  return {
    id: row.id.toString(),
    radicado: row.radicado,
    cedula: row.cedula,
    nombre: row.nombre_original,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    tipoDocumento: row.tipo_documento,
    estado: isDocumentoEstado(row.estado) ? row.estado : "pendiente",
    sha256: row.sha256,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    subidoPor: row.subido_por,
  };
}

// ── Errores de dominio ───────────────────────────────────────────────────────

/** Error con un código HTTP sugerido, para que las rutas no adivinen. */
export class DocumentoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DocumentoError";
  }
}

// ── Operaciones ──────────────────────────────────────────────────────────────

export interface GuardarDocumentoInput {
  radicado: string;
  file: File;
  tipoDocumento?: string | null;
  /** Email del colaborador que sube el archivo (para auditoría). */
  subidoPor?: string | null;
}

/**
 * Sube el archivo al blob y registra el puntero en la tabla.
 *
 * El orden importa: primero el blob, después el INSERT. Si el INSERT falla se
 * borra el blob recién subido (compensación), porque un blob huérfano es basura
 * silenciosa mientras que una fila apuntando a un blob inexistente rompe la UI
 * al descargar.
 *
 * La cédula NO se recibe por parámetro: se deriva del radicado en la BD, que es
 * la fuente de verdad. Así un cliente no puede subir a nombre de otra persona.
 */
export async function guardarDocumento(
  input: GuardarDocumentoInput,
): Promise<DocumentoDTO> {
  const radicado = sanitizeRadicado(input.radicado);
  if (!radicado) {
    throw new DocumentoError("Radicado requerido.", 400);
  }

  const { file } = input;
  if (!isAllowedContentType(file.type)) {
    throw new DocumentoError(
      "Formato no válido. Solo PDF, JPG, PNG, DOCX o XLSX.",
      415,
    );
  }
  if (file.size === 0) {
    throw new DocumentoError("El archivo está vacío.", 400);
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentoError("El archivo supera el límite de 10 MB.", 413);
  }

  // La solicitud debe existir: de ella sale la cédula y sin ella la FK falla.
  const solicitud = await withPrismaRetry(() =>
    prisma.valida1_results.findUnique({
      where: { radicado },
      select: { radicado: true, cedula: true },
    }),
  );
  if (!solicitud) {
    throw new DocumentoError(
      `La solicitud ${radicado} no existe. No se puede adjuntar el documento.`,
      404,
    );
  }

  const cedula = sanitizeCedula(solicitud.cedula ?? "");
  if (!cedula) {
    throw new DocumentoError(
      `La solicitud ${radicado} no tiene cédula registrada.`,
      409,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const contentType = file.type || "application/octet-stream";

  // El prefijo cedula/radicado no es el índice (eso es la tabla), pero deja el
  // contenedor navegable desde el portal de Azure.
  const blobName = `${cedula}/${radicado}/${randomUUID()}-${sanitizeFilename(file.name)}`;

  const container = getContainerClient();
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(blobName);

  const upload = await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  try {
    const row = await withPrismaRetry(() =>
      prisma.documentos.create({
        data: {
          radicado,
          cedula,
          container: CONTAINER_NAME,
          blob_name: blobName,
          nombre_original: file.name,
          mime_type: contentType,
          size_bytes: BigInt(buffer.length),
          sha256,
          etag: upload.etag ?? null,
          tipo_documento: sanitizeTipo(input.tipoDocumento),
          estado: "pendiente",
          subido_por: input.subidoPor ?? null,
        },
      }),
    );
    return toDTO(row);
  } catch (error) {
    // Compensación: el registro no quedó, así que el blob no debe quedar.
    await blob.deleteIfExists().catch(() => {
      console.error("[documentos] blob huérfano tras fallo de INSERT:", blobName);
    });
    throw error;
  }
}

/** Documentos vigentes de un radicado, del más reciente al más antiguo. */
export async function listarPorRadicado(
  radicado: string,
): Promise<DocumentoDTO[]> {
  const safe = sanitizeRadicado(radicado);
  if (!safe) return [];

  const rows = await withPrismaRetry(() =>
    prisma.documentos.findMany({
      where: { radicado: safe, eliminado: false },
      orderBy: { created_at: "desc" },
    }),
  );
  return rows.map(toDTO);
}

/**
 * Control de acceso: obliga a que quien manipula un documento ya sepa a qué
 * solicitud pertenece, de modo que un id suelto no alcance para tocar
 * documentos de otra persona. Si no se pasa radicado, no se verifica.
 */
function assertPertenece(
  radicadoFila: string,
  radicadoEsperado: string | undefined,
): void {
  if (!radicadoEsperado) return;
  if (radicadoFila !== sanitizeRadicado(radicadoEsperado)) {
    throw new DocumentoError(
      "El documento no pertenece a la solicitud indicada.",
      403,
    );
  }
}

async function findVigente(id: string) {
  let bigId: bigint;
  try {
    bigId = BigInt(id);
  } catch {
    return null;
  }
  return withPrismaRetry(() =>
    prisma.documentos.findFirst({ where: { id: bigId, eliminado: false } }),
  );
}

export interface DocumentoBuffer {
  buffer: Buffer;
  contentType: string;
  nombre: string;
}

/**
 * Descarga el contenido del blob asociado a un documento.
 *
 * `radicadoEsperado` es el control de acceso: obliga a que quien pide el archivo
 * ya sepa a qué solicitud pertenece, de modo que un id suelto no alcance para
 * leer documentos de otra persona. Omitirlo salta esa verificación.
 */
export async function obtenerBuffer(
  id: string,
  radicadoEsperado?: string,
): Promise<DocumentoBuffer | null> {
  const row = await findVigente(id);
  if (!row) return null;
  assertPertenece(row.radicado, radicadoEsperado);

  const blob = getContainerClient().getBlockBlobClient(row.blob_name);
  if (!(await blob.exists())) return null;

  return {
    buffer: await blob.downloadToBuffer(),
    contentType: row.mime_type ?? "application/octet-stream",
    nombre: row.nombre_original,
  };
}

/**
 * Sobrescribe el contenido del blob conservando la misma fila y el mismo
 * blob_name. Lo usa el flujo de firma para reemplazar el PDF original por el
 * firmado (con sellos y certificado), de modo que la URL de descarga que ya
 * tenga abierta el colaborador siga sirviendo el archivo correcto.
 *
 * El `etag` anterior queda registrado por quien llama (ver firma_solicitudes):
 * el contenido sin firmar no se conserva.
 */
export async function reemplazarContenido(
  id: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const row = await findVigente(id);
  if (!row) throw new DocumentoError("Documento no encontrado.", 404);
  if (buffer.length === 0) {
    throw new DocumentoError("El contenido nuevo está vacío.", 400);
  }

  const blob = getContainerClient().getBlockBlobClient(row.blob_name);
  const upload = await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  await withPrismaRetry(() =>
    prisma.documentos.update({
      where: { id: row.id },
      data: {
        mime_type: contentType,
        size_bytes: BigInt(buffer.length),
        sha256: createHash("sha256").update(buffer).digest("hex"),
        etag: upload.etag ?? null,
      },
    }),
  );
}

/**
 * Cambia el estado. `permitirSistema` habilita `pendiente_firma`/`firmado`, que
 * solo debe usar el flujo de firma (nunca una acción manual del colaborador).
 * `radicadoEsperado` es el control de acceso (ver obtenerBuffer).
 */
export async function cambiarEstado(
  id: string,
  estado: DocumentoEstado,
  opts: { permitirSistema?: boolean; radicadoEsperado?: string } = {},
): Promise<DocumentoDTO> {
  const row = await findVigente(id);
  if (!row) throw new DocumentoError("Documento no encontrado.", 404);
  assertPertenece(row.radicado, opts.radicadoEsperado);

  if (!opts.permitirSistema && !isEstadoManual(estado)) {
    throw new DocumentoError(
      `El estado "${estado}" lo asigna el sistema, no puede cambiarse manualmente.`,
      403,
    );
  }

  // Un documento en el flujo de firma no se saca de ahí con una acción manual.
  if (!opts.permitirSistema && !isEstadoManual(row.estado)) {
    throw new DocumentoError(
      `El documento está en estado "${row.estado}" (flujo de firma) y no admite cambios manuales.`,
      409,
    );
  }

  const updated = await withPrismaRetry(() =>
    prisma.documentos.update({ where: { id: row.id }, data: { estado } }),
  );
  return toDTO(updated);
}

/**
 * Borrado lógico: el blob y la fila se conservan, solo se marcan. Un documento
 * en el flujo de firma no se puede eliminar: tiene valor probatorio.
 */
export async function eliminarDocumento(
  id: string,
  opts: { radicadoEsperado?: string } = {},
): Promise<void> {
  const row = await findVigente(id);
  if (!row) throw new DocumentoError("Documento no encontrado.", 404);
  assertPertenece(row.radicado, opts.radicadoEsperado);

  if (!isEstadoManual(row.estado)) {
    throw new DocumentoError(
      `El documento está en estado "${row.estado}" (flujo de firma) y no puede eliminarse.`,
      409,
    );
  }

  await withPrismaRetry(() =>
    prisma.documentos.update({
      where: { id: row.id },
      data: { eliminado: true, deleted_at: new Date() },
    }),
  );
}
