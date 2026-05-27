import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

interface AdminEntry {
  email: string;
  username?: string;
  password?: string;
}

interface AdminsYaml {
  admins: AdminEntry[];
}

const prisma = new PrismaClient();

async function main() {
  const yamlPath = path.resolve(process.cwd(), "seed", "admins.yml");

  if (!fs.existsSync(yamlPath)) {
    console.error("❌ No se encontró seed/admins.yml");
    process.exit(1);
  }

  const raw = fs.readFileSync(yamlPath, "utf-8");
  const data = yaml.load(raw) as AdminsYaml;

  if (!data?.admins?.length) {
    console.log("ℹ️  No hay admins en seed/admins.yml");
    return;
  }

  for (const entry of data.admins) {
    const email = entry.email.toLowerCase().trim();
    const name = entry.username ?? email.split("@")[0];

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      console.log(`⏩ Ya existe: ${email}`);
      continue;
    }

    // Si no hay contraseña en el yml, genera una temporal segura
    const rawPassword =
      entry.password ??
      crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!";

    const passwordHash = await bcrypt.hash(rawPassword, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: Role.ADMIN,
        active: true,
        emailVerified: new Date(),
      },
    });

    console.log(
      `✅ Admin creado: ${email}` +
        (!entry.password ? `  (contraseña temporal: ${rawPassword})` : ""),
    );
  }

  console.log("\n✅ Seed de admins completado.");
}

main()
  .catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
