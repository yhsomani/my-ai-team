# TalentSphere — Business Requirements Document (BRD)

> **Version 3.0 — Canonical Reconstructed Baseline**
> Date: 2026-08-30
> Authority: Reconstructed from the same bidirectional repository analysis as [PRD v3.0](./PRD.md); business statements are tagged with the same evidence labels and may not overclaim beyond what the product verifiably does. This document supersedes BRD v2.0. Feature-level requirement detail lives in the PRD; this document answers *why* the business exists, what it must not promise, and how it runs.

| | |
|---|---|
| **Version** | 3.0 — Canonical Reconstructed Baseline |
| **Date** | 2026-08-30 |
| **Companions** | [PRD](./PRD.md) · [Codebase Traceability & Gap Analysis](./CODEBASE_TRACEABILITY.md) · [Data Ownership](./DATA_OWNERSHIP.md) · ADRs 001–005 |

> **Legacy cross-reference aliases:** BRD v2.0 "§6" (business rules) → v3.0 **§13** · BRD v2.0 "§8.3" (KPI framework K-01…K-15) → v3.0 **§16**. References in `CODEBASE_TRACEABILITY.md` §4/§7 and `RECOMMENDED_IMPROVEMENTS.md` (QC-9) resolve through these aliases.

---

## 0. Methodology & Evidence Labels

### 0.1 How this document was produced

Same evidence set and bidirectional method as PRD v3.0 §0.1 (implementation → documentation and documentation → implementation). Business requirements in §5 and business rules in §13 are stated **only where an enforcement point or behavioral contract exists** in the codebase, unless explicitly labeled [PLN]/[REC]/[ASM]/[UNK].

### 0.2 Evidence labels (identical to PRD §0.2)

| Label | Meaning |
|---|---|
| **[VC]** | Verified from Codebase — behavior confirmed by reading source and/or tests |
| **[VD]** | Verified from Documentation — stated in authoritative docs (PLAN.md, ADRs, living docs) |
| **[CONFLICT]** | Sources contradict; resolution and residual uncertainty are stated inline |
| **[INF]** | Inferred — strong structural evidence; end-to-end behavior not fully traced |
| **[UNK]** | Unknown — evidence insufficient; requires confirmation before relying on it |
| **[ASM]** | Assumption — reasonable business assumption, unverified |
| **[REC]** | Recommendation — proposed improvement, not current behavior |
| **[PLN]** | Planned — documented intent, not built |

### 0.3 Business-implementation status values (used throughout)

**Implemented** · **Partially Implemented (by design)** · **Documented but Not Implemented** · **Implemented but Not Documented** · **Implemented Differently** · **Orphaned (no consumer)** · **Planned / Future** · **Unclear** — same semantics as PRD §0.3. A business claim may be *achievable* while its *engine* is only partly built; each status marks the business capability, not the code artifact.

---

## 1. Business Overview

### 1.1 Purpose of this document

Define *why* TalentSphere exists as a business: business context, stakeholders and their responsibilities, stakeholder-level requirements, binding business rules, as-operated business processes, commercial posture, compliance duties, risk exposure, success criteria, and the business view of every implementation gap — each tagged with its **real** implementation status so leadership can distinguish shipped capability from aspiration.

### 1.2 Business context [VC]

TalentSphere is an AI-assisted, all-in-one career platform ("LinkedIn + Coursera + HackerRank, powered by AI" [VC — `apps/frontend/index.html`]) serving three authenticated roles (candidate `USER`, recruiter `RECRUITER`, administrator `ADMIN`) plus anonymous visitors and a local-first Chrome companion. It unifies job discovery and application, learning (LMS), skill practice (challenges), networking, messaging, notifications, resume tooling, and review-gated AI assistance in a single web SPA over a Supabase-first data plane, with a secondary Spring Boot service layer and an explicitly local Chrome extension.

Two commercial facts anchor every business decision:

1. **Billing is demo-mode by design** (ADR-005). Plan/payment surfaces, Stripe Edge-Function scaffolds, and payment ledger tables exist end-to-end, but **no live charge path is callable** and every billing surface must be labeled demo. [VC]
2. **The AI is heuristic, not a live LLM.** All AI outputs (resume analysis, match scores, career paths, chat, automation suggestions) are produced by local rule-based logic and are explicitly review-gated; nothing mutates user data without an explicit save action. Marketing or sales copy implying a live language model would be inaccurate. [VC]

### 1.3 Vision / Mission / Operating values

- **Vision:** the trusted career operating system where every AI output is reviewable, every failure degrades gracefully, and candidates own their data. [VD — PLAN.md; partially enforced in code, see PRD §14]
- **Mission:** unify job discovery, learning, practice, networking, and career tooling with honest, review-gated assistance. [VD/ASM]
- **Operating values (enforced in code patterns [VC]):** honesty over hype · user owns data · review-before-mutate · graceful degradation · evidence-based claims. These map to concrete product contracts: no fabricated stats (PRD F-02), no silent autonomous AI writes (PRD F-12), no raw provider errors (PRD F-24), labeled fallback on every remote-backed surface (PRD F-24).

---

## 2. Current-State (As-Is) Business Analysis

| Dimension | Verified reality |
|---|---|
| Product maturity | Core candidate + recruiter + admin surfaces shipped and tested: ~126 Vitest files / ~736 unit tests, ~28 Playwright E2E/a11y/UX specs (~114 cases), ~40 backend test files (CI-only), 7 extension contract/UX suites. [VC] Counts differ across docs (`CURRENT_STATE_AND_ACTION_PLAN.md` claims 626 unit + 235 E2E) — counting methodology UNK. [CONFLICT] |
| Feature reach | PRD features F-01…F-25; 24 of 25 complete or substantial, billing demo-by-design (F-17), gamification orphaned (F-23). Traceability: PRD §21. [VC] |
| Architecture | Supabase-first SPA (auth, Postgres + RLS, Realtime, Edge Functions) with a secondary Spring Boot layer (26 Maven reactor modules; 123 OpenAPI operations behind gateway :8080). Hybrid fetch with labeled degradation throughout. [VC] |
| AI posture | Local heuristics only; provenance metadata; draft/saved/dismissed review lifecycle. No live LLM. [VC] |
| Monetization | Demo mode (ADR-005); `billingMode:'demo'` exported; no revenue. [VC] |
| Operations | Three external Node scheduler scripts (notification digests, saved-search discovery, networking reminders) + audit wrapper; admin automation-status panel mirrors them. [VC] |
| Distribution | Web SPA + MV3 Chrome extension (local-only, contract-tested; not store-distributed). [VC] |
| Data foundation | 49 canonical tables (59 incl. legacy-master-only), 110 RLS policies, 12 enums, 28 triggers, 5 functions; single schema authority (`infra/db/migrations/0001_initial_baseline.sql`). [VC] |
| Documentation debt | Significant in both directions: shipped-but-undocumented (F-06, F-21, posting templates, bulk actions) and documented-but-absent (feed authoring, video calls, certificates, i18n, OAuth). Ledger: PRD §22 / BRD §19. [VC] |
| Known business liabilities | Live-credential-free AI may under-deliver vs marketing; external schedulers = ops SPOF; `experiences`/`educations` RLS no-policy lockout; `conversation_participants` RLS off; seed corpus incompatible with the unified schema; no hard-delete/export policy. [VC] |

