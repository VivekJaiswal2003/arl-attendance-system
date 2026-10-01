"use client";

import { FormEvent, useMemo, useState } from "react";

type SiteRecord = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  isActive: boolean;
  assignedWorkers?: number;
};

const emptyForm = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  allowedRadiusMeters: "",
  isActive: true,
};

export function SitesManager({ initialSites }: { initialSites: SiteRecord[] }) {
  const [sites, setSites] = useState(initialSites);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeCount = useMemo(
    () => sites.filter((site) => site.isActive).length,
    [sites],
  );

  const updateField = (field: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      name: form.name,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      allowedRadiusMeters: Number(form.allowedRadiusMeters),
      isActive: form.isActive,
    };

    try {
      const url = editingId ? `/api/admin/sites/${editingId}` : "/api/admin/sites";
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as { error?: string; site?: SiteRecord; message?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save site.");
      }

      if (editingId && result.site) {
        setSites((current) => current.map((site) => site.id === editingId ? result.site! : site));
        setNotice(`Updated ${result.site.name}.`);
      } else if (result.site) {
        setSites((current) => [result.site!, ...current]);
        setNotice(`Created ${result.site.name}.`);
      }

      setForm(emptyForm);
      setEditingId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save site.");
    } finally {
      setSaving(false);
    }
  }

  async function startEdit(site: SiteRecord) {
    setError(null);
    setNotice(null);
    setEditingId(site.id);
    setForm({
      name: site.name,
      address: site.address,
      latitude: String(site.latitude),
      longitude: String(site.longitude),
      allowedRadiusMeters: String(site.allowedRadiusMeters),
      isActive: site.isActive,
    });
  }

  async function toggleSite(siteId: string, isActive: boolean) {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = await response.json() as { error?: string; site?: SiteRecord; message?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update site status.");
      }
      setSites((current) => current.map((site) => site.id === siteId ? result.site! : site));
      setNotice(result.message ?? "Site status updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update site status.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSite(siteId: string) {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete site.");
      }
      setSites((current) => current.filter((site) => site.id !== siteId));
      if (editingId === siteId) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setNotice(result.message ?? "Site deleted.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete site.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Sites</h1>
          <p>Configure work locations and attendance verification boundaries.</p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setError(null);
            setNotice(null);
          }}
        >
          {editingId ? "Cancel edit" : "Add site"}
        </button>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Configured sites</h2>
          <span className="panel-note">{activeCount} active</span>
        </div>

        <form className="site-form" onSubmit={submitForm}>
          <div className="site-form-grid">
            <label className="form-label compact">
              Site name
              <input className="form-input" value={form.name} onChange={(event) => updateField("name", event.target.value)} disabled={saving} required />
            </label>
            <label className="form-label compact">
              Address
              <input className="form-input" value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={saving} required />
            </label>
            <label className="form-label compact">
              Latitude
              <input className="form-input" type="number" step="0.000001" min="-90" max="90" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} disabled={saving} required />
            </label>
            <label className="form-label compact">
              Longitude
              <input className="form-input" type="number" step="0.000001" min="-180" max="180" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} disabled={saving} required />
            </label>
            <label className="form-label compact">
              Allowed radius (meters)
              <input className="form-input" type="number" step="1" min="1" value={form.allowedRadiusMeters} onChange={(event) => updateField("allowedRadiusMeters", event.target.value)} disabled={saving} required />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} disabled={saving} />
              Site active
            </label>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}

          <div className="site-form-actions">
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? (editingId ? "Saving..." : "Creating...") : editingId ? "Save changes" : "Create site"}
            </button>
          </div>
        </form>

        {sites.length === 0 ? (
          <div className="empty-state">
            <strong>No sites configured</strong>
            Add a work site before assigning workers or enabling attendance verification.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Coordinates</th>
                  <th>Radius</th>
                  <th>Workers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <div className="site-name-cell">
                        <strong>{site.name}</strong>
                        <span>{site.address}</span>
                      </div>
                    </td>
                    <td>{site.latitude}, {site.longitude}</td>
                    <td>{site.allowedRadiusMeters} m</td>
                    <td>{site.assignedWorkers ?? 0}</td>
                    <td>
                      <span className={`status ${site.isActive ? "status-present" : "status-absent"}`}>
                        {site.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="site-actions">
                        <button className="button-secondary small-button" type="button" onClick={() => startEdit(site)} disabled={saving}>Edit</button>
                        <button className="button-secondary small-button" type="button" onClick={() => toggleSite(site.id, site.isActive)} disabled={saving}>
                          {site.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button className="button-danger small-button" type="button" onClick={() => deleteSite(site.id)} disabled={saving}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
