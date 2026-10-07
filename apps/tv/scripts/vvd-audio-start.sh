#!/usr/bin/env bash
# vvd-audio-start.sh: start the Vega Virtual Device with working sound on WSLg (friction log FL-013).
#  - WSLg's PulseAudio hangs when the VVD records from its microphone bridge (rdp-source / null-sink
#    "q overrun" until the server stops answering); the VVD never needs a microphone, so input is off.
#  - A larger PulseAudio buffer stops the crackle (default ~3 ms buffers underrun under VVD CPU load).
# Usage (from Windows, background): wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/vvd-audio-start.sh
set -u
source ~/vega/env >/dev/null 2>&1
if ! timeout 5 pactl info >/dev/null 2>&1; then
  echo "WSLg PulseAudio is not answering: run 'wsl.exe --shutdown', then this script again." >&2
  exit 1
fi
for inst in "$HOME"/vega/sdk/vega-sdk/main/*/vvd/instances/*/; do
  for f in config.ini hardware-qemu.ini; do
    [ -f "$inst$f" ] && sed -i -E 's/^hw\.audioInput *= *(yes|true)/hw.audioInput = no/' "$inst$f"
  done
done
export PULSE_LATENCY_MSEC="${PULSE_LATENCY_MSEC:-80}"
vega virtual-device start
sleep infinity
