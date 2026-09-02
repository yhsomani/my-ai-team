# TalentSphere — Quality Control & Recommended Improvements

> Documentation status: Current quality-control register aligned to PRD v2.0 / BRD v2.0. Re-validate recommendations against the codebase before acting on them.

| | |
|---|---|
| **Version** | 2.0 — aligned to [PRD v2.0](./PRD.md) / [BRD v2.0](./BRD.md) / [Codebase Traceability](./CODEBASE_TRACEABILITY.md) |
| **Date** | 2026-08-22 |
| **Supersedes** | v1.x of this file (its local BR-01…BR-10 / F-xx / RU-xx / Q-xx meanings collided with the v2 registers; all IDs below now resolve against the v2 documents exclusively) |
| **Scope** | Requirement-traceability deltas, quality-control review outcomes, and the recommended-improvements register. The full BR→Feature→Story→Code→Flow→AC matrix lives in CODEBASE_TRACEABILITY.md §2–§3 and is not duplicated here. |

---

## Part A — Requirement Traceability Deltas

Primary chain (all requirements): see **CODEBASE_TRACEABILITY.md §2**. Items that remain *untraceable or deliberately untraced*, re-evaluated against v2:

| Item | v1 status | v2 resolution |
|---|---|---|
| Chrome extension | Untraceable — no BR claimed it | **Resolved**: claimed by BR-12, traced to F-21 extension row [VC] |
| `video-service` (backend) | Blocked on ship/repurpose/retire question | Still untraced — no product surface exists anywhere (proven absence, Traceability §6.1); folds into Q-3 backend-endgame decision |
| Pricing/packaging specifics | Not invented | Still open under Q-1; BR-10 traces demo-mode readiness only |
| Marketing/GTM programs | Out of product-doc scope | Unchanged — business-process gap for owner |
| Trust & safety reporting surface | Recommended only (old F-20) | Still absent (proven absence); carried as R-07 remainder below; related discovery: schema `BLOCKED` connection status unreachable (RU-12 gap) |
| Privacy export | Recommended privacy center (old F-21) | Partially delivered by Settings typed-confirm deletion (FR-F18-1); data **export** + retention policy remain open (Q-6) |

---

## Part B — Quality-Control Review Outcomes

| # | Issue found | Class | v2 resolution |
|---|---|---|---|
| QC-1 | Vision mandates 19 microservices while unified app runs Supabase-first | Contradiction (major) | Codified as architectural context (PRD §1.6): services verified present-but-secondary; hybrid gateway→Supabase fallback proven in LMS; ratification still required (Q-3) |
| QC-2 | Fabricated public stat ("94.2% match rate") | Trust defect | **Fixed & verified**: live counts + labeled fallback (F-02, FR rule in PRD §5; safe-failure standard RU-26) |
| QC-3 | UTC date parsing showed wrong months west of UTC | Real product bug | **Fixed & verified**: shared `parseDateInput` in ProfilePage/ResumeBuilder; recurrence prevention = R-11 |
| QC-4 | Billing UI could imply live payments | Compliance risk | Binding: ADR-005 + `billingMode:'demo'` export + mandatory labels (RU-18, BR-10) |
| QC-5 | No trust & safety surface | Missing requirement | **Delivered & verified**: `ReportContentModal` + `trustAndSafetyService` multi-target reporting hooks + admin moderation triage queue in `AdminDashboard.tsx` (R-07) |
| QC-6 | Privacy limited to deactivation | Missing requirement | Deletion w/ typed confirmation shipped (Settings); export/retention open (Q-6, R-rec pending) |
| QC-7 | Notification strategy in-app only; email parity unverified | Gap | **Largely delivered since**: unified center, bell preview, digests (daily/weekly/immediate/off), quiet hours, dedupe keys, external audited schedulers (F-16). Email channel still absent — retained inside R-04 remainder |
| QC-8 | Gamification confined to challenges | Missed synergy | Sharpened by discovery: full `gamificationService` + leaderboard view + badges exist with **zero UI consumers** (orphan 👻); wire-or-cut decision logged (RSK-07, roadmap Phase 2); unified-ledger proposal R-06 unchanged |
| QC-9 | Success metrics undefined despite events existing | Measurement gap | K-01…K-15 ratified (BRD §8.3) with instrumentation map (Traceability §7); K-11/K-12/K-15 computable today from existing events |
| QC-10 | Docs rot precedent (stale SSOT) | Operational risk | Addressed by v2 rewrite (codebase-authoritative) + precedence order (PRD §1.6); recurring defense = R-12 |
| QC-11 | Duplicate-application prevention not evidenced | Business-rule gap | Upgraded by audit: service logic indicates one-active-per-job [INF] → RU-06 recorded **active, detail UNK**; enforcement test required before closing |
| QC-12 | Timezone/locale assumptions implicit | Technical debt | Central utility shipped (QC-3); string externalization deferred with i18n (proven absence; roadmap Phase 3) |

