#!/usr/bin/env bash
# vvd-wav-start.sh: start the VVD with its sound written to a WAV file instead of the speakers
# (qemu "wav" audio driver). Isolates the emulator's own audio from WSLg/PulseAudio (FL-013):
# if the file is clean, crackle/silence on the speakers come from the WSLg link, not the app or VVD.
# Output: qemu.wav in the directory this is started from (default: Hermes scratch).
cd "${1:-/mnt/c/Users/thaku/AppData/Local/hermes/cache/scratch}" || exit 1
source ~/vega/env >/dev/null 2>&1
rm -f qemu.wav
export QEMU_AUDIO_DRV=wav QEMU_AUDIO_OUT_DRV=wav
vega virtual-device start
sleep infinity
