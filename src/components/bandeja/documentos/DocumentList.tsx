"use client";

import {
  Download,
  Eye,
  Folder,
  Lock,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { memo, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_CATEGORY,
  FileThumb,
  STATUS_CONFIG,
  STATUS_OPTIONS,
  displayName,
  fileExtLabel,
  fileUrl,
  formatDate,
  formatFileSize,
  type DocStatus,
  type Documento,
} from "./utils";

// Plural para la barra de resumen ("2 validados · 1 en revisión").
const STAT_LABEL: Record<DocStatus, string> = {
  validado: "validados",
  revision: "en revisión",
  pendiente: "pendientes",
};

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg.badge}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {cfg.label}
    </span>
  );
}

interface DocumentRowProps {
  cedula: string;
  doc: Documento;
  onDelete: (doc: Documento) => void;
  onUpdateStatus: (doc: Documento, status: DocStatus) => void;
}

// Memoizado: solo se re-renderiza si cambian sus props (útil si la lista crece).
const DocumentRow = memo(function DocumentRow({
  cedula,
  doc,
  onDelete,
  onUpdateStatus,
}: DocumentRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-[#0D0D0D]/10 bg-white px-3.5 py-3 transition-colors hover:border-[#012340]/25">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0D0D0D]/[0.03] ring-1 ring-inset ring-[#0D0D0D]/8">
        <FileThumb contentType={doc.contentType} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#0D0D0D]/85">
          {displayName(doc.name)}
        </p>
        <p className="mt-0.5 text-xs text-[#0D0D0D]/45">
          {fileExtLabel(doc.contentType)} · {formatFileSize(doc.size)} · Cargado{" "}
          {formatDate(doc.uploadedAt)}
        </p>
      </div>

      <StatusBadge status={doc.status} />

      <div className="flex shrink-0 items-center gap-0.5">
        <a
          href={fileUrl(cedula, doc, "view")}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#0D0D0D]/50 transition-colors hover:bg-[#012340]/5 hover:text-[#012340]"
        >
          <Eye className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={fileUrl(cedula, doc, "download")}
          title="Descargar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#0D0D0D]/50 transition-colors hover:bg-[#012340]/5 hover:text-[#012340]"
        >
          <Download className="h-4 w-4" aria-hidden />
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Más acciones"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#0D0D0D]/50 transition-colors hover:bg-[#012340]/5 hover:text-[#012340] data-[state=open]:bg-[#012340]/5 data-[state=open]:text-[#012340]"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-[#0D0D0D]/40">
              Cambiar estado
            </DropdownMenuLabel>
            {STATUS_OPTIONS.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const current = doc.status === s;
              return (
                <DropdownMenuItem
                  key={s}
                  disabled={current}
                  onClick={() => onUpdateStatus(doc, s)}
                  className="cursor-pointer text-xs font-medium"
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                  {current && (
                    <span className="ml-auto text-[10px] text-[#0D0D0D]/35">
                      actual
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(doc)}
              className="cursor-pointer text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
});

interface DocumentListProps {
  cedula: string;
  radicado?: string;
  docs: Documento[];
  onDelete: (doc: Documento) => void;
  onUpdateStatus: (doc: Documento, status: DocStatus) => void;
  onUpload: () => void;
}

export function DocumentList({
  cedula,
  radicado,
  docs,
  onDelete,
  onUpdateStatus,
  onUpload,
}: DocumentListProps) {
  // Agrupa por tipo de documento (texto libre). La carpeta por defecto va
  // primero y el resto en orden alfabético. Dentro de cada carpeta los docs ya
  // vienen ordenados por fecha desde el backend.
  const groups = useMemo(() => {
    const map = new Map<string, Documento[]>();
    for (const d of docs) {
      const key = d.category || DEFAULT_CATEGORY;
      const arr = map.get(key);
      if (arr) arr.push(d);
      else map.set(key, [d]);
    }
    return Array.from(map.entries())
      .map(([label, ds]) => ({ label, docs: ds }))
      .sort((a, b) => {
        if (a.label === DEFAULT_CATEGORY) return -1;
        if (b.label === DEFAULT_CATEGORY) return 1;
        return a.label.localeCompare(b.label, "es");
      });
  }, [docs]);

  const counts = useMemo(() => {
    const c: Record<DocStatus, number> = {
      validado: 0,
      revision: 0,
      pendiente: 0,
    };
    for (const d of docs) c[d.status]++;
    return c;
  }, [docs]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Resumen + cargar */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[#0D0D0D]/8 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-[#012340]">
            {docs.length} documento{docs.length === 1 ? "" : "s"}
          </span>
          {STATUS_OPTIONS.filter((s) => counts[s] > 0).map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 text-[#0D0D0D]/55"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {counts[s]} {STAT_LABEL[s]}
            </span>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-[#012340]/20 text-[#012340] hover:bg-[#012340]/5"
          onClick={onUpload}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Cargar
        </Button>
      </div>

      {/* Carpetas por tipo de documento */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {groups.map((group) => (
          <section key={group.label}>
            <div className="mb-2.5 flex items-center gap-2">
              <Folder className="h-4 w-4 text-[#012340]" aria-hidden />
              <h4 className="text-sm font-semibold text-[#012340]">
                {group.label}
              </h4>
              <span className="text-sm text-[#0D0D0D]/40">
                {group.docs.length}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {group.docs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  cedula={cedula}
                  doc={doc}
                  onDelete={onDelete}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Pie */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-[#0D0D0D]/10 px-5 py-3">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-[#0D0D0D]/45">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            Documentos asociados al radicado
            {radicado ? (
              <span className="ml-1 font-mono text-[#0D0D0D]/55">
                {radicado}
              </span>
            ) : null}
          </span>
        </span>
      </div>
    </div>
  );
}
