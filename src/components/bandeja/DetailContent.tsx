"use client";

import React, { useState, useCallback, useMemo, type ReactNode } from "react";
import Editor from "@monaco-editor/react";
import { type SolicitudUI } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Check,
  X,
  Copy,
  Database,
  Cpu,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Search,
  ScanFace,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SolicitanteHeader, type CambioEstadoControl } from "./ModalHeader";
import { LoadingScreen } from "@/components/LoadingScreen";

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
    if (
      (t.startsWith("{") && t.endsWith("}")) ||
      (t.startsWith("[") && t.endsWith("]"))
    ) {
      try {
        return JSON.parse(t);
      } catch {
        /* */
      }
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

function GridField({
  label,
  value,
  mono,
  currency,
  highlight,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  currency?: boolean;
  highlight?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  const display = currency ? fmt(value) : String(value);
  return (
    <div className="min-w-0 bg-white px-4 py-3">
      <p className="text-[9px] font-bold tracking-wider uppercase text-[#0D0D0D]/40">
        {label}
      </p>
      <p
        className={`truncate text-sm ${highlight ? "font-bold text-[#012340]" : mono ? "font-mono text-[#0D0D0D]/70" : "font-medium text-[#0D0D0D]/85"}`}
      >
        {display}
      </p>
    </div>
  );
}

function GridSection({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip?: string;
  children: ReactNode;
}) {
  const fields = React.Children.toArray(children).filter(Boolean);
  const isOdd = fields.length % 2 === 1;
  return (
    <div className="border border-[#0D0D0D]/8 bg-white pt-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-3 px-4">
        {title}
        {tooltip && (
          <span title={tooltip} className="inline-flex flex-shrink-0">
            <Info className="h-3 w-3 text-[#0D0D0D]/30" />
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-px bg-[#0D0D0D]/8">
        {fields}
        {isOdd && <div className="" />}
      </div>
    </div>
  );
}

function CriterioRow({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  if (value === 1)
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-xs text-[#0D0D0D]/60">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-green-600/50 font-mono">
            1
          </span>
          <span className="text-[11px] font-semibold text-green-600">
            Cumple
          </span>
        </div>
      </div>
    );
  if (value === 2 || value === 0)
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-red-50/60">
        <div className="flex items-center gap-2.5">
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-[#0D0D0D]/60">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-red-500/50 font-mono">
            {value}
          </span>
          <span className="text-[11px] font-semibold text-red-600">
            No cumple
          </span>
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

function CriteriaSummary({
  values,
}: {
  values: (number | null | undefined)[];
}) {
  const validValues = values.filter((v) => v !== null && v !== undefined);
  const cumple = validValues.filter((v) => v === 1).length;
  const noCumple = validValues.filter((v) => v === 2 || v === 0).length;
  const total = cumple + noCumple;
  if (total === 0) return null;
  const pct = Math.round((cumple / total) * 100);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0D0D0D]/[0.02] border-b border-[#0D0D0D]/6">
      <div className="flex-1 h-1.5 bg-[#0D0D0D]/8 overflow-hidden">
        <div
          className={`h-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-[#0D0D0D]/50 flex-shrink-0">
        {cumple}/{total} cumplen
      </span>
    </div>
  );
}

function normBool(v: string | number | null | undefined): 1 | 2 | null {
  if (
    v === 1 ||
    v === "1" ||
    String(v).toLowerCase() === "true" ||
    String(v).toLowerCase() === "aprobado" ||
    String(v).toLowerCase() === "success"
  )
    return 1;
  if (
    v === 0 ||
    v === "0" ||
    String(v).toLowerCase() === "false" ||
    String(v).toLowerCase() === "rechazado" ||
    String(v).toLowerCase() === "failed"
  )
    return 2;
  return null;
}

export function ResumenSolicitud({
  solicitud,
  cambioEstado,
}: {
  solicitud: SolicitudUI;
  cambioEstado?: CambioEstadoControl;
}) {
  const v1 = solicitud.raw.valida1;
  const mp = solicitud.raw.motor_process;
  const md = solicitud.raw.motor_data;
  const iv = solicitud.raw.identity_validation;
  const mpProcessing = (mp?.response_json as any)?.processing ?? null;

  return (
    <div className="p-4 flex flex-col gap-5">
      <SolicitanteHeader solicitud={solicitud} cambioEstado={cambioEstado} />
      <GridSection
        title="Solicitante"
        tooltip="Para más información revisa la pestaña de Datos JSON."
      >
        {md?.edad != null && (
          <GridField label="Edad" value={`${md.edad} años`} />
        )}
        {md?.antiguedad_laboral != null && (
          <GridField
            label="Antigüedad Laboral"
            value={`${md.antiguedad_laboral} meses`}
          />
        )}
        <GridField label="Celular" value={v1.celular ?? v1.telefono} mono />
        <GridField label="Email" value={v1.email} mono />
      </GridSection>

      <GridSection
        title="Solicitud"
        tooltip="Para más información revisa la pestaña de Datos JSON."
      >
        <GridField
          label="Monto solicitado"
          value={md?.monto_solicitado}
          currency
          highlight
        />
        {mp?.instancia_aprobacion !== 1 && (
          <GridField
            label="Monto definitivo"
            value={mp?.monto_definitivo}
            currency
            highlight
          />
        )}
        <GridField label="Línea de crédito" value={md?.linea_credito} />
        {mpProcessing?.perfil != null && (
          <GridField label="Perfil" value={mpProcessing.perfil} />
        )}
        {md && (
          <>
            <GridField label="Salario" value={md.salario} currency />
            <GridField
              label="Egresos volante"
              value={md.egresos_volante}
              currency
            />
          </>
        )}
        {md?.deuda_coopvalili != null && (
          <GridField
            label="Deuda cooperativa"
            value={md.deuda_coopvalili}
            currency
          />
        )}
        {/* Concepto y cuota definitiva viven en la sección "Oferta" (solo
            visible con instancia_aprobacion === 1). Aquí se muestran únicamente
            cuando no hay oferta, para no duplicarlos. */}
        {mp?.instancia_aprobacion !== 1 &&
          mpProcessing?.conceptoDefinitivo != null && (
            <GridField
              label="Concepto definitivo"
              value={mpProcessing.conceptoDefinitivo}
            />
          )}
        {mp?.instancia_aprobacion !== 1 &&
          mpProcessing?.cuotaDefinitiva != null && (
            <GridField
              label="Cuota definitiva"
              value={mpProcessing.cuotaDefinitiva}
            />
          )}
        {mpProcessing?.frecuenciaMes != null && (
          <GridField
            label="Frecuencia de pago"
            value={`${mpProcessing.frecuenciaMes} veces/mes`}
          />
        )}
        {mpProcessing?.usuarioCredito != null && (
          <GridField
            label="Usuario de crédito"
            value={mpProcessing.usuarioCredito}
          />
        )}
      </GridSection>

      {mp && (
        <GridSection
          title="Análisis del motor"
          tooltip="Para más información revisa la pestaña de Datos JSON."
        >
          <GridField label="Ingresos" value={mp.ingresos} currency />
          <GridField label="Egresos" value={mp.egresos} currency />
          <GridField label="Mínimo vital" value={mp.minimo_vital} currency />
          <GridField label="Solvencia" value={mp.solvencia} currency />
          <GridField label="Desprotegido" value={mp.desprotegido} currency />
          <GridField label="Disponible" value={mp.disponible} currency />
          <GridField
            label="Endeudamiento actual"
            value={mp.endeudamiento_actual}
            currency
          />
          <GridField
            label="Endeudamiento proyectado"
            value={mp.endeudamiento_proyectado}
            currency
          />
        </GridSection>
      )}

      {mp?.instancia_aprobacion === 1 && (
        <GridSection
          title="Oferta"
          tooltip="Para más información revisa la pestaña de Datos JSON."
        >
          {/* monto_oferta ya viene formateado del motor ("$3.500.000"): sin `currency`. */}
          <GridField label="Monto" value={mp.monto_oferta} highlight />
          <GridField
            label="Cuota"
            value={mp.cuota_periodica}
            currency
            highlight
          />
          {mp.tasa_periodica != null && (
            <GridField label="Tasa" value={mp.tasa_periodica} />
          )}
          {mp.periodos != null && (
            <GridField label="Periodos" value={`${mp.periodos} meses`} />
          )}
        </GridSection>
      )}

      <Section title="Valida 1 — Criterios del cliente">
        <CriteriaSummary
          values={[
            v1.valida1,
            v1.valida_edad,
            v1.valida_activo,
            v1.valida_asociado,
            v1.valida_no_retirado,
          ]}
        />
        <CriterioRow label="Valida 1 (Inicial)" value={v1.valida1} />
        <CriterioRow label="Validación Edad" value={v1.valida_edad} />
        <CriterioRow label="Validación Activo" value={v1.valida_activo} />
        <CriterioRow label="Validación Asociado" value={v1.valida_asociado} />
      </Section>

      <Section title="Identidad — Validación documental y facial">
        {iv ? (
          <>
            <CriteriaSummary
              values={[
                normBool(iv.status_document),
                normBool(iv.status_face),
                normBool(iv.estado_validacion),
              ]}
            />
            <CriterioRow
              label="Estado Documento"
              value={normBool(iv.status_document)}
            />
            <CriterioRow
              label="Estado Facial"
              value={normBool(iv.status_face)}
            />
            <CriterioRow
              label="Estado General"
              value={normBool(iv.estado_validacion)}
            />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            Sin datos de validación de identidad.
          </p>
        )}
      </Section>

      <Section title="Motor de crédito — Política de crédito">
        {mp ? (
          <>
            <CriteriaSummary
              values={[
                normBool(mp.cumple_end),
                normBool(mp.cumple_sol),
                normBool(mp.cumple_disp),
                normBool(mp.cumple_des),
                normBool(mp.cumplimiento_4_criterios),
              ]}
            />
            <CriterioRow
              label="Cumple Endeudamiento"
              value={normBool(mp.cumple_end)}
            />
            <CriterioRow
              label="Cumple Solvencia"
              value={normBool(mp.cumple_sol)}
            />
            <CriterioRow
              label="Cumple Disponible"
              value={normBool(mp.cumple_disp)}
            />
            <CriterioRow
              label="Cumple Desprotegido"
              value={normBool(mp.cumple_des)}
            />
            <CriterioRow
              label="Cumplimiento 4 Criterios"
              value={normBool(mp.cumplimiento_4_criterios)}
            />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            No se ha procesado el motor para esta solicitud.
          </p>
        )}
      </Section>
      <Section title="Motivos no apto">
        {v1.mensaje && v1.valida1 !== 1 ? (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{v1.mensaje}</p>
          </div>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            Sin motivos de rechazo registrados.
          </p>
        )}
      </Section>
    </div>
  );
}

interface JsonViewProps {
  data: any;
}

function JsonView({ data }: JsonViewProps) {
  const parsed = useMemo(() => deepParse(data), [data]);
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(parsed, null, 2);
    } catch {
      return "";
    }
  }, [parsed]);

  if (data === null || data === undefined)
    return (
      <div className="p-5 text-sm text-slate-400 italic">No hay datos.</div>
    );

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
            fontSize: 13,
            lineHeight: 22,
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            wordWrap: "on",
            renderLineHighlight: "line",
            lineNumbersMinChars: 4,
            folding: true,
            padding: { top: 20, bottom: 20 },
            contextmenu: false,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            renderWhitespace: "none",
          }}
          // Monaco llega por carga diferida y tarda: se usa el mismo velo con
          // logo que el resto de la app en vez de un texto suelto.
          loading={<LoadingScreen message="Cargando editor" fullScreen={false} />}
        />
      </div>
    </div>
  );
}

type MotorJsonPanel =
  | "valida1"
  | "motor_data"
  | "motor_process"
  | "identity";
type ReqRes = "req" | "res";

const MOTOR_JSON_PANELS: {
  id: MotorJsonPanel;
  shortLabel: string;
  icon: ReactNode;
  hasReqRes: boolean;
}[] = [
  {
    id: "valida1",
    shortLabel: "Validación",
    icon: <ShieldCheck className="h-4 w-4" />,
    hasReqRes: true,
  },
  {
    id: "motor_data",
    shortLabel: "Motor Data",
    icon: <Database className="h-4 w-4" />,
    hasReqRes: true,
  },
  {
    id: "motor_process",
    shortLabel: "Motor Process",
    icon: <Cpu className="h-4 w-4" />,
    hasReqRes: true,
  },
  {
    id: "identity",
    shortLabel: "Identity",
    icon: <ScanFace className="h-4 w-4" />,
    hasReqRes: true,
  },
];


export function MotorJsonView({
  solicitud,
}: {
  solicitud: SolicitudUI;
}) {
  const [activePanel, setActivePanel] =
    useState<MotorJsonPanel>("motor_process");
  const [copiado, setCopiado] = useState(false);
  const [panelSide, setPanelSide] = useState<Record<MotorJsonPanel, ReqRes>>({
    valida1: "res",
    motor_data: "res",
    motor_process: "res",
    identity: "res",
  });

  const getReqData = (panel: MotorJsonPanel): any => {
    switch (panel) {
      case "valida1":
        return solicitud.raw.valida1?.request_json ?? null;
      case "motor_data":
        return solicitud.raw.motor_data?.request_json ?? null;
      case "motor_process":
        return solicitud.raw.motor_process?.request_json ?? null;
      case "identity":
        return solicitud.raw.identity_validation?.request_json ?? null;
    }
  };

  const getResData = (panel: MotorJsonPanel): any => {
    switch (panel) {
      case "valida1":
        return solicitud.raw.valida1?.response_json ?? null;
      case "motor_data":
        return solicitud.raw.motor_data?.response_json ?? null;
      case "motor_process":
        return solicitud.raw.motor_process?.response_json ?? null;
      case "identity":
        return solicitud.raw.identity_validation?.response_json ?? null;
    }
  };

  const getPanelData = (panel: MotorJsonPanel): any => {
    const panelDef = MOTOR_JSON_PANELS.find((p) => p.id === panel)!;
    if (!panelDef.hasReqRes) return getResData(panel);
    return panelSide[panel] === "req" ? getReqData(panel) : getResData(panel);
  };

  const activeData = getPanelData(activePanel);

  const copiarTexto = useMemo(() => {
    if (activeData == null) return "";
    try {
      return JSON.stringify(deepParse(activeData), null, 2);
    } catch {
      return "";
    }
  }, [activeData]);

  const handleCopiar = useCallback(async () => {
    if (!copiarTexto) return;
    try {
      await navigator.clipboard.writeText(copiarTexto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard no disponible (requiere HTTPS o localhost) */
    }
  }, [copiarTexto]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-stretch border-b border-slate-200 bg-white">
        <div className="min-w-0 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex min-w-max h-full">
          {MOTOR_JSON_PANELS.map((panel) => {
            const isActive = activePanel === panel.id;
            const hasData = getResData(panel.id) != null;
            const currentSide = panelSide[panel.id];

            return (
              <Popover key={panel.id}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setActivePanel(panel.id)}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0
                                            ${
                                              isActive
                                                ? "bg-white text-[#012340]"
                                                : "bg-slate-50/60 text-slate-400 hover:text-slate-600 hover:bg-white"
                                            }`}
                  >
                    <span
                      className={`flex-shrink-0 transition-colors ${isActive ? "text-[#012340]" : "text-slate-300"}`}
                    >
                      {panel.icon}
                    </span>
                    <span>{panel.shortLabel}</span>
                    {isActive && panel.hasReqRes && (
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#012340]/40">
                        {currentSide}
                      </span>
                    )}
                    {!isActive && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${hasData ? "bg-[#012340]/35" : "bg-slate-200"}`}
                      />
                    )}
                    {panel.hasReqRes && (
                      <ChevronDown
                        className={`h-3 w-3 flex-shrink-0 transition-colors ${isActive ? "text-[#012340]/50" : "text-slate-300"}`}
                      />
                    )}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#012340]"
                      />
                    )}
                  </button>
                </PopoverTrigger>
                {panel.hasReqRes && (
                  <PopoverContent
                    sideOffset={4}
                    className="w-auto min-w-0 p-1 shadow-sm border-[#0D0D0D]/8 bg-white/95 backdrop-blur-sm"
                  >
                    <div className="flex gap-0.5">
                      {(["req", "res"] as ReqRes[]).map((side) => {
                        const isCurrent =
                          isActive && panelSide[panel.id] === side;
                        return (
                          <button
                            key={side}
                            onClick={() => {
                              setActivePanel(panel.id);
                              setPanelSide((prev) => ({
                                ...prev,
                                [panel.id]: side,
                              }));
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors
                                                            ${
                                                              isCurrent
                                                                ? "bg-[#012340]/8 text-[#012340]"
                                                                : "text-[#0D0D0D]/35 hover:text-[#012340]/60"
                                                            }`}
                          >
                            {side === "req" ? "Req" : "Res"}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
          </div>
        </div>

        {/* Copiar el JSON del panel/lado activo */}
        <button
          onClick={handleCopiar}
          disabled={!copiarTexto}
          title={
            copiarTexto ? "Copiar JSON" : "No hay JSON para copiar"
          }
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 text-[10px] font-bold uppercase tracking-wider border-l border-slate-200 transition-colors ${
            copiado
              ? "bg-emerald-50 text-emerald-700"
              : copiarTexto
                ? "bg-slate-50/60 text-[#0D0D0D]/40 hover:bg-white hover:text-[#012340]"
                : "bg-slate-50/60 text-[#0D0D0D]/20 cursor-not-allowed"
          }`}
        >
          {copiado ? (
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span>{copiado ? "Copiado" : "Copiar"}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] bg-white">
        {activeData == null ? (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mt-1 text-xs">
                  No existe un registro asociado a este radicado.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <JsonView data={activeData} />
        )}
      </div>
    </div>
  );
}
