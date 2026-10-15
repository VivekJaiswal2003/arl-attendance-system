import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

const REQUIRED_WORKING_MINUTES = 8 * 60;

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const attendanceDate = indiaDateOnly();
  const attendance = await prisma.attendance.findUnique({
    where: { workerId_attendanceDate: { workerId: session.userId, attendanceDate } },
  });

  if (!attendance) {
    return NextResponse.json({ error: "No attendance check-in was found for today." }, { status: 404 });
  }
  if (attendance.checkOutTime || attendance.status === "COMPLETED") {
    return NextResponse.json({ error: "Attendance has already been completed for today.", attendance: { checkOutTime: attendance.checkOutTime?.toISOString(), totalWorkingMinutes: attendance.totalWorkingMinutes } }, { status: 409 });
  }
  if (attendance.status !== "IN_PROGRESS" && attendance.status !== "PRESENT") {
    return NextResponse.json({ error: "Only a valid attendance check-in can be checked out." }, { status: 422 });
  }

  const checkOutTime = new Date();
  const elapsedMilliseconds = checkOutTime.getTime() - attendance.checkInTime.getTime();
  const requiredMilliseconds = REQUIRED_WORKING_MINUTES * 60_000;
  if (elapsedMilliseconds < requiredMilliseconds) {
    const remainingMinutes = Math.ceil((requiredMilliseconds - elapsedMilliseconds) / 60_000);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const remaining = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return NextResponse.json({
      error: `You can check out after completing 8 hours. Please wait ${remaining}.`,
      remainingMinutes,
    }, { status: 422 });
  }

  const totalWorkingMinutes = Math.max(0, Math.floor((checkOutTime.getTime() - attendance.checkInTime.getTime()) / 60000));
  const updateResult = await prisma.attendance.updateMany({
    where: {
      id: attendance.id,
      checkOutTime: null,
      status: { in: ["IN_PROGRESS", "PRESENT"] },
    },
    data: {
      checkOutTime,
      totalWorkingMinutes,
      status: "COMPLETED",
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Attendance has already been completed for today." }, { status: 409 });
  }

  return NextResponse.json({
    message: "Attendance completed.",
    checkOutTime: checkOutTime.toISOString(),
    totalWorkingMinutes,
  });
}
