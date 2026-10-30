# AGENTS.md: building a site with CJS Portfolio

You are a coding agent setting up a one-page personal site for **the user** (the person you are working for) with this template.
Follow the steps in order. The whole job is usually: pick a theme → interview → `site.config.json` → remove unused themes → assets → build → verify → deploy.
Everything the site says comes from `site.config.json`. You should almost never need to touch `src/` or `scripts/`.

## Hard rules (read first, never break)

1. **Never invent facts about the person.** Every name, title, company, brand, status, date, number, quote and link must come from the user, in this conversation or a source they pointed you to. If you don't know something, ask, or leave the field/section out. Don't "improve" bios with claims (years of experience, awards, customer counts, "leading", "award-winning", ...).
2. **No contact details unless the user gives them for the site.** That covers email, phone, address, city, birthday and employer. Don't scrape them from git config, the OS, other repos or the web. The `email` icon exists, but only use it with an address the user explicitly wants public.
3. **Only link profiles the user confirms.** Check each URL with the user (and with `curl -sI` if you can). Never guess handles.
4. **Back up before every deploy.** `deploy/deploy.sh` copies the live site to `backups/<timestamp>/` before uploading. If you deploy any other way, make your own backup first (download the current site or keep the previous build) and tell the user where it is.
5. **Keep cache-busting intact.** Never hand-edit `dist/`, and never reference `main.js`, icons, the manifest or the OG image without the `?v=<hash>` the build adds. HTML must stay `no-cache`. Rebuild after every change.
6. **Don't publish, push, deploy, buy a domain, change DNS or post anything without the user's explicit OK** for that specific step.
7. **One theme per site.** The repo ships 7 themes; the site uses exactly one (`"theme"` in `site.config.json`) and only that theme's CSS/JS is built into `dist/`. Keep the chosen theme's spec below. The user may change the accent colour and all text. Don't mix themes, add web fonts, trackers, analytics, cookie banners or third-party requests unless the user asks.
8. **No placeholders in production.** `npm run build:strict` must pass before a deploy (the deploy script runs it).

## Step 0 (first install only): let the user pick a theme

Before anything else, on a fresh clone (no real content in `site.config.json` yet), send the user this, in your own words:

> CJS Portfolio comes with 7 themes: **Signal, Terminal, Paper, Aurora, Brutal, Synth and Blueprint**. Open the theme tester at **https://cjandren.com/themes/**, try them with your own initials, pick a theme and an accent colour, then press **Copy prompt** and paste it back here (or just tell me the theme and colour). If you'd rather not choose, I'll use Signal with its default orange.

Then wait for the answer. The tester's prompt looks like this, and you apply it directly:

```
Use theme: paper, accent: #e0301e in theseige/cjs-portfolio
```

- Set `"theme"` to the theme id (lowercase: `signal`, `terminal`, `paper`, `aurora`, `brutal`, `synth`, `blueprint`) and `"accent"` to the hex colour in `site.config.json`.
- If the user gives no accent, or the same colour as the theme default, set `"accent": ""` (the theme default is used).
- If the user doesn't pick, or says "you choose", use `"theme": "signal"` and `"accent": ""`.
- Only after this, continue with Step 1. Don't ask about the theme again in the interview.

## Step 1: interview the user

Ask in one friendly message. Group the questions, and say that anything they skip will simply be left out.

**Identity**
- Full name as it should appear? Initials or short word for the hero (1–3 characters; default: their initials)?
- Domain (e.g. `https://janedoe.com`)? Do they already own it, and where will it be hosted?
- A one-line description of themselves for search results and link previews (~150 characters)? Offer a draft built **only** from what they told you, and get approval.
- Job title for structured data (optional)?

**Hero**
- The teaser line under the hero (default: "Something's being built here.")? Short works best (3–7 words).
- Marquee phrases (default: "Under construction", "More soon", their domain), or none?

**Socials**
- Which profiles should appear, in what order? For each one: the exact URL and the handle as it should be displayed. Supported: x, linkedin, bluesky, github, facebook, instagram, youtube, mastodon, threads, tiktok, dribbble, medium, substack, twitch, discord, website, email.
- Their X handle for `twitter:creator` (optional)?

**Company & brands** (skip the section if none)
- Is there a parent company? Name, domain-style suffix (e.g. `.studio`), URL, one or two sentences, and a button label.
- Brands/projects: name, category (one word), one sentence, status text and state (`live` / `soon` / other), URL and link label.

**Coming soon**
- Which future sections should be teased (default: Projects, Writing, About), or none?

**Look** (already answered in Step 0)
- Theme and accent come from Step 0. If the user wants a custom accent, check it reads on the theme background (contrast ≥ 4.5:1 against the theme's `bg` for small text such as eyebrows; see each theme's spec for where the accent is used as text). Everything else is fixed by the theme.

**AI crawlers**
- Should AI crawlers (GPTBot, ClaudeBot, PerplexityBot, ...) be allowed? Default yes (`seo.allowAICrawlers: true`).

**Deploy**
- Own server (SSH) or a static host (Netlify, Cloudflare Pages, GitHub Pages, Vercel, S3)?

