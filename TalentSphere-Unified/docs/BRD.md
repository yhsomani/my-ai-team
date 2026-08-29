# TalentSphere — Business Requirements Document (BRD)

> Documentation status: Current codebase-verified business requirements (v2.0). Keep synchronized with docs/PRD.md and docs/CODEBASE_TRACEABILITY.md.

| | |
|---|---|
| **Version** | 2.0 — Codebase-Verified Rewrite |
| **Date** | 2026-08-22 |
| **Authority** | Reverse-engineered from the repository; aligned 1:1 with [PRD v2.0](./PRD.md). Evidence labels ([VC]/[VD]/[INF]/[ASM]/[REC]/[PLN]/[UNK]) are defined in PRD §0.2 and reused here. |
| **Companions** | [PRD](./PRD.md) · [Codebase Traceability & Gap Analysis](./CODEBASE_TRACEABILITY.md) · [Recommended Improvements](./RECOMMENDED_IMPROVEMENTS.md) |

---

## 1. Business Overview

### 1.1 Purpose of this document
Define *why* TalentSphere exists as a business: objectives, stakeholders, requirements at business level, binding business rules, operating processes, commercial posture, compliance duties, and risk exposure — each tagged with its real implementation status so leadership can distinguish shipped capability from aspiration.

### 1.2 Business context
TalentSphere operates an AI-assisted career platform ("LinkedIn + Coursera + HackerRank, powered by AI" [VC]) serving candidates, recruiters, and administrators from a single web application plus a local-first Chrome extension companion. Revenue scaffolding exists but **charging is disabled by design** (demo mode, ADR-005). [VC]

### 1.3 Vision / Mission / Values
- **Vision:** the trusted career operating system where every AI output is reviewable and every failure degrades gracefully. [VD]
- **Mission:** unify job discovery, learning, practice, networking, and career tooling with honest, review-gated assistance. [VD]
- **Operating values:** honesty over hype · user owns data · review-before-mutate · graceful degradation · evidence-based claims. [VC — enforced in code patterns]

---

## 2. Current-State (As-Is) Analysis

| Dimension | Verified reality |
|---|---|
| Product maturity | Core candidate + recruiter + admin surfaces shipped and tested: **116 test files, 643 green unit tests**, ~20 Playwright E2E specs, IA-ownership contract test. [VC] |
| Architecture | Supabase-first SPA; ~19 Spring microservices present but secondary; hybrid gateway→Supabase fallback verified in LMS. [VC] |
| AI posture | Local heuristics only; no external LLM wired; provenance + draft-review statuses (`draft/saved/dismissed`) enforce human-in-the-loop. [VC] |
| Monetization | Demo mode mandated by ADR-005; plans/payments UI + Stripe Edge Function scaffolds exist; `billingMode:'demo'` exported. No revenue. [VC] |
| Operations | Three background scheduler scripts (digests ×2, networking reminders) run externally against Supabase with audited runs; admin panel mirrors their status. [VC] |
| Distribution | Web app + MV3 Chrome extension (local-only posture, contract-tested). Not store-distributed. [VC] |
| Documentation debt | Significant: several shipped capabilities were undocumented (scorecards, bulk actions, digests runtime, extension details); several documented capabilities don't exist (feed posts, video calls, certificates issuance, i18n, X-User-Email injection, CLAUDE.md port map). Full ledgers: Traceability §6. [VC] |
| Known liabilities | Reset-password route gap; orphaned gamification service; dual toast systems; dual realtime paths; dead exports; backend tests unrunnable locally; unbatched analytics writes. [VC] |

---

## 3. Stakeholders & Segments

