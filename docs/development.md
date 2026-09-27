# Development

## Repository location
The repo lives on the Windows drive at `D:\RoomRiddle`. In WSL it's `/mnt/d/RoomRiddle`.

## Everything except the TV app (Windows or Linux)
```bash
npm install
npm run check        # typecheck + tests (run before every commit)
npm run dev:server   # watch mode, http://127.0.0.1:4000/health
```
Requires Node.js ≥ 22.

## TV app: Vega SDK setup
The Vega Developer Tools (Vega CLI, SDK, Vega Studio, Vega Virtual Device) officially support **Ubuntu 20.04+ and macOS 10.15+ only**. Windows and WSL aren't supported, and the VVD needs hardware virtualization (KVM or Hypervisor.framework).

**On this Windows machine the setup runs unofficially under WSL2.** This was verified on 2026-09-27 on Windows 11 (WSL 2.7.3, WSLg) with Ubuntu 24.04, Vega CLI 1.4.2 and SDK 0.24.12112. The VVD boots with KVM, and its GUI appears through WSLg.

One-time setup:
```bash
# Windows: distro stored on D:
wsl --install Ubuntu-24.04 --location D:\WSL\Ubuntu-24.04 --no-launch --web-download

# Inside Ubuntu, as a normal user in the kvm group:
sudo apt-get install -y curl git build-essential unzip lz4 jq zstd rsync cpu-checker
# python3.8 + libpython3.8-dev from deadsnakes, watchman, Node 22 (NodeSource)
# VVD runtime libs (NOT in the official prerequisite list, see FL-002):
sudo apt-get install -y libpulse0 libxcb-xkb1 libxkbcommon-x11-0 libnss3 libnspr4 libsqlite3-dev \
  libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 \
  libxcb-shape0 libxcb-xinerama0 libxcb-xfixes0 libx11-xcb1 libgl1 libegl1 libasound2t64
kvm-ok
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh -o get_vvm.sh
NONINTERACTIVE=true bash get_vvm.sh && source ~/vega/env && vega --version
```

Daily loop: see `apps/tv/README.md`. In short, `wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/wsl-run.sh`.

Useful commands (inside Ubuntu, after `source ~/vega/env`):
```bash
vega virtual-device start | status | stop
vega device list
vega device running-apps -d VirtualDevice
```
If the VVD "times out", read `~/vega/sdk/vega-sdk/main/<ver>/vvd/instances/<uuid>/virtual_device.err`. The CLI doesn't show the real error.

Screenshot of the VVD (framebuffer, not the Windows desktop): connect to the emulator console on `127.0.0.1:5554`, authenticate with the token in `~/.emulator_console_auth_token`, then send `screenrecord screenshot <dir>`.

### Note on the repo living on D:
The repo stays on `D:`, but **builds run in an ext4 mirror** (`~/rr-build/tv`) because building on `/mnt/d` is slow and produced corrupt packages (FL-003). `scripts/wsl-build.sh` handles the mirror.
