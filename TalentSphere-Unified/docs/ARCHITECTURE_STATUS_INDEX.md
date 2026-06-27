# TalentSphere Architecture Status Index

> Documentation status: Current architecture status and documentation precedence index. Keep synchronized with `../../PLAN.md`.

Date reviewed: 2026-06-26

This file is the current planning entry point for architecture status. It reconciles older architecture documents against the current repository state so product, UX, QA, and engineering work from the same assumptions.

## 1. Document Precedence

Use these documents in this order:

| Rank | Document | Use for |
|---:|---|---|
| 1 | `../../PLAN.md` | Rebuild execution SSOT, progress ledger, validation checklist, technical debt, and target architecture |
| 2 | `docs/ARCHITECTURE_STATUS_INDEX.md` | Current architecture status, document precedence, and open architecture decisions |
| 3 | `docs/COMPREHENSIVE_PRODUCT_UX_TECHNICAL_ANALYSIS_2026-06-26.md` | Product, UX, workflow, automation, technical roadmap, and implementation backlog |
| 4 | `docs/FEATURES_AND_DASHBOARDS.md` | Current feature inventory, routes, workflows, UI contents, data inputs, outputs, and role access |
| 5 | `docs/API_CONTRACT_MISMATCH_REPORT.md` | Generated frontend/backend/gateway/security route inventory |
| 6 | `docs/API_OPENAPI_CONTRACT.json` | Generated source-derived OpenAPI 3.1 route, parameter, request-body, response-body, and component-schema contract |
| 7 | `docs/runbooks/INCIDENT_RUNBOOKS.md` | Current source-backed incident runbooks for source validation, CI, scheduler, extension, API, auth, security, data, and admin degradation failures |
| 8 | `infra/observability/alerts/critical-alerts.json` and `infra/observability/dashboards/critical-flows-dashboard.json` | Source-level critical alert and dashboard coverage catalogs |
| 9 | `docs/PRODUCT_UX_AUTOMATION_AUDIT.md` | Running implementation history and UX automation audit notes |
| 10 | `docs/UX_AUDIT_CHECKLIST.md` | Current route, dashboard, and major-screen UX audit checklist for validated UI restructuring |
| 11 | `docs/DESIGN_SYSTEM.md` | Current design-system implementation guide for tokens, shared components, layout, navigation, and interaction patterns |
| 12 | `docs/MODULE_MANIFEST.md` | Source ownership, infrastructure, generated/dev artifact, and documentation lifecycle validation |
| 13 | `docs/adr/ADR-001-primary-identity-provider.md` | Accepted primary identity-provider decision and token-contract migration plan |
| 14 | `docs/adr/ADR-002-backend-topology.md` | Accepted backend topology decision: modular monolith first with extractable service boundaries |
| 15 | `docs/adr/ADR-003-schema-authority.md` | Accepted schema authority decision: migration-first Supabase/Postgres with generated TypeScript types and backend validation |
| 16 | `docs/adr/ADR-004-messaging-boundary.md` | Accepted messaging boundary decision: one messaging domain boundary with chat-service orphaned until retirement or adapter merge |
| 17 | `docs/adr/ADR-005-payment-mode.md` | Accepted payment mode decision: explicit demo billing mode until provider-backed checkout and webhook-owned state are verified |

Older architecture docs remain useful as historical context, but they should not be treated as current completion evidence unless this index confirms the same claim.

## 2. Current Architecture Snapshot

