import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkerDocumentStream, safeDocumentContentDisposition } from "@/lib/document-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workerId } = await params;
  const document = await prisma.workerDocument.findUnique({
    where: { workerId },
    select: { fileName: true, contentType: true, storageKey: true },
  });
  if (!document) {
    return NextResponse.json({ error: "No document on file." }, { status: 404 });
  }

  const result = await getWorkerDocumentStream(document.storageKey);
  if (!result) {
    return NextResponse.json({ error: "Document is unavailable." }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": safeDocumentContentDisposition(document.fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
