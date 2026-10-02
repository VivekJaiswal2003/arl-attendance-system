import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

const checkInSchema = z.object({
  siteId: z.string().min(1, "Select a work site."),
  latitude: z.coerce.number().refine((value) => Number.isFinite(value), {
    message: "Latitude must be a valid number.",
  }),
  longitude: z.coerce.number().refine((value) => Number.isFinite(value), {
    message: "Longitude must be a valid number.",
  }),
  accuracy: z.coerce.number().optional(),
  timestamp: z.coerce.number().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  }

  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location data." }, { status: 400 });
  }

  const latitude = parsed.data.latitude;
  const longitude = parsed.data.longitude;
  const accuracy = parsed.data.accuracy ?? Number.POSITIVE_INFINITY;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return NextResponse.json({ error: "Latitude must be between -90 and 90." }, { status: 400 });
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Longitude must be between -180 and 180." }, { status: 400 });
  }

  if (Number.isFinite(accuracy) && accuracy > 200) {
    return NextResponse.json({
      error: "GPS accuracy is too poor. Please enable better location accuracy and try again.",
    }, { status: 422 });
  }

  try {
    const worker = await prisma.worker.findUnique({ where: { id: session.userId }, select: { id: true } });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    }

    const site = await prisma.site.findFirst({ where: { id: parsed.data.siteId, isActive: true } });
    if (!site) {
      return NextResponse.json({ error: "Selected work site is not active or no longer exists." }, { status: 422 });
    }

    const attendanceDate = indiaDateOnly();

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        workerId_attendanceDate: {
          workerId: worker.id,
          attendanceDate,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json({ error: "Attendance already marked for today." }, { status: 409 });
    }

    const distanceFromSiteMeters = haversineDistanceMeters(
      latitude,
      longitude,
      Number(site.latitude),
      Number(site.longitude),
    );

    const withinRadius = distanceFromSiteMeters <= site.allowedRadiusMeters;
    if (!withinRadius) {
      return NextResponse.json({ error: "You are outside the allowed work-site area.", distanceFromSiteMeters, allowedRadiusMeters: site.allowedRadiusMeters, status: "OUTSIDE_SITE" }, { status: 422 });
    }
    const status = "PRESENT";

    const checkInTime = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        workerId: worker.id,
        siteId: site.id,
        attendanceDate,
        checkInTime,
        latitude: latitude,
        longitude: longitude,
        distanceFromSiteMeters: distanceFromSiteMeters,
        status,
      },
    });

    return NextResponse.json({
      status,
      message: "Attendance marked successfully.",
      distanceFromSiteMeters: Number(attendance.distanceFromSiteMeters),
      checkInTime: attendance.checkInTime.toISOString(),
    }, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Attendance already marked for today." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
