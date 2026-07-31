import { useCallback, useEffect, useRef, useState } from "react";

import { API, MAX_SIZE_MB, VALID_FILE_TYPES } from "./utils";

type UploadStatus = "idle" | "uploading" | "done" | "error";

/** Tope del lote por carga: la selección se sube como una sola carpeta. */
export const MAX_FILES_PER_UPLOAD = 5;

/** Archivo de la cola de subida, con su estado y progreso individuales. */
export interface ArchivoSubida {
  id: string;
  file: File;
  /** Carpeta destino, capturada al elegir (los reintentos la conservan). */
  tipoDocumento: string;
  estado: "pendiente" | "subiendo" | "ok" | "error";
  progress: number;
  error?: string;
}

export interface UseDocumentUpload {
  /** Cola completa de archivos; el modal la muestra con estado por archivo. */
  archivos: ArchivoSubida[];
  /** Índice del archivo que se está subiendo (para "2 de 3"). */
  indiceActual: number;
  /** Subidos acumulados entre reintentos (para el aviso final). */
  totalOk: number;
  status: UploadStatus;
  /** Error global (archivos omitidos, tope de 5, todos inválidos…). */
  error: string | null;
  /**
   * Construye (o amplía con `agregar`) la cola y arranca la subida de inmediato.
   * Los archivos inválidos se omiten y se reportan en `error`; la cola solo
   * guarda válidos. Si ya está subiendo, los nuevos se encolan al final.
   */
  start: (files: File[], tipoDocumento: string, agregar?: boolean) => void;
}

/**
 * Encapsula la subida de varios documentos vía XMLHttpRequest (necesario para
 * el progreso real, que `fetch` no expone). Al elegir archivos (hasta 5) se
 * arma la cola y la subida arranca sola, uno tras otro: si uno falla, los
 * demás siguen y el fallido queda marcado para reintentar. Aborta la subida en
 * curso al desmontar.
 *
 * La cédula no se envía: el servidor la deriva del radicado, que es la fuente
 * de verdad (ver guardarDocumento en @/lib/documentos).
 */
export function useDocumentUpload(
  radicado: string,
  onUploaded: () => void,
): UseDocumentUpload {
  const [archivos, setArchivos] = useState<ArchivoSubida[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [totalOk, setTotalOk] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // La cola vive en una ref además del estado: el loop de subida lee de ahí, así
  // un `start(..., agregar)` no rompe la secuencia de archivos pendientes.
  const colaRef = useRef<ArchivoSubida[]>([]);

  useEffect(() => {
    return () => xhrRef.current?.abort();
  }, []);

  const subirUno = useCallback(
    (index: number) => {
      const archivo = colaRef.current[index];
      setIndiceActual(index);
      setArchivos((prev) =>
        prev.map((a, i) =>
          i === index
            ? { ...a, estado: "subiendo", progress: 0, error: undefined }
            : a,
        ),
      );

      const form = new FormData();
      form.append("file", archivo.file);
      form.append("radicado", radicado);
      form.append("tipo_documento", archivo.tipoDocumento);

      // Avanza la cola tras cada archivo (suba o falle): sigue con el siguiente
      // pendiente o cierra el lote con el estado final.
      const continuar = (siguiente: number) => {
        const cola = colaRef.current;
        if (siguiente < cola.length) subirUno(siguiente);
        else if (cola.every((a) => a.estado === "ok")) setStatus("done");
        else setStatus("error");
      };

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `${API}/guardar`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setArchivos((prev) =>
            prev.map((a, i) => (i === index ? { ...a, progress: pct } : a)),
          );
        }
      };
      xhr.onload = () => {
        let json: { ok?: boolean; message?: string } = {};
        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          /* respuesta no-JSON */
        }
        if (xhr.status >= 200 && xhr.status < 300 && json.ok) {
          setArchivos((prev) =>
            prev.map((a, i) =>
              i === index ? { ...a, estado: "ok", progress: 100 } : a,
            ),
          );
          setTotalOk((t) => t + 1);
          // Refresca la lista de fondo apenas cada archivo queda guardado.
          onUploaded();
        } else {
          setArchivos((prev) =>
            prev.map((a, i) =>
              i === index
                ? {
                    ...a,
                    estado: "error",
                    error: json.message ?? "No se pudo subir el archivo.",
                  }
                : a,
            ),
          );
        }
        continuar(index + 1);
      };
      xhr.onerror = () => {
        setArchivos((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  estado: "error",
                  error: "Error de red al subir el archivo.",
                }
              : a,
          ),
        );
        continuar(index + 1);
      };
      xhr.send(form);
    },
    [radicado, onUploaded],
  );

  const upload = useCallback(() => {
    const primero = colaRef.current.findIndex((a) => a.estado === "pendiente");
    if (primero === -1) return;
    setStatus("uploading");
    subirUno(primero);
  }, [subirUno]);

  const start = useCallback(
    (files: File[], tipoDocumento: string, agregar = false) => {
      setError(null);
      const base = agregar ? colaRef.current : [];

      // Tope del lote: los que no caben se omiten con aviso.
      const cupo = MAX_FILES_PER_UPLOAD - base.length;
      let seleccion = files;
      if (cupo <= 0) {
        setError(`Máximo ${MAX_FILES_PER_UPLOAD} documentos por carga.`);
        return;
      }
      if (files.length > cupo) {
        seleccion = files.slice(0, cupo);
        setError(
          `Máximo ${MAX_FILES_PER_UPLOAD} documentos por carga: se omitieron ${
            files.length - cupo
          } archivo${files.length - cupo > 1 ? "s" : ""}.`,
        );
      }

      // Los inválidos se omiten de la cola (no pueden reintentarse); se reportan
      // en el error global y no bloquean a los válidos.
      const omitidos: string[] = [];
      const nuevos: ArchivoSubida[] = [];
      for (const file of seleccion) {
        if (
          !VALID_FILE_TYPES.includes(file.type) ||
          file.size > MAX_SIZE_MB * 1024 * 1024
        ) {
          omitidos.push(file.name);
          continue;
        }
        nuevos.push({
          id: crypto.randomUUID(),
          file,
          tipoDocumento,
          estado: "pendiente",
          progress: 0,
        });
      }
      if (omitidos.length > 0) {
        setError(
          `Se omitieron ${omitidos.length} archivo${omitidos.length > 1 ? "s" : ""} no válido${omitidos.length > 1 ? "s" : ""}: ${omitidos.join(", ")}. Solo se aceptan PDF, JPG, PNG, DOCX o XLSX de hasta ${MAX_SIZE_MB} MB.`,
        );
      }
      if (nuevos.length === 0) return;

      const cola = [...base, ...nuevos];
      colaRef.current = cola;
      setArchivos(cola);

      // Subida automática apenas se seleccionan archivos. Si ya hay una cola en
      // curso, no se toca: el loop retoma los nuevos cuando llegue a ellos.
      if (status !== "uploading") upload();
    },
    [status, upload],
  );

  return { archivos, indiceActual, totalOk, status, error, start };
}
