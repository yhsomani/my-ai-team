# TalentSphere — Codebase Traceability & Gap Analysis

> Documentation status: Current code-verified traceability, journey, and gap-analysis baseline. Aligned to PRD v3.0 / BRD v3.0 / Unified Schema Baseline. Update whenever features, routes, or flows change.

| | |
|---|---|
| **Version** | 3.0 — aligned to [PRD v3.0](./PRD.md) / [BRD v3.0](./BRD.md) / [Unified Schema Baseline](../infra/db/migrations/0001_initial_baseline.sql) |
| **Date** | 2026-09-06 |
| **Role** | Evidence backbone for [PRD v3.0](./PRD.md) and [BRD v3.0](./BRD.md). Every status claim in those documents resolves to a row here. |
| **Method** | Codebase audit of `TalentSphere-Unified` across all layers: (1) page components and routes, (2) services and Supabase data layer, (3) shell/auth/a11y/analytics/config, (4) backend/schema/seeds/schedulers/CI/extension. |

Evidence labels per PRD §0.2 ([VC] codebase · [VD] docs · [INF] inferred · [ASM] assumption · [REC] recommendation · [PLN] planned · [UNK] unknown).

---

## 1. Traceability Model

```
Business Requirement (BR-xx)
  └─ Product Feature (F-01..F-25)      → PRD §4
       └─ Capability / Story           → §2 rows below
            ├─ Code surface (files)    → §2 evidence column
            ├─ Business rule (RU-xx)   → BRD §6
            └─ Flow & AC (J-1..J-8)    → §3
```

---

## 2. Master Traceability Matrix

Legend — Status: ✅ Implemented · 🟡 Partial / Demo-mode · ❌ Absent (documented-only) · 👻 Orphaned (code exists, no UI consumer).

