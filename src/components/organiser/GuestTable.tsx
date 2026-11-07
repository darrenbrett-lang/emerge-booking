"use client";

import { useMemo, useState, useTransition } from "react";
import { anonymiseGuest, cancelTransfer, checkIn, transferTicket } from "@/app/organiser/actions";
import type { GuestRow } from "@/lib/organiser";

const TAG: Record<GuestRow["status"], string> = {
  "checked in": "checked",
  confirmed: "confirmed",
  "pending transfer": "pending",
  offered: "offered",
  held: "held",
  waiting: "waiting",
  expired: "expired",
  transferred: "transferred",
};

// Search by booking reference or name; check in with one tap.
export function GuestTable({ rows }: { rows: GuestRow[] }) {
  const [q, setQ] = useState("");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(s) || r.email.includes(s) || (r.reference ?? "").toLowerCase().includes(s),
    );
  }, [q, rows]);

  return (
    <>
      <input
        type="search"
        placeholder="Booking reference or name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search guests"
        autoCapitalize="characters"
      />
      {msg && <p className="muted">{msg}</p>}
      <p className="muted">{shown.length} of {rows.length}</p>
      <table className="stack">
        <thead>
          <tr><th>Guest</th><th>State</th><th>Booking</th><th>Invited by</th><th>Door</th></tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.guestId}>
              <td>
                <strong>{r.name}</strong>
                <br />
                <span className="muted">{r.email}</span>
              </td>
              <td>
                <span className={`tag ${TAG[r.status]}`}>{r.status}</span>
                {r.waitPosition != null && <span className="muted"> #{r.waitPosition}</span>}
                {r.transferTo && <div className="muted">to {r.transferTo}</div>}
                {r.transferredFrom && <div className="muted">from {r.transferredFrom}</div>}
              </td>
              <td>{r.reference ?? <span className="muted">none</span>}</td>
              <td>{r.invitedBy ?? <span className="muted">main link</span>}</td>
              <td>
                {r.bookingId && (r.status === "confirmed" || r.status === "pending transfer") && (
                  <button className="btn primary" disabled={busy} onClick={() => start(() => checkIn(r.bookingId!, true))}>
                    Check in
                  </button>
                )}
                {r.bookingId && r.status === "checked in" && (
                  <button className="btn" disabled={busy} onClick={() => start(() => checkIn(r.bookingId!, false))}>
                    Undo
                  </button>
                )}
                <details>
                  <summary>More</summary>
                  {r.bookingId && (r.status === "confirmed" || r.status === "pending transfer") && (
                    <>
                      {r.status === "pending transfer" && (
                        <button className="btn" disabled={busy} onClick={() => start(() => cancelTransfer(r.bookingId!))}>
                          Cancel transfer
                        </button>
                      )}
                      <form
                        className="inline"
                        action={(f) =>
                          start(async () => {
                            const res = await transferTicket(r.bookingId!, f);
                            setMsg(res === "accepted" ? "Transferred." : res === "pending" ? "Transfer sent. They need to accept." : `Not transferred: ${res.replace(/_/g, " ")}.`);
                          })
                        }
                      >
                        <input type="text" name="name" placeholder="New guest’s name" required />
                        <input type="email" name="email" placeholder="New guest’s email" required />
                        <label><input type="checkbox" name="age" /> I’ve seen they’re 18 or over (transfer now)</label>
                        <button className="btn" type="submit" disabled={busy}>Transfer ticket</button>
                      </form>
                    </>
                  )}
                  <p><a href={`/organiser/guest/${r.guestId}`}>Export this guest’s data</a></p>
                  {!r.anonymised && (
                    <button
                      className="btn warn"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Anonymise ${r.name}? Their name and email are removed for good.`))
                          start(() => anonymiseGuest(r.guestId));
                      }}
                    >
                      Delete personal data
                    </button>
                  )}
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
