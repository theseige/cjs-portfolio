# Copilot instructions

Follow [AGENTS.md](../AGENTS.md) in the repository root. It is the single source of truth for this repo: the interview questions, the hard rules (never invent facts about the person, no contact details unless given, back up before deploy, keep `?v=` cache-busting), the build/verify/deploy steps and the spec for every theme.

**First step on a fresh install:** tell the user to open the theme tester at https://cjandren.com/themes/, pick a theme and an accent colour, and paste the copied prompt (e.g. `Use theme: paper, accent: #e0301e in theseige/cjs-portfolio`) or their choice back. Wait for it, then set `"theme"` and `"accent"` in `site.config.json` (`"accent": ""` = the theme's default). If they don't pick, use `"theme": "signal"`.

Themes: `signal` (default), `terminal`, `paper`, `aurora`, `brutal`, `synth`, `blueprint`, each in `src/themes/<name>/`. Only the chosen theme is built. After the theme is set, remove the unused theme folders and their screenshots (AGENTS.md "Step 2b").
