import { StateShell } from "./StateShell";

// From 12:30 am on 28 November the whole site shows this.
export function Holding() {
  return (
    <StateShell>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/wordmark.webp" alt="Emerge" className="holding-wordmark" />
      <p className="eyebrow">Thank you for coming</p>
      <h1>
        Until
        <br />
        next time.
      </h1>
      <p>Emerge will be in touch when the next event is happening.</p>
    </StateShell>
  );
}
