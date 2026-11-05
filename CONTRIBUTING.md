# Contributing to NEXLINK

Thank you for your interest in contributing to NEXLINK.

## Development Setup

### Prerequisites

- Node.js 20+ and npm
- Rust toolchain (rustup)
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/nexlink/nexlink.git
cd nexlink

# Install Node dependencies
npm install

# Start infrastructure (PostgreSQL, Redis)
docker compose up -d postgres redis

# Start web dashboard (development)
npm run dev

# In another terminal, start the server
cd server
npm install
npm run dev

# In another terminal, build and run the agent
cargo build --package nexlink-agent
cargo run --package nexlink-agent
```

## Project Structure

- `src/` — Web dashboard (React + TypeScript)
- `server/` — Backend API (Node.js + TypeScript)
- `agent/` — Device agent (Rust)
- `protocol/` — Shared protocol definitions
- `ai/` — AI subsystem
- `docs/` — Documentation
- `tests/` — Integration and E2E tests

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript strict mode
- Follow ESLint configuration
- Write JSDoc for public APIs
- Use named exports (not default) for components

### Rust

- Follow `rustfmt` formatting
- Address all `clippy` warnings
- Write unit tests for all public functions
- Use `thiserror` for library errors, `anyhow` for application errors

### General

- Every feature needs tests
- Every API endpoint needs input validation
- Every security-relevant change needs review
- Document architectural decisions

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Ensure all checks pass:
   - `cargo test --workspace`
   - `npm run typecheck`
   - `npm run build`
5. Submit a pull request with clear description

## Commit Messages

Use conventional commits:

```
feat(agent): add CPU monitoring module
fix(server): resolve JWT expiration handling
docs: update architecture diagram
test(auth): add login flow tests
```

## Security

- Never commit secrets or API keys
- Use `.env` files (never committed)
- Report vulnerabilities privately (see SECURITY.md)

## Questions?

Open a discussion on GitHub or reach out to the team.
