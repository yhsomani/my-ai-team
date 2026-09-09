# TalentSphere — Backend Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: `services/` source tree, `pom.xml` reactor, `module-manifest.json`, rebuild baselines 01, 03, 06.  
> **Conflict Resolution**: Code > Tests > Config > Schema > Docs.

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Java | 21 |
| Framework | Spring Boot | 3.3.0 |
| API Gateway | Spring Cloud Gateway | — |
| Service Discovery | Netflix Eureka | `discovery-service` port 8098 |
| Inter-Service RPC | Spring Cloud OpenFeign | — |
| Messaging | RabbitMQ | 3.12 (ports 5672 / 15672) |
| Caching / Rate Limiting | Redis | 7 (port 6379) |
| Resilience | Resilience4j | Circuit breakers, retries |
| Build System | Maven (reactor) | — |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Spring Cloud Gateway (:8080)            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ JwtAuthenticationFilter  │ RedisRateLimiter         │ │
│  │ (HMAC JWT_SECRET)        │ (Token Bucket)           │ │
│  │ CorsWebFilter            │ Forwarding Headers       │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┼───────────────────┐
         │               │                   │
         ▼               ▼                   ▼
  ┌────────────┐  ┌────────────────┐  ┌──────────────┐
  │ Core Domain│  │ Specialized    │  │ Scheduled    │
  │ Services   │  │ Compute Sinks  │  │ Operations   │
  │ (Feign RPC)│  │ (RabbitMQ)     │  │ (Cron Jobs)  │
  └────────────┘  └────────────────┘  └──────────────┘
```

### Communication Patterns
1. **Synchronous (Feign)**: Service-to-service RPC for real-time domain queries
2. **Asynchronous (RabbitMQ)**: Event-driven workflows (XP awards, notifications, digests)
3. **Shared State (Redis)**: Rate limiting, distributed locks, token bucket counters
4. **Service Registry (Eureka)**: Dynamic service discovery for load balancing

---

## 3. Maven Reactor Structure

```
pom.xml (Root Reactor Parent)
├── bom/                        # Dependency BOM (Bill of Materials)
├── shared/
│   ├── shared-security/         # Spring Security JWT Filters & Context
│   ├── shared-messaging/        # RabbitMQ Event Exchange Configs
│   ├── shared-resilience/       # Resilience4j Circuit Breakers
│   ├── schemas/                 # Avro / Shared DTO Schemas
│   └── contracts/               # API Contracts & Interface Definitions
└── services/
    ├── api-gateway/             # Port 8080 — Primary entry point
    ├── auth-service/            # Port 8081 — Compatibility auth & JWKS
    ├── user-service/            # Port 8082 — User directory
    ├── profile-service/         # Port 8083 — Profiles, skills, education
    ├── job-service/             # Port 8084 — Job CRUD, search
    ├── application-service/     # Port 8085 — Application state machine
    ├── company-service/         # Port 8086 — Employer profiles
    ├── notification-service/    # Port 8087 — Alert dispatching
    ├── search-service/          # Port 8088 — Cross-domain indexing
    ├── gamification-service/    # Port 8089 — XP, badges, leaderboard
    ├── challenge-service/       # Port 8090 — Code sandbox & evaluation
    ├── lms-service/             # Port 8091 — Course catalog & lessons
    ├── video-service/           # Port 8092 — WebRTC interview rooms
    ├── file-service/            # Port 8093 — Binary uploads
    ├── messaging-service/       # Port 8094 — Durable conversations
    ├── networking-service/      # Port 8095 — Connections, feed
    ├── payment-service/         # Port 8096 — Demo billing
    ├── recruiter-service/       # Port 8097 — ATS pipeline, scorecards
    ├── discovery-service/       # Port 8098 — Netflix Eureka registry
    └── ai-service/              # Heuristic career copilot
