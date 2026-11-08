import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { EVENT } from "./event";

// The share card (Darren, 8 Nov 2026): what WhatsApp, iMessage and the rest
// show when a link is sent. An invitation link names who sent it, so the first
// thing a friend sees is "Sue's invited you", not a website.
export const OG_SIZE = { width: 1200, height: 630 };

const asset = (f: string) => readFile(join(process.cwd(), "assets", f));
const dataUri = async (f: string, type: string) => `data:${type};base64,${(await asset(f)).toString("base64")}`;

export async function shareCard(inviter: string | null) {
  const [font, wordmark, portrait] = await Promise.all([
    asset("Unbounded-ExtraBold.ttf"),
    dataUri("og-wordmark.png", "image/png"),
    dataUri("og-portrait.jpg", "image/jpeg"),
  ]);
  const name = inviter ? `${inviter}’s` : null;
  const big = !name || name.length <= 9 ? 76 : name.length <= 12 ? 60 : 48;
  const lines: [string, string][] = name
    ? [
        [name, "#FF70BC"],
        ["invited you", "#F5F1E8"],
      ]
    : [
        ["You’re", "#F5F1E8"],
        ["invited", "#F5F1E8"],
      ];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#171713", fontFamily: "Unbounded" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 56px 52px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} width={300} height={128} alt="" />
          <div style={{ display: "flex", flexDirection: "column", textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1.02 }}>
            {lines.map(([text, colour]) => (
              <div key={text} style={{ display: "flex", color: colour, fontSize: big }}>
                {text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", color: "#EFFF00", fontSize: 24, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            {`Fri 27 Nov · ${EVENT.start} · Maidenhead`}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portrait} width={520} height={630} alt="" style={{ objectFit: "cover" }} />
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Unbounded", data: font, weight: 800, style: "normal" }] },
  );
}
