# TalentSphere System Architecture Specification

> Documentation status: Canonical system architecture baseline. Reconciled with codebase on 2026-09-08.

## 1. Executive Architectural Summary

TalentSphere operates a **hybrid dual-plane architecture** designed for rapid iteration, strict data boundaries, and elastic scale:

1. **Primary Data Plane (Supabase / PostgreSQL)**: Direct PostgREST access via `typedSupabase` client for 46 application tables, Supabase Auth (JWT), Row-Level Security (RLS) policies, and Realtime event streaming.
2. **Secondary Service Plane (Spring Boot Microservices & Edge Gateway)**: Spring Cloud Gateway (port 8080), Eureka discovery, 26 Spring Boot domain microservices (Java 21 / Spring Boot 3.3.0), Redis rate limiting, and RabbitMQ message broker.
3. **Client Subsystems**: React 19 Single-Page Application (SPA) with Vite, TypeScript 5.7, Tailwind CSS 4.2, and a companion Chrome Extension (Manifest V3) operating local-first scrapers.

---

## 2. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                             CLIENT ECOSYSTEM                                |
|                                                                             |
|  +-------------------------------------+   +-----------------------------+  |
|  |       React 19 SPA (Web App)        |   |   Chrome Extension (MV3)    |  |
|  |  React Router v7 + Redux Toolkit    |   |   (LinkedIn/Indeed Scraper) |  |
|  |  Aura Design System + Lucide Icons  |   |   Local Storage / Export    |  |
|  +------------------+------------------+   +--------------+--------------+  |
+---------------------|-------------------------------------|-----------------+
                      |                                     |
                      | 1. Direct Data Plane (PostgREST)    | JSON / Storage
                      | 2. Auth & Realtime Channels         |
                      v                                     v
+-----------------------------------------------------------------------------+
|                    SUPABASE DATA & SECURITY PLANE                           |
|                                                                             |
|  +---------------------+  +----------------------+  +--------------------+  |
|  |    Supabase Auth    |  |   PostgreSQL 15+     |  | Supabase Realtime  |  |
|  |  JWT / Session Mgmt |  | 50 Canonical Tables  |  | WebSocket Streams  |  |
|  |  Role Claims        |  | 119 RLS Policies     |  | Presence & Notify  |  |
|  +---------------------+  +----------+-----------+  +--------------------+  |
+--------------------------------------|--------------------------------------+
                                       |
                                       | (Optional / Complex Workflows)
                                       v
+-----------------------------------------------------------------------------+
|               SPRING CLOUD ENTERPRISE SERVICE PLANE                         |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  | Spring Cloud Gateway (Port 8080) - JWT Validation / Redis Rate Limit  |  |
|  +-----------------------------------+-----------------------------------+  |
|                                      |                                      |
|            +-------------------------+-------------------------+            |
|            |                                                   |            |
|            v                                                   v            |
|  +--------------------+                             +--------------------+  |
|  |  Domain Services   | <--- Eureka Discovery --->  | Integration Svc    |  |
|  |  (26 Spring Boot   | <--- OpenFeign RPC ------>  | (LMS, Coding Exec, |  |
|  |   Reactor Modules) | <--- RabbitMQ Events ---->  |  Analytics Sinks)  |  |
|  +--------------------+                             +--------------------+  |
+-----------------------------------------------------------------------------+
```

---

## 3. Data Flow & Communication Topology

### 3.1 Primary Client-to-Data Flow (Supabase PostgREST)
- **Direct Queries**: The frontend web app interacts with 46 tables directly through the auto-generated TypeScript client (`typedSupabase`).
- **Security Boundary**: Postgres Row-Level Security (RLS) evaluates `auth.uid()` and user metadata claims on every single query and mutation across 40 protected tables.
- **Realtime**: WebSockets listen to `postgres_changes` on `messages`, `notifications`, and `job_applications` for zero-polling live UI updates.

### 3.2 Gateway & Microservices Flow
- **Gateway Entry**: Complex workflows (e.g. secure coding sandbox evaluation, scheduled digest dispatching, payment verification) route via `http://localhost:8080/api/v1/*`.
- **Gateway Filter Chain**:
  1. `CorsWebFilter`: Origin and credential validation.
  2. `JwtAuthenticationFilter`: Supabase JWT public key verification / HMAC header propagation.
  3. `RedisRateLimiter`: Tiered token bucket rate limits per user/IP.
