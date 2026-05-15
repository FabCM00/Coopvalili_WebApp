"use client";

import React, { useState, useCallback, useMemo, type ReactNode } from "react";
import Editor from "@monaco-editor/react";
import { type SolicitudUI } from "@/lib/supabase";
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Check,
    X,
    Database,
    Cpu,
    ShieldCheck,
    FileJson,
    ClipboardList,
    ChevronRight,
    Search,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined): string {
    if (v === null || v === undefined || v === "") return "—";
    const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
    if (!isNaN(n) && isFinite(n) && n > 1000) {
        return "$" + new Intl.NumberFormat("es-CO").format(Math.round(n));
    }
    return String(v);
}

function parseIfString(v: any): any {
    if (typeof v === "string") {
        const t = v.trim();
        if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
            try { return JSON.parse(t); } catch { /* */ }
        }
    }
    return v;
}

function deepParse(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    const parsed = parseIfString(obj);
    if (typeof parsed !== "object") return parsed;
    if (Array.isArray(parsed)) return parsed.map(deepParse);
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(parsed)) out[k] = deepParse(v);
    return out;
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2 px-1">
                {title}
            </p>
            <div className="border border-[#0D0D0D]/8 divide-y divide-[#0D0D0D]/6 bg-white">
                {children}
            </div>
        </div>
    );
}

function InfoRow({
    label, value, mono, currency, highlight,
}: {
    label: string; value: string | number | null | undefined;
    mono?: boolean; currency?: boolean; highlight?: boolean;
}) {
    if (value === null || value === undefined || value === "") return null;
    const display = currency ? fmt(value) : String(value);
    return (
        <div className="flex items-center justify-between gap-6 px-4 py-2.5">
            <span className="text-xs text-[#0D0D0D]/45 flex-shrink-0">{label}</span>
            <span className={`text-xs text-right break-all leading-relaxed ${highlight ? "font-bold text-[#012340]" : mono ? "font-mono text-[#0D0D0D]/65" : "font-medium text-[#0D0D0D]/80"}`}>
                {display}
            </span>
        </div>
    );
}

