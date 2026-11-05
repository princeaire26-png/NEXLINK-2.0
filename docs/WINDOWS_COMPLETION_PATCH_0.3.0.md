# NEXLINK Windows Completion Patch — 0.3.0 review

## Changes made in this patch

- Added a reusable JOXE_VERSE TECHNOLOGIES footer to the public documentation shell and authenticated administrator dashboard.
- Protected `GET /api/v1/internal/connections` with the existing JWT authentication middleware.
- Removed the production JWT fallback: the server now refuses to start in `NODE_ENV=production` unless `JWT_SECRET` is supplied and is at least 32 characters.
- Updated the WiX authoring namespace and changed the client payload target to `Program Files\Nexlink\Client`.
- Changed the server CI dependency install from `npm ci` to `npm install` because this archive did not contain `server/package-lock.json`.
- Removed the `|| true` suppression from the Node security audit so audit failures are visible to CI.

## Not completed / not certified

This patch does **not** claim production completion. The following still require implementation and Windows integration testing:

1. A real Windows Service Control Manager lifecycle for the Rust agent. `agent/src/service.rs` remains a stub.
2. A working `--enroll` CLI and a corrected end-to-end device-ID/token binding contract.
3. mDNS/DNS-SD discovery and authenticated reconnect.
4. A separate endpoint tray executable with consent and pairing UI.
5. An end-to-end remote desktop capture/encode/transport/input path.
6. Policy-enforced file transfer and Internet Guard.
7. A complete server installation package including a supported native PostgreSQL installation/configuration/migration lifecycle.
8. Client and server setup EXEs with tested repair, upgrade, rollback and uninstall.
9. Code signing, Windows Defender/SmartScreen reputation and release validation.

## Installation target

The intended per-machine installation roots are:

- `C:\Program Files\Nexlink\Server`
- `C:\Program Files\Nexlink\Client`

Installers must request elevation via the Windows UAC consent prompt. Runtime configuration, identity keys and logs must be stored under appropriate `%ProgramData%` locations with restrictive ACLs, not in writable Program Files subdirectories.

## Verification performed for this patch

- Archive extracted and source files inspected.
- Footer integration and route-middleware edits checked by source inspection.
- Server `npm install --package-lock-only` was attempted but timed out in this environment.
- Rust/Cargo and WiX are not installed in this environment.
- No Windows service, installer, PostgreSQL lifecycle, LAN discovery or remote-control integration test was run.

**Release decision: NOT PRODUCTION READY.** Do not distribute a setup executable as a working remote-management product until the outstanding items above pass automated and manual Windows tests.
