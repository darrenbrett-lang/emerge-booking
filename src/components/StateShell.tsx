import { Footer } from "./Footer";

// The demo's full-screen state page: electric ground, one message.
export function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="state-area">
        <div className="state-shell">{children}</div>
      </main>
      <Footer />
    </>
  );
}
