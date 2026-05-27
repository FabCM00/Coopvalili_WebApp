import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] DB unreachable:", err);
    return NextResponse.json(
      {
        status: "error",
        db: "down",
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
