# NEXLINK 0.5.0 — Three-interface Windows desktop release

## Included interfaces

- `/dashboard`: existing authenticated administrator dashboard.
- `/manager`: Server Manager. It actively checks `/api/v1/health/` and `/api/v1/health/ready`; it labels DNS-SD, TLS inventory and Windows Service Control Manager controls as not verified until native adapters exist.
- `/client`: Endpoint Client companion UI. It checks the configured server health endpoint and explains that reachability is not device authentication. Enrollment and service lifecycle are not falsely represented as complete.

The Tauri v2 shell includes a Windows notification-area tray menu with Open NEXLINK, Endpoint Client, Server Manager and Exit commands. The UI footer carries JOXE_VERSE TECHNOLOGIES branding.

## Windows build output

GitHub Actions workflow: `.github/workflows/windows-desktop-release.yml`

Expected installer artifact:

`NEXLINK-Windows-Setup-x64` → `NEXLINK_0.5.0_x64-setup.exe` (exact filename may vary by Tauri bundler version).

The NSIS installer is configured for per-machine installation, which requests elevation through Windows UAC. The installer is intended for the machine-wide Program Files location. The exact final directory must be checked in a clean Windows VM before release; do not assume a successful CI compile proves installation lifecycle correctness.

## Build on GitHub

1. Create or open the GitHub repository and upload/push the contents of this ZIP so `.github/workflows/windows-desktop-release.yml` is at the repository root.
2. Commit and push to the `main` branch.
3. Open the repository's **Actions** tab.
4. Select **NEXLINK Windows Desktop Installer**.
5. Select **Run workflow**, choose `main`, then press **Run workflow**.
6. Open the running workflow and wait for every step to turn green.
7. Open the completed run. Under **Artifacts**, download `NEXLINK-Windows-Setup-x64`.
8. Extract the downloaded artifact ZIP. Run the `*-setup.exe` file. Approve the Windows UAC prompt.
9. Test on a clean Windows 10/11 x64 VM before distributing it.

For a versioned GitHub Release, push a tag such as `v0.5.0`; the workflow builds and uploads the artifact to that workflow run. A GitHub Release publishing job is intentionally not configured yet.

## Important release limitations

This package delivers the three frontend interfaces and Tauri desktop shell/tray menu. It does **not** complete the Rust agent Windows service, agent enrollment, actual tray-to-service IPC, privileged service controls, TLS certificate provisioning, native PostgreSQL installation, remote desktop transport or file-transfer implementation. The client interface's health probe is not an enrollment flow. Do not advertise these functions as production-ready until the corresponding native/server implementations and Windows lifecycle tests pass.

The server API is a separate service. The desktop installer does not silently install PostgreSQL or configure a production server. Configure `VITE_API_URL` for the web admin build where required, and use the Server Manager's endpoint field to test the local server health/readiness endpoints.
