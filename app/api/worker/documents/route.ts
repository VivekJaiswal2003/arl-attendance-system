import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  buildDocumentStorageKey,
  deleteWorkerDocumentBlob,
  isValidPdf,
  safeDocumentDisplayName,
  uploadWorkerDocument,
} from "@/lib/document-storage";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.workerDocument.findUnique({
    where: { workerId: session.userId },
    select: { id: true, fileName: true, fileSize: true, contentType: true, uploadedAt: true, updatedAt: true },
  });

  return NextResponse.json({ document });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("document");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "The document must be 20 MB or smaller." }, { status: 400 });
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (!isValidPdf(file.name, file.type, content)) {
    return NextResponse.json({ error: "Only genuine PDF files are accepted." }, { status: 400 });
  }

  const fileName = safeDocumentDisplayName(file.name);
  const storageKey = buildDocumentStorageKey(session.userId, fileName);

  let blobUrl: string;
  try {
    blobUrl = await uploadWorkerDocument(storageKey, content, "application/pdf");
  } catch {
    return NextResponse.json({ error: "Document storage is not available right now. Please try again later." }, { status: 503 });
  }

  const existing = await prisma.workerDocument.findUnique({ where: { workerId: session.userId }, select: { storageKey: true } });

  const document = await prisma.workerDocument.upsert({
    where: { workerId: session.userId },
    create: {
      workerId: session.userId,
      fileName,
      storageKey,
      blobUrl,
      fileSize: file.size,
      contentType: "application/pdf",
    },
    update: {
      fileName,
      storageKey,
      blobUrl,
      fileSize: file.size,
      contentType: "application/pdf",
    },
    select: { id: true, fileName: true, fileSize: true, contentType: true, uploadedAt: true, updatedAt: true },
  });

  // Clean up the previously stored blob now that the new one is safely saved.
  if (existing && existing.storageKey !== storageKey) {
    await deleteWorkerDocumentBlob(existing.storageKey);
  }

  return NextResponse.json({ document }, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.workerDocument.findUnique({ where: { workerId: session.userId }, select: { id: true, storageKey: true } });
  if (!document) {
    return NextResponse.json({ error: "No document on file." }, { status: 404 });
  }

  await prisma.workerDocument.delete({ where: { id: document.id } });
  await deleteWorkerDocumentBlob(document.storageKey);

  return NextResponse.json({ ok: true });
}
