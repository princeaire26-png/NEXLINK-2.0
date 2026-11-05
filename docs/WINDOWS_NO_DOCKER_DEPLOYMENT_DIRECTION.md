# Windows installation direction — no Docker Desktop required

This guide records the intended deployment path. It does not claim that the current source is already a one-click installer.

## Architecture decision

NEXLINK remains a server/client product:

- **Server:** API, database, policy, sessions, enrollment, audit and fleet coordination.
- **Client/Agent:** background endpoint service installed on each managed computer.
- **Console:** administrator UI.
- **Agent Tray:** lightweight endpoint UI for connection state, consent and diagnostics.

## Developer setup without Docker

Docker Desktop is optional. For a native Windows development environment:

1. Install Node.js 20+.
2. Install PostgreSQL 16+ using the official Windows installer and run it as a Windows service.
3. Create a `nexlink` database and a least-privileged database user.
4. Configure `DATABASE_URL` and a unique `JWT_SECRET` in the server environment.
5. Apply the SQL migrations in `server/migrations/postgres/` in numeric order, once each.
6. Install root and server npm dependencies, then run their typecheck/build/test scripts.
7. Install Rust only if compiling the endpoint agent from source.

The current runtime demonstrably requires PostgreSQL. Redis and MinIO are in the Docker Compose example, but the inspected server source does not currently instantiate Redis or an S3/MinIO client. They are not required for the present code paths shown in this rebuild.

## Current limitations

- The existing agent Windows service module is a stub and is not invoked by `main.rs`.
- Agent CLI enrollment is a placeholder.
- There is no LAN mDNS/DNS-SD discovery implementation in the supplied source.
- The current Windows workflow can build an agent executable, but it does not yet produce a trustworthy full Server Setup.exe + Client Setup.exe.
- The API currently expects `VITE_API_URL`; same-origin production dashboard hosting still needs implementation.

Do not use the current WiX service definition to install the console agent as a service until the executable has a real service dispatcher or a tested service wrapper.

## Target first-run experience

### Server Setup.exe
- Install API and dashboard.
- Install/configure native PostgreSQL service.
- Apply versioned migrations.
- Create the first administrator.
- Configure TLS and advertise the NEXLINK server on the LAN.
- Register the NEXLINK server service and provide a health check/repair action.

### Client Setup.exe
- Install the agent service and tray application.
- Locate the server using LAN discovery or ask for a server URL.
- Pair with a one-time enrollment code.
- Store device keys using OS-protected storage.
- Show the client in the server console after successful authenticated enrollment.

## Discovery and trust

The client should initiate outbound TLS WebSocket connections. The server can then automatically mark an enrolled client online and show it in the fleet. mDNS/DNS-SD should help locate the server and advertise the agent, but must never bypass enrollment or authorization. Unknown devices remain pending until approved or covered by an explicit, narrowly scoped auto-approval policy.

## Release gate

Do not publish a Setup.exe until all of these pass on Windows 10/11 x64:

- Agent service install/start/stop/restart/uninstall.
- Upgrade from previous version while preserving identity/configuration.
- Enrollment with valid, expired, reused and invalid tokens.
- Device reconnect and online/offline state.
- Server restart and database recovery.
- Remote session authorization and revocation.
- File-transfer integrity, limits, cancellation and path traversal tests.
- Installer rollback and clean uninstall.
- No Docker Desktop installed on the test machine.
