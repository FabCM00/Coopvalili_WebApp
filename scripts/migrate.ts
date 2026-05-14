/**
 * Ejecuta la migración inicial contra la base de datos de Portal WANT.
 * Requiere DATABASE_URL en .env.local
 *
 * Uso: npm run migrate
 */
import { Client } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/001_initial.sql"),
    "utf-8",
);

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("ERROR: DATABASE_URL no está definida en .env.local");
        console.error("Encuéntrala en: Supabase Dashboard → Settings → Database → Connection string (URI)");
        process.exit(1);
    }

    const client = new Client({ connectionString: url });
    await client.connect();
    console.log("Conectado a la base de datos...");

    try {
        await client.query(sql);
        console.log("✓ Migración ejecutada correctamente");
    } catch (err: any) {
        console.error("✗ Error en la migración:", err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
