import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteInputSchema } from "@/lib/site";

const updateSiteSchema = siteInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { siteId } = await params;

  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        allowedRadiusMeters: true,
        isActive: true,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    return NextResponse.json({
      site: {
        ...site,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load site." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { siteId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid site payload." }, { status: 400 });
  }

  const parsed = siteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid site data." }, { status: 400 });
  }

  try {
    const site = await prisma.site.update({
      where: { id: siteId },
      data: {
        name: parsed.data.name,
        address: parsed.data.address,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        allowedRadiusMeters: parsed.data.allowedRadiusMeters,
        isActive: parsed.data.isActive,
      },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, allowedRadiusMeters: true, isActive: true },
    });

    return NextResponse.json({
      site: {
        ...site,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
      },
    });
  } catch {
    return NextResponse.json({ error: "Site could not be updated." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { siteId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid status payload." }, { status: 400 });
  }

  const parsed = updateSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status update." }, { status: 400 });
  }

  try {
    const site = await prisma.site.update({
      where: { id: siteId },
      data: {
        isActive: parsed.data.isActive,
      },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, allowedRadiusMeters: true, isActive: true },
    });

    return NextResponse.json({
      site: {
        ...site,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
      },
      message: `Site ${site.isActive ? "activated" : "deactivated"}.`,
    });
  } catch {
    return NextResponse.json({ error: "Site status could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { siteId } = await params;

  try {
    const workerCount = await prisma.worker.count({ where: { OR: [{ siteId }, { selectedSiteId: siteId }] } });
    if (workerCount > 0) {
      return NextResponse.json({ error: "This site cannot be deleted because workers are assigned to it." }, { status: 409 });
    }

    const attendanceCount = await prisma.attendance.count({ where: { siteId } });
    if (attendanceCount > 0) {
      return NextResponse.json(
        { error: "This site has historical attendance records and cannot be deleted. Deactivate it instead to preserve attendance history." },
        { status: 409 },
      );
    }

    await prisma.site.delete({ where: { id: siteId } });
    return NextResponse.json({ message: "Site deleted." });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    if ((error as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "This site has related records and cannot be deleted. Deactivate it instead to preserve attendance history." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Site could not be deleted." }, { status: 500 });
  }
}
