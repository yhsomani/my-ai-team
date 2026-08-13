# Technical Debt Register

> Derived from `PLAN.md` (Section 22) and architectural analysis.

| Severity | Area | Description | Action Required |
| --- | --- | --- | --- |
| P0 | Architecture | Direct frontend Supabase access bypasses backend validation and API contracts. | Implement repository adapters and migrate write paths to backend-owned APIs (Phase 2 & 3). |
| P0 | Architecture | Incomplete schema authority; multiple duplicate SQL files. | Adopt `infra/db/migrations` as canonical source (ADR-003). |
| P0 | Architecture | Gateway authentication implementation relies on disparate configurations. | Standardize token verification across Gateway and backend services (ADR-001). |
| P0 | Architecture | Duplicate messaging implementations. | Remove orphaned `chat-service` and route traffic through `messaging-service` (ADR-004). |
| P0 | Infrastructure | Missing or unstable Outbox implementation in critical microservices leading to unreliability. | Adopt `shared-messaging` outbox components comprehensively. |
| P1 | Architecture | Mixed database technologies (Mongo vs Postgres) for related domains like LMS. | Standardize to PostgreSQL for transactional consistency. |
| P1 | Security | Direct access to raw exception messages in some legacy components. | Refactor global exception handling to sanitize outputs. |
| P2 | UX / Auth | Legacy employer metadata role mapping. | Complete UI/UX alignment and legacy data cleanup. |
| P3 | Documentation | Stale agent scripts and non-product artifacts. | Purge generated artifacts and `project_structure.txt`. |
