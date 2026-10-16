import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReportWhere, normalizeReportFilters } from "../lib/attendance-report.ts";
import { completedDurationSeconds, formatDuration, summarizeReport } from "../lib/report-metrics.ts";
import { indiaDateKey, indiaMonthRange } from "../lib/time.ts";

const d = (iso) => new Date(iso);

function record(overrides) {
  const checkInTime = overrides.checkInTime ?? d("2026-10-05T04:00:00Z");
  return { status: "COMPLETED", checkOutTime: null, siteId: "s1", checkInTime, dateKey: indiaDateKey(checkInTime), ...overrides };
}

test("October range is Oct 1 - Nov 1 IST", () => {
  const { start, end } = indiaMonthRange("2026-10");
  assert.equal(start.toISOString(), "2026-09-30T18:30:00.000Z");
  assert.equal(end.toISOString(), "2026-10-31T18:30:00.000Z");
});

test("December rolls over to January", () => {
  const { end } = indiaMonthRange("2026-12");
  assert.equal(end.toISOString(), "2026-12-31T18:30:00.000Z");
});

test("September/October boundary uses IST check-in instants", () => {
  const { start, end } = indiaMonthRange("2026-10");
  const inRange = (date) => date >= start && date < end;
  assert.equal(inRange(d("2026-09-30T18:29:59Z")), false); // Sep 30 23:59 IST
  assert.equal(inRange(d("2026-09-30T18:30:00Z")), true); // Oct 1 00:00 IST
  assert.equal(inRange(d("2026-10-31T18:29:59Z")), true); // Oct 31 23:59 IST
  assert.equal(inRange(d("2026-10-31T18:30:00Z")), false); // Nov 1 00:00 IST
  assert.equal(indiaDateKey(d("2026-09-30T18:30:00Z")), "2026-10-01");
});

test("page and CSV share the same filter for month, worker, site and status", () => {
  const filters = normalizeReportFilters({ month: "2026-10", worker: "w1", site: "s1", status: "COMPLETED" });
  const { start, end } = indiaMonthRange(filters.month);
  assert.deepEqual(buildReportWhere(start, end, filters), {
    checkInTime: { gte: start, lt: end },
    workerId: "w1",
    siteId: "s1",
    status: "COMPLETED",
  });
  const fallback = normalizeReportFilters({ month: "2026-13", worker: "all", status: "bogus" });
  assert.match(fallback.month, /^\d{4}-\d{2}$/);
  assert.equal(fallback.worker, undefined);
  assert.equal(fallback.status, undefined);
});

test("zero completed records gives no average and zero totals", () => {
  const summary = summarizeReport([record({ status: "IN_PROGRESS" })]);
  assert.equal(summary.completedCount, 0);
  assert.equal(summary.completedSeconds, 0);
  assert.equal(summary.averageSeconds, null);
  assert.equal(summary.presentDays, 1);
  assert.equal(summarizeReport([]).averageSeconds, null);
});

test("in-progress, reversed and missing checkout are excluded from completed metrics", () => {
  assert.equal(completedDurationSeconds(record({ status: "IN_PROGRESS", checkOutTime: d("2026-10-05T12:00:00Z") })), null);
  assert.equal(completedDurationSeconds(record({ checkOutTime: null })), null);
  assert.equal(completedDurationSeconds(record({ checkOutTime: d("2026-10-05T03:00:00Z") })), null);
  assert.equal(completedDurationSeconds(record({ checkOutTime: new Date("invalid") })), null);
  assert.equal(completedDurationSeconds(record({ checkOutTime: d("2026-10-05T12:00:00Z") })), 8 * 3600);
});

test("average is total / count without per-record rounding", () => {
  const records = [1, 2, 3].map((i) => record({
    checkInTime: d(`2026-10-0${i}T04:00:00Z`),
    checkOutTime: d(`2026-10-0${i}T04:00:20Z`),
  }));
  const summary = summarizeReport(records);
  assert.equal(summary.completedSeconds, 60);
  assert.equal(summary.averageSeconds, 20);
  assert.equal(formatDuration(summary.completedSeconds), "1m");
  assert.equal(formatDuration(summary.averageSeconds), "20s");
  assert.equal(formatDuration(90), "1m 30s");
  assert.equal(formatDuration(60 * 60), "1h 0m");
  assert.equal(formatDuration(8 * 3600 + 30 * 60), "8h 30m");
});

test("present days count distinct dates and per-site totals", () => {
  const a = record({ checkInTime: d("2026-10-05T04:00:00Z"), checkOutTime: d("2026-10-05T13:00:00Z") });
  const b = record({ checkInTime: d("2026-10-05T05:00:00Z"), status: "IN_PROGRESS", siteId: "s2" });
  const c = record({ checkInTime: d("2026-10-06T04:00:00Z"), status: "OUTSIDE_SITE" });
  const summary = summarizeReport([a, b, c]);
  assert.equal(summary.presentDays, 1);
  assert.equal(summary.sites.get("s1").records, 2);
  assert.equal(summary.sites.get("s1").presentDays, 1);
  assert.equal(summary.sites.get("s1").completedSeconds, 9 * 3600);
  assert.equal(summary.sites.get("s2").presentDays, 1);
});
