# TalentSphere Architecture Document

> Documentation status: Current architecture state and target blueprint based on repository ADRs and plan.

## 1. Current Architecture
The current application architecture follows a "Distributed Monolith" or hybrid microservices pattern:
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, and Redux Toolkit.
- **Backend:** 19 separate Spring Boot Java microservices relying on a shared BOM and API Gateway.
- **Data Layer:** A mix of PostgreSQL (via Supabase) and MongoDB.
- **Messaging:** RabbitMQ for asynchronous domain events (using the Outbox pattern in `shared-messaging`).
- **State:** Frontend services frequently interact directly with Supabase, bypassing the backend services (Migration Debt).

### 1.1 Known Problems
- **Coupling & Ambiguity:** Frontend direct database writes bypass business logic.
- **Duplication:** `services/chat-service` is orphaned while `services/messaging-service` handles the product messaging capability.
- **Data Consistency:** Lack of reliable message outbox implementations uniformly across all modules.

## 2. Target Architecture
The rebuild target is a **Modular Monolith first, with explicit extractable service boundaries** (ADR-002).

### 2.1 Module Boundaries
The backend will converge into a unified Spring Boot application containing distinct domain modules:
- `identity/auth`
- `profile`
- `jobs`
- `applications`
- `learning`
- `assessment`
- `networking`
- `messaging` (ADR-004: exclusively owning conversations and realtime routing)
- `billing`
- `shared` (infrastructure primitives: security, events, observability)

### 2.2 Dependency Rules
- High-level web adapters depend inward on application/domain contracts.
- Domain modules must not depend on other domain internals.
- Cross-domain communication strictly uses application ports, events (Outbox), or explicit read models.

### 2.3 Data Ownership
- **Migration-first Supabase/Postgres authority** (ADR-003).
- All canonical schema changes are managed via ordered SQL migrations.
- Direct frontend Supabase queries will be migrated to backend-owned APIs to ensure domain logic execution.
