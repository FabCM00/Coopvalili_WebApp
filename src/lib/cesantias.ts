import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { materializeBlob, sanitizeCedula } from "@/lib/azure-blob";

const EXT_CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".csv": "text/csv",
};

function contentTypeFor(ext: string): string {
  return EXT_CONTENT_TYPE[ext.toLowerCase()] ?? "application/octet-stream";
}

function normalizeExtension(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const ext = raw.trim().toLowerCase();
  return ext.startsWith(".") ? ext : `.${ext}`;
}

function stripDataUri(value: string): string {
  return value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

export async function syncCesantiasDocument(
  cedula: string,
  radicado: string,
): Promise<void> {
  const safe = sanitizeCedula(cedula);
  if (!safe || !radicado) return;

  const row = await withPrismaRetry(() =>
    prisma.document_results.findFirst({
      where: { radicado },
      orderBy: { created_at: "desc" },
      select: { response_json: true },
    }),
  );

  const info = (row?.response_json as { info?: Record<string, unknown> } | null)
    ?.info;
  const rawBase64 = typeof info?.base64 === "string" ? info.base64 : "";
  if (!rawBase64) return;

  const base64 = stripDataUri(rawBase64);
  if (!base64) return;

  const ext = normalizeExtension(info?.extension);
  const blobName = `${safe}/cesantias-${radicado}${ext}`;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) return;

  await materializeBlob(
    blobName,
    buffer,
    contentTypeFor(ext),
    `Cesantias${ext}`,
    "Cesantías",
  );
}