---

## 3. Stakeholders & Segments

| Stakeholder | Type | Interest | Engagement surface |
|---|---|---|---|
| Candidates (`USER`) | Primary customer | Find work, grow skills/network, strengthen profile | Jobs, Applications, LMS, Challenges, Networking, Messaging, Notifications, Resume, Profile, AI |
| Recruiters (`RECRUITER`) | Supply-side customer | Publish jobs; source and manage candidate pipelines | Post-a-Job Studio, Candidates (notes/scorecards/bulk/interview planner), Jobs, Dashboard variant |
| Admins (`ADMIN`) | Internal operator | Platform health, safety, insight | Admin console (stats, observability link grid, automation status, audit log browser, analytics insights) |
| Anonymous visitors | Prospect | Evaluate the platform | Landing (live stats), Login, Register, Password Reset |
| Extension users | Power segment | Frictionless capture across job boards | LinkedIn/Indeed/Glassdoor scrape → strictly local drafts/tracker/prep |
| Platform Ops | Internal | Scheduler reliability, runbooks | `scripts/*.mjs`, `scheduler-audit.mjs`, audit_log, system_settings (table only) |
| Payment provider (Stripe) | Vendor | Dormant until ADR-005 exit | Scaffolded Edge Functions; no live calls [VC] |
| Content/seed operators | Internal | Safe local environment data | Token-gated `seed-data.sql` lifecycle (RU-23) |

Personas (from PRD §3.3): **P-A Candidate** ("Aisha") · **P-B Recruiter** ("Rohan") · **P-C Administrator** ("Priya") · **P-D Extension power-user** ("Dev"). Journeys J-1…J-9 are defined in PRD §9; business processes map to them in §8 below.

---

## 4. Business Objectives & Success Criteria

Every objective is tagged with whether the *business outcome* is currently achievable. "Success criterion" gives the measurable definition; "Status" states the evidence.

| # | Business objective | Success criterion | Status |
|---|---|---|---|
| BO-1 | Unify fragmented career workflows into one product | All primary journeys (discover→apply, learn, practice, network, message, AI-assist) completable in-product without third-party tools | Achieved for J-1…J-9 [VC]; certificate step absent, social feed absent by design |
| BO-2 | Deliver honest AI now, with a live-LM path later | Today: 100% of AI outputs review-gated with no autonomous mutation. Future: live LLM provider behind the existing provenance/review contracts | Engine = heuristic, achieved for honesty [VC]; live provider **[PLN]** (PRD §25; engine honesty must not be overclaimed in copy [REC]) |
| BO-3 | Ship resilient UX that survives partial failure | Every remote-backed surface has labeled degradation; no silent fake data | Achieved [VC] (landing live-stats precedent; partial-dashboard pattern) |
| BO-4 | Build two-sided marketplace liquidity | Recruiter posting volume ↔ candidate application conversion | Instrumented candidates (events); K-04/K-05 not computed [PLN] |
| BO-5 | Monetize via subscriptions when market fit proven | ADR-005 exit criteria met → live Stripe with labeled pricing | **Blocked by design** [VC] (demo mode) |
| BO-6 | Keep the platform auditable and safe | RLS on all private data; audit trail for sensitive actions; audited scheduler runs | Achieved for audited surface (110 policies, audit_log + admin UI, scheduler audit) [VC]; RLS gaps in §19 need closure |
| BO-7 | Grow engaged learning/practice habits | Enrollment completion, challenge participation, XP accumulation | Events/state exist; exporter gone → engagement tools [PLN] |
| BO-8 | Own top-of-funnel capture via a trusted local companion | Extension captures jobs local-first and imports drafts without cloud exposure | Achieved [VC] (contract-tested local-only); store distribution [PLN] |

**BO exits — ADR-005 demo-mode exit criteria (business-gating) [VC/VD]:**
- Live Stripe keys available (no placeholder `billingMode:'demo'`).
- Confirmed pricing tiers (Q-1) and legal/compliance sign-off on charging minors, refunds, and VAT/tax handling.
- Payment webhook + subscription state machine tested against the `subscriptions`/`payments` ledger (note: users currently have **SELECT-only** RLS on `subscriptions`; mutations run service-side [VC]).
- Successful dry-run charging of internal test cards and refund path.
- Copy audit: billing + AI surfaces re-labeled from "demo/heuristic" only after the underlying engine actually changes (never the reverse).

---

## 5. Business Requirements (with real implementation status)

> Traceability: BR ↔ feature (PRD §7) ↔ business rule (§13) is maintained in §20. These supersede BR-01…BR-12 of BRD v2.0 where wording or status changed.

| ID | Business requirement | Rationale | Implementation status |
|---|---|---|---|
| BR-01 | Provide authenticated, role-scoped access (USER/RECRUITER/ADMIN) with exactly one primary owner per screen | Security + IA clarity + supportability | **Implemented** [VC] (route gatekeeper, `featureOwnership.ts`, `test:ia`; reset-password gap closed 2026-08) |
| BR-02 | Let candidates discover jobs via search/filter/save/hide and act through a draft-first application studio | Core candidate value loop | **Implemented** [VC] |
| BR-03 | Let recruiters publish quality-gated jobs and manage candidate pipelines (private notes, scorecards, gated bulk actions, interview planning) | Supply-side retention and pipeline integrity | **Implemented** — previously undocumented discovery [VC] |
| BR-04 | Deliver structured learning (catalog/enroll/progress) resilient to backend outage | Learning habit formation | **Implemented** via gateway→Supabase fallback with banner [VC] |
| BR-05 | Provide skill practice with fair evaluation (sample checks first, recorded submissions, retry history, XP once per pass) | Skill-signal integrity | **Partially Implemented** — XP-once not DB-enforced (see PRD §22), leaderboard/badges UI orphaned [VC/INF] |
| BR-06 | Enable professional networking with consent-based connections and scheduled follow-up reminders | Network effects | **Implemented**; BLOCKED state unreachable from UI (decision pending) [VC] |
| BR-07 | Provide direct messaging with realtime deliveries and attachment safety | Engagement stickiness | **Implemented** (Supabase Realtime; `conversation_participants` RLS gap to close) [VC] |
| BR-08 | Offer review-gated AI assistance across resume, matching, career path, chat, task automation — never auto-mutating user data | Trust differentiation | **Implemented** with heuristic engine; live LLM provider **[PLN]** [VC] |
| BR-09 | Notify users through a unified center + bell preview + digest system with quiet hours and dedupe | Re-engagement without spam | **Implemented**; delivery executes via external scheduler scripts [VC] |
| BR-10 | Operate billing as explicitly-labeled demo until ADR-005 exit | Legal/financial safety | **Implemented (by design)** [VC] |
| BR-11 | Give admins observability, audit, automation-status, and analytics insight in one read-heavy console | Operational control and trust | **Implemented** [VC] |
| BR-12 | Provide a strictly-local capture companion (extension) feeding the same draft pipelines | Top-of-funnel capture without privacy cost | **Implemented** — previously undocumented; contract-tested [VC] |
| BR-13 | Instrument product behavior honestly (canonical events, workflow catalogs, degraded-state telemetry) | Evidence-driven iteration | **Implemented**; unbattched inserts and no KPI dashboards yet [VC/REC] |
| BR-14 | Keep a single, enforced source of truth for schema and access control and keep seed tooling compatible with it | Data integrity, onboarding velocity | **Partially Implemented** — seed corpus incompatible with unified schema; RLS holes exist [VC] |
| BR-15 | Give users a way to report harmful/misleading content and admins a queue to triage it, degrading gracefully if the shared report store is unavailable | Trust & safety on a marketplace | **Implemented (persistence schema-dependent)** — new discovery in validation; `content_reports` table absent from canonical schema (Q-14) [VC] |

