# NEXLINK LAN Discovery and Command Center UI — 0.4.0

## Discovery implementation

- The server advertises `_nexlink-server._tcp.local` using multicast DNS on UDP 5353.
- The DNS-SD service record includes the WebSocket port and `/ws` path as TXT metadata.
- The agent browses the same service type and resolves the server's advertised address.
- An empty or `auto://` `NEXLINK_SERVER_URL` selects LAN discovery. A configured `ws://` or `wss://` URL remains an explicit override.
- Discovery metadata is untrusted. It does not enroll, approve, identify, or authorize a device. The existing Ed25519 challenge-response and server-side approval checks remain mandatory.
- Development defaults to `ws` for local testing. Production defaults to `wss` and refuses a plaintext discovery protocol. In production, place the API/WebSocket server behind a trusted TLS reverse proxy and set `NEXLINK_DISCOVERY_PORT=443` (or the actual TLS listener port) and `NEXLINK_DISCOVERY_PROTOCOL=wss`. The agent validates the TLS certificate using the operating system trust store. Do not use self-signed certificates unless the issuing CA is installed in the client machine trust store.
- Discovery currently targets IPv4 LAN addresses. VLANs, guest Wi-Fi isolation, VPNs and routed subnets may block multicast; use the explicit server URL in those environments.

## Windows firewall

On the server host, run PowerShell as Administrator:

```powershell
.\scripts\windows\Install-NexlinkDiscoveryFirewall.ps1 -ApiPort 3001
```

This creates inbound UDP 5353 and TCP API-port rules limited to Domain/Private profiles and `LocalSubnet`. Use `-ApiPort 443` when discovery advertises a TLS reverse proxy on port 443. Do not expose the API port to public networks. Remove the rules with:

```powershell
.\scripts\windows\Remove-NexlinkDiscoveryFirewall.ps1
```

Client machines need outbound UDP multicast to 224.0.0.251:5353 and outbound TCP access to the server API port. Windows' default outbound policy normally permits this. Ensure the network permits multicast and client isolation is disabled.

## UI work

- Reworked the administrator dashboard shell with a responsive dark command-center navigation, iconography, live-status styling and consistent spacing.
- Rebuilt the overview page with live API-backed device counts, explicit telemetry error states, a DNS-SD discovery panel, security explanation and operational shortcuts.
- Added motion-reduced behavior and responsive mobile navigation styles.
- No sample device counts are fabricated; values remain blank until the API returns real data.

## Verification limits

This environment does not have the Rust toolchain or project npm dependencies installed. The server discovery TypeScript module passes Node's syntax check, but Rust compilation, TypeScript type-check/build, multicast integration and Windows Firewall behavior still require CI and two Windows machines on the same LAN. Do not describe this patch as end-to-end certified until those tests pass.
