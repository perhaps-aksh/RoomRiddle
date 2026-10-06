#!/usr/bin/env bash
# vvd-relaunch-log.sh [seconds] [out-file]: restart the installed app (no reinstall, so app data is kept)
# while recording device logs; writes the whole log to out-file (default: Hermes scratch rr-device.log).
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/vvd-relaunch-log.sh 25
SECS="${1:-25}"
OUT="${2:-/mnt/c/Users/thaku/AppData/Local/hermes/cache/scratch/rr-device.log}"
source ~/vega/env >/dev/null 2>&1
APP=com.roomriddle.tv.main
vega device terminate-app --appName "$APP" -d VirtualDevice >/dev/null 2>&1 || true
sleep 2
# Record from the host side (the device shell can't run quoted pipelines reliably).
(printf 'timeout %s loggingctl log -f\nexit\n' "$((SECS + 4))" | vega device shell -d VirtualDevice > "$OUT" 2>&1 &)
sleep 2
vega device launch-app --appName "$APP" -d VirtualDevice 2>&1 | tail -1
sleep "$((SECS + 4))"
wc -l < "$OUT"
