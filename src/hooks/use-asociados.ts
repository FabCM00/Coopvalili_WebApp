"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useAsociados(options?: UseAsociadosOptions): UseAsociadosReturn {
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
      const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";

      const res = await fetch(`${prefix}/api/admin/asociados?page=${page}&pageSize=${pageSize}`);
      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.message || "Error cargando asociados");
      }

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error("Error cargando asociados:", err);
      setError(err?.message || "Error cargando asociados");
    } finally {
      setLoading(false);
    }
  }, [options?.page, options?.pageSize]);

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