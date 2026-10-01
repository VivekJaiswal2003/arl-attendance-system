"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { INDIA_TIMEZONE } from "@/lib/time";

type SiteOption = { id: string; name: string; address: string; allowedRadiusMeters: number };
type Attendance = { status: string; checkInTime: string; checkOutTime?: string | null; distanceFromSiteMeters: number; totalWorkingMinutes?: number | null } | null;

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "In Progress";
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export function WorkerAttendanceControls({ selectedSite, availableSites, selectionIssue, initialAttendance, compact = false }: { selectedSite: SiteOption | null; availableSites: SiteOption[]; selectionIssue?: string; initialAttendance: Attendance; compact?: boolean }) {
  const [site, setSite] = useState(selectedSite);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [busy, setBusy] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");
  const [selectionError, setSelectionError] = useState(selectionIssue ?? "");
  const [locationStatus, setLocationStatus] = useState("Location not checked");

  async function selectSite(event: ChangeEvent<HTMLSelectElement>) {
    const selectedSiteId = event.currentTarget.value;
    if (!selectedSiteId) return;

    setSelectionBusy(true);
    setSelectionError("");
    setSelectionMessage("");
    try {
      const response = await fetch("/api/worker/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSiteId }),
      });
      const result = await response.json() as { error?: string; message?: string; selectedSite?: SiteOption };
      if (!response.ok || !result.selectedSite) {
        throw new Error(result.error ?? "Unable to save the selected work site.");
      }
      setSite(result.selectedSite);
      setSelectionMessage(result.message ?? "Work site selection saved.");
      setError("");
    } catch (caughtError) {
      setSelectionError(caughtError instanceof Error ? caughtError.message : "Unable to save the selected work site.");
    } finally {
      setSelectionBusy(false);
    }
  }

  async function markAttendance() {
    if (!site) {
      setError("Please select a work site before marking attendance.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Verifying location...");
    setLocationStatus("Requesting GPS location...");
    let gpsReceived = false;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Unable to access your location. Please enable location services."));
        navigator.geolocation.getCurrentPosition(resolve, (geoError) => {
          if (geoError.code === geoError.PERMISSION_DENIED) return reject(new Error("Location permission is required to mark attendance."));
          if (geoError.code === geoError.TIMEOUT) return reject(new Error("Location request timed out. Please try again."));
          if (geoError.code === geoError.POSITION_UNAVAILABLE) return reject(new Error("GPS location is unavailable. Check that location services are enabled and try again."));
          reject(new Error("Unable to access your location. Please enable location services."));
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });
      gpsReceived = true;
      setLocationStatus("GPS location received");
      const response = await fetch("/api/worker/attendance/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }) });
      const result = await response.json() as { error?: string; message?: string; status?: string; distanceFromSiteMeters?: number; allowedRadiusMeters?: number; siteName?: string; checkInTime?: string };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong. Please try again.");
      setAttendance({ status: result.status ?? "IN_PROGRESS", checkInTime: result.checkInTime ?? new Date().toISOString(), distanceFromSiteMeters: result.distanceFromSiteMeters ?? 0, totalWorkingMinutes: null });
      setMessage(result.message ?? "Attendance marked successfully.");
    } catch (caughtError) {
      setLocationStatus(gpsReceived ? "GPS location received" : "GPS verification failed");
      setMessage("");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError("");
    setMessage("Checking out...");
    try {
      const response = await fetch("/api/worker/attendance/check-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json() as { error?: string; message?: string; checkOutTime?: string; totalWorkingMinutes?: number };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong. Please try again.");
      setAttendance((current) => current ? { ...current, status: "COMPLETED", checkOutTime: result.checkOutTime, totalWorkingMinutes: result.totalWorkingMinutes } : current);
      setMessage(result.message ?? "Attendance completed.");
    } catch (caughtError) {
      setMessage("");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const complete = attendance?.status === "COMPLETED" || Boolean(attendance?.checkOutTime);
  const checkedIn = Boolean(attendance) && !complete;
  return <section className={compact ? "attendance-controls compact-controls" : "attendance-controls"}>
    <label className="form-label">Select Work Site<select className="form-input" value={site?.id ?? ""} onChange={(event) => void selectSite(event)} disabled={selectionBusy || availableSites.length === 0}>
      <option value="" disabled>Select an active work site</option>
      {availableSites.map((availableSite) => <option value={availableSite.id} key={availableSite.id}>{availableSite.name} — {availableSite.address}</option>)}
    </select></label>
    {!site && availableSites.length > 0 && <p className="muted">Please select a work site before marking attendance.</p>}
    {availableSites.length === 0 && <p className="muted">No active work sites are currently available.</p>}
    {site && <div className="site-selection-summary"><div className="detail-label">Selected Site</div><strong>{site.name}</strong><span>{site.address}</span><span>Allowed radius: {site.allowedRadiusMeters} meters</span></div>}
    {selectionError && <p className="form-error" role="alert">{selectionError}</p>}
    {selectionMessage && <p className="form-success" role="status">{selectionMessage}</p>}
    <div className="status-detail">GPS status: {locationStatus}</div>
    {attendance && <div className="attendance-status"><div className="detail-label">Today&apos;s attendance</div><div className="detail-value">{complete ? "Attendance completed" : "In Progress"}</div><div className="status-detail">Checked in at {new Date(attendance.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: INDIA_TIMEZONE })} · {Math.round(attendance.distanceFromSiteMeters)} m from site{complete ? ` · Working hours: ${formatMinutes(attendance.totalWorkingMinutes)}` : ""}</div></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="form-success" role="status">{message}</p>}
    {!attendance && <button className="button-primary worker-action" type="button" onClick={() => void markAttendance()} disabled={busy || !site}>{busy ? "Verifying Location..." : "Mark Attendance"}</button>}
    {checkedIn && <button className="button-primary worker-action" type="button" onClick={() => void checkOut()} disabled={busy}>{busy ? "Checking out..." : "Check Out"}</button>}
    <Link href="/profile" className="button-secondary worker-action" style={{ display: "block", textAlign: "center", marginTop: 10 }}>Manage profile</Link>
  </section>;
}
