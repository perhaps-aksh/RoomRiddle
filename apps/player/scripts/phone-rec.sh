#!/usr/bin/env bash
# phone-rec.sh <url> <dir> : record the player app at phone size (Playwright in WSL, ~/phonerec).
# Drive it by appending JS lines to <dir>/cmd.txt; touch <dir>/stop to finish -> <dir>/phone.webm
set -e
mkdir -p "$2"; : > "$2/cmd.txt"; rm -f "$2/stop"
cp /mnt/d/RoomRiddle/apps/player/scripts/record-phone-pw.mjs ~/phonerec/
cd ~/phonerec
exec node record-phone-pw.mjs "$1" "$2"
