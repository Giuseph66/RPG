#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:5174}"
pwcli="${PWCLI:-/home/jesus/.codex/skills/playwright/scripts/playwright_cli.sh}"
routes=(/character /actions /journey /compendium)
widths=(320 375 768 1024 1440)
failed=0

for route in "${routes[@]}"; do
  for width in "${widths[@]}"; do
    "$pwcli" open "${base_url}${route}" >/dev/null
    "$pwcli" resize "$width" 800 >/dev/null
    result=$("$pwcli" eval "({route: location.pathname, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth})" 2>&1)
    printf '%s %s %s\n' "$route" "$width" "$(printf '%s' "$result" | grep -Eo '"overflow": (true|false)' | tail -1)"
    "$pwcli" close >/dev/null || true
    if ! printf '%s' "$result" | grep -q '"overflow": false'; then failed=1; fi
  done
done
exit "$failed"