Open-question register: **PRD §12 (Q-1…Q-10)** — single source; none silently invented.

---

## Part C — Recommended Improvements Register

Format: Original approach → Recommendation → Why → Priority → v2 status annotation.

| ID | Original | Recommended | Why | Pri | v2 status |
|---|---|---|---|---|---|
| R-02 | Profile completion scattered across Profile/Dashboard | Unified activation checklist on first-run dashboard + staged nudges | Activation = strongest retention lever (K-01); underlying signals already tracked | P1 | **Delivered & verified** — staged progression model (Foundation, Discovery, Growth), interactive stage tabs, dynamic stage nudges, and completion celebration shipped in `DashboardPage.tsx` |
| R-04 | In-app notifications only | Channel×type preference matrix + quiet hours + email digests via email-service | Fatigue control; completes re-engagement loop (K-13) | P1 | **Partially delivered** — in-app prefs incl. quiet hours + digest frequencies shipped (F-16); email channel remains open |
| R-05 | Manual pipeline triage | Posting-level funnel analytics + 7-day idle SLA nudges | Silent stalls churn recruiters; feeds K-04/K-05 | P1 | Open — scorecard/planner surfaces exist (F-06) to host nudges |
| R-06 | XP tied to challenges only | Single XP ledger across learning/challenges/milestones + anti-farm caps | Compounding habit engine; integrity by design (K-08/K-15) | P1 | **Sharpened** — orphaned gamification service + XP-once view give a concrete wiring target before any ledger expansion |
| R-07 | Completeness-only publishing | Pre-publish quality checks + report/moderation hooks into admin queue | Marketplace trust precedes scale | P1 | **Delivered & verified** — multi-target content reporting modal + admin moderation triage queue and lifecycle hooks shipped (`trustAndSafetyService.ts`, `AdminDashboard.tsx`) |
| R-10 | Raw billing rows gate features | Entitlement service decoupling plan→permissions before live payments | Clean ADR-005 cutover; testable gating pre-revenue | P1 | **Delivered & verified** — `entitlementService.ts` decouples tier plans/roles into 17 functional keys, quotas, TTL caching, and ADR-005 demo billing metadata |
| R-11 | Ad-hoc date handling | Central date utilities + lint ban on bare `new Date(string)` | UTC bug class proved recurrence risk | P0 (small) | **Half-delivered** — `parseDateInput` shipped; lint rule not yet added |
| R-12 | Informal docs precedence | Quarterly doc-audit task + deprecation banners on stale docs | Stale-SSOT incident already occurred | P2 | Process adopted for v2 rewrite itself; recurring task still to schedule |
| R-13 | Accessibility strong-by-practice, unratified | Ratify WCAG 2.2 AA; axe-CI on critical flows | Converts culture into guarantee | P1 | Open — a11y/contrast/keyboard suites already in CI make ratification cheap |
| R-14 | Service-level search queries | Define Elasticsearch trigger thresholds (>50k listings OR p95>500ms) | Avoid premature infra; protect UX at scale | P2 | Open — aligns with Q-3 backend endgame |

**Deliberate non-additions (scope discipline, re-affirmed against proven-absence ledger):** social feed authoring, native apps, video interviews (folded into `video-service` decision Q-3), enterprise ATS features, i18n (Phase 3+). Each fails at least one of {user value now, feasibility, focus}.

---

*Maintained alongside PRD/BRD/CODEBASE_TRACEABILITY; update all four when any Q-register item resolves. Any status dispute resolves via evidence rows in CODEBASE_TRACEABILITY.md.*
