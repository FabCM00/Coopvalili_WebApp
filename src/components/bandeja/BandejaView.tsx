"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bandeja,
  ESTADO_LABEL,
  ESTADO_DOT,
  ESTADO_BADGE,
  esEstadoTerminal,
  type SolicitudEstado,
  type SolicitudesPage,
} from "@/lib/bandeja";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCw,
  Download,
  Inbox,
  PanelLeftClose,
  PanelLeft,
  SlidersHorizontal,
  MoreVertical,
  CheckCircle2,
  X,
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BusyOverlay } from "@/components/BusyOverlay";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RequestDetail } from "./RequestDetail";
import { ModalTabs, type DetailModalTab } from "./ModalHeader";
import { BandejaFiltros, FILTROS, type FiltroTab } from "./BandejaFiltros";
import { Paginator } from "@/components/ui/paginator";

type Mode = "admin" | "user";

interface BandejaViewProps {
  mode: Mode;
  cedulaFilter?: string;
}

const PAGE_SIZE = 20;
const SKELETON_ROWS = Array.from({ length: 8 }, (_, i) => i);
const COP_FORMATTER = new Intl.NumberFormat("es-CO");

/** Filas fantasma con la misma métrica que una fila real, para que la lista no
 *  salte de alto al llegar los datos. */
