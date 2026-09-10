# TalentSphere Platform Architecture

> Documentation status: Current living master architecture document for the TalentSphere Platform.

## 1. Executive Summary & System Overview

**TalentSphere** is an enterprise-scale unified career platform integrating three major domains:
1. **Professional Networking & Job Marketplace** (LinkedIn model): User profiles, resumes, social networking, job posting, advanced filtering, saved searches, application tracking, candidate review scorecards.
2. **Learning Management System (LMS)** (Coursera model): Course catalog, video lessons, enrollment management, module progress tracking, certification.
3. **Technical Assessment & Coding Challenges** (HackerRank model): Coding challenges across categories (Algorithms, Frontend, Backend, Database), in-browser IDE, test case evaluation, submission tracking, leaderboard, and gamification XP/badges.

### 1.1 Technical Stack Summary

| Layer | Technologies | Current Evidence & State |
| --- | --- | --- |
| **Frontend Web** | React 19, TypeScript 5.5, Vite 5.4, Tailwind CSS, Redux Toolkit, React Query, Supabase JS Client | Active web app in `apps/frontend/`. 114 test files / 631 unit tests passing. Strict Aura design tokens. |
| **Browser Extension** | Manifest V3, TypeScript, Vite, Tailwind CSS, Chrome Storage API | Active browser companion in `chrome-extension-project/`. Local-only storage, LinkedIn/Indeed/Glassdoor scrapers. |
| **Backend Core** | Java 21, Spring Boot 3.3.0, Spring Cloud Gateway, Resilience4j, Spring Data JPA, Spring Security | 26 active Maven reactor modules under `services/`. Unified monolith entrypoint in `apps/backend/`. |
| **Database & Auth** | PostgreSQL 15+ via Supabase, Row Level Security (RLS), Supabase Auth | 59 PostgreSQL tables defined in `infra/db/migrations/0001_initial_baseline.sql`. Generated types in `database.types.ts`. |
| **Caching & Messaging** | Redis 7, RabbitMQ, Service-role Node.js background schedulers | Redis rate limiting on Gateway routes. Node.js automated digest runners with sanitized audit logging. |
| **Observability & CI** | Prometheus metrics, Alertmanager, Grafana dashboard catalogs, GitHub Actions CI | Incident runbooks in `docs/runbooks/INCIDENT_RUNBOOKS.md`. Alerts catalog in `infra/observability/`. |

---

## 2. Current Architecture vs Target Architecture

### 2.1 Current Architecture Snapshot (Observed Evidence)

```
                               ┌─────────────────────────────┐
                               │   Chrome Companion (MV3)    │ (Local-first,
                               │ (LinkedIn/Indeed/Glassdoor) │  chrome.storage.local)
                               └──────────────┬──────────────┘
                                              │ Optional local export
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND WEB APP                               │
│  React 19 + TypeScript + Vite + Redux Toolkit + Aura UI Design System       │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
         (Direct Supabase / PostgREST)          (HTTP / REST /api/v1/*)
         45 direct-queried tables                      │
                       │                               ▼
                       │               ┌──────────────────────────────┐
                       │               │      Spring API Gateway      │
                       │               │   JWT Verifier / Rate Limit  │
                       │               └──────────────┬───────────────┘
                       │                              │
                       │             ┌────────────────┴────────────────┐
                       │             │    26 Spring Boot Services      │
                       │             │  (Modular Monolith / Services)  │
                       │             └────────────────┬────────────────┘
                       ▼                              ▼
    ┌────────────────────────────────────────────────────────────────────┐
    │                       SUPABASE POSTGRESQL DB                       │
    │  59 Tables, Row-Level Security (RLS), Indexes, Triggers, Auth      │
    └────────────────────────────────────────────────────────────────────┘
```

### 2.2 Target Architecture (Modular Monolith with Extractable Domain Boundaries)

