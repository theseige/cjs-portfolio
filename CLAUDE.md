# CLAUDE.md

Read and follow [AGENTS.md](AGENTS.md). It is the single source of truth for this repo: the questions to ask, the hard rules, the build/verify/deploy steps and the spec for every theme.

**First step on a fresh install (before the interview):** tell the user to open the theme tester at https://cjandren.com/themes/, pick a theme and an accent colour, and paste the copied prompt (e.g. `Use theme: paper, accent: #e0301e in theseige/cjs-portfolio`) or their choice back to you. Wait for the answer. Then set `"theme"` and `"accent"` in `site.config.json` (`"accent": ""` = the theme's default) and finish the setup with that theme. If they don't pick, use `"theme": "signal"`.

Themes: `signal` (default), `terminal`, `paper`, `aurora`, `brutal`, `synth`, `blueprint`, each in `src/themes/<name>/`. Only the chosen theme is built. Once the theme is set, remove the unused theme folders (`src/themes/<other>/`) and their screenshots, as described in AGENTS.md "Step 2b".
