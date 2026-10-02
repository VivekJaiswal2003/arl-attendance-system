"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type DocumentItem = {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  updatedAt: string;
};

type WorkerProfileData = {
  id: string;
  workerId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  professionalSummary?: string | null;
  currentJobTitle?: string | null;
  totalExperience?: string | null;
  expectedSalary?: string | null;
  preferredLocation?: string | null;
  linkedIn?: string | null;
  github?: string | null;
  portfolio?: string | null;
  profileCompletionPercentage: number;
  document: DocumentItem | null;
};

const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const REQUIRED_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
  "ITI Certificate",
  "Bank Passbook",
  "10th Certificate",
  "12th Certificate",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export function WorkerProfileEditor({ initialWorker }: { initialWorker: WorkerProfileData }) {
  const [worker, setWorker] = useState(initialWorker);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const workerSummary = useMemo(() => {
    const values = [
      worker.firstName,
      worker.lastName,
      worker.email,
      worker.phone,
      worker.address,
      worker.professionalSummary,
      worker.currentJobTitle,
      worker.totalExperience,
      worker.expectedSalary,
      worker.preferredLocation,
      worker.linkedIn,
      worker.github,
      worker.portfolio,
    ];
    const filled = values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
    const documentFilled = worker.document ? 1 : 0;
    return Math.min(100, Math.max(0, Math.round(((filled + documentFilled) / (values.length + 1)) * 100)));
  }, [worker]);

  async function updateWorkerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Updating profile...");
    setError("");

    try {
      const response = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: worker.firstName ?? "",
          lastName: worker.lastName ?? "",
          email: worker.email ?? "",
          phone: worker.phone ?? "",
          address: worker.address ?? "",
          dateOfBirth: worker.dateOfBirth ?? "",
          professionalSummary: worker.professionalSummary ?? "",
          currentJobTitle: worker.currentJobTitle ?? "",
          totalExperience: worker.totalExperience ?? "",
          expectedSalary: worker.expectedSalary ?? "",
          preferredLocation: worker.preferredLocation ?? "",
          linkedIn: worker.linkedIn ?? "",
          github: worker.github ?? "",
          portfolio: worker.portfolio ?? "",
        }),
      });

      const result = await response.json() as { error?: string; worker?: WorkerProfileData };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save your profile.");
      }

      if (result.worker) {
        setWorker((current) => ({ ...current, ...result.worker }));
      }
      setStatus("Profile updated successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your profile.");
      setStatus("");
    }
  }

  function onDocumentFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setDocumentError("");
    if (!file) {
      setDocumentFile(null);
      return;
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setDocumentError("Only PDF files are accepted.");
      setDocumentFile(null);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setDocumentError("The file must be 20 MB or smaller.");
      setDocumentFile(null);
      event.target.value = "";
      return;
    }
    setDocumentFile(file);
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentFile) return;
    setUploading(true);
    setDocumentError("");
    try {
      const formData = new FormData();
      formData.append("document", documentFile);
      const response = await fetch("/api/worker/documents", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; document?: DocumentItem };
      if (!response.ok) throw new Error(result.error ?? "Unable to upload the document.");
      if (result.document) {
        setWorker((current) => ({ ...current, document: result.document! }));
      }
      setDocumentFile(null);
      setStatus("Documents uploaded successfully.");
    } catch (caughtError) {
      setDocumentError(caughtError instanceof Error ? caughtError.message : "Unable to upload the document.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument() {
    const confirmed = window.confirm("Remove your uploaded documents file? You will need to upload it again.");
    if (!confirmed) return;
    const response = await fetch("/api/worker/documents", { method: "DELETE" });
    if (response.ok) {
      setWorker((current) => ({ ...current, document: null }));
      setStatus("Document removed.");
    }
  }

  return (
    <div className="profile-stack">
      <div className="profile-header-row">
        <div>
          <div className="eyebrow">Professional profile</div>
          <h1>{worker.fullName || "Worker profile"}</h1>
        </div>
        <div className="status-badge">{workerSummary}% complete</div>
      </div>

      {error && <div className="form-error-block">{error}</div>}
      {status && <div className="success-banner">{status}</div>}

      <form className="profile-form" onSubmit={updateWorkerProfile}>
        <div className="profile-form-grid">
          <label className="form-label">First Name<input className="form-input" value={worker.firstName ?? ""} onChange={(event) => setWorker({ ...worker, firstName: event.target.value })} /></label>
          <label className="form-label">Last Name<input className="form-input" value={worker.lastName ?? ""} onChange={(event) => setWorker({ ...worker, lastName: event.target.value })} /></label>
          <label className="form-label">Email<input className="form-input" type="email" value={worker.email ?? ""} readOnly /></label>
          <label className="form-label">Phone<input className="form-input" type="tel" value={worker.phone ?? ""} onChange={(event) => setWorker({ ...worker, phone: event.target.value })} /></label>
          <label className="form-label">Date of birth<input className="form-input" type="date" value={worker.dateOfBirth ?? ""} onChange={(event) => setWorker({ ...worker, dateOfBirth: event.target.value })} /></label>
          <label className="form-label full-width">Professional Summary<textarea className="form-input" rows={4} value={worker.professionalSummary ?? ""} onChange={(event) => setWorker({ ...worker, professionalSummary: event.target.value })} /></label>
          <label className="form-label">Current Job Title<input className="form-input" value={worker.currentJobTitle ?? ""} onChange={(event) => setWorker({ ...worker, currentJobTitle: event.target.value })} /></label>
          <label className="form-label">Total Experience<input className="form-input" value={worker.totalExperience ?? ""} onChange={(event) => setWorker({ ...worker, totalExperience: event.target.value })} /></label>
          <label className="form-label">Expected Salary<input className="form-input" value={worker.expectedSalary ?? ""} onChange={(event) => setWorker({ ...worker, expectedSalary: event.target.value })} /></label>
          <label className="form-label">Preferred Location<input className="form-input" value={worker.preferredLocation ?? ""} onChange={(event) => setWorker({ ...worker, preferredLocation: event.target.value })} /></label>
          <label className="form-label">LinkedIn<input className="form-input" value={worker.linkedIn ?? ""} onChange={(event) => setWorker({ ...worker, linkedIn: event.target.value })} /></label>
          <label className="form-label">GitHub<input className="form-input" value={worker.github ?? ""} onChange={(event) => setWorker({ ...worker, github: event.target.value })} /></label>
          <label className="form-label">Portfolio<input className="form-input" value={worker.portfolio ?? ""} onChange={(event) => setWorker({ ...worker, portfolio: event.target.value })} /></label>
          <label className="form-label full-width">Address<input className="form-input" value={worker.address ?? ""} onChange={(event) => setWorker({ ...worker, address: event.target.value })} /></label>
        </div>
        <button className="button-primary" type="submit">Save profile</button>
      </form>

      <div className="profile-panel-block">
        <h3>Documents</h3>
        <p className="muted document-help-text">
          Upload a single PDF containing all of the following required documents: {REQUIRED_DOCUMENTS.join(", ")}.
          Maximum file size 20 MB, PDF only.
        </p>

        {worker.document ? (
          <div className="document-status-card">
            <span className="status-badge status-badge-success">Documents Uploaded ✓</span>
            <div className="document-meta">
              <strong>{worker.document.fileName}</strong>
              <span>{formatFileSize(worker.document.fileSize)} &middot; uploaded {formatDate(worker.document.uploadedAt)}</span>
            </div>
            <div className="document-actions">
              <a className="button-secondary small-button" href="/api/worker/documents/file" target="_blank" rel="noreferrer">View</a>
              <button className="button-danger small-button" type="button" onClick={deleteDocument}>Remove</button>
            </div>
          </div>
        ) : (
          <p className="muted">No documents uploaded yet.</p>
        )}

        <form className="inline-form document-upload-form" onSubmit={uploadDocument}>
          <input className="form-input" type="file" accept="application/pdf,.pdf" onChange={onDocumentFileChange} />
          <button className="button-primary" type="submit" disabled={!documentFile || uploading}>
            {uploading ? "Uploading..." : worker.document ? "Replace document" : "Upload document"}
          </button>
        </form>
        {documentError && <p className="form-error">{documentError}</p>}
      </div>
    </div>
  );
}
