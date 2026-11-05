# NEXLINK — Current State Summary

**Current build:** Rebuild 0.2 — Veyon-informed modular control plane  
**Current status:** Active development; not production-ready.

This file supersedes older phase summaries. Historical implementation reports remain in the repository for context, but their status statements must not be treated as current runtime verification.

## What is present in the source

- React + TypeScript dashboard and Node.js + TypeScript API.
- PostgreSQL schema and migrations for users, organisations, devices, enrollment, monitoring, sessions and audit events.
- Rust agent workspace with identity, transport, monitoring and Windows screen-capture foundations.
- Remote desktop session API and canvas viewer foundations.
- Veyon-inspired modular capability registry and dashboard Feature Center.
- Fail-closed allow-list policy for feature operations.
- Persistent operation request, approval and rejection records with audit events.
- Dockerfiles for the API and web dashboard, plus Docker Compose infrastructure.

## Current capability status

| Capability | Status | Notes |
|---|---|---|
| Authentication and enrollment | Partial / needs runtime verification | Source exists; end-to-end flow must be tested on the target environment |
| Device registry | Partial / needs runtime verification | API and UI source exist |
| Device monitoring | Partial | Collectors and API foundations exist; full cross-platform data flow needs verification |
| Remote desktop | Partial | Windows capture/session foundations exist; complete streaming, input and reconnection require verification |
| Screen broadcasting | Planned | Registry entry only |
| Screenshots | Planned | Registry entry only |
| Messaging | Planned | Registry entry only |
| File distribution | Planned | Registry entry only |
| Screen lock | Planned | Registry entry only |
| Power management | Planned | Registry entry only |
| Application management | Planned | Registry entry only |
| User-session management | Planned | Registry entry only |
| Directory integration | Planned | Registry entry only |
| AI diagnostics and automation | Planned / foundations elsewhere | No complete end-to-end AI execution workflow |
| Feature registry | Implemented at control-plane level | Static server-side manifest and dashboard display |
| Operation policy and approval queue | Implemented at control-plane level | Requests are recorded; they are not dispatched to agents |

## Important safety boundary

An operation in `policy_approved_waiting_agent` is **not an executed endpoint action**. The signed agent command protocol, capability negotiation, device-side policy enforcement, dispatch, replay protection, expiry and result receipts are not yet implemented. No arbitrary shell or unrestricted command execution should be added as a shortcut.

## Verification performed for Rebuild 0.2

- 41 TypeScript/TSX source files parsed with zero syntax diagnostics using the available TypeScript compiler API.
- Four isolated action-policy behavior checks passed.
- ZIP archive integrity check passed.

## Verification not performed

- Full `npm ci` could not complete because package downloads were unavailable/incomplete in the build environment.
- Therefore React production build, full TypeScript typecheck, server build and Vitest suite were not run.
- PostgreSQL migrations were not executed against a live database.
- Rust compiler was unavailable; the agent was not compiled.
- No Windows `.exe`, installer, remote desktop session, endpoint operation, penetration test or load test was produced/performed.

## Next engineering phases

1. Restore a clean reproducible Node dependency install and run full frontend/server builds.
2. Apply migrations on a fresh PostgreSQL volume and test registration, enrollment, approval, heartbeat and metrics end-to-end.
3. Define a versioned agent capability manifest and signed command envelope.
4. Implement agent dispatch and device-side policy checks before enabling any endpoint operation.
5. Complete and test remote desktop frame transport, input control, multi-monitor, clipboard and reconnect.
6. Implement file distribution with chunking, integrity verification, size limits and safe destinations.
7. Add messaging, screenshots and screen broadcast.
8. Add OS-specific lock, power, application and user-session adapters.
9. Integrate AI through a planner → policy → approval → executor pipeline.
10. Complete Windows packaging, security testing and deployment hardening.

See [Rebuild Status](./REBUILD_STATUS.md), [Feature Matrix](../FEATURE_MATRIX.md), [Veyon Integration Strategy](./VEYON_INTEGRATION_STRATEGY.md) and [Windows Build Guide](./BUILD_AND_RUN_WINDOWS.md).
