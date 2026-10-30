// CJS Portfolio build: site.config.json + src/ + static/ -> dist/
// Renders every page and SEO file from the config, inlines + hashes the CSS (CSP), cache-busts every
// asset URL with ?v=<content hash>, and precompresses text files (.br/.gz). Zero dependencies (Node >= 18).
//
// Usage: node scripts/build.mjs [--config path] [--strict] [--no-precompress]
//   --strict  fail if placeholder content ("Your Name", example.com, yourhandle ...) is still present (deploy uses this)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const cfgPath = path.resolve(root, args[args.indexOf("--config") + 1] && flag("--config") ? args[args.indexOf("--config") + 1] : "site.config.json");
const src = path.join(root, "src"), stat = path.join(root, "static"), dist = path.join(root, "dist");
const fail = (m) => { console.error("BUILD FAILED: " + m); process.exit(1); };
const warn = (m) => process.env.CJSP_QUIET || console.warn("warning: " + m);
const hash = (buf, n = 10) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, n);
const read = (p) => fs.readFileSync(p, "utf8");

/* ---------------- config ---------------- */
let C;
try { C = JSON.parse(read(cfgPath)); } catch (e) { fail(`${path.relative(root, cfgPath)}: ${e.message}`); }
const ICONS = JSON.parse(read(path.join(src, "icons.json")));
for (const k of ["name", "initials", "url", "title", "description"]) if (!C[k] || typeof C[k] !== "string") fail(`config: "${k}" is required`);
if (!/^https:\/\/[^/]+\/?$/.test(C.url)) fail(`config: "url" must be an https origin like https://example.com (got ${C.url})`);
// theme: one folder in src/themes/<name>/ (theme.json + theme.css + hero.js). Only the chosen theme ships.
const themes = fs.existsSync(path.join(src, "themes")) ? fs.readdirSync(path.join(src, "themes")).filter((d) => fs.existsSync(path.join(src, "themes", d, "theme.json"))).sort() : [];
C.theme = String(C.theme || "signal").toLowerCase();
if (!themes.includes(C.theme)) fail(`config: theme "${C.theme}" not found in src/themes/. Available: ${themes.join(", ") || "none"}`);
const themeDir = path.join(src, "themes", C.theme);
let T;
try { T = JSON.parse(read(path.join(themeDir, "theme.json"))); } catch (e) { fail(`src/themes/${C.theme}/theme.json: ${e.message}`); }
for (const k of ["accent", "bg", "ink", "ink2", "colorScheme"]) if (!T[k]) fail(`src/themes/${C.theme}/theme.json: "${k}" is required`);
// "accent": empty or missing = the theme's own default accent
C.accent = (C.accent || T.accent).toLowerCase();
if (!/^#[0-9a-f]{6}$/.test(C.accent)) fail(`config: "accent" must be a 6-digit hex colour like #ff5b1f (or "" for the theme default)`);
if ([...C.initials].length > 4) warn(`initials "${C.initials}" are long; 1-3 characters look best in the particle hero`);
const origin = C.url.replace(/\/$/, ""), base = origin + "/", domain = new URL(C.url).host;
const lang = C.lang || "en", locale = C.locale || "en_US";
const hero = { kicker: domain, tagline: "Something's being built here.", hintPointer: "Move your cursor through it.", hintTouch: "Tap to break it apart.", hintAfter: "It always reassembles.", ...(T.hints || {}), ...(C.hero || {}) };
const seo = { allowAICrawlers: true, ...(C.seo || {}) };
const on = (s) => s && s.enabled !== false && Array.isArray(s.items) && s.items.length > 0;
const socials = on(C.socials) ? C.socials : null;
const brands = on(C.brands) || (C.brands && C.brands.enabled !== false && C.brands.company) ? C.brands : null;
const soon = on(C.soon) ? C.soon : null;
if (socials) for (const s of socials.items) {
  if (!ICONS[s.network]) fail(`config: socials network "${s.network}" unknown. Known: ${Object.keys(ICONS).join(", ")}`);
  if (!/^(https:\/\/|mailto:)/.test(s.url || "")) fail(`config: social "${s.network}" needs an https:// or mailto: url`);
}
if (brands) for (const b of brands.items || []) if (!b.name) fail("config: every brand needs a name");

if (flag("--strict")) {
  const raw = read(cfgPath);
  const bad = ["Your Name", "example.com", "example.co", "yourhandle", "your-name", "Brand One", "brand-one.example", "Example Co"].filter((p) => raw.includes(p));
  if (bad.length) fail(`--strict: placeholder content still in the config: ${bad.join(", ")}`);
}

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rgb = [1, 3, 5].map((i) => parseInt(C.accent.slice(i, i + 2), 16));
const swapAccent = (s) => s.replace(/#ff5b1f/gi, C.accent).replace(/255,\s*91,\s*31/g, (m) => (m.includes(" ") ? rgb.join(", ") : rgb.join(",")));
const pad = (n) => String(n).padStart(2, "0");
const ext = (u) => !u.startsWith("mailto:");

// last content change: newest commit touching the content, or today when there are uncommitted edits / no git
let lastmod = new Date().toLocaleDateString("en-CA");
try {
  const paths = "site.config.json src static";
  const dirty = execSync(`git status --porcelain -- ${paths}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  const d = execSync(`git log -1 --format=%cs -- ${paths}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  if (!dirty && d) lastmod = d;
} catch {}

/* ---------------- dist + assets ---------------- */
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
if (fs.existsSync(stat)) fs.cpSync(stat, dist, { recursive: true, filter: (p) => !path.basename(p).startsWith(".") });

// favicon.svg is generated from the config so it always matches the initials + accent
const nI = [...C.initials].length, fw = nI > 2 ? 20 : nI === 2 ? 26 : 32; // keep clear of the accent dot
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${T.bg}"/><text x="${nI > 1 ? 30 : 32}" y="${nI > 2 ? 40 : 42}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-weight="900" font-size="${fw}" letter-spacing="-1" fill="${T.ink}">${esc(C.initials)}</text><circle cx="51" cy="15" r="5" fill="${C.accent}"/></svg>`;
fs.writeFileSync(path.join(dist, "favicon.svg"), favicon);

const og = ["og.jpg", "og.png"].find((f) => fs.existsSync(path.join(dist, f)));
if (!og) warn("static/og.jpg missing: run `npm run assets` (needs Chrome) to render the share image");
for (const f of ["favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) if (!fs.existsSync(path.join(dist, f))) warn(`static/${f} missing: run \`npm run assets\``);
// were the raster assets rendered for this config?
const stampWant = hash(JSON.stringify([C.name, C.initials, C.accent, domain, seo.ogLine || C.jobTitle || "", C.theme]), 16);
const stampFile = path.join(stat, ".assets-stamp");
if (fs.existsSync(stampFile) && read(stampFile).trim() !== stampWant) warn("og image / icons were rendered for a different name, initials, accent, domain or theme: run `npm run assets`");

const manifest = {
  name: C.name, short_name: C.initials, description: C.description, start_url: "/", scope: "/", display: "browser",
  background_color: T.bg, theme_color: T.bg,
  icons: [
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
fs.writeFileSync(path.join(dist, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

const fileV = (f) => (fs.existsSync(path.join(dist, f)) ? hash(fs.readFileSync(path.join(dist, f))) : "0");

// CSS: swap accent, minify (conservative, dependency-free), inline with a CSP hash
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};,>])\s*/g, "$1").replace(/:\s+/g, ":").replace(/;}/g, "}").trim();
const optional = (f) => (fs.existsSync(f) ? read(f) : "");
const css = minCss(swapAccent(read(path.join(src, "styles.css")) + "\n" + optional(path.join(themeDir, "theme.css"))));
const cssHash = crypto.createHash("sha256").update(css).digest("base64");
// JS: swap accent, strip full-line comments / indentation / blank lines (safe: no multi-line strings in main.js)
const js = swapAccent(read(path.join(src, "main.js")) + "\n" + optional(path.join(themeDir, "hero.js"))).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !/^\/\*.*\*\/$/.test(l)).join("\n") + "\n";
fs.writeFileSync(path.join(dist, "main.js"), js);
const v = { js: hash(js), og: og ? fileV(og) : "0", svg: hash(favicon), ico32: fileV("favicon-32.png"), apple: fileV("apple-touch-icon.png"), mani: fileV("site.webmanifest") };
const ogUrl = og ? `${base}${og}?v=${v.og}` : "";

