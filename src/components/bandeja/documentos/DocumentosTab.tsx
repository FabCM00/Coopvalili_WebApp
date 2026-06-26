"use client";

import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useNotification } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { DocumentList } from "./DocumentList";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { useDocumentos } from "./useDocumentos";
import { COMMUNICATIONS_URL, STATUS_CONFIG, type DocStatus, type Documento } from "./utils";

interface DocumentosTabProps {
  cedula: string;
  solicitante?: string;
  radicado?: string;
  /** En el modal expandido el encabezado lo pinta ModalHeader; aquí se omite. */
  showHeader?: boolean;
}

export function DocumentosTab({
  cedula,
  solicitante,
  radicado,
  showHeader = true,
}: DocumentosTabProps) {
  const { docs, loading, error, refetch, refresh, remove, updateStatus } =
    useDocumentos(cedula, radicado);
  const { confirm, notify } = useNotification();
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleDelete = useCallback(
    async (doc: Documento) => {
      const ok = await confirm({
        type: "warning",
        title: "Eliminar documento",
        message: (
          <>
            ¿Eliminar <span className="font-semibold">{doc.name}</span>? Esta
            acción no se puede deshacer.
          </>
        ),
        confirmLabel: "Eliminar",
        confirmTone: "danger",
      });
      if (!ok) return;
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
      }
    },
    [confirm, notify, remove],
  );

  const handleUpdateStatus = useCallback(
    async (doc: Documento, status: DocStatus) => {
      try {
        await updateStatus(doc, status);
        notify({
          type: "success",
          message: (
            <>
              Documento marcado como{" "}
              <span className="font-semibold">
                {STATUS_CONFIG[status].label}
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
      }
    },
    [updateStatus, notify],
  );

  const header = showHeader ? (
    <div className="flex-shrink-0 border-b border-[#0D0D0D]/10 px-5 py-4">
      <h3 className="text-base font-bold text-[#012340]">
        Bandeja de documentos
      </h3>
      <p className="mt-0.5 truncate text-xs text-[#0D0D0D]/55">
        {solicitante ? (
          <span className="font-medium text-[#0D0D0D]/70">{solicitante}</span>
        ) : null}
        {solicitante ? " · " : null}CC {cedula}
      </p>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-white">
        {header}
        <div className="min-h-0 flex-1">
          <LoadingScreen message="Cargando documentos" fullScreen={false} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-white">
        {header}
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
    <div className="flex h-full flex-col bg-white">
      {header}

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
              </a>{" "}
              o, si ya lo tienes,{" "}
              <button
                type="button"
                onClick={openModal}
                className="font-medium text-[#012340] underline underline-offset-2 transition-colors hover:text-[#012340]/75"
              >
              <a className="text-blue-600 underline" href="#" onClick={openModal}>
                cárgalo aquí
              </a>
            
              </button>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <DocumentList
            cedula={cedula}
            radicado={radicado}
            docs={docs}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            onUpload={openModal}
          />
        </div>
      )}

      {modalOpen && (
        <UploadDocumentModal
          cedula={cedula}
          onClose={closeModal}
          onUploaded={refresh}
        />
      )}
    </div>
  );
}
