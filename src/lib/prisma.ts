import { PrismaClient } from "@prisma/client";

// Singleton: evita instancias múltiples con el Hot Reload de Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Sin "error": el motor emite `prisma:error` por cada intento fallido aunque
    // withPrismaRetry lo recupere. Los errores no recuperados igual salen en el
    // catch del handler (respuesta 500) y en el console.warn del retry.
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn"]
        : ["warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