---

## 6. Value Proposition & Business Case

| Segment | Value captured today [VC] | Gap to fully closing the case |
|---|---|---|
| Candidates | One login for jobs + learning + practice + networking + messaging + resume + AI assistance; draft-first pipeline with no data loss; honest AI labels | Live-model quality; certificate issuance; data export |
| Recruiters | Guided publish-to-hire pipeline with quality gates, private evaluation artifacts, bulk review workflows | Liquidity metrics; candidate outreach depth |
| Admins | Single read-only console: stats, service health, automation status, audit log, analytics insights | Write-side admin actions (create sys settings) absent |
| Org/platform | Local-first companion differentiator; auditable operations; evidence-based claims culture | Store distribution; retained engagement metrics |

Differentiators vs incumbent tools (per `ARCHITECTURE.md`/`PLAN.md` [VD], evidence-grounded): review-gated AI as the trust layer, degradation-over-silence UX standard, all-in-one surface vs point tools, local-first companion. [ASM/VD]

---

## 7. Stakeholder Roles & Responsibilities

| RO-ID | Role | Responsibilities tied to evidence | Feature surface (PRD) |
|---|---|---|---|
| RO-1 | Candidate (USER) | Create/own profile, resume, skills; discover/apply/draft/withdraw applications; enroll/complete learning; submit/retry challenges; accept connections; message; review & save/dismiss AI outputs; manage notification prefs; report harmful/misleading content; request account deactivation | F-01, F-04, F-05, F-08, F-09, F-10, F-11, F-12, F-13, F-14, F-15, F-18, F-25 (reporter) |
| RO-2 | Recruiter (RECRUITER) | Publish gated jobs; maintain candidate pipelines with private notes/scorecards; bulk-status only after review+confirm; schedule interviews; respond to applicants | F-03, F-04, F-06, F-07, F-22 |
| RO-3 | Administrator (ADMIN) | Oversee platform stats, service health, automation status, audit trail, analytics insights; triage content-moderation queue (report review/resolve/dismiss) | F-19, F-25 (moderator) |
| RO-4 | Platform Ops | Run and audit the three scheduler scripts; respond to run failures per runbook; keep secrets server/scheduler-side | F-16, cross-cutting F-24 |
| RO-5 | Data Ops | Operate token-gated seed lifecycle only, matching the unified schema | RU-23 |
| RO-6 | Product/Design | Preserve the safe-failure, review-gate, and honesty standards in all new surfaces | F-24, §11 UX standard |
| RO-7 | Vendor liaison (Stripe) | Keep ADR-005 exit criteria fresh; never enable live charging without the exit gates | F-17 |

Accountability note: exactly one **primary feature owner per route** is enforced in code (`featureOwnership.ts`, `test:ia`) — product ownership is machine-checked, not convention-only. [VC]

---

## 8. Business Processes (as-operated)

| ID | Business process | Owner surface | Anchors |
|---|---|---|---|
| BP-1 | Candidate journey: discover → save/search → draft → review-submit → track timeline | F-04/F-05 | J-1; RU-05/07 |
| BP-2 | Recruiter pipeline: publish (gated) → queue → notes/scorecards → gated bulk actions → interview planner | F-06/F-07 | J-3; RU-03/04 |
| BP-3 | Learning loop: browse → enroll (idempotent) → progress → complete | F-08 | J-2; RU-08/09; fallback banner |
| BP-4 | Practice loop: pick → workspace → sample checks → submit/retry → XP (once per pass) | F-09 | RU-10/11 (no dedicated journey in PRD §9) |
| BP-5 | Notification ops: event → notification row → (immediate \| digest via scheduler) → center/bell → read | F-16 | cross-journey; RU-16/17; scheduler-audit |
| BP-6 | Networking cadence: suggestions → connect/note → respond → reminder scheduling | F-10 | J-4; RU-12 |
| BP-7 | Extension capture: scrape listing → local draft (review) → tracker → manual import to web app | F-21 | J-9; RU-24; contract test |
| BP-8 | Admin oversight: stats → observability links → automation status → audit review → analytics insights | F-19 | J-8; read-heavy by design |
| BP-9 | Environment data ops: token-gated seed/truncate cycle compatible with unified schema | `seed-data.sql` | RU-23; seed compatibility gap (PRD §22) |
| BP-10 | Account lifecycle: register → use → deactivate (soft, typed confirm) | F-01/F-18 | J-7; RU-19; soft-delete nuance |
| BP-11 | Trust & safety: report (job/profile/company/message) → submit → admin triage (under_review/resolve/dismiss) → stats | F-25 | J-10; RU-27; self-degrades to localStorage without `content_reports` table (Q-14) |

Operational integrity: every process that can degrade must present a labeled fallback rather than fail silently (F-24 standard); every privileged mutation is review-confirmable or audit-logged (RU-15, RU-17, RU-21, RU-22).

---

## 9. Commercial Model & Revenue Streams

### 9.1 Current posture [VC]
Free-tier product. Plan catalog (`subscription_plans` seeded), checkout/portal Edge-Function scaffolds, `payments` ledger and `subscriptions` state all exist but are inert: `billingMode:'demo'`, no live charge path (ADR-005). Pricing tiers beyond seeded demo plans: **undecided** (Q-1).

