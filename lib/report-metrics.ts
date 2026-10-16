export const ACCEPTED_STATUSES: ReadonlySet<string> = new Set(["PRESENT", "IN_PROGRESS", "COMPLETED"]);

export type ReportMetricRecord = {
  status: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  siteId: string;
  // India-local calendar date key (YYYY-MM-DD) derived from the check-in instant.
  dateKey: string;
};

/**
 * Duration in whole seconds between the server-recorded check-in and
 * check-out. Returns null unless the record is COMPLETED with valid,
 * non-reversed timestamps, so in-progress and corrupt rows are never counted.
 */
export function completedDurationSeconds(record: Pick<ReportMetricRecord, "status" | "checkInTime" | "checkOutTime">): number | null {
  if (record.status !== "COMPLETED" || !record.checkOutTime) return null;
  const start = record.checkInTime.getTime();
  const end = record.checkOutTime.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 1000);
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const duration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  return remainingSeconds > 0 ? `${duration} ${remainingSeconds}s` : duration;
}

export type ReportSummary = {
  recordCount: number;
  presentDays: number;
  completedCount: number;
  completedSeconds: number;
  averageSeconds: number | null;
  sites: Map<string, { records: number; presentDays: number; completedSeconds: number }>;
};

export function summarizeReport(records: ReportMetricRecord[]): ReportSummary {
  const presentDates = new Set<string>();
  const sitePresentDates = new Map<string, Set<string>>();
  const sites = new Map<string, { records: number; presentDays: number; completedSeconds: number }>();
  let completedCount = 0;
  let completedSeconds = 0;

  for (const record of records) {
    const site = sites.get(record.siteId) ?? { records: 0, presentDays: 0, completedSeconds: 0 };
    site.records += 1;
    sites.set(record.siteId, site);

    if (ACCEPTED_STATUSES.has(record.status)) {
      presentDates.add(record.dateKey);
      const dates = sitePresentDates.get(record.siteId) ?? new Set<string>();
      dates.add(record.dateKey);
      sitePresentDates.set(record.siteId, dates);
    }

    const seconds = completedDurationSeconds(record);
    if (seconds !== null) {
      completedCount += 1;
      completedSeconds += seconds;
      site.completedSeconds += seconds;
    }
  }

  for (const [siteId, dates] of sitePresentDates) {
    sites.get(siteId)!.presentDays = dates.size;
  }

  return {
    recordCount: records.length,
    presentDays: presentDates.size,
    completedCount,
    completedSeconds,
    averageSeconds: completedCount > 0 ? Math.round(completedSeconds / completedCount) : null,
    sites,
  };
}