/* ---------------- shared page parts ---------------- */
const used = socials ? [...new Set(socials.items.map((s) => s.network))] : [];
const sprite = used.length ? `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs>${used.map((k) => `<symbol id="i-${k}" viewBox="0 0 24 24"><path d="${ICONS[k].path}"/></symbol>`).join("")}</defs></svg>` : "";
const label = (s) => s.label || ICONS[s.network].label;
const linkAttrs = (s) => (ext(s.url) ? ` rel="me noopener" target="_blank"` : "");
const newTab = (s) => (ext(s.url) ? " (opens in a new tab)" : "");
const ico = (k, px) => `<svg class="ico" width="${px}" height="${px}" aria-hidden="true" focusable="false"><use href="#i-${k}"/></svg>`;
const smallSocial = (cls) => socials ? `<ul class="${cls}" role="list">${socials.items.map((s) => `<li><a href="${esc(s.url)}"${linkAttrs(s)} aria-label="${esc(label(s) + newTab(s))}">${ico(s.network, 16)}</a></li>`).join("")}</ul>` : "";
const head = ({ title, description, robots, extra = "" }) => `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="${T.bg}">
<meta name="color-scheme" content="${T.colorScheme}">
${extra}<link rel="icon" href="/favicon.svg?v=${v.svg}" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png?v=${v.ico32}" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${v.apple}">
<meta http-equiv="Content-Security-Policy" content="style-src 'self' 'sha256-${cssHash}'"><style>${css}</style>
<script src="/main.js?v=${v.js}" defer></script>
`;
const mark = `<a class="mark" href="/" aria-label="${esc(C.initials === C.name ? C.name : C.initials + ", " + C.name)}, home">${esc(C.initials)}<span class="dot" aria-hidden="true"></span></a>`;

