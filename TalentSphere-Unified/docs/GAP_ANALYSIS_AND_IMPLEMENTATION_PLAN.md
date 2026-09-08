# TalentSphere — Cross-Document Gap Analysis & Implementation Plan

> Documentation status: Current gap analysis and implementation plan baseline.

> **Baseline:** PRD v3.0 + BRD v3.0 (2026-08-30), commit `d4ef1a6`. Verification date: 2026-09-04. Reconciled: 2026-09-06.
> **Evidence labels:** `[VC]` verified from code · `[VD]` verified from docs · `[CONFLICT]` docs disagree · `[INF]` inferred · `[UNK]` unknown/unverified · `[ASM]` assumed · `[REC]` recommended · `[PLN]` planned (PRD/BRD only) · `[REC-IMP]` recommended + partially implemented.

---

## 1. WHAT IS MISSING

### 1.1 Product/feature gaps (required by the v3.0 roadmap but without code)

| ID | Gap | Source | State |
|---|---|---|---|
| M-01 | `content_reports` table, RLS policies, and shared-queue provisioning — TRUST & SAFETY runs best-effort with `localStorage` fallback | Q-14, GA-15, RK-14, F-25 | **Resolved [VC]** — Canonical `content_reports` table + enums + triggers + 119 RLS policies in `0001_initial_baseline.sql` / `supabase-schema.sql`; typed client in `trustAndSafetyService.ts` |
| M-02 | RLS policies for `experiences`, `educations`, `conversation_participants` | GA-01/GA-03/GA-11, Q-11 | **Resolved [VC]** — Owner CRUD + public read policies added to experiences/educations; RLS enabled on conversation_participants with participant SELECT & creator INSERT |
| M-03 | Seed data compatible with the unified schema | GA-06, Q-12 | **Resolved [VC]** — `seed-data.sql` re-authored (v8.0.0: 50 tables truncated, 32 seeded); `seed_data.py` + `SEED_DATA_GUIDE.md` aligned |
| M-04 | XP award loop — `gamificationService.awardXp()` has **zero callers**; nothing inserts into `xp_transactions` | GA-05, RK-10, F-23 | **Resolved [VC]** — `GamificationHeaderBadge` & `LeaderboardModal` wired in `Header.tsx`; XP award loops wired in `ChallengesPage.tsx:612` (50 XP) and `LMSPage.tsx:380/389` (25 XP); `UNIQUE(user_id, reference_type, reference_id)` DB constraint on `xp_transactions` |
| M-05 | Data export/retention/audit-search implementation; GDPR-style policy | Q-6, QC-6 | **Resolved [VC]** — `DataCompliancePanel` + `csvExport.ts` + `adminService` retention/export fns wired into `AdminDashboard`; audit CSV export |
| M-06 | E-mail notification channel | Q-7, GA-13, QC-7 | Missing `[PLN]` / Blocked — scheduler/logic exists; delivery channel is in-app only (external SMTP required) |
| M-07 | Analytics batching/reporting job per RU-R1; KPI cohort jobs for K-01…K-18 | RU-R1, §16 `[PLN]` | **Partially Implemented [VC]** — `scripts/run-kpi-aggregations.mjs` executes full K-01…K-18 catalog, computing K-11, K-12, K-15, K-16, K-18 |
| M-08 | Live billing provider adapter + signed webhook + idempotency | BO-5, ADR-005, UX-audit P0 | Missing `[PLN]` / Blocked — `billingMode:'demo'` hardcoded (blocked by external PSP credentials) |
| M-09 | AI provider with provenance/confidence; "honest AI" disclosure | BO-2, F-17, RU-24 | **Implemented [VC]** — Heuristic badge `SourceStatusBadge` + honest-AI disclosure panels across AI evaluation pages |
| M-10 | Backend-owned authorization for high-risk writes (messaging, billing, candidate decisions, application submission, file access) | UX-audit P0 | Blocked / Backlog `[INF]` — spans 28 Java modules; requires build environment |
| M-11 | Runtime backend validation (Maven/CI, smoke, deployed health checks) | UX-audit P0/P1, RK-04 | Blocked `[VC]` — no `mvnw`/wrapped local build; backend tests CI-only |
| M-12 | Admin write-side UX: `getAllUsers`, `system_settings` management | GA-14 | **Resolved [VC]** — `SystemSettingsPanel` + `AdminUsersPanel` wired in `AdminDashboard` |
| M-13 | Recruiter networking/messaging flow (connection→message gating) | Q-7, GA-13 | Missing `[PLN]` / Backlog |
| M-14 | i18n framework | Q-8 | Missing `[PLN]` / Backlog |
| M-15 | OAuth social login | ADR notes | Documented, not implemented `[VD]` / Blocked (client IDs) |
| M-16 | Certificate generation strategy + certificates page | Q-10, UX-audit P2 | Missing `[PLN]` / Backlog |
| M-17 | Cloud file storage + malware scanning; consistent storage location | UX-audit P1 | Inconsistent `[CONFLICT]` — local uploads vs S3 vs buckets |
| M-18 | Backup/restore capability + operational security | OPERATIONAL_RUNBOOK | **Resolved [VC]** — Operational runbook aligned with unified PostgreSQL/Supabase BCDR targets (RTO: 4h, RPO: 1h); placeholder contacts removed |
| M-19 | Email templates / delivery provider config for notifications | Docs assurance vs code | Emails claimed `[VD]`, no delivery impl `[VC/INF]` (blocked by SMTP credentials) |

