export type WorkerProfileCompletionInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  professionalSummary?: string | null;
  currentJobTitle?: string | null;
  totalExperience?: string | null;
  expectedSalary?: string | null;
  preferredLocation?: string | null;
  profilePhoto?: string | null;
  resumeUrl?: string | null;
  skillsCount?: number;
  educationCount?: number;
  experienceCount?: number;
};

export function calculateProfileCompletion(data: WorkerProfileCompletionInput): number {
  const fields = [
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.address,
    data.professionalSummary,
    data.currentJobTitle,
    data.totalExperience,
    data.expectedSalary,
    data.preferredLocation,
    data.profilePhoto,
    data.resumeUrl,
  ];

  const filledFieldCount = fields.filter((value) => typeof value === "string" && value.trim().length > 0).length;
  const optionalContribution = (data.skillsCount ?? 0) > 0 ? 1 : 0;
  const educationContribution = (data.educationCount ?? 0) > 0 ? 1 : 0;
  const experienceContribution = (data.experienceCount ?? 0) > 0 ? 1 : 0;
  const totalWeight = fields.length + 3;
  const score = (filledFieldCount + optionalContribution + educationContribution + experienceContribution) / totalWeight;

  return Math.min(100, Math.max(0, Math.round(score * 100)));
}