/* ---------------- index.html ---------------- */
const sections = [socials && ["socials", "socials", socials], brands && ["brands", "brands", brands], soon && ["next", "next", soon]].filter(Boolean);
const num = (id) => pad(sections.findIndex((s) => s[0] === id) + 1);
const sectionHead = (id, s) => `<div class="section-head reveal">
<p class="eyebrow">${num(id)} / ${esc(s.eyebrow || s.nav || id)}</p>
<h2 id="${id}-title">${esc(s.title || "")}${s.titleOutline ? `<br><em>${esc(s.titleOutline)}</em>` : ""}</h2>
</div>`;

// desktop social grid is 6 columns: give tiles widths so every row is full (5 tiles -> 3+3 / 2+2+2, like the original)
const widths = (n) => {
  if (n === 1) return ["w6"];
  const r = n % 3, w = Array(n).fill("w2");
  if (r === 2) w[0] = w[1] = "w3";
  if (r === 1) w[0] = w[1] = w[2] = w[3] = "w3";
  return w;
};

const socialSection = () => {
  const w = widths(socials.items.length);
  return `<section id="socials" class="section socials" aria-labelledby="socials-title">
${sectionHead("socials", socials)}
<ul class="social-grid" role="list">
${socials.items.map((s, i) => `<li class="reveal ${w[i]}">
<a class="social card" href="${esc(s.url)}"${linkAttrs(s)} aria-label="${esc(`${label(s)}: ${s.handle || s.url}${newTab(s)}`)}">
<span class="social-top"><span class="social-num">${pad(i + 1)}</span><span class="social-ico">${ico(s.network, 22)}</span></span>
<span class="social-name">${esc(label(s))}</span>
<span class="social-foot"><span class="social-handle">${esc(s.handle || s.url.replace(/^(https:\/\/|mailto:)/, ""))}</span><span class="social-go" aria-hidden="true">↗</span></span>
</a>
</li>`).join("\n")}
</ul>
</section>`;
};