### 9.2 Target streams (blocked by design)
- **Candidate/SMB subscriptions** (plans, month/year intervals, JSON feature packs, provider_price_id mapping) — gated by BO-5 exit.
- **Recruiter supply-side** (posting volume, pipeline tooling) — no pricing surfaced yet.
- **Enterprise/B2B** — no evidence of plans.
- **Extension** — free companion; no monetization evidence.

### 9.3 Controls while in demo
Every billing surface must carry demo labeling (FR-F17-1); no callable live-charge path exists [VC]; switching to live requires ADR-005 exit gates (§4 BO exits).

---

## 10. Compliance, Governance & Data Protection

| Area | Obligation | Status |
|---|---|---|
| Access control | Role matrix (PRD §3.2) + RLS on all private data | **Met** for canonical surface (110 policies) [VC]; **open gaps**: `experiences`/`educations` zero-policy lockout; `conversation_participants` RLS off; `audit_log`/`system_settings` unprotected (verify service-role-only) [VC/UNK] |
| Auditability | Sensitive-action audit trail incl. actor, entity, old/new, ip, user-agent | **Met** (audit_log + admin browser; scheduler audit redacts secrets) [VC] |
| Automation governance | Human-in-the-loop for all AI mutations; bulk actions review+confirm; typed-confirm deactivation | **Met** [VC] |
| User data rights | Self-service deactivation (typed confirm); local-first drafts; extension locality | **Partially met** — deletion is **soft**, no hard-delete/export path confirmed (Q-6; risk vs GDPR-style rights) [VC] |
| Safety copy standards | No vendor/provider error leakage; labeled degradation everywhere | **Met** [VC] |
| Financial | No charging without ADR-005 exit; demo labels on all billing surfaces | **Met** [VC] |
| CI/security | Secret scanning + Trivy on every push; secrets never in client bundle; dev auth backdoor dev-gated | **Met** [VC]; prod-strip assertion for dev backdoor = [REC] |
| Accessibility commitment | WCAG 2.1 AA contrast, keyboard, semantics suites in CI | **Met** [VC] |
| Data retention | Retained indefinitely today — no retention schedule for drafts, analytics, sessions, deleted accounts | **Gap** (Q-6) [VC] |

---

## 11. Business Continuity & Operations

| Practice | Reality | Notes |
|---|---|---|
| Scheduler operations | 3 external scripts + `scheduler-audit.mjs`; service-role creds; audited runs; admin panel mirrors statuses | SPOF — external host dependency (RK-02); HA plan is Phase 3 [VD] |
| Degradation playbook | Gateway→Supabase fallback (LMS verified); AI→heuristic fallback; dashboard partial-refresh; localStorage analytics buffer | Never a blank page [VC] |
| Error contract | Stable codes + `X-Correlation-ID`; no stack traces leaked (PROBLEM-0005 fixed) | [VC] |
| Observability | Admin link grid (health/metrics/logs/status); Prometheus/Tempo/Promtail/Grafana configs; audit_log | [VD/VC] |
| Runbooks | Incident runbooks + operational runbook in `docs/runbooks/`, `docs/OPERATIONAL_RUNBOOK.md` | [VD] |
| Backup/DR | Supabase platform SLA assumed; **no verified autonomous backup/restore runbook in evidence set** | [UNK/REC] |
| Seed/truncate | Token-gated validation (`I_UNDERSTAND_...` literal), pre-run check | RU-23; seed corpus incompatible with unified schema (PRD §22) |

---

## 12. Constraints, Assumptions & Dependencies

| # | Item | Class |
|---|---|---|
| A-1 | Single-region Supabase deployment acceptable near-term | ASM |
| A-2 | `seed-data.sql`/`seed_data.py` are legacy and must be re-authored or retired before use against the unified schema | [CONFLICT] resolved toward legacy/incompatible pending verification |
| A-3 | Heuristic AI acceptable until Q-9 (vendor/privacy) lands | ASM |
| A-4 | Frontend test suite Windows-compatible and CI-executed | VD |
| C-1 | Windows-first dev environments; cmd shell conventions | Constraint |
| C-2 | Frontend tests must stay <60s to preserve CI velocity target | VD |
| C-3 | No secrets in client bundle; all privileged ops server/scheduler-side | Constraint (enforced by scanning + patterns) |
| C-4 | Docs precedence: `PLAN.md` + `ARCHITECTURE_STATUS_INDEX.md` > PRD/BRD > `SSOT.md` (stale) | VD |
| C-5 | Backend is a secondary layer; Supabase remains the primary identity/data plane (ADR-001/003) | Constraint [VD] |
| C-6 | Billing stays demo until the full §4 BO-exit gate list clears | Constraint [VC/VD] |

Dependencies: Supabase platform availability · file-service availability for uploads · CI runners as the only executable theater for ~40 backend test files · parent-repo `talentsphere-ci.yml` workflow ownership · external host for scheduler scripts.

---

## 13. Business Rules Catalog (verified)

> Rules RU-01…RU-26 are the binding business rules, each with an enforcement point and current status. Proposed (not yet enforced) rules are RU-R1…RU-R4. Product behavior per rule: PRD §12.

