import { useCallback, useEffect, useRef, useState } from "react";

import type { FirmanteContacto } from "@/lib/firmante-solicitud";
import { API, type DocStatus, type Documento } from "./utils";

/**
 * Cada cuánto se recarga la lista mientras haya documentos esperando firma. El
 * webhook de ZapSign actualiza la BD en cuanto el asociado firma; este intervalo
 * solo hace que la pestaña abierta lo note sin recargar la página.
 */
const POLL_MS = 15_000;

export interface UseDocumentos {
  docs: Documento[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Recarga "silenciosa": no activa `loading` (no desmonta la vista). */
  refresh: () => Promise<void>;
  remove: (doc: Documento) => Promise<void>;
  updateStatus: (doc: Documento, estado: DocStatus) => Promise<void>;
  enviarAFirma: (doc: Documento, firmante: FirmanteContacto) => Promise<void>;
  /** Envía varios documentos en un solo sobre de ZapSign (1 link de firma). */
  enviarLoteAFirma: (
    docs: Documento[],
    firmante: FirmanteContacto,
  ) => Promise<void>;
}

/**
 * Carga los documentos de un radicado. A diferencia de la versión anterior (que
 * listaba blobs por cédula), consulta la tabla `documentos` filtrando por
 * radicado, así solo se ven los archivos de esa solicitud.
 */
export function useDocumentos(radicado: string | undefined): UseDocumentos {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!radicado) {
        setDocs([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API}/radicado/${encodeURIComponent(radicado)}`,
        );
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          documentos?: Documento[];
        };
        if (!res.ok || !json.ok) {
          throw new Error(
            json.message ?? "No se pudieron cargar los documentos.",
          );
        }
        setDocs(json.documentos ?? []);
      } catch (e) {
        // En refresco silencioso no rompemos la vista con la pantalla de error:
        // la subida ya fue exitosa y el documento aparecerá en la próxima recarga.
        if (!silent) {
          setError(
            e instanceof Error ? e.message : "Error al cargar documentos.",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [radicado],
  );

  const refetch = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load(false);
  }, [load]);

  // ¿Hay algo cuyo estado pueda cambiar por fuera de esta pestaña?
  const esperandoFirma = docs.some((d) => d.estado === "pendiente_firma");

  // El intervalo se arma solo cuando hay documentos en firma y se desmonta al
  // dejar de haberlos. `load` va por ref para no reiniciar el timer en cada
  // render (si no, el intervalo nunca llegaría a cumplirse).
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!esperandoFirma) return;
    const timer = setInterval(() => {
      // Silencioso: no debe parpadear la vista ni mostrar errores de red.
      void loadRef.current(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [esperandoFirma]);

  // Al volver a la pestaña del navegador se refresca de inmediato: si el
  // asociado firmó mientras el colaborador estaba en otra ventana, no hay que
  // esperar el siguiente ciclo.
  useEffect(() => {
    if (!esperandoFirma) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadRef.current(true);
    };
    window.addEventListener("visibilitychange", onVisible);
    return () => window.removeEventListener("visibilitychange", onVisible);
  }, [esperandoFirma]);

  /** URL de acciones sobre un documento; el radicado va como control de acceso. */
  const actionUrl = useCallback(
    (doc: Documento) =>
      `${API}/${encodeURIComponent(doc.id)}?radicado=${encodeURIComponent(doc.radicado)}`,
    [],
  );

  // Elimina el documento y lo quita de la lista. Lanza el error para que la UI
  // (modal de confirmación + notificación) decida cómo mostrarlo.
  const remove = useCallback(
    async (doc: Documento) => {
      const res = await fetch(actionUrl(doc), { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "No se pudo eliminar el documento.");
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    },
    [actionUrl],
  );

  // Cambia el estado y actualiza la fila con lo que devuelve el servidor (no con
  // el valor optimista), para que `updatedAt` y el estado real queden alineados.
  const updateStatus = useCallback(
    async (doc: Documento, estado: DocStatus) => {
      const res = await fetch(actionUrl(doc), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        documento?: Documento;
      };
      if (!res.ok || !json.ok || !json.documento) {
        throw new Error(json.message ?? "No se pudo actualizar el estado.");
      }
      const updated = json.documento;
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    },
    [actionUrl],
  );

  // Envía a firma y recarga: el documento queda en `pendiente_firma` y su fila
  // pasa a mostrarse bloqueada (sin acciones manuales).
  const enviarAFirma = useCallback(
    async (doc: Documento, firmante: FirmanteContacto) => {
      const res = await fetch(
        `${API}/${encodeURIComponent(doc.id)}/firmar?radicado=${encodeURIComponent(doc.radicado)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // El correo es el único canal: WhatsApp consumía créditos de ZapSign.
          body: JSON.stringify({
            firmante,
            canales: { email: true, whatsapp: false },
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "No se pudo enviar a firma.");
      }
      await load(true);
    },
    [load],
  );

  // Envío múltiple: el primer documento de la selección va como principal del
  // sobre y el resto como anexos; el firmante recibe un solo link.
  const enviarLoteAFirma = useCallback(
    async (docs: Documento[], firmante: FirmanteContacto) => {
      const ids = docs.map((d) => d.id);
      const res = await fetch(
        `${API}/firmar-lote?radicado=${encodeURIComponent(docs[0].radicado)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids,
            firmante,
            canales: { email: true, whatsapp: false },
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "No se pudo enviar a firma.");
      }
      await load(true);
    },
    [load],
  );

  return {
    docs,
    loading,
    error,
    refetch,
    refresh,
    remove,
    updateStatus,
    enviarAFirma,
    enviarLoteAFirma,
  };
}
