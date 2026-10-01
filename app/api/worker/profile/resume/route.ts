import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResumeFormat, hasResumeSignature, resolveResumeStoragePath, safeResumeContentDisposition, safeResumeDisplayName } from "@/lib/resume-storage";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const resume = await prisma.workerResume.findFirst({
      where: { id, workerId: session.userId, isActive: true },
      select: { fileName: true, storedPath: true, mimeType: true },
    });
    if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    const filePath = resolveResumeStoragePath(session.userId, resume.storedPath);
    if (!filePath) return NextResponse.json({ error: "Resume file is unavailable." }, { status: 404 });

    try {
      const file = await readFile(filePath);
      return new Response(new Uint8Array(file), { headers: { "Content-Type": resume.mimeType, "Content-Disposition": safeResumeContentDisposition(resume.fileName), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch {
      return NextResponse.json({ error: "Resume file is unavailable." }, { status: 404 });
    }
  }

  const resumes = await prisma.workerResume.findMany({
    where: { workerId: session.userId },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true, isActive: true },
  });

  return NextResponse.json({ resumes });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Resume must be 5 MB or smaller." }, { status: 400 });
  }

  const format = getResumeFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json({ error: "Unsupported resume format. Use PDF, DOC, or DOCX." }, { status: 400 });
  }

  const content = Buffer.from(await file.arrayBuffer());
  if (!hasResumeSignature(format.extension, content)) {
    return NextResponse.json({ error: "The file contents do not match a supported resume format." }, { status: 400 });
  }

  const fileName = safeResumeDisplayName(file.name, format.extension);
  const safeName = `${randomUUID()}.${format.extension}`;
  const storedPath = path.join("private", "resumes", session.userId, safeName);
  const absolutePath = path.join(process.cwd(), storedPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
  await prisma.workerResume.updateMany({ where: { workerId: session.userId, isActive: true }, data: { isActive: false } });

  const stored = await prisma.workerResume.create({
    data: {
      workerId: session.userId,
      fileName,
      storedPath,
      fileSize: file.size,
      mimeType: format.mimeType,
      isActive: true,
    },
    select: { id: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true, isActive: true },
  });

  return NextResponse.json({ resume: stored }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Resume id is required." }, { status: 400 });
  }

  const resume = await prisma.workerResume.findFirst({ where: { id, workerId: session.userId }, select: { id: true, storedPath: true } });
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const filePath = resolveResumeStoragePath(session.userId, resume.storedPath);
  if (!filePath) return NextResponse.json({ error: "Resume file path is invalid." }, { status: 500 });
  await prisma.workerResume.delete({ where: { id } });
  await unlink(filePath).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
