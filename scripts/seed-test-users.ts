import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const TEST_EMAILS = [
  "hcardoso@wantnget.com.co",
  "dorjuela@wantnget.com.co",
  "llopez@wantnget.com.co",
  "jcorredor@wantnget.com.co",
];

const prisma = new PrismaClient();

function generatePassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!";
}

async function main() {
  const created: { email: string; password: string }[] = [];

  for (const raw of TEST_EMAILS) {
    const email = raw.toLowerCase().trim();
    const name = email.split("@")[0];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`⏩ Ya existe: ${email}`);
      continue;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: Role.USER,
        active: true,
        emailVerified: new Date(),
      },
    });

    created.push({ email, password });
  }

  if (created.length) {
    console.log("\n✅ Usuarios de prueba creados (rol user, sin correo enviado):\n");
    for (const u of created) {
      console.log(`  ${u.email}  →  ${u.password}`);
    }
  } else {
    console.log("\nℹ️  No se creó ningún usuario nuevo (todos ya existían).");
  }
}

main()
  .catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
