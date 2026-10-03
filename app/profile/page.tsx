import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateProfileCompletion } from "@/lib/profile";
import { WorkerProfileEditor } from "@/components/WorkerProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    redirect("/login");
  }

  const worker = await prisma.worker.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      workerId: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      professionalSummary: true,
      currentJobTitle: true,
      totalExperience: true,
      expectedSalary: true,
      preferredLocation: true,
      profilePhoto: true,
      resumeUrl: true,
      skills: { orderBy: { skillName: "asc" }, select: { id: true, skillName: true, skillLevel: true } },
      educations: { orderBy: { endYear: "desc" }, select: { id: true, degree: true, fieldOfStudy: true, institution: true, startYear: true, endYear: true, grade: true, description: true } },
      experiences: { orderBy: { startDate: "desc" }, select: { id: true, companyName: true, jobTitle: true, employmentType: true, startDate: true, endDate: true, currentlyWorking: true, location: true, description: true } },
      resumes: { orderBy: { uploadedAt: "desc" }, where: { isActive: true }, select: { id: true, fileName: true, fileSize: true, mimeType: true } },
      document: { select: { id: true, fileName: true, fileSize: true, contentType: true, uploadedAt: true, updatedAt: true } },
    },
  });

  if (!worker) {
    redirect("/login");
  }

  const completion = calculateProfileCompletion({
    firstName: worker.firstName,
    lastName: worker.lastName,
    email: worker.email,
    phone: worker.phone,
    address: worker.address,
    professionalSummary: worker.professionalSummary,
    currentJobTitle: worker.currentJobTitle,
    totalExperience: worker.totalExperience,
    expectedSalary: worker.expectedSalary,
    preferredLocation: worker.preferredLocation,
    profilePhoto: worker.profilePhoto,
    resumeUrl: worker.resumeUrl,
    skillsCount: worker.skills.length,
    educationCount: worker.educations.length,
    experienceCount: worker.experiences.length,
  });

  await prisma.worker.update({
    where: { id: worker.id },
    data: { profileCompletionPercentage: completion },
  });

  const dateValue = (value: Date | null) => value ? value.toISOString().slice(0, 10) : null;

  return (
    <main className="worker-page">
      <div className="worker-container" style={{ maxWidth: 900 }}>
        <div className="worker-brand-row"><div className="worker-brand">ARL ENGINEERS<small>Workforce profile</small></div><div className="worker-nav-actions"><Link href="/worker" className="button-secondary small-button">Worker dashboard</Link></div></div>
        <WorkerProfileEditor initialWorker={{
          id: worker.id,
          workerId: worker.workerId,
          fullName: worker.fullName,
          firstName: worker.firstName,
          lastName: worker.lastName,
          email: worker.email,
          phone: worker.phone,
          address: worker.address,
          dateOfBirth: dateValue(worker.dateOfBirth),
          currentJobTitle: worker.currentJobTitle,
          totalExperience: worker.totalExperience,
          preferredLocation: worker.preferredLocation,
          profileCompletionPercentage: completion,
          document: worker.document
            ? {
                id: worker.document.id,
                fileName: worker.document.fileName,
                fileSize: worker.document.fileSize,
                contentType: worker.document.contentType,
                uploadedAt: worker.document.uploadedAt.toISOString(),
                updatedAt: worker.document.updatedAt.toISOString(),
              }
            : null,
        }} />
      </div>
    </main>
  );
}
