"use client";

import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useNotification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { BusyOverlay } from "@/components/BusyOverlay";
import type { FirmanteContacto } from "@/lib/firmante-solicitud";
import { DocumentList } from "./DocumentList";
import { SignPreviewModal } from "./SignPreviewModal";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { useDocumentos } from "./useDocumentos";
import {
  COMMUNICATIONS_URL,
  STATUS_CONFIG,
  type DocStatus,
  type Documento,
} from "./utils";

interface DocumentosTabProps {
  cedula: string;
  /** Los documentos se listan por radicado: sin él no hay nada que mostrar. */
  radicado?: string;
  /** Contacto del asociado: prellena el modal de firma (editable). */
  firmante: FirmanteContacto;
  /** En el modal expandido el encabezado lo pinta ModalHeader; aquí se omite. */
  showHeader?: boolean;
}

export function DocumentosTab({
  cedula,
  radicado,
  firmante,
  showHeader = true,
}: DocumentosTabProps) {
  const {
    docs,
    loading,
    error,
    refetch,
    refresh,
    remove,
    updateStatus,
    enviarAFirma,
    enviarLoteAFirma,
  } = useDocumentos(radicado);
  const { confirm, notify } = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  /** Documentos marcados para enviar a firma; null = modal cerrado. */
  const [firmarDocs, setFirmarDocs] = useState<Documento[] | null>(null);
  /** Mensaje del velo de trabajo; null = ninguna acción en curso. */
  const [busy, setBusy] = useState<string | null>(null);

  const firmanteInicial = useMemo(
    () => ({
      nombre: firmante.nombre,
      email: firmante.email,
      celular: firmante.celular,
    }),
    [firmante.nombre, firmante.email, firmante.celular],
  );

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSign = useCallback(
    async (datosFirmante: FirmanteContacto) => {
      // El error se propaga para que el modal lo muestre en línea y el usuario
      // pueda corregir los datos sin perder lo que escribió.
      if (!firmarDocs || firmarDocs.length === 0) return;
      const lote = firmarDocs.length > 1;
      if (lote) {
        await enviarLoteAFirma(firmarDocs, datosFirmante);
      } else {
        await enviarAFirma(firmarDocs[0], datosFirmante);
      }
      setFirmarDocs(null);
      notify({
        type: "success",
        message: (
          <>
            {lote ? (
              <>
                {firmarDocs.length} documentos enviados a firma en un solo
                link. Se notificó a{" "}
              </>
            ) : (
              <>
                Documento enviado a firma. Se notificó a{" "}
              </>
            )}
            <span className="font-semibold">{datosFirmante.nombre}</span> por
            correo.
          </>
        ),
      });
    },
    [enviarAFirma, enviarLoteAFirma, firmarDocs, notify],
  );

  const handleDelete = useCallback(
    async (doc: Documento) => {
      const ok = await confirm({
        type: "warning",
        title: "Eliminar documento",
        message: (
          <>
            ¿Eliminar <span className="font-semibold">{doc.nombre}</span>? Esta
            acción no se puede deshacer.
          </>
        ),
        confirmLabel: "Eliminar",
        confirmTone: "danger",
      });
      if (!ok) return;
      setBusy("Eliminando documento");
      try {
        await remove(doc);
        notify({
          type: "success",
          message: "El documento se eliminó correctamente.",
        });
      } catch (e) {
        notify({
          type: "error",
          message:
            e instanceof Error ? e.message : "No se pudo eliminar el documento.",
        });
      } finally {
        setBusy(null);
      }
    },
    [confirm, notify, remove],
  );

  const handleUpdateStatus = useCallback(
    async (doc: Documento, estado: DocStatus) => {
      setBusy("Actualizando estado");
      try {
        await updateStatus(doc, estado);
        notify({
          type: "success",
          message: (
            <>
              Documento marcado como{" "}
              <span className="font-semibold">
                {STATUS_CONFIG[estado].label}
              </span>
              .
            </>
          ),
        });
      } catch (e) {
        notify({
          type: "error",
          message:
            e instanceof Error ? e.message : "No se pudo actualizar el estado.",
        });
      } finally {
        setBusy(null);
      }
    },
    [updateStatus, notify],
  );

  const handleUploaded = useCallback(async () => {
    setBusy("Guardando documento");
    try {
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [refresh]);



  if (loading) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="min-h-0 flex-1">
          <LoadingScreen message="Cargando documentos" fullScreen={false} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <AlertCircle className="h-7 w-7 text-red-500" aria-hidden />
          <p className="max-w-[360px] text-sm text-[#0D0D0D]/55">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#012340]/20 text-[#012340] hover:bg-[#012340]/5"
            onClick={refetch}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-white">

      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-7 px-8 py-10">
          <Image
            src="/documentos.png"
            alt="Sin documentos"
            width={220}
            height={220}
            className="pointer-events-none select-none"
            priority
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xl font-normal tracking-tight text-[#0D0D0D]/80">
              No hay documentos disponibles
            </p>
            <p className="max-w-[380px] text-sm leading-relaxed text-[#0D0D0D]/50">
              Aún no se han adjuntado documentos para esta solicitud. Puedes
              solicitarlos{" "}
              <a
                href={COMMUNICATIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                comunicándote con el cliente
              </a>
              {radicado ? (
                <>
                  {" "}
                  o, si ya lo tienes,{" "}
                  <button
                    type="button"
                    onClick={openModal}
                    className="font-medium text-[#012340] underline underline-offset-2 transition-colors hover:text-[#012340]/75"
                  >
                    cárgalo aquí
                  </button>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <DocumentList
            docs={docs}
            onUpload={openModal}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            onSignBatch={setFirmarDocs}
          />
        </div>
      )}

      {modalOpen && radicado && (
        <UploadDocumentModal
          radicado={radicado}
          onClose={closeModal}
          onUploaded={handleUploaded}
        />
      )}

      {firmarDocs && firmarDocs.length > 0 && (
        <SignPreviewModal
          key={firmarDocs.map((d) => d.id).join(",")}
          docs={firmarDocs}
          inicial={firmanteInicial}
          onClose={() => setFirmarDocs(null)}
          onSubmit={handleSign}
        />
      )}

      {busy && <BusyOverlay message={busy} />}
    </div>
  );
}
