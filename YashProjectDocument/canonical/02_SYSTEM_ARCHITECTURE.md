# TalentSphere — System Architecture Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: Synthesized from `SYSTEM_ARCHITECTURE.md`, `03_ARCHITECTURE.md`, `01_PROJECT_OVERVIEW.md`, `02_ops_facts.md`, ADRs 001-006, and DECISION-001..009.  
> **Rule**: Zero knowledge loss from source documentation.

---

## 1. Architectural Overview & Design Philosophy

TalentSphere employs a **hybrid dual-plane architecture** optimized for developer velocity, responsive client interactivity, and robust tenant isolation:

1. **Primary Data Plane (Supabase / PostgreSQL 15+)**:
   - Direct PostgREST access via the generated `typedSupabase` client for 46 application tables.
   - Supabase Auth handles identity lifecycle, issuing RS256/HS256 signed JWTs carrying RBAC claims.
   - PostgreSQL Row-Level Security (RLS) acts as the ultimate security boundary with 119 active policies.
   - Supabase Realtime manages WebSocket event streaming for instant messaging, notifications, and pipeline state changes.

2. **Secondary Service Plane (Spring Boot 3.3.0 / Java 21 Microservices)**:
   - Centralized ingress via Spring Cloud Gateway on port `8080` with HMAC JWT verification and Redis token-bucket rate limiting.
   - 26 active Spring Boot modules configured within the root Maven reactor handling asynchronous processing, code sandbox execution, scheduled digests, and telemetry sinks.
   - Inter-service RPC via Spring Cloud OpenFeign and asynchronous messaging via RabbitMQ 3.12.

3. **Companion Client Plane (Chrome Extension MV3)**:
   - Local-first architecture (ADR-006) utilizing `chrome.storage.local` for zero-telemetry candidate privacy.
   - Content scripts extract job requisitions from LinkedIn/Indeed DOM structures and perform client-side resume matching.

---

## 2. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                        CLIENT SUBSYSTEMS                                          |
|                                                                                                   |
|  +----------------------------------------------------+   +------------------------------------+  |
|  |             React 19 SPA (Main Web App)            |   |     Chrome Extension (MV3)         |  |
|  |  React Router v7.14 | Redux Toolkit 2.11           |   |  Local-First Scraper (LinkedIn/Ind)|  |
|  |  Aura Design System (18 Primitives) + Tailwind 4.2 |   |  chrome.storage.local (Zero Exfil) |  |
|  +--------------------+-------------------------------+   +-----------------+------------------+  |
+-----------------------|-----------------------------------------------------|---------------------+
                        |                                                     |
                        | 1. Direct PostgREST Queries (46 Tables)             | Local JSON Import/Export
                        | 2. Supabase Auth & Realtime WebSockets              |
                        v                                                     v
+---------------------------------------------------------------------------------------------------+
|                                  SUPABASE DATA & SECURITY PLANE                                   |
|                                                                                                   |
|  +------------------------+  +------------------------------------+  +-------------------------+  |
|  |     Supabase Auth      |  |         PostgreSQL 15+ DB          |  |    Supabase Realtime    |  |
|  |  - JWT / Refresh Token |  |  - 50 Canonical Tables             |  |  - WebSocket Channels   |  |
|  |  - RBAC Claims Mapping |  |  - 119 Row-Level Security Policies |  |  - Messages & Alerts   |  |
|  |  - Email/Pass & OAuth  |  |  - 29 Triggers / 5 Stored Functions |  |  - Presence Tracking   |  |
|  +------------------------+  +-----------------+------------------+  +-------------------------+  |
+------------------------------------------------|--------------------------------------------------+
                                                 |
                                                 | Heavy Async Workloads / Sandboxed Execution
                                                 v
