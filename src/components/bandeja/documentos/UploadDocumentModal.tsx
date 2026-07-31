"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotification } from "@/contexts/NotificationContext";
import {
  DEFAULT_TIPO,
  FileThumb,
  MAX_SIZE_MB,
  formatFileSize,
} from "./utils";
import {
  MAX_FILES_PER_UPLOAD,
  useDocumentUpload,
} from "./useDocumentUpload";

interface UploadDocumentModalProps {
  radicado: string;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadDocumentModal({
  radicado,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const { notify } = useNotification();
  const {
    archivos,
    indiceActual,
    totalOk,
    status,
    error,
    start,
  } = useDocumentUpload(radicado, onUploaded);
  const [dragOver, setDragOver] = useState(false);
  const [docType, setDocType] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Tipo de documento que titula la carpeta. Si se deja vacío usamos la carpeta
  // por defecto, así la carga nunca queda bloqueada. Aplica a todo el lote.
  const effectiveCategory = docType.trim() || DEFAULT_TIPO;

  const uploading = status === "uploading";
  const subidos = archivos.filter((a) => a.estado === "ok").length;
  const fallidos = archivos.filter((a) => a.estado === "error");
  const pendientes = archivos.filter((a) => a.estado === "pendiente");

  // Progreso global = promedio de los progresos individuales.
  const progress = useMemo(() => {
    if (archivos.length === 0) return 0;
    return Math.round(
      archivos.reduce((sum, a) => sum + a.progress, 0) / archivos.length,
    );
  }, [archivos]);

  // Al completar todo: aviso de éxito + cerrar el modal. `totalOk` cuenta los
  // subidos acumulados (incluye reintentos), no solo la cola visible.
  useEffect(() => {
    if (status === "done" && totalOk > 0) {
      notify({
        type: "success",
        message: (
          <>
            {totalOk} documento{totalOk > 1 ? "s" : ""} cargado
            {totalOk > 1 ? "s" : ""} correctamente en «{effectiveCategory}».
          </>
        ),
      });
      onClose();
    }
  }, [status, totalOk, effectiveCategory, notify, onClose]);

  // Cerrar con Escape (salvo mientras sube).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, uploading]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    // Resetea el input para poder volver a elegir el mismo archivo.
    event.target.value = "";
    if (selected.length > 0) {
      // Con cola ya armada, agrega al lote en lugar de reemplazarlo.
      start(selected, effectiveCategory, archivos.length > 0);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    const selected = event.dataTransfer.files
      ? Array.from(event.dataTransfer.files)
      : [];
    if (selected.length > 0) {
      start(selected, effectiveCategory, archivos.length > 0);
    }
  };

  // Reintenta solo los archivos que fallaron, sin tocar los que ya subieron.
  const handleRetry = () => {
    start(
      fallidos.map((a) => a.file),
      effectiveCategory,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !uploading) onClose();
      }}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-md border border-[#0D0D0D]/10 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#012340]">
            Cargar documento{archivos.length > 1 ? "s" : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            title="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[#0D0D0D]/30 transition-colors hover:text-[#012340] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {archivos.length === 0 && (
            <>
              {/* Tipo de documento: texto libre que titula la carpeta. Aplica a
                  toda la selección. */}
              <div className="mb-4">
                <label
                  htmlFor="documento-tipo"
                  className="mb-1.5 block text-xs font-medium text-[#0D0D0D]/55"
                >
                  Tipo de documento
                </label>
                <input
                  id="documento-tipo"
                  type="text"
                  autoFocus
                  value={docType}
                  onChange={(event) => setDocType(event.target.value)}
                  placeholder="Ej. Documentos crédito, Cédula, Comprobante de ingresos…"
                  maxLength={60}
                  className="w-full rounded-lg border border-[#0D0D0D]/12 px-3 py-2 text-sm text-[#0D0D0D]/80 outline-none transition-colors placeholder:text-[#0D0D0D]/35 focus:border-[#012340]/40"
                />
                <p className="mt-1.5 text-xs text-[#0D0D0D]/40">
                  Opcional. Si lo dejas vacío se guarda en «{DEFAULT_TIPO}». Los
                  archivos seleccionados se suben a esta carpeta.
                </p>
              </div>

              {/* Zona de carga (clic o arrastrar y soltar, varios archivos). */}
              <label
                htmlFor="documento-upload"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-9 text-center transition-colors",
                  dragOver
                    ? "border-brand-orange bg-brand-orange/[0.06]"
                    : "border-[#0D0D0D]/15 hover:border-[#012340]/40 hover:bg-[#012340]/[0.02]",
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#012340]/[0.06] text-[#012340]">
                  <Upload className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-sm text-[#0D0D0D]/70">
                  Arrastra y suelta o{" "}
                  <span className="font-semibold text-brand-orange underline underline-offset-4">
                    elige los archivos
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#0D0D0D]/40">
                  Hasta {MAX_FILES_PER_UPLOAD} a la vez · PDF, JPG, PNG, DOCX o
                  XLSX · máx. {MAX_SIZE_MB} MB c/u
                </p>
                <input
                  id="documento-upload"
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls"
                  className="sr-only"
                  onChange={handleInputChange}
                />
              </label>

              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </div>
              )}
            </>
          )}

