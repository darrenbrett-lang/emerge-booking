"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Avail = { remaining: number | null; full: boolean; phase: string };

const MESSAGES: Record<string, string> = {
  invalid_name: "We’re gonna need that name!",
  invalid_email: "Can we have that email cuz?",
  age_required: "Tick the box to confirm you’re 18 or over.",
  already_booked: "You’re already on the list with that email. Your confirmation email has everything you need.",
  has_offer: "We’re holding a place for you. Use the link in your offer email to pay for it.",
  already_waiting: "You’re already on the waiting list. We’ll email you if a place opens up.",
  too_many: "Too many checkouts from this connection. Finish the one you started, or try again in half an hour.",
  error: "Something went wrong opening the payment page. Nothing was charged. Try again.",
};

export function RsvpForm({ initial, inviteToken }: { initial: Avail; inviteToken: string | null }) {
  const router = useRouter();
  const [avail, setAvail] = useState<Avail>(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const closed = avail.phase !== "open";
  const waitlist = !closed && avail.full;

  // Keep the count live while the page is open.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/availability", { cache: "no-store" });
        if (r.ok && !stop) setAvail(await r.json());
      } catch {}
    };
    const id = setInterval(tick, 30000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Back from Stripe without paying: free the place straight away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hold = params.get("cancelled");
    if (!hold) return;
    params.delete("cancelled");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + "#rsvp");
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hold }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast("Checkout cancelled. Nothing was charged.");
    document.getElementById("rsvp")?.scrollIntoView();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!name) return fail("invalid_name", nameRef.current);
    if (!email || !emailRef.current?.validity.valid) return fail("invalid_email", emailRef.current);
    if (!form.get("age")) return fail("age_required");

    setError("");
    setPending(true);
    const body = {
      name,
      email,
      age: true,
      marketing: form.get("marketing") === "on",
      invite: inviteToken,
      website: form.get("website"),
    };
    try {
      const res = await fetch(waitlist ? "/api/waitlist" : "/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const r = await res.json();
      if (r.result === "redirect" && r.url) {
        window.location.assign(r.url);
        return;
      }
      if (r.result === "waiting" || r.result === "already_waiting") {
        router.push("/waiting");
        return;
      }
      if (r.result === "full") {
        setAvail((a) => ({ ...a, full: true, remaining: 0 }));
        setError("The list has just filled up. Leave your details and we’ll let you know if a place opens up.");
      } else if (r.result === "available") {
        setAvail((a) => ({ ...a, full: false }));
        setError("A place has just come free. Get your name down.");
      } else if (r.result === "closed") {
        setAvail((a) => ({ ...a, phase: "checkout_closed" }));
      } else {
        setError(MESSAGES[r.result] ?? MESSAGES.error);
      }
    } catch {
      setError(MESSAGES.error);
    }
    setPending(false);
  }

  function fail(code: string, focus?: HTMLElement | null) {
    setError(MESSAGES[code]);
    focus?.focus();
  }

  if (closed) {
    return (
      <div className="rsvp-form">
        <p className="urgency last-place">The list is closed.</p>
        <p className="small muted">
          Booked? Your confirmation email has everything you need. Bring photo ID.
        </p>
      </div>
    );
  }

  const count = avail.remaining;
  const urgency = waitlist
    ? "The list is full. There’s still a chance."
    : count != null && count > 0
      ? `${count === 1 ? "One place" : `${count} places`} left. Get your name down.`
      : "Get in before the list closes.";

  return (
    <form className="rsvp-form" id="rsvp-form" noValidate onSubmit={submit}>
      <div className="error" id="form-error" role="alert" hidden={!error}>
        {error}
      </div>
      <div className="field">
        <label htmlFor="guest-name">Your name</label>
        <input
          ref={nameRef}
          id="guest-name"
          name="name"
          autoComplete="name"
          maxLength={100}
          required
          placeholder="First and last name"
        />
      </div>
      <div className="field">
        <label htmlFor="guest-email">Your email</label>
        <input
          ref={emailRef}
          id="guest-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="check">
        <input type="checkbox" name="age" required />
        <span>I’m 18 or over. ID is checked on the door.</span>
      </label>
      <label className="check">
        <input type="checkbox" name="marketing" />
        <span>Tell me about future Emerge events.</span>
      </label>
      <button className="button dark" type="submit" id="rsvp-button" disabled={pending}>
        {waitlist ? "Join the waiting list" : "Continue to checkout"} <span aria-hidden="true">↗︎</span>
      </button>
      <p className="small muted">
        {waitlist
          ? "A waiting-list place doesn’t confirm entry. If a place opens up, we’ll email you a link to pay."
          : "No refunds, but you can pass your place on from your confirmation email if you need to."}
      </p>
      <div className="privacy muted">
        <details>
          <summary>How we use your details</summary>
          <p>
            We use your name and email to manage your booking and send your confirmation. We only email you about
            future events if you tick the box. Read the <Link href="/privacy">privacy notice</Link>.
          </p>
        </details>
      </div>
      <p className="urgency last-place" id="rsvp-urgency">
        {urgency}
      </p>
      <div className="toast" role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </form>
  );
}
