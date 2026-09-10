# TalentSphere — Implementation/Documentation Truth Baseline (Phase 1)

> Documentation status: Current living reconciliation truth baseline.

> **Phase**: 1 of the reconstruction lifecycle — the mandatory, non-negotiable truth
> baseline. Produced **before** any cleanup, redesign, removal, or architecture decision.
> Every row below is classified against the actual codebase state as of 2026-09-07, with
> evidence (file paths / verified checks) rather than pointers to source documents.
>
> **Headline verification**: `136/136` test files pass, `824/824` tests pass (`vitest run`),
> `tsc --noEmit` clean. All 19 protected routes in `routeRegistry.ts` map to a lazy-loaded
> component in `App.tsx`. Dead components from prior iterations are deleted from the tree.
>
> **Reconciliation close** (2026-09-07): §4 contradictions C-1/C-2/C-3 resolved.
> `CURRENT_STATE_AND_ACTION_PLAN.md` updated: 22 fully implemented, 136 test files,
> 824 test cases, 119 RLS policies. Master Truth Matrix published at
> `docs/MASTER_TRUTH_MATRIX.md` — that is now the authoritative baseline document.

## 1. Classification Model

A requirement/feature is classified into exactly one state, by evidence in the tree:

| State | Meaning |
|-------|---------|
| **Implemented** | Present in code, wired end-to-end, passing its tests |
| **Partially implemented** | Present but with a documented, deliberate limitation (ADR) or missing sub-piece |
| **Missing / absent** | No code, schema, component, or service exists |
| **Contradictory** | Doc/impl disagree, or two code paths disagree; needs a single reconciled answer |
| **Obsolete / dead** | Present but unreachable, unused, or superseded; safe-removal candidate |
| **Newly introduced** | Added in this reconstruction cycle; NOT in the original SSOT feature list; first-class |

## 2. Canonical Feature Reconciliation (F-01..F-25)

### ✅ Implemented (verified in tree + passing tests)

| ID | Feature | State | Evidence |
|----|---------|-------|----------|
| F-01 | Auth & Session | Implemented | `authService.ts`, `LoginPage/RegisterPage/ResetPasswordPage`, `authSlice`; RBAC guards in `routeRegistry` |
| F-02 | Public Landing | Implemented | `LandingPage.tsx` + test |
| F-03 | Dashboard | Implemented | `DashboardPage.tsx` + workflow tests |
| F-04 | Job Marketplace | Implemented | `JobsPage.tsx`, `jobService.ts` + application workflow tests |
| F-05 | Post Job Studio | Implemented | `PostJobPage.tsx`, `jobPostDraftHistory`, `jobPostTemplates` + tests |
| F-06 | Candidate Review Pipeline | Implemented | `CandidatesPage.tsx` — pipeline-stage filter, pagination, search, bulk actions, scorecards, SLA |
| F-07 | LMS | Implemented | `LMSPage.tsx` + workflow tests |
| F-08 | Challenges Arena | Implemented | `ChallengesPage.tsx` + `challengeEvaluation.ts` (new) + tests |
| F-09 | Professional Networking | Implemented | `NetworkingPage.tsx`, `networkingService.ts` + workflow tests |
| F-10 | Direct Messaging | Implemented | `MessagingPage.tsx` (attachments, mark-read, reply suggestions, DELIVERED state) + tests |
| F-11 | AI Career Assistant | Implemented | `AIAssistant.tsx`, `AICareerPath.tsx` (heuristic) + tests |
| F-12 | Profile Management | Implemented | `ProfilePage.tsx` + AI suggestion libs + tests |
| F-13 | Resume Builder | Implemented | `ResumeBuilder.tsx`, `resumePdfExport`, `resumeImportDrafts`, `resumeArtifactLibrary` + tests |
| F-14 | Notifications | Implemented | `NotificationsPage.tsx`, `notificationService` + workflow tests |
| F-15 | Settings | Implemented | `SettingsPage.tsx` + workflow tests |
| F-16 | Billing | **Partially implemented** | `BillingPage.tsx`, `paymentService.ts` — explicit DEMO mode per ADR-005 (live Stripe blocked by design) |
| F-17 | Admin Console | Implemented | `AdminDashboard.tsx` + 4 admin panels (see §3) + tests |
| F-18 | Chrome Extension | Implemented | MV3 extension, 8 test suites (separate workspace) |
| F-19 | Product Analytics | Implemented | `productAnalytics.ts`, `product_analytics_events` + tests |
| F-20 | Command Search | Implemented | route-search destinations + keyboard nav + tests |
| F-21 | Error Recovery | Implemented | `ErrorBoundary`, safe-failure copy, retry workflows + tests |
| F-22 | Gamification | Implemented | `LeaderboardModal`, `GamificationHeaderBadge`, `xpLedger` (XP(L)=50·L·(L−1); Level inversion) + tests |
| F-23 | (Gamification UI) | Implemented | resolved P-02; wired in `Header` + award loops in Challenges/LMS |
| F-24 | Trust & Safety | Implemented | `ReportContentModal`, `TrustAndSafetyModerationQueue`, `trustAndSafetyService` + tests |
| F-25 | Job Detail | Implemented | `JobDetailPage.tsx` (new) — see §3 |