| Stakeholder | Type | Interest | Engagement surface |
|---|---|---|---|
| Candidates (`USER`) [VC] | Primary customer | Find work, grow skills/network | Jobs, Applications, LMS, Challenges, Network, Messages, Resume, Profile, AI |
| Recruiters (`RECRUITER`) [VC] | Supply-side customer | Source & manage pipelines | Post-a-Job Studio, Candidates (notes/scorecards/bulk/interview planner), Dashboard variant |
| Admins (`ADMIN`) [VC] | Internal operator | Health, safety, insight | Admin console (stats, observability links, automation status, audit logs, analytics insights) |
| Platform Ops [VC] | Internal | Scheduler reliability | Digest/reminder scripts, audit trail, system_settings (table exists; UI absent) |
| Extension users [VC] | Power segment | Frictionless capture | LinkedIn/Indeed/Glassdoor scrape → local drafts |
| Payment provider (Stripe) [VC] | Vendor | — | Scaffolded Edge Functions; dormant until ADR-005 exit |
| Content/seed operators [VC] | Internal | Safe environment data | Token-gated seed pipeline |

Personas P-A…P-D and journeys J-1…J-8 unchanged from PRD §2.3; flow-level detail: Traceability §5.

---

## 4. Business Objectives & Success Criteria

| # | Objective | Success criterion | Status |
|---|---|---|---|
| BO-1 | Unify fragmented career workflows into one product | All primary journeys completable in-product without third-party tools | Achieved for J-1…J-6 [VC]; certificate step absent |
| BO-2 | Earn trust via honest AI | 100% of AI outputs review-gated; no undocumented autonomous mutation | Achieved [VC]; engine currently heuristic — copy must not overclaim [REC] |
| BO-3 | Ship resilient UX that survives partial failure | Degradation labeled on every remote-backed surface; no silent fake data (landing stats precedent) | Achieved [VC] |
| BO-4 | Build two-sided marketplace liquidity | Recruiter posting volume ↔ candidate application conversion | Instrumentation partially present; K-04/K-05 not yet computed [PLN] |
| BO-5 | Monetize via subscriptions when market fit proven | ADR-005 exit criteria met → live Stripe | Blocked by design [VC] |
| BO-6 | Keep platform auditable & safe | RLS on all private data; audit log for sensitive actions; scheduler runs audited | Achieved (110 RLS policies, audit_log + admin UI) [VC] |
| BO-7 | Grow engaged learning/practice habits | Enrollment completion, challenge participation streaks | Events exist; dashboards PLN |

---

## 5. Business Requirements (with real implementation status)

> These supersede BR-01…BR-10 of v1.x. Traceability to features/stories/code: CODEBASE_TRACEABILITY.md §4.

| ID | Business requirement | Rationale | Implementation status |
|---|---|---|---|
| BR-01 | Provide authenticated role-scoped access (USER/RECRUITER/ADMIN) with one primary owner per screen | Security + IA clarity | **Implemented** [VC] (route registry + test:ia; reset-password sub-gap logged) |
| BR-02 | Let candidates discover jobs via search/filter/save/hide and act through a draft-first application studio | Core loop value | **Implemented** [VC] |
| BR-03 | Let recruiters publish quality-gated jobs and manage candidate pipelines (notes, scorecards, gated bulk actions, interview planning) | Supply-side retention | **Implemented** — previously undocumented discovery [VC] |
| BR-04 | Deliver structured learning (catalog/enroll/progress) resilient to backend outage | Learning habit formation | **Implemented** via gateway→Supabase fallback [VC] |
| BR-05 | Provide skill practice with fair evaluation (sample checks first, recorded submissions, retry history, XP-once) | Skill signaling integrity | **Implemented**; leaderboard/badge UI orphaned → **Partially** at product level [VC] |
| BR-06 | Enable professional networking with consent-based connections and scheduled reminders | Network effects | **Implemented** [VC] (block capability unreachable — decision pending) |
| BR-07 | Provide direct messaging with realtime reads and attachment safety | Engagement stickiness | **Implemented** [VC] |
| BR-08 | Offer review-gated AI assistance across resume, matching, career path, chat, and task automation — never auto-mutating user data | Trust differentiation | **Implemented** with heuristic engine; live-model integration PLN [VC] |
| BR-09 | Notify users through a unified center + bell preview + digest system with quiet hours and dedupe | Re-engagement without spam | **Implemented**; execution relies on external scheduler scripts [VC] |
| BR-10 | Operate billing as explicitly-labeled demo until ADR-005 exit | Legal/financial safety | **Implemented (by design)** [VC] |
| BR-11 | Give admins observability, audit, automation-status, and analytics insight in one console | Operational control | **Implemented (read-heavy)** [VC] |
| BR-12 | Provide a strictly-local capture companion (extension) that feeds the same draft pipelines | Top-of-funnel capture | **Implemented** — undocumented discovery; contract-tested local-only [VC] |
| BR-13 | Instrument product behavior honestly (canonical events, workflow catalogs, degraded-state telemetry) | Evidence-driven iteration | **Implemented**; batching REC [VC] |

