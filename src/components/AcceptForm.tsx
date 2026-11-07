"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MESSAGES: Record<string, string> = {
  age_required: "Tick the box to confirm you’re 18 or over.",
  already_booked: "You already have a place at Emerge, so this one stays with them.",
  cancelled: "The transfer was cancelled.",
  lapsed: "Transfers have closed.",
  invalid: "This link isn’t valid any more.",
  error: "Something went wrong. Try again.",
};

export function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("age")) return setError(MESSAGES.age_required);
    setBusy(true);
    setError("");
    try {
      const r = await (
        await fetch("/api/transfer/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, age: true, marketing: f.get("marketing") === "on" }),
        })
      ).json();
      if (r.result === "accepted" || r.result === "already_accepted") {
        router.refresh();
        return;
      }
      setError(MESSAGES[r.result] ?? MESSAGES.error);
    } catch {
      setError(MESSAGES.error);
    }
    setBusy(false);
  }

  return (
    <form className="rsvp-form" noValidate onSubmit={submit}>
      <div className="error" role="alert" hidden={!error}>
        {error}
      </div>
      <label className="check">
        <input type="checkbox" name="age" required />
        <span>I’m 18 or over. ID is checked on the door.</span>
      </label>
      <label className="check">
        <input type="checkbox" name="marketing" />
        <span>Tell me about future Emerge events.</span>
      </label>
      <button className="button" type="submit" disabled={busy}>
        Take the place <span aria-hidden="true">↗</span>
      </button>
      <p className="small muted">
        We’ll use your name and email for this booking. <Link href="/privacy">Privacy notice</Link>.
      </p>
    </form>
  );
}
