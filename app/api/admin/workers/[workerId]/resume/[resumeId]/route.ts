import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveResumeStoragePath, safeResumeContentDisposition } from "@/lib/resume-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ workerId: string; resumeId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workerId, resumeId } = await params;
  const resume = await prisma.workerResume.findFirst({
    where: { id: resumeId, workerId, isActive: true },
    select: { fileName: true, storedPath: true, mimeType: true },
  });
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const filePath = resolveResumeStoragePath(workerId, resume.storedPath);
  if (!filePath) return NextResponse.json({ error: "Resume file is unavailable." }, { status: 404 });

  try {
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), { headers: { "Content-Type": resume.mimeType, "Content-Disposition": safeResumeContentDisposition(resume.fileName), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Resume file is unavailable." }, { status: 404 });
  }
}
