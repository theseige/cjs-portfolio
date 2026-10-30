// Render the media kit PNGs (and the SVG logo) from kit.html with headless Chrome. No npm deps.
// Usage: node media/src/render.mjs        (CHROME=/path/to/chrome to override)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, "..");
const chrome = process.env.CHROME || ["google-chrome", "chromium", "chromium-browser"].find((b) => { try { execFileSync("which", [b]); return true; } catch { return false; } });
if (!chrome) throw new Error("Chrome/Chromium not found; set CHROME=/path/to/chrome");
const base = ["--headless=new", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--font-render-hinting=none", "--virtual-time-budget=4000"];
const assets = { announce: [1600, 900, "cjs-portfolio-announcement-1600x900.png"], social: [1280, 640, "cjs-portfolio-github-social-1280x640.png"],
  square: [1080, 1080, "cjs-portfolio-square-1080x1080.png"], banner: [1280, 400, "cjs-portfolio-readme-banner-1280x400.png"], logo: [1024, 1024, "cjs-portfolio-logo-1024.png"] };
const url = (a) => "file://" + path.join(here, "kit.html") + "?a=" + a;
for (const [a, [w, h, file]] of Object.entries(assets)) {
  execFileSync(chrome, [...base, `--window-size=${w},${h}`, `--screenshot=${path.join(out, file)}`, url(a)], { stdio: "ignore" });
  console.log(file);
}
// SVG logo: the page writes the exact same dots into a hidden <textarea id="svgout">
const dom = execFileSync(chrome, [...base, "--dump-dom", url("logo")], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString();
const m = dom.match(/<textarea id="svgout"[^>]*>([\s\S]*?)<\/textarea>/);
if (!m) throw new Error("svg not found in DOM");
const txt = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { dark, transparent } = JSON.parse(txt);
fs.writeFileSync(path.join(out, "cjs-portfolio-logo.svg"), dark + "\n");
fs.writeFileSync(path.join(out, "cjs-portfolio-logo-transparent.svg"), transparent + "\n");
console.log("cjs-portfolio-logo.svg, cjs-portfolio-logo-transparent.svg");