const dotClass = (state) => (state === "live" ? " live" : state === "soon" ? " amber" : "");
const brandSection = () => {
  const co = brands.company;
  return `<section id="brands" class="section brands" aria-labelledby="brands-title">
${sectionHead("brands", brands)}
${co ? `<article class="parent reveal">
<div class="parent-main">
${co.eyebrow ? `<p class="eyebrow">${esc(co.eyebrow)}</p>` : ""}
<h3>${co.url ? `<a href="${esc(co.url)}" rel="noopener">` : ""}${esc(co.name)}${co.suffix ? `<span class="tld">${esc(co.suffix)}</span>` : ""}${co.url ? "</a>" : ""}</h3>
${co.description ? `<p>${esc(co.description)}</p>` : ""}
${co.note ? `<p class="muted">${esc(co.note)}</p>` : ""}
</div>
${co.url ? `<a class="btn magnetic" href="${esc(co.url)}" rel="noopener">${esc(co.cta || "Visit " + new URL(co.url).host)} <span aria-hidden="true">↗</span></a>` : ""}
</article>` : ""}
${(brands.items || []).length ? `<ul class="brand-grid" role="list">
${brands.items.map((b) => `<li class="brand card reveal">
${b.category ? `<p class="brand-cat"><span>${esc(b.category)}</span></p>` : ""}
<h3>${esc(b.name)}</h3>
${b.description ? `<p>${esc(b.description)}</p>` : ""}
${b.status ? `<p class="status"><span class="status-dot${dotClass(b.state)}" aria-hidden="true"></span>${esc(b.status)}</p>` : ""}
${b.url ? `<a class="brand-link" href="${esc(b.url)}" rel="noopener">${esc(b.linkLabel || new URL(b.url).host)} <span aria-hidden="true">↗</span></a>` : ""}
</li>`).join("\n")}
</ul>` : ""}
</section>`;
};

const soonSection = () => `<section id="next" class="section next" aria-labelledby="next-title">
${sectionHead("next", soon)}
<ul class="soon-grid" role="list">
${soon.items.map((s, i) => `<li class="card soon reveal"><span class="soon-num" aria-hidden="true">${String.fromCharCode(65 + (i % 26))}</span><h3>${esc(s.title)}</h3><p class="status"><span class="status-dot" aria-hidden="true"></span>${esc(s.label || "Coming soon")}</p></li>`).join("\n")}
</ul>
</section>`;

const marquee = (C.marquee || []).filter(Boolean);
const marqueeHtml = marquee.length ? `<div class="marquee" aria-hidden="true">
<div class="marquee-track">
${Array(4).fill(marquee.map((m) => `<span>${esc(m)}</span><i>✦</i>`).join("")).join("\n")}
</div>
</div>` : "";

// JSON-LD
const co = brands && brands.company;
const coId = co && co.url ? co.url.replace(/\/?$/, "/") + "#organization" : null;
const person = {
  "@type": "Person", "@id": `${base}#person`, name: C.name, alternateName: C.initials, url: base,
  description: C.personDescription || C.description, ...(C.jobTitle ? { jobTitle: C.jobTitle } : {}),
  ...(coId ? { worksFor: { "@id": coId } } : {}),
  sameAs: [...(socials ? socials.items.filter((s) => ext(s.url)).map((s) => s.url) : []), ...(co && co.url ? [co.url] : [])],
};
const graph = [
  { "@type": "WebSite", "@id": `${base}#website`, url: base, name: C.name, alternateName: domain, inLanguage: lang, publisher: { "@id": `${base}#person` } },
  { "@type": "ProfilePage", "@id": `${base}#webpage`, url: base, name: C.title, description: C.description, inLanguage: lang,
    isPartOf: { "@id": `${base}#website` }, about: { "@id": `${base}#person` }, mainEntity: { "@id": `${base}#person` },
    ...(og ? { primaryImageOfPage: { "@id": `${base}#ogimage` } } : {}), dateModified: lastmod },
  ...(og ? [{ "@type": "ImageObject", "@id": `${base}#ogimage`, url: `${base}${og}`, contentUrl: `${base}${og}`, width: 1200, height: 630, caption: seo.ogImageAlt || C.title }] : []),
  person,
];
if (coId) {
  const items = (brands.items || []).filter((b) => b.url);
  graph.push({
    "@type": "Organization", "@id": coId, name: co.name, ...(co.suffix ? { alternateName: co.name + co.suffix } : {}), url: co.url,
    ...(co.description ? { description: co.description } : {}), founder: { "@id": `${base}#person` },
    ...(items.length ? {
      brand: items.map((b) => ({ "@type": "Brand", name: b.name, url: b.url })),
      subOrganization: items.map((b) => ({ "@type": "Organization", "@id": b.url.replace(/\/?$/, "/") + "#organization", name: b.name, url: b.url, ...(b.description ? { description: b.description } : {}), parentOrganization: { "@id": coId } })),
    } : {}),
  });
}
const jsonld = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");

