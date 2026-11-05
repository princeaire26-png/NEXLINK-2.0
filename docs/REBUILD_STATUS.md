# NEXLINK Rebuild Status

## Rebuild label

NEXLINK Rebuild 0.2 — Veyon-informed modular control plane.

## Included

- Existing React/TypeScript dashboard, Node/TypeScript API, PostgreSQL schema and Rust agent workspace retained as the starting point.
- Modular feature catalog covering remote desktop, monitoring, screen broadcasting, screenshots, messaging, file distribution, screen lock, power management, application management, session management, directory integration and AI diagnostics.
- Fail-closed action allow-list and role/risk classification.
- Persistent operation request and approval schema/migration.
- Authenticated feature catalog and operation request/approval endpoints.
- Separation-of-duties rule: requester cannot approve their own high-impact operation.
- Dashboard Feature Center with explicit implementation states and Veyon concept mapping.
- Documentation of licensing boundary and agent-execution gaps.

## Not complete / not verified

- The new operation queue does not send commands to the Rust agent.
- The new operations do not execute commands on endpoints.
- Agent-side capability negotiation, command signature verification, expiry, replay protection and result receipts remain to be built.
- Screen broadcasting, screenshot capture, messaging, file distribution, screen lock, power control, application launch, user-session management and directory integration remain planned.
- Remote desktop foundations are present in the existing project, but a complete end-to-end streaming path has not been verified in this rebuild.
- No Windows `.exe` or installer was produced in this environment because the Rust toolchain and Windows build environment are unavailable here.
- Production readiness, penetration testing, load testing and multi-organisation isolation have not been established.

## Database upgrade

Run the existing migrations first, then:

```bash
psql "$DATABASE_URL" -f server/migrations/postgres/003_feature_operations.sql
```

## Verification checklist

```bash
# Web dashboard
npm ci
npm run typecheck
npm run build

# API server
cd server
npm ci
npm run typecheck
npm run build

# Rust agent (requires Rust toolchain)
cd ..
cargo check --workspace
```

Then run the API with PostgreSQL, apply all migrations, sign in, open `/dashboard/features`, and verify that the catalog loads. Exercise operation creation and approval using two distinct authorised users in the same organisation. Do not treat an approved request as endpoint execution.
