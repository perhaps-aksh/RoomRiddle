#!/usr/bin/env bash
# Shared by wsl-build.sh and wsl-check.sh (sourced, not run).
# Mirrors the parts of the D: repo the TV app needs into WSL's ext4 filesystem,
# keeping the repo layout so apps/tv can reach ../../packages:
#
#   ~/rr-build/repo/apps/tv     ← /mnt/d/RoomRiddle/apps/tv   (node_modules kept)
#   ~/rr-build/repo/packages    ← /mnt/d/RoomRiddle/packages  (sources only)
#   ~/rr-build/tv               → symlink to repo/apps/tv (older scripts use this path)
#
# Sets TV_DIR to the mirrored app directory.
REPO_SRC=/mnt/d/RoomRiddle
MIRROR="$HOME/rr-build/repo"
TV_DIR="$MIRROR/apps/tv"
mkdir -p "$MIRROR/apps"
command -v rsync >/dev/null || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rsync >/dev/null

# One-time migration from the Phase 1/2 layout (~/rr-build/tv as a real folder).
if [ -d "$HOME/rr-build/tv" ] && [ ! -L "$HOME/rr-build/tv" ] && [ ! -e "$TV_DIR" ]; then
  mv "$HOME/rr-build/tv" "$TV_DIR"
fi
[ -L "$HOME/rr-build/tv" ] || ln -sfn "$TV_DIR" "$HOME/rr-build/tv"

rsync -a --delete --exclude node_modules --exclude build --exclude .tmp --exclude buildinfo.json \
  "$REPO_SRC/apps/tv/" "$TV_DIR/"
rsync -a --delete --exclude node_modules "$REPO_SRC/packages/" "$MIRROR/packages/"
