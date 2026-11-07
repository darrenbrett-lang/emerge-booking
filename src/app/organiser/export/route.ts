import { requireOrganiser } from "@/lib/auth";
import { loadDashboard } from "@/lib/organiser";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote everything, and stop spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  await requireOrganiser();
  const { rows } = await loadDashboard();
  const head = ["Name", "Email", "State", "Booking reference", "Invited by", "Transferred from", "Pending transfer to", "Waiting list position", "Offer deadline", "Future events opt-in"];
  const lines = [head, ...rows.map((r) => [r.name, r.email, r.status, r.reference, r.invitedBy, r.transferredFrom, r.transferTo, r.waitPosition, r.deadline, r.marketing ? "yes" : "no"])];
  const csv = lines.map((l) => l.map(cell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emerge-guest-list-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
