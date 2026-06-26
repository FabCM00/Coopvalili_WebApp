import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import {
  deleteDocument,
  isAllowedContentType,
  isValidStatus,
  listDocuments,
  MAX_DOCUMENT_BYTES,
  sanitizeCedula,
  setDocumentStatus,
  uploadDocument,
} from "@/lib/azure-blob";
import { syncCesantiasDocument } from "@/lib/cesantias";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  if (!sanitizeCedula(cedula)) {
    return NextResponse.json({ ok: false, message: "Cédula requerida." }, { status: 400 });
  }

  const radicado = req.nextUrl.searchParams.get("radicado") ?? "";
  if (radicado) {
    try {
      await syncCesantiasDocument(cedula, radicado);
    } catch (error) {
      console.error("[documentos] sync cesantías:", error);
    }
  }

  try {
    const documentos = await listDocuments(cedula);
    return NextResponse.json({ ok: true, documentos });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  if (!sanitizeCedula(cedula)) {
    return NextResponse.json({ ok: false, message: "Cédula requerida." }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Archivo requerido." }, { status: 400 });
    }
    if (!isAllowedContentType(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Formato no válido. Solo PDF, JPG, PNG, DOCX o XLSX." },
        { status: 415 },
      );
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el límite de 10 MB." },
        { status: 413 },
      );
    }

    const category = String(formData.get("category") ?? "general");
    const documento = await uploadDocument(cedula, file, category);
    return NextResponse.json({ ok: true, documento }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!sanitizeCedula(cedula) || !id) {
    return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
  }

  try {
    await deleteDocument(cedula, id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!sanitizeCedula(cedula) || !id) {
    return NextResponse.json({ ok: false, message: "Parámetros requeridos." }, { status: 400 });
  }

  let status = "";
  try {
    const body = (await req.json()) as { status?: string };
    status = body.status ?? "";
  } catch {
    return NextResponse.json({ ok: false, message: "Cuerpo inválido." }, { status: 400 });
  }
  if (!isValidStatus(status)) {
    return NextResponse.json({ ok: false, message: "Estado no válido." }, { status: 400 });
  }

  try {
    await setDocumentStatus(cedula, id, status);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
