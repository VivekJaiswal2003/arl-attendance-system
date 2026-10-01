"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { redirectTo?: string; error?: string };
      if (!response.ok || !result.redirectTo) {
        setError(result.error ?? "Unable to create your account.");
        return;
      }
      window.location.href = result.redirectTo;
    } catch {
      setError("Registration is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-box" style={{ width: "min(100%, 560px)" }}>
        <div className="login-header">
          <div className="login-kicker">ARL ENGINEERS</div>
          <h1>Create account</h1>
          <p>Register as a worker and complete your professional profile.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="site-form-grid">
            <label className="form-label">First Name<input className="form-input" type="text" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} disabled={isSubmitting} /></label>
            <label className="form-label">Last Name<input className="form-input" type="text" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} disabled={isSubmitting} /></label>
            <label className="form-label">Email<input className="form-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={isSubmitting} /></label>
            <label className="form-label">Phone<input className="form-input" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} disabled={isSubmitting} /></label>
            <label className="form-label">Password<input className="form-input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} disabled={isSubmitting} /></label>
            <label className="form-label">Confirm Password<input className="form-input" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} disabled={isSubmitting} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 18, textAlign: "center" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
