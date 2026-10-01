import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = body as { latitude?: unknown; longitude?: unknown };
  const latitude = typeof payload.latitude === "number" && Number.isFinite(payload.latitude) ? payload.latitude : null;
  const longitude = typeof payload.longitude === "number" && Number.isFinite(payload.longitude) ? payload.longitude : null;
  if (latitude !== null && (latitude < -90 || latitude > 90) || longitude !== null && (longitude < -180 || longitude > 180)) {
    return NextResponse.json({ error: "Invalid checkout location." }, { status: 400 });
  }

  const attendanceDate = indiaDateOnly();
  const attendance = await prisma.attendance.findUnique({
    where: { workerId_attendanceDate: { workerId: session.userId, attendanceDate } },
    select: { id: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true, status: true },
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
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) {
    return NextResponse.json({ error: "The attendance check-in time is invalid. Please contact the administrator." }, { status: 422 });
  }
  const totalWorkingMinutes = Math.floor(elapsedMilliseconds / 60000);
  const completion = await prisma.attendance.updateMany({
    where: {
      id: attendance.id,
      checkOutTime: null,
      status: { in: ["IN_PROGRESS", "PRESENT"] },
    },
    data: {
      checkOutTime,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      totalWorkingMinutes,
      status: "COMPLETED",
    },
  });

  if (completion.count === 0) {
    return NextResponse.json({ error: "Attendance has already been completed for today." }, { status: 409 });
  }

  const updated = await prisma.attendance.findUnique({
    where: { id: attendance.id },
    select: { checkOutTime: true, totalWorkingMinutes: true },
  });
  if (!updated) {
    return NextResponse.json({ error: "Attendance record could not be loaded." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Attendance completed.",
    checkOutTime: updated.checkOutTime?.toISOString(),
    totalWorkingMinutes: updated.totalWorkingMinutes,
  });
}
