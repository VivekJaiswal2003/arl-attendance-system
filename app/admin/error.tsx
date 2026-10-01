"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content"><section className="panel empty-state error-state"><strong>We could not load this workspace</strong><span>Try again in a moment. Your account and data are unchanged.</span><button className="button-secondary" type="button" onClick={reset}>Try again</button></section></main>;
}