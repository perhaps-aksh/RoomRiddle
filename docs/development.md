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

Our plan on the Windows dev machine is to **try WSL2 (Ubuntu 24.04) first**, since WSL2 on this machine exposes `/dev/kvm`, and to fall back to native Ubuntu if the VVD won't boot. Results get recorded in `friction-log.md`.

Install (inside Linux, with VS Code closed):
```bash
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega --version
```
Ubuntu prerequisites: native `curl`, Node 18+, KVM, Watchman, `lz4`, Python 3.8 + `libpython3.8-dev`.
Docs: https://developer.amazon.com/docs/vega/0.22/install-vega-sdk.html

Build/run steps for `apps/tv` get filled in at Milestone 0, once the Vega template has been generated and launched in the VVD.

### Note on the repo living on D:
Building from `/mnt/d` in WSL works but has slower file I/O, and Metro file watching over `/mnt` may need polling. If that turns out to be a real problem, we'll log it and adjust.
