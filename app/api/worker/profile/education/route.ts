import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const educationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().trim().min(1, "Degree is required."),
  fieldOfStudy: z.string().trim().optional(),
  institution: z.string().trim().min(1, "Institution is required."),
  startYear: z.coerce.number().int().min(1900).max(2100).optional(),
  endYear: z.coerce.number().int().min(1900).max(2100).optional(),
  grade: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.workerEducation.findMany({
    where: { workerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid education payload." }, { status: 400 });
  }

  const parsed = educationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid education data." }, { status: 400 });
  }

  const record = await prisma.workerEducation.create({
    data: {
      workerId: session.userId,
      degree: parsed.data.degree,
      fieldOfStudy: parsed.data.fieldOfStudy ?? null,
      institution: parsed.data.institution,
      startYear: parsed.data.startYear ?? null,
      endYear: parsed.data.endYear ?? null,
      grade: parsed.data.grade ?? null,
      description: parsed.data.description ?? null,
    },
    select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true },
  });

  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid education payload." }, { status: 400 });
  }

  const parsed = educationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid education data." }, { status: 400 });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "Education record id is required." }, { status: 400 });
  }

  const record = await prisma.workerEducation.update({
    where: {
      id: parsed.data.id,
      workerId: session.userId,
    },
    data: {
      degree: parsed.data.degree,
      fieldOfStudy: parsed.data.fieldOfStudy ?? null,
      institution: parsed.data.institution,
      startYear: parsed.data.startYear ?? null,
      endYear: parsed.data.endYear ?? null,
      grade: parsed.data.grade ?? null,
      description: parsed.data.description ?? null,
    },
    select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true },
  });

  return NextResponse.json({ record });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Education record id is required." }, { status: 400 });
  }

  await prisma.workerEducation.delete({
    where: {
      id,
      workerId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