| ID | Rule | Description | Trigger/context | Condition | Expected outcome | Exceptions / notes | Affected feature/process | Enforcement point | Status |
|---|---|---|---|---|---|---|---|---|---|
| RU-01 | Roles are exactly USER/RECRUITER/ADMIN | Access is role-scoped end to end | Any route/API call | Role in canonical set | Role-appropriate surface; mismatches → `/dashboard` | Supabase app_metadata + gateway normalization | F-01/BR-01 | `routeRegistry.ts` + gateway | Active [VC] |
| RU-02 | One primary feature owner per route | I A ownership is singular | Any route render | Owner uniqueness | IA contract test passes | Machine-checked | BR-01 | `featureOwnership.ts` + `test:ia` | Active [VC] |
| RU-03 | Job lifecycle DRAFT→PUBLISHED→(CLOSED\|ARCHIVED) | Postings move through a fixed lifecycle | Status change | Transition valid | Lifecycle enforced | — | F-07/BP-2 | `job_status` enum | Active [VC] |
| RU-04 | Publish requires completeness + no duplicate match | Only quality postings go live | "Review & Publish" | Completeness + duplicate check | Publish proceeds or is blocked with highlighted fields | DB trigger also gates PUBLISHED | F-07/BP-2 | `canPublishRecruiterPosting` + `enforce_job_publish_readiness` | Active [VC] |
| RU-05 | Application status PENDING→REVIEWED→INTERVIEW→(OFFER\|REJECTED) | Pipeline transparency | Recruiter status action | Valid transition | Timeline event logged; candidate notified | Delete-withdraw bypasses later statuses | F-05/F-06/BP-1/BP-2 | `application_status` enum + `application_status_events` | Active [VC] |
| RU-06 | One active application per user/job pair | Prevent double-submissions | Apply action | UNIQUE(job_id, user_id) | Second active application rejected | Service-level detail to re-verify [INF] | F-05/BP-1 | schema UNIQUE + service logic | Active [VC/INF] |
| RU-07 | Withdraw deletes the application; resubmission permitted | Correct "change of mind" semantics | Withdraw action | — | Record removed; can re-apply | Changed from v1.x "soft-cancel" claim | F-05/BP-1 | `withdrawApplication` delete semantics | Active [VC] |
| RU-08 | Enrollment is idempotent | No duplicate enrollments | Enroll action | Same course | Existing enrollment returned | — | F-08/BP-3 | lmsService | Active [VC] |
| RU-09 | Enrollment ENROLLED→IN_PROGRESS→(COMPLETED\|DROPPED) | Fixed learning states | Progress update | Valid transition | State honored; progress computed | — | F-08/BP-3 | `enrollment_status` enum | Active [VC] |
| RU-10 | XP awarded at most once per challenge pass | Protect skill-signal integrity | Challenge pass | Exactly-once | Single XP credit per pass | **Enforcement point [VC/INF]** — no DB view/uniqueness constraint verified in canonical schema (PRD §22/Q-13) | F-09/BP-4 | service logic; DB-enforcement [REC] | Active w/ gap [VC/INF] |
| RU-11 | Submission records sample-check outcome + `passed_tests` before status resolution | Fair, auditable evaluation | Submit/retry | Sample-check recorded | STATUS resolved from verified tests; retries append history | No inferred Judge0/Piston trace (Q-5) | F-09/BP-4 | challengeService flow | Active [VC] |
| RU-12 | Connections require consent (recipient accept/decline); initiator optional note; withdraw allowed; BLOCKED in enum but unreachable | Consent-based networking | Connect/respond | Recipient action | PENDING→ACCEPTED/REJECTED; invites removable | BLOCKED decision pending (PRD §25) | F-10/BP-6 | networkingService + types | Active w/ known gap [VC] |
| RU-13 | Message attachments gated by size cap + MIME allowlist before send | Attachment safety | Attach → send | Size + MIME valid | Allowed attachments send; others rejected pre-send | Client-side validation | F-11/BP-5 | messagingService | Active [VC] |
| RU-14 | Read receipts propagate at conversation level | Minimal read semantics | Open conversation | — | Unread clears at conversation level | Per-message DELIVERED dead code (PRD §22) | F-11/BP-5 | markRead implementation | Active [VC] |
| RU-15 | AI outputs persist as `draft`; promotion requires explicit save; dismissals retained | Review-before-mutate trust contract | AI suggestion lifecycle | Explicit user action | draft → saved/dismissed; never autonomous mutation | Provenance + safety guarantees (PRD F-12) | F-12/BP-1/6/10 | `review_status` + suggestion queue | Active [VC] |
| RU-16 | Digest dedupe on `delivery_key`; frequencies immediate/daily/weekly/off; quiet hours honored | Anti-spam notification ops | Digest curation/delivery | Dedupe key + frequency + quiet hours | One digest per key per cycle; quiet hours 18:00–09:00 default | Delivery via external scheduler | F-16/BP-5 | digest tables + scheduler scripts | Active [VC] |
| RU-17 | Mark-all-read requires explicit confirmation dialog | Prevent accidental bulk state change | Mark-all-read click | Confirmation | Action executes only after confirm | — | F-16/BP-5 | NotificationsPage | Active [VC] |
| RU-18 | Billing surfaces always label demo; no live charge path callable | Financial/legal safety | Billing UI/API | Demo label present | No real money movement | ADR-005 | F-17/BP-10 | `billingMode:'demo'` export + Edge-Function scaffolds | Active [VC] |
| RU-19 | Account deletion requires typed confirmation phrase | Informed consent | Deactivate action | Phrase match | Deactivation (soft) proceeds | Soft-deactivate ≠ hard delete (PRD F-18) | F-18/BP-10 | SecuritySettings | Active [VC] |
| RU-20 | RLS governs every private table (110 policies) | Data isolation | Any data access | Policy applied | Scoped reads/writes | Gaps: experiences/educations (zero policies), conversation_participants (RLS off) | cross-cutting | `supabase-schema.sql` | Active w/ known gaps [VC] |
| RU-21 | Sensitive admin-visible actions write `audit_log` (actor, entity, old/new, ip, ua) | Auditability | Sensitive action | Row written | Browsable audit trail | — | F-19/BP-8 | schema + admin audit browser | Active [VC] |
| RU-22 | Background schedulers run service-role and leave auditable runs | Ops accountability | Scheduler run | Audit row | Runs inspectable with secrets redacted | — | F-16/BP-5 | `scripts/*.mjs` + `scheduler-audit.mjs` | Active [VC] |
| RU-23 | Destructive seed requires the literal token `I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA` | Environment safety | seed/truncate | Token match pre-run | Operation aborts without token | Seed corpus incompatible with unified schema (PRD §22) | BP-9 | `validate-seed-data-safety.mjs` | Active [VC] |
| RU-24 | Extension stores scraped/draft data locally only; no cloud sync without explicit action | Privacy by architecture | Any extension write | Local scope | No account-bound transmission | Contract-tested | F-21/BP-7 | extension storage + contract test | Active [VC] |
| RU-25 | Analytics failures degrade silently (localStorage ring buffer ≤100) and never block UX | Telemetry resilience | trackEvent failure | Ring buffer | Event queued locally; UX unaffected | — | F-24 | `trackEvent` fallback | Active [VC] |
| RU-26 | Provider/vendor errors are never surfaced verbatim | Safe-failure copy standard | Any remote failure | Copy present | Safe message + correlation ID | — | F-24 | shell/service patterns + `degraded_state_shown` telemetry | Active [VC] |
| RU-27 | Report triage lifecycle and local fallback | Trust & safety on a marketplace | Report submit / admin triage | target_type+target_id+reason present | pending→under_review→(resolved\|dismissed) with notes; local fallback when `content_reports` absent | Shared queue needs the table provisioned (Q-14) | F-25/BP-11 | trustAndSafetyService | Active (persistence schema-dependent) [VC] |

**Proposed rules (not yet enforced)**: **RU-R1** batched analytics writes (scalability) · **RU-R2** prod builds strip dev/E2E auth backdoor (assertion) · **RU-R3** connection BLOCKED either implemented or removed · **RU-R4** data-retention schedule for drafts, sessions, analytics, deleted accounts (Q-6). → downstream of PRD §25/§28.

---

## 14. Business Data Requirements (business-language)

Business meaning of the canonical data model (full schema: PRD §13.1–13.5):

