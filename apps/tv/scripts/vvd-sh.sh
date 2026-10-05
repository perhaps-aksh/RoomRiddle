#!/usr/bin/env bash
# vvd-sh.sh '<commands>': run shell commands on the Vega Virtual Device (dev mode shell) and print the output.
# Usage (from Windows): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/vvd-sh.sh 'uptime; free'
source ~/vega/env >/dev/null 2>&1
printf '%s\nexit\n' "$1" | vega device shell -d VirtualDevice 2>&1
