"use client";

import { useEffect, useMemo, useState } from "react";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { useAsociados } from "@/hooks/use-asociados";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";

import {
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Database,
    Wallet,
    MapPin,
    Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

export default function DatosAsociadoPage() {
    const { isAuthorized, loading: authLoading } = useProtectedRoute({
        allowedRoles: ["admin"],
    });

    const [filterQuery, setFilterQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [refreshing, setRefreshing] = useState(false);

    const {
        data,
        loading,
        error,
        refresh,
        total,
    } = useAsociados({
        page,
        pageSize,
        orderBy: {
            column: "updated_at",
            ascending: false,
        },
    });

    const filtered = useMemo(() => {
        if (!filterQuery.trim()) return data;

        const q = filterQuery.toLowerCase();

        return data.filter((u) =>
            [
                u.cedula,
                u.primer_apellido,
                u.nombre,
                u.ciudad,
                u.estado_civil,
                u.cliente_empresa,
                u.nombre_asociado,
                u.estado_civil_norm,
            ].some((v) =>
                String(v ?? "")
                    .toLowerCase()
                    .includes(q),
            ),
        );
    }, [data, filterQuery]);

    useEffect(() => {
        setPage(1);
    }, [filterQuery, pageSize]);

    const totalPages = Math.max(
        1,
        Math.ceil(total / pageSize),
    );

    const safePage = Math.min(page, totalPages);

    const pageStart = (safePage - 1) * pageSize;

    const metricas = useMemo(() => {
        const totalRegistros = total;

        const cupoTotal = data.reduce(
            (acc, item) =>
                acc + (Number(item.cuota_disponible) || 0),
            0,
        );

        const ciudades = new Set(
            data
                .map((x) => x.ciudad)
                .filter(Boolean),
        ).size;

        return {
            totalRegistros,
            cupoTotal,
            ciudades,
        };
    }, [data, total]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    const formatMoney = (value: number | null) => {
        if (value === null || value === undefined) return "—";

        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(Number(value));
    };

    if (authLoading) {
        return (
            <LoadingScreen message="Cargando asociados..." />
        );
    }

    if (!isAuthorized) return null;

    return (
        <div className="flex flex-col gap-6">

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                    color="border-l-[#012340]"
                    label="Total registros"
                    value={metricas.totalRegistros.toString()}
                    icon={Database}
                />

                <KpiCard
                    color="border-l-[#F29A2E]"
                    label="Filtrados"
                    value={filtered.length.toString()}
                    icon={Users}
                />

                <KpiCard
                    color="border-l-green-600"
                    label="Cupo disponible"
                    value={formatMoney(metricas.cupoTotal)}
                    icon={Wallet}
                />

                <KpiCard
                    color="border-l-purple-600"
                    label="Ciudades"
                    value={metricas.ciudades.toString()}
                    icon={MapPin}
                />
            </div>

            {/* Buscador */}
            <div className="flex flex-wrap items-center justify-between gap-3">

                <div className="relative flex items-center w-full max-w-md">
                    <Search className="absolute left-3 h-4 w-4 text-[#0D0D0D]/40" />

                    <input
                        placeholder="Buscar por cédula, nombre, ciudad..."
                        value={filterQuery}
                        onChange={(e: any) =>
                            setFilterQuery(e.target.value)
                        }
                        className="w-full h-10 border border-[#0D0D0D]/20 pl-9 pr-3 text-sm focus:outline-none focus:border-[#012340]"
                    />
                </div>

                <div className="flex items-center gap-2">

                    {/* Select registros */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#0D0D0D]">
                            Mostrar:
                        </span>

                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-60 min-w-[90px] rounded-none   text-sm font-medium focus:ring-0 ">
                                <SelectValue placeholder="Registros" />
                            </SelectTrigger>

                            <SelectContent className="rounded-none border-[#0D0D0D]/15">
                                <SelectGroup>
                                    <SelectLabel>
                                        Registros
                                    </SelectLabel>

                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <SelectItem
                                            key={size}
                                            value={String(size)}
                                            className="cursor-pointer"
                                        >
                                            {size} filas
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-none border-[#0D0D0D]/20 h-10 px-4 text-xs font-bold tracking-widest hover:bg-[#012340] hover:text-white hover:border-[#012340]"
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${refreshing
                                ? "animate-spin"
                                : ""
                                }`}
                        />

                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white border border-[#0D0D0D]/10">

                <div className="px-4 py-3 border-b border-[#0D0D0D]/10 text-xs font-medium tracking-wider text-[#0D0D0D]/60">
                    Datos asociados{" "}
                    <span className="text-[#0D0D0D]">
                        {pageStart + 1}–
                        {Math.min(pageStart + pageSize, total)} de {total}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">

                        <thead>
                            <tr className="border-b border-[#0D0D0D]/15">
                                {[
                                    "CÉDULA",
                                    "NOMBRE",
                                    "APELLIDO",
                                    "CIUDAD",
                                    "ESTADO CIVIL",
                                    "SALARIO",
                                    "APORTES",
                                    "DEUDA",
                                    "EDAD",
                                    "EMPRESA",
                                    "CUPO",
                                    "ANTIGÜEDAD",
                                ].map((col) => (
                                    <th
                                        key={col}
                                        className="py-4 px-4 text-center text-[11px] font-bold tracking-[0.18em] text-[#F29A2E] uppercase whitespace-nowrap"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <>
                                    {Array.from({
                                        length: pageSize,
                                    }).map((_, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-[#0D0D0D]/5"
                                        >
                                            {Array.from({
                                                length: 12,
                                            }).map((__, j) => (
                                                <td
                                                    key={j}
                                                    className="py-4 px-4"
                                                >
                                                    <div className="h-3.5 bg-[#0D0D0D]/8 rounded animate-pulse mx-auto w-24" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </>
                            ) : error ? (
                                <tr>
                                    <td
                                        colSpan={12}
                                        className="py-10 text-center text-red-600"
                                    >
                                        {error}
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={12}
                                        className="py-10 text-center text-sm text-[#0D0D0D]/40"
                                    >
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-[#0D0D0D]/5 hover:bg-black/[0.015] transition-colors"
                                    >
                                        <td className="py-4 px-4 text-center font-medium">
                                            {row.cedula || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.nombre || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.primer_apellido || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.ciudad || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.estado_civil_norm ||
                                                row.estado_civil ||
                                                "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {formatMoney(row.salario)}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {formatMoney(row.aportes)}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {formatMoney(row.deuda_coopvalili)}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.edad || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.cliente_empresa || "—"}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {formatMoney(row.cuota_disponible)}
                                        </td>

                                        <td className="py-4 px-4 text-center">
                                            {row.antiguedad_laboral || "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && total > 0 && (
                    <Paginator
                        page={safePage}
                        totalPages={totalPages}
                        totalRows={total}
                        pageStart={pageStart}
                        pageSize={pageSize}
                        onChange={setPage}
                    />
                )}
            </div>
        </div>
    );
}

/* ───────────────────────────────────────────── */

function KpiCard({
    color,
    label,
    value,
    icon: Icon,
}: {
    color: string;
    label: string;
    value: string;
    icon?: LucideIcon;
}) {
    return (
        <div
            className={`bg-white border border-[#0D0D0D]/10 border-l-4 ${color} p-4 flex items-center justify-between`}
        >
            <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/50">
                    {label}
                </p>

                <p className="mt-2 text-3xl font-bold text-[#012340]">
                    {value}
                </p>
            </div>

            {Icon && (
                <div className="bg-[#012340]/5 text-[#012340] p-3 rounded-lg">
                    <Icon className="h-6 w-6" />
                </div>
            )}
        </div>
    );
}

function Paginator({
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

    const to = Math.min(
        pageStart + pageSize,
        totalRows,
    );

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#0D0D0D]/10 text-xs text-[#0D0D0D]/60">

            <div>
                Mostrando{" "}
                <span className="font-semibold text-[#0D0D0D]">
                    {from}
                </span>
                –
                <span className="font-semibold text-[#0D0D0D]">
                    {to}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-[#0D0D0D]">
                    {totalRows}
                </span>
            </div>

            <div className="flex items-center gap-1">

                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-[#012340] hover:text-[#012340] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(
                    page,
                    totalPages,
                ).map((item, i) =>
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
                            onClick={() =>
                                onChange(item)
                            }
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
                >
                    <ChevronRight className="h-4 w-4" />
                </button>

            </div>
        </div>
    );
}

function getPageItems(
    current: number,
    total: number,
): (number | "...")[] {

    if (total <= 7) {
        return Array.from(
            { length: total },
            (_, i) => i + 1,
        );
    }

    const items: (number | "...")[] = [1];

    const start = Math.max(
        2,
        current - 1,
    );

    const end = Math.min(
        total - 1,
        current + 1,
    );

    if (start > 2) {
        items.push("...");
    }

    for (let i = start; i <= end; i++) {
        items.push(i);
    }

    if (end < total - 1) {
        items.push("...");
    }

    items.push(total);

    return items;
}