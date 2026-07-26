#!/usr/bin/env bash
# Kills leftover `nest start --watch` / `node dist/main` processes for the
# calling example package, left behind by a previous Ctrl+C that didn't
# reach the detached child. Waits for the process to actually exit before
# returning, so the next `tsc --watch` doesn't race a zombie still holding
# file handles in dist/ (deleteOutDir: true).
set -euo pipefail

PROJECT_DIR="$(pwd)"

PIDS=$(
  { pgrep -f "$PROJECT_DIR/.*nest\.js start" || true; pgrep -f "$PROJECT_DIR/dist/main" || true; } \
    | sort -u
)

if [ -z "$PIDS" ]; then
  exit 0
fi

echo "Killing stale dev process(es) in $PROJECT_DIR: $PIDS"
kill -9 $PIDS 2>/dev/null || true

for pid in $PIDS; do
  while kill -0 "$pid" 2>/dev/null; do
    sleep 0.1
  done
done
