# NEXLINK

**Connect. Control. Understand. Automate.**

An AI-native remote computing and device management platform.

## Status

🚧 **Active Development** — Rebuild 0.2 (Veyon-informed modular control plane; endpoint execution remains in progress)

## What is NEXLINK?

NEXLINK is an intelligent remote-computing and device-management platform that goes beyond traditional screen-sharing tools. It enables:

- **Remote desktop access** with efficient encoding and adaptive quality
- **AI-powered diagnostics** — ask "Why is my computer slow?" and get real answers
- **Automated workflows** — event-driven monitoring and remediation
- **Secure device management** — cryptographic identity, permissions, audit trails
- **Self-hosting** — run entirely on your own infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NEXLINK PLATFORM                      │
├─────────────────┬──────────────────┬────────────────────┤
│    CLIENT       │     SERVER       │      AGENT         │
│                 │                  │                    │
│ • Dashboard     │ • Authentication │ • Device Control   │
│ • Remote UI     │ • Device Registry│ • System Access    │
│ • AI Interface  │ • Signaling      │ • Monitoring       │
│ • File Manager  │ • Relay          │ • Diagnostics      │
│ • Terminal      │ • Organizations  │ • AI Tools         │
│ • Settings      │ • Audit Logs     │ • Automation       │
└─────────────────┴──────────────────┴────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Agent | Rust |
| Web Dashboard | React + TypeScript + Tailwind CSS |
| Desktop Client | Tauri (Rust + Web) |
| Backend API | Node.js + TypeScript |
| Database | PostgreSQL |
| Cache/PubSub | Redis |
| Protocol | Custom JSON over WebSocket |
| Cryptography | Ed25519, X25519, AES-256-GCM, TLS 1.3 |

## Quick Start

### Prerequisites

- Node.js 20+
- Rust toolchain (for agent)
- Docker & Docker Compose
- PostgreSQL 16+

### Development Setup

```bash
# Clone
git clone https://github.com/nexlink/nexlink.git
cd nexlink

# Start infrastructure
docker compose up -d postgres redis

# Web dashboard
npm install
npm run dev

# Server (separate terminal)
cd server
npm install
npm run dev

# Agent (separate terminal)
cargo build --package nexlink-agent
cargo run --package nexlink-agent
```

### Self-Hosted Deployment

```bash
# Full stack
docker compose up -d

# Access
# Dashboard: http://localhost:3000
# API: http://localhost:3001
```

## Repository Structure

```
nexlink/
├── apps/
│   └── web/               # Web dashboard (React)
├── agent/                 # NEXLINK Agent (Rust)
│   └── src/
│       ├── identity.rs    # Device identity & keys
│       ├── transport.rs   # Secure communication
│       ├── monitor.rs     # System monitoring
│       ├── protocol.rs    # Wire protocol
│       └── config.rs      # Configuration
├── server/                # Backend server (TypeScript)
│   └── src/
│       ├── routes/        # API endpoints
│       ├── middleware/    # Auth, audit, errors
│       └── db/            # Database schema
├── protocol/              # Shared protocol definitions
├── ai/                    # AI subsystem
├── infrastructure/        # Docker, K8s, Terraform
├── security/              # Security documentation
├── docs/                  # Documentation
├── tests/                 # Integration & E2E tests
├── Cargo.toml             # Rust workspace
├── docker-compose.yml     # Development stack
└── .env.example           # Environment template
```

## Security

Security is a foundational requirement. See [SECURITY.md](./SECURITY.md) for:
- Threat model
- Trust boundaries
- Security architecture
- Reporting vulnerabilities

## Modular Feature Center

The dashboard now includes a Feature Center backed by a server-side capability registry. It tracks remote desktop, monitoring, screen broadcasting, screenshots, messaging, file distribution, screen lock, power management, application management, session management, directory integration and AI diagnostics. Each capability is explicitly marked implemented, partial or planned.

The API includes an allow-listed operation request and approval workflow. **Approved requests are not executed on endpoints yet**; signed agent dispatch and device-side execution remain required. See [Rebuild Status](./docs/REBUILD_STATUS.md) and [Veyon Integration Strategy](./docs/VEYON_INTEGRATION_STRATEGY.md).

## Documentation

- [Architecture](./docs/architecture/) — System design
- [Implementation Status](./docs/IMPLEMENTATION_STATUS.md) — What's built
- [Protocol](./protocol/) — Wire protocol specification
- [API](./server/src/routes/) — REST API reference

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

Proprietary — All rights reserved.
