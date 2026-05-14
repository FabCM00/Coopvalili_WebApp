/**
 * Lee seed/admins.yml y crea los usuarios admin en Supabase Auth.
 * Usa el service role key — no necesita DATABASE_URL.
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
    const { admins } = yaml.load(raw) as AdminsFile;

    if (!admins?.length) {
        console.log("No hay admins definidos en seed/admins.yml");
        return;
    }

    for (const admin of admins) {
        console.log(`→ Creando admin: ${admin.email}`);

        const { data, error } = await supabase.auth.admin.createUser({
            email: admin.email,
            password: admin.password,
            email_confirm: true,
            user_metadata: { username: admin.username },
        });

        if (error) {
            if (error.message.includes("already been registered")) {
                console.log(`  ⚠ Ya existe: ${admin.email}`);
            } else {
                console.error(`  ✗ Error: ${error.message}`);
            }
            continue;
        }

        console.log(`  ✓ Creado: ${data.user?.id}`);
    }

    console.log("\nSeed de admins completado.");
}

main();
