#!/usr/bin/env bash
# Mirror apps/tv (and the shared packages) from the D: repo into the WSL ext4 filesystem and build there.
# Canonical source stays on /mnt/d/RoomRiddle; the mirror is a disposable build workspace.
set -euo pipefail
source ~/vega/env >/dev/null 2>&1
BUILD_TYPE="${1:-Debug}"
source "$(dirname "$0")/wsl-mirror.sh"
cd "$TV_DIR"
S=$(date +%s)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-fund --no-audit 2>&1 | tail -2
fi
echo "npm: $(( $(date +%s) - S ))s"
S=$(date +%s)
npx react-native build-vega --build-type "$BUILD_TYPE" > "$HOME/tv-build.log" 2>&1 && echo "BUILD_OK" || echo "BUILD_FAILED"
echo "build: $(( $(date +%s) - S ))s"
grep -E "created:|FAILED|Error" "$HOME/tv-build.log" | head -12
find build -name '*x86_64*.vpkg' 2>/dev/null
