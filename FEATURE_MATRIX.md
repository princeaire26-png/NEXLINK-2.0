# NEXLINK Feature Matrix

| Feature | Current state in this rebuild | Veyon design reference | What remains |
|---|---|---|---|
| Device registry / enrollment | Existing code retained; runtime needs verification | Master / server | End-to-end test, organisation scoping review |
| Device health monitoring | Partial | Master monitoring | Live dashboard charts, history, alerting |
| Remote desktop | Partial | Remote access / VNC server | Reliable frame transport, input channel, multi-monitor, reconnect and Windows test |
| Screen broadcast | Planned | Demo | Broadcast service, audience selection, consent and stream fan-out |
| Screenshots | Planned | Screenshot | Agent capture command, retention and audit |
| Messaging | Planned | Text message | Message transport, acknowledgements and user-facing client |
| File distribution | Planned | File transfer | Chunked/resumable transfer, hashes, policy and safe destination handling |
| Screen lock | Planned | Screen lock | Platform adapter, timeout, user notice and unlock policy |
| Power control | Planned | Power control | OS-specific adapter, maintenance window and result receipt |
| Application launch | Planned | Desktop services | Signed allow-list, no arbitrary shell, user-session execution |
| User session control | Planned | User session control | Session enumeration and platform-specific safe controls |
| Directory integration | Planned | LDAP / built-in directory | Provider adapters, sync and group mapping |
| AI diagnostics | Planned | NEXLINK extension | Model provider, planner, policy, approval and audited tool execution |
| Feature registry | Initial implementation | Core feature manager | Version negotiation, agent capability advertisement and plugin lifecycle |
| Operation governance | Initial implementation | Server access-control manager | Agent dispatch, signed grants, replay protection, execution receipts |

**State meanings:** Implemented means code exists and is verified for its stated scope; Partial means foundations exist but the end-to-end feature is incomplete; Planned means not implemented. This matrix does not claim production readiness.