```

**Total**: 26 active service modules + 6 shared modules + 1 BOM = 33 Maven modules.

---

## 4. Service Detail Catalog (26 Active Services)

### 4.1 API Gateway (`api-gateway`)
- **Port**: 8080
- **Role**: Single ingress for the secondary compute plane
- **Filters**: `JwtAuthenticationFilter` (HMAC JWT_SECRET verification), `RedisRateLimiter` (token bucket), `CorsWebFilter`
- **Forwarded Headers**: `X-User-Id`, `X-User-Role` (normalized RBAC)
- **Public Routes**: Exact prefix matching for `/api/v1/auth/*` and `/api/v1/admin/public/*`
- **Tests**: `RouteValidatorTest`

### 4.2 Auth Service (`auth-service`)
- **Port**: 8081
- **Controllers**: 2
- **Role**: Compatibility auth and JWKS provider. Default-disabled local credentials (`AUTH_LOCAL_CREDENTIALS_ENABLED=false` → 410 Gone).
- **Endpoints**: `GET /api/v1/auth/.well-known/jwks.json`, `GET /api/v1/auth/health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/register`

### 4.3 User Service (`user-service`)
- **Port**: 8082
- **Controllers**: 2
- **Role**: User directory management, CRUD, soft-delete
- **Endpoints**: `GET /api/v1/users`, `GET /api/v1/users/{id}`, `PUT /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`, `GET /api/v1/users/health`

### 4.4 Profile Service (`profile-service`)
- **Port**: 8083
- **Controllers**: 1
- **Role**: Profile CRUD, education, experience, skills management
- **Endpoints**: `GET /api/v1/profile`, `PUT /api/v1/profile`, `POST /api/v1/profile/education`, `POST /api/v1/profile/experience`, `POST /api/v1/profile/skills`

### 4.5 Job Service (`job-service`)
- **Port**: 8084
- **Controllers**: 1
- **Role**: Job posting CRUD, search, featured, recommended, advanced multi-facet filtering
- **Endpoints**: 8 operations (list, create, get, update, featured, recommended, search, advanced-search)

### 4.6 Application Service (`application-service`)
- **Port**: 8085
- **Controllers**: 2
- **Role**: Application state machine (submitted → under_review → interviewing → offered/rejected/withdrawn), lifecycle events
- **Endpoints**: 7 operations (submit, events, status update, count, health, by-job, by-user)
- **Triggers**: `application_status_events` recording on status mutations

### 4.7 Company Service (`company-service`)
- **Port**: 8086
- **Controllers**: 1
- **Role**: Employer profile management, branding, company-job associations
- **Endpoints**: 4 operations (list, create, get, update)

### 4.8 Notification Service (`notification-service`)
- **Port**: 8087
- **Controllers**: 1
- **Role**: In-app notification dispatching, read tracking, unread counts
- **Endpoints**: 5 operations (list, mark-read, mark-all-read, unread-count, health)
- **Realtime**: Supabase Realtime WebSocket delivery for instant alerts

### 4.9 Search Service (`search-service`)
- **Port**: 8088
- **Controllers**: 1
- **Role**: Cross-cutting search indexing across jobs, profiles, skills
- **Endpoints**: 4 operations (health, job search, profile search, skill matching)
- **Optional**: Elasticsearch 9200 for advanced indexing

### 4.10 Gamification Service (`gamification-service`)
- **Port**: 8089
- **Controllers**: 1
- **Role**: XP ledger calculations, badge unlock orchestration, leaderboard aggregation
- **Endpoints**: 5 operations (badges, leaderboard, user XP, award, health)
- **Idempotency**: `UNIQUE(user_id, ref_type, ref_id)` constraint on `xp_transactions`
- **Daily Ceiling**: 200 XP per user per day

### 4.11 Challenge Service (`challenge-service`)
- **Port**: 8090
- **Controllers**: 1
- **Role**: Code sandbox execution (Monaco editor backend), automated test evaluation, submission recording
- **Endpoints**: 5 operations (list, create, detail, submit, submissions)
- **Events**: Publishes XP award events to RabbitMQ on submission pass

### 4.12 LMS Service (`lms-service`)
- **Port**: 8091
- **Controllers**: 1
- **Role**: Course catalog management, lesson content, enrollment tracking, progress
- **Endpoints**: 11 operations (courses CRUD, enroll, drop, learning-paths, lessons, complete, slug, health, enrollments)

### 4.13 Video Service (`video-service`)
- **Port**: 8092
- **Controllers**: 1
- **Role**: WebRTC interview room provisioning, token generation, session lifecycle
- **Endpoints**: 4 operations (schedule, start, end, token)

### 4.14 File Service (`file-service`)
- **Port**: 8093
- **Controllers**: 1
- **Role**: Multipart binary uploads, signed access URLs, artifact management
- **Endpoints**: 4 operations (upload, download, delete, health)

### 4.15 Messaging Service (`messaging-service`)
- **Port**: 8094
- **Controllers**: 1
- **Role**: Durable conversation management, message CRUD, unread tracking
- **Endpoints**: 5 operations (conversations, history, send, read, unread-count)
- **Supersedes**: Retired `chat-service` per **ADR-004**
- **Realtime**: Backed by Supabase Realtime WebSocket channels

### 4.16 Networking Service (`networking-service`)
- **Port**: 8095
- **Controllers**: 1
- **Role**: Professional network graph, connection requests, feed, suggestions
- **Endpoints**: 8 operations (connect, connections, accept, feed, posts, like, suggestions, health)

### 4.17 Payment Service (`payment-service`)
- **Port**: 8096
- **Controllers**: 1
- **Role**: Billing transactions (**DEMO MODE** per ADR-005)
- **Endpoints**: 5 operations (checkout, plans, history, status, health)
- **Guard**: `billingMode: 'demo'`, `providerBacked: false`; Stripe SDK inert

### 4.18 Recruiter Service (`recruiter-service`)
- **Port**: 8097
- **Controllers**: 1
- **Role**: ATS pipeline aggregations, scorecard management, KPI metrics
- **Endpoints**: 2 operations (recent applications, pipeline stats)

### 4.19 Discovery Service (`discovery-service`)
- **Port**: 8098
- **Role**: Netflix Eureka service registry for dynamic service discovery
- **Not user-facing**: Internal infrastructure component

### 4.20 AI Service (`ai-service`)
- **Port**: Unlisted (routed via Gateway prefix `/api/v1/ai/**`)
- **Controllers**: 1
- **Role**: Heuristic-driven career copilot (not real LLM); resume analysis, career path recommendations, job matching
- **Endpoints**: 8 operations (analyze-resume, career-path, chat, health, insights, match-job, results, save-results)
- **Provenance**: All suggestions tagged with `SourceStatusBadge` indicating heuristic nature

---

## 5. Shared Libraries (6 Modules)

| Module | Purpose |
|---|---|
| `bom` | Centralized dependency version management |
| `shared-security` | Spring Security JWT filters, `X-User-Id` / `X-User-Role` extraction |
| `shared-messaging` | RabbitMQ event exchange configurations, message serialization |
| `shared-resilience` | Resilience4j circuit breaker, retry, and rate-limit annotations |
| `schemas` | Avro / shared DTO schemas for cross-service communication |
| `contracts` | API contracts and interface definitions (Feign clients) |

---

## 6. Inter-Service Communication

### 6.1 Synchronous (Feign RPC)
- Services declare Feign client interfaces in `contracts/`
- Eureka provides service discovery and load balancing
- Circuit breakers via Resilience4j prevent cascading failures

### 6.2 Asynchronous (RabbitMQ)
- **Exchange types**: Topic exchanges for domain events
- **Key event flows**:
  - Challenge submission passed → `XP_AWARD_EVENT` → gamification-service
  - Application status changed → `APPLICATION_STATUS_EVENT` → notification-service
  - New message sent → `MESSAGE_EVENT` → notification-service
  - Connection request → `CONNECTION_EVENT` → networking-service

### 6.3 State Store (Redis)
- Rate limiting (token bucket per API key / IP)
- Distributed locks for concurrent operations
- Temporary caching of hot data

---

## 7. Environment Variables (36 Required)

| Variable | Service | Purpose |
|---|---|---|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_ANON_KEY` | All | Supabase public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Gateway, Services | Supabase admin key |
| `JWT_SECRET` | Gateway | HMAC JWT verification secret |
| `AUTH_LOCAL_CREDENTIALS_ENABLED` | auth-service | Enable/disable local auth (default: false) |
| `SPRING_PROFILES_ACTIVE` | All | Active Spring profile |
| `SPRING_DATASOURCE_URL` | All | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | All | DB username |
| `SPRING_DATASOURCE_PASSWORD` | All | DB password |
| `SPRING_RABBITMQ_HOST` | All | RabbitMQ hostname |
| `SPRING_RABBITMQ_PORT` | All | RabbitMQ port (5672) |
| `SPRING_RABBITMQ_USERNAME` | All | RabbitMQ username |
| `SPRING_RABBITMQ_PASSWORD` | All | RabbitMQ password |
| `SPRING_REDIS_HOST` | Gateway | Redis hostname |
| `SPRING_REDIS_PORT` | Gateway | Redis port (6379) |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | All | Eureka registry URL |
| `SERVER_PORT` | All | Service port (varies 8080-8098) |
| `BILLING_MODE` | payment-service | `demo` (default) or `live` |
| `STRIPE_SECRET_KEY` | payment-service | Stripe SDK key (inert in demo) |
| `STRIPE_WEBHOOK_SECRET` | payment-service | Stripe webhook secret (inert in demo) |

---

## 8. Retired Modules

| Module | Status | Resolution | ADR |
|---|---|---|---|
| `services/chat-service` | Retired (1 controller, orphaned) | Merge useful realtime adapter code into `messaging-service`, or fully remove | ADR-004 / DECISION-004 |
| `apps/backend/` | Retired (non-runnable stub) | Preserve as historical artifact only | ADR-002 / DECISION-003 |

---

## 9. Module Registry

`module-manifest.json` tracks **28 entries**:
- 26 active Spring Boot service modules
- 1 orphaned module (`chat-service`)
- 1 retired stub (`apps/backend`)

Enforced by `validate-module-manifest.mjs` via `npm run validate:all`.
