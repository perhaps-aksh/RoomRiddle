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

## FL-004: `BackHandler` is undefined under the Vega Jest preset
- **Date:** 2026-09-27
- **Task:** Unit-test the TV shell's Back handling with the Jest setup the `helloWorld` template generates (`preset: @amazon-devices/react-native-kepler`, SDK 0.24.12112).
- **Steps:** Call `BackHandler.addEventListener('hardwareBackPress', …)` in a component, render it with `@testing-library/react-native`.
- **Expected:** The preset mocks `BackHandler`, as it mocks other core modules.
- **Actual:** `TypeError: Cannot read properties of undefined (reading 'addEventListener')`: `require('react-native').BackHandler` is `undefined` in tests (verified with a probe spec). The preset sets Haste `defaultPlatform: 'kepler'`, and its `jest/setup.js` registers a mock for `KeplerBackHandler` but none for `BackHandler`. The preset ships `jest/mocks/BackHandler.js`, but `setup.js` never references it. Mocking the `.kepler` variant (below) fixes it, which points at the `BackHandler.kepler.js` resolution path. The exact failure inside the lazy getter wasn't traced further.
- **Severity:** Low to medium. Any app using the documented `BackHandler` API can't be tested out of the box, and the error message points at app code.
- **Workaround:** `apps/tv/test/support/backHandler.ts` mocks `@amazon-devices/react-native-kepler/Libraries/Utilities/BackHandler.kepler`, returning a real `{remove}` subscription and a `pressBack()` helper to simulate the remote.
- **Suggestion:** Register the existing `jest/mocks/BackHandler.js` for the `.kepler` variant in `jest/setup.js`, and return a subscription object from its `addEventListener`.

## FL-005: VVD lays out at 960×540 dp, so 1080p design values render at 2×
- **Date:** 2026-09-27
- **Task:** Lay out TV screens with sizes designed for a 1920×1080 canvas (the VVD's screenshot resolution and the usual Fire TV output).
- **Steps:** Use style values such as `fontSize: 104` for a wordmark, build, run on the VVD.
- **Expected:** Style units map to 1080p pixels, or the docs state the layout-unit canvas size.
- **Actual:** Everything rendered twice as large: the wordmark wrapped and the menu fell off-screen. The window is 960×540 layout units at 2× density, and screenshots are 1920×1080. The hello-world template's own sizes (64 px headings, 280 px tiles) hide this because they happen to fit.
- **Severity:** Medium. It is the first thing a TV layout hits, and it's only obvious on-device.
- **Workaround:** `px()` in `apps/tv/src/theme/theme.ts` scales 1080p design pixels by `min(window.width/1920, window.height/1080)` and rounds with `PixelRatio.roundToNearestPixel`.
- **Suggestion:** State the VVD / Fire TV layout canvas (dp size and density) on the UI design and "10-foot UI" pages, with a sizing helper example.

## FL-006: The VVD stops when the last WSL session exits
- **Date:** 2026-09-27
- **Task:** Start the VVD from a one-shot `wsl.exe -- bash -lc '…'` command, then install the app from a second command.
- **Steps:** `wsl.exe -d Ubuntu-24.04 -- bash wsl-run.sh` (starts the VVD, builds, runs), then later `vega run-app …` from a new `wsl.exe` call.
- **Expected:** The VVD keeps running between commands, like it does in a native Ubuntu terminal.
- **Actual:** `run-app` right after boot failed with "Cannot read properties of undefined (reading 'trim')", and later calls found "No devices found". WSL shuts the distro down when no session is left, which kills QEMU.
- **Severity:** Low (WSL-specific, and WSL is unofficial, see FL-001). The `trim` error is opaque, though.
- **Workaround:** Keep one long-lived WSL session open, e.g. a background `wsl.exe … 'vega virtual-device start; while true; do sleep 60; done'`, then run build/install commands in separate calls.
- **Also:** `vega run-app` printed "Vega operation FAILED due to an irrecoverable error…" but **exited with code 0**. `wsl-run.sh` runs under `set -euo pipefail` and `run-app` is its last command, yet the script reported `EXIT=0`, so scripts and CI can't detect the failure.
- **Suggestion:** When the device disappears mid-command, report "virtual device not running" instead of a JavaScript `trim` error, and exit non-zero on any "operation FAILED".

## FL-007: Remote-key injection is slow, and the game clock keeps running
- **Date:** 2026-09-28
- **Task:** Play The Last Train end to end on the VVD with a 20-minute in-game timer.
- **Steps:** One `vega device run-cmd -d VirtualDevice -c "inputd-cli button_press KEY_X"` per key.
- **Expected:** Near-instant key presses, as with a physical remote.
- **Actual:** Each `run-cmd` takes several seconds of CLI overhead, so a full scene cost minutes of real (in-game) time. Pressing keys too quickly in a batch also gave misleading screenshots, because focus had not settled before the capture.
- **Severity:** Low. It only affects automated testing.
- **Workaround:** Send the whole key sequence in one on-device command (`inputd-cli button_press A; sleep 0.9; inputd-cli button_press B; …`) inside a single `run-cmd`, which gave exact, repeatable navigation. Take the screenshot after the sequence, from a separate call.
- **Suggestion:** A documented `vega device send-keys <k1> <k2> …` with a configurable delay, for remote-driven UI tests.

## FL-008: VVD boot hangs when `/dev/kvm` loses its `kvm` group in WSL
- **Date:** 2026-09-29
- **Task:** Restart the VVD for the Phase 4 TV + phones test.
- **Steps:** `vega virtual-device start --timeout 300` in WSL2 Ubuntu 24.04 (user in the `kvm` group).
- **Expected:** The VVD boots in about a minute, as on earlier days.
- **Actual:** "Deadline reached (300s) but virtual device unresponsive." `virtual_device.out` was full of `TCG doesn't support requested feature: CPUID.01H:ECX.tsc-deadline`, meaning the emulator had fallen back to software emulation. `/dev/kvm` was `root:render 660`, so the `kvm`-group user couldn't open it. `kvm-ok` still said "KVM acceleration can be used", which was misleading. Once, a running VVD also died at the moment `/dev/kvm` was recreated.
- **Severity:** Medium for WSL users (unofficial, see FL-001). The CLI only reports a timeout.
- **Workaround:** `wsl.exe -d Ubuntu-24.04 -u root -- bash -c 'chgrp kvm /dev/kvm; chmod 660 /dev/kvm'` before starting the VVD. It then booted normally.
- **Suggestion:** Check that `/dev/kvm` can be opened before launching, and say "KVM not accessible, falling back to TCG" instead of timing out.
