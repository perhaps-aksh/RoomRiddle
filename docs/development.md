# Development

## Repository location
The repo lives on the Windows drive at `D:\RoomRiddle`. In WSL it's `/mnt/d/RoomRiddle`.

## Everything except the TV app (Windows or Linux)
```bash
npm install
npm run check        # typecheck + tests (run before every commit)
npm run dev:server   # watch mode, http://127.0.0.1:4000/health
npm run serve        # build the phone app, then start the server for LAN play
```
Requires Node.js ≥ 22.

## Playing multiplayer on the LAN (Phase 4)
1. `npm run serve`. The server listens on `0.0.0.0:4000` and prints the phone URL (`http://<LAN IP>:4000/join/<code>`). Override it with `PUBLIC_URL=http://…:4000`. Other settings: `PORT`, `HOST`, `ROOM_MIN_PLAYERS` (default 2), `ROOM_MAX_PLAYERS` (6).
2. TV (Vega Virtual Device): start the bridge inside WSL, `wsl.exe -d Ubuntu-24.04 -- node /mnt/d/RoomRiddle/apps/tv/scripts/vvd-bridge.js`. The TV app connects to `ws://10.0.2.2:4000/ws`, which the bridge forwards to Windows, so a DHCP change needs no rebuild (FL-010). Build and run (`wsl-build.sh`, then `wsl-install.sh`), then choose **Create Room**. The TV shows the code and QR code. A physical Fire TV needs `apps/tv/src/config/server.ts` set to `ws://<LAN IP>:4000/ws` instead.
   - On-device screenshots: `wsl.exe -d Ubuntu-24.04 -- bash /mnt/d/RoomRiddle/apps/tv/scripts/vvd-shot.sh <name> KEY_DOWN KEY_ENTER 2 …` presses remote keys (a bare number sleeps) and saves a PNG through the emulator console into the vault `Assets/`.
3. Phones (same Wi-Fi): scan the QR code or open `http://<LAN IP>:4000` and enter the code and a name. Windows may ask to allow Node through the firewall on private networks.
4. TV: **Start**.

Without a TV, `npm run fake-tv -w @roomriddle/server` creates a room from the command line (it logs every event and starts when 2 phones are in). `npm run play-bots -w @roomriddle/server -- <code>` plays The Last Train with two scripted phones, including a mid-game disconnect and resume.

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
