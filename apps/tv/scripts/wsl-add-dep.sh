#!/usr/bin/env bash
# Add npm dependencies to the TV app inside the WSL mirror, then copy the
# updated package.json / package-lock.json back to the D: repo.
# Usage: wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-add-dep.sh <pkg>[@ver] ...
set -euo pipefail
source ~/vega/env >/dev/null 2>&1
source "$(dirname "$0")/wsl-mirror.sh"
cd "$TV_DIR"
npm install --save --no-fund --no-audit "$@" 2>&1 | tail -5
cp package.json package-lock.json "$REPO_SRC/apps/tv/"
grep -n "$(echo "$1" | sed 's/@[^@/]*$//')" package.json
