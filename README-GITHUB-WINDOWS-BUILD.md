# Build NEXLINK Setup.exe with GitHub Actions

## A. Put the source on GitHub

1. Sign in to GitHub and open your NEXLINK repository (or create a new private repository).
2. Extract this ZIP on your PC.
3. Open the extracted `NEXLINK` folder. You must see `package.json`, `src`, `src-tauri`, `server`, `agent`, and `.github` directly inside it.
4. Upload/push the **contents** of that folder to the repository root. Do not upload an extra wrapper folder containing the project.
5. Commit the files to the `main` branch.

## B. Run the Windows build

1. In GitHub, open your repository.
2. Click **Actions**.
3. Choose **NEXLINK Windows Desktop Installer** on the left.
4. Click **Run workflow**.
5. Select branch `main` and click the green **Run workflow** button.
6. Open the new run. Wait for the build job to finish. Red means the build failed; open the failed step and copy its full error log for diagnosis.
7. When green, scroll to **Artifacts** at the bottom of the run page.
8. Download **NEXLINK-Windows-Setup-x64** and extract it. Inside is the NEXLINK Setup `.exe`.

## C. Install and test

1. Copy the installer to a Windows 10/11 x64 test computer.
2. Double-click it and approve the Windows administrator/UAC prompt.
3. Complete setup. The per-machine NSIS configuration requests elevation and installs machine-wide.
4. Open NEXLINK from the Start Menu. Use the interface routes `/dashboard`, `/manager`, and `/client`.
5. In Server Manager, set the server API URL and run health checks. `/api/v1/health/` should report healthy; `/api/v1/health/ready` should report `ready: true` when PostgreSQL is reachable.

## D. Important

This is a desktop UI installer, not yet a full server-plus-agent deployment installer. It does not install PostgreSQL, create the NEXLINK server Windows service, or install the Rust agent as a Windows service. The client pairing panel is a UI placeholder until the agent enrollment CLI/service bridge is implemented. Test in a VM before production deployment.
