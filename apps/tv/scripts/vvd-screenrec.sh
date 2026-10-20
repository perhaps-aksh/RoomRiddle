#!/usr/bin/env bash
# vvd-screenrec.sh start <file.webm> [limitSecs] | stop — record the VVD screen through the emulator console (port 5554).
# The file is written by the emulator on the WSL side (use a /tmp or /mnt path).
CMD="$1"; FILE="$2"; LIMIT="${3:-180}"
python3 - "$CMD" "$FILE" "$LIMIT" <<'PY'
import socket, os, sys, time
cmd, f, limit = sys.argv[1], sys.argv[2], sys.argv[3]
tok = open(os.path.expanduser('~/.emulator_console_auth_token')).read().strip()
s = socket.create_connection(('127.0.0.1', 5554), timeout=20)
line = f'screenrecord start --time-limit {limit} --fps 24 {f}' if cmd == 'start' else 'screenrecord stop'
out = b''
for c in (f'auth {tok}', line, 'quit'):
    time.sleep(0.4); s.sendall((c + '\n').encode())
time.sleep(1.0)
try:
    s.settimeout(1); out = s.recv(65536)
except Exception:
    pass
print(out.decode(errors='replace').strip().splitlines()[-3:])
PY
