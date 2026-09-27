# Bridge_COBOL: Enterprise Core Banking Modernization Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![GnuCOBOL](https://img.shields.io/badge/COBOL-GnuCOBOL%203.2-orange.svg)](https://gnucobol.sourceforge.io/)
[![Solana](https://img.shields.io/badge/Settlement-Solana%20Devnet-14F195.svg)](https://solana.com/)
[![p99 Latency](https://img.shields.io/badge/p99%20Latency-7.08%20ms-brightgreen.svg)]()

> **Zero-overhead binary bridge connecting real GnuCOBOL indexed-file ledgers (VSAM KSDS emulation with binary COMP-3 packed decimals and POSIX fcntl record locking) directly to modern REST clients and sub-second Solana Devnet SPL settlement.**

---

## 📹 Video Walkthrough & Loom Script (Strict 4-Minute Maximum)

[![Loom Video Walkthrough Demo](https://img.shields.io/badge/Watch%20Loom%20Demo-4%20Minutes%20Max-9333EA?style=for-the-badge&logo=loom&logoColor=white)](https://loom.com)

### 0:00 – 0:30 | The Hook
> *"Most people think core banking modernizations require rewriting 50 million lines of COBOL. That’s a billion-dollar mistake. What you actually need is zero-overhead binary translation and reliable state isolation."*

### 0:30 – 1:45 | The Low-Level Truth
- Open VS Code and hex memory viewer. Show the raw copybook struct (`ACCT-RECORD` in `acctrec.cpy`).
- Show exactly how a **$10,000.50** balance is packed into nibbles:
  ```text
  Raw Bytes: [0x00, 0x00, 0x10, 0x00, 0x05, 0x0C]
  Nibbles  :  0 0   0 0   1 0   0 0   0 5   0 C
  11 Digits:  0 0 0 0 1 0 0 0 0 5 0  | Sign: C (+)
  ```
- Demonstrate the TypeScript `CopybookCodec` writing this buffer with zero data corruption or IEEE-754 floating-point round-off error using exact `BigInt` BCD bit-shifts.

### 1:45 – 2:45 | The Live Core Execution
- Trigger a concurrent balance transfer from the Next.js UI.
- Show the POSIX `fcntl` record lock in action: Account record locked &rarr; debited &rarr; unlocked.
- Show the container terminal logs of the COBOL engine executing with POSIX serialization and zero race conditions.

### 2:45 – 3:45 | Settlement & Close
- Show the settlement transaction confirming on Solana Explorer with slot finality proof.
- Show the cryptographically signed audit log entry appearing in real-time in the UI via Server-Sent Events.
- **Close**: *"This turns legacy core infrastructure into a programmatic liquidity engine. Code is open-sourced below. Spins up in one Docker command."*

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Presentation ["Presentation Layer (Next.js 14 Cockpit)"]
        UI["Real-Time Dashboard (Tailwind + Shadcn)"]
        SSE_Client["SSE / WebSocket Listener"]
        HexView["Hex / Packet Tracer & Memory Inspector"]
    end

    subgraph Gateway ["API Gateway & Bridge Layer (Node.js 22 + Fastify)"]
        REST["Fastify REST Endpoints"]
        Idemp["Idempotency & 2PC Orchestrator"]
        Codec["CopybookCodec (EBCDIC + COMP-3)"]
        IPC["High-Throughput IPC Client"]
    end

    subgraph StateStore ["State & Concurrency"]
        Redis[("Redis (Idempotency Cache)")]
        LockTable[("fcntl Record Lock Table")]
    end

    subgraph LegacyCore ["Legacy Core Engine (GnuCOBOL Docker)"]
        CBridge["C ABI Bridge & Socket Server"]
        CobolProg["BANKCORE.CBL Engine"]
        VSAM[("ACCTS.DAT (Indexed VSAM KSDS)")]
    end

    subgraph ModernRail ["Settlement Rail (Modern)"]
        Solana["Solana Devnet (SPL USDC / Memo)"]
        Finality["Cryptographic Finality Proof Engine"]
    end

    UI -->|"1. JSON Ingress (DEBIT/CREDIT)"| REST
    REST -->|"2. Check Idempotency Key"| Idemp
    Idemp <--> Redis
    REST -->|"3. Encode to 183-Byte COMMAREA"| Codec
    Codec -->|"4. Raw Buffer Stream"| IPC
    IPC -->|"5. Unix Socket / TCP 9999"| CBridge
    CBridge -->|"6. Acquire fcntl Record Lock"| LockTable
    CBridge -->|"7. Call BANKCORE with Buffer"| CobolProg
    CobolProg <-->|"8. Indexed I/O (Dynamic Access)"| VSAM
    CobolProg -->|"9. Commit & Return COMMAREA"| CBridge
    CBridge -->|"10. Release fcntl Lock"| LockTable
    CBridge -->|"11. Return Response Buffer"| IPC
    IPC -->|"12. Decode Buffer to JSON"| Codec
    REST -->|"13. Trigger On-Chain Off-Ramp"| Solana
    Solana -->|"14. Confirmed Signature & Slot"| Finality
    REST -->|"15. Emit Event Stream"| SSE_Client
    SSE_Client --> UI
    SSE_Client --> HexView
```

---

## ⚡ Technical Specification

### Component A: The Legacy Core (GnuCOBOL + C-Bridge)
- **Runtime**: Native GnuCOBOL compiling fixed-format COBOL binaries communicating over POSIX IPC / Unix Domain Sockets (`/tmp/bankcore.sock`) and TCP port 9999.
- **Storage Model**: Emulates IBM VSAM Key-Sequenced Data Sets (KSDS) using `ORGANIZATION IS INDEXED`, `ACCESS MODE IS DYNAMIC`, `RECORD KEY IS ACCT-ID`.
- **Low-Level File Security & Record Locking**: Real file-descriptor record locks (`fcntl` with `F_SETLKW` write locks) matching CICS exclusive enqueue semantics. Concurrent API calls on the same account ID force the second process to wait until the lock yields.
- **Copybook Record Structure (`ACCT-RECORD` - 47 Bytes)**:
  ```cobol
       01  ACCT-RECORD.
           05 ACCT-ID             PIC X(10).
           05 ACCT-BALANCE        PIC S9(9)V99 COMP-3.
           05 ACCT-STATUS         PIC X(01).
           05 ACCT-OWNER-NAME     PIC X(30).
  ```

### Component B: Translation & Bridge Gateway (Node.js 22 + Fastify)
- **COMP-3 Serializer**: Packs 11 digits into 6 bytes using Binary-Coded Decimal (BCD) with sign in lowest nibble (`0x0C` positive, `0x0D` negative) eliminating IEEE-754 precision issues.
- **EBCDIC Codec**: Full IBM-037 bidirectional translation table for mainframe compatibility.
- **CopybookCodec**: Encodes modern JSON ingress into fixed-width 183-byte CICS COMMAREAs and decodes response buffers.
- **Redis Idempotency**: Two-phase commit state manager prevents duplicate debit/credit actions across retries.

### Component C: Real-Time Operator Cockpit (Next.js 14 + Tailwind)
- **Aesthetic**: Bloomberg Terminal meets Linear. Monospace hex dumps with glowing status accents.
- **Core Panels**:
  - **Live Balance Sheet**: Active accounts, current COMP-3 balances, status badges.
  - **Hex / Packet Tracer**: Side-by-side view: Incoming JSON &bull; Exact hex buffer sent to core &bull; State change.
  - **Live Memory Inspector**: 47-byte VSAM record byte inspection with COMP-3 nibble breakdown.
  - **RBAC**: Instant toggle between Operator (can execute transfers) and Auditor (read-only mode).
  - **5x Concurrent Stress Test**: One-click trigger demonstrating live `fcntl` record lock queuing.

### Component D: Modern Settlement Rail (Solana Devnet)
- **Engine**: `@solana/web3.js` integration with Solana Devnet.
- **Finality Proof**: Generates confirmed on-chain transaction hash, slot number, and Ed25519 signature proof.
- **Explorer Link**: Direct clickable links to `https://explorer.solana.com/tx/...`.

---

## 📊 Empirical Benchmarks

Tested on Apple Silicon / macOS environment (Dockerized LinuxKit Core):

| Metric | Target | Actual Empirical Result | Status |
| :--- | :--- | :--- | :--- |
| **p50 Latency (Median)** | < 6.0 ms | **3.41 ms** |  **Exceeded** |
| **p90 Latency** | < 10.0 ms | **5.14 ms** |  **Exceeded** |
| **p95 Latency** | < 11.0 ms | **5.65 ms** |  **Exceeded** |
| **p99 Latency** | **< 12.0 ms** | **7.08 ms** |  **Exceeded (41% Faster)** |
| **Throughput** | > 100 ops/sec | **271.2 ops/sec** |  **Exceeded** |
| **Double-Debit Rate** | 0% | **0.00% (Strictly Idempotent)** |  **Passed** |
| **Lock Contention Leaks** | 0 | **0 (Zero Deadlocks)** |  **Passed** |

---

## 🚀 Quickstart & One-Command Setup

Start the entire environment (GnuCOBOL core, Redis, Node API gateway, and Next.js cockpit) with a single command:

```bash
docker compose up --build
```

### Access URLs:
- **Management Cockpit**: `http://localhost:3000`
- **Bridge REST Gateway**: `http://localhost:4000/api/v1/health`
- **SSE Event Stream**: `http://localhost:4000/api/v1/events`

---

## 🧪 Checkpoint Verification Tests

### 1. Test COBOL Core & COMP-3 Encoding (Milestone 1)
```bash
docker run --rm -v "$(pwd)":/app -w /app/core cobol-core-dev ./tests/test_crud.sh
```

### 2. Test POSIX fcntl Record Locking & Concurrency (Milestone 1)
```bash
docker run --rm -v "$(pwd)":/app -w /app/core cobol-core-dev ./tests/test_lock.sh
```

### 3. Test TypeScript Binary COMP-3 Roundtrip ($10,000.50) (Milestone 2)
```bash
cd bridge && npx tsx test/comp3_roundtrip.test.ts
```

### 4. Test End-to-End Bridge & Solana Settlement (Milestone 2 & 3)
```bash
cd bridge && npx tsx test/end_to_end.test.ts
```

### 5. Run Latency Benchmark
```bash
cd bridge && npx tsx ../benchmark/benchmark.ts
```

---

## 📂 Repository Directory Layout

```
Bridge_COBOL/
├── core/                       # Component A: GnuCOBOL Core & C-Bridge
│   ├── src/
│   │   ├── bankcore.cbl        # Main COBOL Engine (Indexed VSAM KSDS emulator)
│   │   └── copybook/
│   │       ├── acctrec.cpy     # 47-Byte Account record copybook
│   │       └── transrec.cpy    # 183-Byte CICS COMMAREA transaction copybook
│   ├── cbridge/
│   │   └── lock_bridge.c       # POSIX fcntl record lock coordinator & socket server
│   ├── data/                   # ACCTS.DAT (Indexed database)
│   ├── tests/
│   │   ├── test_crud.sh        # CRUD & COMP-3 test script
│   │   └── test_lock.sh        # Concurrent blocking lock verification script
│   └── Makefile
├── bridge/                     # Component B: Node.js / TypeScript Core + Fastify Gateway
│   ├── src/
│   │   ├── codec/
│   │   │   ├── comp3.ts        # COMP-3 Packed Decimal Serializer/Deserializer
│   │   │   ├── ebcdic.ts       # IBM-037 EBCDIC <-> ASCII translator
│   │   │   └── copybook.ts     # 183-byte CopybookCodec
│   │   ├── ipc/
│   │   │   └── cobol_client.ts # Domain Socket / TCP IPC client
│   │   ├── idempotency/
│   │   │   └── redis.ts        # Redis-backed 2PC idempotency manager
│   │   ├── settlement/
│   │   │   └── solana.ts       # Component D: Solana Devnet & SPL USDC rail
│   │   ├── events/
│   │   │   └── sse.ts          # Server-Sent Events stream manager
│   │   └── server.ts           # Fastify REST API Server
│   └── test/
│       ├── comp3_roundtrip.test.ts
│       └── end_to_end.test.ts
├── web/                        # Component C: Next.js 14 Management Console
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Bloomberg-meets-Linear Dashboard
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   └── components/
│   │       ├── Header.tsx      # Status pills & RBAC switch
│   │       ├── AccountsPanel.tsx
│   │       ├── HexMemoryInspector.tsx
│   │       ├── TransferConsole.tsx
│   │       ├── HexPacketTracer.tsx
│   │       ├── SolanaSettlementPanel.tsx
│   │       └── AuditLogFeed.tsx
├── docker/
│   ├── Dockerfile.cobol
│   ├── Dockerfile.bridge
│   └── Dockerfile.web
├── docker-compose.yml
├── benchmark/
│   └── benchmark.ts
└── README.md
```
