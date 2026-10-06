#!/usr/bin/env bash
# Run one (or a few) TV jest specs inside the WSL ext4 mirror, full output.
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-test.sh test/Room.spec.tsx [-t 'name']
set -uo pipefail
source ~/vega/env >/dev/null 2>&1
source "$(dirname "$0")/wsl-mirror.sh"
cd "$TV_DIR"
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-fund --no-audit 2>&1 | tail -2
fi
npx jest --ci --verbose "$@" 2>&1
