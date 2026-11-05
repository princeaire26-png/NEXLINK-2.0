# NEXLINK 0.5.0 interface and integration status

| Area | 0.5.0 status | Evidence / limitation |
|---|---|---|
| Admin dashboard | Existing UI retained | Existing authenticated React dashboard routes |
| Server Manager | UI implemented | Live `/health` and `/health/ready` HTTP probes; remaining controls clearly marked unverified |
| Endpoint Client | UI implemented | Configurable server URL and health probe; pairing UI is not yet connected to enrollment |
| Windows tray menu | Native Tauri tray menu added | Open, Client, Server Manager, Exit menu items |
| Desktop installer pipeline | GitHub Actions workflow added | Tauri v2 NSIS per-machine build; Windows CI has not yet run |
| UAC elevation | Installer configured per-machine | Windows prompts for approval; not silent privilege escalation |
| Program Files | Machine-wide NSIS install scope | Verify exact folder path in Windows VM before release |
| Agent Windows service | Not complete | Existing agent service lifecycle work remains separate |
| Tray-to-agent IPC | Not complete | Native tray currently switches UI views; does not control service |
| Enrollment | Not complete | Pairing token panel is explanatory UI only |
| DNS-SD discovery from client UI | Not integrated | Agent discovery foundation exists separately; UI uses configured URL health check |
| PostgreSQL install/config | Not complete | Manager probes readiness only; no native DB installer |
| TLS certificate management | Not complete | Manager labels certificate inventory as not verified |
| Remote desktop / file transfer | Not complete | Existing foundations remain incomplete |

Do not publish as a production remote-management release until all required native service, enrollment, discovery, authorization, transport, and installer lifecycle tests pass.