| Business concept | System representation | Business owner concern |
|---|---|---|
| Customer identity & role | `auth.users` + `profiles` (1:1) | Verified role, soft-deactivate flag |
| Candidate profile | `user_profiles` + skills/experience/education/certification/language/project tables | Auto-created at signup; completeness drives dashboard checklist |
| Employer/company | `companies` | Owner-verified; attach-to-posting |
| Job posting | `jobs` (publish-gated, salary, requirements) | Quality at publish; lifecycle |
| Application + timeline | `job_applications` + `application_status_events` | Draft-first authoring; immutable transition history |
| Recruiter evaluation artifacts | `candidate_notes`, `candidate_scorecards` | Private to job poster (RLS) |
| Search presets | `saved_job_searches` | Alert flag + digest baselines |
| Resume asset | `resume_artifacts`, `resume_export_events` | Tombstones + export audit |
| AI conversations & suggestions | `ai_sessions`, `automation_suggestions` (+ audit) | Review-gated, provenance |
| Networking graph | `connections`, `networking_suggestion_preferences` | Consent + dismissal memory |
| Messaging | `conversations`, `conversation_participants`, `messages` | Unread accounting; attachment safety |
| Learning | `courses`, `lessons`, `enrollments`, `lesson_progress` | Progress computation |
| Practice | `challenges`, `challenge_submissions` | Sample checks, retries, XP ledger |
| Engagement state | `badges`, `user_badges`, `xp_transactions`, `leaderboard` | Orphaned UI today; dashboard reads `leaderboard.total_xp` |
| Notification estate | `notification_settings`, `notifications`, `notification_digest_items` | Digest dedupe + quiet hours |
| Billing (demo) | `subscription_plans`, `subscriptions`, `payments` | No live charges (RU-18); messages via service-side only |
| Platform | `system_settings`, `audit_log` | Config + security trail |
| Content moderation (trust & safety) | `content_reports` (referenced by F-25; **absent from canonical baseline**) | Reports on jobs/profiles/companies/messages with reason, status, resolution notes; local fallback until table is provisioned (Q-14) |

Data ground rules: single schema authority (`0001_initial_baseline.sql`); typed client boundary (`database.types.ts`); 110 RLS policies; no canonical views (PRD §13.1 — "XP-once view" claim corrected). [VC]

---

## 15. Reporting Requirements

