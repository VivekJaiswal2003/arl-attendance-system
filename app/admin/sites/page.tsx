import { AdminShell } from "@/components/AdminShell";
import { SitesManager } from "@/components/SitesManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const sites = await prisma.site.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      allowedRadiusMeters: true,
      isActive: true,
      _count: { select: { workers: true } },
    },
  });

  const normalizedSites = sites.map((site) => ({
    ...site,
    latitude: Number(site.latitude),
    longitude: Number(site.longitude),
    assignedWorkers: site._count.workers,
  }));

  return (
    <AdminShell title="Sites">
      <SitesManager initialSites={normalizedSites} />
    </AdminShell>
  );
}