- **Service Mesh**: Internal inter-service communication utilizes Netflix Eureka service registry and Spring Cloud OpenFeign client interfaces with Resilience4j circuit breakers.

---

## 4. Subsystem Components & Responsibilities

| Subsystem | Technologies | Responsibilities |
|-----------|--------------|------------------|
| **Frontend Web** | React 19.2.5, Vite 7, TS 5.7, Redux Toolkit, Tailwind 4.2 | 22 lazy-loaded pages, 19 protected routes, client state, Aura design tokens, Error Boundaries. |
| **Data Plane** | PostgreSQL 15+, Supabase PostgREST | 50 canonical tables, 15 database enums, 119 RLS policies, 29 triggers, 5 database functions. |
| **Identity & Access** | Supabase Auth, GoTrue | Email/Password auth, session recovery, JWT issuance with `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`. |
| **API Gateway** | Spring Cloud Gateway 4.1 | Routing, authentication proxy, Redis-backed rate limiting, TLS termination. |
| **Core Services** | 26 Spring Boot 3.3.0 Modules | Domain logic, challenge runner, batch processing, search indexing. |
| **Event Bus & Caching** | RabbitMQ 3.12, Redis 7 | Asynchronous event publishing, distributed locking, gateway rate limiting. |
| **Observability** | Prometheus, Grafana, Alertmanager | Metrics scraping, health endpoints, 12 alert rules, 12 dashboard panels. |
| **Browser Extension** | Chrome Manifest V3, Webpack/Vite | Scrapes LinkedIn/Indeed jobs into local chrome storage with export capabilities. |

---

## 5. Security & Trust Boundaries

1. **Authentication Boundary**: Supabase Auth issues asymmetric RS256/HS256 signed JWTs with explicit role and tenant metadata.
2. **Database Boundary (RLS)**: Enforced directly inside PostgreSQL. Public users cannot read private tables (`profiles`, `applications`, `messages`, `content_reports`) without satisfying RLS expressions.
3. **Gateway Boundary**: Spring Cloud Gateway validates incoming bearer tokens before proxying downstream to internal Java microservices.
4. **AI & Moderation Boundary**: AI outputs operate under a review-gated `draft` -> `saved` | `dismissed` lifecycle with `SourceStatusBadge` provenance. Content reports are triaged via `content_reports` table.
5. **Monetization Boundary (ADR-005)**: Billing operates in `demo` mode; Stripe SDK endpoints are isolated and payment routes return stubbed demo responses.

---

## 6. Architectural Decision Records (ADRs) Summary

- **ADR-001: React 19 Single Page Application**: Standardized on React 19 + Vite + Tailwind CSS for optimal client performance and state isolation.
- **ADR-002: Modular Monolith / Hybrid Gateway**: Unified backend entry points through Spring Cloud Gateway while allowing direct PostgREST data access for standard CRUD.
- **ADR-003: Migration-First Supabase Authority**: `infra/db/migrations/0001_initial_baseline.sql` mirrored in `supabase-schema.sql` is the sole schema authority (50 canonical tables).
- **ADR-004: Legacy Schema Disposition**: 10 tables from `infra/supabase_master.sql` classified as `legacy-master-only` and isolated from active application code.
- **ADR-005: Billing Demo Mode**: Stripe integration configured in demo mode (`billingMode = 'demo'`) with provider charging disabled until live onboarding.
