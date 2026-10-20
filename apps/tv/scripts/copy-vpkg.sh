#!/usr/bin/env bash
# copy-vpkg.sh [outDir]: copy the latest Release .vpkg files (all architectures) out of the WSL build mirror.
B=/home/aksh/rr-build/repo/apps/tv/build/private/kepler/@amazon-devices/roomriddletv/undefined/vega
O="${1:-/mnt/d/Corpus/RoomRiddle/Assets/submission/vpkg}"
mkdir -p "$O"
for a in x86_64 aarch64 armv7; do
  cp "$B/$a/Release/@amazon-devices/roomriddletv_$a.vpkg" "$O/room-riddle_${a}_release.vpkg"
done
ls -la "$O"
cd "$O" && sha256sum *.vpkg
