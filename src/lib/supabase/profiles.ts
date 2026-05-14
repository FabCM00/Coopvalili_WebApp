import { supabase } from "./client";
import { safeCall } from "./safe-call";
import type { Profile, SafeResult } from "./types";

/**
 * Obtiene un perfil por ID. Si no existe devuelve { code: "not_found" }.
 */
export async function getProfile(
    userId: string,
): Promise<SafeResult<Profile>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, username, role, estado, created_at")
                .eq("id", userId)
                .single();
            return { data: data as Profile | null, error };
        },
        { label: "profiles.get" },
    );
}

/**
 * Lista perfiles. Para el panel admin.
 */
export async function listProfiles(options?: {
    excludeRole?: "admin" | "user";
    orderBy?: { column: string; ascending: boolean };
}): Promise<SafeResult<Profile[]>> {
    return safeCall(
        async () => {
            let q = supabase
                .from("profiles")
                .select("id, email, username, role, estado, created_at");
            if (options?.excludeRole) {
                q = q.neq("role", options.excludeRole);
            }
            if (options?.orderBy) {
                q = q.order(options.orderBy.column, {
                    ascending: options.orderBy.ascending,
                });
            }
            const { data, error } = await q;
            return { data: (data ?? []) as Profile[], error };
        },
        { label: "profiles.list" },
    );
}

/**
 * Actualiza un perfil.
 */
export async function updateProfile(
    userId: string,
    updates: Partial<Profile>,
): Promise<SafeResult<Profile>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", userId)
                .select()
                .single();
            return { data: data as Profile, error };
        },
        { label: "profiles.update" },
    );
}
