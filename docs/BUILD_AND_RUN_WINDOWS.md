# Build and Run NEXLINK on Windows — No Docker Desktop

Docker Desktop is optional. It is not part of the intended end-user installation. The current source is still a developer build, not yet a one-click Server Setup.exe + Client Setup.exe.

## Architecture

NEXLINK remains a server/client platform:

- NEXLINK Server: API, PostgreSQL-backed control plane, enrollment, policy, sessions and audit.
- NEXLINK Agent: background endpoint process on each managed computer.
- NEXLINK Console: administrator dashboard.
- Planned Agent Tray: endpoint connection, consent and diagnostics interface.

## Requirements for a native development setup

- Windows 10/11 x64
- Node.js 20+
- PostgreSQL 16+ installed as a native Windows service
- Rust stable (only when compiling the agent)
- Git

You do **not** need Docker Desktop for this native setup.

## 1. Install PostgreSQL natively

Install PostgreSQL 16 using the official Windows installer. During setup, create or configure a database service and remember the database administrator password.

Create a database and a dedicated application role. Do not use a weak or shared production password. Configure the server's `DATABASE_URL` to point to this database.

## 2. Configure the server

Copy `.env.example` to the server environment file used by your shell/service. Set at minimum:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — a long, random secret unique to this installation
- `PORT` — normally `3001`
- `NODE_ENV` — `development` for local development; production only after production hardening

The current server has an unsafe development fallback for the JWT secret. Do not expose it to a network or use that fallback in production.

## 3. Apply database migrations

Apply the files in `server/migrations/postgres/` in numeric order, once each, using `psql` or a PostgreSQL administration tool.

For a fresh database, apply `001_initial_schema.sql`, then `002_enrollment_and_metrics.sql`, then `003_feature_operations.sql`.

For an existing database, check its migration history before applying anything. Do not blindly replay schema migrations.

## 4. Install Node dependencies

From the project root:

```cmd
cd /d C:\NEXLINK
npm install
```

For the API:

```cmd
cd /d C:\NEXLINK\server
npm install
npm run typecheck
npm run build
```

The supplied server folder does not currently contain its own lockfile. Generate and commit a reviewed `server/package-lock.json` before treating CI builds as reproducible.

## 5. Run the API

In one terminal:

```cmd
cd /d C:\NEXLINK\server
npm run dev
```

Health endpoint: `http://localhost:3001/api/v1/health`

## 6. Run the dashboard

In another terminal, set the API URL for the Vite process:

```cmd
cd /d C:\NEXLINK
set VITE_API_URL=http://localhost:3001
npm run dev
```

Open the Vite URL printed in the terminal.

The current frontend expects `VITE_API_URL`; production same-origin static hosting is not yet wired into the Express server. Do not assume the built dashboard can already be installed as a native desktop application.

## 7. Build and test the Rust agent

Install Rust stable, then:

```cmd
cd /d C:\NEXLINK
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --all-targets
cargo build --release --package nexlink-agent
```

The portable Windows agent executable is produced under `target\release\` for a native Windows build.

## Optional Docker development environment

The supplied `docker-compose.yml` can still be used by developers who prefer containerized PostgreSQL/API/web services. It is optional and should not be required by the final end-user installers.

## Release blockers — do not skip

The current agent Windows service module is a stub and is not invoked by `main.rs`; the `--enroll` CLI is also a placeholder. The existing WiX file must not be treated as a working service installer. LAN discovery and a first-run pairing flow are not implemented.

The new `.github/workflows/windows-agent-validation.yml` workflow validates and uploads a portable agent executable. It does **not** build a production Setup.exe. Read [Windows Desktop Readiness Inspection](./WINDOWS_DESKTOP_READINESS_INSPECTION.md) before attempting deployment.
