import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const workerAdminUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  currentJobTitle: z.string().trim().optional(),
  professionalSummary: z.string().trim().optional(),
  preferredLocation: z.string().trim().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workerId } = await params;
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      workerId: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      professionalSummary: true,
      currentJobTitle: true,
      totalExperience: true,
      preferredLocation: true,
      profileCompletionPercentage: true,
      isActive: true,
      selectedSiteId: true,
      selectedSite: { select: { id: true, name: true, address: true, allowedRadiusMeters: true, isActive: true } },
      skills: { select: { id: true, skillName: true, skillLevel: true } },
      educations: { select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true } },
      experiences: { select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true } },
      resumes: { where: { isActive: true }, select: { id: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true, isActive: true } },
      document: { select: { id: true, fileName: true, fileSize: true, contentType: true, uploadedAt: true, updatedAt: true } },
      attendances: {
        orderBy: { checkInTime: "desc" },
        take: 10,
        select: { id: true, attendanceDate: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true, distanceFromSiteMeters: true, status: true, site: { select: { id: true, name: true, address: true } } },
      },
    },
  });

  if (!worker) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  return NextResponse.json({ worker });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid worker update payload." }, { status: 400 });
  }

  const parsed = workerAdminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid worker update data." }, { status: 400 });
  }

  const { workerId } = await params;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true, isActive: true, firstName: true, lastName: true, fullName: true, phone: true, address: true, currentJobTitle: true, professionalSummary: true, preferredLocation: true },
  });
  if (!worker) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  const updatedWorker = await prisma.worker.update({
    where: { id: workerId },
    data: {
      isActive: parsed.data.isActive ?? worker.isActive,
      firstName: parsed.data.firstName ?? worker.firstName,
      lastName: parsed.data.lastName ?? worker.lastName,
      fullName: `${parsed.data.firstName ?? worker.firstName ?? ""} ${parsed.data.lastName ?? worker.lastName ?? ""}`.trim() || worker.fullName,
      phone: parsed.data.phone ?? worker.phone,
      address: parsed.data.address ?? worker.address,
      currentJobTitle: parsed.data.currentJobTitle ?? worker.currentJobTitle,
      professionalSummary: parsed.data.professionalSummary ?? worker.professionalSummary,
      preferredLocation: parsed.data.preferredLocation ?? worker.preferredLocation,
    },
    select: {
      id: true,
      workerId: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      currentJobTitle: true,
      professionalSummary: true,
      preferredLocation: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    worker: {
      id: updatedWorker.id,
      workerId: updatedWorker.workerId,
      firstName: updatedWorker.firstName,
      lastName: updatedWorker.lastName,
      fullName: updatedWorker.fullName,
      email: updatedWorker.email,
      phone: updatedWorker.phone,
      address: updatedWorker.address,
      currentJobTitle: updatedWorker.currentJobTitle,
      professionalSummary: updatedWorker.professionalSummary,
      preferredLocation: updatedWorker.preferredLocation,
      isActive: updatedWorker.isActive,
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  const formData = await request.formData();
  const isActive = formData.get("isActive") === "active";

  const response = await PATCH(
    new Request(request.url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive,
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        currentJobTitle: String(formData.get("currentJobTitle") ?? ""),
        professionalSummary: String(formData.get("professionalSummary") ?? ""),
        preferredLocation: String(formData.get("preferredLocation") ?? ""),
      }),
    }),
    { params },
  );

  if (response.ok) {
    return NextResponse.redirect(new URL(`/admin/workers/${(await params).workerId}?saved=1`, request.url));
  }

  return response;
}

/**
 * "Delete Worker" is implemented as a safe deactivation rather than a real
 * row delete. Attendance.worker uses onDelete: Cascade, so an actual delete
 * would silently wipe out historical attendance records for this worker --
 * which is explicitly forbidden. Deactivating instead: disables login,
 * clears the worker's currently-selected site (so they stop appearing as
 * "on site"), and keeps every attendance record intact for reporting.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workerId } = await params;
  const worker = await prisma.worker.findUnique({ where: { id: workerId }, select: { id: true } });
  if (!worker) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  await prisma.worker.update({
    where: { id: workerId },
    data: { isActive: false, selectedSiteId: null },
  });

  return NextResponse.json({ ok: true });
}
