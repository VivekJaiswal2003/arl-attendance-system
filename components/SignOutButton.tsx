"use client";

import { useState } from "react";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return <button className="sign-out-button" type="button" onClick={signOut} disabled={isSigningOut}>{isSigningOut ? "Signing out..." : "Sign out"}</button>;
}