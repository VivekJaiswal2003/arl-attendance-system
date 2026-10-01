import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProfileCompletion } from "@/lib/profile";
import { indiaDateFromKey } from "@/lib/time";

const dateOnlySchema = z.string().trim().refine(
  (value) => value === "" || indiaDateFromKey(value) !== null,
  "Enter a valid date.",
);

const profileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dateOfBirth: dateOnlySchema.optional(),
  professionalSummary: z.string().trim().optional(),
  currentJobTitle: z.string().trim().optional(),
  totalExperience: z.string().trim().optional(),
  expectedSalary: z.string().trim().optional(),
  preferredLocation: z.string().trim().optional(),
  linkedIn: z.string().trim().optional(),
  github: z.string().trim().optional(),
  portfolio: z.string().trim().optional(),
  resumeUrl: z.string().trim().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      workerId: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      address: true,
      professionalSummary: true,
      currentJobTitle: true,
      totalExperience: true,
      expectedSalary: true,
      preferredLocation: true,
      linkedIn: true,
      github: true,
      portfolio: true,
      resumeUrl: true,
      profileCompletionPercentage: true,
      skills: { select: { id: true, skillName: true, skillLevel: true } },
      educations: { select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true } },
      experiences: { select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true } },
      resumes: { select: { id: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true, isActive: true } },
    },
  });

  if (!worker) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  return NextResponse.json({ worker });
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
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile data." }, { status: 400 });
  }

  try {
    const worker = await prisma.worker.findUnique({
      where: { id: session.userId },
      select: {
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        professionalSummary: true,
        currentJobTitle: true,
        totalExperience: true,
        expectedSalary: true,
        preferredLocation: true,
        profilePhoto: true,
        resumeUrl: true,
        skills: { select: { id: true } },
        educations: { select: { id: true } },
        experiences: { select: { id: true } },
      },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    }

    const updatedWorker = await prisma.worker.update({
      where: { id: session.userId },
      data: {
        ...parsed.data,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        fullName: `${parsed.data.firstName ?? worker.firstName ?? ""} ${parsed.data.lastName ?? worker.lastName ?? ""}`.trim() || worker.fullName,
        profileCompletionPercentage: calculateProfileCompletion({
          firstName: parsed.data.firstName ?? worker.firstName,
          lastName: parsed.data.lastName ?? worker.lastName,
          email: worker.email,
          phone: parsed.data.phone ?? worker.phone,
          address: parsed.data.address ?? worker.address,
          professionalSummary: parsed.data.professionalSummary ?? worker.professionalSummary,
          currentJobTitle: parsed.data.currentJobTitle ?? worker.currentJobTitle,
          totalExperience: parsed.data.totalExperience ?? worker.totalExperience,
          expectedSalary: parsed.data.expectedSalary ?? worker.expectedSalary,
          preferredLocation: parsed.data.preferredLocation ?? worker.preferredLocation,
          profilePhoto: worker.profilePhoto,
          resumeUrl: worker.resumeUrl,
          skillsCount: worker.skills.length,
          educationCount: worker.educations.length,
          experienceCount: worker.experiences.length,
        }),
      },
    });

    const safeWorker = await prisma.worker.findUnique({
      where: { id: updatedWorker.id },
      select: {
        id: true,
        workerId: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        professionalSummary: true,
        currentJobTitle: true,
        totalExperience: true,
        expectedSalary: true,
        preferredLocation: true,
        linkedIn: true,
        github: true,
        portfolio: true,
        resumeUrl: true,
        profileCompletionPercentage: true,
        skills: { select: { id: true, skillName: true, skillLevel: true } },
        educations: { select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true } },
        experiences: { select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true } },
        resumes: { select: { id: true, fileName: true, fileSize: true, mimeType: true, uploadedAt: true, isActive: true } },
      },
    });

    return NextResponse.json({ worker: safeWorker });
  } catch (error) {
    console.error("Profile update failed.", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
