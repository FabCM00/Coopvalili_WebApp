/**
 * Lee seed/admins.yml y crea los usuarios admin en Supabase Auth + profiles.
 * Usa el service role key — no necesita DATABASE_URL.
 *
 * También acepta un admin extra vía variables de entorno:
 *   SEED_ADMIN_EMAIL    correo del admin extra
 *   SEED_ADMIN_PASSWORD contraseña del admin extra
 *   SEED_ADMIN_USERNAME nombre de usuario (opcional, se deriva del correo)
 *
 * Uso: npm run seed:admins
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import yaml from "js-yaml";

config({ path: resolve(process.cwd(), ".env.local") });

interface AdminEntry {
    email: string;
    username: string;
    password: string;
}

interface AdminsFile {
    admins: AdminEntry[];
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidos en .env.local");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const raw = readFileSync(resolve(process.cwd(), "seed/admins.yml"), "utf-8");
    const { admins: yamlAdmins } = yaml.load(raw) as AdminsFile;
    const admins: AdminEntry[] = [...(yamlAdmins ?? [])];

    // Admin extra desde variables de entorno
    const envEmail = process.env.SEED_ADMIN_EMAIL;
    const envPassword = process.env.SEED_ADMIN_PASSWORD;
    if (envEmail && envPassword) {
        const envUsername = process.env.SEED_ADMIN_USERNAME || envEmail.split("@")[0];
        admins.push({ email: envEmail, password: envPassword, username: envUsername });
        console.log(`→ Admin extra desde env: ${envEmail}`);
    }

    if (!admins.length) {
        console.log("No hay admins definidos en seed/admins.yml ni en variables de entorno.");
        return;
    }

    for (const admin of admins) {
        console.log(`→ Procesando admin: ${admin.email}`);

        // 1. Crear/verificar usuario en Auth
        const { data, error } = await supabase.auth.admin.createUser({
            email: admin.email,
            password: admin.password,
            email_confirm: true,
            user_metadata: { username: admin.username },
        });

        let userId: string | undefined;

        if (error) {
            if (/already been registered/i.test(error.message)) {
                console.log(`  ⚠ Auth ya existe: ${admin.email} — sincronizando perfil`);
                // Recuperar el ID del usuario existente
                const { data: listData } = await supabase.auth.admin.listUsers();
                userId = listData?.users.find((u) => u.email === admin.email)?.id;
            } else {
                console.error(`  ✗ Error Auth: ${error.message}`);
                continue;
            }
        } else {
            userId = data.user?.id;
            console.log(`  ✓ Auth creado: ${userId}`);
        }

        if (!userId) {
            console.error(`  ✗ No se pudo obtener el ID para ${admin.email}`);
            continue;
        }

        // 2. Upsert del perfil en la tabla profiles
        const { error: profileError } = await supabase.from("profiles").upsert(
            {
                id: userId,
                email: admin.email,
                username: admin.username,
                role: "admin",
                estado: true,
            },
            { onConflict: "id" },
        );

        if (profileError) {
            console.error(`  ✗ Error perfil: ${profileError.message}`);
        } else {
            console.log(`  ✓ Perfil sincronizado`);
        }
    }

    console.log("\nSeed de admins completado.");
}

main();
