# TalentSphere — Preservation Register (MANDATORY)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> **MANDATORY zero-loss inventory.** Every piece of project knowledge that MUST be preserved across the fresh rebuild, regardless of rebuild disposition. Extracted 2026-09-08.
>
> This register exists to guarantee the directive: **DO NOT LOSE ANY PROJECT KNOWLEDGE.** Nothing in this register may be silently dropped during the rebuild. Each item carries its source location so it can be relocated or reconstructed.

## 1. Preserved Source Material

| # | Artifact | Location | Why Preserved |
|---|----------|----------|---------------|
| P-01 | Canonical PRD | `docs/PRD.md` | Product requirements SSOT |
| P-02 | Canonical BRD | `docs/BRD.md` | Business requirements SSOT |
| P-03 | Feature catalog + user stories | `docs/FEATURES_AND_USER_STORIES.md` | Feature/user-story spec |
| P-04 | System architecture + ADRs | `docs/SYSTEM_ARCHITECTURE.md`, `docs/adr/` | Architecture decisions 001-006 |
| P-05 | Frontend architecture | `docs/FRONTEND_ARCHITECTURE.md` | Frontend design |
| P-06 | Backend architecture | `docs/BACKEND_ARCHITECTURE.md` | Backend design |
| P-07 | API OpenAPI contract | `docs/API_OPENAPI_CONTRACT.json` | 123-operation API contract |
| P-08 | Authoritative schema | `supabase-schema.sql` | 50 tables / 119 RLS / 15 enums / 29 triggers / 5 fns / 116 idx |
| P-09 | Seed data | `seed-data.sql` | Reference data |
| P-10 | Migration baseline | `infra/db/migrations/0001_initial_baseline.sql` | Migration authority |
| P-11 | Decisions log | `docs/DECISION.md` | DECISION-001..009 |

## 2. Preserved Code (Design/Logic/Behavior)

| # | Code Asset | Location | Why Preserved |
|---|-----------|----------|---------------|
| P-20 | Aura design system primitives | `apps/frontend/src/components/shared/` (18 comps + barrel `index.ts`) | Design system SSOT |
| P-21 | 21 frontend services | `apps/frontend/src/services/*.ts` | API client + business logic |
| P-22 | Route registry | `apps/frontend/src/navigation/routeRegistry.ts` | 19 protected + 3 public routes |
| P-23 | Feature ownership mapping | `apps/frontend/src/navigation/featureOwnership.test.ts` | Feature→route contract |
| P-24 | Supabase client | `apps/frontend/src/lib/supabaseClient.ts` | DB access layer |
| P-25 | Product analytics | `apps/frontend/src/lib/productAnalytics.ts` | Event tracking |
| P-26 | XP ledger logic | `apps/frontend/src/lib/xpLedger.ts` | Gamification rules |
| P-27 | Unified search | `apps/frontend/src/lib/unifiedSearch.ts` | Command search |
| P-28 | 26 Spring Boot services | `services/` (Maven reactor) | Backend compute plane |
| P-29 | Module manifest | `module-manifest.json` | Service registry (28 entries) |
| P-30 | Chrome extension | `chrome-extension-project/` | MV3 companion app |

## 3. Preserved Tests

| # | Test Asset | Location | Why Preserved |
|---|-----------|----------|---------------|
| P-40 | 846 frontend unit tests | `apps/frontend/src/**/*.test.{ts,tsx}` | Behavioral contract |
| P-41 | 28 E2E specs (114 test() declarations) | `apps/frontend/tests/*.spec.ts` | Journey coverage |
| P-42 | 22 validators (20 .mjs + 2 .sh) | `scripts/validate-*.mjs`, `scripts/validate-*.sh` | Repository governance |
| P-43 | 5 scheduler tests | `scripts/*.test.mjs` | Background job contracts |
| P-44 | 7 extension suites | `chrome-extension-project/` | Extension contracts |

## 4. Preserved Business Rules / Knowledge

| # | Knowledge | Source | Why Preserved |
|---|-----------|--------|---------------|
| P-50 | Role model (3 roles + RBAC) | PRD §3, schema `user_role` enum | Authz model |
| P-51 | XP/badge/leaderboard rules | F-22, xpLedger, gamification-service | Gamification logic |
| P-52 | Application status lifecycle | `application_status` enum, status events table | Pipeline state machine |
| P-53 | Connection lifecycle | `connection_status` enum | Networking graph rules |
| P-54 | Report triage lifecycle | `report_status`, trustAndSafetyService | Trust & safety flow |
| P-55 | Billing demo-mode rule | ADR-005, `billingMode: 'demo'` | Billing governance |
| P-56 | Extension local-first posture | ADR-006 | Privacy model |
| P-57 | 40 feature flags | admin feature-flags API | Feature governance |
| P-58 | Messaging realtime via Supabase | ADR-004 | Messaging architecture |
| P-59 | AI heuristic provenance disclosure | SourceStatusBadge | Honest AI labeling |

## 5. Preserved Relationships / Traceability

| # | Relationship | Register |
|---|--------------|----------|
| P-70 | Feature → page mapping | [05_FEATURES.md](05_FEATURES.md) |
| P-71 | Feature → API endpoint mapping | [06_API.md](06_API.md) |
| P-72 | Feature → DB table mapping | [04_DATABASE.md](04_DATABASE.md) |
| P-73 | Feature → test mapping | [08_TESTING.md](08_TESTING.md) |
| P-74 | Requirement → feature → API → DB → test | [13_TRACEABILITY.md](13_TRACEABILITY.md) |

## Preservation Guarantees

1. **No knowledge deletion**: Every item above is captured in this baseline OR is a file retained in the repo.
2. **Relocation over deletion**: If a rebuild removes an artifact, its knowledge is transcribed into the baseline docs first.
3. **Legacy docs marked, not deleted**: Superseded docs (Express/tRPC/MySQL era) are preserved and clearly labeled historical, so intent history is not lost.
4. **Broken/partial code preserved**: chat-service and apps/backend stub are documented (not silently gone) with their dispositions.
5. **Auditable**: Traceability matrix ([13_TRACEABILITY.md](13_TRACEABILITY.md)) proves every feature is covered by code + tests + docs.