### 🟡 Partially implemented (deliberate, ADR-documented)

| ID | Feature | Limitation | Decision |
|----|---------|-----------|----------|
| P-01 / F-16 | Billing live charging | Demo mode only | ADR-005 — until provider checkout verified |
| P-06 | Backend JUnit tests | Not runnable locally (no Maven wrapper / Docker in this env) | CI-only; frontend verified here |

### ❌ Missing / absent (documented, no code/schema/service exists)

`A-01` Feed Posts, `A-02` Certificates, `A-03` Video Calls (WebRTC), `A-04` Mentorship,
`A-05` Referrals, `A-06` i18n, `A-07` OAuth UI flow, `A-08` WebSocket transport (uses
Supabase Realtime by design), `A-09` Supabase storage buckets, `A-10` gateway X-User-Email.

These are **out-of-scope for this reconstruction cycle** — none block the 21+ implemented
features, and all are documented as intentional gaps or roadmap items. No action until a
specific one is prioritized.

## 3. Newly Introduced (first-class, NOT in original SSOT feature list)

Added during this reconstruction cycle; each is source-backed, wired, and tested:

| Item | Evidence | Purpose |
|------|----------|---------|
| **Portfolio Showcase** (`/portfolio`) | `pages/portfolio/PortfolioPage.tsx`, `portfolioData.ts`, `routeRegistry` main nav, `PortfolioPage.test.tsx` | Engineering case-study showcase with category filtering + responsive grid |
| **Job Detail Page** | `pages/jobs/JobDetailPage.tsx` + test; route `job-detail` | Full single-job view with apply entry point |
| **Challenge Evaluation engine** | `lib/challengeEvaluation.ts` + test | Sample-case scoring (0–100, partial credit) |
| **CSV Export util** | `lib/csvExport.ts` + test | RFC-4180-style serialization |
| **History Manager** | `lib/historyManager.ts` | Shared localStorage history primitives (dedupes draft-history libs) |
| **Admin panels** | `components/admin/{AdminUsersPanel,SystemSettingsPanel,FeatureFlagsPanel,DataCompliancePanel}.tsx` (+ FeatureFlagsPanel.test) | Extend Admin Console (F-17) |
| **Candidate ATS pipeline-stage filter** | `CandidatesPage.tsx` + test | Applied/Screening/Interview/Offer/Rejected direct filtering (F-06 extension) |

**Classification note**: these are additive and non-contradictory. They should be
promoted into the canonical SSOT feature list at reconciliation close so the docs stop
lagging the tree.

## 4. Contradictions Found (doc vs. tree — must reconcile)

These are concrete drifts between the documentation baseline and the verified codebase:

1. **`CURRENT_STATE_AND_ACTION_PLAN.md` P-03 (OAuth)** — doc says `lib/oauth.ts` exists and
   is orphaned/dead; the tree contains **no** `lib/oauth.ts` (verified via Glob) and no
   `enable_social_oauth` flag. **State: resolved — doc is stale, delete the row.**
2. **`CURRENT_STATE_AND_ACTION_PLAN.md` P-05 (Message DELIVERED)** — doc says the enum is
   "unused in flow"; the tree uses it: `types/messaging.ts:16`, `MessagingPage.tsx:599`
   ("Delivered"), `messagingService.test.ts`. **State: resolved — doc is stale, delete the row.**
3. **`CURRENT_STATE_AND_ACTION_PLAN.md` F-count** — doc lists 21 fully implemented + lists
   `portfolio`, `job-detail`, admin panels, and ATS filter only as gaps/notes; the tree has
   them implemented and tested. **State: reconcile the count and promote new features (see §3).**

## 5. Observed Dead Code (already removed this cycle)

Verified deleted from the tree (git shows `D`): `MobileMenu`, `LegacyHelpers`,
`PostCard`, `StatCard`, `SyncStatusBar`, `NotificationContext`, `useAuraTransition`,
`activationChecklist`, `searchTokenizer`, `websocket`. All had no live importers at removal
time. No further dead-code candidates are known; the next phase's audit may surface more.

## 6. Standing Verdict

**PASS — RECONCILIATION CLOSED.** §4 contradictions C-1, C-2, and C-3 are resolved.
The Master Truth Matrix (`docs/MASTER_TRUTH_MATRIX.md`) is the authoritative
implementation/documentation reconciliation baseline. Phase 1 is complete. Proceed
to Phase 2 (priority fixes) against that matrix.

> Authoritative sources: `docs/PRD.md`, `docs/BRD.md`, `docs/GAP_ANALYSIS_AND_IMPLEMENTATION_PLAN.md`,
> `CURRENT_STATE_AND_ACTION_PLAN.md`, `SSOT.md`, and the verified `apps/frontend/src` tree
> (824/824 tests green, `tsc --noEmit` clean).
