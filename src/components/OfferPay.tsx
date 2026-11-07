"use client";

import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  expired: "This offer has ended. The place has passed to the next person on the list.",
  already_booked: "You’re already booked. Check your inbox for your confirmation.",
  invalid: "This offer link isn’t valid.",
  error: "Something went wrong opening the payment page. Nothing was charged. Try again.",
};

export function OfferPay({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hold = params.get("cancelled");
    if (!hold) return;
    window.history.replaceState(null, "", window.location.pathname);
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hold }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote("Checkout cancelled. Nothing was charged. Your place is still held until the deadline.");
  }, []);

  async function pay() {
    setPending(true);
    setError("");
    try {
      const r = await (await fetch(`/api/offer/${encodeURIComponent(token)}`, { method: "POST" })).json();
      if (r.result === "redirect" && r.url) {
        window.location.assign(r.url);
        return;
      }
      setError(MESSAGES[r.result] ?? MESSAGES.error);
    } catch {
      setError(MESSAGES.error);
    }
    setPending(false);
  }

  return (
    <>
      {note && <p className="small muted">{note}</p>}
      <div className="error" role="alert" hidden={!error}>
        {error}
      </div>
      <button className="button" type="button" onClick={pay} disabled={pending}>
        Pay and confirm my place <span aria-hidden="true">↗</span>
      </button>
      <p className="small muted">£15 per person. No refunds, but you can pass your place on.</p>
    </>
  );
}