| Area | Current evidence | Current status |
|---|---|---|
| Frontend runtime | `apps/frontend` is the active React/Vite app; `apps/frontend/src/src` is not present | Single active frontend source tree |
| Frontend package manager | Root `package.json` has npm workspace scripts and root `package-lock.json`; no root `pnpm-lock.yaml` | Use npm commands unless a task explicitly targets another package manager |
| Frontend UX/design system | `docs/UX_AUDIT_CHECKLIST.md`, `docs/DESIGN_SYSTEM.md`, `scripts/validate-ui-design-system.mjs`, `apps/frontend/src/navigation/featureOwnership.ts`, `apps/frontend/tests/visual-layout.spec.ts`, `apps/frontend/tests/accessibility-semantics.spec.ts`, `apps/frontend/tests/keyboard-navigation.spec.ts`, `apps/frontend/tests/job-application.spec.ts`, `apps/frontend/tests/post-job-workflow.spec.ts`, `apps/frontend/tests/profile-workflow.spec.ts`, `apps/frontend/src/lib/profileAvatarCrop.ts`, `apps/frontend/tests/resume-workflow.spec.ts`, `apps/frontend/tests/settings-workflow.spec.ts`, `apps/frontend/tests/billing-workflow.spec.ts`, `apps/frontend/tests/lms-workflow.spec.ts`, `apps/frontend/tests/challenges-workflow.spec.ts`, `apps/frontend/tests/candidate-review.spec.ts`, `apps/frontend/tests/messaging-workflow.spec.ts`, `apps/frontend/tests/networking-workflow.spec.ts`, `apps/frontend/src/index.css`, shared UI primitives, `LandingPage.tsx`, and `routeRegistry.ts` are present | Redesign execution is governed by a current UX audit checklist, design-system guide, source-level UI validator, feature ownership IA contract, major-route desktop/mobile layout audit, major-route accessibility semantics audit, focused keyboard navigation guardrail covering command search, notifications including account read/load-more actions, mobile nav, tabs, modals, and auth forms, a Jobs workflow contract covering application review/submit/details behavior, saved-search create/apply/review-cancel/delete payloads, and hidden Explore hide/restore payloads, a Post Job workflow contract covering company context creation/attach payloads, template save/apply/delete review, draft-history restore, duplicate review, and reviewed draft save payloads, a Profile workflow contract covering AI profile draft save/discard, reviewed profile field saves, suggestion application, skill/experience/education row mutations, tab switching, and avatar upload/remove payloads, an avatar crop export fallback from canvas `toBlob` to data URL, a Resume workflow contract covering import text review, selected field apply/save, imported skill/experience/education saves, PDF/HTML downloads, provider PDF upload, export/artifact sync payloads, artifact copy/delete review, and AI resume draft apply/discard, a Settings workflow contract covering profile settings saves, keyboard notification preference changes, digest and quiet-hours saves, Billing summary/handoff, password reset review, account deactivation review, notification save failure retention/retry, and workflow analytics, a Billing workflow contract covering plan catalog/current-plan rendering, transaction history, plan review cancel/checkout handoff, billing portal handoff, provider checkout failure retention/retry, popup-blocked checkout warning, provider-unavailable retry recovery, demo-mode copy, and workflow analytics, a Learning workflow contract covering AI handoff review, catalog search/pagination, enrollment, failed enrollment recovery, lesson completion, failed progress-persistence recovery, keyboard lesson selection/completion, and progress filtering, a Challenges workflow contract covering category filtering, workspace open, local sample-check result handling, unsupported-language and hidden-sample safeguards, reviewed reset, submission payloads, failed-submission recovery, latest result rendering, and retry-history refresh, a Candidates workflow contract covering application pagination/search/focus, keyboard pagination/search/details/queue navigation, note deletion, scorecard fallback/retry, bulk status reviews, and failed status handling, a Messaging workflow contract that includes attachment-link keyboard focus order, uploaded-file attachments, failed-send retry, visible mark-read, and older-history loading, plus a Networking workflow contract covering suggestion preview, hide/restore, connect, accept/decline, reminder set/clear, withdraw, accepted-profile preview, keyboard preview activation, and full-profile popup route targets; implementation scope now includes shell/primitives, public/auth routes, role dashboards, major workspaces, legacy exported helper normalization, extension token hover cleanup, and documentation, with route/dashboard removal deferred until validated |
| Companion extension | `chrome-extension-project` exists with its own package lock and Manifest V3 code; `npm run test:messaging` validates content scan extraction and background/content message wiring, `npm run test:portal-fixtures` validates LinkedIn/Indeed/Glassdoor selector fixture parsing, `npm run test:storage-migrations` validates versioned local storage migration logic and install/update wiring, `npm run test:contract` validates MV3 permissions/hosts, local-only sync posture, bounded diagnostics, metadata allowlists, and raw resume/job diagnostics exclusion, and `npm run test:runtime-smoke` validates the built artifact, host-mapped portal fixture tabs, popup, local storage, and background messaging in a live Chromium-compatible MV3 runtime with a Node 20-compatible CDP transport | Separate local extension companion, not cloud-synced to web app; source-level portal fixture parsing, host-mapped runtime portal fixture execution, manifest icons, and Chromium runtime popup/storage/background smoke are verified and wired into the extension CI job, while GitHub-hosted browser availability, live public-portal drift, Google Chrome-specific unpacked registration, Web Store packaging, and published behavior remain pending |
| Product data access | Frontend services use Supabase directly for many workflows and API Gateway/Spring fallbacks for others | Explicit hybrid, not a pure backend-owned API layer |
| Schema authority | `data-ownership-manifest.json`, `supabase-schema.sql`, `infra/db/migrations/0001_initial_baseline.sql`, `infra/db/generated/database.types.ts`, `infra/db/legacy-schema-disposition.json`, `apps/frontend/src/lib/supabaseClient.ts`, `scripts/validate-typed-supabase-boundary.mjs`, `infra/supabase_master.sql`, and ADR-003 are present | ADR-003 accepts migration-first Supabase/Postgres authority with generated TypeScript types and backend validation; the initial baseline migration, source-derived relationship-aware generated types, frontend `typedSupabase` boundary, generated RPC typing, legacy/duplicate table dispositions, trigger insert-column validation, and typed billing/challenge/application/settings service migrations are source-validated, while live Supabase migration execution, smaller domain-ordered migrations, live Supabase-generated relationship types, live RLS behavior, query-plan/index validation, and remaining service-by-service typed repository adoption remain pending |
| Messaging boundary | `services/messaging-service`, orphaned `services/chat-service`, frontend messaging Supabase access, API contract report, OpenAPI contract, and ADR-004 are present | ADR-004 accepts one messaging domain boundary; `messaging-service` remains active, `/api/v1/chat/*` remains non-active orphaned surface, and runtime WebSocket/STOMP behavior remains pending |
| Payment mode | `apps/frontend/src/services/paymentService.ts`, `BillingPage.tsx`, `services/payment-service`, API contract report, OpenAPI contract, billing SQL, and ADR-005 are present | ADR-005 accepts explicit demo billing mode; provider-backed checkout, signed webhooks, webhook-owned subscription/payment state, and provider runtime tests remain pending |
| Backend topology | `services/*-service` Spring modules plus `api-gateway`, shared modules, contracts, schemas, BOM, service-parent POMs, and ADR-002 are present | Service-module architecture remains active while ADR-002 accepts modular monolith first with extractable service boundaries as the rebuild target |
| Unified backend target | `apps/backend` contains only `src/main/resources/application.yml` | Single-backend rebuild is not implemented; ADR-002 accepts the target topology but not runtime completion |
| Service dependency model | Many service POMs use `talentsphere-bom` and `ts-contracts`, but many still depend on `ts-shared` | BOM/contracts migration is partial, not complete decoupling |
| Gateway/API security alignment | Generated API contract report currently shows 0 unmatched frontend API client calls, 0 controller routes without gateway prefixes, and 0 legacy `/api/*` security matcher paths; generated OpenAPI payload contract covers 123 active controller operations, 56 source-derived component schemas, parameters, request bodies, and response bodies; ADR-001 accepts Supabase Auth as primary identity provider; production secret validation is source-wired through `MandatoryEnvironmentPostProcessor`; shared exception handling now returns safe public codes with correlation IDs; file-service upload policy now checks MIME, content signatures, active content, and a malware scanner hook before local storage; Gateway sensitive routes have source-level Redis rate-limit wiring; service-role scheduler scripts now write sanitized commit-mode run audits; CI now has source-level dependency, secret, misconfiguration, and container scan gates; source-level observability catalogs cover 12 critical alert/dashboard flows with runbook links | First route/security drift pass is clean; `npm run validate:api-openapi-contract` enforces source-derived OpenAPI operation/schema consistency; `npm run validate:auth-contract` enforces the source-level Supabase/HMAC Gateway contract, exact public-route matching, normalized `ROLE_*` forwarding, sensitive-route rate-limit wiring, and default-disabled backend local credentials; `npm run validate:security-contract` enforces source-level production secret fail-fast behavior, Kubernetes runtime secret wiring, safe public error handling, file upload content/security policy, audited service-role scheduler run wiring, and CI security scan wiring; `npm run validate:observability-contract` enforces source-level alert/dashboard/runbook coverage; Maven execution, runtime Springdoc output, deployed dashboards/Alertmanager, provider-backed antivirus, runtime Redis rate-limit behavior, live scheduler execution, live CI scan execution, and live Supabase token verification remain pending |
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
| `docs/system/README.md`, `docs/frontend/README.md`, `docs/backend/README.md` | Extracted/generated-style system docs with complete architecture and endpoint claims | Historical generated references. Use current source, `docs/API_CONTRACT_MISMATCH_REPORT.md`, and `docs/FEATURES_AND_DASHBOARDS.md` for current behavior. |
| `docs/DATABASE_SHARDING.md`, `docs/OPERATIONAL_RUNBOOK.md` | Citus sharding and older environment runbook content | Proposal/draft material. Production Citus, backups, SLOs, placeholder contacts, and cluster operations are Not verified from the codebase; use `docs/runbooks/INCIDENT_RUNBOOKS.md` for current source-backed incident response. |
| `AGENT_OWNERSHIP.md`, `CLAUDE.md`, `GEMINI.md`, `ISSUES.md` | Historical agent coordination/context and issue-tracker notes | Historical/stale references with outdated environment, ownership, or completion assumptions. Use `../../PLAN.md` and `module-manifest.json` instead. |
| `README.md` | Presents Supabase-first setup and says `SSOT.md` is the master architecture document | Useful onboarding entry, but its documentation map now points readers to this status index first. |

