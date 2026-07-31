"use client";

import {
  ChevronDown,
  Download,
  Eye,
  FileSignature,
  Folder,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FileThumb,
  STATUS_CONFIG,
  STATUS_OPTIONS,
  STATUS_SUMMARY_ORDER,
  STAT_LABEL,
  displayName,
  esEstadoDeSistema,
  fileExtLabel,
  fileUrl,
  formatDate,
  formatFileSize,
  type DocStatus,
  type Documento,
} from "./utils";

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  // `pendiente_firma` late para señalar que la vista está esperando un cambio
  // que llega por fuera (el webhook de ZapSign).
  const esperando = status === "pendiente_firma";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg.badge}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${esperando ? "animate-pulse" : ""}`}
        aria-hidden
      />
      {cfg.label}
    </span>
  );
}

/** Acción de icono (ver / descargar). Abre en pestaña nueva vía el proxy. */
function IconAction({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[#0D0D0D]/50 transition-colors hover:bg-[#012340]/5 hover:text-[#012340]"
    >
      {children}
    </a>
  );
}

/**
 * Solo los PDF fuera de un flujo de firma se pueden seleccionar: ZapSign firma
 * PDF y los documentos de sistema (`pendiente_firma`/`firmado`) ya están
 * gobernados por el webhook.
 */
function puedeSeleccionarse(doc: Documento): boolean {
  return doc.mimeType === "application/pdf" && !esEstadoDeSistema(doc.estado);
}

interface DocumentRowProps {
  doc: Documento;
  seleccionado: boolean;
  seleccionable: boolean;
  onToggle: (doc: Documento) => void;
  onDelete: (doc: Documento) => void;
  onUpdateStatus: (doc: Documento, estado: DocStatus) => void;
}

// Memoizado: solo se re-renderiza si cambian sus props (útil si la lista crece).
const DocumentRow = memo(function DocumentRow({
  doc,
  seleccionado,
  seleccionable,
  onToggle,
  onDelete,
  onUpdateStatus,
}: DocumentRowProps) {
  // En flujo de firma el servidor rechaza cambios y borrado (409): la UI lo
  // refleja mostrando el candado en lugar del menú de acciones.
  const bloqueado = esEstadoDeSistema(doc.estado);

  return (
    <li
      className={`group flex items-center gap-3 overflow-hidden rounded-xl border border-[#0D0D0D]/10 bg-white pr-3 transition-all hover:border-[#012340]/25 hover:shadow-sm ${
        bloqueado ? "bg-[#012340]/[0.015]" : ""
      }`}
    >
      {/* Check de selección para el envío a firma (solo PDF fuera de flujo). */}
      <span
        className="flex shrink-0 items-center pl-3"
        title={
          seleccionable
            ? "Seleccionar para firmar"
            : "Solo se firman PDF que no estén en un flujo de firma"
        }
      >
        <Checkbox
          checked={seleccionado}
          disabled={!seleccionable}
          onCheckedChange={() => onToggle(doc)}
          aria-label={`Seleccionar ${doc.nombre}`}
        />
      </span>

      {/* Acento de color: el estado se lee de un vistazo al recorrer la lista. */}
      <span
        className={`h-[52px] w-[3px] shrink-0 ${STATUS_CONFIG[doc.estado].dot}`}
        aria-hidden
      />

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D0D0D]/[0.03] ring-1 ring-inset ring-[#0D0D0D]/8">
        <FileThumb contentType={doc.mimeType} />
      </span>

      <div className="min-w-0 flex-1 py-2.5">
        <p className="truncate text-sm font-semibold text-[#0D0D0D]/85">
          {displayName(doc.nombre)}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#0D0D0D]/45">
          <span className="font-semibold text-[#0D0D0D]/55">
            {fileExtLabel(doc.mimeType)}
          </span>
          <span aria-hidden>·</span>
          <span>{formatFileSize(doc.sizeBytes)}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(doc.createdAt)}</span>
          {doc.subidoPor && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{doc.subidoPor}</span>
            </>
          )}
        </p>
      </div>

      <StatusBadge status={doc.estado} />

      <div className="flex shrink-0 items-center gap-0.5">
        <IconAction href={fileUrl(doc, "view")} title="Ver">
          <Eye className="h-4 w-4" aria-hidden />
        </IconAction>
        <IconAction href={fileUrl(doc, "download")} title="Descargar">
          <Download className="h-4 w-4" aria-hidden />
        </IconAction>

        {bloqueado ? (
          <span
            title={`${STATUS_CONFIG[doc.estado].label}: no admite cambios manuales`}
            className="flex h-8 w-8 items-center justify-center text-[#0D0D0D]/25"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : (
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
                const current = doc.estado === s;
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
        )}
      </div>
    </li>
  );
});

interface DocumentListProps {
  docs: Documento[];
  onUpload: () => void;
  onDelete: (doc: Documento) => void;
  onUpdateStatus: (doc: Documento, estado: DocStatus) => void;
  /** Abre la vista previa de firma con los documentos marcados con check. */
  onSignBatch: (docs: Documento[]) => void;
}

export function DocumentList({
  docs,
  onUpload,
  onDelete,
  onUpdateStatus,
  onSignBatch,
}: DocumentListProps) {
  // Agrupa por tipo de documento; dentro de cada grupo se conserva el orden que
  // trae la API (más reciente primero).
  const grupos = useMemo(() => {
    const map = new Map<string, Documento[]>();
    for (const doc of docs) {
      const key = doc.tipoDocumento;
      const list = map.get(key);
      if (list) list.push(doc);
      else map.set(key, [doc]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [docs]);

  // Resumen por estado: solo los estados presentes, en orden de avance.
  const resumen = useMemo(() => {
    const counts = new Map<DocStatus, number>();
    for (const doc of docs) {
      counts.set(doc.estado, (counts.get(doc.estado) ?? 0) + 1);
    }
    return STATUS_SUMMARY_ORDER.filter((s) => counts.has(s)).map((s) => ({
      status: s,
      count: counts.get(s) ?? 0,
    }));
  }, [docs]);

  // Selección para firma: por id, solo sobre documentos seleccionables.
  const seleccionables = useMemo(() => docs.filter(puedeSeleccionarse), [docs]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSeleccion = useCallback((doc: Documento) => {
    if (!puedeSeleccionarse(doc)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(doc.id)) next.delete(doc.id);
      else next.add(doc.id);
      return next;
    });
  }, []);

  // Si un documento deja de ser seleccionable (p. ej. ya se envió a firma) se
  // depura solo de la selección: no puede quedar "atrapado" sin desmarcar.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(seleccionables.map((d) => d.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [seleccionables]);

  const seleccionados = useMemo(
    () => docs.filter((d) => selectedIds.has(d.id)),
    [docs, selectedIds],
  );

  // Carpetas: `null` = todas abiertas; el Set guarda solo las cerradas, así no
  // hace falta rehidratar el estado cuando llegan tipos nuevos.
  const [cerradas, setCerradas] = useState<Set<string> | null>(null);

  const toggleGrupo = useCallback((tipo: string) => {
    setCerradas((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }, []);

  const enFirma = resumen.find((r) => r.status === "pendiente_firma")?.count ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Barra de resumen + acciones */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#0D0D0D]/10 px-5 py-3">
        <p className="text-xs font-semibold text-[#0D0D0D]/70">
          {docs.length} {docs.length === 1 ? "documento" : "documentos"}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {resumen.map(({ status, count }) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 text-xs text-[#0D0D0D]/50"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status].dot}`}
              />
              {count} {STAT_LABEL[status]}
            </span>
          ))}
        </div>

        {/* Deja claro que la vista se actualiza sola: sin esto el colaborador no
            sabe si tiene que recargar para ver la firma. */}
        {enFirma > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
            Esperando firma · se actualiza solo
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {seleccionables.length > 0 &&
            (seleccionados.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-[#0D0D0D]/50">
                <span className="font-semibold text-[#012340]">
                  {seleccionados.length}
                </span>
                seleccionado{seleccionados.length > 1 ? "s" : ""}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  title="Quitar selección"
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-sm text-[#0D0D0D]/40 transition-colors hover:bg-[#012340]/5 hover:text-[#012340]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ) : (
              <span className="hidden text-xs text-[#0D0D0D]/40 lg:inline">
                Marca los PDF a firmar
              </span>
            ))}

          {/* Firma de los documentos marcados: abre la vista previa. Siempre se
              muestra; sin PDF seleccionable queda deshabilitado. */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={seleccionados.length === 0}
            onClick={() => onSignBatch(seleccionados)}
            className="gap-1.5 border-[#012340]/25 text-[#012340] hover:bg-[#012340]/5"
            title={
              seleccionables.length === 0
                ? "Solo se pueden firmar documentos PDF"
                : undefined
            }
          >
            <FileSignature className="h-3.5 w-3.5" aria-hidden />
            Firmar
            {seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onUpload}
            className="gap-1.5 bg-[#012340] text-white hover:bg-[#012340]/90"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Cargar documento
          </Button>
        </div>
      </div>

      {/* Carpetas por tipo de documento (acordeón: se abren y se esconden). */}
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {grupos.map(([tipo, items]) => {
            const abierta = !(cerradas?.has(tipo) ?? false);
            const seleccionadosGrupo = items.filter((d) =>
              selectedIds.has(d.id),
            ).length;
            return (
              <section
                key={tipo}
                className="overflow-hidden rounded-xl border border-[#0D0D0D]/10 bg-[#012340]/[0.015]"
              >
                <button
                  type="button"
                  onClick={() => toggleGrupo(tipo)}
                  aria-expanded={abierta}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[#012340]/[0.04]"
                >
                  <Folder
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      abierta ? "text-[#012340]" : "text-[#0D0D0D]/30",
                    )}
                    aria-hidden
                  />
                  <h4 className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#0D0D0D]/50">
                    {tipo}
                  </h4>
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#012340]/10 px-1.5 text-[10px] font-bold text-[#012340]">
                    {items.length}
                  </span>
                  {seleccionadosGrupo > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {seleccionadosGrupo} seleccionado
                      {seleccionadosGrupo > 1 ? "s" : ""}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0 text-[#0D0D0D]/35 transition-transform duration-200",
                      !abierta && "-rotate-90",
                    )}
                    aria-hidden
                  />
                </button>

                {abierta ? (
                  <ul className="flex flex-col gap-2 border-t border-[#0D0D0D]/8 bg-white p-2.5">
                    {items.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        seleccionado={selectedIds.has(doc.id)}
                        seleccionable={puedeSeleccionarse(doc)}
                        onToggle={toggleSeleccion}
                        onDelete={onDelete}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-[#0D0D0D]/8 bg-white px-3.5 py-2 text-[11px] text-[#0D0D0D]/45">
                    {items.length}{" "}
                    {items.length === 1 ? "documento" : "documentos"}
                    {seleccionadosGrupo > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-semibold text-emerald-700">
                          {seleccionadosGrupo} seleccionado
                          {seleccionadosGrupo > 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
