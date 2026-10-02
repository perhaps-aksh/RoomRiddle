#!/usr/bin/env bash
# Install the last build on the running Vega Virtual Device and launch it (no rebuild).
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-install.sh [Debug|Release]
set -euo pipefail
source ~/vega/env >/dev/null 2>&1
LC_TYPE="$(echo "${1:-Debug}" | tr '[:upper:]' '[:lower:]')"
cd "$HOME/rr-build/repo/apps/tv"
vega run-app "build/x86_64-${LC_TYPE}/roomriddletv_x86_64.vpkg" com.roomriddle.tv.main -d VirtualDevice
