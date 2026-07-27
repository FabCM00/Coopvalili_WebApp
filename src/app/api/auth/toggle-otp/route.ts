import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  enabled: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(`toggle-otp:${session.user.id}:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Datos inválidos." },
      { status: 400 },
    );
  }

  await withPrismaRetry(() =>
    prisma.user.update({
      where: { id: session.user.id },
      data: { otpEnabled: parsed.data.enabled },
    }),
  );

  return NextResponse.json({ ok: true });
}