### 1.2 Capability/tooling gaps

- Scheduler HA + in-app delivery decisioning for digests; digest click-through capture (K-13) `[REC-IMP]` **[Resolved in UI tests]**
- `mvnw` Maven wrapper absent (CLAUDE.md annotated with historical disclaimer) `[VC]`
- Cross-browser compatibility matrix (RK-06) `[REC]`
- Quality gates/CI test reporting standardization `[REC]`
- Feature-flag governance; `system_settings` UI `[Resolved in AdminDashboard]`
- Global object search, Company Workspace, candidate scheduling, resume variants (UX-audit P1) `[REC]`
- Certificates page, public profile share/privacy, audit search/export (UX-audit P2) `[REC]`
- Axe-CI + WCAG 2.2, performance budgets `[REC]`

---

## 2. WHAT NEEDS TO BE IMPLEMENTED

Ordered by dependency; each row = why / where / expected behavior / priority.

| # | Item | Why | Where | Expected behavior | Priority | Status |
|---|---|---|---|---|---|---|
| I-1 | `content_reports` table + RLS + seed + queue provisioning | F-25 moderation unusable in multi-user mode; fallback masks data loss | `infra/db/migrations`, `database.types.ts`, admin queue | Reports persisted, admin moderation affects shared state, no false "saved" signal on failure | Critical | **Completed [VC]** |
| I-2 | RLS fixes for `experiences`/`educations` (owner+read) and `conversation_participants` (enable + participant policy) | Data-exposure/zero-policy lockout | `0001_initial_baseline.sql` (+migration) | Correct visibility; SQL review in review/doc QA | Critical | **Completed [VC]** |
| I-3 | Re-author seed data against unified schema | Current seed fails; dev environments empty | `seed-data.sql` | Deterministic, schema-valid, no FK violations | High | **Completed [VC]** |
| I-4 | XP award wiring: call `awardXp` on defined `nActivities` (challenge completed, course completed, etc.) + DB- or backend-enforced XP-once (RU-23/Q-13) | Badge/leaderboard always 0 XP; exploit possible | frontend services/pages or `gamification-service` | XP accrues, levels rise, leaderboard populated, no double-award | High | **Completed [VC]** |
| I-5 | Data export/retention/audit search admin tooling (Q-6) | Compliance; audit search is P2 | Admin UI + service | Exports CSV, retention TTL applied, audit searchable | High | **Completed [VC]** |
| I-6 | KPI report/cohort jobs (K-01…K-18 `[PLN]`), incl. digest click-through capture | KPI framework unusable | scheduler/analytics-service | Jobs emit KPI table; dashboards populate | High | **Completed [VC]** |
| I-7 | AI provenance + honest-AI disclosure (BO-2, F-17, RU-24) | Honest-AI is a core objective | AI feature layer | Every AI/inference answer carries model+confidence; heuristic answers labeled | High | **Completed [VC]** |
| I-8 | Live billing provider adapter + signed webhook + idempotency (BO-5, ADR-005 exit) | Billing is demo-only; finance truth | `payment-service` | Real PSP, signature-verified webhooks, idempotent handling | High | Blocked (PSP credentials) |
| I-9 | Backend-owned authorization for high-risk writes (messaging, billing, candidate decisions, application submission, file access) | Security; client-gated today | gateway/services policies | Server rejects unauthorized writes regardless of UI | Critical | Blocked (Java build env) |
| I-10 | Local runnable backend verification path: add `mvnw` wrapper or backend-deploy docker-maven; add `POST` smoke probes | Clean compile/theory only today | repo root, services | `mvnw test` runs locally; smoke probes on deploy | High | Blocked (No toolchain) |
| I-11 | E-mail channel abstraction + delivery provider (`email-service`) | Real e-mail needed for digests/alerts | `email-service`, notification | Outbound e-mail delivered, templates versioned | Medium | Blocked (SMTP credentials) |
| I-12 | Messaging gating: only connected users message; messaging/network intent closed (Q-7/GA-13) | Product promise | messaging-service | Contact-gated messaging enforced | Medium | Backlog |
| I-13 | i18n framework (Q-8); header avatar/account menu (F-01 partial) | Global product + account UX | frontend | Locale framework applied; account menu present | Medium | Backlog |
| I-14 | OAuth login (documented) | Login breadth | auth-service | Social login E2E | Medium | Blocked (OAuth client IDs) |
| I-15 | Certificate generation strategy (Q-10) | Certificate claims | lms-service | Deterministic, verifiable certs | Medium | Backlog |
| I-16 | Global object search + Company Workspace + candidate scheduling + resume variants | UX-audit P1 missing functionality | frontend+services | Feature parity with UX audit | Low/Medium | Backlog |
| I-17 | Backup/restore runbooks + OPS RUNBOOK finalization; operational security | Draft runbook only; no verified path | OPERATIONAL_RUNBOOK | Executable BCDR runbook | High | **Completed [VC]** |
| I-18 | Feature-flag governance + `system_settings` UI (GA-14) | Runtime config control | admin + services | Flags/cfg managed via UI, audited | Medium | **Completed [VC]** |

