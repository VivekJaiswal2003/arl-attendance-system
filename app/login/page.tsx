"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

export default function LoginPage() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "forbidden") {
      setError("You do not have permission to access that area.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!identity.trim() || !password) {
      setError("Enter your employee ID or email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password }),
      });
      const result = await response.json() as { redirectTo?: string; error?: string };
      if (!response.ok || !result.redirectTo) {
        setError(result.error ?? "Sign-in failed. Try again.");
        return;
      }
      window.location.href = result.redirectTo;
    } catch {
      setError("Sign-in is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-box">
        <div className="login-header">
          <div className="login-kicker">ARL ENGINEERS</div>
          <h1>Workforce Attendance</h1>
          <p>Secure workforce operations, in one place.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="form-label">Employee ID or email<input className="form-input" type="text" name="identity" autoComplete="username" value={identity} onChange={(event) => setIdentity(event.target.value)} disabled={isSubmitting} /></label>
          <label className="form-label">Password<input className="form-input" type="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 18, textAlign: "center" }}>
          Need an account? <Link href="/register" style={{ color: "var(--blue)", fontWeight: 700 }}>Create one here</Link>
        </p>
      </div>
    </main>
  );
}
