#!/usr/bin/env bash
# 本地校验：crosscheck + repair + validate + render
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FIXTURES="${REPO_ROOT}/trends/fixtures"

fail=0

run() {
  if "$@"; then
    printf 'OK  %s\n' "$*"
  else
    printf 'FAIL %s\n' "$*"
    fail=1
  fi
}

run_expect_fail() {
  if "$@"; then
    printf 'FAIL (expected non-zero) %s\n' "$*"
    fail=1
  else
    printf 'OK  (expected fail) %s\n' "$*"
  fi
}

# 1. valid fixture + crosscheck
run python3 "${SCRIPT_DIR}/crosscheck-trends.py" "${FIXTURES}/valid-signals.md"
run python3 "${SCRIPT_DIR}/repair-trends-json.py" "${FIXTURES}/valid-signals.md"
run python3 "${SCRIPT_DIR}/validate-trends-md.py" "${FIXTURES}/valid-signals.md"
run python3 "${SCRIPT_DIR}/render-trend-html.py" "${FIXTURES}/valid-signals.md"
rm -f "${FIXTURES}/index.html"

# 2. trailing comma repair
cp "${FIXTURES}/bad-trailing-comma.md" "${FIXTURES}/.tmp-bad.md"
run python3 "${SCRIPT_DIR}/repair-trends-json.py" "${FIXTURES}/.tmp-bad.md"
run python3 "${SCRIPT_DIR}/validate-trends-md.py" "${FIXTURES}/.tmp-bad.md"
rm -f "${FIXTURES}/.tmp-bad.md"

# 3. crosscheck drops phantom URL → block below min_signals → exit 1
run_expect_fail python3 "${SCRIPT_DIR}/crosscheck-trends.py" "${FIXTURES}/crosscheck-mismatch.md"

# 4. legacy table day still renders
if [[ -f "${REPO_ROOT}/trends/2026-06-01/index.md" ]]; then
  run python3 "${SCRIPT_DIR}/render-trend-html.py" "${REPO_ROOT}/trends/2026-06-01/index.md"
fi

if [[ "${fail}" -ne 0 ]]; then
  exit 1
fi
printf 'trends-check: all passed\n'