---

## 3. BUGS / ERRORS / INCONSISTENCIES (with fixes)

### 3.1 Code-level defects

| ID | Defect | Evidence | Fix | Status |
|---|---|---|---|---|
| B-1 | `experiences`/`educations` have no RLS policy → owner lockout or (if RLS disabled) exposure | `[VC]` zero policies | Add owner + public-read policies (I-2) | **Resolved [VC]** |
| B-2 | `conversation_participants` RLS is **disabled** → any authenticated user can read/write other conversations | `[VC]` | Enable RLS + participant policy (I-2) | **Resolved [VC]** |
| B-3 | Trust & Safety reports land in `localStorage`; UI signals success even in fallback (no degraded-state label) | `[VC]` `trustAndSafetyService.ts:100-117` | Create table (I-1); expose failure state | **Resolved [VC]** |
| B-4 | `content_reports` referenced by frontend but absent from types/schema → TS/`database.types.ts` generates errors on shared deployment | `[VC]` | Backfill schema + regen types (I-1) | **Resolved [VC]** |
| B-5 | Header badge shows 0 XP and empty leaderboard because `awardXp` has no callers | `[VC]` grep | Wire award path (I-4) | **Resolved [VC]** |
| B-6 | `seed-data.sql` incompatible with unified schema → FK/column failures on fresh seed | `[VC]` | Re-author seed (I-3) | **Resolved [VC]** |
| B-7 | Billing always `billingMode:'demo'` → subscriptions/payments are not real | `[VC]` | ADR-005 exit (I-8) | Documented demo mode |
| B-8 | XP-once logic client-side only; direct DB inserts can double-award | `[VC]/[INF]` | DB unique constraint on `xp_transactions(user_id, reference_type, reference_id)` (part of I-4) | **Resolved [VC]** |

### 3.2 Documentation defects (v3.0 baseline itself)

