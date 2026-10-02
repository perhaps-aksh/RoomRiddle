#!/usr/bin/env bash
# vvd-shot.sh <name> [keys...] — press remote keys on the VVD (KEY_UP/DOWN/LEFT/RIGHT, KEY_ENTER, KEY_BACK;
# a bare number N = sleep N s), then screenshot via the emulator console (port 5554) into OUT_DIR.
# OUT_DIR defaults to the RoomRiddle Obsidian vault Assets folder.
source ~/vega/env >/dev/null 2>&1
NAME="$1"; shift
OUT_DIR="${OUT_DIR:-/mnt/d/Corpus/RoomRiddle/Assets}"
if [ $# -gt 0 ]; then
  CMDS=""
  for k in "$@"; do
    if [[ "$k" =~ ^[0-9.]+$ ]]; then CMDS+="sleep $k; "; else CMDS+="inputd-cli button_press $k >/dev/null 2>&1; sleep 0.7; "; fi
  done
  printf '%s\nexit\n' "$CMDS echo KEYS_DONE" | timeout 280 vega device shell -d VirtualDevice 2>&1 | grep -E "KEYS_DONE|rror" | tail -1
fi
mkdir -p /tmp/rrshots; rm -f /tmp/rrshots/*.png
python3 - <<'PY'
import socket, os, time
tok = open(os.path.expanduser('~/.emulator_console_auth_token')).read().strip()
s = socket.create_connection(('127.0.0.1', 5554), timeout=20)
for c in (f'auth {tok}', 'screenrecord screenshot /tmp/rrshots', 'quit'):
    time.sleep(0.4); s.sendall((c + '\n').encode())
time.sleep(1.5)
PY
F=$(ls /tmp/rrshots/*.png 2>/dev/null | head -1)
[ -n "$F" ] && cp "$F" "$OUT_DIR/$NAME.png" && echo "saved $NAME.png $(stat -c %s "$OUT_DIR/$NAME.png")B" || echo "NO SHOT"