Per **ADR-002** and **ADR-003**, the target architecture converges onto a **clean modular monolith** with strict domain boundary isolation before extracting microservices:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND WEB APP                               │
│             Route Registry -> Feature Slices -> Typed Client Adapters        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / OpenAPI 3.1
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TALENTSPHERE UNIFIED BACKEND SERVER                      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ API Gateway & Edge Security Layer (AuthN, RBAC, Rate Limits, CORS)   │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │ Domain Application Modules (Strict Dependency Inversion)              │  │
│  │                                                                       │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │   Identity   │ │Talent Profile│ │Jobs & Recruits│ │   Learning   │  │  │
│  │  │    Module    │ │    Module    │ │    Module    │ │    Module    │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │  Assessment  │ │Networking &  │ │  Billing &   │ │ AI Insights  │  │  │
│  │  │ (Challenges) │ │  Messaging   │ │ Monetization │ │   Assistant  │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Shared Core (Security, Resilience, Persistence, Audit, Events)  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
    ┌────────────────────────────────────────────────────────────────────┐
    │                      POSTGRESQL PERSISTENCE                        │
    │  Domain-partitioned schemas, RLS security policies, audit trails   │
    └────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture & Design System

### 3.1 Routing & Feature Ownership
The frontend uses a strict 1:1 route-to-feature ownership model enforced in `apps/frontend/src/navigation/featureOwnership.ts` and `routeRegistry.ts`:

- `/` -> Landing Page (Public overview, stats)
- `/login`, `/register` -> Authentication Shell
- `/dashboard` -> Role-adaptive Dashboard (Talent, Recruiter, Admin views)
- `/jobs`, `/jobs/post`, `/jobs/saved`, `/jobs/applied` -> Job Marketplace
- `/candidates` -> Recruiter Candidate Review & Scorecards
- `/profile`, `/resume` -> Talent Profile & Interactive Resume Builder
- `/learning`, `/learning/courses/:id` -> LMS Catalog & Course Player
- `/challenges`, `/challenges/:id` -> Coding Assessment & IDE
- `/network` -> Professional Connections & Suggestions
- `/messages` -> 1:1 and Group Direct Messaging
- `/billing` -> Subscription Tiers & Payment History
- `/ai`, `/ai/career-path` -> AI Copilot & Career Guidance
- `/settings` -> User Profile & Security Settings
- `/admin` -> Operational Monitoring & Governance Console

### 3.2 Design System: The Aura Token Standard
- **Semantic Color Tokens**: `--bg-primary`, `--bg-secondary`, `--bg-panel`, `--border-default`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`.
- **WCAG 2.1 AA Compliance**: Minimum 4.5:1 text-to-background contrast ratio across all light/dark themes.
- **Atomic UI Primitives**: `AuraButton`, `GlassCard`, `AuraInput`, `AuraModal`, `Tabs`, `Toast`, `Badge`, `Skeleton`, `Toggle`, `EmptyState`.
- **Zero Raw Color Hex Drift**: Monitored and enforced by `scripts/validate-ui-design-system.mjs`.

---

## 4. Backend Service Topology & Contracts

### 4.1 Maven Reactor Architecture
The backend is structured under Maven parent `pom.xml` with 26 active reactor modules:
- **Shared Primitives**: `service-parent`, `bom`, `shared`, `shared-security`, `shared-messaging`, `shared-resilience`, `contracts`, `schemas`.
- **Core Domain Services**: `auth-service`, `user-service`, `profile-service`, `job-service`, `application-service`, `company-service`, `notification-service`, `search-service`, `gamification-service`, `challenge-service`, `lms-service`, `video-service`, `file-service`, `messaging-service`, `networking-service`, `payment-service`, `ai-service`.
- **Edge Routing**: `api-gateway` (Spring Cloud Gateway Reactive).

### 4.2 Security & Error Boundaries
- **JWT Contract**: Gateway normalizes Supabase JWT roles (`app_metadata`, `user_metadata`) to canonical `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` headers.
- **Fail-Safe Exception Handling**: `GlobalExceptionHandler` returns safe public error codes and `X-Correlation-ID` without leaking internal stack traces or database errors.
- **File Upload Security**: Strict MIME-type verification, magic-byte inspection (PDF, PNG, JPEG, WebP, DOCX), script tag stripping, and malware scanner hooks in `FileService`.
