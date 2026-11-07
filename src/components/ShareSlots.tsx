"use client";

import { useEffect, useState } from "react";

const TEXT = "Thought this might be your kind of night. Emerge. A night that stays with you. RSVP before the list fills up.";

// Three personal invitation links. Shared through the phone's share sheet
// where there is one, copied otherwise. Which ones were shared is
// remembered on this device only.
export function ShareSlots({ tokens, from }: { tokens: string[]; from: string }) {
  const key = `emerge-shared-${tokens[0]}`;
  const [shared, setShared] = useState<number[]>([]);
  const [fallback, setFallback] = useState<{ slot: number; value: string } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShared(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {}
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  function mark(slot: number) {
    setShared((s) => {
      const next = s.includes(slot) ? s : [...s, slot];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function share(slot: number, token: string) {
    const url = `${window.location.origin}/i/${token}`;
    let done = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${from} has invited you to Emerge`, text: TEXT, url });
        done = true;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    if (!done) {
      try {
        await navigator.clipboard.writeText(`${TEXT} ${url}`);
        setToast("Invitation copied. Choose who to send it to.");
      } catch {
        setFallback({ slot, value: `${TEXT} ${url}` });
        setToast("Select and copy the invitation link.");
      }
    }
    mark(slot);
  }

  return (
    <div id="share-slots">
      {tokens.map((t, i) => {
        const slot = i + 1;
        const used = shared.includes(slot);
        return (
          <div key={t}>
            <div className={`share-row${used ? " used" : ""}`}>
              <div>
                <p>Invitation {slot} of 3</p>
                <span>{used ? "Link shared. You can send it again." : "Someone who’d enjoy the night."}</span>
              </div>
              <button type="button" onClick={() => share(slot, t)}>
                {used ? "Share again" : "Share invite"}
              </button>
            </div>
            {fallback?.slot === slot && (
              <input
                className="copy-fallback"
                readOnly
                value={fallback.value}
                aria-label="Invitation link. Select and copy to share."
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
              />
            )}
          </div>
        );
      })}
      <div className="toast" role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </div>
  );
}
