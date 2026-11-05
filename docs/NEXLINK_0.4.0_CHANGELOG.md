# NEXLINK 0.4.0 — LAN Discovery + Futuristic Command Center

## Implemented in this source patch

- Server-side mDNS/DNS-SD advertisement for `_nexlink-server._tcp.local`.
- Agent-side DNS-SD browsing and service resolution using `mdns-sd`.
- Automatic discovery when `NEXLINK_SERVER_URL` is unset or configured as `auto://...`; explicit `ws://` and `wss://` server URLs remain supported.
- Discovery TXT metadata includes WebSocket path, protocol, version and authentication hint.
- Production discovery defaults to `wss` and rejects a plaintext discovery protocol. A trusted TLS reverse proxy must expose the advertised TLS port.
- Discovery is never authorization: agent identity, server-side approval and Ed25519 challenge-response remain required.
- Windows PowerShell firewall install/removal scripts scoped to local subnet and private/domain profiles.
- Redesigned responsive administrator navigation and live-data overview with futuristic dark glass styling, network visualization, endpoint metrics, status and operation shortcuts.
- Existing JOXE_VERSE TECHNOLOGIES footer retained.

## Not certified in this environment

- Rust compilation and Windows agent execution (Rust toolchain unavailable).
- Frontend TypeScript/Vite build (npm dependency installation timed out; partial dependencies were not included).
- Server TypeScript build and unit/integration tests.
- Real multicast discovery across Windows network adapters, VLANs and Wi-Fi access points.
- TLS reverse-proxy certificate installation and end-to-end WSS pairing.
- Client tray application and production installers.

This is an implementation patch, not a signed or production-certified installer release.
