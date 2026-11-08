"use client";

import { useEffect, useRef, useState } from "react";
import { PRICE, parsePricePence } from "@/lib/price";
import { PricePicker } from "./PricePicker";

const MESSAGES: Record<string, string> = {
  expired: "This offer has ended. The place has passed to the next person on the list.",
  already_booked: "You’re already booked. Check your inbox for your confirmation.",
  invalid: "This offer link isn’t valid.",
  invalid_price: `Choose a whole-pound amount from £${PRICE.minPounds} to £${PRICE.maxPounds}.`,
  error: "Something went wrong opening the payment page. Nothing was charged. Try again.",
};

export function OfferPay({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

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

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const price = String(new FormData(e.currentTarget).get("price") ?? "");
    if (parsePricePence(price) === null) {
      setError(MESSAGES.invalid_price);
      priceRef.current?.focus();
      return;
    }
    setPending(true);
    setError("");
    try {
      const r = await (
        await fetch(`/api/offer/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price }),
        })
      ).json();
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
    <form className="offer-pay" ref={formRef} onSubmit={pay} noValidate>
      {note && <p className="small muted">{note}</p>}
      <div className="error" role="alert" hidden={!error}>
        {error}
      </div>
      <PricePicker idPrefix="offer" ref={priceRef} />
      <button className="button" type="submit" disabled={pending}>
        Pay and confirm my place <span aria-hidden="true">↗︎</span>
      </button>
      <p className="small muted">No refunds, but you can pass your place on.</p>
    </form>
  );
}
