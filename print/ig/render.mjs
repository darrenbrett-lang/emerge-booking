// Renders the 4:5 Instagram post to PNG with the installed Chrome.
//   node print/ig/render.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1080,1350",
  "--virtual-time-budget=8000",
  `--screenshot=${join(here, "Emerge-IG-4x5.png")}`,
  `file://${join(here, "post.html")}`,
], { stdio: "ignore" });
console.log("wrote Emerge-IG-4x5.png");
