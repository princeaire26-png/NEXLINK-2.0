# NEXLINK 0.2 — Windows/Desktop Readiness Inspection

**Inspected input:** `NEXLINK-VEYON-REBUILD-0.2.zip`  
**Inspection result:** useful development foundation; **not yet ready for a Docker-free production installer**.  
**Important:** this report does not claim that a Windows executable or installer has been built.

## Executive decision

Keep the **server + client/agent** architecture. It is the correct model for a multi-device remote-management product:

- **NEXLINK Server** is the control plane: identity, organizations, enrollment, policy, sessions, audit, device registry and coordination.
- **NEXLINK Agent** is installed on every managed endpoint. It makes an outbound authenticated connection to the server.
- **NEXLINK Console** is the administrator interface. It can be a desktop shell or a local web UI served by the server.
- A separate lightweight **Agent Tray UI** should let an endpoint user see connection state, server identity, privacy/session prompts and diagnostics. The privileged agent itself should remain a background service.

Do not replace this with a single all-in-one executable. A server can manage many clients, and clients can be distributed across different networks.

## What the supplied ZIP actually contains

- React + TypeScript dashboard.
- Express + TypeScript API.
- PostgreSQL schema and migrations.
- Rust agent, protocol and AI crates.
- A capability catalog and approval queue.
- Remote-desktop capture/session foundations.
- Docker Compose and Dockerfiles.
- An existing WiX XML file and GitHub Actions workflows.

## Blocking findings

### 1. Docker Desktop is currently required by the written setup, not by the core server code

`docs/BUILD_AND_RUN_WINDOWS.md` explicitly instructs users to install Docker Desktop and starts PostgreSQL, Redis and MinIO through Compose.

The runtime code inspected uses PostgreSQL through `pg`/Drizzle. No Redis client or S3/MinIO client is wired into the current server runtime. Redis and MinIO are present in Compose/configuration and architecture documentation, but are not currently demonstrated as required runtime dependencies.

**Direction:** remove Docker Desktop from the end-user installation path. Keep Docker Compose only as an optional developer/test deployment. Install PostgreSQL as a normal Windows service for a self-hosted server. Do not claim Redis or MinIO are mandatory until code actually depends on them.

### 2. The current Windows service is a stub

`agent/src/service.rs` says service mode is not implemented and returns `Ok(())` without registering with the Windows Service Control Manager. `agent/src/main.rs` does not declare or invoke that module.

The current WiX XML tries to register `NEXLINK-Agent.exe` as a Windows service. That will not turn a normal console executable into a valid Windows service.

**Blocker:** do not ship the existing MSI as a working background service. Implement and test service lifecycle/control handling first, or use a properly configured and tested service wrapper.

### 3. The existing installer workflow is not release-ready

The current workflow invokes `wix build installer/windows/wix/main.wixproj`, but the ZIP contains `main.wxs`, not `main.wixproj`. It also installs WiX Toolset v4 while the source XML uses the older WiX v3 namespace. The build step uses `continue-on-error: true`, which can hide installer failure.

**Direction:** make build and packaging failures fatal. Build a portable agent executable first. Only add the Setup.exe/MSI installer after service startup, stop, upgrade, rollback and uninstall have been tested on Windows.

### 4. Enrollment is not ready for hands-off installation

`agent/src/main.rs` prints that `--enroll <token>` is not implemented. The agent defaults to `wss://api.nexlink.cloud` unless configured. There is no server-discovery or first-run pairing flow in the inspected agent.

**Blocker:** an installed agent cannot currently complete a new-device enrollment by itself. Do not present a device as manageable just because its executable was installed.

### 5. Automatic device discovery is only partially present

After a device is already registered/approved and connects to `/ws`, the server verifies its registered public key, records the connection and marks it online. This is useful server-side online discovery.

However, the supplied source does not implement LAN discovery (mDNS/DNS-SD/broadcast), and the agent does not automatically locate a self-hosted NEXLINK server. The server cannot securely manage an unknown endpoint merely because it is visible on the network.

**Target behaviour:**
1. Server advertises `_nexlink-server._tcp.local` on the LAN.
2. Agent searches for that service, with manual server URL as a fallback.
3. Agent initiates an outbound TLS WebSocket connection; no inbound endpoint port needs to be opened.
4. Agent performs one-time token enrollment and cryptographic identity registration.
5. Admin approves the device or uses a deliberately scoped auto-approval policy.
6. Once approved, the server automatically lists it as online/offline and refreshes health state.

