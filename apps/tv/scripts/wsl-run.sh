#!/usr/bin/env bash
# Build (via wsl-build.sh), make sure the Vega Virtual Device is up, then install + launch.
# Usage (from Windows):  wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-run.sh [Debug|Release]
set -euo pipefail
source ~/vega/env >/dev/null 2>&1
BUILD_TYPE="${1:-Debug}"
bash "$(dirname "$0")/wsl-build.sh" "$BUILD_TYPE"
if ! vega virtual-device status 2>/dev/null | grep -q '"running":true'; then
  vega virtual-device start --timeout 240
fi
cd "$HOME/rr-build/repo/apps/tv"
LC_TYPE="$(echo "$BUILD_TYPE" | tr '[:upper:]' '[:lower:]')"
vega run-app "build/x86_64-${LC_TYPE}/roomriddletv_x86_64.vpkg" com.roomriddle.tv.main -d VirtualDevice
