// Render static/og.jpg (1200x630) and the PNG icons from site.config.json (in the chosen theme's colours) with headless Chrome/Chromium.
// No npm deps. Usage: npm run assets   (CHROME=/path/to/chrome to override). Re-run after changing
// name, initials, theme, accent, url or seo.ogLine, then `npm run build`. Outputs are meant to be committed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const theme = String(C.theme || "signal").toLowerCase();
const themeFile = path.join(root, "src/themes", theme, "theme.json");
if (!fs.existsSync(themeFile)) { console.error(`theme "${theme}" not found (src/themes/${theme}/theme.json)`); process.exit(1); }
const T = JSON.parse(fs.readFileSync(themeFile, "utf8"));
const accent = (C.accent || T.accent).toLowerCase();
const domain = new URL(C.url).host;
const line = C.seo?.ogLine || C.jobTitle || C.description;
const which = (b) => { try { execFileSync("which", [b], { stdio: "ignore" }); return true; } catch { return false; } };
const chrome = process.env.CHROME || ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].find(which)
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].find((p) => fs.existsSync(p));
if (!chrome) { console.error("Chrome/Chromium not found. Install it or set CHROME=/path/to/chrome"); process.exit(1); }

// build the favicon exactly like scripts/build.mjs does (run the build once so dist/favicon.svg exists)
execFileSync(process.execPath, [path.join(root, "scripts/build.mjs"), "--no-precompress"], { stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, CJSP_QUIET: "1" } });
const favicon = fs.readFileSync(path.join(root, "dist/favicon.svg"), "utf8");
const rgb = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16)).join(",");
const params = { initials: C.initials, name: C.name, domain, line, accent, favicon, bg: T.bg, ink: T.ink, ink2: T.ink2 };
// functions can't travel in JSON; the page rebuilds accentRgba from the rgb triplet
const page = fs.readFileSync(path.join(root, "src/assets.html"), "utf8").replace("const P = JSON.parse(decodeURIComponent(location.hash.slice(1)));",
  `const P = JSON.parse(decodeURIComponent(location.hash.slice(1))); P.accentRgba = (a) => "rgba(${rgb}," + a + ")";`);
const tmp = path.join(root, "dist", ".assets.html");
fs.writeFileSync(tmp, page);
const dom = execFileSync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none", "--virtual-time-budget=5000", "--dump-dom",
  "file://" + tmp + "#" + encodeURIComponent(JSON.stringify(params))], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString();
fs.rmSync(tmp);
const m = dom.match(/<textarea id="out">([^<]+)<\/textarea>/);
if (!m) { console.error("asset page produced no output (is Chrome recent enough?)"); process.exit(1); }
const files = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
fs.mkdirSync(path.join(root, "static"), { recursive: true });
for (const [f, url] of Object.entries(files)) {
  const buf = Buffer.from(url.split(",")[1], "base64");
  fs.writeFileSync(path.join(root, "static", f), buf);
  console.log(`static/${f}  ${buf.length} B`);
}
const stamp = crypto.createHash("sha256").update(JSON.stringify([C.name, C.initials, accent, domain, C.seo?.ogLine || C.jobTitle || "", theme])).digest("hex").slice(0, 16);
fs.writeFileSync(path.join(root, "static/.assets-stamp"), stamp + "\n");
console.log("done. now run: npm run build");
