import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkerDocumentStream, safeDocumentContentDisposition } from "@/lib/document-storage";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.workerDocument.findUnique({
    where: { workerId: session.userId },
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
