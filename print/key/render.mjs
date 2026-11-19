// Renders the key visual at twice size: square 2160 x 2160 and 4:3
// 2880 x 2160, with the installed Chrome, as PNG and JPG.
//   node print/key/render.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
for (const [name, size, query] of [
  ["Emerge-key-visual-square.png", "1080,1080", ""],
  ["Emerge-key-visual-4x3.png", "1440,1080", "?r=43"],
]) {
  execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    `--window-size=${size}`,
    "--virtual-time-budget=6000",
    `--screenshot=${join(here, name)}`,
    `file://${join(here, "key.html")}${query}`,
  ], { stdio: "ignore" });
  await sharp(join(here, name)).jpeg({ quality: 90, mozjpeg: true }).toFile(join(here, name.replace(".png", ".jpg")));
  console.log("wrote", name, "and .jpg");
}