## Step 2: fill in `site.config.json`

- Edit only the values. Keep the structure (see the README's config reference for every key).
- Remove items you have no data for, and don't leave placeholders. To hide a whole section, set `"enabled": false` on it (or delete its `items`).
- `theme` is the theme id from Step 0 (default `signal`). `accent` is a hex colour, or `""` for the theme's default accent.
- `initials` drives the hero, the favicon and the share image. `name` is what screen readers and search engines get.
- The hero hint lines come from the theme (`src/themes/<theme>/theme.json` → `hints`). Override them only if the user asks, with `hero.hintPointer`, `hero.hintTouch` and `hero.hintAfter`.
- `seo.ogLine` is the grey line on the share image (e.g. "Designer · Founder of Acme"). Use only true facts from the user.
- `seo.ogImageAlt`: describe the image, e.g. `"Jane Doe · janedoe.com: the letters JD drawn in glowing particles on a dark background"` (describe what the chosen theme actually shows).
- Social `url` must be `https://…` (or `mailto:` for email). `handle` is display text.
- Brand `state`: `live` gives a green dot, `soon` gives amber, anything else gives grey.
- The footer `copyright` is usually the person's name.

## Step 2b: remove the unused theme files

The repo contains all 7 themes so the user can choose. Once the theme is set, delete every other theme folder so the repo only carries what the site uses:

```sh
THEME=$(node -p 'require("./site.config.json").theme || "signal"')
for d in src/themes/*/; do [ "$(basename "$d")" = "$THEME" ] || rm -rf "$d"; done
ls src/themes   # only the chosen theme is left
```

Also delete the other themes' screenshots (`docs/screenshot-<theme>.webp`) and their rows in the README theme table, and remove their spec sections from this file (keep "Shared base", "Theme files" and the chosen theme). The build only ever reads `src/themes/<theme>/`, so nothing else references the removed folders. Tell the user the other themes can be restored from the upstream repo (`theseige/cjs-portfolio`) if they change their mind. Don't remove `src/styles.css` or `src/main.js`: every theme builds on them.

## Step 3: render assets and build

```sh
npm run assets   # needs Chrome/Chromium (CHROME=/path/to/chrome if not on PATH): writes static/og.jpg + PNG icons
npm run build    # writes dist/ ; warnings tell you if assets are stale or missing
```

If Chrome is unavailable, the build still works with the committed placeholder images, but tell the user that the share image and icons still show "YN" and must be re-rendered before launch.

## Step 4: verify (all must pass before you report done)

```sh
npm run build:strict          # fails on placeholder text (Your Name, example.com, yourhandle, Brand One ...)
npm run serve                 # http://localhost:8080 ; serves .br/.gz, cache headers and 404.html like production
```

Checks:
- [ ] The build log names the chosen theme (`built dist/ for … (theme <id>, accent #…)`).
- [ ] Open `/` and `/does-not-exist` in a real or headless browser. The theme's hero effect runs and shows the initials (the 404 page shows "404"), and the tagline decodes. The console has no errors (CSP errors usually mean someone edited `dist/` by hand).
- [ ] Check the page at 1440×900 and at 390×844 (mobile). There is no horizontal scroll, the hero text stays readable over the hero effect, and the social tiles fill complete rows.
- [ ] With `prefers-reduced-motion: reduce`, the hero is a still frame (see the theme's spec), with no marquee, sparks or reveal animations.
- [ ] Every social and brand link opens the right page (`curl -sI <url>` returns 200/301/302).
- [ ] `dist/index.html` references `main.js?v=`, `favicon.svg?v=`, `site.webmanifest?v=` and `og.jpg?v=`.
- [ ] `dist/robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` and `humans.txt` contain the real domain and only true facts.
- [ ] JSON-LD is valid (the build parses it). Optionally paste the page into <https://validator.schema.org/>.
- [ ] Look at `static/og.jpg` yourself (1200×630). The name is spelled right, the initials are fully visible, and nothing is cut off.
- [ ] Lighthouse (`npx lighthouse http://localhost:8080/ --preset=desktop`, then again without `--preset` for mobile) meets these targets: **Performance ≥ 95 mobile / 100 desktop, Accessibility 100, Best practices 100, SEO 100, CLS 0**. Investigate anything lower before deploying.

Show the user a screenshot and the Lighthouse numbers, and ask them to approve before you deploy.

## Step 5: deploy (only after the user says go)

**Own server via SSH + rsync** (any Linux box with a web server; Caddy example in `deploy/Caddyfile.example`):
```sh
DEPLOY_HOST=user@server DEPLOY_PATH=/var/www/their-domain npm run deploy   # SSH_KEY=... optional, SKIP_BACKUP=1 on the very first deploy
```
The script runs a strict build, backs up the live site, runs `rsync --delete`, then curls the main URLs and confirms the live HTML has the new `main.js?v=` hash.
For the server config, copy `deploy/Caddyfile.example`, replace `example.com` and the root path, and reload Caddy. It needs `precompressed br gzip`, the 404 handler, `no-cache` on HTML and immutable caching on `?v=` URLs.

**Static hosts:** build command `npm run build`, output `dist`. Netlify and Cloudflare Pages read `dist/_headers`. Other hosts: upload `dist/` and set HTML to `no-cache` if the host allows it.

After deploying, check `https://domain/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` and a 404 URL. Suggest that the user submit the sitemap in Google Search Console and Bing Webmaster Tools, and share the URL once to warm link previews.

## Theme files (how themes work)

```
src/styles.css                  shared base: layout, components, motion. On its own it is the Signal look.
src/main.js                     shared behaviour: decode/scramble, sparks, reveal, magnetic buttons, card spotlight
src/themes/<id>/theme.json      name, concept, default accent, bg/ink/ink2, colorScheme, glow, hero hints
src/themes/<id>/theme.css       appended after src/styles.css (overrides tokens and selectors)
src/themes/<id>/hero.js         appended after src/main.js (the hero effect on canvas.field)
```

- `npm run build` reads `"theme"` from `site.config.json` (default `signal`), fails with the list of available themes if the folder doesn't exist, and builds `dist/` with `src/styles.css + theme.css` (minified, inlined, CSP-hashed) and `src/main.js + hero.js` (one cache-busted `main.js?v=`). No other theme's code ships.
- `theme.json` drives the favicon/manifest colours, `<meta name="theme-color">`, `color-scheme`, the share image colours (`npm run assets`), whether the pointer glow `div.glow` is emitted (`glow`), and the default hero hints.
- The accent: theme CSS/JS write it as `var(--accent)`, `#ff5b1f` or `rgba(255, 91, 31, a)`. The build swaps those for the resolved accent (`accent` from the config, else the theme's `accent`). Don't hardcode the accent any other way.
- **Switching theme later:** set `"theme"` (and usually `"accent": ""`) in `site.config.json`, run `npm run assets` (the share image and icons use the theme colours) and `npm run build`, then repeat Step 4. If the folder was removed in Step 2b, restore `src/themes/<id>/` from the upstream repo first.

### Reproducing a theme exactly

Every theme is fully described by its three files plus the spec below. To rebuild one from scratch (or check a copy matches):
1. `theme.json` has exactly these keys: `name`, `concept`, `accent`, `bg`, `ink`, `ink2`, `colorScheme` (`dark`/`light`), `glow` (bool), `hints` `{ hintPointer, hintTouch, hintAfter }`. Use the values in the theme's spec.
2. `theme.css` first redefines the tokens in `:root` (`--bg --bg-2 --ink --ink-2 --line --accent-soft --on-accent --bar-bg --ink-faint --dots`, plus any theme extras), then overrides the selectors listed in the spec. Selectors not mentioned keep the shared base.
3. `hero.js` is one self-contained IIFE with this contract: find `canvas.field` inside `.hero`; size it to the hero with the device pixel ratio capped at 2; boot via `requestAnimationFrame → requestIdleCallback({timeout: 500})` so the HTML text stays the LCP element; pause on `visibilitychange` and when the hero leaves the viewport (IntersectionObserver); rebuild only when the window *width* changes (debounced 160ms); track the pointer with a passive `pointermove`; read colours with `getComputedStyle(document.documentElement)` (`--accent`, `--ink`, ...); and under `prefers-reduced-motion: reduce` draw one still frame and never start the loop. If the canvas draws the initials itself, add `js-field` to `<html>` (the `h1` initials become transparent; the `.sr` full name stays for screen readers). The word is `canvas.dataset.word` (the config `initials`, or "404").
4. Build, then compare against `docs/screenshot-<id>.webp` at 1440×900 with the placeholder config, and run Step 4.

## Shared base (all themes)

These parts are the same in every theme unless the theme spec says otherwise.
- Section order: hero → marquee → socials → brands → coming soon → footer. Section numbers (`01 / …`) are assigned automatically to the sections that are on.
- Social tiles on desktop use a 6-column grid, and the build gives each tile a width (`w2` = ⅓, `w3` = ½, `w6` = full) so every row is full. On tablet there are 2 columns (an odd last tile spans both), and on mobile 1 column.
- System fonts only (`system-ui` sans stack, `ui-monospace` mono stack, and Paper's system serif stack). No web fonts.
- Decode/scramble, social sparks, reveal on scroll, magnetic buttons, the card spotlight, the marquee and the reduced-motion rules below ("Other motion" and "Reduced motion" in the Signal spec) apply to every theme. Sparks use the theme's `--accent` and `--ink`.
- Small text must keep contrast ≥ 4.5:1 on the theme background; Lighthouse Accessibility must stay 100.

## Theme: Signal (default) — "Assembly"

Dark, particle initials, one orange accent. Screenshot: `docs/screenshot-signal.webp`. `src/themes/signal/` holds only the background grid + pointer glow CSS and the particle hero; the look itself is the shared base `src/styles.css`.
`theme.json`: accent `#ff5b1f`, bg `#0a0a0c`, ink `#f4f1ea`, ink2 `#a9a59c`, dark, `glow: true`; hints "Move your cursor through it." / "Tap to break it apart." / "It always reassembles."

**Colours** (CSS custom properties in `src/styles.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0c` | page background, theme-color |
| `--bg-2` | `#111115` | cards |
| `--ink` | `#f4f1ea` | text, particles (drawn at 88% opacity) |
| `--ink-2` | `#a9a59c` | secondary text, nav, handles |
| `--line` | `rgba(244,241,234,.12)` | borders, 64 px background grid (35% opacity, radial mask from the top) |
| `--accent` | `#ff5b1f` (config `accent`) | eyebrows, dots, marquee band, sparks, excited particles, focus ring, selection |
| `--accent-soft` | accent at 16% | card spotlight, OG halo |
The build replaces every `#ff5b1f` and `255, 91, 31` in CSS and JS with the configured accent. Don't hardcode other colours.

**Type** (system fonts only: `system-ui` stack for sans, `ui-monospace` stack for mono; no web fonts)
| Element | Spec |
|---|---|
| Body | 400 17px/1.55 sans (16px under 600px) |
| Hero `h1` (no-JS fallback; canvas draws it) | 900, `clamp(160px, 42vw, 560px)`, letter-spacing -.07em |
| Tagline | 800 `clamp(28px, 5.4vw, 64px)`/1.02, -.035em, `text-wrap: balance` |
| Section `h2` | 900 `clamp(44px, 8.5vw, 120px)`/.92, -.05em; second line `em` is outlined (1.5px ink stroke, transparent fill) |
| Parent company `h3` | 900 `clamp(48px, 9vw, 112px)`/.9, -.055em |
| Social network name | 900 `clamp(44px, 5.2vw, 80px)`/.9, -.05em, outlined; filled on hover (and always on touch) |
| Brand `h3` | 800 `clamp(28px, 3vw, 38px)`, -.035em |
| Footer big line | 900 `clamp(64px, 17vw, 260px)`/.85, -.06em, outlined at 35% ink |
| Eyebrow / kicker / nav | mono 500 12px, letter-spacing .14–.18em, uppercase (eyebrows in accent) |
| Marquee | 800 `clamp(18px, 2.4vw, 28px)`, uppercase, ink-on-accent band rotated -1.5deg |
Cards: 18px radius, 1px `--line` border, `--bg-2` fill, padding `clamp(22px, 3vw, 32px)`, and a 420px accent spotlight that follows the pointer.
Easing everywhere: `cubic-bezier(.2, .8, .2, 1)`. Page padding: `clamp(20px, 5vw, 64px)`.

**Particle hero** (`src/themes/signal/hero.js`, canvas `.field`, word from `data-word` = `initials`)
- Sampling: the word is drawn in 900-weight system sans, sized to 72% of the hero width (90% when the width is under 700px). It is capped at 66% of the hero height (42% on mobile) and centred at 42% height (36% on mobile). Pixels are sampled on a grid with a gap of 4.5 / 5 / 6px (width < 500 / < 1000 / larger), each jittered ±0.3·gap. The dot size is 1.9px (width < 500) or 2.2px. The device pixel ratio is capped at 2.
- Boot: particles start scattered on a ring 0.4–1.0 × max(W,H) from the centre and assemble on load. The spring is `k = min(.03, .006 + t·.012)` (t in seconds), damping is .86, and every home position "breathes" by ±0.8px.
- Pointer: the radius is 130px (90px on mobile) and the strength 2.4. The push is `f = (1 - d/R)·S`: radial ×2.2 plus a tangential swirl ×0.9.
- Ghost autopilot: after 2.6s without input, a virtual pointer follows `x = W/2 + sin(.55t)·.3W` and `y = centre + sin(.9t + 1)·.16H`, with radius ×0.75 and strength 1.5.
- Accent dots: any particle displaced by more than √30px from home, plus about 3.5% of particles at random (seed > .965).
- Ambient dust: 90 dots (40 on mobile), 1.2px, at 28% ink, drifting up to ±0.125px per frame.
- Click/tap shockwave: radius 0.45·max(W,H), impulse `(1 - d/RR)·26·(0.6 + 0.8·seed)`, and an accent ring that grows 9px per frame while its alpha is multiplied by 0.94 (starting at 0.8).
- Performance: boot is deferred with `requestAnimationFrame → requestIdleCallback({timeout: 500})`, so the HTML text is the LCP element. Rendering pauses when the hero is off-screen (IntersectionObserver) or the tab is hidden. The field resamples on resize.
- The `h1` contains `aria-hidden` initials plus the full name in `.sr`. When JS runs, the visible initials are made transparent and the canvas takes over.

**Other motion**
- Decode/scramble: the glyph set is ``!<>-_/[]{}=+*^?#%&A–Z0–9``. The tagline decodes on load (after 350ms, over 1400ms). Nav links decode on hover/focus, and social handles decode on tile enter (650ms). Screen readers get the final text.
- Social sparks: entering a tile bursts 46 sparks (power 5), moving inside it trails 2 sparks every 28ms, and pressing bursts 90 (power 8). Small bar/footer icons burst 18. Sparks have velocity damping .95 and gravity .05, are capped at 600, and are 75% accent / 25% ink.
- Reveal on scroll: elements slide up 36px and fade in over .9s. Grid siblings are staggered by .08s.
- Pointer glow: a 560px accent radial gradient follows the mouse with lerp .18 (fine pointers only). Magnetic buttons translate by (dx·.3, dy·.4). The kicker pulse loops every 2s, the marquee every 32s and the scroll-cue drip every 2.2s.

**Reduced motion** (`prefers-reduced-motion: reduce`)
- The hero draws once, statically, at home positions, with every 23rd dot in the accent colour. There is no animation loop, ghost, dust or shockwave.
- There are no CSS animations or transitions, no marquee scroll, no glow, no sparks and no reveal (content is visible immediately). Smooth scrolling is off.

## Theme: Terminal

A phosphor CRT: the intro types itself out as a shell session over falling glyph rain. Screenshot: `docs/screenshot-terminal.webp`.
`theme.json`: accent `#39ff6a`, bg `#050805`, ink `#d6ffe0`, ink2 `#6fa77c`, dark, `glow: false`; hints "Move your cursor to stir the rain." / "Touch to stir the rain." / "".

**Tokens**: `--bg-2 rgba(57,255,106,.03)`, `--line rgba(120,255,160,.2)`, `--accent-soft` accent at 10%, `--sans: var(--mono)` (monospace everywhere), `--on-accent #050805`, `--bar-bg rgba(5,8,5,.85)`, `--ink-faint rgba(214,255,224,.3)`, `--dots rgba(214,255,224,.12)`. Body 15px.
**Look**
- `body::after`: fixed full-screen scanlines (`repeating-linear-gradient(rgba(0,0,0,.22) 0 1px, transparent 1px 3px)`) plus a radial vignette to 55% black; z-index 60, no pointer events.
- Hero `h1` stays visible (no `js-field`): mono 700 `clamp(120px, 30vw, 420px)`, lowercase, `text-shadow 0 0 28px` accent at 55%, followed by a blinking accent `▋` (`steps(1)`, 1.05s). Padding-bottom 18vh (30vh under 600px).
- The kicker gets an accent `~/` prefix; the tagline is lowercase 700 with an accent glow; `h2` is lowercase with an accent `## ` prefix and an ink-2 (not outlined) `em`.
- Cards and the parent block: dashed borders, 0 radius, accent 8% fill on hover. Social names lowercase, filled, with an accent `> ` prefix. Brand categories in `[brackets]`. Buttons outlined in accent, filled on hover. Square dots; the logo dot and live status dot blink every 1.6s.
- Footer big line: transparent fill, 1px stroke at accent 55%, lowercase.
**Hero** (`hero.js`)
- A `<pre class="term">` is inserted before the tagline and types `$ whoami` → the full name in lowercase → `$ cat now.txt` (70–140ms per key, 380–420ms pauses), so the tagline reads as the command output. With reduced motion it is printed at once.
- Glyph rain on `.field` (38% opacity): columns every 13px (15px ≥ 700px wide), glyphs `01アイウエオカキクケコｱｲｳ<>/{}[]=+*#$%&ABCDEFabcdef`, column speeds .25–.8 glyph/frame, 30 fps, trails fade with a `destination-out` fill at 9%. Columns within 60px of the pointer fall 3× faster and draw in ink.
- Reduced motion: one still frame of short 6-glyph trails (alpha .05–.25).

## Theme: Paper

Editorial print on a light page: halftone initials in ink with an off-register colour plate that rolls like a press. Screenshot: `docs/screenshot-paper.webp`.
`theme.json`: accent `#e0301e`, bg `#f2ede3`, ink `#161412`, ink2 `#5d574e`, light, `glow: false`; hints "Move your cursor to bleed the ink." / "Touch to bleed the ink." / "The press keeps rolling."

**Tokens**: `--bg-2 transparent`, `--line rgba(22,20,18,.22)`, `--accent-soft` accent at 10%, `--serif "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`, `--on-accent #fff`, `--bar-bg rgba(242,237,227,.9)`, `--ink-faint rgba(22,20,18,.35)`, `--dots rgba(22,20,18,.14)`, `color-scheme: light`.
**Look**
- Body 400 18px/1.55 serif on a 5px halftone dot texture (`radial-gradient(rgba(22,20,18,.07) 1px, transparent 1.2px)`).
- Bar: ink hairline bottom border; italic serif logo (700 24px) and nav (400 16px, no caps).
- The hero `h1` fallback, tagline, marquee, parent `h3`, social names and footer big line are italic 700 serif with tighter tracking (-.02 to -.04em). `h2` is upright 700 serif (-.035em) with an accent italic `em`. Social names turn accent on hover. Labels (kicker, eyebrow, cue, numbers, status, links) are small spaced sans; eyebrows are ink with a 1px ink top rule (the red accent fails 4.5:1 for small text on paper, so it is not used as small text).
- Hero copy sits on a 4px double ink rule over a 82% paper panel. Cards are borderless with a 2px ink top rule (accent on hover) and no spotlight; the parent block has a double top rule and a hairline bottom rule. Square buttons. The footer's first letter is accent.
**Hero** (`hero.js`, adds `js-field`)
- The initials are drawn in italic 700 serif into a mask, sized to 72% of the width (90% under 700px), capped at 66% (42%) of the height ×1.25, centred at 42% (36%) height.
- A halftone grid (13px cells, 10px under 700px; each cell averages 5 mask samples, m) draws dots of radius `√v · cell · .62 · gain` (skipped under .35px). The rolling wave is `w = .5 + .5·sin(x·.011 + y·.007 − 1.4t)·cos(y·.013 − .6t)`.
- Ink plate (`--ink`, gain 1): `v = max(m·.92, w·.13·(1 − m))`. Accent plate (accent at 90%, gain .9, phase t + .25, offset 2.5px right and down for the off-register look): `v = m > .5 ? 0 : w²·.38·(1 − m)`. The accent plate is drawn first, then the ink over it, with normal compositing. 30 fps.
- Pointer: for 2.5s after the last move, dots within 150px (90px under 700px) grow by `(1 − d/R)·.7` (ink) / `·.5` (accent), "bleeding" the ink.
- Reduced motion: one still frame with the wave fixed at .3.

## Theme: Aurora

Soft northern lights: drifting colour blobs and flowing light trails that bend around the cursor, frosted glass on top. Screenshot: `docs/screenshot-aurora.webp`.
`theme.json`: accent `#7c5cff`, bg `#07071a`, ink `#eef0ff`, ink2 `#a3a8d6`, dark, `glow: false`; hints "Move your cursor to bend the light." / "Touch to bend the light." / "".

**Tokens**: `--bg-2 rgba(255,255,255,.06)`, `--line rgba(255,255,255,.14)`, `--c2 #2de2e6` (cyan), `--c3 #ff4fd8` (magenta), `--accent-soft` accent at 18%, `--on-accent #fff`, `--bar-bg rgba(7,7,26,.45)`, `--ink-faint rgba(238,240,255,.3)`, `--dots rgba(238,240,255,.12)`.
**Look**
- Hero initials stay visible (no `js-field`): 800 weight, -.06em, a 100° gradient ink → accent → `--c2` clipped to the text (on the `aria-hidden` span only), 90% opacity.
- Frosted glass: cards, the parent block and the scrolled bar use `backdrop-filter: blur(18px) saturate(150%)`. Cards have a 22px radius and an inner 1px top highlight; the parent block 28px with an accent → cyan wash.
- `h2 em`, the footer big line and the marquee band use accent/cyan/magenta gradients; buttons are an accent → magenta gradient with white text. Eyebrows are the accent mixed 45% with white (`color-mix`). Kicker pulse is an accent → cyan gradient.
**Hero** (`hero.js`)
- A second canvas `.aura` (96px wide, aspect-matched) is inserted behind `.field` and scaled up by CSS with `blur(42px) saturate(140%)` and `scale(1.15)`. Each frame it paints `--bg`, then 5 additive (`lighter`) radial blobs at 34% alpha that drift on slow sines (`x += sin(.18t + 1.7i)·.18`, `y += cos(.14t + 2.3i)·.16`): accent at (.3, .35) r .55, cyan (.75, .3) r .5, magenta (.55, .8) r .45, accent (.15, .85) r .4, `#3b2bff` (.9, .75) r .5 (fractions of the canvas, radius × width).
- `.field` draws flow-field light trails: 650 particles (260 under 700px), angle `(sin(x·.0032 + .2t) + cos(y·.0041 − .15t))·1.6`, step 1.6px, 1.1px ink lines at 35%, fading with a 6% `destination-out` fill per frame. Particles respawn at random after 80–280 steps or when they leave the hero. For 2.5s after the last pointer move, within 160px of the pointer the angle bends by `(1 − d/160)·2.2` rad. Social names keep a 1.2px ink outline at 80%.
- Reduced motion: one frame of the blobs plus 120 steps of trails at t = 0.

## Theme: Brutal

Neo-brutalist poster: chunky block initials with hard offset shadows that you press like buttons, loud flat colour and thick black borders. Screenshot: `docs/screenshot-brutal.webp`.
`theme.json`: accent `#ff4f9a`, bg `#fff3c4`, ink `#111111`, ink2 `#3b382f`, light, `glow: false`; hints "Run your cursor over the blocks to press them. Click to shake it." / "Tap the blocks to shake them." / "".

**Tokens**: `--bg #fff3c4` (butter), `--bg-2 #ffffff`, `--ink #111`, `--ink-2 #3b382f`, `--line #111`, `--mint #7cf0c5`, `--sky #8ec5ff`, `--on-accent #111`, `--bar-bg #fff3c4`, `--ink-faint #111`, `--dots rgba(17,17,17,.22)`, `--hard: 6px 6px 0 #111`, `--b: 3px solid #111`, `color-scheme: light`. No spotlight (`--accent-soft` transparent).
**Look**
- Everything has square corners, `--b` borders and `--hard` shadows. The accent is only ever a fill under black text (never small coloured text).
- Bar: solid butter with a 3px bottom border; the logo is a boxed accent tag with a 3px shadow; nav 800 13px sans caps, underlined in accent on hover. Hero background is a 22px black dot grid.
- Hero copy is a white card (`--b`, `--hard`); the kicker pulse is a static 12px accent square. Tagline, `h2`, parent `h3`, brand `h3`, social names and footer are uppercase 900 with -.02 to -.03em tracking; `h2` line-height 1.02 and its `em` is ink on an accent highlight (`box-decoration-break: clone`).
- Eyebrows are 800 12px caps labels on mint with a 3px border and a 3px shadow. Social tiles cycle white / sky / mint fills and turn accent on hover; social names `clamp(34px, 4vw, 60px)`. Cards lift on hover (`translate(-3px,-3px)`, 9px shadow) and press on `:active` (`translate(4px,4px)`, 2px shadow). The parent block is accent-filled. Buttons are black with white text and a white-then-black double offset shadow. Marquee: accent band rotated -2deg (scale 1.04) with 3px borders and 900 type. The footer big line is ink with a 6px accent text shadow. Focus ring 3px solid black.
**Hero** (`hero.js`, adds `js-field`)
- The initials are drawn in 900 system sans into a mask, sized to 62% of the width (90% under 700px), capped at 50% (40%) of the height ×1.3, centred at 36% (34%) height, then cut into square blocks (26px, 15px under 700px). A block exists where its 5-point mask sample is > .45.
- Each block draws a black shadow square offset by 24% of the block size and a face with a 2.5px black border. Faces are the accent (18% of blocks), mint (~10%) or white, from a fixed seed. The no-JS `h1` fallback is 900 `clamp(150px, 38vw, 520px)` uppercase.
- Each block has a spring "press" value (stiffness 260, damping 18): a slow wave `.22·max(0, sin(1.6t − x·.006 − y·.004))⁶` rolls across. For 2s after the last pointer move, blocks within 2.6 block sizes of the pointer press fully into their shadow and turn accent, fading back over ~1.7s.
- Click/tap (`pointerdown` on the hero): a shockwave ring (900px/s, 1.6s) kicks blocks within 1.2 block sizes of the ring upward (out of their shadow) and steps each one once to the next face colour (white → accent → mint).
- Stickers (4 under 700px, 7 otherwise; 26/40px + up to 30px) cycle sky circle, mint triangle, accent 5-point star, with a 3px black stroke, placed between 8% and 63% height; they bob ±8px (`sin(.9t)`) and rotate .25 rad/s. 50 fps cap.
- Reduced motion: one still frame, all blocks at rest, no stickers moving.

## Theme: Synth

Synthwave sunset: a neon perspective grid rushing toward a striped sun behind chrome initials; the cursor steers the horizon. Screenshot: `docs/screenshot-synth.webp`.
`theme.json`: accent `#ff2e88`, bg `#0c0420`, ink `#fdf0ff`, ink2 `#c9a9e6`, dark, `glow: false`; hints "Move your cursor to steer. Hold to hit the boost." / "Drag to steer. Hold to boost." / "".

**Tokens**: `--bg-2 rgba(40,10,70,.55)`, `--line rgba(253,240,255,.16)`, `--c2 #2de8ff` (cyan), `--sun #ffd23f`, `--accent-soft` accent at 20%, `--on-accent #0c0420`, `--bar-bg rgba(12,4,32,.75)`, `--ink-faint rgba(253,240,255,.3)`, `--dots` cyan at 20%. Body background `linear-gradient(180deg, #0c0420, #1a0636 60%, #0c0420)`.
**Look**
- Hero initials stay visible and sit *above* the canvas (`z-index: 0`; `.hero-copy` is `z-index: 1` with a dark text shadow): italic 900 `clamp(130px, 30vw, 440px)`, -.05em, padding-bottom 12vh (26vh under 600px). Chrome fill on the `aria-hidden` span: `linear-gradient(180deg, #fff 0%, #ffe9fb 30%, #8a6bff 49%, #1b0b3a 51%, accent 64%, #ffd6ec 92%)`, with a 2px white and a 26px accent drop-shadow.
- Italic everywhere for display type; tagline, `h2`, social names and buttons uppercase. `h2 em`: sun → accent gradient text. Kicker, eyebrows (with a cyan glow), logo dot and pulse in cyan.
- Cards and the parent block: 6px radius, accent 38% border and a soft accent under-glow; on hover a cyan border and cyan glow. Social names are outlined in cyan and fill with an accent glow on hover. Buttons: accent → `#8a2bff` gradient with white text, cyan on hover. Marquee: sun → accent → violet band with dark text. Footer: striped sun/accent gradient text at 85%.
**Hero** (`hero.js`)
- Horizon at 62% of the hero height (56% under 700px). The sun (radius `min(20% W, 30% H)`, 36% W on mobile) sits with its centre .35R above the horizon, gradient sun → accent → `#8a2bff`, with 9 horizontal gaps cut out of its lower half that scroll down (.35/s) and widen toward the bottom.
- Sky `#0c0420 → #2a0b4d → #5c1460` with 140 twinkling stars (70 on mobile); two seeded mountain ridges spanning 130% of the width (far: 28 points, height up to `min(13% H, 13% W)`, `#1c0838` with a cyan edge at 45%; near: 18 points, `min(9% H, 9% W)`, `#14052b` with an accent edge at 60%) shift against the steering by .12 and .25 (the sun by .08). The sun's stripes are cut with `destination-out` and the sky is then drawn behind with `destination-over`.
- Floor: 26 horizontal lines with perspective spacing `((i − z)/26)^2.2`, scrolling at .9 lines/s, and 45 converging lines (29 on mobile), each drawn twice (4px at 18% and 1.3px at 85% accent) for the neon glow; a cyan → accent glow band on the horizon.
- Pointer: the vanishing point eases toward `W/2 + (x − W/2)·.45` (mountains and sun shift with parallax). Holding the pointer down eases the speed to 4.5× (boost).
- Reduced motion: one still frame with the grid at rest.

## Theme: Blueprint

A technical drawing: initials plotted stroke by stroke on blue drafting paper with construction lines, hatching and dimension callouts; the cursor is a measuring crosshair. Screenshot: `docs/screenshot-blueprint.webp`.
`theme.json`: accent `#ffd23f`, bg `#0d3b73`, ink `#eef5ff`, ink2 `#b9cfea`, dark, `glow: false`; hints "Move your cursor to measure. Click to redraw." / "Tap to measure and redraw." / "".

**Tokens**: `--bg-2 rgba(255,255,255,.035)`, `--line rgba(238,245,255,.34)`, `--accent-soft` accent at 12%, `--on-accent #0b2340`, `--bar-bg rgba(13,59,115,.9)`, `--ink-faint rgba(238,245,255,.55)`, `--dots rgba(238,245,255,.18)`; `--grid` = 24px minor lines at 9% ink and 120px major lines at 16% ink; `--corners` = 14px ink registration ticks at the top-left and bottom-right corners.
**Look**
- Body: `--grid` over a top radial `#12498a` glow on `--bg` (scrolls with the page).
- Thin line work: hero `h1` fallback is 300 weight outlined (1.5px ink stroke), and the tagline, `h2`, `h3`s, social names and the outlined footer are 300 weight. `h2 em` is ink with a dashed 2px accent underline.
- Annotation labels: nav links get an accent `/` prefix, the kicker an accent `FIG. 01 —` prefix (the pulse is hidden), the hint an accent `NOTE:` prefix, eyebrows `§ ` in accent, social numbers `No. `. Logo: mono 600 20px in a 1px ink box with a square accent dot.
- Cards and the parent block: square, 1px `--line` border, `--corners` ticks over `--bg-2`, a faint white spotlight. Marquee is not rotated: a transparent band between hairlines with mono 400 text, accent separators. Buttons: square accent fill, mono 600 caps, dark text. Brand categories and the soon cards are dashed.
**Hero** (`hero.js`, adds `js-field`)
- The initials are 800-weight system sans, sized to 60% of the width (84% under 700px), capped at 50% (36%) of the height ×1.35, vertically centred at 40% (34%) height (`textAlign = "center"` must be set before `measureText`, or the bounding box is wrong). 30 fps.
- Timeline from load (or from the last click/tap): 0–1.2s dashed construction lines (6/6 dashes at 38% ink, marching at 14px/s) grow out from the centre along the baseline, cap height and midline, and verticals at every letter edge grow from 50px below the baseline to 50px above the cap height; .5–2.9s the letter outlines are plotted with an ink `strokeText` (2px, 1.6px mobile) using a growing line dash `[po·fontSize·4.2, 1e5]`; 2.6–3.9s diagonal hatching (8px, 6px mobile, 42% ink) sweeps in from left to right inside the letters; 3.6–4.4s accent dimension callouts fade in (mono 500 12px, 10px mobile) (width line with arrows and `W 000.0`, rotated `H 000.0` height line, a centre mark, and `SCALE 1:1 · Y · N` above). Easing is cubic-out.
- Pointer (for 3s after the last move): full-width/height crosshair at 40% ink, an accent ring (78px, 54px mobile) with 24 ticks (every 6th long), a live `X 0000  Y 0000` readout in mono 11px accent, and accent hatching (5px) inside the ring where it overlaps the letters. Click/tap restarts the drawing.
- Reduced motion: the finished drawing (all stages complete), no crosshair.

## Changing code (rarely needed)

- Content and structure come from `scripts/build.mjs`. Shared styles are in `src/styles.css`, shared behaviour in `src/main.js`, and theme-specific code in `src/themes/<theme>/`. Keep everything dependency-free (Node built-ins only).
- To add a social network, add `{ "label", "path" }` (a 24×24 single-path SVG) to `src/icons.json`. [Simple Icons](https://simpleicons.org) (CC0) is the usual source.
- After any change: `npm run build`, then repeat Step 4.
- Don't add a runtime theme switcher, a CMS, analytics or a framework. A new theme is a new `src/themes/<id>/` folder that follows "Reproducing a theme exactly".
