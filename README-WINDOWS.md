# NEXLINK on Windows

Docker Desktop is **not** intended to be an end-user prerequisite. Docker Compose remains an optional developer deployment method.

Read these current documents before attempting a Windows installation:

- [Windows desktop readiness inspection](docs/WINDOWS_DESKTOP_READINESS_INSPECTION.md)
- [No-Docker deployment direction](docs/WINDOWS_NO_DOCKER_DEPLOYMENT_DIRECTION.md)
- [Build and run guide](docs/BUILD_AND_RUN_WINDOWS.md)
- [Current rebuild status](docs/REBUILD_STATUS.md)

**Release warning:** the supplied Windows service module and enrollment CLI are not implemented. The existing WiX service package must not be treated as a working client installer. The new GitHub workflow validates and uploads a portable Windows agent executable only; it does not claim to produce a production Setup.exe.


## Windows production status (0.3.0 review patch)

The current repository is not yet certified for production Windows installation. The Windows agent service lifecycle, pairing CLI, discovery, endpoint tray, full remote desktop transport, and production Server/Client Setup.exe packages remain incomplete. See `docs/WINDOWS_COMPLETION_PATCH_0.3.0.md` for exact status and verification limits.

The intended install roots are `C:\\Program Files\\Nexlink\\Server` and `C:\\Program Files\\Nexlink\\Client`. Setup programs must request elevation through UAC; they must not attempt silent privilege escalation. Persistent state belongs in `%ProgramData%` with restrictive ACLs.

## LAN discovery (0.4.0)

The server advertises `_nexlink-server._tcp.local` over mDNS/DNS-SD. Agents default to automatic LAN discovery when no explicit `NEXLINK_SERVER_URL` is configured. For routed/VLAN networks or networks that block multicast, set `NEXLINK_SERVER_URL` manually. Discovery does not bypass Ed25519 authentication or device approval.

For production, configure a trusted TLS reverse proxy and advertise its listener with `NEXLINK_DISCOVERY_PROTOCOL=wss` and `NEXLINK_DISCOVERY_PORT=443` (or your actual TLS port). Production refuses plaintext discovery. See `docs/LAN_DISCOVERY_AND_UI_0.4.0.md` for firewall and network requirements.