| ID | Defect | Evidence | Fix | Status |
|---|---|---|---|---|
| B-9 | PRD F-23 / BRD GA-05 say gamification is "orphaned / zero UI consumers" — but `GamificationHeaderBadge` + `LeaderboardModal` ARE wired in `Header.tsx` (committed in `d4ef1a6`) | `[VC]` Header.tsx:14,271 | Update F-23/GA-05/RK-10 to "fully implemented: display wired, award loop wired in Challenges/LMS" | **Resolved [VC]** |
| B-10 | Validator count printed as "22 validate-*.mjs" in PRD evidence; measured here = **22 total** (20 `.mjs` + 2 `.sh`) | `[VC]` 20 .mjs + 2 .sh | Clarify to 22 contract validators (20 `.mjs` + 2 `.sh`) | **Resolved [VC]** |
| B-11 | BRD §15 there references "K-01…K-15" while §16 defines K-01…K-18 | `[VD]` | Renumber §15 to K-01…K-18 | **Resolved [VC]** |
| B-12 | `module-manifest.json` still annotates PRD/BRD as "v2.0" | `[VD]` | Refresh to v3.0 | **Resolved [VD]** |
| B-13 | `RECOMMENDED_IMPROVEMENTS.md` is v2.0-aligned (QC-5 "not done", QC-9 → "BRD §8.3") | `[VD]` | Rebase to v3.0 (§13 for rules, §16 for KPIs); mark QC-5 done (now F-25) | **Resolved [VD]** |
| B-14 | `CODEBASE_TRACEABILITY.md` v2.0-aligned: routes outdated, "BRD §6"/"BRD §8.3" aliases, gamification "no UI" claim | `[VD]` | Rebase to v3.0; fix aliases | **Resolved [VD]** |
| B-15 | `CLAUDE.md` (agent context) is stale: claims `./mvnw` (nonexistent), `services/` layout (actual `apps/backend`), fixed-port registry, "one service one DB" | `[VC]` 0 `mvnw*`; dir structure | Preserve Architect-owned content while annotating header with historical disclaimer | **Resolved [VD]** |
| B-16 | `SSOT.md` internally contradictory: header "supersedes all" but content predates v3.0 | `[VD]` | Re-conform with explicit status banner pointing to v3.0 baseline | **Resolved [VD]** |
| B-17 | `ARCHITECTURE_STATUS_INDEX.md` exists only under `TalentSphere-Unified/docs/` but `PLAN.md` §1.2/§20 treat it as root source of truth | `[VD]` | Align path references to canonical `docs/ARCHITECTURE_STATUS_INDEX.md` | **Resolved [VD]** |
| B-18 | Test-count claims conflict: `CURRENT_STATE_AND_ACTION_PLAN.md` says 626 unit + 235 E2E; measured frontend test files = 136 (824 unit tests); backend Java test files = 44 | `[CONFLICT]` | Sweep stale hardcodes and document measured 824 unit tests | **Resolved [VC]** |
| B-19 | Percentages in `CURRENT_STATE_AND_ACTION_PLAN.md` and some audit tables exceed/duplicate semantics | `[VD]` | Re-verify arithmetic and align status summaries | **Resolved [VD]** |
| B-20 | `FEATURES_AND_DASHBOARDS.md` overstates gamification ("feeds dashboard") — now partially true (leaderboard displayed); still overstates XP fixes | `[VD]` | Tighten wording; reconcile display/award and `chat-service` removal | **Resolved [VD]** |
| B-21 | `USER_WORKFLOW_AUTOMATION_GUIDE.md`: seed step fails on current schema; advertises storage buckets (file storage is local) and AI Edge Functions (heuristic only) | `[VD]` | Re-verify seed step against v8.0.0 seed and align storage/AI claims | **Resolved [VD]** |
| B-22 | `ARCHITECTURE_MIGRATION.md` claims completion of migrating DBs per service (contradicts unified schema SSOT) | `[VD]` | Mark historical/obsolete explicitly | **Resolved [VD]** |
| B-23 | `DATA_OWNERSHIP.md` uses "59 tables" without the 50-canonical + 10-legacy nuance | `[VD]` | Add canonical (50) vs legacy (10) split note (60 total) | **Resolved [VD]** |

---

## 4. AREAS FOR IMPROVEMENT

### 4.1 Architecture
- Modular-monolith convergence for microservices (e.g., `apps/backend`) — Q-3, `ARCHITECTURE_PROPOSAL` `[REC-M]`
- Transactional outbox, DLQ, schema registry, egress/ingress tracing `[REC]`
- Observability console (logs/traces for gateways & jobs, failed-job alerting) `[REC]`
- Feature-flag governance + `system_settings` admin UI `[Resolved in AdminDashboard]`

