/**
 * Cliente Supabase con permisos de service role, SOLO para uso server-side
 * (rutas /api, server actions, etc).
 *
 * NO IMPORTAR ESTE ARCHIVO desde código de cliente. Aunque Next.js está
 * configurado para no enviar archivos sin "use client" al bundle de
 * navegador, exponer la SUPABASE_SERVICE_ROLE_KEY al cliente sería un
 * compromiso total de seguridad de la base de datos.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (_client) return _client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
        throw new Error(
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.",
        );
    }

    _client = createClient(url, serviceRole, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return _client;
}
