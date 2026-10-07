#!/usr/bin/env bash
# vvd-listen.sh SECS [label]: record what the VVD sends to Windows (WSLg RDPSink monitor) for SECS seconds
# and print loudness per second. Proves sound left the emulator; the user's ears prove the rest.
SECS=${1:-10}; LABEL=${2:-}
OUT=/tmp/vvd-listen.raw
if ! timeout 5 pactl info >/dev/null 2>&1; then echo "PULSE_HUNG"; exit 2; fi
timeout "$SECS" parecord -d RDPSink.monitor --raw --format=s16le --channels=1 --rate=8000 "$OUT" 2>/dev/null
python3 - "$OUT" "$LABEL" <<'PY'
import sys, array, math
a = array.array('h', open(sys.argv[1], 'rb').read())
out = []
for i in range(0, len(a), 8000):
    c = a[i:i + 8000]
    if c:
        out.append(f"{math.sqrt(sum(x * x for x in c) / len(c)):.0f}")
print(f"{sys.argv[2]} rms/s: " + " ".join(out))
PY