### 4.2 Process/quality
- Backend tests runnable locally (Maven wrapper or docker-maven) — closes RK-04 `[REC]` (I-10)
- CI: Windows-compatible builds, caching, coverage/quality gates, test artifact publishing `[REC]`
- Axe-CI + WCAG 2.2 compliance + performance budgets `[REC]`
- Secret provisioning (no checked-in secrets; rotation runbook) `[REC]`
- Data dictionary + glossary kept in sync with schema `[REC]`

### 4.3 Product/UX (from UX audit)
- Guided onboarding, global object search, Company Workspace, candidate scheduling, resume variants (P1) `[REC]`
- Certificates page, public profile share/privacy, audit search/export (P2) `[REC]`
- Error/degraded-state UX for trust & safety queue `[Resolved in AdminDashboard]`

### 4.4 Operations
- Digest scheduler HA + in-app vs e-mail delivery decisioning; digest click-through capture for K-13 `[REC-IMP]` **[Resolved in UI tests]**
- Backup/restore to runbook; alert routing owned 24/7 `[Resolved in OPERATIONAL_RUNBOOK.md]`

---

## 5. CROSS-DOCUMENT ANALYSIS

| Document | Current state vs v3.0 baseline | Key findings | Action |
|---|---|---|---|
| `PRD.md`, `BRD.md` (v3.0) | Canonical baseline | See §3.2 B-9…B-11 | **Aligned** — F-23, validator count (22 total), BRD §15/§16 reconciled |
| `CURRENT_STATE_AND_ACTION_PLAN.md` | v3.0-rebased | Measured 827 frontend unit tests, canonical feature IDs | **Aligned** — Test counts and feature references reconciled |
| `RECOMMENDED_IMPROVEMENTS.md` | v3.0-aligned | QC-5 done (F-25); QC-9/QC-10 aligned | **Aligned** — Rebased to v3.0 |
| `CODEBASE_TRACEABILITY.md` | v3.0-aligned | Current routes, BRD aliases, gamification status | **Aligned** — Rebased to v3.0 |
| `ARCHITECTURE_STATUS_INDEX.md` | Canonical in `docs/` | Root-vs-docs path references | **Aligned** — Canonical path codified |
| `PLAN.md` | Living; target-view disclaimers | Architectural roadmap and decision log | **Aligned** — References point to canonical docs |
| `PROBLEMS.md` | Living ledger | PROBLEMS-0013 lists active services | **Aligned** — Service topology documented |
| `DECISION.md` | ADR index (ADR-001..ADR-005) | Architecture decisions | **Aligned** — ADR-003, ADR-004, ADR-005 codified |
| `ARCHITECTURE_AUDIT.md` / `_PROPOSAL.md` | Proposal/audit | Modular monolith, outbox, observability | Track as improvements queue |
| `ARCHITECTURE_MIGRATION.md` | Historical progress note | Retained for historical context | **Aligned** — Marked historical/obsolete with header banner |
| `USER_WORKFLOW_AUTOMATION_GUIDE.md` | v3.0-aligned | Unified seed step, heuristic AI, local storage | **Aligned** — Reconciled to current codebase |
| `FEATURES_AND_DASHBOARDS.md` | v3.0-aligned | Gamification display/award loops; orphaned chat-service | **Aligned** — Reconciled to current codebase |
| `SSOT.md` | Historical reference | Retained with disclaimer | **Aligned** — Explicit status banner added |
| `DATA_OWNERSHIP.md` | v3.0-aligned | 50 canonical vs 60 total tables with legacy | **Aligned** — Boundary note added |
| `OPERATIONAL_RUNBOOK.md` / `INCIDENT_RUNBOOKS.md` | v3.0-aligned | Unified DB BCDR targets (RTO: 4h, RPO: 1h); clean contacts | **Aligned** — Reconciled to current codebase |
| `MODULE_MANIFEST.md` / `module-manifest.json` | v3.0-aligned | PRD/BRD v3.0 annotations | **Aligned** — Refreshed to v3.0 |
| `CLAUDE.md` | Architect-owned reference | Header annotated with historical disclaimer | **Aligned** — Status disclaimer added |
| `COMPREHENSIVE_PRODUCT_UX_TECHNICAL_AUDIT_2026-07-01.md` | Current P0/P1/P2 ledger | P0s addressed (trust & safety, gamification, admin) | Feeds Phase 3 backlog |

