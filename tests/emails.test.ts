import { describe, expect, it } from "vitest";
import { EMAIL_KINDS, renderEmail } from "@/lib/emails";

const payload = {
  name: "Sue <b>Example</b>", reference: "EM-AAAAA", pass_token: "p", invitations: ["a", "b", "c"],
  offer_token: "o", deadline: "2026-11-21T14:15:00Z", to_name: "Pat", from_name: "Sue", accept_token: "t",
  old_reference: "EM-BBBBB",
};

describe("emails", () => {
  for (const kind of EMAIL_KINDS) {
    it(`${kind} renders HTML and plain text, escaped, with no em dashes`, () => {
      const r = renderEmail(kind, payload, { site: "https://www.emergeunderground.com", unsubscribeUrl: "https://u" });
      expect(r.subject.length).toBeGreaterThan(5);
      expect(r.html).toContain("<!doctype html>");
      expect(r.html).not.toContain("<b>Example</b>");
      expect(r.text.length).toBeGreaterThan(40);
      expect(r.html + r.text + r.subject).not.toContain("—");
      expect(r.html).toContain("https://u");
    });
  }

  it("the confirmation carries the reference, ID note, pass-on link and three invitations", () => {
    const r = renderEmail("confirmation", payload, { site: "https://s" });
    expect(r.text).toContain("EM-AAAAA");
    expect(r.text).toContain("Bring photo ID");
    expect(r.text).toContain("https://s/pass/p");
    expect(r.text).toContain("https://s/i/c");
    expect(r.text).toContain("02 / CULTURE");
    expect(r.text).toContain("Wear what feels like you. Just make it a night out.");
    expect(r.html).not.toContain("Stop emails"); // no unsubscribe line without consent
  });

  it("the offer email states the exact London deadline", () => {
    expect(renderEmail("waitlist_offer", payload, { site: "https://s" }).text).toContain("Saturday 21 November, 2:15 pm");
  });
});
