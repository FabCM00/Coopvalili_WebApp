"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import type { Profile } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  X,
  Loader2,
  Search,
  RefreshCw,
  Plus,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Clock,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useNotification } from "@/contexts/NotificationContext";

const PAGE_SIZE = 10;

type UserRow = Profile & { passwordSet?: boolean };

export default function AdminUsuariosPage() {
  const { isAuthorized, loading: authLoading } = useProtectedRoute({
    allowedRoles: ["admin"],
  });

  const qc = useQueryClient();
  const { notify, confirm } = useNotification();

  const [filterQuery, setFilterQuery] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const {
    data: usersData = [],
    isLoading: loadingUsers,
    isFetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      const json = await res.json().catch(() => ({ ok: false, data: [] }));
      if (!json.ok) throw new Error("No se pudieron cargar los usuarios.");
      return json.data as UserRow[];
    },
    enabled: isAuthorized,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) throw new Error("Error al actualizar el estado.");
      return { id, active };
    },
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<UserRow[]>(["admin", "users"]);
      qc.setQueryData<UserRow[]>(["admin", "users"], (old = []) =>
        old.map((u) => (u.id === id ? { ...u, estado: active } : u)),
      );
      return { prev };
    },
    onError: (e: Error, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
      notify({ type: "error", message: e.message });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json?.message ?? "Error al invitar.");
      }
      return json as { message?: string };
    },
    onSuccess: (json, email) => {
      notify({ type: "success", message: json.message ?? `Invitación enviada a ${email}` });
      setInviteEmail("");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => {
      notify({ type: "error", message: e.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok)
        throw new Error(json?.message ?? "Error al eliminar.");
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<UserRow[]>(["admin", "users"], (old = []) =>
        old.filter((u) => u.id !== id),
      );
      notify({ type: "success", message: "Usuario eliminado correctamente." });
    },
    onError: (e: Error) => {
      notify({ type: "error", message: e.message });
    },
  });

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filterQuery, usersData]);

  const metricas = useMemo(() => {
    const total = usersData.length;
    const activos = usersData.filter((u) => u.estado === true).length;
    const pendientes = usersData.filter(
      (u) => !u.estado && u.passwordSet === false,
    ).length;
    const inactivos = usersData.filter(
      (u) => !u.estado && u.passwordSet !== false,
    ).length;
    return { total, activos, pendientes, inactivos };
  }, [usersData]);

  const handleRefresh = () => refetch();

  const handleToggleActivo = (user: UserRow) => {
    toggleMutation.mutate({ id: user.id, active: !user.estado });
  };

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    inviteMutation.mutate(inviteEmail);
  };

  const handleDelete = async (user: UserRow) => {
    const ok = await confirm({
      type: "warning",
      title: "Eliminar usuario",
      message: `¿Confirmas que deseas eliminar a ${user.username || user.email} permanentemente? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      confirmTone: "danger",
    });
    if (!ok) return;
    deleteMutation.mutate(user.id);
  };

  if (authLoading)
    return <LoadingScreen message="Cargando módulo de usuarios..." />;
  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          color="border-l-[#012340]"
          label="Total"
          value={metricas.total.toString()}
          icon={UsersIcon}
        />
        <KpiCard
          color="border-l-green-500"
          label="Activos"
          value={metricas.activos.toString()}
          icon={UserCheck}
        />
        <KpiCard
          color="border-l-amber-400"
          label="Pendientes"
          value={metricas.pendientes.toString()}
          icon={Clock}
        />
        <KpiCard
          color="border-l-red-500"
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
              setInviteEmail("");
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
                {[
                  "USUARIO",
                  "CORREO",
                  "ROL",
                  "ESTADO",
                  "FECHA CREADO",
                  "ACCIONES",
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
              {loadingUsers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#0D0D0D]/5">
                    {[112, 176, 80, 80, 112, 96].map((w, j) => (
                      <td key={j} className="py-4 px-4">
                        <div
                          className="h-3.5 bg-[#0D0D0D]/8 rounded animate-pulse mx-auto"
                          style={{ width: w }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-[#0D0D0D]/40"
                  >
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                pageRows.map((user) => {
                  const isToggling =
                    toggleMutation.isPending &&
                    toggleMutation.variables?.id === user.id;
                  return (
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
                        {(() => {
                          const label = user.estado
                            ? "Activo"
                            : user.passwordSet === false
                              ? "Pendiente"
                              : "Inactivo";
                          const dot = user.estado
                            ? "bg-green-500"
                            : user.passwordSet === false
                              ? "bg-amber-400"
                              : "bg-red-500";
                          const text = user.estado
                            ? "text-[#0D0D0D]"
                            : user.passwordSet === false
                              ? "text-amber-600"
                              : "text-red-600";
                          return (
                            <span className="inline-flex items-center gap-2 text-xs">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${dot}`}
                              />
                              <span className={text}>{label}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4 text-center text-[#0D0D0D]/70">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString(
                            "es-CO",
                          )
                          : "—"}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleToggleActivo(user)}
                            disabled={isToggling}
                            title={user.estado ? "Desactivar usuario" : "Activar usuario"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${user.estado
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-green-200 text-green-700 hover:bg-green-50"
                              }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : user.estado ? (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ToggleRight className="h-3.5 w-3.5" />
                            )}
                            {user.estado ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            title="Eliminar usuario"
                            className="inline-flex items-center justify-center h-[30px] w-[30px] border border-[#0D0D0D]/15 text-[#0D0D0D]/40 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modal de Invitar Usuario */}
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
              Se enviará un correo de invitación para que el usuario cree su
              contraseña.
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
                  disabled={inviteMutation.isPending}
                  className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white px-8 tracking-widest text-xs font-bold"
                >
                  {inviteMutation.isPending ? (
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


import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Paginator } from "@/components/ui/paginator";

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

