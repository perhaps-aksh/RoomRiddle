# Friction Log

Real development problems with Amazon Vega / Fire TV tooling and related infrastructure, recorded as they happen for the hackathon submission. Nothing in here is invented or hypothetical.

Format: **Task · Steps · Expected · Actual · Severity · Workaround · Suggestion**

---

## FL-001: Vega SDK has no Windows host support
- **Date:** 2026-09-27
- **Task:** Set up the Vega development environment (Milestone 0) on the developer's primary machine, a Windows 11 laptop.
- **Steps:** Read "Install the Vega Developer Tools" (docs v0.22) to find the Windows install path.
- **Expected:** A Windows installer, or an officially supported WSL2 route, since Windows is the most common developer OS.
- **Actual:** Only native macOS 10.15+ and Ubuntu 20.04+ are supported. The install page lists macOS and Ubuntu dependencies but never says Windows is unsupported. We learned that from the Vega "Getting started" blog ("Windows and WSL are not currently supported") and from a community Q&A where Amazon support confirmed that WSL, VirtualBox and Docker can't run the Vega Virtual Device.
- **Severity:** High. It blocks the first milestone for Windows-only developers.
- **Workaround:** It works, unofficially. On Windows 11 (WSL 2.7.3, kernel 6.6.114, WSLg 1.0.73), Ubuntu 24.04 in WSL2 exposes `/dev/kvm` (`kvm-ok`: "KVM acceleration can be used"). The standard installer (`NONINTERACTIVE=true`) installed Vega CLI 1.4.2 and SDK 0.24.12112. After the extra libraries in FL-002 were installed, `vega virtual-device start` booted the VVD with its GUI shown through WSLg, and `vda devices` listed `emulator-5554 device`.
- **Suggestion:** Put the host-OS requirement at the very top of the install page. Officially support (or at least document) WSL2: on current Windows 11 builds it already exposes nested KVM, and the VVD runs there with a few extra packages.

## FL-002: VVD start times out silently when host libraries are missing
- **Date:** 2026-09-27
- **Task:** Start the Vega Virtual Device with its GUI after a fresh SDK install on Ubuntu 24.04 (WSL2).
- **Steps:** Install every Ubuntu prerequisite from the install docs (curl, Node, KVM, Watchman, lz4, python3.8 + libpython3.8-dev), then run `vega virtual-device start --timeout 300`.
- **Expected:** Either the VVD boots, or the CLI reports why it can't start.
- **Actual:** The CLI printed "Waiting for virtual device to boot." and after 300 s gave up with "Deadline reached (300s) but virtual device unresponsive." Nothing else. The real cause was only in the per-instance log `~/vega/sdk/vega-sdk/main/<ver>/vvd/instances/<uuid>/virtual_device.err`: `vega-virtual-device: error while loading shared libraries: libpulse.so.0: cannot open shared object file`. Running `ldd` over the VVD binaries also turned up missing `libxcb-xkb.so.1`, `libnss3`/`libnspr4` and `libsqlite3.so`. None of these are in the documented prerequisites.
- **Severity:** Medium. It costs a lot of time, because the CLI message points at a slow or hung boot rather than a missing dependency.
- **Workaround:** `sudo apt-get install libpulse0 libxcb-xkb1 libxkbcommon-x11-0 libnss3 libnspr4 libsqlite3-dev` plus the usual X11/xcb runtime libraries. After that `vega virtual-device start` reported "Virtual device ready." (RC 0), with the GUI window shown through WSLg, and `vda devices` listed `emulator-5554 device`.
- **Suggestion:** Have `vega virtual-device start` check that the emulator process is still alive while it waits, and print the tail of `virtual_device.err` when the process exits early. Add the runtime libraries to the Ubuntu prerequisites, or ship an `apt` one-liner or `vega doctor` check. Also, `vda` isn't on `PATH` after `source ~/vega/env`, even though the CLI shells out to it.

## FL-003: Building on a Windows drive mounted in WSL produces a corrupt .vpkg
- **Date:** 2026-09-27
- **Task:** Build the generated helloWorld app with `npm run build:debug` from the repo on `D:` (`/mnt/d/RoomRiddle/apps/tv`, WSL2 Ubuntu 24.04, SDK 0.24.12112).
- **Steps:** `npm install` (took about 15 min on `/mnt/d`), then `npm run build:debug`.
- **Expected:** A valid `.vpkg`, or a clear error.
- **Actual:** `.vpkg` files were produced, but the build then failed in `native-build` with `vpt`: "failed to parse manifest: line 1 is empty". After unpacking the package (`tar --zstd -xf`), `manifest.toml`, `assets/raw/keplerscript-app-config.json`, `assets/kepler-sdk-version` and `bundle/assets/app.json` all had the right sizes but were **entirely zero bytes**. The source `manifest.toml` on `D:` was normal ASCII.
- **Severity:** High for Windows+WSL users. The failure message points at the manifest content, not at the filesystem.
- **Workaround:** Build from WSL's own ext4 filesystem. `apps/tv/scripts/wsl-build.sh` rsyncs the source from `D:` to `~/rr-build/tv` and builds there. Results: `npm ci` took 31 s, the build took 31 s, and all three `.vpkg` files (aarch64/armv7/x86_64) were valid. The x86_64 package installed and launched on the VVD.
- **Suggestion:** Detect `/mnt/<drive>` (9p/drvfs) project paths in `vega build` and warn, or say in the docs that the project must live on the Linux filesystem when using WSL.
