# CJS Portfolio · media kit

Launch and listing graphics for **CJS Portfolio**, an open-source one-page personal site template by [CJS](https://cjs.agency).
All images are rendered from `src/kit.html` (HTML + canvas) with headless Chrome, so they are pixel-exact and reproducible.

**Tagline:** Your agent builds it. You own it.
**One-liner:** A one-page personal site template with an AGENTS.md any coding agent can follow, from first question to deploy.

## Assets

| File | Size | Use |
|---|---|---|
| `cjs-portfolio-announcement-1600x900.png` | 1600 × 900 | Launch post on X, LinkedIn, Bluesky, blog header |
| `cjs-portfolio-github-social-1280x640.png` | 1280 × 640 | GitHub repo → Settings → Social preview |
| `cjs-portfolio-square-1080x1080.png` | 1080 × 1080 | Instagram, LinkedIn square, Threads |
| `cjs-portfolio-readme-banner-1280x400.png` | 1280 × 400 | Top of the README |
| `cjs-portfolio-logo.svg` | vector | Logo mark on a dark rounded tile |
| `cjs-portfolio-logo-transparent.svg` | vector | Logo mark only, for dark backgrounds |
| `cjs-portfolio-logo-1024.png` | 1024 × 1024 | Full-bleed square avatar (org / project icon) |
| `cjs-portfolio-logo-512.png` | 512 × 512 | Rounded tile with transparent corners |

The logo mark is the word **CJS** drawn in particles, with a few accent-coloured dots and the signature accent dot top-right,
the same visual language as the site's particle hero. Use the transparent SVG only on dark backgrounds (the dots are off-white).

## Colours

| Token | Hex | Role |
|---|---|---|
| Background | `#0a0a0c` | page / image background |
| Surface | `#111115` | cards |
| Ink | `#f4f1ea` | text, particles |
| Ink 2 | `#a9a59c` | secondary text |
| Accent | `#ff5b1f` | signal orange: dots, kicker, links, highlights |
| Line | `rgba(244,241,234,.12)` | borders, grid |

## Fonts

- **Inter** (weight 900 for titles, 400 for body), SIL Open Font License, <https://rsms.me/inter/>
- **JetBrains Mono** (weight 500, uppercase with wide tracking for kickers and pills), SIL Open Font License, <https://www.jetbrains.com/lp/mono/>

The site itself uses the visitor's system fonts (no web fonts), so these two are for graphics only.

## Re-render

```sh
node media/src/render.mjs        # needs Chrome/Chromium; set CHROME=/path/to/chrome if it is not on PATH
```

This writes every PNG and both SVGs except `cjs-portfolio-logo-512.png`, which is a 512 px raster of `cjs-portfolio-logo.svg`
(any SVG converter works, e.g. `rsvg-convert -w 512 cjs-portfolio-logo.svg > cjs-portfolio-logo-512.png`).
Inter and JetBrains Mono must be installed for the text to match. Particle positions come from a seeded PRNG, so re-renders are identical.

## Usage notes

- Keep the dark background; the accent is the only vivid colour.
- Don't add claims (star counts, user numbers, "used by ...") to these graphics.
- Licence: the graphics are part of the repository and covered by its MIT licence. "CJS" is CJ Andren's brand; please don't use the logo mark to imply endorsement of forks.