## 4. Current Operating Assumptions

- Treat the active product as a React/Vite web app backed by Supabase for many product workflows, with Spring service modules and API Gateway available for backend-owned or fallback paths.
- Do not assume the backend is fully decoupled: `ts-shared` remains a service dependency in many POMs.
- Do not assume the one-backend rebuild is complete: `apps/backend` is not a complete backend application.
- Do not assume all API paths or payloads are correct from static docs alone: refresh `docs/API_CONTRACT_MISMATCH_REPORT.md` with `npm run report:api-contracts` and `docs/API_OPENAPI_CONTRACT.json` with `npm run report:api-openapi`.
- Treat user-controlled automation as the product standard: automation may draft, rank, prefill, alert, or summarize, but critical workflow changes require explicit user approval.
- Treat local-only and fallback-only state as a product risk when users reasonably expect cross-device continuity or auditability.

## 5. Open Architecture Decisions

| Decision | Why it matters | Recommended next step |
|---|---|---|
| Primary identity provider | Frontend Supabase Auth and backend auth-service local JWT login previously overlapped | ADR-001 accepted Supabase Auth as the primary login/session authority; backend local credentials are disabled by default behind `AUTH_LOCAL_CREDENTIALS_ENABLED`; run live token verification in an integration environment and finish identity bootstrap/retirement decisions |
| Product data ownership | Direct Supabase and Spring services both touch product domains, which complicates security, caching, auditing, and observability | Choose explicit hybrid ownership rules or move toward a backend-owned product API layer |
| Backend topology | Docs previously disagreed between service-module independence and a single-backend rebuild | ADR-002 accepts modular monolith first with extractable service boundaries; define the target package skeleton and migration sequence while active services remain current source evidence |
| Schema authority | Direct frontend table access, duplicate SQL sources, and unresolved live RLS/index statuses complicate safe migrations | ADR-003 accepts migration-first Supabase/Postgres authority; keep the baseline migration, relationship-aware generated DB types, `typedSupabase` boundary, typed Supabase boundary validator, trigger/function insert validation, and legacy disposition matrix synchronized, decompose `supabase-schema.sql` into smaller ordered migrations, migrate/retain/retire `infra/supabase_master.sql` legacy tables, migrate remaining direct services into typed repositories, and validate live RLS/indexes table by table |
| Messaging boundary | `messaging-service` and orphaned `chat-service` previously overlapped | ADR-004 accepts one messaging domain boundary; retire `chat-service` or merge useful realtime adapter code into the messaging domain after authZ/realtime validation |
| Payment mode | Billing UI, frontend Supabase billing functions, backend synthetic payment sessions, and Stripe scaffolding previously implied mixed readiness | ADR-005 accepts explicit demo billing mode; implement provider-backed checkout/webhooks only after signed webhook, idempotency, audit, and runtime provider validation exist |
| Shared dependency migration | `ts-shared` still couples many services | Create a service-by-service dependency removal plan with build verification |
| Pagination strategy | Jobs Explore, Candidates, Messaging conversation lists, Messaging active threads, Header notifications, LMS course catalog/progress tabs, and Admin audit logs now use cursor-backed older-item loading; remaining backend-owned APIs still need formal cursor contracts and total-count metadata where appropriate | Add formal cursor and total-count contracts to backend-owned chat/notification/LMS APIs and any new high-scale lists |
| Observability source | Admin UI still has fallback/mock-style service health in places | Define real service health, trace, log, and incident-link contracts |
| Documentation lifecycle | Docs must stay classified so stale, proposal, generated, and current references are not confused | `module-manifest.json`, top-level `Documentation status:` banners, and `npm run validate:docs-lifecycle` now enforce lifecycle classification; keep them updated with new docs |
| Incident runbook scope | Source-level incident commands and runtime environment runbooks can drift | `docs/runbooks/INCIDENT_RUNBOOKS.md` is current and validated by `npm run validate:runbooks`; runtime cluster/provider runbooks remain draft/unverified until environment evidence exists |
| Observability source | Alert and dashboard coverage can drift from critical flows and runbooks | `infra/observability/alerts/critical-alerts.json`, `infra/observability/dashboards/critical-flows-dashboard.json`, and `npm run validate:observability-contract` enforce source-level coverage; deployed dashboard and alert-manager behavior is Not verified from the codebase |

## 6. Validation Commands

Use this quick validation set after architecture or API-facing changes:

```bash
npm run report:api-contracts
npm run validate:module-manifest
npm run validate:infrastructure-manifest
npm run validate:docs-lifecycle
npm run validate:runbooks
npm run validate:observability-contract
npm run validate:ui-design-system
npm run test:ia
npm run test:a11y
npm run test:keyboard
npm run validate:backend-topology-adr
npm run validate:schema-authority-adr
npm run report:db-types
npm run validate:schema-migrations
npm run validate:typed-supabase-boundary
npm run validate:messaging-boundary-adr
npm run validate:payment-mode-adr
npm run validate:data-ownership
npm run validate:auth-contract
npm run validate:security-contract
npm run report:api-openapi
npm run validate:api-openapi-contract
npm run test:extension-messaging
npm run test:extension-portal-fixtures
npm run test:extension-storage-migrations
npm run test:extension-contract
npm run test:extension-runtime-smoke
npm run lint
npm run test:unit
npm run build
git diff --check
```

Backend validation requires Maven or a wrapper that is not present in the current workspace environment.