| BR | Feature | Key capabilities | Primary code surface(s) | Rules | Status |
|---|---|---|---|---|---|
| BR-01 | F-01 Auth & Session | register(`?role=`), login, logout, session restore, 401 single-flight refresh, reset password, dev override, MF host | `authService.ts`, `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `lib/registrationOnboarding.ts` (oauth.ts deferred per FF-001) | RU-01, RU-26 | ✅ [VC] |
| BR-01 | F-02 Landing stats | real public counts + labeled fallbacks | `LandingPage.tsx` | RU-26 | ✅ [VC] |
| BR-01/BO-6 | F-03 Dashboard | Candidate/Recruiter dashboards, staged activation checklist (Foundation/Discovery/Growth), partial data handling | `DashboardPage.tsx`, `recruiterFunnelAnalytics.ts` | RU-02, RU-26 | ✅ [VC] |
| BR-02 | F-04 Job marketplace | search/filter/pagination(cursor+offset), saved searches, alerts+digests source, hide-from-explore, excluded types, templates/draft history, company attach, tabs | `JobsPage.tsx`, `jobService.ts` (935 ln), `saved_job_searches`, `notification_digest_items`, localStorage helpers | RU-03, RU-04 | ✅ [VC] |
| BR-02 | F-05 Application studio | local-first drafts, account sync, versions/history, review dialog, AI prefill handoff, withdraw(delete), timeline | `applicationService.ts`, Application Studio UI (`ApplicationsPage.tsx`) | RU-05, RU-06, RU-07 | ✅ [VC] |
| BR-03 | F-06 Candidate review & pipeline | queue, private notes, scorecards, interview planner, gated bulk actions, recruiter funnel metrics | `CandidatesPage.tsx`, `recruiterService.ts`, `recruiterFunnelAnalytics.ts` | RU-26 | ✅ [VC] |
| BR-03 | F-07 Post-a-Job studio | guided composer, publish gating, duplicate match, templates, draft history, company attach | `PostJobPage.tsx`, `canPublishRecruiterPosting` | RU-03, RU-04 | ✅ [VC] |
| BR-04 | F-08 LMS | catalog/pagination/filters, idempotent enroll, progress+filters, gateway→Supabase fallback w/ banners, AI handoff, XP award loop | `LMSPage.tsx`, `lmsService.ts` (1112 ln), `gamificationService.ts` | RU-08, RU-09 | ✅ [VC] |
| BR-05 | F-09 Challenges arena | filters, Monaco workspace, reset-review, sample checks, submissions+retry history, XP award loop | `ChallengesPage.tsx`, editor workspace, `challengeService.ts`, `gamificationService.ts` | RU-10, RU-11 | ✅ [VC] |
| BR-06 | F-10 Networking | suggestions(mutual counts), dismissals, preferences, note connect, accept/decline/withdraw, reminders script, preview drawer | `NetworkingPage.tsx`, `networkingService.ts`, `run-networking-reminders.mjs` | RU-12 | ✅ [VC] |
| BR-07 | F-11 Messaging | paginated convos+messages, send/retry, attachment validation, conversation mark-read, Supabase Realtime, reply suggestions | `MessagingPage.tsx`, `messagingService.ts`, `postgres_changes` subscription | RU-13, RU-14 | ✅ [VC] |
| BR-08 | F-12 AI assistant | persisted sessions, provenance normalization, automation suggestions(draft/saved/dismissed), task lifecycle, heuristics engine | `AIAssistantPage.tsx`, `aiService.ts`, `aiSlice.ts` | RU-15 | ✅ [VC] (heuristic engine) |
| BR-08 | F-13 Career path | read-only guidance, Review Boundaries panel, alert+retry | `AICareerPathPage.tsx` | RU-15 | ✅ [VC] |
| BR-08 | F-14 Resume builder | section tabs, import field-review, 4 export modes, artifact tombstones, export history, 43-action analytics | `ResumePage.tsx`, `resumeService.ts`, `lib/resumePdfExport.ts` | RU-25, RU-26 | ✅ [VC] |
| BR-02/06 | F-15 Profile | info CRUD w/ modal-scoped failures, avatar crop/removal review, skills/rank, timezone-safe dates (`parseDateInput`) | `ProfilePage.tsx`, `ProfileDetailPage.tsx`, `parseDateInput` | RU-26 | ✅ [VC] |
| BR-09 | F-16 Notifications | history/unread filter/mark read, confirm mark-all, degraded banner logic, bell preview+badge, cross-tab event, digests+quiet hours, scheduler runtime, click-through telemetry | `NotificationsPage.tsx`, NotificationContext, `notificationDigestService.ts`, `run-notification-digests.mjs`, `discover-saved-search-digests.mjs` | RU-16, RU-17, RU-22 | ✅ [VC] |
| BR-10 | F-17 Billing (demo) | plans(features JSON, provider_price_id), history, checkout intent demo-labeled, portal stub, Edge Functions | `BillingPage.tsx`, `paymentService.ts`, 3 Edge Functions | RU-18 | 🟡 [VC] (ADR-005 demo mode) |
| BR-09 | F-18 Settings | notification prefs(digest/quiet hours), billing snapshot, profile settings, password change, typed-confirm deletion | `SettingsPage.tsx`, `settingsService.ts` | RU-19 | ✅ [VC] |
| BR-01/BO-6 | F-19 Admin console & write governance | stats, observability links, automation status, audit browser, analytics insights, system settings write panel, user moderation panel, data compliance & retention controls, GDPR CSV export | `AdminPage.tsx`, `AdminDashboard.tsx`, `adminService.ts`, `SystemSettingsPanel.tsx`, `AdminUsersPanel.tsx`, `DataCompliancePanel.tsx`, `csvExport.ts` | RU-20, RU-21 | ✅ [VC] |
| BR-13 | F-20 Command search | ⌘/Ctrl-K palette, grouped results, debounce+stale-guard, `?q=` consume-once deep links | `CommandSearch.tsx`, `lib/unifiedSearch.ts` | — | ✅ [VC] |
| BO-3 | F-21 Error recovery & shell behaviors | dark mode, reduced-motion kill switch, focus-visible tokens, header avatar menu dropdown, safe-failure standard | `ErrorBoundary.tsx`, ThemeContext/AuraThemeProvider, token CSS, `Header.tsx` | RU-26 | ✅ [VC] |
| BR-13 | F-22 Product analytics & event pipeline | 14 canonical events, 17 workflow catalogs, direct insert + ≤100 localStorage fallback, admin insights card | `productAnalytics`, workflow recorders, `product_analytics_events`, `run-kpi-aggregations.mjs` | RU-25 | ✅ [VC] |
| BR-05 | F-23 Gamification system | Header XP badge, level progress, leaderboard modal, XP ledger with 200 daily cap and deduplication, DB `UNIQUE(user_id, reference_type, reference_id)` constraint | `GamificationHeaderBadge.tsx`, `LeaderboardModal.tsx`, `gamificationService.ts`, `xpLedger.ts`, `xp_transactions` table | RU-10, RU-11 | ✅ [VC] |
| BR-10 | F-24 Entitlements & access control | plan/role decoupling into 17 functional permission keys, quota management, TTL cache, ADR-005 demo metadata | `entitlementService.ts`, `types/entitlements.ts` | RU-18 | ✅ [VC] |
| BR-01 | F-25 Trust & safety moderation | canonical `content_reports` schema, multi-target reporting modal, reporter RLS, admin moderation triage queue (resolve/dismiss/ban) | `content_reports` table, `trustAndSafetyService.ts`, `ReportContentModal.tsx`, `TrustAndSafetyModerationQueue.tsx` | RU-26 | ✅ [VC] |

---

## 3. User Flows (J-1…J-8) with Acceptance Criteria anchors

| Flow | Path | Critical AC (verified) |
|---|---|---|
| J-1 Candidate discovery→apply | Jobs explore → filters/save → job detail → studio draft → review dialog → submit → timeline | Draft survives reload (localStorage); submit blocked without review confirm; withdraw deletes record |
| J-2 Candidate learning | LMS browse → enroll → progress → complete → XP award | Double-enroll returns same enrollment; fallback shows banner, never blank; 25 XP awarded on completion |
| J-3 Recruiter pipeline | Post job (gated) → candidates queue → notes/scorecard → bulk status (review+confirm) → planner | Publish blocked on incomplete/duplicate; bulk action impossible without confirm step; funnel metrics computed |
| J-4 Networking cadence | Suggestions → connect(note) → recipient accept/decline → reminder scheduled → notification | Withdrawn invites removable; reminders dedupe via digest delivery_key |
| J-5 Messaging exchange | Conversations → thread paginate → attach(validated) → send/retry → realtime read receipts | Oversized/disallowed attachment rejected client-side; unread clears via conversation-level mark-read |
| J-6 AI-assisted improvement | Assistant chat → suggestion draft → save/dismiss → optional prefill into app/resume/LMS | No mutation without explicit save; provenance visible; degraded states labeled |
| J-7 Account ops & compliance | Settings → prefs/password/delete; billing snapshot; GDPR CSV export; notifications hygiene | Deletion needs typed phrase; mark-all needs dialog; checkout always demo-labeled; export packages user records |
| J-8 Admin oversight & moderation | Stats → observability links → automation status → audit log review → moderation queue triage → retention controls | Audit rows include actor/entity/ip/ua; moderation updates update content report status; retention policies editable |

Screen-state matrices (loading/empty/error/degraded per screen) follow the standard quartet enforced by shell patterns [VC].

---

## 4. Requirement → Code Index (fast lookup)

| Concern | File(s) |
|---|---|
| Route registry & role gates | `apps/frontend/src/navigation/routeRegistry.ts`; ownership `featureOwnership.ts` (+ `npm run test:ia`) |
| HTTP client, JWT attach, 401 single-flight, logout redirect | shared apiClient (baseURL `VITE_API_BASE_URL`, timeout 30000) |
| Supabase clients & generated types | `supabaseClient` ↔ `infra/db/generated/database.types.ts` |
| Canonical schema (50 tables / 119 RLS / 15 enums / 70 FKs) | `infra/db/migrations/0001_initial_baseline.sql` ↔ `supabase-schema.sql`; fixtures `seed-data.sql` |
| Schedulers & KPI aggregations | `scripts/run-notification-digests.mjs`, `scripts/discover-saved-search-digests.mjs`, `scripts/run-networking-reminders.mjs`, `scripts/run-kpi-aggregations.mjs` |
| Payments scaffold & Entitlements | Edge Functions `create-checkout-session`, `create-subscription`, `create-billing-portal-session`; `entitlementService.ts`; ADR-005 |
| Analytics pipeline | `productAnalytics` core + 17 recorder modules (`resumeWorkflowAnalytics` …) → `product_analytics_events` |
| Realtime | Supabase Realtime (`postgres_changes` on messages, notifications); socket.io channel in NotificationContext |
| CI & Repository Validators | parent-repo `talentsphere-ci.yml`: lint/typecheck/unit/e2e/a11y/security + 22 automated repository validators |
| Backend inventory | ~19 Spring modules (historical/secondary); `ApiResponse` envelope; gateway header injection `X-User-Id`,`X-User-Role` |
| Extension | MV3 sources + locality contract test suite |
| Trust & Safety | `content_reports` table, `trustAndSafetyService.ts`, `ReportContentModal.tsx`, `TrustAndSafetyModerationQueue.tsx` |
| Gamification | `GamificationHeaderBadge.tsx`, `LeaderboardModal.tsx`, `gamificationService.ts`, `xpLedger.ts`, `xp_transactions` |

---

## 5. Discovery Ledger — Implemented but Previously Undocumented

All items below were discovered during reverse audit and are now formally governed by PRD v3.0 / BRD v3.0:

1. Candidate scorecards + private notes + interview-planner integration + gated bulk actions (F-06).
2. Saved-search **digest discovery** scheduler and `notification_digest_items` machinery incl. quiet hours.
3. Networking **reminder scheduling** background job.
4. Reply suggestions in messaging.
5. Posting **templates** + draft autosave **history**.
6. Company-profile completion util + posting↔company attach flow.
7. Hidden-job **preference insights**.
8. Registration onboarding signals lib.
9. Export-history + artifact **tombstones** in resume builder.
10. Dark mode + reduced-motion kill switch + Header avatar dropdown menu.
11. E2E/dev auth backdoor (`mock-user-dev-001`) and its guard tests.
12. Chrome extension full capability set + locality contract test.
13. Scheduler scripts' service-role audited-run pattern + admin automation-status mirroring.
14. Trust & Safety content reporting modal and admin moderation queue.
15. GDPR compliance panel + multi-entity CSV data export.

---

## 6. Gap Analysis

### 6.1 Documented but Not Implemented (provable absences — tracked as intentional decisions or future backlog)
- Feed posts/comments/likes (feed is profile-synthesized only; full authoring out of scope per PRD §1.7).
- Certificates (schema passes `certificate_url` through only; PDF generation deferred per Q-10).
- Video calls (video-service exists in backend, no WebRTC frontend implementation per Q-3).
- Mentorship & Referrals (deliberate non-additions per RECOMMENDED_IMPROVEMENTS Part C).
- i18n (single language English; deferred to Phase 3+).
- OAuth login UI (`oauth.ts` deferred per FF-001 `enable_social_oauth: false`).
- WebSocket chat transport (Supabase Realtime is the active transport).
- Supabase Storage buckets (file service uses AWS S3 / REST multipart).
- Gateway injection of `X-User-Email` (Gateway injects `X-User-Id` and `X-User-Role`).
- Monolith vs 19-service layout (reconciled in PRD §1.6 as hybrid Supabase-first + Spring Boot microservices).

### 6.2 Implemented but Not Documented
All 15 discovery items from §5 are fully codified in PRD v3.0 / BRD v3.0.

### 6.3 Resolved Historical Gaps (Verified Shipped)
| Item | Resolution |
|---|---|
| **F-23 Gamification UI** | **Delivered & verified [VC]**: `GamificationHeaderBadge` & `LeaderboardModal` wired in `Header.tsx`, XP award loops on challenges/LMS with 200 XP cap & DB deduplication |
| **F-25 Trust & Safety** | **Delivered & verified [VC]**: `content_reports` schema, RLS policies, `ReportContentModal.tsx`, `trustAndSafetyService.ts`, and admin moderation queue |
| **Password Reset** | **Delivered & verified [VC]**: `/reset-password` route, `ResetPasswordPage.tsx` component, `authService.resetPassword()` integration |
| **Admin Write Governance** | **Delivered & verified [VC]**: `SystemSettingsPanel.tsx`, `AdminUsersPanel.tsx`, `DataCompliancePanel.tsx`, `csvExport.ts` in `AdminDashboard.tsx` |
| **KPI Framework** | **Delivered & verified [VC]**: `scripts/run-kpi-aggregations.mjs` calculating K-11, K-12, K-15, K-16, K-18 with digest click-through telemetry |
| **Header Avatar Dropdown** | **Delivered & verified [VC]**: Profile/Settings/Logout menu in `Header.tsx` |

### 6.4 Controlled Technical Debt & Known Limitations
- Billing remains in ADR-005 demo mode (`billingMode: 'demo'`).
- Local backend testing without Maven wrapper / 28-service reactor environment (CI executes backend verification).
- Dual toast systems (ToastContext + custom toast components) functional but candidate for future consolidation.

---

## 7. KPI Instrumentation Map (feeds BRD §8.3 & `run-kpi-aggregations.mjs`)

| KPI | Description | Status & Calculation Engine |
|---|---|---|
| **K-01** | Candidate Activation Rate | ✅ Tracked via profile/onboarding events |
| **K-02** | Recruiter Search-to-Shortlist | ✅ Tracked via recruiter funnel analytics |
| **K-03** | Application Completion Rate | ✅ Tracked via application lifecycle events |
| **K-04** | Time-to-First-Review | ✅ Recruiter funnel analytics SLA tracking |
| **K-05** | Candidate Response Rate | ✅ Messaging and application events |
| **K-06** | Course Completion Rate | ✅ LMS enrollment progress tracking |
| **K-07** | Challenge Pass Rate | ✅ Challenge submission records |
| **K-08** | Challenge Engagement & XP | ✅ XP transactions ledger |
| **K-09** | Connection Acceptance Rate | ✅ Networking invitation states |
| **K-10** | Messaging Response Time | ✅ Realtime message timestamps |
| **K-11** | AI Suggestion Acceptance Rate | ✅ Calculated in `run-kpi-aggregations.mjs` |
| **K-12** | AI Prefill Utilization Rate | ✅ Calculated in `run-kpi-aggregations.mjs` |
| **K-13** | Notification Digest CTR | ✅ Click-through telemetry with `isDigestClick` |
| **K-14** | 30-Day User Retention | ✅ Auth and activity event logs |
| **K-15** | Degradation Rate | ✅ Calculated in `run-kpi-aggregations.mjs` |
| **K-16** | Feature Flag Health | ✅ Calculated in `run-kpi-aggregations.mjs` |
| **K-17** | Data Compliance SLA | ✅ `DataCompliancePanel` retention tracking |
| **K-18** | Trust & Safety Report Resolution Time | ✅ Calculated in `run-kpi-aggregations.mjs` |

---

## 8. Verification Changelog

| Prior claim / gap | Verified reality in v3.0 |
|---|---|
| "Gamification orphaned" | F-23 gamification header badge, leaderboard modal, and XP award loop wired across challenges & LMS with DB deduplication |
| "No trust & safety reporting" | F-25 multi-target content reporting modal + admin moderation triage queue and canonical `content_reports` schema |
| "Password reset missing route" | Verified `/reset-password` route, `ResetPasswordPage.tsx`, and `authService.resetPassword()` with session check |
| "Admin read-only" | F-19 admin write governance: system settings management, user suspension/role edit, retention policy controls, GDPR CSV export |
| "94.2% match rate landing stat" | Replaced with live counts + labeled fallback (shipped) |
| "Profile/resume dates UTC-shifted" | Fixed via shared `parseDateInput` (local-midnight parsing) |
| "Withdraw = soft cancel" | Delete-based; resubmission allowed (RU-07 rewritten) |
| "AI powered by external model" | Local heuristics only; provenance-labeled |
| "Digest delivery in-app" | External audited scheduler scripts + click-through telemetry |
| "Storage buckets via Supabase" | file-service multipart REST / AWS S3 |

*Maintain this file as the single dispute-resolution ledger for any "is it really implemented?" question.*