+---------------------------------------------------------------------------------------------------+
|                               SPRING CLOUD ENTERPRISE SERVICE PLANE                               |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Spring Cloud Gateway (Port 8080)                                                            |  |
|  | - JwtAuthenticationFilter (HMAC / JWT_SECRET) | RedisRateLimiter (Token Bucket)             |  |
|  | - CorsWebFilter | Forwarding Headers (X-User-Id, X-User-Role)                              |  |
|  +----------------------------------------------+----------------------------------------------+  |
|                                                 |                                                 |
|          +--------------------------------------+--------------------------------------+          |
|          |                                      |                                      |          |
|          v                                      v                                      v          |
|  +--------------------+             +------------------------+             +-------------------+  |
|  | Core Domain Svcs   |             | Specialized Sinks      |             | Scheduled Ops     |  |
|  | - job-service      |  <--RPC-->  | - challenge-service    |  <--Evts--> | - run-digests     |  |
|  | - application-svc  |  (Feign)    |   (Monaco Code Sandbox)| (RabbitMQ)  | - run-reminders   |  |
|  | - profile-service  |             | - ai-service (Heuristic|             | - run-kpi-aggr    |  |
|  | - lms-service      |             | - video-service (RTC)  |             | - scheduler-audit |  |
|  +--------------------+             +------------------------+             +-------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Subsystem Topologies & Module Inventory

### 3.1 Network Port Allocations

| Port | Subsystem / Service | Role & Access Level |
|---|---|---|
| **80** | Nginx Ingress / Reverse Proxy | Production Public Edge |
| **3000 / 5173** | React 19 Frontend (Vite Dev Server) | Local Client Web Surface |
| **3001** | Mock API Server (`scripts/mock-server.cjs`) | Offline / Dev Mock Ingress |
| **5432** | PostgreSQL 15 (Supabase Database) | Direct DB & PostgREST Ingress |
| **5672 / 15672** | RabbitMQ Message Broker & Admin UI | Inter-Service Event Messaging |
| **6379** | Redis 7 Instance | Rate Limiting & Distributed Locking |
| **8080** | Spring Cloud Gateway (`api-gateway`) | Primary Secondary Plane Entry |
| **8081** | `auth-service` | Compatibility Auth & JWKS Provider |
| **8082** | `user-service` | User Account & Directory Management |
| **8083** | `profile-service` | Candidate Profiles, Experience, Skills |
| **8084** | `job-service` | Job Requisitions, Filtering, Search |
| **8085** | `application-service` | Application State Machine & Events |
| **8086** | `company-service` | Corporate Profiles & Employer Branding |
| **8087** | `notification-service` | Alert Dispatching & Read Tracking |
| **8088** | `search-service` | Cross-Domain Search Indexing |
| **8089** | `gamification-service` | XP Calculations & Badge Unlocks |
| **8090** | `challenge-service` | Code Sandbox & Automated Testing |
| **8091** | `lms-service` | Course Catalog & Lesson Engine |
| **8092** | `video-service` | WebRTC Interview Room Provisioning |
| **8093** | `file-service` | Binary Uploads & Signed Access |
| **8094** | `messaging-service` | Durable Conversation Backend |
| **8095** | `networking-service` | Peer Connections & Activity Feed |
| **8096** | `payment-service` | Billing Transactions (Demo Mode) |
| **8097** | `recruiter-service` | ATS Pipeline Aggregations & Scorecards |
| **8098** | `discovery-service` (Eureka) | Internal Microservice Registry |
| `[UNLISTED]` | `ai-service` | Route `/api/v1/ai/**` routed via Gateway |
| **9200** | Elasticsearch (Optional) | Search & Analytics Indexing |

### 3.2 Maven Reactor Module Topology (27 Modules Total)

```
pom.xml (Root Reactor Parent)
├── bom/ (Dependency BOM)
├── shared/
│   ├── shared-security/     # Spring Security JWT Filters & Context
│   ├── shared-messaging/    # RabbitMQ Event Exchange Configs
│   ├── shared-resilience/   # Resilience4j Circuit Breakers
│   ├── schemas/             # Avro / Shared DTO Schemas
│   └── contracts/           # API Contracts & Interface Definitions
└── services/
    ├── api-gateway/         # Port 8080 (Primary Routing & Token Bucket)
    ├── auth-service/        # Port 8081 (Compatibility Auth & JWKS)
    ├── user-service/        # Port 8082
    ├── profile-service/     # Port 8083
    ├── job-service/         # Port 8084
    ├── application-service/ # Port 8085
    ├── company-service/     # Port 8086
    ├── notification-service/# Port 8087
    ├── search-service/      # Port 8088
    ├── gamification-service/# Port 8089
    ├── challenge-service/   # Port 8090
    ├── lms-service/         # Port 8091
    ├── video-service/       # Port 8092
    ├── file-service/        # Port 8093
    ├── messaging-service/   # Port 8094
    ├── networking-service/  # Port 8095
    ├── payment-service/     # Port 8096 (Demo Mode)
    ├── recruiter-service/   # Port 8097
    ├── discovery-service/   # Port 8098 (Netflix Eureka)
    └── ai-service/          # Heuristic Career Copilot
```

### 3.3 Retired / Orphaned Modules
1. **`services/chat-service`** (`[DEPRECATED]`): Orphaned from the Maven reactor per **ADR-004** / **DECISION-004**. All messaging capabilities consolidated into `messaging-service` using Supabase Realtime.
2. **`apps/backend/`** (`[DEPRECATED]`): Historical non-runnable monolithic Spring Boot shell per **ADR-002**. Replaced by the 26 Maven service reactor modules.

---

## 4. Architectural Decision Records (ADRs) Catalog

### ADR-001: Primary Identity Provider & Authentication Authority
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: Supabase Auth is the sole login, registration, password reset, and user authentication authority. Backend `auth-service` local credential endpoints are default-disabled (`AUTH_LOCAL_CREDENTIALS_ENABLED=false`) returning `410 Gone`.
- **Token Contract**: Gateway verifies Supabase access token via HMAC `JWT_SECRET`, forwarding verified `X-User-Id` and normalized `X-User-Role` (`ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`) headers downstream.

### ADR-002: Backend Topology & Modular Reactor Strategy
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: Rebuild target is modular monolith first with explicit extractable service boundaries. Existing `services/*` modules in the Maven reactor serve as the active source evidence until unified backend migration occurs.

### ADR-003: Migration-First Database Schema Authority
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: Schema authority resides exclusively in ordered SQL migrations (`infra/db/migrations/0001_initial_baseline.sql` mirroring `supabase-schema.sql`). `infra/supabase_master.sql` is classified as legacy history (10 unique tables isolated). TypeScript types generated via `npm run report:db-types`.

### ADR-004: Unified Messaging Domain Boundary
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: A single messaging domain boundary is established. `messaging-service` backed by Supabase Realtime is the sole messaging authority. `chat-service` is orphaned and excluded from Gateway and deployment manifests.

### ADR-005: Explicit Demo-Mode Billing Governance
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: Platform billing operates in explicit **Demo Mode** (`billingMode: 'demo'`, `providerBacked: false`). Stripe SDK integrations remain inert scaffolding until live provider credential onboarding and webhook verification occur. All UI surfaces must display "DEMO MODE".

### ADR-006: Chrome Extension Local-First Privacy Posture
- **Date**: 2026-06-27 | **Status**: Accepted
- **Decision**: Chrome Extension operates under a strict local-first privacy model. Scraped job details and resume matching occur in `chrome.storage.local`. Zero exfiltration or tracking telemetry without explicit user authorization.

---

## 5. Formal Decisions Log (DECISION-001 through DECISION-009)

| Decision ID | Summary & Rationale | Affected Subsystems | Impact & Verification |
|---|---|---|---|
| **DECISION-001** | Supabase Auth selected as SSOT identity provider; legacy backend auth converted to compatibility-only. | Frontend, Gateway, `auth-service` | Enforced by `validate-auth-contract.mjs` |
| **DECISION-002** | Gateway token validation configured with HMAC `JWT_SECRET` verifier; public route matching uses exact prefix matching. | `api-gateway`, Spring Security | Gateway `RouteValidatorTest` passes |
| **DECISION-003** | 26-module Maven reactor retained; `apps/backend` stub quarantined as historical artifact. | Root `pom.xml`, `module-manifest.json`| Enforced by `validate-module-manifest.mjs` |
| **DECISION-004** | `chat-service` orphaned; messaging consolidated into `messaging-service` and Supabase Realtime. | `messaging-service`, Docker, K8s | Enforced by `validate-messaging-boundary-adr.mjs` |
| **DECISION-005** | Schema migrations established as SSOT; `data-ownership-manifest.json` tracks table lifecycle. | `infra/db/migrations`, PostgREST | Enforced by `validate-schema-migrations.mjs` |
| **DECISION-006** | 10 `infra/supabase_master.sql` legacy tables isolated from production schema migrations. | Legacy DB disposition manifest | Enforced by `validate-legacy-schema-disposition.mjs` |
| **DECISION-007** | Strict Demo Mode enforced for all payment and subscription surfaces. | `payment-service`, `BillingPage` | Enforced by `validate-payment-mode-adr.mjs` |
| **DECISION-008** | Chrome Extension restricted to local storage; zero telemetry exfiltration. | `chrome-extension-project/` | Enforced by extension test suites |
| **DECISION-009** | 20 automated validation scripts required in CI before deployment authorization. | Root `package.json` (`validate:all`) | Tested via `npm run validate:all` |

---

## 6. End-to-End Data Flow Sequences

### Sequence 1: Client Query via Supabase PostgREST (Primary Plane)
```
[React SPA] --(1. HTTP GET /rest/v1/jobs?select=* + Bearer JWT)--> [Supabase PostgREST]
                                                                          |
                                                      (2. Inspect JWT & Extract auth.uid())
                                                                          v
                                                               [PostgreSQL Engine]
                                                                          |
                                                      (3. Evaluate 119 RLS Policy ASTs)
                                                                          v
[React SPA] <--(4. Filtered JSON Result Array 200 OK)---------- [PostgreSQL Engine]
```

### Sequence 2: Complex Workload via Spring Cloud Gateway (Secondary Plane)
```
[React SPA] --(1. POST /api/v1/challenges/42/submit + Bearer JWT)--> [Spring Cloud Gateway (8080)]
                                                                               |
                                                            (2. JwtAuthenticationFilter: Validate HMAC)
                                                            (3. RedisRateLimiter: Check Token Bucket)
                                                                               v
                                                            (4. Append X-User-Id & X-User-Role headers)
                                                                               v
[React SPA] <--(6. Evaluation Result JSON 200 OK)------------------ [challenge-service (8090)]
                                                                               |
                                                            (5. Publish XP Award Event to RabbitMQ)
                                                                               v
                                                                   [gamification-service (8089)]
```

---

## 7. Security Architecture & Trust Boundaries

```
+---------------------------------------------------------------------------------------------------+
|                                     TRUST BOUNDARY TAXONOMY                                       |
+---------------------------------------------------------------------------------------------------+
| 1. Public Ingress Boundary   : Nginx / Vite Web Server (TLS Termination, CSP Headers)             |
| 2. Identity Boundary         : Supabase Auth (Asymmetric JWT Issuance, GoTrue Refresh Cycles)     |
| 3. Database Security Boundary: PostgreSQL RLS (119 Policies; Zero-Trust at Engine Layer)          |
| 4. Gateway Edge Boundary     : Spring Cloud Gateway (HMAC Validation, Substring Bypass Defense)   |
| 5. Service-to-Service Trust  : Internal Docker Network / Eureka / RabbitMQ Shared Secret          |
| 6. AI & Copilot Provenance   : Rule Heuristics with Review-Gated Lifecycle (SourceStatusBadge)    |
| 7. Financial Safety Boundary : ADR-005 Demo Mode Guard (Inert Charging Endpoints)                 |
+---------------------------------------------------------------------------------------------------+
```
