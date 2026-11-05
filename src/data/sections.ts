export interface Section {
  id: string;
  number: string;
  title: string;
  icon: string;
  content: ContentBlock[];
}

export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'code'; language: string; code: string }
  | { type: 'diagram'; title: string; lines: string[] }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; variant: 'info' | 'warning' | 'success' | 'danger'; title: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'status'; items: { label: string; status: 'implemented' | 'planned' | 'partial' | 'blocked' }[] };

export const sections: Section[] = [
  {
    id: 'overview',
    number: '00',
    title: 'Executive Product Definition',
    icon: '🎯',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK is an intelligent remote-computing and device-management platform designed from the ground up as an AI-native solution. Unlike traditional remote-access tools that simply mirror screens, NEXLINK connects, understands, controls, and automates — enabling users to manage their computing infrastructure through natural language and intelligent automation.',
      },
      {
        type: 'heading',
        text: 'Core Value Proposition',
        level: 2,
      },
      {
        type: 'paragraph',
        text: 'NEXLINK transforms remote computing from a manual screen-sharing experience into an intelligent, automated, AI-assisted device management platform. It bridges the gap between remote access tools (TeamViewer, AnyDesk) and IT management platforms (Intune, Jamf) while adding a unique AI layer that can diagnose, understand, and act on behalf of authorized users.',
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Product Mantra',
        text: 'CONNECT → UNDERSTAND → CONTROL → AUTOMATE',
      },
      {
        type: 'heading',
        text: 'Core Product Differentiators',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'AI-Native Architecture — AI is not an add-on; it is a core subsystem with structured tool access to authorized device capabilities',
          'Security-First Design — Every action passes through a permission system, policy engine, and audit trail before execution',
          'Self-Hosting Capability — Full platform can be deployed on customer infrastructure without cloud dependency',
          'Performance-Oriented — Built on Rust for the agent layer, ensuring memory safety, concurrency, and low latency',
          'Provider-Independent AI — Supports cloud AI, local AI, and self-hosted AI models without vendor lock-in',
          'Automation Engine — Event-driven workflows that respect security policies and device permissions',
          'Open Protocol Design — Extensible protocol layer that can evolve without breaking compatibility',
        ],
      },
      {
        type: 'heading',
        text: 'Target Users',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Segment', 'Use Case', 'Key Needs'],
        rows: [
          ['Individual / Personal', 'Remote access to home/office computers', 'Simple setup, reliability, privacy'],
          ['Developers / Power Users', 'Manage dev environments, diagnose issues', 'AI diagnostics, terminal access, automation'],
          ['Small Teams / MSPs', 'Manage client devices, provide support', 'Multi-device management, permissions, audit'],
          ['Enterprise / IT Departments', 'Fleet management, compliance, self-hosting', 'RBAC, policies, self-hosting, SSO'],
          ['Privacy-Conscious Users', 'Remote access without cloud dependency', 'Self-hosting, encryption, no telemetry'],
        ],
      },
      {
        type: 'heading',
        text: 'Competitive Landscape',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Product', 'Strengths', 'NEXLINK Advantage'],
        rows: [
          ['TeamViewer', 'Market leader, mature', 'No AI, no self-hosting, expensive'],
          ['AnyDesk', 'Lightweight, fast', 'No AI, limited automation'],
          ['RustDesk', 'Open source, self-hostable', 'No AI, limited enterprise features'],
          ['Chrome Remote Desktop', 'Free, simple', 'No device management, no AI'],
          ['Intune / Jamf', 'Enterprise MDM', 'No remote desktop, no AI diagnostics'],
          ['NEXLINK', 'AI-native, self-hostable, secure', '—'],
        ],
      },
    ],
  },
  {
    id: 'system-architecture',
    number: '01',
    title: 'System Architecture',
    icon: '🏗️',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK follows a three-component architecture: Client, Server, and Agent. Each component has a distinct responsibility and communicates through well-defined, encrypted protocols.',
      },
      {
        type: 'diagram',
        title: 'High-Level System Architecture',
        lines: [
          '┌─────────────────────────────────────────────────────────────────┐',
          '│                         NEXLINK PLATFORM                        │',
          '├──────────────────┬──────────────────────┬───────────────────────┤',
          '│     CLIENT       │       SERVER         │       AGENT           │',
          '│                  │                      │                       │',
          '│  • Dashboard     │  • Authentication    │  • Device Control     │',
          '│  • Remote UI     │  • Device Registry   │  • System Access      │',
          '│  • AI Interface  │  • Signaling         │  • Monitoring         │',
          '│  • File Manager  │  • Relay             │  • Diagnostics        │',
          '│  • Terminal      │  • Organizations     │  • Automation         │',
          '│  • Settings      │  • Audit Logs        │  • AI Tool Interface  │',
          '│                  │  • API Gateway       │  • Update Manager     │',
          '└──────────────────┴──────────────────────┴───────────────────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Component Responsibilities',
        level: 2,
      },
      {
        type: 'heading',
        text: 'Client (Web Dashboard / Desktop App)',
        level: 3,
      },
      {
        type: 'list',
        items: [
          'User interface for device management and remote sessions',
          'AI chat interface for natural-language device interaction',
          'File transfer UI and clipboard synchronization',
          'Terminal emulator for remote command execution',
          'Settings, permissions, and organization management',
        ],
      },
      {
        type: 'heading',
        text: 'Server (Cloud or Self-Hosted)',
        level: 3,
      },
      {
        type: 'list',
        items: [
          'Authentication and authorization (OAuth 2.0 / JWT)',
          'Device registry and identity management',
          'Connection signaling and NAT traversal coordination',
          'Relay server for connections that cannot establish direct P2P',
          'Organization and team management',
          'Audit logging and compliance',
          'API gateway for all client-server communication',
        ],
      },
      {
        type: 'heading',
        text: 'Agent (Runs on Managed Devices)',
        level: 3,
      },
      {
        type: 'list',
        items: [
          'Secure identity and enrollment',
          'Screen capture and encoding',
          'Input injection (mouse, keyboard)',
          'Clipboard and file transfer',
          'System monitoring and diagnostics',
          'AI tool execution with permission enforcement',
          'Self-update mechanism',
        ],
      },
    ],
  },
  {
    id: 'technology-stack',
    number: '02',
    title: 'Technology Stack',
    icon: '⚙️',
    content: [
      {
        type: 'paragraph',
        text: 'The technology stack is chosen for security, performance, developer productivity, and long-term maintainability. Each choice is justified by the specific requirements of the component.',
      },
      {
        type: 'table',
        headers: ['Component', 'Technology', 'Rationale'],
        rows: [
          ['Agent (Core)', 'Rust', 'Memory safety, performance, cross-platform, system-level access'],
          ['Web Dashboard', 'React + TypeScript + Tailwind CSS', 'Component architecture, type safety, rapid development'],
          ['Desktop Client', 'Tauri (Rust + Web frontend)', 'Native performance, small binary, Rust backend'],
          ['Backend API', 'Node.js (TypeScript) or Go', 'Ecosystem maturity, async I/O, rapid development'],
          ['Database', 'PostgreSQL', 'Relational integrity, JSON support, proven at scale'],
          ['Cache / Pub-Sub', 'Redis', 'Session state, signaling, real-time events'],
          ['Message Queue', 'NATS or Redis Streams', 'Lightweight, high-performance event distribution'],
          ['Object Storage', 'S3-compatible (MinIO for self-host)', 'File transfers, session recordings'],
          ['Containerization', 'Docker + Docker Compose', 'Consistent deployment, self-hosting'],
          ['CI/CD', 'GitHub Actions', 'Integrated with repository, flexible'],
          ['Monitoring', 'OpenTelemetry + Prometheus + Grafana', 'Standards-based, self-hostable'],
          ['AI Integration', 'Provider-agnostic SDK', 'Supports OpenAI, Anthropic, local models, self-hosted'],
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Technology Evaluation',
        text: 'These choices are the initial direction. Each will be validated during Phase 0-2 with prototypes and benchmarks. The architecture is designed so that individual components can be replaced without affecting the whole system.',
      },
    ],
  },
  {
    id: 'repository-structure',
    number: '03',
    title: 'Repository Structure',
    icon: '📁',
    content: [
      {
        type: 'paragraph',
        text: 'The repository follows a monorepo structure with clear separation of concerns. Each top-level directory represents a distinct component or concern.',
      },
      {
        type: 'code',
        language: 'text',
        code: `nexlink/
│
├── apps/
│   ├── web/                    # Web dashboard (React + TypeScript)
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── desktop/                # Desktop client (Tauri)
│       ├── src/
│       ├── src-tauri/
│       └── package.json
│
├── agent/                      # NEXLINK Agent (Rust)
│   ├── src/
│   │   ├── identity/           # Device identity & enrollment
│   │   ├── transport/          # Secure communication
│   │   ├── desktop/            # Screen capture & input
│   │   ├── monitor/            # System monitoring
│   │   ├── terminal/           # Remote terminal
│   │   ├── files/              # File transfer
│   │   ├── automation/         # Task automation
│   │   ├── ai/                 # AI tool interface
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tests/
│
├── server/                     # Backend server
│   ├── src/
│   │   ├── auth/               # Authentication & authorization
│   │   ├── devices/            # Device registry
│   │   ├── signaling/          # Connection signaling
│   │   ├── relay/              # Connection relay
│   │   ├── organizations/      # Org & team management
│   │   ├── api/                # REST/GraphQL API
│   │   └── main.rs (or index.ts)
│   └── tests/
│
├── protocol/                   # Shared protocol definitions
│   ├── src/
│   ├── schema/                 # Protocol schemas
│   └── README.md
│
├── ai/                         # AI subsystem
│   ├── src/
│   │   ├── tools/              # Tool definitions
│   │   ├── planner/            # Action planning
│   │   ├── providers/          # AI provider adapters
│   │   └── permissions/        # AI permission layer
│   └── tests/
│
├── infrastructure/             # Deployment & infrastructure
│   ├── docker/
│   ├── kubernetes/
│   ├── terraform/
│   └── scripts/
│
├── security/                   # Security documentation & tooling
│   ├── threat-model.md
│   ├── cryptography.md
│   └── audit/
│
├── docs/                       # Documentation
│   ├── architecture/
│   ├── api/
│   ├── guides/
│   └── README.md
│
├── tests/                      # Integration & E2E tests
│   ├── integration/
│   └── e2e/
│
├── .github/                    # CI/CD workflows
│   └── workflows/
│
├── Cargo.toml                  # Workspace root (Rust)
├── package.json                # Workspace root (Node)
├── docker-compose.yml
├── README.md
└── LICENSE`,
      },
    ],
  },
  {
    id: 'agent-architecture',
    number: '04',
    title: 'Agent Architecture',
    icon: '🤖',
    content: [
      {
        type: 'paragraph',
        text: 'The NEXLINK Agent is the core component that runs on managed devices. Built in Rust, it provides secure, performant access to device capabilities while enforcing strict permission boundaries.',
      },
      {
        type: 'diagram',
        title: 'Agent Internal Architecture',
        lines: [
          '┌─────────────────────────────────────────────────────────┐',
          '│                    NEXLINK AGENT                         │',
          '├─────────────────────────────────────────────────────────┤',
          '│                                                         │',
          '│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │',
          '│  │   Identity   │  │  Transport   │  │  Permission  │  │',
          '│  │   Manager    │  │   Layer      │  │   Engine     │  │',
          '│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │',
          '│         │                 │                  │          │',
          '│  ┌──────┴─────────────────┴──────────────────┴───────┐  │',
          '│  │              Session Manager                       │  │',
          '│  └──────┬─────────┬─────────┬─────────┬─────────────┘  │',
          '│         │         │         │         │                 │',
          '│  ┌──────┴──┐ ┌───┴────┐ ┌──┴─────┐ ┌─┴──────────┐    │',
          '│  │ Desktop │ │Monitor │ │Terminal│ │ AI Tools   │    │',
          '│  │ Service │ │Service │ │Service │ │ Executor   │    │',
          '│  └─────────┘ └────────┘ └────────┘ └────────────┘    │',
          '│                                                         │',
          '│  ┌──────────────────────────────────────────────────┐   │',
          '│  │              OS Abstraction Layer                 │   │',
          '│  │  (Windows / macOS / Linux adapters)              │   │',
          '│  └──────────────────────────────────────────────────┘   │',
          '└─────────────────────────────────────────────────────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Agent Modules',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Module', 'Responsibility', 'Status'],
        rows: [
          ['Identity Manager', 'Device identity, key management, enrollment', 'Planned'],
          ['Transport Layer', 'Encrypted communication, reconnection, heartbeat', 'Planned'],
          ['Permission Engine', 'Evaluate and enforce action permissions', 'Planned'],
          ['Session Manager', 'Coordinate active sessions, multiplexing', 'Planned'],
          ['Desktop Service', 'Screen capture, encoding, input injection', 'Planned'],
          ['Monitor Service', 'CPU, memory, disk, process, service monitoring', 'Planned'],
          ['Terminal Service', 'Secure shell access with permission controls', 'Planned'],
          ['AI Tools Executor', 'Execute AI-requested tools within permission bounds', 'Planned'],
          ['File Transfer', 'Secure file upload/download with progress tracking', 'Planned'],
          ['Automation Engine', 'Execute scheduled and event-driven workflows', 'Planned'],
          ['Update Manager', 'Self-update with signature verification', 'Planned'],
          ['OS Abstraction', 'Platform-specific implementations behind unified API', 'Planned'],
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Build Strategy',
        text: 'The agent is built incrementally. Identity and Transport are implemented first, followed by monitoring, then desktop, then AI tools. Each module is independently testable.',
      },
    ],
  },
  {
    id: 'networking',
    number: '05',
    title: 'Networking Architecture',
    icon: '🌐',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK supports multiple connection modes to handle various network topologies. The system prefers direct P2P connections and falls back to relay when necessary.',
      },
      {
        type: 'heading',
        text: 'Connection Modes',
        level: 2,
      },
      {
        type: 'diagram',
        title: 'Direct P2P Connection (Preferred)',
        lines: [
          'Device A ──────── Encrypted Channel ──────── Device B',
          '   │                                           │',
          '   └──── NAT Traversal (ICE/STUN/TURN) ───────┘',
        ],
      },
      {
        type: 'diagram',
        title: 'Relay Connection (Fallback)',
        lines: [
          'Device A ──── NEXLINK Relay ──── Device B',
          '   │              │                  │',
          '   └── encrypted ─┘── encrypted ─────┘',
        ],
      },
      {
        type: 'diagram',
        title: 'LAN Discovery',
        lines: [
          'Device A ──────── LAN ──────── Device B',
          '   │              │               │',
          '   └── mDNS/Broadcast Discovery ──┘',
        ],
      },
      {
        type: 'heading',
        text: 'Connection Lifecycle',
        level: 2,
      },
      {
        type: 'list',
        ordered: true,
        items: [
          'Client requests connection to target device via Server API',
          'Server sends signaling message to target agent',
          'Both sides exchange connection candidates (ICE)',
          'System attempts direct P2P connection',
          'If direct fails, system establishes relay connection',
          'Connection is encrypted end-to-end (Noise Protocol or TLS 1.3)',
          'Session is authenticated with mutual verification',
          'Heartbeat monitors connection health',
          'Automatic reconnection on transient failures',
        ],
      },
      {
        type: 'heading',
        text: 'Protocol Requirements',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'End-to-end encryption (no server can decrypt session data)',
          'Mutual authentication (both sides verify identity)',
          'Forward secrecy (compromised keys don\'t expose past sessions)',
          'Bandwidth adaptation (adjust quality to network conditions)',
          'Connection migration (survive network changes)',
          'Low latency target (< 50ms for input events)',
        ],
      },
    ],
  },
  {
    id: 'remote-desktop',
    number: '06',
    title: 'Remote Desktop Architecture',
    icon: '🖥️',
    content: [
      {
        type: 'paragraph',
        text: 'The remote desktop subsystem handles screen capture, efficient encoding, transport, input injection, and session management. It is designed as a modular pipeline where each stage can be independently optimized.',
      },
      {
        type: 'diagram',
        title: 'Remote Desktop Pipeline',
        lines: [
          '┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐',
          '│  Screen  │───▶│  Encode  │───▶│Transport │───▶│  Render  │',
          '│  Capture │    │ (Video)  │    │  (Enc)   │    │ (Client) │',
          '└──────────┘    └──────────┘    └──────────┘    └──────────┘',
          '                                                              ',
          '┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐',
          '│  Input   │───▶│ Validate │───▶│Transport │───▶│  Inject  │',
          '│  Capture │    │  & Auth  │    │  (Enc)   │    │  (Agent) │',
          '└──────────┘    └──────────┘    └──────────┘    └──────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Encoding Strategy',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Scenario', 'Encoder', 'Quality'],
        rows: [
          ['Static content', 'Lossless region diff', 'Pixel-perfect'],
          ['Document work', 'H.264/H.265 low bitrate', 'High quality, low bandwidth'],
          ['Video / animation', 'H.264/H.265 adaptive', 'Balanced quality/bandwidth'],
          ['Low bandwidth', 'Aggressive compression', 'Reduced quality, usable'],
          ['Local network', 'Uncompressed or lossless', 'Maximum quality'],
        ],
      },
      {
        type: 'heading',
        text: 'Features Roadmap',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Screen capture with dirty-region detection',
          'Hardware-accelerated encoding (NVENC, VideoToolbox, VAAPI)',
          'Adaptive quality based on network conditions',
          'Mouse and keyboard input with permission controls',
          'Clipboard synchronization (text, images)',
          'File transfer with progress and resume',
          'Multiple monitor support',
          'Session reconnection without losing state',
          'Remote restart and automatic reconnection',
          'Optional session recording',
        ],
      },
    ],
  },
  {
    id: 'security',
    number: '07',
    title: 'Security Architecture',
    icon: '🔒',
    content: [
      {
        type: 'paragraph',
        text: 'Security is the foundational architectural requirement of NEXLINK. The system controls computers — therefore every design decision must prioritize security without sacrificing usability.',
      },
      {
        type: 'callout',
        variant: 'danger',
        title: 'Security Principle',
        text: 'NEVER: AI → unrestricted shell → operating system. ALWAYS: AI → Action Planner → Permission System → Policy Engine → Tool Executor → Agent → OS.',
      },
      {
        type: 'heading',
        text: 'Security Layers',
        level: 2,
      },
      {
        type: 'diagram',
        title: 'Defense in Depth',
        lines: [
          '┌─────────────────────────────────────────────────┐',
          '│  Layer 7: Audit & Compliance                     │',
          '│  ┌─────────────────────────────────────────────┐ │',
          '│  │  Layer 6: Application Policies               │ │',
          '│  │  ┌─────────────────────────────────────────┐ │ │',
          '│  │  │  Layer 5: Authorization (RBAC/ABAC)     │ │ │',
          '│  │  │  ┌─────────────────────────────────────┐ │ │ │',
          '│  │  │  │  Layer 4: Transport Encryption      │ │ │ │',
          '│  │  │  │  ┌─────────────────────────────────┐ │ │ │ │',
          '│  │  │  │  │  Layer 3: Device Identity       │ │ │ │ │',
          '│  │  │  │  │  ┌─────────────────────────────┐ │ │ │ │',
          '│  │  │  │  │  │  Layer 2: Authentication    │ │ │ │ │',
          '│  │  │  │  │  │  ┌─────────────────────────┐ │ │ │ │',
          '│  │  │  │  │  │  │  Layer 1: Network       │ │ │ │ │',
          '│  │  │  │  │  │  │  (Firewall, TLS)        │ │ │ │ │',
          '│  │  │  │  │  │  └─────────────────────────┘ │ │ │ │',
          '│  │  │  │  │  └─────────────────────────────┘ │ │ │ │',
          '│  │  │  │  └─────────────────────────────────┘ │ │ │',
          '│  │  │  └─────────────────────────────────────┘ │ │',
          '│  │  └─────────────────────────────────────────┘ │',
          '│  └─────────────────────────────────────────────┘ │',
          '└─────────────────────────────────────────────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Security Requirements',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Strong authentication (MFA, hardware keys, SSO)',
          'Device identity with cryptographic attestation',
          'Secure enrollment process with owner verification',
          'End-to-end encrypted communication (TLS 1.3 / Noise Protocol)',
          'Fine-grained authorization (per-action, per-device)',
          'Device approval workflow (owner must approve connections)',
          'Session-scoped authentication tokens',
          'Credential protection (never stored in plaintext)',
          'Comprehensive audit logging of all actions',
          'Session revocation capability',
          'Principle of least privilege throughout',
          'Signed, verified updates only',
          'Protection against unauthorized access attempts',
          'Protection against AI actions outside permission bounds',
          'Rate limiting and anomaly detection',
        ],
      },
      {
        type: 'heading',
        text: 'Cryptographic Standards',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Purpose', 'Algorithm/Protocol', 'Notes'],
        rows: [
          ['Transport encryption', 'TLS 1.3 / Noise Protocol Framework', 'Forward secrecy required'],
          ['Device identity', 'Ed25519 key pairs', 'Long-lived device keys'],
          ['Session keys', 'X25519 key exchange', 'Per-session ephemeral keys'],
          ['Authentication tokens', 'JWT (RS256/ES256)', 'Short-lived, refresh tokens'],
          ['Password hashing', 'Argon2id', 'Memory-hard, configurable'],
          ['File integrity', 'SHA-256 / BLAKE3', 'Transfer verification'],
          ['Update signing', 'Ed25519 signatures', 'Verified before installation'],
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'No Custom Cryptography',
        text: 'NEXLINK will NEVER implement custom cryptographic primitives. All cryptography uses established, audited libraries: libsodium, ring, rustls, or platform-native TLS implementations.',
      },
    ],
  },
  {
    id: 'ai-architecture',
    number: '08',
    title: 'AI Architecture',
    icon: '🧠',
    content: [
      {
        type: 'paragraph',
        text: 'The AI subsystem is the primary differentiator of NEXLINK. It enables natural-language interaction with managed devices through a structured tool system with strict permission enforcement.',
      },
      {
        type: 'diagram',
        title: 'AI System Architecture',
        lines: [
          '┌─────────────────────────────────────────────────────┐',
          '│                  USER INTERFACE                      │',
          '│          "Why is my computer slow?"                  │',
          '└──────────────────────┬──────────────────────────────┘',
          '                       │',
          '                       ▼',
          '┌─────────────────────────────────────────────────────┐',
          '│              AI ORCHESTRATOR                         │',
          '│  • Intent understanding                             │',
          '│  • Tool selection                                   │',
          '│  • Multi-step planning                              │',
          '│  • Result synthesis                                 │',
          '└──────────────────────┬──────────────────────────────┘',
          '                       │',
          '                       ▼',
          '┌─────────────────────────────────────────────────────┐',
          '│            PERMISSION GATEWAY                        │',
          '│  • Check tool permissions                           │',
          '│  • Evaluate risk level                              │',
          '│  • Request user authorization if needed             │',
          '│  • Enforce policies                                 │',
          '└──────────────────────┬──────────────────────────────┘',
          '                       │',
          '                       ▼',
          '┌─────────────────────────────────────────────────────┐',
          '│             TOOL EXECUTOR                            │',
          '│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │',
          '│  │System  │ │Process │ │Network │ │File    │      │',
          '│  │Info    │ │List    │ │Status  │ │System  │ ...  │',
          '│  └────────┘ └────────┘ └────────┘ └────────┘      │',
          '└──────────────────────┬──────────────────────────────┘',
          '                       │',
          '                       ▼',
          '┌─────────────────────────────────────────────────────┐',
          '│           NEXLINK AGENT (on device)                  │',
          '└─────────────────────────────────────────────────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'AI Tool Definitions',
        level: 2,
      },
      {
        type: 'paragraph',
        text: 'Every AI tool must define its permissions, parameters, validation rules, risk level, audit requirements, and error handling before it can be used.',
      },
      {
        type: 'code',
        language: 'typescript',
        code: `interface AITool {
  name: string;
  description: string;
  parameters: ParameterSchema;
  permissions: Permission[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresAuthorization: boolean;
  auditLevel: 'none' | 'basic' | 'detailed';
  timeout: number;
  execute(context: ToolContext, params: any): Promise<ToolResult>;
}

// Example tools:
// get_system_info()      — risk: low,    auth: false
// get_cpu_usage()        — risk: low,    auth: false
// get_memory_usage()     — risk: low,    auth: false
// list_processes()       — risk: low,    auth: false
// get_logs()             — risk: medium, auth: false
// execute_command()      — risk: high,   auth: true
// terminate_process()    — risk: high,   auth: true
// restart_service()      — risk: high,   auth: true
// modify_system_config() — risk: critical, auth: true`,
      },
      {
        type: 'heading',
        text: 'Provider Independence',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Cloud AI: OpenAI, Anthropic, Google, etc.',
          'Local AI: Ollama, llama.cpp, local models',
          'Self-hosted: vLLM, TGI, custom deployments',
          'Provider abstraction layer allows switching without code changes',
          'Fallback chain: primary → secondary → local model',
        ],
      },
    ],
  },
  {
    id: 'permissions',
    number: '09',
    title: 'Permission Architecture',
    icon: '🛡️',
    content: [
      {
        type: 'paragraph',
        text: 'The permission system ensures that no action — whether initiated by a user, an automation, or the AI — can execute without proper authorization. It implements a combination of RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control).',
      },
      {
        type: 'heading',
        text: 'Permission Flow',
        level: 2,
      },
      {
        type: 'diagram',
        title: 'Action Authorization Pipeline',
        lines: [
          'Action Requested',
          '      │',
          '      ▼',
          '┌──────────────┐',
          '│ Identity     │──▶ Who is requesting?',
          '│ Verification │',
          '└──────┬───────┘',
          '       │',
          '       ▼',
          '┌──────────────┐',
          '│ Role Check   │──▶ Does the role permit this action?',
          '└──────┬───────┘',
          '       │',
          '       ▼',
          '┌──────────────┐',
          '│ Policy Check │──▶ Do policies allow this on this device?',
          '└──────┬───────┘',
          '       │',
          '       ▼',
          '┌──────────────┐',
          '│ Risk Assess  │──▶ What is the risk level?',
          '└──────┬───────┘',
          '       │',
          '       ▼',
          '┌──────────────┐     ┌──────────────┐',
          '│ Auth Required│─NO─▶│ Execute      │',
          '│ ?            │     └──────────────┘',
          '└──────┬───────┘',
          '      YES',
          '       │',
          '       ▼',
          '┌──────────────┐',
          '│ Request User │──▶ User approves/denies',
          '│ Approval     │',
          '└──────┬───────┘',
          '       │',
          '       ▼',
          '┌──────────────┐',
          '│ Execute &    │',
          '│ Audit Log    │',
          '└──────────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Permission Levels',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Level', 'Examples', 'Authorization'],
        rows: [
          ['Read (Low)', 'System info, process list, logs', 'Automatic'],
          ['Monitor (Low)', 'CPU/memory/disk metrics, health checks', 'Automatic'],
          ['Interact (Medium)', 'Clipboard sync, file transfer', 'Session-granted'],
          ['Control (High)', 'Input injection, command execution', 'Explicit approval'],
          ['Modify (Critical)', 'System config, service management', 'Explicit + MFA'],
        ],
      },
    ],
  },
  {
    id: 'automation',
    number: '10',
    title: 'Automation Architecture',
    icon: '⚡',
    content: [
      {
        type: 'paragraph',
        text: 'The automation engine enables event-driven workflows that can monitor conditions, execute actions, and respond to changes — all within the bounds of the permission system.',
      },
      {
        type: 'heading',
        text: 'Workflow Model',
        level: 2,
      },
      {
        type: 'code',
        language: 'yaml',
        code: `# Example: Disk space automation
name: disk-space-monitor
trigger:
  event: metric_threshold
  condition:
    metric: disk_usage_percent
    operator: ">"
    value: 90
    device: "*"

actions:
  - step: analyze_disk
    tool: get_disk_usage
    params: { detail: true }
    
  - step: create_report
    tool: generate_report
    params:
      template: disk-analysis
      data: \${step.analyze_disk.result}
      
  - step: notify_user
    tool: send_notification
    params:
      channel: email
      subject: "Disk Space Alert"
      body: \${step.create_report.result}

permissions:
  - read:disk
  - write:reports
  - notify:user`,
      },
      {
        type: 'heading',
        text: 'Automation Capabilities',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Event triggers: metric thresholds, device online/offline, schedule',
          'Conditional logic: if/else, loops, parallel execution',
          'Action steps: tool execution, notifications, reports',
          'Error handling: retry, fallback, alert on failure',
          'Permission enforcement: each step checked against policies',
          'Audit trail: complete log of automation execution',
          'User-defined workflows via YAML or visual editor',
        ],
      },
    ],
  },
  {
    id: 'database',
    number: '11',
    title: 'Database Architecture',
    icon: '🗄️',
    content: [
      {
        type: 'paragraph',
        text: 'PostgreSQL serves as the primary data store for NEXLINK. The schema is designed for multi-tenancy, audit compliance, and efficient querying of device state.',
      },
      {
        type: 'heading',
        text: 'Core Entities',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Entity', 'Purpose', 'Key Fields'],
        rows: [
          ['users', 'User accounts', 'id, email, org_id, role, mfa_enabled'],
          ['organizations', 'Teams/companies', 'id, name, plan, settings'],
          ['devices', 'Managed devices', 'id, org_id, name, public_key, status, last_seen'],
          ['sessions', 'Connection sessions', 'id, user_id, device_id, started_at, ended_at, type'],
          ['permissions', 'Access control', 'id, role, resource, action, conditions'],
          ['audit_logs', 'Action audit trail', 'id, actor, action, resource, timestamp, details'],
          ['automations', 'Workflow definitions', 'id, org_id, name, trigger, actions, enabled'],
          ['api_keys', 'Programmatic access', 'id, org_id, key_hash, scopes, expires_at'],
        ],
      },
      {
        type: 'heading',
        text: 'Data Principles',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Multi-tenant: all queries scoped by organization_id',
          'Soft deletes: data preserved for audit, marked deleted',
          'Immutable audit logs: append-only, never modified',
          'Encrypted sensitive fields: device keys, secrets at rest',
          'JSON columns for flexible metadata (device info, settings)',
          'Indexes optimized for common queries (device status, org lookups)',
          'Partitioning strategy for audit logs and session history',
        ],
      },
    ],
  },
  {
    id: 'api',
    number: '12',
    title: 'API Architecture',
    icon: '🔌',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK exposes a RESTful API for management operations and uses WebSocket for real-time communication (sessions, events, signaling).',
      },
      {
        type: 'heading',
        text: 'API Design Principles',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'REST for CRUD operations on resources',
          'WebSocket for real-time events and signaling',
          'Versioned endpoints (/api/v1/...)',
          'Consistent error responses with error codes',
          'Pagination for list endpoints (cursor-based)',
          'Rate limiting per user and per organization',
          'API key and OAuth 2.0 authentication',
          'OpenAPI specification published for all endpoints',
        ],
      },
      {
        type: 'heading',
        text: 'Key API Groups',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Group', 'Endpoints', 'Purpose'],
        rows: [
          ['Auth', '/api/v1/auth/*', 'Login, MFA, token refresh, SSO'],
          ['Devices', '/api/v1/devices/*', 'Register, list, update, delete devices'],
          ['Sessions', '/api/v1/sessions/*', 'Create, manage, terminate sessions'],
          ['Organizations', '/api/v1/orgs/*', 'Org management, members, settings'],
          ['Permissions', '/api/v1/permissions/*', 'RBAC configuration'],
          ['Audit', '/api/v1/audit/*', 'Query audit logs'],
          ['Automations', '/api/v1/automations/*', 'Workflow CRUD and execution'],
          ['AI', '/api/v1/ai/*', 'AI chat, tool execution, history'],
        ],
      },
    ],
  },
  {
    id: 'cloud',
    number: '13',
    title: 'Cloud Architecture',
    icon: '☁️',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK Cloud provides a fully managed hosting option. The architecture is designed to be horizontally scalable and geographically distributed.',
      },
      {
        type: 'diagram',
        title: 'Cloud Deployment Architecture',
        lines: [
          '┌─────────────────────────────────────────────────────┐',
          '│                   CDN / Edge                         │',
          '│            (Static assets, WebSocket edge)           │',
          '└──────────────────────────┬──────────────────────────┘',
          '                           │',
          '                           ▼',
          '┌─────────────────────────────────────────────────────┐',
          '│              Load Balancer (L7)                      │',
          '└──────────────────────────┬──────────────────────────┘',
          '                           │',
          '          ┌────────────────┼────────────────┐',
          '          ▼                ▼                ▼',
          '   ┌──────────┐    ┌──────────┐    ┌──────────┐',
          '   │ API Pod  │    │ API Pod  │    │ API Pod  │',
          '   │ (auto-   │    │          │    │          │',
          '   │  scale)  │    │          │    │          │',
          '   └────┬─────┘    └────┬─────┘    └────┬─────┘',
          '        │               │               │',
          '        └───────────────┼───────────────┘',
          '                        │',
          '          ┌─────────────┼─────────────┐',
          '          ▼             ▼             ▼',
          '   ┌──────────┐  ┌──────────┐  ┌──────────┐',
          '   │PostgreSQL│  │  Redis   │  │  Object  │',
          '   │ (Primary │  │ (Cluster)│  │  Storage │',
          '   │ +Replica)│  │          │  │  (S3)    │',
          '   └──────────┘  └──────────┘  └──────────┘',
        ],
      },
      {
        type: 'heading',
        text: 'Scalability Considerations',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Horizontal scaling of API servers (stateless)',
          'WebSocket connections pinned to specific pods with sticky sessions',
          'Database read replicas for query scaling',
          'Redis cluster for distributed session state',
          'Object storage for file transfers and recordings',
          'Regional relay servers for low-latency connections',
          'Auto-scaling based on connection count and CPU/memory',
        ],
      },
    ],
  },
  {
    id: 'self-hosting',
    number: '14',
    title: 'Self-Hosting Architecture',
    icon: '🏠',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK is designed to be fully self-hostable. Customers can run the entire platform on their own infrastructure without any dependency on NEXLINK Cloud.',
      },
      {
        type: 'heading',
        text: 'Self-Hosted Deployment',
        level: 2,
      },
      {
        type: 'code',
        language: 'yaml',
        code: `# docker-compose.yml (self-hosted)
version: '3.8'
services:
  nexlink-api:
    image: nexlink/server:latest
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=\${JWT_SECRET}
    ports:
      - "8080:8080"
      
  nexlink-relay:
    image: nexlink/relay:latest
    ports:
      - "8443:8443"
      
  nexlink-web:
    image: nexlink/web:latest
    ports:
      - "3000:3000"
      
  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    
  minio:
    image: minio/minio
    volumes:
      - miniodata:/data`,
      },
      {
        type: 'heading',
        text: 'Self-Hosting Requirements',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Docker and Docker Compose (or Kubernetes)',
          'Minimum 4GB RAM, 2 CPU cores for small deployments',
          'Persistent storage for database and file storage',
          'TLS certificates (Let\'s Encrypt or custom)',
          'Domain name or internal DNS',
          'Network access for devices to reach the server',
          'Backup strategy for database and configuration',
        ],
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'No Cloud Lock-In',
        text: 'Self-hosted NEXLINK has full functionality. There are no features gated behind the cloud version. Customers own their data completely.',
      },
    ],
  },
  {
    id: 'testing',
    number: '15',
    title: 'Testing Strategy',
    icon: '🧪',
    content: [
      {
        type: 'paragraph',
        text: 'Testing is integral to NEXLINK development. Every meaningful feature has tests. The testing pyramid is followed: many unit tests, fewer integration tests, targeted E2E tests.',
      },
      {
        type: 'heading',
        text: 'Testing Layers',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Layer', 'Scope', 'Tools', 'Coverage Target'],
        rows: [
          ['Unit Tests', 'Individual functions/modules', 'cargo test, Jest/Vitest', '> 80%'],
          ['Integration Tests', 'Component interactions', 'Testcontainers, supertest', 'Critical paths'],
          ['E2E Tests', 'Full user workflows', 'Playwright', 'Key scenarios'],
          ['Security Tests', 'Vulnerability scanning', 'cargo-audit, Snyk, OWASP ZAP', 'All dependencies'],
          ['Performance Tests', 'Latency, throughput', 'criterion, k6', 'Benchmarks maintained'],
          ['Compatibility', 'Cross-platform', 'CI matrix (Win/Mac/Linux)', 'All supported OS'],
        ],
      },
      {
        type: 'heading',
        text: 'Testing Principles',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Tests run in CI on every commit',
          'No merge without passing tests',
          'Security-sensitive code requires additional review',
          'Performance regressions block release',
          'Test data is isolated (no shared state between tests)',
          'Mock external services, never test against production',
          'Fuzz testing for protocol parsing and input handling',
        ],
      },
    ],
  },
  {
    id: 'deployment',
    number: '16',
    title: 'Deployment & Update Strategy',
    icon: '🚀',
    content: [
      {
        type: 'heading',
        text: 'Deployment Pipeline',
        level: 2,
      },
      {
        type: 'list',
        ordered: true,
        items: [
          'Code pushed to main branch',
          'CI runs: lint, typecheck, unit tests, security scan',
          'Integration tests run against test infrastructure',
          'Build artifacts: Docker images, agent binaries',
          'Staging deployment for validation',
          'Manual approval for production',
          'Gradual rollout (canary → percentage → full)',
          'Automated rollback on error rate increase',
        ],
      },
      {
        type: 'heading',
        text: 'Agent Update Strategy',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Updates are signed with Ed25519 keys',
          'Agent verifies signature before applying update',
          'Rollback capability if new version fails health check',
          'Staged rollout: percentage of devices at a time',
          'Administrators can pin versions or disable auto-update',
          'Update channel: stable, beta, or dev',
          'Minimal downtime: agent restarts in-place',
        ],
      },
    ],
  },
  {
    id: 'observability',
    number: '17',
    title: 'Logging & Observability',
    icon: '📊',
    content: [
      {
        type: 'paragraph',
        text: 'NEXLINK implements comprehensive observability using OpenTelemetry as the standard for traces, metrics, and logs.',
      },
      {
        type: 'heading',
        text: 'Observability Stack',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Concern', 'Technology', 'Purpose'],
        rows: [
          ['Traces', 'OpenTelemetry → Jaeger/Tempo', 'Distributed request tracing'],
          ['Metrics', 'OpenTelemetry → Prometheus', 'System and business metrics'],
          ['Logs', 'Structured JSON → Loki/ELK', 'Searchable, correlated logs'],
          ['Dashboards', 'Grafana', 'Visualization and alerting'],
          ['Alerting', 'Grafana Alerting / PagerDuty', 'Incident notification'],
          ['Audit', 'Immutable log store', 'Compliance and forensics'],
        ],
      },
      {
        type: 'heading',
        text: 'Key Metrics',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Active connections (real-time)',
          'Connection latency (p50, p95, p99)',
          'Agent health (CPU, memory, uptime)',
          'API request rate and error rate',
          'Authentication success/failure rate',
          'AI tool execution count and latency',
          'Data transfer volumes',
          'Session duration and frequency',
        ],
      },
    ],
  },
  {
    id: 'risks',
    number: '18',
    title: 'Technical & Security Risks',
    icon: '⚠️',
    content: [
      {
        type: 'heading',
        text: 'Major Technical Risks',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Risk', 'Impact', 'Mitigation'],
        rows: [
          ['NAT traversal failures', 'Cannot establish direct connections', 'Robust relay fallback, TURN servers'],
          ['Screen encoding performance', 'Poor user experience on slow networks', 'Adaptive encoding, hardware acceleration'],
          ['Cross-platform agent consistency', 'Different behavior on different OS', 'OS abstraction layer, extensive testing'],
          ['AI hallucination in tool calls', 'Incorrect actions on devices', 'Permission system, user confirmation for high-risk'],
          ['Scalability bottlenecks', 'Service degradation under load', 'Horizontal scaling, load testing'],
          ['Protocol evolution', 'Breaking changes affect deployed agents', 'Version negotiation, backward compatibility'],
        ],
      },
      {
        type: 'heading',
        text: 'Major Security Risks',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Risk', 'Impact', 'Mitigation'],
        rows: [
          ['Unauthorized device access', 'Attacker controls victim device', 'Mutual auth, device approval, MFA'],
          ['AI executing dangerous actions', 'System damage or data loss', 'Permission engine, risk levels, user approval'],
          ['Man-in-the-middle attack', 'Session hijacking', 'End-to-end encryption, certificate pinning'],
          ['Credential theft', 'Account compromise', 'MFA, hardware keys, short-lived tokens'],
          ['Supply chain attack', 'Malicious code in dependencies', 'Dependency auditing, lock files, verified builds'],
          ['Privilege escalation', 'Agent runs with excessive permissions', 'Least privilege, sandboxing, permission checks'],
          ['Data exfiltration via AI', 'Sensitive data sent to AI provider', 'Local processing option, data classification'],
        ],
      },
    ],
  },
  {
    id: 'mvp',
    number: '19',
    title: 'MVP Definition',
    icon: '🎯',
    content: [
      {
        type: 'paragraph',
        text: 'The MVP focuses on proving core value: secure remote access with a glimpse of AI capability. It does NOT attempt to implement every planned feature.',
      },
      {
        type: 'heading',
        text: 'MVP Feature Set',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Feature', 'Scope', 'Priority'],
        rows: [
          ['User account', 'Registration, login, MFA', 'P0'],
          ['Device registration', 'Enroll device with unique identity', 'P0'],
          ['Secure connection', 'Encrypted P2P or relay connection', 'P0'],
          ['Online/offline status', 'Real-time device availability', 'P0'],
          ['Remote desktop', 'View screen, mouse, keyboard', 'P0'],
          ['Clipboard sync', 'Text clipboard synchronization', 'P1'],
          ['File transfer', 'Upload/download files', 'P1'],
          ['Basic device info', 'OS, hostname, IP, uptime', 'P1'],
          ['Basic permissions', 'Owner approval for connections', 'P0'],
          ['Connection history', 'Log of past sessions', 'P2'],
          ['AI: System diagnostics', '"Why is my computer slow?" demo', 'P1'],
        ],
      },
      {
        type: 'heading',
        text: 'Smallest AI Differentiator',
        level: 2,
      },
      {
        type: 'callout',
        variant: 'success',
        title: 'MVP AI Feature: System Health Diagnosis',
        text: 'User asks "Why is my computer slow?" → AI checks CPU, memory, disk, top processes → presents analysis → suggests actions. This demonstrates the AI-native concept with minimal tool surface area.',
      },
      {
        type: 'list',
        items: [
          'Tools needed: get_cpu_usage, get_memory_usage, get_disk_usage, list_processes, get_system_info',
          'All tools are read-only (low risk, no authorization needed)',
          'AI synthesizes results into human-readable diagnosis',
          'Demonstrates the permission-aware tool architecture',
          'Sets foundation for expanding AI capabilities post-MVP',
        ],
      },
    ],
  },
  {
    id: 'roadmap',
    number: '20',
    title: 'Post-MVP Roadmap',
    icon: '🗺️',
    content: [
      {
        type: 'heading',
        text: 'Development Phases',
        level: 2,
      },
      {
        type: 'table',
        headers: ['Phase', 'Focus', 'Key Deliverables'],
        rows: [
          ['Phase 0', 'Architecture & Setup', 'Repo, dev environment, CI/CD, architecture docs'],
          ['Phase 1', 'Identity & Auth', 'User accounts, MFA, JWT, device identity'],
          ['Phase 2', 'Device Enrollment', 'Agent install, device registration, key exchange'],
          ['Phase 3', 'Secure Communication', 'Encrypted channels, signaling, heartbeat'],
          ['Phase 4', 'Remote Desktop', 'Screen capture, encoding, input, clipboard'],
          ['Phase 5', 'File Transfer', 'Upload/download, progress, resume'],
          ['Phase 6', 'Device Monitoring', 'System metrics, process list, health'],
          ['Phase 7', 'Terminal & Diagnostics', 'Remote shell, network diagnostics, logs'],
          ['Phase 8', 'AI Tool System', 'Tool definitions, permission engine, executor'],
          ['Phase 9', 'AI Assistant', 'Chat interface, multi-step reasoning, diagnosis'],
          ['Phase 10', 'Automation', 'Event triggers, workflows, scheduled tasks'],
          ['Phase 11', 'Multi-Device Management', 'Groups, bulk operations, dashboard'],
          ['Phase 12', 'Organizations', 'Teams, RBAC, shared devices, audit'],
          ['Phase 13', 'Cloud Infrastructure', 'Managed hosting, scaling, monitoring'],
          ['Phase 14', 'Self-Hosting', 'Docker deployment, documentation, support'],
          ['Phase 15', 'Commercial Launch', 'Pricing, onboarding, support, marketing'],
          ['Phase 16', 'Security Hardening', 'Pen testing, bug bounty, compliance'],
        ],
      },
    ],
  },
  {
    id: 'phase0',
    number: '21',
    title: 'Phase 0 — Action Plan',
    icon: '🏁',
    content: [
      {
        type: 'paragraph',
        text: 'Phase 0 establishes the development environment, repository structure, and foundational tooling. This is the exact sequence of actions to begin building NEXLINK.',
      },
      {
        type: 'heading',
        text: 'Prerequisites',
        level: 2,
      },
      {
        type: 'list',
        items: [
          'Git installed and configured',
          'Node.js 20+ (LTS) installed',
          'Rust toolchain installed (rustup)',
          'Docker Desktop installed',
          'Visual Studio Code with extensions: rust-analyzer, ESLint, Tailwind CSS IntelliSense',
          'GitHub account with SSH key configured',
        ],
      },
      {
        type: 'heading',
        text: 'Step 1: Create Repository',
        level: 2,
      },
      {
        type: 'code',
        language: 'powershell',
        code: `# PowerShell
mkdir nexlink
cd nexlink
git init
git branch -M main

# Create GitHub repository first, then:
git remote add origin git@github.com:YOUR_USERNAME/nexlink.git`,
      },
      {
        type: 'heading',
        text: 'Step 2: Create Directory Structure',
        level: 2,
      },
      {
        type: 'code',
        language: 'powershell',
        code: `# PowerShell
mkdir apps\\web, apps\\desktop
mkdir agent\\src
mkdir server\\src
mkdir protocol\\src
mkdir ai\\src
mkdir infrastructure\\docker
mkdir security
mkdir docs\\architecture
mkdir tests\\integration

# Create .gitkeep files in empty directories
New-Item -ItemType File -Path "agent\\src\\.gitkeep"
New-Item -ItemType File -Path "server\\src\\.gitkeep"`,
      },
      {
        type: 'heading',
        text: 'Step 3: Initialize Rust Workspace',
        level: 2,
      },
      {
        type: 'code',
        language: 'toml',
        code: `# Cargo.toml (workspace root)
[workspace]
members = [
    "agent",
    "server",
    "protocol",
    "ai",
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "proprietary"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
thiserror = "1"
anyhow = "1"`,
      },
      {
        type: 'heading',
        text: 'Step 4: Initialize Node Workspace',
        level: 2,
      },
      {
        type: 'code',
        language: 'json',
        code: `{
  "name": "nexlink",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev:web": "npm run dev --workspace=apps/web",
    "build:web": "npm run build --workspace=apps/web",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}`,
      },
      {
        type: 'heading',
        text: 'Step 5: Create CI/CD Pipeline',
        level: 2,
      },
      {
        type: 'code',
        language: 'yaml',
        code: `# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  rust-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo fmt --check
      - run: cargo clippy -- -D warnings
      - run: cargo test --workspace

  node-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo audit
      - run: npm audit --audit-level=high`,
      },
      {
        type: 'heading',
        text: 'Step 6: Create Documentation',
        level: 2,
      },
      {
        type: 'code',
        language: 'markdown',
        code: `# NEXLINK

**Connect. Control. Understand. Automate.**

An AI-native remote computing and device management platform.

## Status

🚧 **Phase 0: Architecture & Setup** — In Progress

## Quick Start

\`\`\`bash
# Clone
git clone git@github.com:YOUR_USERNAME/nexlink.git
cd nexlink

# Rust components
cargo build --workspace

# Web dashboard
cd apps/web
npm install
npm run dev
\`\`\`

## Architecture

See [docs/architecture/](./docs/architecture/) for detailed documentation.

## Security

See [security/](./security/) for security documentation and threat model.

## License

Proprietary — All rights reserved.`,
      },
      {
        type: 'heading',
        text: 'Step 7: Create .gitignore',
        level: 2,
      },
      {
        type: 'code',
        language: 'text',
        code: `# Rust
/target/
**/*.rs.bk
Cargo.lock (for libraries only)

# Node
node_modules/
dist/
.next/
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Build
*.log
coverage/`,
      },
      {
        type: 'heading',
        text: 'Verification Checklist',
        level: 2,
      },
      {
        type: 'list',
        items: [
          '✅ Repository created on GitHub',
          '✅ Directory structure matches architecture',
          '✅ Rust workspace compiles (cargo build --workspace)',
          '✅ Node workspace installs (npm install)',
          '✅ CI pipeline runs on push',
          '✅ README.md is complete',
          '✅ .gitignore covers all environments',
          '✅ Initial commit pushed to main',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Phase 0 Complete When',
        text: 'The repository exists, builds cleanly, CI passes, and the architecture documentation is committed. Then proceed to Phase 1: Identity & Authentication.',
      },
    ],
  },
];
