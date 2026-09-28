#!/usr/bin/env bash
# Typecheck, lint and test the TV app inside the WSL ext4 mirror.
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-check.sh
set -uo pipefail
source ~/vega/env >/dev/null 2>&1
source "$(dirname "$0")/wsl-mirror.sh"
cd "$TV_DIR"
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-fund --no-audit 2>&1 | tail -2
fi
RC=0
echo "== tsc"; npx tsc --noEmit -p tsconfig.json && echo "TSC_OK" || RC=1
echo "== eslint"; npx eslint src test --ext .ts,.tsx && echo "LINT_OK" || RC=1
echo "== jest"; npx jest --ci 2>&1 | tail -40; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "JEST_OK" || RC=1
# Bring any updated jest snapshots back to the D: source tree.
if [ -d test/__snapshots__ ]; then rsync -a test/__snapshots__/ "$REPO_SRC/apps/tv/test/__snapshots__/"; fi
exit $RC
