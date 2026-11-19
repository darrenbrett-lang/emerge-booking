// Prints the flyer to PDF with the installed Chrome: A4, A4 with 3 mm bleed,
// and the same page scaled to A5. Fonts are local, in print/fonts.
//   node print/flyer/render.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const page = `file://${join(here, "flyer.html")}`;

for (const [name, query] of [["Emerge-flyer-A4.pdf", ""], ["Emerge-flyer-A4-bleed.pdf", "?bleed"], ["Emerge-flyer-A5.pdf", "?a5"], ["Emerge-flyer-A5-4up-A3.pdf", "?a3"]]) {
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=8000",
    `--print-to-pdf=${join(here, name)}`,
    page + query,
  ], { stdio: "inherit" });
  console.log("wrote", name);
}
