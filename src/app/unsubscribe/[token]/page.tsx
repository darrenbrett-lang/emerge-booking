import { StateShell } from "@/components/StateShell";
import { rpc } from "@/lib/db";

// A button, not a bare link, so mail scanners that open links do not
// unsubscribe anyone. The List-Unsubscribe header points here too.
export default async function Unsubscribe({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  async function unsubscribe() {
    "use server";
    await rpc("emerge_unsubscribe", { p_token: token });
    const { redirect } = await import("next/navigation");
    redirect(`/unsubscribe/${token}?done=1`);
  }

  if (done) {
    return (
      <StateShell>
        <p className="eyebrow">Done</p>
        <h1>You’re off the list.</h1>
        <p>We won’t email you about future Emerge events. Emails about a booking you’ve made will still arrive.</p>
      </StateShell>
    );
  }
  return (
    <StateShell>
      <p className="eyebrow">Future events</p>
      <h1>Stop the emails?</h1>
      <p>We’ll stop telling you about future Emerge events. Emails about a booking you’ve made will still arrive.</p>
      <form action={unsubscribe}>
        <button className="button" type="submit">
          Yes, stop them <span aria-hidden="true">↗</span>
        </button>
      </form>
    </StateShell>
  );
}