function ListaSkeleton() {
  return (
    <div className="flex flex-col">
      {SKELETON_ROWS.map((i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-[#0D0D0D]/5 animate-pulse"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#0D0D0D]/12 flex-shrink-0" />
              <div
                className="h-3 bg-[#0D0D0D]/8 rounded"
                style={{ width: 120 }}
              />
            </div>
            <div
              className="h-2.5 bg-[#0D0D0D]/8 rounded"
              style={{ width: 36 }}
            />
          </div>
          <div
            className="h-2 bg-[#0D0D0D]/6 rounded ml-3 mb-1.5"
            style={{ width: 100 }}
          />
          <div className="flex items-center justify-between ml-3">
            <div
              className="h-2.5 bg-[#0D0D0D]/6 rounded"
              style={{ width: 90 }}
            />
            <div
              className="h-2.5 bg-[#0D0D0D]/6 rounded"
              style={{ width: 48 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BandejaView({ mode, cedulaFilter }: BandejaViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [selectedRadicado, setSelectedRadicado] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailModalTab>("campos");
  const [page, setPage] = useState(1);
  const [vistaGestionados, setVistaGestionados] = useState(false);
  const [confirmRadicado, setConfirmRadicado] = useState<string | null>(null);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [showList, setShowList] = useState(true);

  const {
    data: result,
    isLoading: loading,
    isFetching: refreshing,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "solicitudes",
      cedulaFilter,
      page,
      vistaGestionados,
      query,
      filtro,
    ] as const,
    queryFn: async () => {
      const r = await bandeja.listSolicitudes({
        limit: PAGE_SIZE,
        page,
        cedulaFilter,
        q: query || undefined,
        gestionado: vistaGestionados,
        estado: filtro === "todos" ? undefined : filtro,
      });
      if (!r.ok) throw new Error(r.error.message);
      return {
        ...r.data,
        filtroKey: filtro,
        pageKey: page,
        vistaKey: vistaGestionados,
      } as SolicitudesPage & {
        filtroKey: FiltroTab;
        pageKey: number;
        vistaKey: boolean;
      };
    },
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  const {
    data: conteoResult,
    error: conteoError,
    refetch: refetchConteo,
  } = useQuery({
    queryKey: [
      "solicitudes-conteo",
      cedulaFilter,
      vistaGestionados,
      query,
    ] as const,
    queryFn: async () => {
      const r = await bandeja.getConteoPorEstado({
        cedulaFilter,
        q: query || undefined,
        gestionado: vistaGestionados,
      });
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    refetchInterval: 30_000,
  });

  const solicitudes = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const totalActivas = result?.totalActivas ?? 0;
  const totalGestionadas = result?.totalGestionadas ?? 0;
  // Cambio de pestaña Activas ↔ Gestionadas: hay que detectarlo aparte porque
  // `placeholderData` conserva la lista anterior, así que `loading` es false y
  // sin esto la vista seguiría pintando las filas de la otra pestaña hasta que
  // llegue el fetch. Se compara contra `vistaKey` (la pestaña que produjo los
  // datos en mano) y no contra `refreshing` solo, que también se activa en el
  // refetch periódico de 30s — ahí sí queremos conservar la lista.
  const isVistaChange = Boolean(
    refreshing && result && result.vistaKey !== vistaGestionados,
  );
  const isFilterChange = Boolean(
    !isVistaChange && refreshing && result && result.filtroKey !== filtro,
  );
  const isPageChange = Boolean(
    !isVistaChange &&
    refreshing &&
    result &&
    result.filtroKey === filtro &&
    result.pageKey !== page,
  );

  const { data: selectedDetail = null, isLoading: detailLoading } = useQuery({
    queryKey: ["solicitud", selectedRadicado],
    queryFn: async () => {
      const r = await bandeja.getSolicitud(selectedRadicado!);
      if (!r.ok) throw new Error(r.error.message);
      return r.data ?? null;
    },
    enabled: !!selectedRadicado,
  });

  const gestionarMutation = useMutation({
    mutationFn: async (radicado: string) => {
      const r = await bandeja.marcarGestionado(
        radicado,
        user?.email ?? undefined,
      );
      if (!r.ok) throw new Error(r.error.message);
      return r;
    },
    onSuccess: async () => {
      setSelectedRadicado(null);
      setConfirmRadicado(null);
      // Se esperan las recargas dentro de la mutación para que `isPending` (y con
      // él el velo de carga) siga activo hasta que la lista ya esté reordenada:
      // con invalidateQueries sin await, el velo desaparecía antes.
      await Promise.all([
        qc.refetchQueries({ queryKey: ["solicitudes"] }),
        qc.refetchQueries({ queryKey: ["solicitudes-conteo"] }),
      ]);
    },
    onError: (e: Error) => {
      setMutationError(`Error al gestionar: ${e.message}`);
      setConfirmRadicado(null);
    },
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: async (estado: SolicitudEstado | null) => {
      const r = await bandeja.cambiarEstado(selectedRadicado!, estado);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    onSuccess: async () => {
      // El estado cambia la fila y el conteo, y el detalle abierto muestra el
      // badge: hay que refrescar los tres o la UI queda desfasada.
      await Promise.all([
        qc.refetchQueries({ queryKey: ["solicitudes"] }),
        qc.refetchQueries({ queryKey: ["solicitudes-conteo"] }),
        qc.refetchQueries({ queryKey: ["solicitud", selectedRadicado] }),
      ]);
    },
    onError: (e: Error) => setMutationError(`Error al cambiar estado: ${e.message}`),
  });

  const error =
    (queryError as Error | null)?.message ??
    (conteoError as Error | null)?.message ??
    mutationError;

  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 250);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchConteo()]);
  };
  const filtrosActivos = filtro !== "todos" ? 1 : 0;
  const handleLimpiarFiltros = () => setFiltro("todos");
  const handleGestionar = (radicado: string) => setConfirmRadicado(radicado);
  const handleConfirmGestionar = () => {
    if (!confirmRadicado) return;
    gestionarMutation.mutate(confirmRadicado);
  };

  const conteoPorEstado = useMemo(
    () =>
      new Map<FiltroTab, number>(
        Object.entries(conteoResult ?? {}) as [FiltroTab, number][],
      ),
    [conteoResult],
  );
  const pageRows = solicitudes;

  const pageStart = (page - 1) * PAGE_SIZE;

  useEffect(() => {
    setPage(1);
  }, [filtro, rawQuery, vistaGestionados]);
  useEffect(() => {
    setSelectedRadicado(null);
  }, [vistaGestionados]);
  useEffect(() => {
    setSelectedRadicado(null);
  }, [page]);

  const seleccionada = useMemo(
    () => solicitudes.find((s) => s.radicado === selectedRadicado) ?? null,
    [solicitudes, selectedRadicado],
  );

  const handleExportCSV = () => {
    if (pageRows.length === 0) return;
    const headers = [
      "identificacion",
      "fecha",
      "radicado",
      "solicitante",
      "valor",
      "estado",
      "score_cifin",
      "gestionado",
    ];
    const csv = [
      headers.join(","),
      ...pageRows.map((s) =>
        [
          s.cedula,
          s.fecha,
          s.radicado,
          `"${s.solicitante.replace(/"/g, '""')}"`,
          s.valor,
          ESTADO_LABEL[s.estado],
          s.score ?? "",
          s.gestionado ? (s.gestionadoAt ?? "sí") : "no",
        ].join(","),
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

  const confirmSolicitud = useMemo(
    () =>
      confirmRadicado
        ? (solicitudes.find((s) => s.radicado === confirmRadicado) ?? null)
        : null,
    [confirmRadicado, solicitudes],
  );

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 h-[calc(100%+2rem)] sm:h-[calc(100%+3rem)] lg:h-[calc(100%+4rem)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#012340]">
            {mode === "admin" ? "Bandeja de solicitudes" : "Mis solicitudes"}
          </h2>
          <p className="text-[11px] text-[#0D0D0D]/40">
            {loading
              ? "Cargando…"
              : `${total} solicitudes · p. ${page}/${totalPages}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#0D0D0D]/45 hover:text-[#012340] hover:bg-[#0D0D0D]/5 data-[state=open]:bg-[#012340] data-[state=open]:text-white transition-colors"
              title="Más acciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-md min-w-[190px]">
            {seleccionada && !seleccionada.gestionado && (
              <DropdownMenuItem
                onClick={() => handleGestionar(seleccionada.radicado)}
                className="text-[11px] font-semibold cursor-pointer text-[#012340]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como Gestionado
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[11px] font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Actualizar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportCSV}
              className="text-[11px] font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex-shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700 flex items-center gap-2">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* ── Control row ── */}
      <div className="flex items-stretch border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
        {showList && (
          <div className="w-[340px] flex-shrink-0 flex border-r border-[#0D0D0D]/10">
            <button
              onClick={() => setVistaGestionados(false)}
              className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${!vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
            >
              Activas{" "}
              <span
                className={`ml-1 text-[10px] font-bold ${!vistaGestionados ? "opacity-70" : "opacity-40"}`}
              >
                {totalActivas}
              </span>
            </button>
            <div className="w-px bg-[#0D0D0D]/10" />
            <button
              onClick={() => setVistaGestionados(true)}
              className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
            >
              Gestionadas{" "}
              <span
                className={`ml-1 text-[10px] font-bold ${vistaGestionados ? "opacity-70" : "opacity-40"}`}
              >
                {totalGestionadas}
              </span>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center px-2 gap-1">
          <button
            onClick={() => setShowList(!showList)}
            className="p-1.5 text-[#0D0D0D]/40 hover:text-[#012340] hover:bg-[#0D0D0D]/5 rounded-md transition-colors flex-shrink-0"
            title={showList ? "Ocultar lista" : "Mostrar lista"}
          >
            {showList ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
          {seleccionada && (
            <ModalTabs active={activeTab} onChange={setActiveTab} />
          )}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
        {/* Filtros empotrados */}
        {showList && (
          <BandejaFiltros
            open={filtroOpen}
            filtro={filtro}
            conteoPorEstado={conteoPorEstado}
            filtrosActivos={filtrosActivos}
            onFiltroChange={setFiltro}
            onLimpiar={handleLimpiarFiltros}
            onClose={() => setFiltroOpen(false)}
          />
        )}

        {/* ── Left: search + list ── */}
        {showList && (
          <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[#0D0D0D]/10 bg-white overflow-hidden">
            <div className="flex-shrink-0 px-3 py-2.5 border-b border-[#0D0D0D]/8 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0D0D0D]/30" />
                  <Input
                    placeholder="Buscar solicitudes…"
                    value={rawQuery}
                    onChange={(e) => setRawQuery(e.target.value)}
                    className="rounded-none border-[#0D0D0D]/12 pl-8 h-8 text-xs focus-visible:ring-0 focus-visible:border-[#012340]/40 bg-[#0D0D0D]/[0.02]"
                  />
                </div>
                <button
                  onClick={() => setFiltroOpen((o) => !o)}
                  title="Filtros"
                  className={`relative h-8 w-8 flex-shrink-0 inline-flex items-center justify-center border transition-colors ${
                    filtroOpen || filtrosActivos > 0
                      ? "border-[#012340] bg-[#012340] text-white"
                      : "border-[#0D0D0D]/12 text-[#0D0D0D]/55 hover:border-[#012340]/40 hover:text-[#012340]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {filtrosActivos > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-brand-orange text-white text-[9px] font-bold leading-none">
                      {filtrosActivos}
                    </span>
                  )}
                </button>
              </div>

              {filtrosActivos > 0 && (
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 h-5 pl-2 pr-1 bg-[#012340]/[0.06] border border-[#012340]/15 text-[10px] font-semibold text-[#012340]">
                    {FILTROS.find((f) => f.id === filtro)?.label}
                    <button
                      onClick={handleLimpiarFiltros}
                      className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-[#012340]/15 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                  <button
                    onClick={handleLimpiarFiltros}
                    className="text-[10px] font-semibold text-[#0D0D0D]/45 hover:text-[#012340] transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {isFilterChange ? (
                <LoadingScreen message="Aplicando filtro…" fullScreen={false} />
              ) : loading || isVistaChange || isPageChange ? (
                <ListaSkeleton />
              ) : pageRows.length === 0 ? (
                <div className="py-16 px-4 text-center flex flex-col items-center gap-3">
                  <Inbox className="h-6 w-6 text-[#0D0D0D]/20" />
                  <p className="text-sm font-semibold text-[#0D0D0D]/50">
                    Sin resultados
                  </p>
                  <p className="text-[11px] text-[#0D0D0D]/35">
                    Intenta con otro filtro o búsqueda
                  </p>
                </div>
              ) : (
                pageRows.map((s) => {
                  const selected = s.radicado === selectedRadicado;
                  return (
                    <button
                      key={s.radicado}
                      onClick={() =>
                        setSelectedRadicado(selected ? null : s.radicado)
                      }
                      className={`w-full text-left px-4 py-3 border-b border-[#0D0D0D]/5 transition-colors border-l-2 ${
                        selected
                          ? "bg-[#012340]/[0.05] border-l-[#012340]"
                          : "border-l-transparent hover:bg-[#0D0D0D]/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[s.estado]}`}
                          />
                          <span
                            className={`text-[13px] truncate ${!s.gestionado ? "font-semibold text-[#012340]" : "font-normal text-[#0D0D0D]/60"}`}
                          >
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
                        <span
                          className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${ESTADO_BADGE[s.estado]}`}
                        >
                          {ESTADO_LABEL[s.estado]}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {!loading && !isFilterChange && !isPageChange && totalPages > 1 && (
              <Paginator
                page={page}
                totalPages={totalPages}
                totalRows={total}
                pageStart={pageStart}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            )}
          </div>
        )}

        {/* ── Right: detail ── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {seleccionada ? (
            detailLoading || !selectedDetail ? (
              <LoadingScreen message="Cargando detalle…" fullScreen={false} />
            ) : (
              <RequestDetail
                solicitud={selectedDetail}
                activeTab={activeTab}
                cambioEstado={{
                  onCambiar: (estado) => cambiarEstadoMutation.mutate(estado),
                  guardando: cambiarEstadoMutation.isPending,
                  // Solo bloquea si el terminal lo puso una persona: si el motor
                  // dejó `aprobado` por su cuenta, aún debe poder corregirse.
                  bloqueado:
                    selectedDetail.estadoEsManual &&
                    esEstadoTerminal(selectedDetail.estado),
                }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[320px] h-full px-8 py-10 gap-0">
              <Image
                src="/bandeja.png"
                alt="Selecciona una solicitud"
                width={340}
                height={340}
                className="select-none pointer-events-none"
                priority
              />
              <div className="flex flex-col items-center gap-2 text-center -mt-12">
                <p className="text-xl font-normal text-[#0D0D0D]/80 tracking-tight">
                  Selecciona una solicitud
                </p>
                <p className="text-sm text-[#0D0D0D]/50 max-w-[360px] leading-relaxed">
                  Elige una solicitud de la lista para ver su detalle, campos y
                  documentos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmRadicado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 duration-200 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !gestionarMutation.isPending)
              setConfirmRadicado(null);
          }}
        >
          <div className="w-full max-w-sm border border-l-4 border-[#0D0D0D]/15 border-l-[#012340] bg-white shadow-2xl duration-200 animate-in zoom-in-95">
            <div className="border-b border-[#0D0D0D]/10 px-5 py-4">
              <Image
                src="/Imagen1.png"
                alt="WANT N' GET"
                width={140}
                height={42}
                className="mb-3 h-6 w-auto object-contain"
                priority
              />
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]/40">
                <CheckCircle2 className="h-4 w-4 text-[#012340]" aria-hidden />
                Confirmar acción
              </p>
              <h3 className="mt-1.5 text-sm font-bold text-[#012340]">
                Marcar como Gestionado
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-[#0D0D0D]/70">
                ¿Confirmas que esta solicitud ya fue atendida?
              </p>
              {confirmSolicitud && (
                <div className="border border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.02] p-3 space-y-1">
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Solicitante:
                    </span>{" "}
                    <span className="text-[#0D0D0D]/80">
                      {confirmSolicitud.solicitante}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Cédula:
                    </span>{" "}
                    <span className="text-[#0D0D0D]/80">
                      {confirmSolicitud.cedula}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Radicado:
                    </span>{" "}
                    <span className="font-mono text-[#0D0D0D]/80">
                      {confirmSolicitud.radicado}
                    </span>
                  </p>
                </div>
              )}
              <p className="text-xs text-[#0D0D0D]/40">
                La solicitud pasará a Gestionadas. Esta acción no se puede
                deshacer.
              </p>
            </div>
            <div className="border-t border-[#0D0D0D]/10 px-5 py-3 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmRadicado(null)}
                disabled={gestionarMutation.isPending}
                className="rounded-none border-[#0D0D0D]/15 h-8 px-4 text-[11px] font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmGestionar}
                disabled={gestionarMutation.isPending}
                className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-8 px-4 text-[11px] font-semibold"
              >
                {gestionarMutation.isPending ? "Guardando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gestionar mueve la solicitud de "Activas" a "Gestionadas" y recarga
          varias consultas: el velo cubre toda la vista hasta que la lista quedó
          reordenada (ver el await en onSuccess de la mutación). */}
      {gestionarMutation.isPending && (
        <BusyOverlay message="Cargando solicitudes" fullScreen />
      )}
    </div>
  );
}

function formatCurrency(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "$0";
  return "$" + COP_FORMATTER.format(Math.round(v));
}

function formatFechaCorta(iso: string): string {
  if (!iso) return "—";
  // Fecha sin hora: no pasa por conversión de zona horaria (un día calendario
  // no tiene huso horario propio; convertirlo podría retroceder al día anterior).
  const soloFecha = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;

  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}
