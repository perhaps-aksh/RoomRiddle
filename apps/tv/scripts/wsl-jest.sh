#!/usr/bin/env bash
# Run one or more TV jest specs in the WSL mirror (full output, failures included).
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-jest.sh CharacterSpeech
set -uo pipefail
source ~/vega/env >/dev/null 2>&1
source "$(dirname "$0")/wsl-mirror.sh"
cd "$TV_DIR"
npx jest --ci "$@" 2>&1
