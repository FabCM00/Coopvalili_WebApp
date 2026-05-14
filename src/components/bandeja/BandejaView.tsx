"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { bandeja } from "@/lib/supabase";
import type { SolicitudUI, SolicitudEstado } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Download, Inbox, Maximize2, ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
import { RequestDetail } from "./RequestDetail";
import { RequestDetailModal } from "./RequestDetailModal";
import { ModalTabs, type DetailModalTab } from "./ModalHeader";

type Mode = "admin" | "user";

interface BandejaViewProps {
    mode: Mode;
    cedulaFilter?: string;
}

type FiltroTab = "todos" | SolicitudEstado;

const FILTROS: { id: FiltroTab; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "aprobado", label: "Aprobado" },
    { id: "preaprobado", label: "Preaprobado" },
    { id: "en_revision", label: "En revisión" },
    { id: "pendiente", label: "Pendiente" },
    { id: "rechazado", label: "Rechazado" },
    { id: "no_viable", label: "No viable" },
];

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

export function BandejaView({ mode, cedulaFilter }: BandejaViewProps) {
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState<SolicitudUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState("");
    const [filtro, setFiltro] = useState<FiltroTab>("todos");
    const [selectedRadicado, setSelectedRadicado] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DetailModalTab>("campos");
    const [page, setPage] = useState(1);
    const [vistaGestionados, setVistaGestionados] = useState(false);
    const [confirmRadicado, setConfirmRadicado] = useState<string | null>(null);
    const [gestionando, setGestionando] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [filtroOpen, setFiltroOpen] = useState(false);
    const [showList, setShowList] = useState(true);
    const filtroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!filtroOpen) return;
        const handler = (e: MouseEvent) => {
            if (filtroRef.current && !filtroRef.current.contains(e.target as Node))
                setFiltroOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [filtroOpen]);

    const PAGE_SIZE = 20;

    const fetchData = useCallback(async (clearSelection = false) => {
        const r = await bandeja.listSolicitudes({ limit: 200, cedulaFilter });
        if (!r.ok) { setError(r.error.message); setSolicitudes([]); return; }
        setError(null);
        setSolicitudes(r.data);
        if (clearSelection) {
            setSelectedRadicado(null);
        } else {
            setSelectedRadicado((cur) => {
                if (cur && r.data.some((s) => s.radicado === cur)) return cur;
                return null;
            });
        }
    }, [cedulaFilter]);

    useEffect(() => {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
    }, [fetchData]);

    const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const handleGestionar = (radicado: string) => setConfirmRadicado(radicado);

    const handleConfirmGestionar = async () => {
        if (!confirmRadicado) return;
        setGestionando(true);
        const r = await bandeja.marcarGestionado(confirmRadicado, user?.email ?? undefined);
        setGestionando(false);
        setConfirmRadicado(null);
        if (!r.ok) { setError(`Error al gestionar: ${r.error.message}`); return; }
        await fetchData(true);
    };

    const totalActivas = useMemo(() => solicitudes.filter((s) => !s.gestionado).length, [solicitudes]);
    const totalGestionadas = useMemo(() => solicitudes.filter((s) => s.gestionado).length, [solicitudes]);

    const filtradas = useMemo(() => {
        let out = solicitudes.filter((s) => (vistaGestionados ? s.gestionado : !s.gestionado));
        if (filtro !== "todos") out = out.filter((s) => s.estado === filtro);
        if (query.trim()) {
            const q = query.toLowerCase();
            out = out.filter(
                (s) =>
                    s.cedula.toLowerCase().includes(q) ||
                    s.solicitante.toLowerCase().includes(q) ||
                    s.radicado.toLowerCase().includes(q),
            );
        }
        return out;
    }, [solicitudes, filtro, query, vistaGestionados]);

    const conteoPorEstado = useMemo(() => {
        const base = solicitudes.filter((s) => (vistaGestionados ? s.gestionado : !s.gestionado));
        const map = new Map<FiltroTab, number>();
        map.set("todos", base.length);
        for (const s of base) map.set(s.estado, (map.get(s.estado) ?? 0) + 1);
        return map;
    }, [solicitudes, vistaGestionados]);

    const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageRows = filtradas.slice(pageStart, pageStart + PAGE_SIZE);

    useEffect(() => { setPage(1); }, [filtro, query, solicitudes, vistaGestionados]);
    useEffect(() => { setSelectedRadicado(null); setModalOpen(false); }, [vistaGestionados]);

    const seleccionada = useMemo(
        () => solicitudes.find((s) => s.radicado === selectedRadicado) ?? null,
        [solicitudes, selectedRadicado],
    );

    const handleExportCSV = () => {
        if (filtradas.length === 0) return;
        const headers = ["identificacion", "fecha", "radicado", "solicitante", "valor", "estado", "score_cifin", "gestionado"];
        const csv = [
            headers.join(","),
            ...filtradas.map((s) =>
                [s.cedula, s.fecha, s.radicado, `"${s.solicitante.replace(/"/g, '""')}"`, s.valor, ESTADO_LABEL[s.estado], s.score ?? "", s.gestionado ? (s.gestionadoAt ?? "sí") : "no"].join(","),
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bandeja_${vistaGestionados ? "gestionadas_" : ""}${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const confirmSolicitud = confirmRadicado ? solicitudes.find((s) => s.radicado === confirmRadicado) : null;

    return (
        <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 h-[calc(100%+2rem)] sm:h-[calc(100%+3rem)] lg:h-[calc(100%+4rem)]">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
                <div>
                    <h2 className="text-sm font-bold text-[#012340]">
                        {mode === "admin" ? "Bandeja de solicitudes" : "Mis solicitudes"}
                    </h2>
                    <p className="text-[11px] text-[#0D0D0D]/40">
                        {loading ? "Cargando…" : `${solicitudes.length} solicitudes cargadas`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {seleccionada && !seleccionada.gestionado && (
                        <Button
                            onClick={() => handleGestionar(seleccionada.radicado)}
                            className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-8 px-3 text-[11px] font-semibold tracking-wide"
                        >
                            Marcar como Gestionado
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExportCSV}
                        className="rounded-none border-[#0D0D0D]/15 h-8 px-3 text-[11px] font-semibold tracking-wide hover:bg-[#012340] hover:text-white hover:border-[#012340]">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                    </Button>
                    <Button onClick={handleRefresh} disabled={refreshing}
                        className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-8 px-3 text-[11px] font-semibold tracking-wide">
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex-shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700 flex items-center gap-2">
                    <span className="font-semibold">Error:</span> {error}
                </div>
            )}

            {/* ── Shared control row: toggle (left) + tabs (right) ── */}
            <div className="flex items-stretch border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
                {showList && (
                    <div className="w-[340px] flex-shrink-0 flex border-r border-[#0D0D0D]/10 transition-all">
                        <button
                            onClick={() => setVistaGestionados(false)}
                            className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${!vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
                        >
                            Activas <span className={`ml-1 text-[10px] font-bold ${!vistaGestionados ? "opacity-70" : "opacity-40"}`}>{totalActivas}</span>
                        </button>
                        <div className="w-px bg-[#0D0D0D]/10" />
                        <button
                            onClick={() => setVistaGestionados(true)}
                            className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
                        >
                            Gestionadas <span className={`ml-1 text-[10px] font-bold ${vistaGestionados ? "opacity-70" : "opacity-40"}`}>{totalGestionadas}</span>
                        </button>
                    </div>
                )}
                <div className="flex-1 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowList(!showList)}
                            className="p-1.5 text-[#0D0D0D]/40 hover:text-[#012340] hover:bg-[#0D0D0D]/5 rounded-md transition-colors"
                            title={showList ? "Ocultar lista" : "Mostrar lista"}
                        >
                            {showList ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                        </button>
                        {seleccionada && (
                            <ModalTabs active={activeTab} onChange={setActiveTab} />
                        )}
                    </div>
                    {seleccionada ? (
                        <button
                            onClick={() => setModalOpen(true)}
                            title="Ver en pantalla completa"
                            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-[#0D0D0D]/35 hover:text-[#012340] transition-colors flex-shrink-0"
                        >
                            <Maximize2 className="h-3 w-3" />
                            Expandir
                        </button>
                    ) : null}
                </div>
            </div>

            {/* ── Two-panel body ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
                {/* ── Left: search + filters + list ── */}
                {showList && (
                    <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[#0D0D0D]/10 bg-white overflow-hidden transition-all">
                    <div className="flex-shrink-0 px-3 py-2.5 border-b border-[#0D0D0D]/8">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0D0D0D]/30" />
                            <Input
                                placeholder="Buscar solicitudes…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="rounded-none border-[#0D0D0D]/12 pl-8 h-8 text-xs focus-visible:ring-0 focus-visible:border-[#012340]/40 bg-[#0D0D0D]/[0.02]"
                            />
                        </div>
                    </div>

                    <div ref={filtroRef} className="flex-shrink-0 px-3 py-2 border-b border-[#0D0D0D]/8 relative">
                        <button
                            onClick={() => setFiltroOpen((o) => !o)}
                            className="flex items-center gap-2 h-7 px-3 w-full border border-[#0D0D0D]/12 bg-white text-[11px] font-semibold text-[#0D0D0D]/70 hover:border-[#012340]/40 transition-colors"
                        >
                            <span className="flex-1 text-left">
                                {FILTROS.find((f) => f.id === filtro)?.label ?? "Todos"}
                                <span className="ml-1.5 text-[10px] font-bold text-[#0D0D0D]/40">
                                    {conteoPorEstado.get(filtro) ?? 0}
                                </span>
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-[#0D0D0D]/35 transition-transform ${filtroOpen ? "rotate-180" : ""}`} />
                        </button>

                        {filtroOpen && (
                            <div className="absolute left-3 right-3 top-full mt-0.5 z-20 bg-white border border-[#0D0D0D]/12 shadow-lg">
                                {FILTROS.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => { setFiltro(f.id); setFiltroOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold transition-colors ${filtro === f.id
                                            ? "bg-[#012340] text-white"
                                            : "text-[#0D0D0D]/65 hover:bg-[#0D0D0D]/[0.04]"
                                            }`}
                                    >
                                        {f.label}
                                        <span className={`text-[10px] font-bold ${filtro === f.id ? "opacity-70" : "opacity-40"}`}>
                                            {conteoPorEstado.get(f.id) ?? 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#0D0D0D]/10">
                        {loading ? (
                            <div className="flex flex-col">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="px-4 py-3 border-b border-[#0D0D0D]/5 animate-pulse">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[#0D0D0D]/12 flex-shrink-0" />
                                                <div className="h-3 bg-[#0D0D0D]/8 rounded" style={{ width: 120 }} />
                                            </div>
                                            <div className="h-2.5 bg-[#0D0D0D]/8 rounded" style={{ width: 36 }} />
                                        </div>
                                        <div className="h-2 bg-[#0D0D0D]/6 rounded ml-3 mb-1.5" style={{ width: 100 }} />
                                        <div className="flex items-center justify-between ml-3">
                                            <div className="h-2.5 bg-[#0D0D0D]/6 rounded" style={{ width: 90 }} />
                                            <div className="h-2.5 bg-[#0D0D0D]/6 rounded" style={{ width: 48 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : pageRows.length === 0 ? (
                            <div className="py-16 px-4 text-center flex flex-col items-center gap-3">
                                <Inbox className="h-6 w-6 text-[#0D0D0D]/20" />
                                <p className="text-sm font-semibold text-[#0D0D0D]/50">Sin resultados</p>
                                <p className="text-[11px] text-[#0D0D0D]/35">Intenta con otro filtro o búsqueda</p>
                            </div>
                        ) : (
                            pageRows.map((s) => {
                                const selected = s.radicado === selectedRadicado;
                                return (
                                    <button
                                        key={s.radicado}
                                        onClick={() => setSelectedRadicado(selected ? null : s.radicado)}
                                        className={`w-full text-left px-4 py-3 border-b border-[#0D0D0D]/5 transition-colors border-l-2 ${selected
                                            ? "bg-[#012340]/[0.05] border-l-[#012340]"
                                            : "border-l-transparent hover:bg-[#0D0D0D]/[0.02]"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[s.estado]}`} />
                                                <span className={`text-[13px] truncate ${!s.gestionado ? "font-semibold text-[#012340]" : "font-normal text-[#0D0D0D]/60"}`}>
                                                    {s.solicitante}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-[#0D0D0D]/35 flex-shrink-0">
                                                {formatFechaCorta(s.fecha)}
                                            </span>
                                        </div>
                                        <p className="font-mono text-[10px] text-[#0D0D0D]/40 truncate pl-3 mb-0.5">
                                            {s.radicado}
                                        </p>
                                        <div className="flex items-center justify-between gap-2 pl-3">
                                            <span className="text-[11px] text-[#0D0D0D]/45 truncate">
                                                CC {s.cedula} · {formatCurrency(s.valor)}
                                            </span>
                                            <span className={`text-[10px] font-semibold flex-shrink-0 ${selected ? "text-[#012340]" : "text-[#0D0D0D]/35"}`}>
                                                {ESTADO_LABEL[s.estado]}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {!loading && filtradas.length > PAGE_SIZE && (
                        <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-[#0D0D0D]/40">
                                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtradas.length)} de {filtradas.length}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ── Right: detail ── */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    {seleccionada ? (
                        <RequestDetail
                            solicitud={seleccionada}
                            activeTab={activeTab}
                            onGestionar={mode === "admin" && !seleccionada.gestionado ? () => handleGestionar(seleccionada.radicado) : undefined}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-[#0D0D0D]/25">
                            <Inbox className="h-10 w-10" />
                            <p className="text-sm font-medium">Selecciona una solicitud</p>
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && seleccionada && (
                <RequestDetailModal
                    solicitud={seleccionada}
                    initialTab={activeTab}
                    onClose={() => setModalOpen(false)}
                    onGestionar={!seleccionada.gestionado ? () => handleGestionar(seleccionada.radicado) : undefined}
                />
            )}

            {confirmRadicado && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget && !gestionando) setConfirmRadicado(null); }}
                >
                    <div className="w-full max-w-sm bg-white border border-[#0D0D0D]/15 shadow-2xl">
                        <div className="border-b border-[#0D0D0D]/10 px-5 py-4">
                            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/40">Confirmar acción</p>
                            <h3 className="mt-1 text-sm font-bold text-[#012340]">Marcar como Gestionado</h3>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-sm text-[#0D0D0D]/70">¿Confirmas que esta solicitud ya fue atendida?</p>
                            {confirmSolicitud && (
                                <div className="border border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.02] p-3 space-y-1">
                                    <p className="text-xs"><span className="font-medium text-[#0D0D0D]/45">Solicitante:</span> <span className="text-[#0D0D0D]/80">{confirmSolicitud.solicitante}</span></p>
                                    <p className="text-xs"><span className="font-medium text-[#0D0D0D]/45">Cédula:</span> <span className="text-[#0D0D0D]/80">{confirmSolicitud.cedula}</span></p>
                                    <p className="text-xs"><span className="font-medium text-[#0D0D0D]/45">Radicado:</span> <span className="font-mono text-[#0D0D0D]/80">{confirmSolicitud.radicado}</span></p>
                                </div>
                            )}
                            <p className="text-xs text-[#0D0D0D]/40">La solicitud pasará a Gestionadas. Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="border-t border-[#0D0D0D]/10 px-5 py-3 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setConfirmRadicado(null)} disabled={gestionando}
                                className="rounded-none border-[#0D0D0D]/15 h-8 px-4 text-[11px] font-semibold">
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirmGestionar} disabled={gestionando}
                                className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-8 px-4 text-[11px] font-semibold">
                                {gestionando ? "Guardando…" : "Confirmar"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatCurrency(v: number): string {
    if (!Number.isFinite(v)) return "$0";
    return "$" + new Intl.NumberFormat("es-CO").format(Math.round(v));
}

function formatFechaCorta(iso: string): string {
    if (!iso) return "—";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${parseInt(m[3])} ${meses[parseInt(m[2]) - 1]}`;
}
