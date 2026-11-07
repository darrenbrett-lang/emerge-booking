import { GuestTable } from "@/components/organiser/GuestTable";
import { requireOrganiser } from "@/lib/auth";
import { availability } from "@/lib/db";
import { formatLondon } from "@/lib/event";
import { loadDashboard } from "@/lib/organiser";
import { resendEmail, resolveIssue, signOut } from "./actions";

export const metadata = { title: "Emerge · Guest list" };

export default async function Organiser() {
  const who = await requireOrganiser();
  const [d, a] = await Promise.all([loadDashboard(), availability()]);

  return (
    <main className="org">
      <div className="bar">
        <div>
          <h1>Guest list</h1>
          <span className="muted">Signed in as {who}</span>
        </div>
        <form action={signOut}>
          <button className="btn" type="submit">Sign out</button>
        </form>
      </div>

      <div className="stats">
        <div className="stat"><b>{a.taken}/{a.capacity}</b><span>Places taken</span></div>
        <div className="stat"><b>{d.stats.confirmed}</b><span>Paid</span></div>
        <div className="stat"><b>{d.stats.held + d.stats.offered}</b><span>Held now</span></div>
        <div className="stat"><b>{d.stats.waiting}</b><span>Waiting</span></div>
        <div className="stat"><b>{d.stats.checkedIn}</b><span>Checked in</span></div>
      </div>

      {d.issues.map((i) => (
        <div className="alert" key={i.id}>
          <strong>{i.kind === "duplicate_payment" ? "Duplicate payment" : "Over capacity"}</strong>. {i.note} Stripe
          session {i.stripe_session_id}.
          <form action={resolveIssue.bind(null, i.id)} style={{ display: "inline", marginLeft: 8 }}>
            <button className="btn" type="submit">Mark dealt with</button>
          </form>
        </div>
      ))}

      {d.emailProblems.length > 0 && (
        <>
          <h2>Emails not delivered ({d.emailProblems.length})</h2>
          <table className="stack">
            <thead>
              <tr><th>Email</th><th>To</th><th>State</th><th>Error</th><th></th></tr>
            </thead>
            <tbody>
              {d.emailProblems.map((e) => (
                <tr key={e.id}>
                  <td>{e.kind.replace(/_/g, " ")}</td>
                  <td>{e.to_email}</td>
                  <td>
                    {e.status === "dead" ? "Gave up" : "Retrying"} after {e.attempts} attempt{e.attempts === 1 ? "" : "s"}
                    <br />
                    <span className="muted">{formatLondon(e.created_at)}</span>
                  </td>
                  <td className="muted">{e.last_error}</td>
                  <td>
                    <form action={resendEmail.bind(null, e.id)}>
                      <button className="btn primary" type="submit">Resend</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Door and guests</h2>
      <p className="muted">
        <a href="/organiser/export">Download the guest list (CSV)</a>
      </p>
      <GuestTable rows={d.rows} />
    </main>
  );
}
