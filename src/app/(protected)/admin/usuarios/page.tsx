"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { profiles, supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    X,
    Loader2,
    Search,
    RefreshCw,
    Plus,
    ChevronLeft,
    ChevronRight,
    Users as UsersIcon,
    UserCheck,
    UserX,
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

const PAGE_SIZE = 10;

export default function AdminUsuariosPage() {
    const { isAuthorized, loading: authLoading } = useProtectedRoute({
        allowedRoles: ["admin"],
    });

    const [usersData, setUsersData] = useState<Profile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterQuery, setFilterQuery] = useState("");
    const [page, setPage] = useState(1);

    // Modal estado
    const [modalOpen, setModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<{
        ok: boolean;
        msg: string;
    } | null>(null);

    const fetchUsers = useCallback(async () => {
        const r = await profiles.listProfiles({
            excludeRole: "admin",
            orderBy: { column: "created_at", ascending: false },
        });
        if (r.ok) setUsersData(r.data);
    }, []);

    useEffect(() => {
        if (!isAuthorized) return;
        setLoadingUsers(true);
        fetchUsers().finally(() => setLoadingUsers(false));
    }, [isAuthorized, fetchUsers]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    const filtered = useMemo(() => {
        if (!filterQuery.trim()) return usersData;
        const q = filterQuery.toLowerCase();
        return usersData.filter((u) =>
            [u.username, u.email, u.role].some((v) =>
                String(v ?? "")
                    .toLowerCase()
                    .includes(q),
            ),
        );
    }, [usersData, filterQuery]);

    // Paginación
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [filterQuery, usersData]);

    // KPIs
    const metricas = useMemo(() => {
        const total = usersData.length;
        const activos = usersData.filter((u) => u.estado !== false).length;
        const inactivos = total - activos;
        return { total, activos, inactivos };
    }, [usersData]);

    if (authLoading)
        return <LoadingScreen message="Cargando módulo de usuarios..." />;
    if (!isAuthorized) return null;

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        setInviting(true);
        setInviteStatus(null);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const res = await fetch("/api/invite-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token && {
                        Authorization: `Bearer ${session.access_token}`,
                    }),
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    username: inviteUsername.trim() || undefined,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.ok) {
                throw new Error(
                    json?.message ?? "Error al invitar.",
                );
            }

            setInviteStatus({
                ok: true,
                msg:
                    json.message ||
                    `Invitación enviada a ${inviteEmail}`,
            });

            setInviteEmail("");
            setInviteUsername("");

            setTimeout(() => {
                fetchUsers();
            }, 1000);

        } catch (err: any) {
            setInviteStatus({
                ok: false,
                msg: err.message,
            });
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    color="border-l-[#012340]"
                    label="Total de usuarios"
                    value={metricas.total.toString()}
                    icon={UsersIcon}
                />
                <KpiCard
                    color="border-l-[#F29A2E]"
                    label="Activos"
                    value={metricas.activos.toString()}
                    icon={UserCheck}
                />
                <KpiCard
                    color="border-l-[#0D0D0D]/30"
                    label="Inactivos"
                    value={metricas.inactivos.toString()}
                    icon={UserX}
                />
            </div>

            {/* Buscador + acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex items-center w-full max-w-md">
                    <Search className="absolute left-3 h-4 w-4 text-[#0D0D0D]/40" />
                    <Input
                        placeholder="Buscar por usuario, correo o rol..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="rounded-none border-[#0D0D0D]/20 pl-9 focus-visible:ring-0 focus-visible:border-[#012340] h-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-none border-[#0D0D0D]/20 h-10 px-4 text-xs font-bold tracking-widest hover:bg-[#012340] hover:text-white hover:border-[#012340]"
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />
                        Actualizar
                    </Button>
                    <Button
                        onClick={() => {
                            setModalOpen(true);
                            setInviteStatus(null);
                            setInviteEmail("");
                            setInviteUsername("");
                        }}
                        className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-10 px-4 text-xs font-bold tracking-widest"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear usuario
                    </Button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white border border-[#0D0D0D]/10">
                <div className="px-4 py-3 border-b border-[#0D0D0D]/10 text-xs font-medium tracking-wider text-[#0D0D0D]/60">
                    Usuarios{" "}
                    <span className="text-[#0D0D0D]">
                        {filtered.length} de {usersData.length}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#0D0D0D]/15">
                                {["USUARIO", "CORREO", "ROL", "ESTADO", "FECHA CREADO"].map(
                                    (col) => (
                                        <th
                                            key={col}
                                            className="py-4 px-4 text-center text-[11px] font-bold tracking-[0.18em] text-[#F29A2E] uppercase whitespace-nowrap"
                                        >
                                            {col}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loadingUsers ? (
                                <>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-[#0D0D0D]/5">
                                            {[112, 176, 80, 80, 112].map((w, j) => (
                                                <td key={j} className="py-4 px-4">
                                                    <div
                                                        className="h-3.5 bg-[#0D0D0D]/8 rounded animate-pulse mx-auto"
                                                        style={{ width: w }}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-10 text-center text-sm text-[#0D0D0D]/40"
                                    >
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                pageRows.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-[#0D0D0D]/5 hover:bg-black/[0.015] transition-colors"
                                    >
                                        <td className="py-4 px-4 text-center text-[#0D0D0D] font-medium">
                                            {user.username || "—"}
                                        </td>
                                        <td className="py-4 px-4 text-center text-[#0D0D0D]/70 truncate">
                                            {user.email || "—"}
                                        </td>
                                        <td className="py-4 px-4 text-center text-[#0D0D0D]/80">
                                            {user.role === "admin" ? "Administrador" : "Usuario"}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="inline-flex items-center gap-2 text-xs">
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${user.estado !== false
                                                        ? "bg-green-500"
                                                        : "bg-red-500"
                                                        }`}
                                                />
                                                <span
                                                    className={
                                                        user.estado !== false
                                                            ? "text-[#0D0D0D]"
                                                            : "text-red-600"
                                                    }
                                                >
                                                    {user.estado !== false
                                                        ? "Activo"
                                                        : "Inactivo"}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center text-[#0D0D0D]/70">
                                            {user.created_at
                                                ? new Date(
                                                    user.created_at,
                                                ).toLocaleDateString("es-CO")
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loadingUsers && filtered.length > 0 && (
                    <Paginator
                        page={safePage}
                        totalPages={totalPages}
                        totalRows={filtered.length}
                        pageStart={pageStart}
                        pageSize={PAGE_SIZE}
                        onChange={setPage}
                    />
                )}
            </div>

            {/* Modal de Crear / Invitar Usuario */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="relative w-full max-w-md bg-white shadow-2xl p-8">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 text-[#0D0D0D]/40 hover:text-[#0D0D0D] transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-lg font-bold text-[#012340] mb-1">
                            Crear Usuario
                        </h3>
                        <p className="text-sm text-[#0D0D0D]/50 mb-6">
                            Se enviará un correo de invitación para que el usuario
                            cree su contraseña.
                        </p>

                        <form onSubmit={handleInvite} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[#0D0D0D]/60 uppercase tracking-wider">
                                    Correo electrónico
                                </label>
                                <Input
                                    type="email"
                                    placeholder="usuario@empresa.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                    className="rounded-none border-[#0D0D0D]/20 focus-visible:border-[#012340] focus-visible:ring-0"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[#0D0D0D]/60 uppercase tracking-wider">
                                    Nombre de usuario <span className="font-normal normal-case">(opcional)</span>
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Se deriva del correo si se deja vacío"
                                    value={inviteUsername}
                                    onChange={(e) => setInviteUsername(e.target.value)}
                                    className="rounded-none border-[#0D0D0D]/20 focus-visible:border-[#012340] focus-visible:ring-0"
                                />
                            </div>

                            {inviteStatus && (
                                <p
                                    className={`text-sm font-medium ${inviteStatus.ok
                                        ? "text-green-700"
                                        : "text-red-600"
                                        }`}
                                >
                                    {inviteStatus.msg}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setModalOpen(false)}
                                    className="text-[#0D0D0D]/60 hover:text-[#0D0D0D]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={inviting}
                                    className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white px-8 tracking-widest text-xs font-bold"
                                >
                                    {inviting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                            Enviando...
                                        </>
                                    ) : (
                                        "ENVIAR INVITACIÓN"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

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
                <p className="mt-2 text-3xl font-bold text-[#012340]">{value}</p>
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
    const to = Math.min(pageStart + pageSize, totalRows);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#0D0D0D]/10 text-xs text-[#0D0D0D]/60">
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
                            onClick={() => onChange(item)}
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