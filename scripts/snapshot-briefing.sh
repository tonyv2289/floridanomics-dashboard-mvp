#!/usr/bin/env bash
# Render the briefing view to a dated PNG using headless Chrome.
# Builds the site, serves dist locally, screenshots ?view=briefing, and
# writes public/briefings/floridanomics-briefing-<date>.png + latest.png.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_chrome() {
  if [[ -n "${CHROME_BIN:-}" ]]; then echo "$CHROME_BIN"; return; fi
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    /usr/bin/google-chrome \
    /usr/bin/google-chrome-stable \
    /usr/bin/chromium-browser; do
    if [[ -x "$candidate" ]]; then echo "$candidate"; return; fi
  done
  echo "chrome not found" >&2
  exit 1
}

CHROME="$(resolve_chrome)"
STAMP="$(node -p 'require("./public/data/florida-economy.json").generatedAt.slice(0,10)')"
OUT_DIR="public/briefings"
mkdir -p "$OUT_DIR"

npm run build > /dev/null

npx vite preview --port 4198 > /tmp/briefing-preview.log 2>&1 &
PREVIEW_PID=$!
trap 'kill $PREVIEW_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:4198/floridanomics-dashboard-mvp/"; then break; fi
  sleep 1
done

"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --force-prefers-reduced-motion \
  --screenshot="$OUT_DIR/floridanomics-briefing-$STAMP.png" \
  --window-size=900,1500 --virtual-time-budget=12000 \
  "http://localhost:4198/floridanomics-dashboard-mvp/?view=briefing&snapshot=1" 2>/dev/null

cp "$OUT_DIR/floridanomics-briefing-$STAMP.png" "$OUT_DIR/latest.png"
echo "briefing snapshot: $OUT_DIR/floridanomics-briefing-$STAMP.png"