const [first, ...rest] = C.name.trim().split(/\s+/);
const ogTags = `<link rel="canonical" href="${base}">
<meta name="author" content="${esc(C.name)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${esc(C.name)}">
<meta property="og:locale" content="${esc(locale)}">
<meta property="og:url" content="${base}">
<meta property="og:title" content="${esc(C.title)}">
<meta property="og:description" content="${esc(C.description)}">
${og ? `<meta property="og:image" content="${ogUrl}">
<meta property="og:image:secure_url" content="${ogUrl}">
<meta property="og:image:type" content="image/${og.endsWith(".png") ? "png" : "jpeg"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(seo.ogImageAlt || C.title)}">
` : ""}<meta property="profile:first_name" content="${esc(C.firstName || first)}">
${(C.lastName || rest.length) ? `<meta property="profile:last_name" content="${esc(C.lastName || rest.join(" "))}">\n` : ""}${seo.username ? `<meta property="profile:username" content="${esc(seo.username)}">\n` : ""}<meta name="twitter:card" content="summary_large_image">
${seo.twitter ? `<meta name="twitter:site" content="${esc(seo.twitter)}">\n<meta name="twitter:creator" content="${esc(seo.twitter)}">\n` : ""}<meta name="twitter:title" content="${esc(C.title)}">
<meta name="twitter:description" content="${esc(C.description)}">
${og ? `<meta name="twitter:image" content="${ogUrl}">\n<meta name="twitter:image:alt" content="${esc(seo.ogImageAlt || C.title)}">\n` : ""}`;
const indexExtra = `${ogTags}<link rel="manifest" href="/site.webmanifest?v=${v.mani}">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
${socials ? socials.items.filter((s) => ext(s.url)).map((s) => `<link rel="me" href="${esc(s.url)}">`).join("\n") + "\n" : ""}`;

const index = `${head({ title: C.title, description: C.description, robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", extra: indexExtra })}<script type="application/ld+json">${jsonld}</script>
</head>
<body>
${sprite}
<a class="skip" href="#main">Skip to content</a>
${T.glow ? `<div class="glow" aria-hidden="true"></div>\n` : ""}<header class="bar">
${mark}
${sections.length ? `<nav aria-label="Sections">
${sections.map(([id, , s]) => `<a href="#${id}" data-scramble>${esc(s.nav || id)}</a>`).join("\n")}
</nav>` : ""}
${smallSocial("bar-social")}
</header>
<main id="main">
<section class="hero" aria-labelledby="hero-title">
<canvas class="field" data-word="${esc(C.initials)}" aria-hidden="true"></canvas>
<h1 id="hero-title" class="hero-title"><span aria-hidden="true">${esc(C.initials)}</span><span class="sr">${esc(C.name)}</span></h1>
<div class="hero-copy">
<p class="kicker"><span class="pulse" aria-hidden="true"></span> ${esc(hero.kicker)}</p>
<p class="tagline" data-scramble data-scramble-load>${esc(hero.tagline)}</p>
<p class="hint" aria-hidden="true"><span class="hint-fine">${esc(hero.hintPointer)}</span><span class="hint-touch">${esc(hero.hintTouch)}</span> ${esc(hero.hintAfter)}</p>
</div>
${sections.length ? `<a class="cue magnetic" href="#${sections[0][0]}"><span>Scroll</span><span class="cue-line" aria-hidden="true"></span></a>` : ""}
</section>
${marqueeHtml}
${socials ? socialSection() : ""}
${brands ? brandSection() : ""}
${soon ? soonSection() : ""}
</main>
<footer class="foot">
${C.footer?.big ? `<p class="foot-big" aria-hidden="true">${esc(C.footer.big)}</p>` : ""}
${smallSocial("foot-social")}
<p class="foot-row"><span>${esc(domain)}</span><span>© <span class="year">${new Date().getFullYear()}</span> ${esc(C.footer?.copyright || C.name)}</span></p>
</footer>
</body>
</html>
`;

