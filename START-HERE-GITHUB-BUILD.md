# NEXLINK 0.5.0 — Start Here: GitHub Windows Build

This repository contains the NEXLINK desktop UI shell and a GitHub Actions workflow that attempts to build a Windows x64 NSIS installer.

**Important release limitation:** A successful build from this workflow produces the NEXLINK desktop UI installer. It is NOT yet a complete Server Setup + Client Setup product. It does not install or run the server backend as a Windows service, does not install the Rust agent as a Windows service, and does not complete enrollment, remote desktop, or secure file transfer. The current server backend still expects PostgreSQL. Do not deploy this build as a production remote-management system.

## 1. Download and extract

1. Download `NEXLINK-0.5.0-GITHUB-START-HERE.zip`.
2. Right-click the ZIP and choose **Extract All**.
3. Open the extracted `NEXLINK` folder. Confirm that `package.json`, `package-lock.json`, `src`, `src-tauri`, `server`, `agent`, and `.github` are directly inside it.

## 2. Push the project to GitHub

### If you already have a NEXLINK repository

1. Open GitHub Desktop and select your existing NEXLINK repository.
2. Choose **Repository → Show in Explorer**.
3. Back up the current repository folder before replacing files.
4. Copy the *contents* of the extracted `NEXLINK` folder into the repository root. Merge folders and replace files when prompted. Do not create an extra nested `NEXLINK/NEXLINK` directory.
5. In GitHub Desktop, review the changed files.
6. Commit with message: `Prepare NEXLINK 0.5.0 Windows GitHub build`.
7. Click **Push origin**.

### If you need a new repository

1. On GitHub.com, create a repository named `NEXLINK`.
2. In GitHub Desktop choose **File → Add Local Repository** and select the extracted `NEXLINK` folder. If it is not a repository yet, choose **Create a New Repository** and use that folder.
3. Publish the repository to GitHub.

## 3. Run the Windows build

1. Open the repository on GitHub.com.
2. Select **Actions**.
3. Select **NEXLINK Windows Desktop Installer** in the workflow list.
4. Select **Run workflow**, choose branch `main`, then select the green **Run workflow** button.
5. Open the new run and wait for the job to finish.
6. If it fails, open the failed step and copy the full error log. Do not treat a red run as a successful build.
7. If it succeeds, scroll to **Artifacts** and download `NEXLINK-Windows-Setup-x64`.
8. Extract the artifact ZIP. It should contain the generated NSIS `.exe` installer.

## 4. Test safely

1. Test in a Windows 10/11 x64 virtual machine or spare PC first.
2. Run the installer and review the Windows UAC prompt.
3. Install and launch the desktop interface.
4. Confirm the Dashboard, Server Manager, and Client screens open.
5. Remember that visible screens and health-check panels do not prove that server service, agent service, enrollment, remote control, or file transfer are operational.

## 5. What this workflow builds

- Windows x64 Tauri desktop UI installer (NSIS).
- A separate workflow builds a portable Rust agent executable, subject to the existing Rust source compiling and tests passing.

## 6. What is not included in this production release yet

- Complete NEXLINK Server Windows service and Server Setup installer.
- Complete NEXLINK Client Windows service and Client Setup installer.
- Embedded database migration (the current server still expects PostgreSQL).
- Production enrollment and pairing bridge.
- Production LAN discovery integration end-to-end.
- End-to-end remote desktop and secure file transfer.
- Full install/upgrade/rollback/uninstall integration tests.

A GitHub Actions green check proves only the steps in that workflow passed. It does not certify untested features.
