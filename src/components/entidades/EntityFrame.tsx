"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import type { Entity } from "@/app/config/entities";

interface EntityFrameProps {
    entity: Entity;
}

export function EntityFrame({ entity }: EntityFrameProps) {
    const [key, setKey] = useState(0);
    const [loading, setLoading] = useState(true);

    if (!entity.url) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 text-sm font-medium text-[#0D0D0D]/50 hover:text-[#012340] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                    <span className="text-[#0D0D0D]/20">/</span>
                    <span className="text-sm font-bold text-[#012340]">{entity.name}</span>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-12 text-center">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <div>
                        <p className="font-bold text-amber-800">URL no configurada</p>
                        <p className="text-sm text-amber-700 mt-1">
                            Configura <code className="rounded bg-amber-100 px-1 font-mono text-xs">NEXT_PUBLIC_{entity.slug.toUpperCase()}_URL</code> en el .env para ver esta entidad.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Breadcrumb + actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 text-sm font-medium text-[#0D0D0D]/50 hover:text-[#012340] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                    <span className="text-[#0D0D0D]/20">/</span>
                    <span className="text-sm font-bold text-[#012340]">{entity.name}</span>
                    <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600"
                    >
                        {entity.status === "active" ? "Activa" : "Inactiva"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setKey((k) => k + 1); setLoading(true); }}
                        className="flex items-center gap-1.5 rounded-lg border border-[#0D0D0D]/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0D0D0D]/50 transition hover:bg-[#0D0D0D]/4 hover:text-[#0D0D0D]/70"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Recargar
                    </button>
                    <a
                        href={entity.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-[#012340] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#012340]/85"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir en pestaña
                    </a>
                </div>
            </div>

            {/* iFrame */}
            <div className="relative flex-1 rounded-xl border border-[#0D0D0D]/8 overflow-hidden bg-white" style={{ minHeight: "calc(100vh - 200px)" }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative h-9 w-9">
                                <div className="absolute inset-0 rounded-full border-[3px] border-[#F29A2E]/20" />
                                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#F29A2E]" />
                            </div>
                            <p className="text-sm font-medium text-[#0D0D0D]/50">Cargando {entity.name}...</p>
                        </div>
                    </div>
                )}
                <iframe
                    key={key}
                    src={entity.url}
                    title={entity.name}
                    className="h-full w-full border-0"
                    style={{ minHeight: "calc(100vh - 200px)" }}
                    onLoad={() => setLoading(false)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
            </div>
        </div>
    );
}
