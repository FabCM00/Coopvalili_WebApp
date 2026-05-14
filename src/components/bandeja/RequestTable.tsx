"use client";

import { type SolicitudUI, type SolicitudEstado } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RequestTableProps {
    rows: SolicitudUI[];
    selectedRadicado: string | null;
    onSelectRequest: (radicado: string) => void;
    page: number;
    onPageChange: (page: number) => void;
    totalRows: number;
    pageSize: number;
    loading?: boolean;
}

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
    aprobado: "Aprobado",
    preaprobado: "Preaprobado",
    en_revision: "En revisión",
    pendiente: "Pendiente",
    rechazado: "Rechazado",
    no_viable: "No viable",
};

const ESTADO_DOT: Record<SolicitudEstado, string> = {
    aprobado: "bg-green-500",
    preaprobado: "bg-blue-500",
    en_revision: "bg-amber-500",
    pendiente: "bg-gray-400",
    rechazado: "bg-red-500",
    no_viable: "bg-orange-500",
};

export function RequestTable({
    rows,
    selectedRadicado,
    onSelectRequest,
    page,
    onPageChange,
    totalRows,
    pageSize,
    loading = false,
}: RequestTableProps) {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(page, totalPages);

    return (
        <div className="bg-white border border-[#0D0D0D]/10 flex flex-col h-full">
            <div className="px-4 py-3 border-b border-[#0D0D0D]/8 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold tracking-wide text-[#0D0D0D]/45 uppercase">
                    Solicitudes
                </span>
                <span className="text-[11px] font-semibold text-[#012340]">
                    {rows.length} de {totalRows}
                </span>
            </div>

            <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#0D0D0D]/8 bg-white sticky top-0">
                            {["IDENTIFICACIÓN", "FECHA", "RADICADO", "SOLICITANTE", "VALOR", "ESTADO", "MOTOR"].map((col) => (
                                <th
                                    key={col}
                                    className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.16em] text-[#0D0D0D]/40 uppercase whitespace-nowrap"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-[#0D0D0D]/5 animate-pulse">
                                        {[80, 72, 120, 140, 72, 80, 48].map((w, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-3.5 bg-[#0D0D0D]/8 rounded" style={{ width: w }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-sm text-[#0D0D0D]/35">
                                    No hay solicitudes para los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            rows.map((s) => {
                                const selected = s.radicado === selectedRadicado;
                                return (
                                    <tr
                                        key={s.radicado}
                                        onClick={() => onSelectRequest(s.radicado)}
                                        className={`border-b border-[#0D0D0D]/5 cursor-pointer transition-colors ${selected
                                            ? "bg-[#012340]/[0.04] border-l-2 border-l-[#012340]"
                                            : "hover:bg-[#0D0D0D]/[0.02] border-l-2 border-l-transparent"
                                            }`}
                                    >
                                        <td className="px-4 py-3 font-medium text-[#0D0D0D]">{s.cedula}</td>
                                        <td className="px-4 py-3 text-xs text-[#0D0D0D]/55">{formatFecha(s.fecha)}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-[#0D0D0D]/55">{s.radicado}</td>
                                        <td className="px-4 py-3 text-[#0D0D0D]/85">{s.solicitante}</td>
                                        <td className="px-4 py-3 text-right font-medium text-[#0D0D0D]">{formatCurrency(s.valor)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-[#0D0D0D]/65">
                                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[s.estado]}`} />
                                                {ESTADO_LABEL[s.estado]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ScoreChip score={s.score} sinMotor={s.sinMotor} estado={s.estado} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && rows.length > 0 && (
                <RequestTablePaginator
                    page={safePage}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageStart={(safePage - 1) * pageSize}
                    pageSize={pageSize}
                    onChange={onPageChange}
                />
            )}
        </div>
    );
}

function ScoreChip({
    score,
    sinMotor,
    estado,
}: {
    score: number | null;
    sinMotor: boolean;
    estado: SolicitudEstado;
}) {
    if (sinMotor) {
        return (
            <span className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 text-[10px] font-medium text-[#0D0D0D]/40 border border-dashed border-[#0D0D0D]/20">
                sin motor
            </span>
        );
    }
    if (score === null) {
        return (
            <span className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 text-xs font-medium text-[#0D0D0D]/40 border border-[#0D0D0D]/10">
                —
            </span>
        );
    }
    const tone =
        estado === "rechazado" || estado === "no_viable"
            ? "bg-red-50 text-red-700 border-red-200"
            : estado === "aprobado" || estado === "preaprobado"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200";
    return (
        <span
            className={`inline-flex items-center justify-center min-w-[44px] h-6 px-2 text-xs font-bold border ${tone}`}
        >
            {score}
        </span>
    );
}

function RequestTablePaginator({
    page,
    totalPages,
    totalRows,
    pageStart,
    pageSize,
    onChange,
}: {
    page: number;
    totalPages: number;
    totalRows: number;
    pageStart: number;
    pageSize: number;
    onChange: (p: number) => void;
}) {
    const from = pageStart + 1;
    const to = Math.min(pageStart + pageSize, totalRows);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#0D0D0D]/10 text-xs text-[#0D0D0D]/60 flex-shrink-0">
            <div>
                Mostrando <span className="font-semibold text-[#0D0D0D]">{from}</span>–
                <span className="font-semibold text-[#0D0D0D]">{to}</span> de{" "}
                <span className="font-semibold text-[#0D0D0D]">{totalRows}</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-[#012340] hover:text-[#012340] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(page, totalPages).map((item, i) =>
                    item === "..." ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="inline-flex items-center justify-center h-8 w-8 text-[#0D0D0D]/40"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => onChange(item as number)}
                            className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2 text-xs font-medium border transition-colors ${item === page
                                ? "bg-[#012340] text-white border-[#012340]"
                                : "bg-white text-[#0D0D0D]/70 border-[#0D0D0D]/15 hover:border-[#012340] hover:text-[#012340]"
                                }`}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-[#012340] hover:text-[#012340] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página siguiente"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function getPageItems(current: number, total: number): (number | "...")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items: (number | "...")[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push("...");
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push("...");
    items.push(total);
    return items;
}

function formatCurrency(v: number): string {
    if (!Number.isFinite(v)) return "$0";
    return "$" + new Intl.NumberFormat("es-CO").format(Math.round(v));
}

function formatFecha(iso: string): string {
    if (!iso) return "—";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}-${m[2]}-${m[1]}`;
}
