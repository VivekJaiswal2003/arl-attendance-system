import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const siteSelectionSchema = z.object({
  selectedSiteId: z.string().trim().min(1, "Select an active work site.").max(191),
}).strict();

const siteSelect = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  allowedRadiusMeters: true,
  isActive: true,
} as const;

function serializeSite(site: { id: string; name: string; address: string; latitude: { toNumber(): number }; longitude: { toNumber(): number }; allowedRadiusMeters: number; isActive: boolean }) {
  return {
    id: site.id,
    name: site.name,
    address: site.address,
    latitude: site.latitude.toNumber(),
    longitude: site.longitude.toNumber(),
    allowedRadiusMeters: site.allowedRadiusMeters,
    isActive: site.isActive,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const [worker, availableSites] = await Promise.all([
    prisma.worker.findUnique({
      where: { id: session.userId },
      select: {
        selectedSiteId: true,
        selectedSite: { select: siteSelect },
      },
    }),
    prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: siteSelect,
    }),
  ]);

  return NextResponse.json({
    selectedSiteId: worker?.selectedSiteId ?? null,
    selectedSite: worker?.selectedSite ? serializeSite(worker.selectedSite) : null,
    availableSites: availableSites.map(serializeSite),
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid site selection." }, { status: 400 });
  }

  const parsed = siteSelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid site selection." }, { status: 400 });
  }

  const [worker, site] = await Promise.all([
    prisma.worker.findUnique({ where: { id: session.userId }, select: { id: true, isActive: true } }),
    prisma.site.findFirst({ where: { id: parsed.data.selectedSiteId, isActive: true }, select: siteSelect }),
  ]);

  if (!worker || !worker.isActive) {
    return NextResponse.json({ error: "Worker not found or inactive." }, { status: 404 });
  }
  if (!site) {
    return NextResponse.json({ error: "That work site is unavailable. Select an active site." }, { status: 422 });
  }

  const updatedWorker = await prisma.worker.update({
    where: { id: session.userId },
    data: { selectedSiteId: site.id },
    select: { selectedSiteId: true },
  });

  return NextResponse.json({
    selectedSiteId: updatedWorker.selectedSiteId,
    selectedSite: serializeSite(site),
    message: "Work site selection saved.",
  });
}