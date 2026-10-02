"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteWorkerButton({ workerId, workerName }: { workerId: string; workerName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteWorker() {
    const confirmed = window.confirm(
      `Deactivate ${workerName}? They will no longer be able to log in or check in, but their attendance history and records will be preserved.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/workers/${workerId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to deactivate this worker.");
      }
      router.push("/admin/workers");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to deactivate this worker.");
      setBusy(false);
    }
  }

  return (
    <div className="delete-worker-control">
      <button type="button" className="button-danger small-button" onClick={deleteWorker} disabled={busy}>
        {busy ? "Deactivating..." : "Delete worker"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
