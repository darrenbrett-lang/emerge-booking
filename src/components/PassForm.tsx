"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StateShell } from "./StateShell";

const MESSAGES: Record<string, string> = {
  invalid_name: "Let us know their name.",
  invalid_email: "Pop in a valid email address for them.",
  same_person: "That’s your own email. Pop in theirs.",
  already_booked: "They already have a place. Choose someone else.",
  pending_exists: "You’ve already offered your place to someone. Cancel that first.",
  closed: "Transfers have closed.",
  invalid: "This link isn’t valid any more.",
  error: "Something went wrong. Try again.",
};

type Pending = { to_name: string; to_email: string } | null;

export function PassForm({ token, reference, pending }: { token: string; reference: string; pending: Pending }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<{ name: string; email: string } | null>(null);

  async function post(path: string, body: object) {
    setBusy(true);
    setError("");
    try {
      const r = await (
        await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      ).json();
      if (r.result === "pending" || r.result === "cancelled" || r.result === "none") {
        setConfirming(null);
        router.refresh();
      } else setError(MESSAGES[r.result] ?? MESSAGES.error);
    } catch {
      setError(MESSAGES.error);
    }
    setBusy(false);
  }

  if (pending) {
    return (
      <StateShell>
        <p className="eyebrow">Waiting for them</p>
        <h1>
          Passing
          <br />
          it on.
        </h1>
        <p>
          We’ve emailed {pending.to_name} at {pending.to_email}. Once they confirm they’re 18 or over, the place is
          theirs and booking {reference} is cancelled. Until then, it’s still yours.
        </p>
        <p className="small muted">If they haven’t accepted by 6 pm on Friday 27 November, your place stands.</p>
        <div className="error" role="alert" hidden={!error}>
          {error}
        </div>
        <button className="button outline" type="button" disabled={busy} onClick={() => post("/api/transfer/cancel", { token })}>
          Cancel the transfer
        </button>
      </StateShell>
    );
  }

  return (
    <StateShell>
      <p className="eyebrow">Plans change.</p>
      <h1>
        Pass it
        <br />
        on.
      </h1>
      <p>There are no refunds, but you can give your place to someone else for free until 6 pm on Friday 27 November.</p>
      <p className="small muted">Booking {reference}</p>
      {confirming ? (
        <>
          <p>
            Give your place to {confirming.name} ({confirming.email})? They’ll get an email and need to confirm
            they’re 18 or over. Until they do, the place stays yours.
          </p>
          <div className="error" role="alert" hidden={!error}>
            {error}
          </div>
          <button className="button" type="button" disabled={busy} onClick={() => post("/api/transfer", { token, ...confirming })}>
            Yes, send it to them <span aria-hidden="true">↗︎</span>
          </button>
          <button className="button outline" type="button" onClick={() => setConfirming(null)}>
            Go back
          </button>
        </>
      ) : (
        <form
          className="rsvp-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name") ?? "").trim();
            const email = String(f.get("email") ?? "").trim();
            if (!name) return setError(MESSAGES.invalid_name);
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError(MESSAGES.invalid_email);
            setError("");
            setConfirming({ name, email });
          }}
        >
          <div className="error" role="alert" hidden={!error}>
            {error}
          </div>
          <div className="field">
            <label htmlFor="to-name">Their name</label>
            <input id="to-name" name="name" autoComplete="off" maxLength={100} required />
          </div>
          <div className="field">
            <label htmlFor="to-email">Their email</label>
            <input id="to-email" name="email" type="email" inputMode="email" autoComplete="off" maxLength={254} required />
          </div>
          <button className="button" type="submit">
            Continue <span aria-hidden="true">↗︎</span>
          </button>
        </form>
      )}
    </StateShell>
  );
}