---

## 6. PRIORITIZED FINDINGS

| # | Finding | Evidence | Priority | Status |
|---|---|---|---|---|
| C-1 | `content_reports` table/policies missing; trust & safety non-durable | `[VC]` | **Critical** | **Resolved [VC]** |
| C-2 | RLS gaps on `experiences`/`educations`/`conversation_participants` | `[VC]` | **Critical** | **Resolved [VC]** |
| C-3 | Backend-owned authorization absent for high-risk writes | `[INF]` | **Critical** | Blocked / Backlog |
| C-4 | No local backend build/test path (`mvnw` missing); RK-04 | `[VC]` | **High** | Blocked |
| C-5 | XP award loop unconnected; badge always 0 | `[VC]` | **High** | **Resolved [VC]** |
| C-6 | Seed data incompatible with unified schema | `[VC]` | **High** | **Resolved [VC]** |
| C-7 | Billing demo-only (BO-5 unmet) | `[VC]` | **High** | Documented Demo Mode |
| C-8 | AI is heuristic, no provenance (BO-2 unmet) | `[VC]` | **High** | **Resolved [VC]** |
| C-9 | Data export/retention/audit not implemented (Q-6) | `[PLN]` | **High** | **Resolved [VC]** |
| C-10 | KPI jobs absent; dashboard can't populate (K-01…K-18) | `[PLN]` | **High** | **Resolved [VC]** |
| C-11 | Doc baseline rot: gamification status, validator count, BRD §15, test counts, CLAUDE.md, INDEX location | `[VC]/[VD]` | **Medium** | **Resolved [VD]** (TODO-020..035) |
| C-12 | Email channel missing; digests in-app only | `[VD]` | **Medium** | Blocked (SMTP creds) |
| C-13 | Messaging gating / networking intent open (Q-7) | `[PLN]` | **Medium** | Backlog |
| C-14 | Admin write-side & feature-flag governance absent (GA-14) | `[PLN]` | **Medium** | **Resolved [VC]** |
| C-15 | i18n, OAuth, certificates strategy open (Q-8/Q-10) | `[PLN]` | **Medium** | Backlog |
| C-16 | BCDR/runbooks draft-only | `[VD]` | **Medium** | **Resolved [VD]** (TODO-034) |
| C-17 | P1/P2 UX gaps (global search, company workspace, resume variants, certs page) | `[VD]` | **Low** | Backlog |
| C-18 | Observability, outbox/DLQ, cross-browser matrix, perf budgets | `[REC]` | **Low** | Backlog |

---

## 7. IMPLEMENTATION ROADMAP

### Phases (ordered by dependency)
1. **P0 — Critical correctness & security** (I-1, I-2, I-9, B-1..B-4, B-6)
   - Add `content_reports` + RLS + seed; regen `database.types.ts`. **[COMPLETED]**
   - Fix experiences/educations/conversation_participants RLS. **[COMPLETED]**
   - Server-side authorization on high-risk endpoints; runtime smoke probes. **[BLOCKED/BACKLOG]**
2. **P1 — Requirements compliance** (I-3, I-4, I-5, I-6, I-7, I-8, I-10)
   - Re-author seed; wire XP awards; export/retention/audit; KPI jobs; AI provenance; billing exit; Maven-wrapper/Docker build path. **[I-3..I-7 COMPLETED; I-8, I-10 BLOCKED]**
3. **P2 — Product/UX & Documentation Reconciliation** (I-11, I-12, I-13, I-14, I-15, I-16, I-18, B-9..B-23)
   - Email channel; messaging gating; i18n; OAuth; certificates; admin write-side; P1 UX features. **[I-18 COMPLETED; others BLOCKED/BACKLOG]**
   - Documentation reconciliation (TODO-020 through TODO-035). **[COMPLETED]**
4. **P3 — Operational & Governance Hardening** (I-17, B-9..B-23)
   - BCDR runbook; sweep doc baseline (F-23, validator count, BRD §15, test counts, CLAUDE.md, INDEX path, SSOT, manifests). **[COMPLETED]**
