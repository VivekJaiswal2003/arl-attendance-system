import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateFromKey } from "@/lib/time";

const dateOnlySchema = z.string().trim().refine(
  (value) => value === "" || indiaDateFromKey(value) !== null,
  "Enter a valid date.",
);

const experienceSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().trim().min(1, "Company name is required."),
  jobTitle: z.string().trim().min(1, "Job title is required."),
  employmentType: z.string().trim().optional(),
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  currentlyWorking: z.boolean().optional(),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.workerExperience.findMany({
    where: { workerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true },
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
    return NextResponse.json({ error: "Invalid experience payload." }, { status: 400 });
  }

  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid experience data." }, { status: 400 });
  }

  const record = await prisma.workerExperience.create({
    data: {
      workerId: session.userId,
      companyName: parsed.data.companyName,
      jobTitle: parsed.data.jobTitle,
      employmentType: parsed.data.employmentType ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      currentlyWorking: parsed.data.currentlyWorking ?? false,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
    },
    select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true },
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
    return NextResponse.json({ error: "Invalid experience payload." }, { status: 400 });
  }

  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid experience data." }, { status: 400 });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "Experience record id is required." }, { status: 400 });
  }

  const record = await prisma.workerExperience.update({
    where: {
      id: parsed.data.id,
      workerId: session.userId,
    },
    data: {
      companyName: parsed.data.companyName,
      jobTitle: parsed.data.jobTitle,
      employmentType: parsed.data.employmentType ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      currentlyWorking: parsed.data.currentlyWorking ?? false,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
    },
    select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true },
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
    return NextResponse.json({ error: "Experience record id is required." }, { status: 400 });
  }

  await prisma.workerExperience.delete({
    where: {
      id,
      workerId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
