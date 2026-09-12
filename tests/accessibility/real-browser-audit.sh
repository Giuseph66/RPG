#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:5174}"
pwcli="${PWCLI:-/home/jesus/.codex/skills/playwright/scripts/playwright_cli.sh}"
routes=(/ /character /actions /journey /compendium)
widths=(320 1440)
failed=0

for route in "${routes[@]}"; do
  for width in "${widths[@]}"; do
    "$pwcli" open "${base_url}${route}" >/dev/null
    "$pwcli" resize "$width" 800 >/dev/null
    result=$("$pwcli" eval "({route: location.pathname, width: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, skip: Boolean(document.querySelector('a[href=\\\"#main-content\\\"]')), main: document.querySelectorAll('main').length, nav: Boolean(document.querySelector('nav[aria-label=\\\"Destinos principais\\\"]')), unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !button.getAttribute('aria-label') && !button.textContent?.trim()).length})" 2>&1)
    printf '%s %s %s\n' "$route" "$width" "$(printf '%s' "$result" | grep -Eo '"overflow": (true|false)' | tail -1)"
    if ! printf '%s' "$result" | grep -q '"overflow": false'; then failed=1; fi
    if ! printf '%s' "$result" | grep -q '"unnamedButtons": 0'; then failed=1; fi
    "$pwcli" close >/dev/null || true
  done
done
exit "$failed"

