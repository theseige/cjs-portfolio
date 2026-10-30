#!/bin/sh
# Build -> back up the live site -> rsync dist/ to any server you can SSH into -> check it is live.
#
#   DEPLOY_HOST=user@your-server DEPLOY_PATH=/var/www/example.com sh deploy/deploy.sh
#
# Optional: SSH_KEY=~/.ssh/your_key  SITE_URL=https://example.com (defaults to "url" in site.config.json)
#           SKIP_BACKUP=1 (first deploy)  ALLOW_PLACEHOLDERS=1 (deploy even if placeholder content remains)
# Not using a server? Run `npm run build` and upload dist/ to any static host (see README > Deploy).
set -eu
cd "$(dirname "$0")/.."

: "${DEPLOY_HOST:?set DEPLOY_HOST, e.g. DEPLOY_HOST=user@your-server}"
: "${DEPLOY_PATH:?set DEPLOY_PATH, e.g. DEPLOY_PATH=/var/www/example.com}"
SITE_URL="${SITE_URL:-$(node -p 'require("./site.config.json").url.replace(/\/$/, "")')}"
SSH="ssh"
[ -n "${SSH_KEY:-}" ] && SSH="ssh -i $SSH_KEY"

# 1. build (strict: refuses to ship "Your Name", example.com, yourhandle ...)
if [ -n "${ALLOW_PLACEHOLDERS:-}" ]; then node scripts/build.mjs; else node scripts/build.mjs --strict; fi
JS=$(grep -o 'main\.js?v=[0-9a-f]*' dist/index.html | head -1)
[ -n "$JS" ] || { echo "cache-bust failed: no versioned main.js in dist/index.html"; exit 1; }

# 2. back up what is live right now
if [ -z "${SKIP_BACKUP:-}" ]; then
  B="backups/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$B"
  rsync -a -e "$SSH" "$DEPLOY_HOST:$DEPLOY_PATH/" "$B/"
  echo "backup: $B  (restore: rsync -a --delete -e \"$SSH\" $B/ $DEPLOY_HOST:$DEPLOY_PATH/)"
fi

# 3. upload (--delete removes files that are no longer in dist/)
rsync -az --delete --exclude '_headers' -e "$SSH" dist/ "$DEPLOY_HOST:$DEPLOY_PATH/"

# 4. check
for p in / /robots.txt /sitemap.xml /llms.txt /llms-full.txt /site.webmanifest /favicon.svg /this-page-does-not-exist; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "$SITE_URL$p"
done
if curl -s "$SITE_URL/" | grep -q "$JS"; then echo "live HTML references $JS"; else echo "live HTML is missing $JS (stale cache or wrong DEPLOY_PATH?)"; exit 1; fi
