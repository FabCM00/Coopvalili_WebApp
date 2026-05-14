// hooks/use-asociados.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DatosAsociado {
    id: string;

    cedula: string | null;
    nombre: string | null;
    primer_apellido: string | null;
    nombre_asociado: string | null;

    ciudad: string | null;
    estado_civil: string | null;
    estado_civil_norm: string | null;

    salario: number | null;
    aportes: number | null;
    deuda_coopvalili: number | null;
    cuota_disponible: number | null;

    edad: number | null;

    cliente_empresa: string | null;
    antiguedad_laboral: string | null;

    created_at?: string | null;
    updated_at?: string | null;

    [key: string]: any;
}

interface UseAsociadosOptions {
    orderBy?: {
        column: string;
        ascending?: boolean;
    };

    page?: number;
    pageSize?: number;
}

interface UseAsociadosReturn {
    data: DatosAsociado[];
    total: number;
    loading: boolean;
    error: string | null;

    refresh: () => Promise<void>;
}

export function useAsociados(
    options?: UseAsociadosOptions,
): UseAsociadosReturn {
    const [data, setData] = useState<DatosAsociado[]>([]);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const page = options?.page ?? 1;
            const pageSize = options?.pageSize ?? 100;

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from("datos_asociado")
                .select("*", {
                    count: "exact",
                });

            // ORDER
            if (options?.orderBy?.column) {
                query = query.order(
                    options.orderBy.column,
                    {
                        ascending:
                            options.orderBy.ascending ??
                            false,
                    },
                );
            }

            // PAGINACIÓN
            query = query.range(from, to);

            const {
                data: response,
                error,
                count,
            } = await query;

            if (error) {
                throw error;
            }

            setData(
                (response as DatosAsociado[]) || [],
            );

            setTotal(count || 0);
        } catch (err: any) {
            console.error(
                "Error cargando asociados:",
                err,
            );

            setError(
                err?.message ||
                "Error cargando asociados",
            );
        } finally {
            setLoading(false);
        }
    }, [
        options?.page,
        options?.pageSize,
        options?.orderBy?.column,
        options?.orderBy?.ascending,
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        total,
        loading,
        error,
        refresh: fetchData,
    };
}