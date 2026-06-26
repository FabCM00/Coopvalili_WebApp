import { useCallback, useEffect, useRef, useState } from "react";

import { API, MAX_SIZE_MB, VALID_FILE_TYPES } from "./utils";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UseDocumentUpload {
  file: File | null;
  progress: number;
  status: UploadStatus;
  error: string | null;
  start: (file: File, category: string) => void;
  reset: () => void;
}

/**
 * Encapsula la subida de un documento vía XMLHttpRequest (necesario para el
 * progreso real, que `fetch` no expone), incluyendo validación de tipo/tamaño
 * y el manejo de estados. Aborta cualquier subida en curso al desmontar.
 */
export function useDocumentUpload(
  cedula: string,
  onUploaded: () => void,
): UseDocumentUpload {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    return () => xhrRef.current?.abort();
  }, []);

  const start = useCallback(
    (selected: File, category: string) => {
      setError(null);

      if (!VALID_FILE_TYPES.includes(selected.type)) {
        setStatus("error");
        setError("Formato no válido. Sube un archivo PDF, JPG, PNG, DOCX o XLSX.");
        return;
      }
      if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
        setStatus("error");
        setError(`El archivo supera el límite de ${MAX_SIZE_MB} MB.`);
        return;
      }

      setFile(selected);
      setProgress(0);
      setStatus("uploading");

      const form = new FormData();
      form.append("file", selected);
      form.append("category", category);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `${API}?cedula=${encodeURIComponent(cedula)}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
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
          setProgress(100);
          setStatus("done");
          onUploaded(); // refresca la lista de fondo
        } else {
          setStatus("error");
          setError(json.message ?? "No se pudo subir el archivo.");
        }
      };
      xhr.onerror = () => {
        setStatus("error");
        setError("Error de red al subir el archivo.");
      };
      xhr.send(form);
    },
    [cedula, onUploaded],
  );

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    setFile(null);
    setProgress(0);
    setStatus("idle");
    setError(null);
  }, []);

  return { file, progress, status, error, start, reset };
}
