#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER_BIN=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell 2>/dev/null | head -1)
if [[ -z "$BROWSER_BIN" ]]; then
  echo "Не найден chrome-headless-shell из кеша Playwright" >&2
  exit 1
fi
for size in 180 192 512; do
  page="$(mktemp -t icon).html"
  printf '<html><body style="margin:0"><img src="file://%s/site/icons/icon.svg" width="%s" height="%s"></body></html>' "$PWD" "$size" "$size" > "$page"
  "$BROWSER_BIN" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size="$size,$size" --screenshot="$PWD/site/icons/icon-$size.png" "file://$page" >/dev/null 2>&1
  rm -f "$page"
  echo "site/icons/icon-$size.png"
done
