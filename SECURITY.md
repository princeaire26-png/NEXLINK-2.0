# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Active development |

## Security Architecture

NEXLINK implements defense-in-depth security:

### Layers

1. **Network** — TLS 1.3 for all transport
2. **Authentication** — JWT with MFA support
3. **Device Identity** — Ed25519 key pairs, cryptographic attestation
4. **Authorization** — RBAC + ABAC with policy engine
5. **Application** — Input validation, parameterized queries
6. **Audit** — Immutable event log for all actions

### Cryptographic Standards

| Purpose | Algorithm |
|---------|-----------|
| Device identity | Ed25519 |
| Key exchange | X25519 |
| Session encryption | AES-256-GCM |
| Transport | TLS 1.3 |
| Identity at rest | AES-256-GCM (encrypted private key) |
| Key derivation | SHA-256 iterative KDF (100k rounds) |
| Password hashing | bcrypt (12 rounds) |
| Token signing | JWT (HS256/RS256) |

### Security Principles

- **Least privilege**: Every action requires explicit permission
- **No custom crypto**: Only audited, standard libraries
- **AI safety**: AI never has unrestricted OS access
- **Immutable audit**: All security events logged, never modified
- **Secure defaults**: MFA encouraged, strong passwords required

### Trust Boundaries

```
User ←→ Web Dashboard ←→ Server ←→ Agent ←→ OS
         (browser)      (API)     (device)   (kernel)
```

Each boundary enforces authentication and authorization.

## Reporting Vulnerabilities

**Do NOT open public issues for security vulnerabilities.**

Please email: security@nexlink.dev (when available)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Security Checklist

- [x] No hardcoded secrets in source code
- [x] All inputs validated and sanitized
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (React auto-escaping + CSP)
- [x] CSRF protection (same-site cookies + tokens)
- [x] Rate limiting on authentication endpoints
- [x] Audit logging for all sensitive operations
- [x] Dependency scanning in CI
- [x] No unrestricted shell access from AI
- [x] Device approval required before access
- [x] Session tokens expire and are revocable
