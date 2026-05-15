/**
 * Servicio de invitaciones — orquesta:
 *   1. Crear el usuario en Supabase Auth (con admin client) si no existe.
 *   2. Enviar el email de invitación a través del SMTP de Supabase.
 *
 * SOLO para uso server-side.
 */

import { getSupabaseAdmin } from "../supabase/server";

export interface InviteUserInput {
    email: string;
    /** Origen de la app (p.ej. "https://app.com" o "http://localhost:3000") */
    appOrigin: string;
    /** Nombre de usuario; si se omite se deriva del prefijo del correo */
    username?: string;
}

export interface InviteUserResult {
    ok: boolean;
    /** Mensaje legible. */
    message: string;
    /** Codigo estable para el cliente: "sent" | "exists" | "invalid_email" | "send_failed" | "internal" */
    code: "sent" | "exists" | "invalid_email" | "send_failed" | "internal";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteUser(
    input: InviteUserInput,
): Promise<InviteUserResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
        return {
            ok: false,
            code: "invalid_email",
            message: "El correo no es valido.",
        };
    }

    let admin;
    try {
        admin = getSupabaseAdmin();
    } catch (e: any) {
        return {
            ok: false,
            code: "internal",
            message: e?.message ?? "No se pudo inicializar el cliente admin.",
        };
    }

    // 1) Invitar al usuario usando el API de admin de Supabase.
    // Esto creará el usuario si no existe y enviará un email a través del SMTP configurado.
    const redirectTo = input.appOrigin.replace(/\/$/, "") + "/set-password";

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
    });

    if (error) {
        const msg = error.message || "";
        if (
            /already been registered/i.test(msg) ||
            /already exists/i.test(msg) ||
            error.status === 422
        ) {
            return {
                ok: false,
                code: "exists",
                message:
                    "Ya existe una cuenta con ese correo. Pidele al usuario que inicie sesion o use 'Olvide mi contrasena'.",
            };
        }
        return {
            ok: false,
            code: "internal",
            message: msg || "Error generando el enlace de invitacion.",
        };
    }

    // Crear el perfil con estado=false hasta que el usuario establezca su contraseña.
    const userId = data?.user?.id;
    if (userId) {
        const username = (input.username?.trim() || email.split("@")[0]).toLowerCase();
        const { error: profileError } = await admin.from("profiles").upsert(
            { id: userId, email, username, role: "user", estado: false },
            { onConflict: "id" },
        );
        if (profileError) {
            return {
                ok: false,
                code: "internal",
                message: "Invitacion enviada pero no se pudo crear el perfil: " + profileError.message,
            };
        }
    }

    return {
        ok: true,
        code: "sent",
        message: "Invitacion enviada a " + email + ".",
    };
}
