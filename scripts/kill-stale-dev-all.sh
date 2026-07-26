#!/usr/bin/env bash
# Kills leftover `nest start --watch` / `node dist/main` processes across all
# example packages, left behind by a previous Ctrl+C that didn't reach the
# detached child. Waits for each to actually exit before returning, so the
# next `tsc --watch` doesn't race a zombie still holding file handles in
# dist/ (deleteOutDir: true).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PIDS=$(
  { pgrep -f "$ROOT_DIR/ecosystem-examples/examples/.*nest\.js start" || true; pgrep -f "$ROOT_DIR/ecosystem-examples/examples/.*/dist/main" || true; } \
    | sort -u
)

if [ -z "$PIDS" ]; then
  exit 0
fi

echo "Killing stale example dev process(es): $PIDS"
kill -9 $PIDS 2>/dev/null || true

for pid in $PIDS; do
  while kill -0 "$pid" 2>/dev/null; do
    sleep 0.1
  done
done
