#!/usr/bin/env bash
set -euo pipefail

# QA-004 browser smoke matrix. It observes the built application through a real
# browser; persistence/offline assertions remain in the focused suites cited by
# the acceptance report.
base_url="${BASE_URL:-http://127.0.0.1:5173}"
pwcli="${PWCLI:-/home/jesus/.codex/skills/playwright/scripts/playwright_cli.sh}"
routes=(/ /character /actions /journey /compendium)
widths=(320 1280)
failed=0

for route in "${routes[@]}"; do
  for width in "${widths[@]}"; do
    "$pwcli" open "${base_url}${route}" >/dev/null
    "$pwcli" resize "$width" 800 >/dev/null
    result=$("$pwcli" eval "({route: location.pathname, width: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, skip: Boolean(document.querySelector('a[href=\\\"#main-content\\\"]')), main: document.querySelectorAll('main').length, nav: Boolean(document.querySelector('nav[aria-label=\\\"Destinos principais\\\"]')), dice: Boolean(document.querySelector('button[aria-label=\\\"Abrir rolagem de dados\\\"]')), unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !button.getAttribute('aria-label') && !button.textContent?.trim()).length})" 2>&1)
    printf '%s %s %s\n' "$route" "$width" "$(printf '%s' "$result" | grep -Eo '"overflow": (true|false)' | tail -1)"
    if ! printf '%s' "$result" | grep -q '"overflow": false'; then failed=1; fi
    if ! printf '%s' "$result" | grep -q '"main": 1'; then failed=1; fi
    if ! printf '%s' "$result" | grep -q '"unnamedButtons": 0'; then failed=1; fi
    "$pwcli" close >/dev/null || true
  done
done

# The global dice control must preserve the opener through the real overlay
# lifecycle, including the inert cleanup performed when the dialog closes.
"$pwcli" open "${base_url}/" >/dev/null
"$pwcli" click 'button[aria-label="Abrir rolagem de dados"]' >/dev/null
dialog_result=$("$pwcli" eval "({dialog: Boolean(document.querySelector('[role=\\\"dialog\\\"]')), focusedInside: Boolean(document.querySelector('[role=\\\"dialog\\\"]')?.contains(document.activeElement))})" 2>&1)
if ! printf '%s' "$dialog_result" | grep -q '"dialog": true'; then failed=1; fi
if ! printf '%s' "$dialog_result" | grep -q '"focusedInside": true'; then failed=1; fi
"$pwcli" click 'button[aria-label="Fechar"]' >/dev/null
focus_result=$("$pwcli" eval "({dialog: Boolean(document.querySelector('[role=\\\"dialog\\\"]')), activeLabel: document.activeElement?.getAttribute('aria-label') ?? '', activeTag: document.activeElement?.tagName ?? ''})" 2>&1)
printf 'dice-close %s\n' "$(printf '%s' "$focus_result" | tail -1)"
if ! printf '%s' "$focus_result" | grep -q '"dialog": false'; then failed=1; fi
if ! printf '%s' "$focus_result" | grep -q 'Abrir rolagem de dados'; then failed=1; fi
"$pwcli" close >/dev/null || true

exit "$failed"