| Stakeholder | Report | Current reality | Instrumentation |
|---|---|---|---|
| Admin | Platform overview stats | Live counts w/ 2s timeout + labeled fallback [VC] | AdminDashboard |
| Admin | Service health/metrics/logs | Link grid to external UIs [VC] | infra/observability |
| Admin | Automation status | Mirrors the 3 scheduler builders [VC] | scripts/*.mjs |
| Admin | Audit trail | Browsable, cursor-paginated [VC] | `audit_log` |
| Admin | Product analytics insights | Single card reading events [VC] | `product_analytics_events` |
| Leadership/Product | KPI dashboards (K-01…K-15) | **None exist** from raw events [VC] — framework in §16 | events ready; cohort/aggregation jobs absent |
| Candidates | Application status | In-app timeline [VC] | `application_status_events` |
| Recruiters | Pipeline queue | Candidates page w/ cursor nav [VC] | recruiterService |
| Users | Notification estate | Center + bell + digests [VC] | notify tables |

---

## 16. KPI / Metrics Framework

Reporting framework for BO-1…BO-8. Baselines/definitions are proposed targets; **instrumentation status is factual**.

| ID | KPI | Definition | Maps to | Instrumentation status |
|---|---|---|---|---|
| K-01 | Activation rate | % new signups completing ≥1 core action in 7d | BO-1/BO-4 | Needs computation [PLN] (events exist) |
| K-02 | WAU | Weekly active users | BO-1 | [PLN] |
| K-03 | Search→apply conversion | applications / searches | BO-4 | [PLN] |
| K-04 | Posting liquidity | active postings per recruiter/mo | BO-4 | [PLN] |
| K-05 | Application response rate | status moves / applications | BO-4/BR-03 | [PLN] |
| K-06 | Course completion rate | COMPLETED / enrollments | BO-7 | [PLN] (enum ready) |
| K-07 | Challenge participation | submissions/user/wk | BO-7 | [PLN] |
| K-08 | First-pass success | PASSED without retry / submissions | BO-7/BR-05 | [PLN] |
| K-09 | Connection acceptance rate | ACCEPTED / sent | BO-1/BR-06 | [PLN] |
| K-10 | Message responsiveness | median reply latency | BO-1/BR-07 | [PLN] |
| K-11 | AI suggestion acceptance | saved / generated suggestions | BO-2/BR-08 | **Computable now** [VC] (`automation_suggestion_saved` etc.) |
| K-12 | Prefill utility | prefill_used vs rejected | BO-2/BR-08 | **Computable now** [VC] (`workflow_prefill_used/rejected`) |
| K-13 | Digest engagement | action_url clicks / delivered digests | BO-1/BR-09 | Needs click capture [PLN/REC] |
| K-14 | D30 retention | cohort survival | BO-1 | [PLN] |
| K-15 | Degraded-experience rate | degraded_state_shown / sessions | BO-3/BR-13 | **Computable now** [VC] |
| K-16 | Pipeline review rate (internal) | audit_log rows / sensitive actions | BO-6/BR-11 | **Computable now** [VC] |
| K-17 | Extension adoption | installs→imports (sanitized, local consent) | BO-8/BR-12 | Sanitized local analytics only [VC] |
| K-18 | Moderation throughput | resolved+dismissed / reports submitted (and median triage latency) | BO-6/BR-15 | Computable once `content_reports` is provisioned/shared; local-only until then [PLN/gated on Q-14] |

**No historical aggregation, cohort, or computed-KPI job exists today** (`product_analytics_events` is raw + admin insight card) [VC]. KPI dashboards and cohort reporting are explicitly **[PLN]**.

---

## 17. Risk Register & Dependencies

| ID | Risk / dependency | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| RK-01 | Heuristic AI under-delivers vs marketing language | Churn, trust erosion | High | Disclosure panels; copy audit; BO-2 live-model roadmap behind review contracts | RO-6/Product |
| RK-02 | External scheduler scripts = operational SPOF | Missed digests/reminders | Medium | Audited runs + admin status; HA plan Phase 3 | RO-4/Platform Ops |
| RK-03 | Supabase concentration (auth/db/realtime/functions) | Vendor lock-in | Medium | Gateway abstraction proven in LMS fallback pattern | RO-4 |
| RK-04 | Backend ~40 test files CI-only; no local Maven wrapper | Regression risk at service layer | Medium | Add Maven wrapper / dockerized test target | Backend |
| RK-05 | Doc/code drift misleads contributors & stakeholders | Wasted effort, bad decisions | High | PRD/BRD v3 + Traceability as canonical; fix stale port/map claims | All |
| RK-06 | Demo-billing confusion (users see plans they can't buy) | Support load, legal exposure | Medium | RU-18 demo labels; don't exit ADR-005 prematurely | RO-7 |
| RK-07 | Unbatched analytics inserts | DB cost at scale | Low→Med | RU-R1 batching [REC] | Backend/Data |
| RK-08 | Dev/E2E auth backdoor leaking to prod build | Auth bypass | Low | Env-guards now; RU-R2 prod-strip assertion [REC] | Security |
| RK-09 | Extension store policy changes | Funnel loss | Low | Local-only posture simplifies review; monitor Q-2 | RO-6 |
| RK-10 | Orphaned gamification (badges/leaderboard in schema, no UI) sets false expectations | Trust | Medium | Wire or cut (decision needed) | Product |
| RK-11 | Zero-policy RLS on experiences/educations + RLS-off conversation_participants | Data exposure/lockout for real usage | **High** | Close policies or disable RLS; see PRD §13.6/Q-11 | Security/Data |
| RK-12 | Seed corpus incompatible with unified schema | Broken onboarding/data ops | Medium | Re-author or retire seed; guard RU-23 | Data Ops |
| RK-13 | No verified backup/restore runbook in evidence | Data loss recovery | Medium | Document restore procedure + test | RO-4 |
| RK-14 | `content_reports` table missing from canonical schema → moderation data not shared across browsers | Split-brain moderation, reports lost per-browser | Medium | Provision table + RLS policies, or ratify local-only scope (Q-14) | Security/DATA + RO-3 |

Dependencies: Supabase platform SLA · file-service availability · CI runners for backend tests · parent-repo CI ownership · external scheduler host.

---

## 18. Success Criteria & Go/No-Go Gates

**Business success (evidence-grounded)**
1. All J-1…J-9 journeys complete in-product with labeled degradation — **achieved today** [VC].
2. Zero silent AI mutations; every AI output reviewable — **achieved** [VC].
3. All 110 RLS policies valid **and** the three known RLS gaps closed (Q-11) — **gap open**.
4. Seed corpus usable against the unified schema (Q-12) — **gap open**.
5. K-11/K-12/K-15/K-16/K-17 computable from existing events — **achieved for instrumentation** [VC]; KPI dashboards [PLN].

**Exit of demo mode (BO-5) — go when ADR-005 exit criteria in §4 all pass, and only then.**

**Adoption gates (recommended, no invented baselines [REC/ASM]):**
- Activation K-01 and WAU K-02 computed regularly before any paid tier is turned on.
- Pipeline liquidity K-04/K-05 above a threshold agreed by Product before monetizing recruiters.

---

## 19. Business/Implementation Gap Alignment

Business view of the gap catalog (PRD §22). Alignment: business impact, the gap, decision needed, and the owner.

| ID | Business gap | PRD anchor | Business impact | Priority | Decision needed | Decision owner |
|---|---|---|---|---|---|---|
| GA-01 | Seed corpus (`seed-data.sql`/`seed_data.py`) incompatible with unified schema | §22/§13.1 | Broken local onboarding, wrong data written to production-shaped tables | High | Re-author vs retire vs split legacy corpus | RO-5/Data Ops + Architect |
| GA-02 | `experiences`/`educations` RLS enabled with zero policies | §13.6/E-13 | Profile CRUD lockout in real use; support incidents | High | Add policies vs disable RLS | Security + RO-3 |
| GA-03 | `conversation_participants` RLS never enabled | §13.6/E-14 | Participant listing exposure risk; read-marker logic unsafe | High | Enable RLS + add policies | Security + Backend |
| GA-04 | XP-once not DB-enforced (no view/constraint in canonical schema) | §22/Q-13 | Double-award possible under race; skill-signal integrity | Medium | DB uniqueness constraint/function vs accept service-level | Backend + Product |
| GA-05 | Gamification orphaned (badges/leaderboard schema + service, zero UI) | §22/F-23 | False expectations (badges mentioned nowhere user-visible); dead surface | Medium | Wire leaderboard/badges UI vs cut schema/service | Product + RO-6 |
| GA-06 | Billing live path blocked (demo mode) | §22/F-17 | No revenue; demo labels protect legal | Low (by design) | Keep blocked until §4 exit gates | RO-7 |
| GA-07 | AI is heuristic, marketing may overclaim | §22/F-12 | Trust erosion if copy claims LLM | Medium→High | Copy audit now; BO-2 live-model roadmap | RO-6/Product + Marketing |
| GA-08 | Documented-but-absent: feed authoring, video calls, certificates, mentorship, referrals, i18n, OAuth | §22.1 | Feature confusion; roadmap ambiguity | Medium | Explicitly declare out-of-scope in marketing; re-plan only if demanded | Product |
| GA-09 | Data lifecycle: soft-delete only, no export/retention policy | §22/Q-6 | Compliance risk (user-data rights), cost of retained data | Medium | Retention/export policy (RU-R4) | RO-3 + Legal |
| GA-10 | Judge0/Piston judging wiring UNKNOWN | §22/Q-5 | Challenge evaluation story unclear; cannot certify scalability | Medium | Trace & document actual execution path | Backend + RO-6 |
| GA-11 | External schedulers SPOF | §22/§11 | Digest/reminder outages | Medium | In-app delivery vs external scripts decision (Q-4 kinship) | RO-4 + Product |
| GA-12 | No KPI dashboards/cohort jobs from event stream | §22/§16 | Cannot evidence BO-4/BO-7 growth | Medium | Build KPI layer; instrumentation already there | Product + Data |
| GA-13 | Recruiter access intent for networking/messaging ambiguous | §22.2/Q-7 | Product copy vs route policy drift | Low | Confirm intent, update copy/rules | Product |
| GA-14 | Seed/demo currency of `system_settings` + admin write-side absent | §22/F-19 | Admin can't manage config from UI | Low | Wire settings management vs document absence | Product |
| GA-15 | Content moderation persists only locally / best-effort because `content_reports` is missing from the canonical schema | §22/F-25/Q-14 | Moderation data not shared; false sense of platform-level safety | Medium | Provision `content_reports` + RLS, or ratify local-only scope | Security + RO-3 |

**Deferred (documented intent, not gaps):** live LLM provider (BO-2), live Stripe (BO-5 exit), modular monolith `apps/backend`, i18n, cross-browser certification, extension store distribution, leaderboard UI. [PLN]

---

## 20. Traceability Matrix

| Business requirement | Feature (PRD) | Business rules | KPI | Risk |
|---|---|---|---|---|
| BR-01 | F-01 | RU-01, RU-02 | K-02 | RK-08 |
| BR-02 | F-04, F-05 | RU-05, RU-06, RU-07 | K-01, K-03 | — |
| BR-03 | F-06, F-07 | RU-03, RU-04 | K-04, K-05 | — |
| BR-04 | F-08 | RU-08, RU-09 | K-06 | RK-03 |
| BR-05 | F-09 | RU-10, RU-11 | K-07, K-08 | GA-04, GA-10 |
| BR-06 | F-10 | RU-12 | K-09 | GA-13 |
| BR-07 | F-11 | RU-13, RU-14 | K-10 | GA-03 |
| BR-08 | F-12, F-13 | RU-15 | K-11, K-12 | RK-01, GA-07 |
| BR-09 | F-16 | RU-16, RU-17 | K-13 | RK-02, GA-11 |
| BR-10 | F-17 | RU-18 | — | RK-06 |
| BR-11 | F-19 | RU-21, RU-22 | K-16 | — |
| BR-12 | F-21 | RU-24 | K-17 | RK-09 |
| BR-13 | F-24 | RU-25, RU-26 | K-15 | RK-07 |
| BR-14 | cross-cutting | RU-20, RU-23 | — | RK-11, RK-12, GA-01, GA-02 |
| BR-15 | F-25 | RU-27 | K-18 (moderation throughput) | RK-14, GA-15 |

BO coverage: BO-1→BR-01/02/06/07 · BO-2→BR-08 · BO-3→BR-13 · BO-4→BR-02/03 · BO-5→BR-10 · BO-6→BR-01/11/14/15 · BO-7→BR-04/05 · BO-8→BR-12.

---

## 21. Evidence Index

| Evidence area | Location |
|---|---|
| Living architecture, decisions, boundaries | `ARCHITECTURE.md`, `DECISION.md`, `PROJECT-BOUNDARIES.md`, `PROBLEMS.md`, `FLOW.md`, `IMPLEMENTATION-PLAN.md` (workspace root) |
| Master plan | `PLAN.md` (workspace root) |
| Feature/dashboard inventory | `docs/FEATURES_AND_DASHBOARDS.md` |
| Traceability & gaps | `docs/CODEBASE_TRACEABILITY.md` |
| Data ownership | `docs/DATA_OWNERSHIP.md` + `data-ownership-manifest.json` |
| Module/lifecycle registry | `docs/MODULE_MANIFEST.md` + `module-manifest.json` |
| ADRs | `docs/adr/ADR-001…005` |
| Runbooks | `docs/OPERATIONAL_RUNBOOK.md`, `docs/runbooks/INCIDENT_RUNBOOKS.md` |
| Schema & types | `infra/db/migrations/0001_initial_baseline.sql`, `supabase-schema.sql`, `infra/db/generated/database.types.ts` |
| Frontend | `apps/frontend/src`, `apps/frontend/tests` |
| Backend | `services/*` (26 reactor modules), `apps/backend` (skeleton) |
| Extension | `chrome-extension-project/src`, `scripts/*.test.mjs` |
| Schedulers/validators | `scripts/*.mjs` (~22 `validate-*.mjs` contract validators; the 3 schedulers + audit each ship `.test.mjs` counterparts) |
| Observability | `infra/observability/`, `infra/docker/` |
| CI | `.github/workflows/talentsphere-ci.yml` |
| Seed tooling | `seed-data.sql`, `scripts/validate-seed-data-safety.mjs` |
| Trust & safety | `apps/frontend/src/services/trustAndSafetyService.ts`, `components/trust/` (ReportContentModal, TrustAndSafetyModerationQueue) |

---

## 22. Open Questions & Decision Log

Open questions (shared with PRD §23, IDs identical):

| ID | Question | Business significance |
|---|---|---|
| Q-1 | Billing pricing tiers beyond seeded demo plans? | BO-5 exit gate |
| Q-2 | Extension store distribution & policy constraints? | BO-8 |
| Q-3 | Backend endgame: modular monolith vs retained services? | Cost/debt posture |
| Q-4 | Is socket.io still needed given Supabase Realtime? | Ops simplification |
| Q-5 | What actually executes challenge submissions (Judge0/Piston)? | GA-10/RK certifiable evaluation |
| Q-6 | Data-retention/export policy for drafts, sessions, analytics, deleted accounts? | GA-09/RU-R4 |
| Q-7 | Intended recruiter access to Networking/Messaging? | GA-13 |
| Q-8 | i18n priority languages? | Out-of-scope today |
| Q-9 | LLM vendor + privacy requirements when a live model is introduced? | BO-2 / RK-01 |
| Q-10 | Certificate strategy (`certificate_url` passthrough only)? | BO-1 completeness |
| Q-11 | Resolve RLS no-policy / off states for experiences, educations, conversation_participants? | GA-02/03/RK-11 |
| Q-12 | Reconcile seed corpus with unified schema? | GA-01/RK-12 |
| Q-13 | Should XP-once be DB-enforced? | GA-04 |
| Q-14 | Should `content_reports` be added to canonical schema (with RLS) so the moderation queue is shared, or is per-browser/local-only acceptable? | GA-15/RK-14 |

Decision log this revision: **D-1** PRD/BRD v2.0 superseded by v3.0 (codebase-verified). **D-2** Keep billing in demo until full §4 exit list passes (RU-18 upheld). **D-3** `/jobs` remains USER+RECRUITER; v2.0 "ADMIN allowed" claim corrected (PRD §26). **D-4** Gamification surfaced or cut — decision open (GA-05). **D-5** Trust & safety (F-25) added as an implemented-but-undocumented feature during §30 self-review; persistence scope (shared vs local-only `content_reports`) open (Q-14).

---

## 23. Version & Correction History

| Version | Date | Change |
|---|---|---|
| 1.x | prior | Original hierarchical BRD (BR-01…BR-10, RU-01…RU-15) — superseded |
| 2.0 | 2026-08-22 | Codebase-verified rewrite (BR-01…BR-13, RU-01…RU-26) |
| **3.0** | **2026-08-30** | Canonical reconstructed baseline aligned 1:1 with PRD v3.0. Supersedes v2.0. Key corrections vs v2.0: seed-corpus incompatibility with unified schema flagged as [CONFLICT]; `/jobs` ADMIN-access claim reverted; XP-once "DB view" claim corrected to service-logic-only; account deletion relabeled soft-deactivation; billing stays demo with explicit ADR-005 exit gates; BRD §13 rules now carry trigger/condition/exception/evidence columns; §19 gap alignment added; KPI framework extended (K-16/K-17); BO set renumbered with BO-2 = honest AI now + live-LM path [PLN]. **Post-write §30 self-review**: added F-25/BR-15/RU-27 (Trust & Safety content moderation — user report modal + admin moderation queue, previously undocumented, with `content_reports` persistence gap Q-14); added internal-platform integrations Redis/Elasticsearch/Eureka/OpenFeign/WebSocket-STOMP and corrected the validator count description; BR/BO numbering renumbered with BR-15 and traceability updated. |

---

*End of BRD v3.0. Any status dispute resolves via repository evidence; see PRD v3.0 for the product view and CODEBASE_TRACEABILITY.md for the code-level ledger.*