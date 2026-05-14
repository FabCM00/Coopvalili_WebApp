"use client";

import Link from "next/link";
import { ExternalLink, Monitor, Building2, CheckCircle2, XCircle } from "lucide-react";
import { entities } from "@/app/config/entities";
import { cn } from "@/lib/utils";

export function DashboardView() {
    const total = entities.length;
    const activas = entities.filter((e) => e.status === "active").length;
    const inactivas = total - activas;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[#012340]">Panel de entidades</h2>
                <p className="text-sm text-[#0D0D0D]/50 mt-0.5">
                    Gestiona y accede a cada aplicación desde aquí
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#0D0D0D]/8 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#012340]/8">
                            <Building2 className="h-4.5 w-4.5 text-[#012340]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D]/40">
                                Total entidades
                            </p>
                            <p className="text-2xl font-bold text-[#012340]">{total}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[#0D0D0D]/8 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D]/40">
                                Activas
                            </p>
                            <p className="text-2xl font-bold text-emerald-600">{activas}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[#0D0D0D]/8 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                            <XCircle className="h-4.5 w-4.5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D]/40">
                                Inactivas
                            </p>
                            <p className="text-2xl font-bold text-red-500">{inactivas}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Entity cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entities.map((entity) => (
                    <div
                        key={entity.slug}
                        className="rounded-xl border border-[#0D0D0D]/8 bg-white overflow-hidden"
                    >
                        {/* Color accent bar */}
                        <div
                            className="h-1.5 w-full"
                            style={{ backgroundColor: entity.color }}
                        />

                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-[#012340]">{entity.name}</h3>
                                    <p className="text-sm text-[#0D0D0D]/50 mt-0.5 leading-snug">
                                        {entity.description}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                        entity.status === "active"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-red-50 text-red-500",
                                    )}
                                >
                                    {entity.status === "active" ? "Activa" : "Inactiva"}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-[#0D0D0D]/6">
                                {/* Ver webapp embebida */}
                                <Link
                                    href={`/entidades/${entity.slug}`}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#012340] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-[#012340]/85"
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    Ver en portal
                                </Link>

                                {/* Abrir en nueva pestaña */}
                                {entity.url && (
                                    <a
                                        href={entity.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center rounded-lg border border-[#0D0D0D]/12 px-3 py-2 text-[#0D0D0D]/50 transition hover:bg-[#0D0D0D]/4 hover:text-[#0D0D0D]/70"
                                        title="Abrir en nueva pestaña"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