---

## 6. Business Rules Ledger (verified)

Supersedes RU-01…RU-15 of v1.x. Each rule is enforced somewhere real:

| ID | Rule | Enforcement point | Status |
|---|---|---|---|
| RU-01 | Roles are exactly USER/RECRUITER/ADMIN; route access follows PRD §2.2 matrix | `routeRegistry.ts` gatekeeper | Active [VC] |
| RU-02 | Exactly one primary feature owner per route | `featureOwnership.ts` + `npm run test:ia` | Active [VC] |
| RU-03 | Job lifecycle: DRAFT→PUBLISHED→(CLOSED\|ARCHIVED) | `job_status` enum + PostJob gating | Active [VC] |
| RU-04 | Publish requires completeness + no duplicate posting match (`canPublishRecruiterPosting`) | PostJob studio | Active [VC] |
| RU-05 | Application status flows PENDING→REVIEWED→INTERVIEW→(OFFER\|REJECTED) | `application_status` enum + timeline UI | Active [VC] |
| RU-06 | One active application record per user/job pair while not withdrawn | service logic [INF — re-verify exact unique constraint] | Active [UNK-detail] |
| RU-07 | Withdrawal deletes the application record; resubmission permitted | `withdrawApplication` delete semantics | Active [VC] — changed from v1 claim of soft-cancel |
| RU-08 | Enrollment is idempotent; duplicate enroll returns existing record | lmsService | Active [VC] |
| RU-09 | Enrollment statuses ENROLLED→IN_PROGRESS→(COMPLETED\|DROPPED) | `enrollment_status` enum | Active [VC] |
| RU-10 | XP awarded exactly once per challenge pass | DB uniqueness view on submissions | Active [VC] |
| RU-11 | Challenge submission records sample-check outcome + passed_tests before status resolution | challengeService flow | Active [VC] |
| RU-12 | Connections require initiator note optional, recipient accept/decline; withdrawals allowed; BLOCKED defined in schema but unreachable from UI | networkingService + types gap | Active w/ known gap [VC] |
| RU-13 | Message attachments must satisfy size cap + MIME allowlist before send | client-side validation | Active [VC] |
| RU-14 | Read receipts propagate at conversation level; per-message DELIVERED state unused | markRead implementation | Active [VC] |
| RU-15 | All AI outputs persist as `draft`; promotion requires explicit save; dismissal retained | `review_status ∈ {draft,saved,dismissed}` | Active [VC] |
| RU-16 | Notification digests dedupe on `delivery_key`; frequencies immediate/daily/weekly/off; quiet hours honored | digest tables/service + settingsService | Active [VC] |
| RU-17 | Mark-all-read is destructive-confirmable only via dialog | NotificationsPage | Active [VC] |
| RU-18 | Billing surfaces always label demo mode; no live charge paths callable | ADR-005 + `billingMode:'demo'` export | Active [VC] |
| RU-19 | Account deletion requires typed confirmation phrase | SecuritySettings | Active [VC] |
| RU-20 | Row-level security governs every private table (110 policies) | supabase-schema.sql | Active [VC] |
| RU-21 | Sensitive admin-visible actions write `audit_log` rows (actor, entity, old/new, ip, ua) | schema + admin audit browser | Active [VC] |
| RU-22 | Background schedulers run with service-role credentials and leave auditable run records | scripts/*.mjs | Active [VC] |
| RU-23 | Seed data truncation requires literal token `I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA`, validated pre-run | validate-seed-data-safety.mjs | Active [VC] |
| RU-24 | Extension stores scraped/draft data locally only; no account transmission | contract test | Active [VC] |
| RU-25 | Analytics failures degrade silently (localStorage ring buffer ≤100) and never block UX | trackEvent fallback | Active [VC] |
| RU-26 | Provider/vendor errors are never surfaced verbatim to users (safe-failure copy standard) | shell/service patterns + degraded_state_shown telemetry | Active [VC] |

Rules proposed (not yet enforced): RU-R1 batched analytics writes; RU-R2 prod builds strip dev backdoor; RU-R3 connection BLOCKED either implemented or removed; RU-R4 data-retention schedule for drafts/analytics. → Recommended Improvements R-series.

---

## 7. Business Processes (as-operated)

| ID | Process | Owner surface | Notes |
|---|---|---|---|
| BP-1 | Candidate journey: discover → save/search → draft → review-submit → track | F-04/F-05 | J-1/J-2 |
| BP-2 | Recruiter pipeline: publish (gated) → queue → notes/scorecards → gated bulk actions → interview planner | F-06/F-07 | J-3; bulk actions always review+confirm |
| BP-3 | Learning loop: browse → enroll (idempotent) → progress → complete | F-08 | degradation banners on fallback |
| BP-4 | Practice loop: pick → workspace → sample checks → submit/retry | F-09 | XP-once rule RU-10 |
| BP-5 | Notification ops: event → notification row → (immediate \| digest via scheduler) → center/bell → read | F-16 | scheduler = external scripts, audited |
| BP-6 | Networking cadence: suggestions → connect/note → respond → reminder scheduling | F-10 | reminders script |
| BP-7 | Extension capture: scrape listing → local draft → manual import to web app | F-21 | strictly local until import |
| BP-8 | Admin oversight: stats → observability links → automation status → audit review → analytics insights | F-19 | read-heavy by design |
| BP-9 | Environment data ops: token-gated seed/truncate cycle | seed-data.sql + validator | guardrail RU-23 |

---

## 8. Commercial Model & Metrics

### 8.1 Commercial posture
Free-tier product today. Plans catalog + checkout/portal scaffolds exist end-to-end but inert (`billingMode:'demo'`). Pricing tiers beyond seeded plan rows: undecided (Q-1). ADR-005 gates live payments. [VC]

### 8.2 Existing metrics infrastructure [VC]
Canonical events (task lifecycle, suggestion lifecycle, prefill accept/reject, bulk-action reviews, error recovery, degraded-state shown) + 17 workflow recorder catalogs (resume 43 actions, networking ~30, messaging 20, LMS 15…) → `product_analytics_events` (+ localStorage fallback ≤100) → Admin insights card.

### 8.3 KPI framework (recommended targets; instrumentation mapped in Traceability §7)
| ID | KPI | Definition | Baseline |
|---|---|---|---|
| K-01 | Activation rate | % new signups completing ≥1 core action in 7d | UNK — needs computation [PLN] |
| K-02 | WAU | Weekly active users | PLN |
| K-03 | Search→apply conversion | applications / job searches | PLN (events exist) |
| K-04 | Posting liquidity | active postings per recruiter/mo | PLN |
| K-05 | Application response rate | recruiter status moves / applications | PLN |
| K-06 | Course completion rate | COMPLETED / enrollments | PLN (enum ready) |
| K-07 | Challenge participation | submissions/user/wk | PLN |
| K-08 | First-pass success | PASSED without retry / submissions | PLN |
| K-09 | Connection acceptance rate | ACCEPTED / sent | PLN |
| K-10 | Message responsiveness | median reply latency | PLN |
| K-11 | AI suggestion acceptance | saved / generated suggestions | Computable now from events [VC] |
| K-12 | Prefill utility | prefill_used vs rejected | Computable now [VC] |
| K-13 | Digest engagement | action_url clicks / delivered digests | Needs click capture [PLN] |
| K-14 | D30 retention | cohort survival | PLN |
| K-15 | Degraded-experience rate | degraded_state_shown / sessions | Computable now [VC] |

---

## 9. Compliance, Governance & Data Protection

| Area | Obligation | Status |
|---|---|---|
| Access control | Role matrix + RLS on all private data | Met (110 policies) [VC] |
| Auditability | Sensitive-action audit trail incl. ip/ua, old/new values | Met (audit_log + admin UI) [VC] |
| Automation governance | Human-in-the-loop for AI mutations; scheduler run audit | Met [VC] |
| User data rights | Self-service deletion (typed confirm); local-first drafts; extension locality | Partially met — formal export/retention policy absent [REC/Q-6] |
| Safety copy standards | No vendor error leakage; labeled degradation | Met [VC] |
| Financial | No charging without ADR-005 exit; demo labeling everywhere | Met [VC] |
| CI security | Secret scanning + Trivy scans on every push | Met [VD/VC] |
| Accessibility commitment | a11y/contrast/keyboard test suites in CI | Met [VC] |

---

## 10. Risks & Dependencies

| ID | Risk / dependency | Impact | Mitigation |
|---|---|---|---|
| RK-01 | Heuristic AI under-delivers vs marketing language | Churn, trust loss | Disclosure panels exist; copy audit + live-model roadmap |
| RK-02 | External scheduler scripts = operational SPOF | Missed digests/reminders | Audited runs + admin status; HA plan Phase 3 |
| RK-03 | Supabase concentration (auth/db/realtime/functions) | Vendor lock-in | Gateway abstraction already proven in LMS pattern |
| RK-04 | Backend services under-tested locally (~43 files, CI-only) | Regression risk | Add Maven wrapper or dockerized test target |
| RK-05 | Doc/code drift misleads contributors & stakeholders | Wasted effort, bad decisions | This BRD/PRD v2 + Traceability as canonical; fix CLAUDE.md ports |
| RK-06 | Demo billing confusion | Support load, legal exposure | RU-18 labels; keep until exit criteria |
| RK-07 | Unbatched analytics inserts | DB cost at scale | RU-R1 batching |
| RK-08 | Dev backdoor user leakage to prod build | Auth bypass | Env-guard tests now; prod-strip assertion RU-R2 |
| RK-09 | Extension store policy changes | Funnel loss | Local-only posture simplifies review; monitor Q-2 |
| RK-10 | Orphaned gamification sets false expectations (badges in schema/UI strings, no surface) | Trust | Wire or cut (Phase 2) |

Dependencies: Supabase platform SLA · file-service availability for uploads · CI runners for the only backend test execution · parent-repo workflow (`talentsphere-ci.yml`) ownership.

---

## 11. Scope Control

**In scope:** all *Implemented* items across PRD §4 (F-01…F-21).
**Explicitly out of scope (proven absent — do not promise):** social feed authoring (feed is profile-synthesized only), certificate issuance (`certificate_url` passthrough only), video calls (no such URLs exist), mentorship, referrals, i18n, live payments, leaderboard UI.
**Deferred (documented intent):** live LLM provider behind existing contracts; Stripe activation; modular monolith consolidation (`apps/backend` skeleton unbuilt); i18n; cross-browser certification.

---

## 12. Assumptions & Constraints

| # | Item | Class |
|---|---|---|
| A-1 | Single-region Supabase deployment acceptable near-term | ASM |
| A-2 | Recruiter network/messages access intended (routes allow; product copy unclear) | INF → Q-7 |
| A-3 | Heuristic AI acceptable until Q-9 vendor/privacy decisions land | ASM |
| C-1 | Windows-first dev environments; cmd shell conventions | Constraint |
| C-2 | Frontend tests must stay <60s to preserve CI velocity target | VD |
| C-3 | No secrets in client bundle; all privileged ops server/scheduler-side | Constraint (enforced by scan + patterns) |
| C-4 | Docs precedence PLAN.md > ARCHITECTURE_STATUS_INDEX.md > SSOT.md(stale) | VD |

---

*End of BRD v2.0. Any status dispute resolves via evidence rows in CODEBASE_TRACEABILITY.md.*
