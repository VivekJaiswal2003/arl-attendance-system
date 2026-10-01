-- AlterTable
ALTER TABLE "Worker"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "gender" TEXT,
ADD COLUMN "profilePhoto" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "professionalSummary" TEXT,
ADD COLUMN "currentJobTitle" TEXT,
ADD COLUMN "totalExperience" TEXT,
ADD COLUMN "expectedSalary" TEXT,
ADD COLUMN "preferredLocation" TEXT,
ADD COLUMN "linkedIn" TEXT,
ADD COLUMN "github" TEXT,
ADD COLUMN "portfolio" TEXT,
ADD COLUMN "resumeUrl" TEXT,
ADD COLUMN "profileCompletionPercentage" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WorkerEducation" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "institution" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "grade" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerExperience" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "currentlyWorking" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerSkill" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerResume" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerSkill_workerId_skillName_key" ON "WorkerSkill"("workerId", "skillName");

-- AddForeignKey
ALTER TABLE "WorkerEducation"
ADD CONSTRAINT "WorkerEducation_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerExperience"
ADD CONSTRAINT "WorkerExperience_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSkill"
ADD CONSTRAINT "WorkerSkill_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerResume"
ADD CONSTRAINT "WorkerResume_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