const nf = { kicker: "Page not found", tagline: "This part isn't built yet.", ...(C.notFound || {}) };
const page404 = `${head({ title: `404 · ${domain}`, description: "This page doesn't exist (yet).", robots: "noindex, follow" })}</head>
<body class="is-404">
<a class="skip" href="#main">Skip to content</a>
${T.glow ? `<div class="glow" aria-hidden="true"></div>\n` : ""}<header class="bar">
${mark}
</header>
<main id="main">
<section class="hero" aria-labelledby="hero-title">
<canvas class="field" data-word="404" aria-hidden="true"></canvas>
<h1 id="hero-title" class="hero-title">404</h1>
<div class="hero-copy">
<p class="kicker"><span class="pulse" aria-hidden="true"></span> ${esc(nf.kicker)}</p>
<p class="tagline" data-scramble data-scramble-load>${esc(nf.tagline)}</p>
<p><a class="btn magnetic" href="/">Back to ${esc(domain)} <span aria-hidden="true">→</span></a></p>
</div>
</section>
</main>
</body>
</html>
`;

// collapse source formatting only (newline runs between tags); inline text spacing is untouched
const minHtml = (h) => h.replace(/>\s*\n\s*</g, "><").replace(/\n+/g, " ").trim() + "\n";
for (const [f, h] of [["index.html", index], ["404.html", page404]]) {
  const out = minHtml(h);
  if (!out.includes(`<style>${css}</style>`)) fail(`${f}: inline CSS changed (CSP hash would break)`);
  if (!out.includes(`main.js?v=${v.js}`)) fail(`${f}: main.js not versioned`);
  if (/\$\{|undefined|\[object Object\]/.test(out)) fail(`${f}: template leak (undefined / \${ / [object Object])`);
  fs.writeFileSync(path.join(dist, f), out);
}
JSON.parse(jsonld); // must parse

/* ---------------- SEO text files ---------------- */
const AI = [
  ["OpenAI", ["GPTBot", "OAI-SearchBot", "ChatGPT-User"]],
  ["Anthropic", ["ClaudeBot", "Claude-Web", "Claude-User", "Claude-SearchBot", "anthropic-ai"]],
  ["Perplexity", ["PerplexityBot", "Perplexity-User"]],
  ["Google / Apple AI", ["Google-Extended", "GoogleOther", "Applebot", "Applebot-Extended"]],
  ["Common Crawl, ByteDance, Meta, Amazon, others", ["CCBot", "Bytespider", "meta-externalagent", "meta-externalfetcher", "FacebookBot", "Amazonbot", "cohere-ai", "cohere-training-data-crawler", "MistralAI-User", "DuckAssistBot", "YouBot", "Diffbot", "AI2Bot", "Timpibot"]],
];
const robots = `# robots.txt for ${base}
# ${seo.allowAICrawlers ? "Everyone is welcome to crawl this site, including search engines and AI crawlers." : "Search engines are welcome; the AI crawlers listed below are asked not to crawl."}

${AI.map(([who, bots]) => `# ${who}\n${bots.map((b) => `User-agent: ${b}`).join("\n")}`).join("\n")}
${seo.allowAICrawlers ? "Allow: /" : "Disallow: /"}

# Search engines and everyone else
User-agent: *
Allow: /

Sitemap: ${base}sitemap.xml
`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${base}</loc>
    <lastmod>${lastmod}</lastmod>${og ? `
    <image:image>
      <image:loc>${base}${og}</image:loc>
    </image:image>` : ""}
  </url>
</urlset>
`;
const andList = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + (a.length > 2 ? ", and " : " and ") + a[a.length - 1]);
const about = [socials && `links to ${C.name}'s profiles`, brands && `lists ${co ? co.name + (co.suffix || "") + " and its brands" : "their brands"}`, soon && "marks upcoming sections as coming soon"].filter(Boolean);
const md = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const summary = seo.llmsSummary || C.description;
const brandLines = brands ? [
  ...(co ? [`- [${co.name}${co.suffix || ""}](${co.url || base}): ${md([co.description, co.note].filter(Boolean).join(" "))}`] : []),
  ...(brands.items || []).map((b) => `- ${b.url ? `[${b.name}](${b.url})` : b.name}: ${md([b.category && b.category + ".", b.description].filter(Boolean).join(" "))}`),
] : [];
const llms = `# ${C.name}

> ${md(summary)}

${domain} is a single page${about.length ? ". It " + andList(about) : ""}.
${brandLines.length ? `
## ${md(brands.eyebrow || "Company and brands")}

${brandLines.join("\n")}
` : ""}${socials ? `
## Profiles