**Security rule:** discovery must not equal trust. A device can be discoverable before it is enrolled, but remote control remains disabled until authenticated and authorized.

### 6. Remote desktop and feature execution are not end-to-end complete

The capability catalog and approval queue are control-plane foundations. The feature route explicitly says approved operations are awaiting a compatible agent executor. The Rust transport currently logs action requests rather than executing them. Remote desktop has capture/session foundations but no verified complete frame/input transport path. File distribution is still marked planned in the feature matrix.

**Blocker:** never label an approved operation as executed. Do not enable terminal, arbitrary shell, file transfer or remote input until signed dispatch, device-side policy enforcement, expiry/replay protection, receipts and audit are implemented.

### 7. Current UI coverage is not yet the full desktop experience

There is a React administrator dashboard with a dark/cyan visual style and pages for overview, devices, enrollment, remote viewer and feature center. There is no installed desktop shell or Agent Tray UI in this ZIP. Several sidebar destinations (sessions, AI, automations, audit, settings) do not have corresponding routes in `App.tsx`.

**Target UI set:**
- Admin Console: device fleet, live status, groups, sessions, remote desktop, file operations, policy, audit and AI assistant.
- Agent Tray: connection health, server name, enrollment state, user consent/session notifications, pause/diagnostics.
- Server Setup Wizard: server address, database health, TLS certificate, admin bootstrap and discovery settings.

The design should be judged by usability, responsiveness, accessibility, latency and reliability—not by visual effects alone.

### 8. Additional release/security issues to fix

- `GET /api/v1/internal/connections` is registered without `authMiddleware`; restrict it to authenticated administrators or remove it from public routing.
- Server JWT configuration has a development fallback (`change-me-in-production`). Production startup must fail if a strong secret is not configured.
- The server package has no `server/package-lock.json`, while the current CI runs `npm ci` inside `server/`. That CI job cannot be reproducible with the supplied files.
- `npm audit ... || true` masks dependency-audit failures in the current workflow.
- Remote session state is currently in-memory; it will be lost on server restart and is not suitable for multi-instance coordination.
- The frontend API client requires `VITE_API_URL`; same-origin packaged hosting is not yet configured.
- The current WiX service installation and agent config paths need a proper ProgramData/service-account design.

## Recommended no-Docker end-user architecture

### Server computer

Install a normal Windows package that provisions:
- NEXLINK Server API as a Windows service.
- PostgreSQL as a native Windows service (not a Docker container).
- NEXLINK Console assets, served from the same origin as the API or wrapped in a desktop shell.
- TLS configuration and Windows Firewall rules limited to required ports.
- A setup wizard that creates the first administrator and configures the server URL.

Redis and MinIO should remain optional until a real feature requires them. A single-server installation can begin with PostgreSQL and local managed file storage, with documented limits and quotas.

### Managed computer

Install a normal NEXLINK Client package that provisions:
- A real Windows service for the Rust agent.
- A separate tray UI (not elevated unless a specific operation requires it).
- Device identity in a protected OS-backed location.
- Server discovery with a manual URL fallback.
- One-time enrollment/pairing and clear user-visible consent for interactive sessions.

### Network model

- The agent initiates outbound TLS WebSocket traffic to the server.
- The server does not need to open an inbound management port on every endpoint.
- The server sees an enrolled client as soon as its authenticated connection is established.
- LAN discovery is a convenience for locating the server/client, not an authorization mechanism.
- Remote control requires explicit user/admin policy and a time-bounded session grant.

## Verification performed during this inspection

- ZIP opened and all 135 archive entries were enumerated/extracted.
- 41 TypeScript/TSX files were parsed with the available TypeScript compiler API: **0 syntax diagnostics**.
- Root `npm ci` was attempted but timed out while resolving/downloading packages.
- Rust/Cargo, .NET and WiX are not installed in this inspection environment.

## Verification not performed

- Full React or API typecheck/build.
- Vitest test suite or PostgreSQL migrations against a live database.
- Rust compile, Clippy or Rust tests.
- Windows service install/start/stop/upgrade/uninstall.
- Windows installer build.
- LAN discovery, enrollment, remote desktop, file transfer or end-to-end security tests.

**Conclusion:** this ZIP is a promising development baseline, not a tested installer release. The next step is to fix the Windows service/enrollment/discovery/runtime packaging foundations, then run the Windows GitHub CI gate before producing the user-facing Setup.exe.
