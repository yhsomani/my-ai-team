# TalentSphere Architecture Status Index

Date reviewed: 2026-06-26

This file is the current planning entry point for architecture status. It reconciles older architecture documents against the current repository state so product, UX, QA, and engineering work from the same assumptions.

## 1. Document Precedence

Use these documents in this order:

| Rank | Document | Use for |
|---:|---|---|
| 1 | `docs/ARCHITECTURE_STATUS_INDEX.md` | Current architecture status, document precedence, and open architecture decisions |
| 2 | `docs/COMPREHENSIVE_PRODUCT_UX_TECHNICAL_ANALYSIS_2026-06-26.md` | Product, UX, workflow, automation, technical roadmap, and implementation backlog |
| 3 | `docs/FEATURES_AND_DASHBOARDS.md` | Current feature inventory, routes, workflows, UI contents, data inputs, outputs, and role access |
| 4 | `docs/API_CONTRACT_MISMATCH_REPORT.md` | Generated frontend/backend/gateway/security route inventory |
| 5 | `docs/PRODUCT_UX_AUTOMATION_AUDIT.md` | Running implementation history and UX automation audit notes |

Older architecture docs remain useful as historical context, but they should not be treated as current completion evidence unless this index confirms the same claim.

## 2. Current Architecture Snapshot

| Area | Current evidence | Current status |
|---|---|---|
| Frontend runtime | `apps/frontend` is the active React/Vite app; `apps/frontend/src/src` is not present | Single active frontend source tree |
| Frontend package manager | Root `package.json` has npm workspace scripts and root `package-lock.json`; no root `pnpm-lock.yaml` | Use npm commands unless a task explicitly targets another package manager |
| Companion extension | `chrome-extension-project` exists with its own package lock and Manifest V3 code | Separate local extension companion, not cloud-synced to web app |
| Product data access | Frontend services use Supabase directly for many workflows and API Gateway/Spring fallbacks for others | Explicit hybrid, not a pure backend-owned API layer |
| Backend topology | `services/*-service` Spring modules plus `api-gateway`, shared modules, contracts, schemas, BOM, and service-parent POMs are present | Service-module architecture remains active |
| Unified backend target | `apps/backend` contains only `src/main/resources/application.yml` | Single-backend rebuild is not implemented |
| Service dependency model | Many service POMs use `talentsphere-bom` and `ts-contracts`, but many still depend on `ts-shared` | BOM/contracts migration is partial, not complete decoupling |
| Gateway/API security alignment | Generated API contract report currently shows 0 unmatched frontend API client calls, 0 controller routes without gateway prefixes, and 0 legacy `/api/*` security matcher paths | First route/security drift pass is clean |
| Backend test execution | No `mvn`, `mvnw`, or `gradlew` is available in the current workspace environment | Java test claims require an environment with a build runner |
| Frontend validation | `npm run lint`, `npm run test:unit`, and `npm run build` have been passing in the active implementation loop | Frontend can be validated locally |

## 3. Reconciled Historical Documents

| Document | Existing claim or purpose | Current interpretation |
|---|---|---|
| `SSOT.md` | Claims "Production Ready & Decoupled", "all phases complete", and "supersedes all previous documentation" | Historical reference. Some route/service information remains useful, but completion and authority claims are stale. |
| `docs/ARCHITECTURE_AUDIT.md` | Describes a distributed-monolith problem and proposes micro-frontends/polyrepo-style service independence | Historical risk assessment. It is directionally useful for coupling risks, but it is not the current implementation state. |
| `docs/SERVICE_MIGRATION.md` | Says a subset of services were updated and many remain pending | Historical migration tracker. Current POM evidence shows broader BOM/contracts usage, but `ts-shared` remains in many services, so migration is still incomplete. |
| `docs/ARCHITECTURE_MIGRATION.md` | Says contracts, BOM, module federation, shared split, and import migration are done | Historical progress notes. Treat import migration claims carefully because `ts-shared` dependency still exists in many service POMs. |
| `docs/ARCHITECTURE_PROPOSAL.md` | Proposes resilient event-mesh improvements such as outbox, DLQ, schema registry, caching, tracing | Future-state proposal. Use it as an improvement source, not as current-state evidence. |
| `docs/unified-rebuild-roadmap.md` | Targets one Spring Boot backend runtime and one frontend runtime | Strategic alternative roadmap. The single-backend target is not current repo state. |
| `README.md` | Presents Supabase-first setup and says `SSOT.md` is the master architecture document | Useful onboarding entry, but its documentation map now points readers to this status index first. |

## 4. Current Operating Assumptions

- Treat the active product as a React/Vite web app backed by Supabase for many product workflows, with Spring service modules and API Gateway available for backend-owned or fallback paths.
- Do not assume the backend is fully decoupled: `ts-shared` remains a service dependency in many POMs.
- Do not assume the one-backend rebuild is complete: `apps/backend` is not a complete backend application.
- Do not assume all API paths are correct from static docs alone: refresh `docs/API_CONTRACT_MISMATCH_REPORT.md` with `npm run report:api-contracts`.
- Treat user-controlled automation as the product standard: automation may draft, rank, prefill, alert, or summarize, but critical workflow changes require explicit user approval.
- Treat local-only and fallback-only state as a product risk when users reasonably expect cross-device continuity or auditability.

## 5. Open Architecture Decisions

| Decision | Why it matters | Recommended next step |
|---|---|---|
| Product data ownership | Direct Supabase and Spring services both touch product domains, which complicates security, caching, auditing, and observability | Choose explicit hybrid ownership rules or move toward a backend-owned product API layer |
| Backend topology | Docs disagree between service-module independence and a single-backend rebuild | Decide whether the roadmap is service independence or backend consolidation before large refactors |
| Shared dependency migration | `ts-shared` still couples many services | Create a service-by-service dependency removal plan with build verification |
| Pagination strategy | Jobs Explore, Candidates, Messaging conversation lists, Messaging active threads, Header notifications, LMS course catalog/progress tabs, and Admin audit logs now use cursor-backed older-item loading; remaining backend-owned APIs still need formal cursor contracts and total-count metadata where appropriate | Add formal cursor and total-count contracts to backend-owned chat/notification/LMS APIs and any new high-scale lists |
| Observability source | Admin UI still has fallback/mock-style service health in places | Define real service health, trace, log, and incident-link contracts |
| Documentation lifecycle | Historical docs still contain strong stale authority claims | Keep this index reviewed and add status notices to older architecture docs |

## 6. Validation Commands

Use this quick validation set after architecture or API-facing changes:

```bash
npm run report:api-contracts
npm run lint
npm run test:unit
npm run build
git diff --check
```

Backend validation requires Maven or a wrapper that is not present in the current workspace environment.
