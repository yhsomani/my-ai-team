# TalentSphere Engineering Decisions (DECISION.md)

> Documentation status: Current living engineering decision log preserving architectural context, reasoning, trade-offs, impact, validation, and rollback plans.

---

# DECISION-001 — Primary Identity Provider & Session Authority

Date: 2026-06-27
Status: Accepted
Area: Security & Identity

## Context
The platform had two competing authentication systems: Spring `auth-service` with local username/password tables and Supabase Auth with JWT tokens. This created split identity states and security risks.

## Evidence
- Frontend client natively uses Supabase Auth (`@supabase/supabase-js`).
- Database RLS policies depend directly on `auth.uid()`.
- Spring `api-gateway` can verify JWT signatures using HMAC `JWT_SECRET`.

## Decision
Accept **Supabase Auth as the Single Primary Identity & Session Authority**.
- Frontend logs in directly via Supabase Auth.
- Backend `auth-service` local credentials endpoint returns `410 Gone` by default unless explicitly enabled for testing.
- `api-gateway` verifies Supabase JWTs and normalizes role claims (`app_metadata`, `user_metadata`) to standard `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` headers.

## Impact
Eliminates duplicate credentials storage, secures database RLS, and centralizes session lifecycle.

## Validation
`npm run validate:auth-contract` enforces this contract in CI.

## Rollback
Can re-enable local credential validation by setting `AUTH_LOCAL_CREDENTIALS_ENABLED=true` in `auth-service`.

---

# DECISION-002 — Backend Topology: Modular Monolith First

Date: 2026-06-27
Status: Accepted
Area: Backend Architecture

## Context
The repository contained 26 separate Spring Boot service modules, but lacked service discovery, distributed tracing infrastructure, and independent database ownership.

## Evidence
- No distributed transaction coordinators or independent database schemas were verified.
- Monolith runner entrypoint `apps/backend/TalentSphereBackendApplication.java` already exists.
- Local developer startup of 26 separate JVMs requires excessive memory and orchestration overhead.

## Decision
Adopt a **Modular Monolith First with Extractable Domain Boundaries**.
- Unify services inside a single runtime boundary while preserving strict package and domain boundaries.
- Retain existing `services/*` Maven reactor structure as extractable modules.
- Defer standalone microservice extraction until scaling, separate team ownership, or independent database requirements justify it.

## Impact
Drastically reduces operational complexity, simplifies CI/CD builds, guarantees ACID transaction boundaries across core flows, and maintains clean code boundaries.

## Validation
`npm run validate:backend-topology-adr` verifies module dependencies and structure.

---

# DECISION-003 — Single Database Schema Authority & Type Generation

Date: 2026-06-27
Status: Accepted
Area: Database & Persistence

## Context
Multiple SQL files (`supabase-schema.sql`, `init-db.sql`, `supabase_master.sql`) and Java JPA entities competed as schema definitions.

## Evidence
- `infra/db/migrations/0001_initial_baseline.sql` contains the complete 59-table schema with RLS and triggers.
- `infra/db/generated/database.types.ts` provides complete TypeScript definitions.

## Decision
Establish **PostgreSQL / Supabase Baseline Migration as the Single Schema Authority**.
- All schema changes must be authored as versioned SQL migrations in `infra/db/migrations/`.
- Frontend TypeScript types are generated via `npm run report:db-types`.
- Backend JPA entities must validate against the database schema rather than auto-generating DDL (`hibernate.ddl-auto=validate`).

## Impact
Prevents schema drift, ensures type safety across frontend and backend, and preserves RLS policy integrity.

## Validation
`npm run validate:schema-authority-adr` and `npm run validate:schema-migrations`.

---

# DECISION-004 — Messaging Domain Consolidation & Chat Service Retirement

Date: 2026-06-27
Status: Accepted
Area: Communication

## Context
Both `services/messaging-service` and `services/chat-service` existed in the codebase, leading to duplicate messaging logic and route confusion.

## Evidence
- `messaging-service` was actively integrated with frontend `apps/frontend/src/services/messagingService.ts`.
- `chat-service` was orphaned from the Maven reactor POM and API gateway routes.

## Decision
Declare **`messaging-service` as the single messaging domain owner** and formally classify `chat-service` as orphaned.
- Direct messaging and group messaging are owned exclusively by `messaging-service` and Supabase Realtime channels.
- `chat-service` routes are excluded from active OpenAPI contracts.

## Impact
Removes code duplication and eliminates ambiguity in communication APIs.

## Validation
`npm run validate:messaging-boundary-adr`.

---

# DECISION-005 — Payment Mode & Explicit Demo Billing

Date: 2026-06-27
Status: Accepted
Area: Billing & Monetization

## Context
Live payment gateway keys (Stripe) are not provisioned in local/test environments, risking broken checkout flows during development and automated testing.

## Evidence
- Frontend `BillingPage.tsx` and `paymentService.ts` support simulated checkout and plan switching.

## Decision
Operate in **Explicit Demo Billing Mode** by default.
- UI explicitly labels billing actions as Demo Mode when live Stripe keys are absent.
- Simulated payments update `public.subscriptions` and `public.payments` with explicit `DEMO_` identifiers.
- Live provider webhooks are enabled only when production Stripe credentials are configured.

## Impact
Allows full end-to-end testing of subscription-gated features without requiring live payment infrastructure.

## Validation
`npm run validate:payment-mode-adr`.

---

# DECISION-006 — Chrome Extension Local-First Privacy Posture

Date: 2026-06-28
Status: Accepted
Area: Browser Tools & Security

## Context
The Chrome extension scrapes job details from third-party portals (LinkedIn, Indeed, Glassdoor) and matches resumes. Syncing raw scraped data or candidate resumes to cloud backends without explicit consent violates user privacy expectations.

## Evidence
- Extension uses `chrome.storage.local` with versioned schema markers (`storageMigrations.ts`).
- Content scripts run within `activeTab` permissions.

## Decision
Maintain a **Strict Local-First Privacy Boundary** for the Chrome extension.
- Scraped job metadata, prep cards, and resume match reports remain in local browser storage only.
- No background sync to cloud APIs without explicit user export action.
- Telemetry is restricted to sanitized, privacy-safe event counts.

## Impact
Guarantees user privacy, minimizes compliance risks, and provides immediate offline utility.

## Validation
`npm run test:extension-contract` and `npm run test:extension-storage-migrations`.

---

# DECISION-007 — Aura UI Design System & Strict Token Architecture

Date: 2026-06-29
Status: Accepted
Area: Frontend & UX Design System

## Context
Inconsistent color values, ad hoc hex colors, arbitrary spacing, and low-contrast UI elements previously caused visual drift and accessibility failures.

## Evidence
- `scripts/validate-ui-design-system.mjs` scans 296 source files for CSS token adherence.
- `apps/frontend/src/index.css` defines the semantic Aura design token system.

## Decision
Enforce the **Aura Design Token Standard** across all web and extension surfaces.
- All colors must use semantic CSS custom properties (`--bg-primary`, `--text-primary`, `--accent`, etc.).
- Prohibit raw hex / rgb literals in components and style sheets.
- Enforce WCAG 2.1 AA 4.5:1 text-to-background contrast ratio across both light and dark themes.
- Standardize on atomic UI primitives (`AuraButton`, `GlassCard`, `AuraInput`, `AuraModal`, `Tabs`, `Toast`).

## Impact
Ensures visual consistency, accessible contrast, responsive fluidity, and seamless dark/light mode switching across every page.

## Validation
`npm run validate:ui-design-system` and `npm run test:contrast:all`.
