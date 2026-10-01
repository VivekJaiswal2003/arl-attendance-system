import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const skillSchema = z.object({
  skillName: z.string().trim().min(1, "Skill name is required."),
  skillLevel: z.string().trim().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.workerSkill.findMany({
    where: { workerId: session.userId },
    orderBy: { skillName: "asc" },
    select: { id: true, skillName: true, skillLevel: true },
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
    return NextResponse.json({ error: "Invalid skill payload." }, { status: 400 });
  }

  const parsed = skillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid skill data." }, { status: 400 });
  }

  const existing = await prisma.workerSkill.findFirst({
    where: { workerId: session.userId, skillName: { equals: parsed.data.skillName, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "This skill already exists for this worker." }, { status: 409 });
  }

  const record = await prisma.workerSkill.create({
    data: {
      workerId: session.userId,
      skillName: parsed.data.skillName,
      skillLevel: parsed.data.skillLevel ?? null,
    },
    select: { id: true, skillName: true, skillLevel: true },
  });

  return NextResponse.json({ record }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Skill id is required." }, { status: 400 });
  }

  await prisma.workerSkill.delete({
    where: {
      id,
      workerId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
