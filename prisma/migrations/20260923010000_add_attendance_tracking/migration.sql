-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'OUTSIDE_SITE');

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "distanceFromSiteMeters" DECIMAL(10,2) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_workerId_attendanceDate_key"
ON "Attendance"("workerId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
