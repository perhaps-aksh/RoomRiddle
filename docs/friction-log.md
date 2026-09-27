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
- **Workaround:** In progress. Trying WSL2 + Ubuntu 24.04 (this machine's WSL2 exposes `/dev/kvm`), with dual-boot Ubuntu as the fallback. This entry will be updated with the result.
- **Suggestion:** Put the host-OS requirement at the very top of the install page. Officially support WSL2, since recent Windows 11 builds already expose nested KVM to WSL2. Or ship a Windows build of the VVD.
