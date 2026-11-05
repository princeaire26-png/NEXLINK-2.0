# NEXLINK Rebuild — Veyon-Informed Architecture

## Objective

NEXLINK adopts the architectural lessons of Veyon without importing Veyon's GPL implementation code. The target is a modular, policy-governed, multi-organisation remote operations platform rather than a classroom-only computer monitoring tool.

## Veyon concepts mapped into NEXLINK

| Veyon concept in the supplied source tree | NEXLINK module | NEXLINK improvement target | Current code status |
|---|---|---|---|
| `master/` computer overview | Web dashboard / Device Fleet | Multi-site fleet views, health history, filters and group operations | Partial |
| `plugins/remoteaccess/` + `plugins/vncserver/` | Remote Desktop | Authenticated sessions, adaptive quality, reconnect, multi-monitor and consent | Partial; Windows capture/session foundations exist, full production streaming not verified |
| `plugins/demo/` | Screen Broadcast | Operator-to-many display with audience selection and audit | Planned |
| `plugins/screenshot/` | Evidence Capture | Timestamped, policy-governed screenshots with retention controls | Planned |
| `plugins/textmessage/` | Messaging | Delivery acknowledgement, templates, groups and user feedback | Planned |
| `plugins/filetransfer/` | File Distribution | Resumable transfer, hash verification, staged rollout and rollback | Planned |
| `plugins/screenlock/` | Screen Policy | Time-bounded locks, visible reasons and policy-based release | Planned |
| `plugins/powercontrol/` | Power Management | Maintenance windows, staged restart and outcome reporting | Planned |
| `plugins/desktopservices/` | Application Management | Signed allow-listed apps and approved URLs; no arbitrary shell strings | Planned |
| `plugins/usersessioncontrol/` | Session Management | Session inventory, user notification and scoped controls | Planned |
| `plugins/ldap/`, `plugins/builtindirectory/` | Identity / Directory Connectors | Organisation-aware identity-provider adapters | Planned |
| `core/` feature manager and plugin interfaces | Capability Registry | Versioned feature manifests, capability negotiation and independent modules | Initial registry added |
| `server/` access-control manager | Policy Engine | Role, risk, device, organisation and approval checks | Initial allow-list policy added |
| `cli/` | NEXLINK CLI | Enrolment, diagnostics, policy and fleet commands | Planned |

## New code in this rebuild

- `server/src/features/catalog.ts`: central capability manifest, action allow-list, risk classification and role policy.
- `server/src/features/policy.ts`: fail-closed policy evaluation; unknown action names are rejected.
- `server/src/routes/features.ts`: authenticated capability catalog, operation request queue and separation-of-duties approval endpoint.
- `server/src/db/schema.ts` and `server/migrations/postgres/003_feature_operations.sql`: persistent operation request/approval records.
- `src/components/dashboard/FeatureCenterPage.tsx`: live dashboard feature registry with explicit implemented/partial/planned states.

## Operation lifecycle

1. An authenticated operator requests an allow-listed action against an approved, online device they own.
2. The policy engine checks action name and role. Unknown actions fail closed.
3. Low/medium-risk requests enter `approved_waiting_agent`; high/critical-risk requests enter `awaiting_approval`.
4. A different authorised organisation member must approve high/critical-risk operations. The requester cannot approve their own request.
5. The operation remains a recorded control-plane request. It is **not executed** until a compatible signed agent executor, command transport, device-side policy check and result acknowledgement are implemented.

This is intentional: a queued request must never be presented as a completed OS action.

## Security design rules

- No arbitrary shell, PowerShell, command-line or script execution API.
- Every operation has an explicit action identifier and structured parameters.
- Unknown action identifiers are denied.
- High-impact actions require independent approval.
- Device ownership/organisation access is checked server-side.
- Device revocation and offline status prevent new operations.
- All requests and approvals create audit events.
- Agent-side execution must repeat authorization checks; server approval alone is insufficient.
- The eventual agent must support signed capability manifests, version negotiation, short-lived operation grants, idempotency, expiry, replay protection and result receipts.
- File transfer must use explicit source/destination policy, size limits, content hashing and malware scanning integration before deployment.

## What is not complete

The following are deliberately not marked as implemented: screen broadcast, remote screenshot capture, messaging, file distribution, screen lock, power control, application launch, user-session control, directory integration, AI diagnostics and multi-device orchestration. The registry records these as planned so the dashboard does not misrepresent them.

The operation queue and approval workflow do not dispatch commands to agents yet. The existing remote desktop code is a foundation, not a verified production remote-access product. The supplied project reports that Windows screen capture code exists, while Linux/macOS capture remains stubbed; no Windows executable was built or tested in this environment.

## Licensing boundary

The supplied Veyon repository contains GPL-2.0-or-later licensing information. This rebuild uses independently written architecture, naming and feature descriptions; it does not copy Veyon source files or link Veyon binaries/libraries. Before any future code reuse, binary linking, plugin loading or derivative distribution, obtain a project-specific legal review and inspect the exact dependency licences.
