#!/usr/bin/env bash
# vvd-record.sh [seconds] [out-file]: record device logs in the background for N seconds and return at once,
# so a remote-driving script (vvd-shot.sh) can run meanwhile. Default out: Hermes scratch rr-device.log.
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/vvd-record.sh 90
SECS="${1:-60}"
OUT="${2:-/mnt/c/Users/thaku/AppData/Local/hermes/cache/scratch/rr-device.log}"
source ~/vega/env >/dev/null 2>&1
# Record from the host side (the device shell can't run quoted pipelines reliably).
(printf 'timeout %s loggingctl log -f\nexit\n' "$SECS" | setsid vega device shell -d VirtualDevice > "$OUT" 2>&1 &)
sleep 2
echo "recording ${SECS}s to $OUT"
