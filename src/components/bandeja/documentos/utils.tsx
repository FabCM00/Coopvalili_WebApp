import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  Circle,
  FileSignature,
  Image as ImageIcon,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/** Base de las rutas de documentos (ver src/app/api/usuario/documentos/). */
export const API = "/api/usuario/documentos";

export const VALID_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
export const MAX_SIZE_MB = 10;

export const COMMUNICATIONS_URL =
  (process.env.NEXT_PUBLIC_URL_COMMUNICATIONS_APP ??
    "https://connect.truora.com") +
  "/#/engagement/?navbarTab=assigned&statusTab=open";

/**
 * Estados de un documento. Espeja DOCUMENTO_ESTADOS de @/lib/documentos.
 * `pendiente_firma` y `firmado` los asigna el sistema (flujo de firma): se
 * muestran como badge pero nunca se ofrecen como acción manual.
 */
export type DocStatus =
  | "pendiente"
  | "revision"
  | "validado"
  | "pendiente_firma"
  | "firmado";

/** Forma que devuelve la API (DocumentoDTO en @/lib/documentos). */
export interface Documento {
  id: string;
  radicado: string;
  cedula: string;
  nombre: string;
  mimeType: string | null;
  sizeBytes: number | null;
  tipoDocumento: string;
  estado: DocStatus;
  sha256: string | null;
  createdAt: string;
  updatedAt: string;
  subidoPor: string | null;
}

/** Carpeta por defecto cuando se carga un documento sin indicar el tipo. */
export const DEFAULT_TIPO = "Documentos generales";

export const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; badge: string; dot: string; icon: LucideIcon }
> = {
  firmado: {
    label: "Firmado",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-600",
    icon: ShieldCheck,
  },
  validado: {
    label: "Validado",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  pendiente_firma: {
    label: "Pendiente de firma",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: FileSignature,
  },
  revision: {
    label: "En revisión",
    badge: "bg-brand-orange/10 text-[#b46f12] border-brand-orange/30",
    dot: "bg-brand-orange",
    icon: Clock3,
  },
  pendiente: {
    label: "Pendiente",
    badge: "bg-[#0D0D0D]/[0.04] text-[#0D0D0D]/55 border-[#0D0D0D]/12",
    dot: "bg-[#0D0D0D]/25",
    icon: Circle,
  },
};

/**
 * Estados que el colaborador puede asignar a mano. `pendiente_firma` y `firmado`
 * quedan fuera a propósito: los pone el flujo de firma, y permitir marcarlos
 * manualmente vaciaría de valor el estado. Espeja ESTADOS_MANUALES del lib.
 */
export const STATUS_OPTIONS: DocStatus[] = [
  "pendiente",
  "revision",
  "validado",
];

/**
 * Un documento gobernado por el flujo de firma no admite cambio de estado ni
 * eliminación manual: el servidor lo rechaza con 409 y la UI lo refleja
 * deshabilitando las acciones.
 */
export function esEstadoDeSistema(status: DocStatus): boolean {
  return !STATUS_OPTIONS.includes(status);
}

/** Orden de la barra de resumen: del estado más avanzado al inicial. */
export const STATUS_SUMMARY_ORDER: DocStatus[] = [
  "firmado",
  "validado",
  "pendiente_firma",
  "revision",
  "pendiente",
];

/** Plural para la barra de resumen ("2 validados · 1 en revisión"). */
export const STAT_LABEL: Record<DocStatus, string> = {
  firmado: "firmados",
  validado: "validados",
  pendiente_firma: "pendientes de firma",
  revision: "en revisión",
  pendiente: "pendientes",
};

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Etiqueta corta del tipo de archivo: "PDF", "JPG", "PNG", "XLSX", "DOCX"… */
export function fileExtLabel(contentType: string | null): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "application/msword": "DOC",
  };
  return map[contentType ?? ""] ?? "Archivo";
}

/** Nombre legible: sin la extensión (el tipo ya se muestra en la metadata). */
export function displayName(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]+$/, "");
}

/**
 * Buena parte de los archivos que sube el chatbot se llaman con el hash del
 * contenido (64 caracteres hexadecimales). Sin tratarlos aparte, ese ruido ocupa
 * toda la fila y tapa lo único que identifica al documento: su carpeta.
 *
 * Se recortan por el medio —los extremos son lo que permite reconocerlos al
 * compararlos con la BD— y se marcan como técnicos para bajarles el contraste.
 */
export function nombreLegible(name: string): {
  texto: string;
  tecnico: boolean;
} {
  const base = displayName(name);
  if (!/^[0-9a-f]{24,}$/i.test(base)) return { texto: base, tecnico: false };
  return {
    texto: `${base.slice(0, 10)}…${base.slice(-6)}`,
    tecnico: true,
  };
}

/**
 * URL del endpoint que sirve el archivo. El `radicado` va como control de
 * acceso: la API verifica que el documento pertenezca a esa solicitud.
 */
export function fileUrl(
  doc: Documento,
  mode: "view" | "download",
): string {
  return `${API}/download?id=${encodeURIComponent(doc.id)}&radicado=${encodeURIComponent(doc.radicado)}&mode=${mode}`;
}

const FILE_ICONS: Record<string, { src: string; alt: string }> = {
  "application/pdf": { src: "/PDF_icon.svg.png", alt: "PDF" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    src: "/xlsx.png",
    alt: "XLSX",
  },
  "application/vnd.ms-excel": { src: "/xlsx.png", alt: "XLS" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    src: "/docx.png",
    alt: "DOCX",
  },
  "application/msword": { src: "/docx.png", alt: "DOC" },
};

/** Miniatura del archivo: usa el ícono correspondiente según el tipo de archivo. */
export function FileThumb({ contentType }: { contentType: string | null }) {
  const icon = FILE_ICONS[contentType ?? ""];
  if (icon) {
    return (
      <Image
        src={icon.src}
        alt={icon.alt}
        width={24}
        height={29}
        className="h-6 w-auto select-none object-contain"
      />
    );
  }
  return <ImageIcon className="h-5 w-5 text-[#012340]" aria-hidden />;
}