          {/* Lote de subida: estado por archivo + progreso global. */}
          {archivos.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-[#0D0D0D]/55">
                {uploading ? (
                  <>
                    Subiendo{" "}
                    <span className="font-bold text-[#012340]">
                      {indiceActual + 1}
                    </span>{" "}
                    de {archivos.length}
                  </>
                ) : fallidos.length > 0 ? (
                  <>
                    {subidos} de {archivos.length} subido
                    {subidos === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-red-600">
                      {fallidos.length} con error
                    </span>
                  </>
                ) : (
                  <>
                    {archivos.length} archivo
                    {archivos.length > 1 ? "s" : ""} seleccionado
                    {archivos.length > 1 ? "s" : ""}
                  </>
                )}
              </p>

              <div className="flex flex-col gap-1.5">
                {archivos.map((a, i) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                      a.estado === "error"
                        ? "border-red-200 bg-red-50/60"
                        : "border-[#0D0D0D]/10 bg-black/[0.02]",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-[#0D0D0D]/10">
                      <FileThumb contentType={a.file.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0D0D0D]/80">
                        {a.file.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          a.estado === "error"
                            ? "text-red-600"
                            : "text-[#0D0D0D]/45",
                        )}
                      >
                        {formatFileSize(a.file.size)}
                        {a.error ? ` · ${a.error}` : ""}
                      </p>
                    </div>

                    {a.estado === "ok" && (
                      <CheckCircle2
                        className="h-4.5 w-4.5 shrink-0 text-emerald-600"
                        aria-label="Subido"
                      />
                    )}
                    {a.estado === "error" && (
                      <AlertCircle
                        className="h-4.5 w-4.5 shrink-0 text-red-500"
                        aria-label="Error"
                      />
                    )}
                    {a.estado === "pendiente" && (
                      <span className="shrink-0 text-[10px] text-[#0D0D0D]/35">
                        en cola
                      </span>
                    )}
                    {a.estado === "subiendo" && (
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="text-xs tabular-nums text-[#0D0D0D]/50">
                          {a.progress}%
                        </span>
                        <Loader2
                          className="h-4 w-4 animate-spin text-[#012340]"
                          aria-label="Subiendo"
                        />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Barra de progreso global */}
              <div className="mt-1 flex items-center gap-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#012340]/10">
                  <div
                    className="h-full rounded-full bg-[#012340] transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-[#0D0D0D]/50">
                  {progress}%
                </span>
              </div>

              {/* Agregar más archivos al lote (hasta el tope). */}
              {archivos.length < MAX_FILES_PER_UPLOAD ? (
                <label
                  htmlFor="documento-upload"
                  className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#0D0D0D]/20 py-2 text-xs font-medium text-[#012340] transition-colors hover:border-[#012340]/40 hover:bg-[#012340]/[0.02]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Agregar más archivos ({archivos.length}/
                  {MAX_FILES_PER_UPLOAD})
                </label>
              ) : (
                <p className="mt-1 text-center text-[10px] text-[#0D0D0D]/35">
                  Máximo {MAX_FILES_PER_UPLOAD} documentos por carga
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#0D0D0D]/10 px-5 py-3">
          {fallidos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || pendientes.length > 0}
              onClick={handleRetry}
              className="mr-auto gap-1.5 border-[#012340]/25 text-[#012340] hover:bg-[#012340]/5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Reintentar {fallidos.length}{" "}
              {fallidos.length === 1 ? "archivo" : "archivos"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#0D0D0D]/60 hover:text-[#0D0D0D]/80"
            disabled={uploading}
            onClick={onClose}
          >
            {uploading ? "Subiendo…" : "Cancelar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
