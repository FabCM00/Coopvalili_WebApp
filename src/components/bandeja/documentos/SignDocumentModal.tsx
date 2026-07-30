"use client";

import { AlertCircle, FileSignature, Mail, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileThumb, displayName, type Documento } from "./utils";

export interface Firmante {
  nombre: string;
  email: string;
  celular: string;
}

interface SignDocumentModalProps {
  doc: Documento;
  /** Datos del asociado para prellenar (editables antes de enviar). */
  inicial: Firmante;
  onClose: () => void;
  onSubmit: (
    doc: Documento,
    firmante: Firmante,
    canales: { email: boolean; whatsapp: boolean },
  ) => Promise<void>;
}

export function SignDocumentModal({
  doc,
  inicial,
  onClose,
  onSubmit,
}: SignDocumentModalProps) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [email, setEmail] = useState(inicial.email);
  const [celular, setCelular] = useState(inicial.celular);
  // WhatsApp arranca apagado: consume créditos comprados en ZapSign.
  const [canalEmail, setCanalEmail] = useState(true);
  const [canalWhatsapp, setCanalWhatsapp] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !enviando) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enviando]);

  const sinCanal = !canalEmail && !canalWhatsapp;
  const faltaEmail = canalEmail && !email.trim();
  const faltaCelular = canalWhatsapp && !celular.trim();
  const puedeEnviar =
    !!nombre.trim() && !sinCanal && !faltaEmail && !faltaCelular && !enviando;

  const handleSubmit = async () => {
    setError(null);
    setEnviando(true);
    try {
      await onSubmit(
        doc,
        { nombre: nombre.trim(), email: email.trim(), celular: celular.trim() },
        { email: canalEmail, whatsapp: canalWhatsapp },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar a firma.");
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !enviando) onClose();
      }}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-md border border-[#0D0D0D]/10 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#012340]">
            <FileSignature className="h-4 w-4" aria-hidden />
            Enviar a firma
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            title="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[#0D0D0D]/30 transition-colors hover:text-[#012340] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Documento que se va a firmar */}
          <div className="flex items-center gap-3 rounded-xl border border-[#0D0D0D]/10 bg-black/[0.02] px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-[#0D0D0D]/10">
              <FileThumb contentType={doc.mimeType} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#0D0D0D]/80">
                {displayName(doc.nombre)}
              </p>
              <p className="text-xs text-[#0D0D0D]/45">{doc.tipoDocumento}</p>
            </div>
          </div>

          {/* Firmante */}
          <fieldset className="flex flex-col gap-3" disabled={enviando}>
            <legend className="mb-1 text-xs font-medium text-[#0D0D0D]/55">
              Firmante
            </legend>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#0D0D0D]/50">Nombre completo</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-[#0D0D0D]/12 px-3 py-2 text-sm text-[#0D0D0D]/80 outline-none transition-colors placeholder:text-[#0D0D0D]/35 focus:border-[#012340]/40 disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#0D0D0D]/50">
                Correo electrónico
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asociado@correo.com"
                className="w-full rounded-lg border border-[#0D0D0D]/12 px-3 py-2 text-sm text-[#0D0D0D]/80 outline-none transition-colors placeholder:text-[#0D0D0D]/35 focus:border-[#012340]/40 disabled:opacity-50"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-[#0D0D0D]/50">Celular</span>
              <input
                type="tel"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="3001234567"
                className="w-full rounded-lg border border-[#0D0D0D]/12 px-3 py-2 text-sm text-[#0D0D0D]/80 outline-none transition-colors placeholder:text-[#0D0D0D]/35 focus:border-[#012340]/40 disabled:opacity-50"
              />
            </label>
          </fieldset>

          {/* Canales de aviso */}
          <fieldset className="flex flex-col gap-2" disabled={enviando}>
            <legend className="mb-1 text-xs font-medium text-[#0D0D0D]/55">
              Notificar por
            </legend>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#0D0D0D]/10 px-3 py-2.5 transition-colors hover:border-[#012340]/25">
              <input
                type="checkbox"
                checked={canalEmail}
                onChange={(e) => setCanalEmail(e.target.checked)}
                className="h-4 w-4 accent-[#012340]"
              />
              <Mail className="h-4 w-4 text-[#0D0D0D]/40" aria-hidden />
              <span className="text-sm text-[#0D0D0D]/75">
                Correo electrónico
              </span>
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                Sin costo
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#0D0D0D]/10 px-3 py-2.5 transition-colors hover:border-[#012340]/25">
              <input
                type="checkbox"
                checked={canalWhatsapp}
                onChange={(e) => setCanalWhatsapp(e.target.checked)}
                className="h-4 w-4 accent-[#012340]"
              />
              <MessageCircle
                className="h-4 w-4 text-[#0D0D0D]/40"
                aria-hidden
              />
              <span className="text-sm text-[#0D0D0D]/75">WhatsApp</span>
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-brand-orange">
                Usa créditos
              </span>
            </label>
          </fieldset>

          {(sinCanal || faltaEmail || faltaCelular || error) && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {error ??
                  (sinCanal
                    ? "Elige al menos un canal para avisar al firmante."
                    : faltaEmail
                      ? "Para notificar por correo necesitas el correo del firmante."
                      : "Para notificar por WhatsApp necesitas el celular del firmante.")}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#0D0D0D]/10 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#0D0D0D]/60 hover:text-[#0D0D0D]/80"
            disabled={enviando}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!puedeEnviar}
            onClick={handleSubmit}
            className="gap-1.5 bg-[#012340] text-white hover:bg-[#012340]/90"
          >
            <FileSignature className="h-3.5 w-3.5" aria-hidden />
            {enviando ? "Enviando…" : "Enviar a firma"}
          </Button>
        </div>
      </div>
    </div>
  );
}
