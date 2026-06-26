import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  Circle,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

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

export type DocStatus = "pendiente" | "revision" | "validado";

export interface Documento {
  id: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  category: string;
  status: DocStatus;
}

/** Carpeta por defecto cuando se carga un documento sin indicar el tipo. */
export const DEFAULT_CATEGORY = "Documentos generales";

export const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; badge: string; dot: string; icon: LucideIcon }
> = {
  validado: {
    label: "Validado",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  revision: {
    label: "En revisión",
    badge: "bg-[#F29A2E]/10 text-[#b46f12] border-[#F29A2E]/30",
    dot: "bg-[#F29A2E]",
    icon: Clock3,
  },
  pendiente: {
    label: "Pendiente",
    badge: "bg-[#0D0D0D]/[0.04] text-[#0D0D0D]/55 border-[#0D0D0D]/12",
    dot: "bg-[#0D0D0D]/25",
    icon: Circle,
  },
};

export const STATUS_OPTIONS: DocStatus[] = [
  "pendiente",
  "revision",
  "validado",
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
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
export function fileExtLabel(contentType: string): string {
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
  return map[contentType] ?? "Archivo";
}

/** Nombre legible: sin la extensión (el tipo ya se muestra en la metadata). */
export function displayName(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]+$/, "");
}

/** Construye la URL del endpoint que sirve el archivo (ver inline / descargar). */
export function fileUrl(
  cedula: string,
  doc: Documento,
  mode: "view" | "download",
): string {
  return `${API}/download?cedula=${encodeURIComponent(cedula)}&id=${encodeURIComponent(doc.id)}&mode=${mode}`;
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
export function FileThumb({ contentType }: { contentType: string }) {
  const icon = FILE_ICONS[contentType];
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
