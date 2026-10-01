-- AlterTable
ALTER TABLE "Worker"
ADD COLUMN "selectedSiteId" TEXT;

-- AlterTable
ALTER TABLE "Attendance"
ADD COLUMN "checkOutTime" TIMESTAMP(3),
ADD COLUMN "checkOutLatitude" DECIMAL(9,6),
ADD COLUMN "checkOutLongitude" DECIMAL(9,6),
ADD COLUMN "totalWorkingMinutes" INTEGER;

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "AttendanceStatus" ADD VALUE 'COMPLETED';

-- AddForeignKey
ALTER TABLE "Worker"
ADD CONSTRAINT "Worker_selectedSiteId_fkey"
FOREIGN KEY ("selectedSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
