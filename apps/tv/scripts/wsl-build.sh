#!/usr/bin/env bash
# Mirror apps/tv from the D: repo into the WSL ext4 filesystem and build there.
# Canonical source stays at /mnt/d/RoomRiddle/apps/tv; the mirror is a disposable build workspace.
set -euo pipefail
source ~/vega/env >/dev/null 2>&1
SRC=/mnt/d/RoomRiddle/apps/tv
DST="$HOME/rr-build/tv"
BUILD_TYPE="${1:-Debug}"
mkdir -p "$DST"
command -v rsync >/dev/null || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rsync >/dev/null
rsync -a --delete --exclude node_modules --exclude build --exclude .tmp --exclude buildinfo.json "$SRC/" "$DST/"
cd "$DST"
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