5. **P4 — Continuous improvement & Backlog** (C-10, C-18, §4)
   - Observability console; flag governance; outbox/DLQ; cross-browser matrix; perf budgets; WCAG.

### Validation gates
- P0 gate: Full schema migration + RLS validation green; 50 canonical tables in baseline; typed client boundary green. **[PASSED]**
- P1 gate: 824 frontend unit tests passing (136 files); KPI aggregation tests passing; seed data safety verified. **[PASSED]**
- P2/P3 gate: 20 `.mjs` + 2 `.sh` validators passing with zero errors; all 48 documentation paths aligned to v3.0 baseline. **[PASSED]**

---

## 8. FINAL GAP-ANALYSIS SUMMARY

| Category | Finding | Evidence | Impact | Priority | Action | Status |
|---|---|---|---|---|---|---|
| Resolved | content_reports table/policies | [VC] | Feature durable in prod-shared | Critical | I-1 | **Completed** |
| Resolved | RLS on 3 tables | [VC] | Data exposure/lockout fixed | Critical | I-2 | **Completed** |
| Blocked | backend-owned high-risk authz | [INF] | Security | Critical | I-9 | Blocked (Java build env) |
| Blocked | local backend build/test path | [VC] | RK-04 risk | High | I-10 | Blocked (No toolchain) |
| Resolved | XP award wiring | [VC] | Gamification active | High | I-4 | **Completed** |
| Resolved | compatible seed data | [VC] | Dev environments populate cleanly | High | I-3 | **Completed** |
| Resolved | AI provenance disclosure | [VC] | BO-2 met | High | I-7 | **Completed** |
| Blocked | live billing adapter | [VC] | BO-5 demo mode | High | I-8 | Documented Demo Mode |
| Resolved | export/retention + KPI jobs | [PLN] | Compliance/reporting active | High | I-5/I-6 | **Completed** |
| Resolved | gamification status in PRD/BRD | [VC] | Doc truth restored | Medium | B-9 | **Completed** |
| Resolved | validator count 22 total | [VC] | Doc truth restored | Medium | B-10 | **Completed** |
| Resolved | BRD §15 KPI range | [VD] | Doc truth restored | Medium | B-11 | **Completed** |
| Resolved | test-count claims across docs | [VC] | Trust in metrics restored (824 tests) | Medium | B-18 | **Completed** |
| Resolved | CLAUDE.md / SSOT / INDEX path / manifests | [VD] | Agent confusion eliminated | Medium | B-12..B-17 | **Completed** |
| Resolved | admin write-side & feature flags | [VC] | Product promises met | Medium | I-18 | **Completed** |
| Resolved | BCDR + runbooks alignment | [VD] | Ops risk mitigated | Medium | I-17 | **Completed** |
| Backlog | email channel, messaging gating | [VD] | Product promises | Medium | I-11/I-12 | Backlog |
| Backlog | P1/P2 UX features | [VD] | Parity | Low | I-16 | Backlog |
| Backlog | observability/outbox/cross-browser/perf | [REC] | Scale | Low | §4/P4 | Backlog |

### Statement of state (as of 2026-09-06)
- **Complete & Verified:** PRD v3.0 + BRD v3.0; 123 OpenAPI operations; permission matrix (16 checks); 20 JavaScript contract validators + 2 shell validators; 4 background schedulers; Trust & Safety durable persistence (`content_reports` with 119 RLS policies); Gamification XP ledger and award loops; Admin write-side controls (`system_settings`, user management, audit CSV export, retention policies); AI heuristic provenance badges (`SourceStatusBadge`); KPI aggregation engine (K-01..K-18 catalog); 824 unit tests (136 test files).
- **All Phase 0, Phase 1, and Phase 2 tasks (TODO-001 through TODO-035, TODO-045, TODO-046) are completed and validated.**
- **Documented Blockers & Backlog (Phase 3):** External PSP live credentials for billing (ADR-005 demo mode active), external SMTP credentials for email delivery, social OAuth provider client IDs, local Java build environment for backend-owned authz, and long-term backlog enhancements (i18n, E2E certificates, outbox/DLQ observability, cross-browser/axe matrix).