${socials.items.map((s) => `- [${label(s)}](${s.url}): ${md(s.handle || s.url)}`).join("\n")}
` : ""}
## Optional

- [Full text](${base}llms-full.txt): The whole page as plain text.
- [Sitemap](${base}sitemap.xml)
`;
const llmsFull = `# ${C.name}

> ${md(summary)}

URL: ${base}
Status: ${md(hero.tagline)}
${sections.map(([id, , s]) => {
  const h = `\n## ${num(id)} / ${md(s.eyebrow || s.nav)}: ${md([s.title, s.titleOutline].filter(Boolean).join(" "))}\n\n`;
  if (id === "socials") return h + s.items.map((x) => `- ${label(x)}: ${md(x.handle || "")}${x.handle ? ", " : ""}${x.url}`).join("\n");
  if (id === "brands") return h + [
    ...(co ? [`### ${co.name}${co.suffix || ""}${co.url ? ` (${co.url})` : ""}\n\n${md([co.eyebrow, co.description, co.note].filter(Boolean).join(". ").replace(/\.\./g, "."))}`] : []),
    ...(s.items || []).map((b) => `### ${b.name}${b.url ? ` (${b.url})` : ""}\n\n${[b.category && `Category: ${md(b.category)}.`, b.description && md(b.description), b.status && `Status: ${md(b.status)}.`].filter(Boolean).join("\n")}`),
  ].join("\n\n");
  return h + s.items.map((x) => `- ${md(x.title)}: ${md(x.label || "Coming soon").toLowerCase()}`).join("\n");
}).join("\n")}
`;
const humans = `/* TEAM */
Name: ${C.name}
Site: ${base}
${seo.twitter ? `X: ${seo.twitter}\n` : ""}${co ? `Company: ${co.name}${co.url ? ` (${co.url})` : ""}\n` : ""}
/* SITE */
Last update: ${lastmod}
Language: ${lang}
Standards: HTML, CSS, vanilla JavaScript. No trackers, no third-party requests.
Built with: CJS Portfolio (https://cjs.agency/)
`;
// Netlify / Cloudflare Pages header rules (ignored elsewhere; Caddy users see deploy/Caddyfile.example)
const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
/
  Cache-Control: no-cache
/*.html
  Cache-Control: no-cache
/main.js
  Cache-Control: public, max-age=31536000, immutable
/*.png
  Cache-Control: public, max-age=604800
/*.jpg
  Cache-Control: public, max-age=604800
/*.svg
  Cache-Control: public, max-age=604800
/site.webmanifest
  Content-Type: application/manifest+json; charset=utf-8
`;
for (const [f, s] of [["robots.txt", robots], ["sitemap.xml", sitemap], ["llms.txt", llms], ["llms-full.txt", llmsFull], ["humans.txt", humans], ["_headers", headers]]) fs.writeFileSync(path.join(dist, f), s);

/* ---------------- final checks + precompress ---------------- */
for (const f of fs.readdirSync(dist)) {
  const s = fs.readFileSync(path.join(dist, f));
  if (/\.(html|txt|xml|webmanifest|js)$/.test(f) && /\bundefined\b|\[object Object\]/.test(s.toString())) fail(`${f}: contains "undefined" or [object Object]`);
}
let n = 0;
if (!flag("--no-precompress")) for (const f of fs.readdirSync(dist)) {
  if (!/\.(html|js|css|svg|txt|xml|webmanifest|json)$/.test(f)) continue;
  const buf = fs.readFileSync(path.join(dist, f));
  const br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });
  const gz = zlib.gzipSync(buf, { level: 9 });
  if (br.length < buf.length) { fs.writeFileSync(path.join(dist, f + ".br"), br); n++; }
  if (gz.length < buf.length) { fs.writeFileSync(path.join(dist, f + ".gz"), gz); n++; }
}
const size = (f) => (fs.existsSync(path.join(dist, f)) ? fs.statSync(path.join(dist, f)).size : 0);
console.log(`built dist/ for ${base}  (theme ${C.theme}, accent ${C.accent}, lastmod ${lastmod})`);
console.log(`index.html ${size("index.html")} B (br ${size("index.html.br")} B) · main.js ${size("main.js")} B (br ${size("main.js.br")} B) · ${n} precompressed files`);
console.log(`main.js?v=${v.js}  css sha256-${cssHash}`);