function CriterioRow({ label, value }: { label: string; value: number | null | undefined }) {
    if (value === 1) return (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-xs text-[#0D0D0D]/60">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-green-600/50 font-mono">1</span>
                <span className="text-[11px] font-semibold text-green-600">Cumple</span>
            </div>
        </div>
    );
    if (value === 2 || value === 0) return (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-red-50/60">
            <div className="flex items-center gap-2.5">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-[#0D0D0D]/60">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-red-500/50 font-mono">{value}</span>
                <span className="text-[11px] font-semibold text-red-600">No cumple</span>
            </div>
        </div>
    );
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
                <MinusCircle className="h-4 w-4 text-[#0D0D0D]/20 flex-shrink-0" />
                <span className="text-xs text-[#0D0D0D]/40">{label}</span>
            </div>
            <span className="text-[11px] text-[#0D0D0D]/25">—</span>
        </div>
    );
}

function CriteriaSummary({ values }: { values: (number | null | undefined)[] }) {
    const validValues = values.filter(v => v !== null && v !== undefined);
    const cumple = validValues.filter(v => v === 1).length;
    const noCumple = validValues.filter(v => v === 2 || v === 0).length;
    const total = cumple + noCumple;
    if (total === 0) return null;
    const pct = Math.round((cumple / total) * 100);
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0D0D0D]/[0.02] border-b border-[#0D0D0D]/6">
            <div className="flex-1 h-1.5 bg-[#0D0D0D]/8 overflow-hidden">
                <div className={`h-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-[#0D0D0D]/50 flex-shrink-0">{cumple}/{total} cumplen</span>
        </div>
    );
}

function normBool(v: number | null | undefined): 1 | 2 | null {
    if (v === 1) return 1;
    if (v === 0) return 2;
    return null;
}

export function ResumenSolicitud({ solicitud }: { solicitud: SolicitudUI }) {
    const v1 = solicitud.raw.valida1;
    const mp = solicitud.raw.motor_process;
    const md = solicitud.raw.motor_data;
    const iv = solicitud.raw.identity_validation;
    const cd = solicitud.raw.credito_decision;
    const opcionElegidaId = cd?.opcion_elegida === "B1" ? 1 : cd?.opcion_elegida === "B2" ? 2 : cd?.opcion_elegida === "B3" ? 3 : null;

    return (
        <div className="p-4 flex flex-col gap-5">
            {solicitud.sinMotor && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3 py-3 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <span>Sin registro en <span className="font-mono font-semibold">motor_process_results</span>. Solo se muestran datos de la validación inicial.</span>
                </div>
            )}
            <Section title="Solicitante">
                <InfoRow label="Nombre" value={solicitud.solicitante} highlight />
                <InfoRow label="Cédula" value={solicitud.cedula} mono />
                {md?.edad != null && <InfoRow label="Edad" value={`${md.edad} años`} />}
                {md?.antiguedad_laboral != null && <InfoRow label="Antigüedad Laboral" value={`${md.antiguedad_laboral} meses`} />}
                <InfoRow label="Celular" value={v1.celular ?? v1.telefono} mono />
                <InfoRow label="Email" value={v1.email} mono />
                <InfoRow label="Fecha" value={solicitud.fecha} />
            </Section>

            <Section title="Solicitud">
                <InfoRow label="Monto solicitado" value={md?.monto_solicitado} currency highlight />
                <InfoRow label="Monto definitivo" value={mp?.monto_definitivo} currency highlight />
                <InfoRow label="Línea de crédito" value={md?.linea_credito} />
                {md && <>
                    <InfoRow label="Salario" value={md.salario} currency />
                    <InfoRow label="Egresos volante" value={md.egresos_volante} currency />
                    <InfoRow label="Deuda cooperativa" value={md.deuda_coopvalili} currency />
                </>}
            </Section>

            {mp && (
                <Section title="Análisis del motor">
                    <InfoRow label="Ingresos" value={mp.ingresos} currency />
                    <InfoRow label="Egresos" value={mp.egresos} currency />
                    <InfoRow label="Mínimo vital" value={mp.minimo_vital} currency />
                    <InfoRow label="Solvencia" value={mp.solvencia} currency />
                    <InfoRow label="Desprotegido" value={mp.desprotegido} currency />
                    <InfoRow label="Disponible" value={mp.disponible} currency />
                    <InfoRow label="Endeudamiento actual" value={mp.endeudamiento_actual} currency />
                    <InfoRow label="Endeudamiento proyectado" value={mp.endeudamiento_proyectado} currency />
                </Section>
            )}

            {mp && (mp.monto_credito_b1 != null || mp.monto_credito_b2 != null || mp.monto_credito_b3 != null) && (
                <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2 px-1">
                        Opciones de Crédito (Escenarios)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 1, cumple: mp.cumple_4_criterios_b1, monto: mp.monto_credito_b1, cap: mp.cuota_b1 },
                            { id: 2, cumple: mp.cumple_4_criterios_b2, monto: mp.monto_credito_b2, cap: mp.cuota_b2 },
                            { id: 3, cumple: mp.cumple_4_criterios_b3, monto: mp.monto_credito_b3, cap: mp.cuota_b3 },
                        ]
                            .filter((opt) => opt.monto != null || opt.cap != null || opt.cumple != null)
                            .map((opt) => {
                                const isViable = opt.cumple === 1;
                                const isElegida = opt.id === opcionElegidaId;
                                return (
                                    <div key={opt.id} className={`flex flex-col border rounded-sm overflow-hidden ${isElegida ? "border-[#012340] ring-1 ring-[#012340]/30" : isViable ? "border-green-200 bg-green-50/30" : "border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.02] opacity-80"}`}>
                                        <div className={`flex flex-wrap gap-1 items-center justify-between px-3 py-2 border-b ${isElegida ? "bg-[#012340] border-[#012340]" : isViable ? "bg-green-100/50 border-green-200" : "bg-[#0D0D0D]/[0.04] border-[#0D0D0D]/10"}`}>
                                            <span className={`text-[11px] font-bold ${isElegida ? "text-white" : isViable ? "text-green-800" : "text-[#0D0D0D]/50"}`}>
                                                Opción {opt.id}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {isElegida && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide bg-white/25 text-white">
                                                        Elegida
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${isElegida ? "bg-white/15 text-white/80" : isViable ? "bg-green-500 text-white" : "bg-[#0D0D0D]/15 text-[#0D0D0D]/60"}`}>
                                                    {isViable ? "Viable" : "No viable"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 p-3">
                                            <div>
                                                <p className="text-[10px] text-[#0D0D0D]/40 mb-0.5">Monto Crédito</p>
                                                <p className={`text-sm font-bold truncate ${isElegida ? "text-[#012340]" : isViable ? "text-green-900" : "text-[#0D0D0D]/70"}`}>{fmt(opt.monto)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-[#0D0D0D]/40 mb-0.5">Cuota</p>
                                                <p className="text-xs font-medium text-[#0D0D0D]/70 truncate">{fmt(opt.cap)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                    {cd && (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2.5 bg-[#012340]/[0.04] border border-[#012340]/15">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#012340]/50">Opción elegida por el usuario</span>
                            <span className="text-[11px] font-bold text-[#012340] font-mono">{cd.opcion_elegida}</span>
                            <span className="ml-auto text-[10px] text-[#0D0D0D]/35 font-mono">{cd.created_at.slice(0, 10)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Valida 1 ─────────────────────────────────────────── */}
            <Section title="Valida 1 — Criterios del cliente">
                <CriteriaSummary values={[v1.valida1, v1.valida_edad, v1.valida_activo, v1.valida_asociado, v1.valida_no_retirado]} />
                <CriterioRow label="Valida 1 (Inicial)" value={v1.valida1} />
                <CriterioRow label="Validación Edad" value={v1.valida_edad} />
                <CriterioRow label="Validación Activo" value={v1.valida_activo} />
                <CriterioRow label="Validación Asociado" value={v1.valida_asociado} />
                <CriterioRow label="Validación No Retirado" value={v1.valida_no_retirado} />
            </Section>

            {/* ── Identidad ─────────────────────────────────────────── */}
            <Section title="Identidad — Validación documental y facial">
                {iv ? (
                    <>
                        <CriteriaSummary values={[normBool(iv.status_document), normBool(iv.status_face), normBool(iv.estado_validacion)]} />
                        <CriterioRow label="Estado Documento" value={normBool(iv.status_document)} />
                        <CriterioRow label="Estado Facial" value={normBool(iv.status_face)} />
                        <CriterioRow label="Estado General" value={normBool(iv.estado_validacion)} />
                    </>
                ) : (
                    <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">Sin datos de validación de identidad.</p>
                )}
            </Section>

            {/* ── Motor de crédito ──────────────────────────────────── */}
            <Section title="Motor de crédito — Política de crédito">
                {mp ? (
                    <>
                        <CriteriaSummary values={[mp.cumple_end, mp.cumple_sol, mp.cumple_disp, mp.cumple_des, mp.cumplimiento_4_criterios]} />
                        <CriterioRow label="Cumple Endeudamiento" value={mp.cumple_end} />
                        <CriterioRow label="Cumple Solvencia" value={mp.cumple_sol} />
                        <CriterioRow label="Cumple Disponible" value={mp.cumple_disp} />
                        <CriterioRow label="Cumple Desprotegido" value={mp.cumple_des} />
                        <CriterioRow label="Cumplimiento 4 Criterios" value={mp.cumplimiento_4_criterios} />
                    </>
                ) : (
                    <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">No se ha procesado el motor para esta solicitud.</p>
                )}
            </Section>

            {/* ── Servicio externo ──────────────────────────────────── */}
            <Section title="Servicio externo — CoproCenva">
                <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">Sin datos de envío a CoproCenva.</p>
            </Section>

            {/* ── Motivos no apto ───────────────────────────────────── */}
            <Section title="Motivos no apto">
                {v1.mensaje && v1.valida1 !== 1 ? (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 leading-relaxed">{v1.mensaje}</p>
                    </div>
                ) : (
                    <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">Sin motivos de rechazo registrados.</p>
                )}
            </Section>
        </div>
    );
}

// ─── JSON Viewer (Monaco) ─────────────────────────────────────────────────────

interface JsonViewProps {
    data: any;
    label?: string;
    hideExpand?: boolean;
    isAudit?: boolean;
}

export function JsonView({ data }: JsonViewProps) {
    const parsed = useMemo(() => deepParse(data), [data]);
    const formatted = useMemo(() => {
        try { return JSON.stringify(parsed, null, 2); } catch { return ""; }
    }, [parsed]);

    if (data === null || data === undefined)
        return <div className="p-5 text-sm text-slate-400 italic">No hay datos.</div>;

    return (
        <div className="flex flex-col h-full bg-white relative">
            <style>{`
                .monaco-editor .find-widget.visible {
                    top: 30px !important;
                    right: 30px !important;
                }
            `}</style>
            <div className="flex-1 min-h-[300px] overflow-hidden">
                <Editor

                    height="100%"
                    language="json"
                    value={formatted}
                    theme="light"
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 10,
                        fontFamily: "Consolas, 'Courier New', monospace",
                        wordWrap: "on",
                        renderLineHighlight: "none",
                        lineNumbersMinChars: 5,
                        folding: true,
                        padding: { top: 16, bottom: 16 },
                        contextmenu: false,
                    }}
                    loading={
                        <div className="p-4 text-xs text-slate-400 font-mono">Cargando editor...</div>
                    }
                />
            </div>
        </div>
    );
}

// ─── Motor JSON View — Multi-panel ────────────────────────────────────────────

type MotorJsonPanel = "valida1" | "motor_data" | "motor_process" | "identity" | "auditoria";

const MOTOR_JSON_PANELS = [
    { id: "valida1" as MotorJsonPanel, shortLabel: "Validación", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: "motor_data" as MotorJsonPanel, shortLabel: "Motor Data", icon: <Database className="h-3.5 w-3.5" /> },
    { id: "motor_process" as MotorJsonPanel, shortLabel: "Motor Process", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "identity" as MotorJsonPanel, shortLabel: "Identity", icon: <FileJson className="h-3.5 w-3.5" /> },
    { id: "auditoria" as MotorJsonPanel, shortLabel: "Auditoría", icon: <ClipboardList className="h-3.5 w-3.5" /> },
] as const;

function buildAuditoriaResumen(solicitud: SolicitudUI): Record<string, any> {
    const v1 = solicitud.raw.valida1;
    const mp = solicitud.raw.motor_process;
    return {
        meta: {
            generado_en: new Date().toISOString(),
            radicado: solicitud.radicado,
            cedula: solicitud.cedula,
            solicitante: solicitud.solicitante,
            fecha_solicitud: solicitud.fecha,
        },
        decision: {
            estado: solicitud.estado,
            decision_texto: solicitud.decisionTexto,
            decision_final: mp?.concepto_definitivo ?? null,
            sin_motor: solicitud.sinMotor,
            score_cifin: solicitud.score,
        },
        solicitud: {
            valor_solicitado: solicitud.valor,
            monto_definitivo: mp?.monto_definitivo ?? null,
        },
        validaciones_iniciales: {
            valida1: v1.valida1,
            valida_activo: v1.valida_activo,
            valida_edad: v1.valida_edad,
            valida_asociado: v1.valida_asociado,
            valida_no_retirado: v1.valida_no_retirado,
            mensaje: v1.mensaje ?? null,
        },
        criterios_motor: mp ? {
            cumple_end: mp.cumple_end,
            cumple_sol: mp.cumple_sol,
            cumple_disp: mp.cumple_disp,
            cumple_des: mp.cumple_des,
            cumplimiento_4_criterios: mp.cumplimiento_4_criterios,
            solvencia: mp.solvencia,
            disponible: mp.disponible,
            desprotegido: mp.desprotegido,
        } : null,
        decision_usuario: solicitud.raw.credito_decision ? {
            opcion_elegida: solicitud.raw.credito_decision.opcion_elegida,
            registrado_en: solicitud.raw.credito_decision.created_at,
            response: solicitud.raw.credito_decision.response ?? null,
        } : null,
    };
}

export function MotorJsonView({ solicitud, hideExpand }: { solicitud: SolicitudUI; hideExpand?: boolean }) {
    const [activePanel, setActivePanel] = useState<MotorJsonPanel>("motor_process");

    const getPanelData = (panel: MotorJsonPanel): any => {
        switch (panel) {
            case "valida1": return solicitud.raw.valida1;
            case "motor_data": return solicitud.raw.motor_data;
            case "motor_process": return solicitud.raw.motor_process;
            case "identity": return solicitud.raw.identity_validation;
            case "auditoria": return buildAuditoriaResumen(solicitud);
        }
    };

    const activeDef = MOTOR_JSON_PANELS.find(p => p.id === activePanel)!;
    const activeData = getPanelData(activePanel);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 overflow-x-auto">
                <div className="flex min-w-max">
                    {MOTOR_JSON_PANELS.map(panel => {
                        const isActive = activePanel === panel.id;
                        const hasData = getPanelData(panel.id) != null;
                        const isAudit = panel.id === "auditoria";
                        return (
                            <button
                                key={panel.id}
                                onClick={() => setActivePanel(panel.id)}
                                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0
                                    ${isActive
                                        ? "bg-white text-[#012340]"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white/70"
                                    }`}
                            >
                                <span className={`flex-shrink-0 transition-colors ${isActive ? isAudit ? "text-emerald-600" : "text-[#012340]" : "text-slate-300"}`}>
                                    {panel.icon}
                                </span>
                                <span>{panel.shortLabel}</span>
                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${hasData ? isAudit ? "bg-emerald-500" : "bg-[#012340]/35" : "bg-slate-200"}`} />
                                {isActive && <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${isAudit ? "bg-emerald-500" : "bg-[#012340]"}`} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] bg-white">
                {activeData == null ? (
                    <div className="p-5">
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="mt-1 text-xs">No existe un registro asociado a este radicado.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <JsonView data={activeData} hideExpand={hideExpand} isAudit={activePanel === "auditoria"} />
                )}
            </div>
        </div>
    );
}
