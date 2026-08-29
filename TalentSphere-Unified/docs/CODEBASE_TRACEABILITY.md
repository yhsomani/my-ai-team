# TalentSphere — Codebase Traceability & Gap Analysis

> Documentation status: Current code-verified traceability, journey, and gap-analysis baseline. Update whenever features, routes, or flows change.

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-08-22 |
| **Role** | Evidence backbone for [PRD v2.0](./PRD.md) and [BRD v2.0](./BRD.md). Every status claim in those documents resolves to a row here. |
| **Method** | Read-only audit of `TalentSphere-Unified` on 2026-08-22 by four parallel exploration passes: (1) page components, (2) services/data layer, (3) shell/auth/a11y/analytics/config, (4) backend/schema/seeds/schedulers/CI/extension. |

Evidence labels per PRD §0.2 ([VC] codebase · [VD] docs · [INF] inferred · [ASM] assumption · [REC] recommendation · [PLN] planned · [UNK] unknown).

---

## 1. Traceability Model

```
Business Requirement (BR-xx)
  └─ Product Feature (F-xx)            → PRD §4
       └─ Capability / Story           → §2 rows below
            ├─ Code surface (files)    → §2 evidence column
            ├─ Business rule (RU-xx)   → BRD §6
            └─ Flow & AC (J-x / AC-x)  → §3
```

---

## 2. Master Traceability Matrix

Legend — Status: ✅ Implemented · 🟡 Partial · ❌ Absent (documented-only) · 👻 Orphaned (code exists, no UI consumer).

| BR | Feature | Key capabilities | Primary code surface(s) | Rules | Status |
|---|---|---|---|---|---|
| BR-01 | F-01 Auth & Session | register(`?role=`), login, logout, session restore, 401 single-flight refresh, reset password, dev override, MF host | `authService.ts`, `LoginPage.tsx`, `RegisterPage.tsx`, axios interceptors, `lib/registrationOnboarding.ts` 👻(oauth.ts dead), route gatekeeper | RU-01, RU-26 | ✅ (reset-password route ❌) |
| BR-01 | F-02 Landing stats | real public counts + labeled fallbacks | `LandingPage.tsx` | RU-26 | ✅ |
| BR-01/BO-6 | F-19 Admin console | stats, observability links, automation status, audit browser, analytics insights | `AdminPage.tsx` + subviews, `adminService.ts` (1011 ln) | RU-21 | ✅ (getAllUsers/system_settings 👻) |
| BR-02 | F-04 Job marketplace | search/filter/pagination(cursor+offset), saved searches, alerts+digests source, hide-from-explore, excluded types, templates/draft history, company attach, tabs | `JobsPage.tsx`, `jobService.ts` (935 ln), `saved_job_searches`, `notification_digest_items`, localStorage helpers | RU-03, RU-04(publish side) | ✅ |
| BR-02 | F-05 Application studio | local-first drafts, account sync, versions/history, review dialog, AI prefill handoff, withdraw(delete), timeline | `applicationService.ts`, Application Studio UI | RU-05, RU-06[UNK-detail], RU-07 | ✅ |
| BR-03 | F-06 Candidate mgmt | queue, private notes, scorecards, interview planner, gated bulk actions | `CandidatesPage.tsx`, `recruiterService.ts` (675 ln) | RU-26 | ✅ (was undocumented) |
| BR-03 | F-07 Post-a-Job studio | guided composer, publish gating, duplicate match, templates, draft history, company attach | `PostJobPage.tsx`, `canPublishRecruiterPosting` | RU-03, RU-04 | ✅ |
| BR-04 | F-08 LMS | catalog/pagination/filters, idempotent enroll, progress+filters, gateway→Supabase fallback w/ banners, AI handoff | `LMSPage.tsx`, `lmsService.ts` (1112 ln) | RU-08, RU-09 | ✅ |
| BR-05 | F-09 Challenges | filters, Monaco workspace, reset-review, sample checks, submissions+retry history, XP-once | `ChallengesPage.tsx`, editor workspace, challengeService, XP view | RU-10, RU-11 | ✅ (gamification layer 👻; Judge0 [UNK]) |
| BR-06 | F-10 Networking | suggestions(mutual counts), dismissals, preferences, note connect, accept/decline/withdraw, reminders script, preview drawer | `NetworkPage.tsx`, `networkingService.ts`, `run-networking-reminders.mjs` | RU-12 | ✅ (BLOCKED unreachable) |
| BR-07 | F-11 Messaging | paginated convos+messages, send/retry, attachment validation, conversation mark-read, Supabase Realtime, reply suggestions | `MessagingPage.tsx`, `messagingService.ts`, `postgres_changes` subscription | RU-13, RU-14 | ✅ (websocket.ts 👻; DELIVERED unused) |
| BR-08 | F-12 AI assistant | persisted sessions, provenance normalization, automation suggestions(draft/saved/dismissed), task lifecycle, heuristics engine | `AIAssistantPage.tsx` (948 ln), `aiService.ts`, aiSlice | RU-15 | ✅ (engine = heuristic [VC]) |
| BR-08 | F-13 Career path | read-only guidance, Review Boundaries panel, alert+retry | `AICareerPathPage.tsx` (241 ln) | RU-15 | ✅ |
| BR-08 | F-14 Resume builder | section tabs, import field-review, 4 export modes, artifact tombstones, export history, 43-action analytics | `ResumeBuilderPage.tsx`, `resumeService.ts`, `lib/resumePdfExport.ts` | RU-25/26 adjacent | ✅ |
| BR-02/06 | F-15 Profile | info CRUD w/ modal-scoped failures, avatar crop/removal review, skills/rank, timezone-safe dates | `ProfilePage.tsx`, `ProfileDetailPage.tsx`, `parseDateInput` | — | ✅ |
| BR-09 | F-16 Notifications | history/unread filter/mark read, confirm mark-all, degraded banner logic, bell preview+badge, cross-tab event, digests+quiet hours, scheduler runtime | `NotificationsPage.tsx`, NotificationContext, `notificationDigestService.ts`, bell dropdown, `run-notification-digests.mjs`, `discover-saved-search-digests.mjs` | RU-16, RU-17, RU-22 | ✅ |
| BR-10 | F-17 Billing (demo) | plans(features JSON, provider_price_id), history, checkout intent demo-labeled, portal stub, Edge Functions | `BillingPage.tsx`, `paymentService.ts`, 3 Edge Functions | RU-18 | 🟡 by design (ADR-005) |
| BR-09 | F-18 Settings | notification prefs(digest/quiet hours), billing snapshot, profile settings, password change, typed-confirm deletion | `SettingsPage.tsx`, `settingsService.ts` | RU-19 | ✅ |
| BR-13 | F-20 Universal search | ⌘/Ctrl-K palette, grouped results, debounce+stale-guard, `?q=` consume-once deep links | `CommandSearch.tsx`, `lib/unifiedSearch.ts` | — | ✅ |
| BR-12 | F-21 Extension | MV3 scrape (LinkedIn/Indeed/Glassdoor), local drafts, resume-match, planner, locality contract test | extension/ MV3 sources + contract test | RU-24 | ✅ (was undocumented) |
| BR-13 | F-21 Analytics system | 14 canonical events, 17 workflow catalogs, direct insert + ≤100 localStorage fallback, admin insights card | `productAnalytics`, workflow recorders, `product_analytics_events` | RU-25 | ✅ (batching REC) |
| BO-3 | F-21 Shell behaviors | dark mode, reduced-motion kill switch, focus-visible tokens, dual toasts, safe-failure standard | ThemeContext/AuraThemeProvider, token CSS, Toast + ToastContext | RU-26 | ✅ (toast unification REC) |

---

## 3. User Flows (J-1…J-8) with Acceptance Criteria anchors

| Flow | Path | Critical AC (verified) |
|---|---|---|
| J-1 Candidate discovery→apply | Jobs explore → filters/save → job detail → studio draft → review dialog → submit → timeline | Draft survives reload (localStorage); submit blocked without review confirm; withdraw deletes record |
| J-2 Candidate learning | LMS browse → enroll → progress → complete | Double-enroll returns same enrollment; fallback shows banner, never blank |
| J-3 Recruiter pipeline | Post job (gated) → candidates queue → notes/scorecard → bulk status (review+confirm) → planner | Publish blocked on incomplete/duplicate; bulk action impossible without confirm step |
| J-4 Networking cadence | Suggestions → connect(note) → recipient accept/decline → reminder scheduled → notification | Withdrawn invites removable; reminders dedupe via digest delivery_key |
| J-5 Messaging exchange | Conversations → thread paginate → attach(validated) → send/retry → realtime read receipts | Oversized/disallowed attachment rejected client-side; unread clears via conversation-level mark-read |
| J-6 AI-assisted improvement | Assistant chat → suggestion draft → save/dismiss → optional prefill into app/resume/LMS | No mutation without explicit save; provenance visible; degraded states labeled |
| J-7 Account ops | Settings → prefs/password/delete; billing snapshot; notifications hygiene | Deletion needs typed phrase; mark-all needs dialog; checkout always demo-labeled |
| J-8 Admin oversight | Stats → observability links → automation status → audit log review → analytics insights | Audit rows include actor/entity/ip/ua; automation panel mirrors scheduler builders |

Screen-state matrices (loading/empty/error/degraded per screen) follow the standard quartet enforced by shell patterns [VC]; notable deviations are listed in §6.

---

## 4. Requirement → Code Index (fast lookup)

| Concern | File(s) |
|---|---|
| Route registry & role gates | `apps/frontend/src/navigation/routeRegistry.ts`; ownership `featureOwnership.ts` (+ `npm run test:ia`) |
| HTTP client, JWT attach, 401 single-flight, logout redirect | shared apiClient (baseURL `VITE_API_BASE_URL`, timeout 30000) |
| Supabase clients & generated types | `supabaseClient` ↔ `infra/db/generated/database.types.ts` |
| Schema (49 tables / 110 RLS / 12 enums) | `supabase-schema.sql`; fixtures `seed-data.sql` (token-gated) + validator script |
| Schedulers | `scripts/run-notification-digests.mjs`, `scripts/discover-saved-search-digests.mjs`, `scripts/run-networking-reminders.mjs` |
| Payments scaffold | Edge Functions `create-checkout-session`, `create-subscription`, `create-billing-portal-session`; ADR-005 |
| Analytics pipeline | productAnalytics core + 17 recorder modules (`resumeWorkflowAnalytics` …) → `product_analytics_events` |
| Realtime | Supabase Realtime (messages); socket.io channel in NotificationContext |
| CI | parent-repo `talentsphere-ci.yml`: lint/typecheck/unit/e2e/a11y/security/docker |
| Backend inventory | ~19 Spring modules; `ApiResponse` envelope on 22/23 controllers; gateway header injection `X-User-Id`,`X-User-Role`; RabbitMQ publishers ×5; ~40 `enable_*` flags |
| Extension | MV3 sources + locality contract test |

---

## 5. Discovery Ledger — Implemented but Previously Undocumented

Found in code; absent from all v1 docs:

1. Candidate scorecards + private notes + interview-planner integration + gated bulk actions (F-06).
2. Saved-search **digest discovery** scheduler and `notification_digest_items` machinery incl. quiet hours.
3. Networking **reminder scheduling** background job.
4. Reply suggestions in messaging.
5. Posting **templates** + draft autosave **history**.
6. Company-profile completion util + posting↔company attach flow.
7. Hidden-job **preference insights**.
8. Registration onboarding signals lib.
9. Export-history + artifact **tombstones** in resume builder.
10. Dark mode + reduced-motion kill switch (behavior existed; undocumented).
11. E2E/dev auth backdoor (`mock-user-dev-001`) and its guard tests.
12. Chrome extension full capability set + locality contract test.
13. Scheduler scripts' service-role audited-run pattern + admin automation-status mirroring.

---

## 6. Gap Analysis

### 6.1 Documented but Not Implemented (provable absences — remove or build)
Feed posts/comments/likes (feed is profile-synthesized only) · certificate issuance (schema passes `certificate_url` through only) · video calls (no such URLs anywhere) · mentorship · referrals · i18n · OAuth login UI (`oauth.ts` orphaned) · WebSocket chat transport (Supabase Realtime is the actual path) · Supabase Storage buckets (none defined; uploads use file-service REST) · gateway injection of `X-User-Email` (only Id+Role injected) · `apps/backend` modular monolith (skeleton only) · CLAUDE.md port registry values (diverge from actual configs).

### 6.2 Implemented but Not Documented
See §5 ledger (all now folded into PRD/BRD v2).

### 6.3 Partially Implemented
| Item | Present | Missing |
|---|---|---|
| Gamification | schema (badges, XP-once view, leaderboard view), full `gamificationService` | Any UI consumer — zero imports; leaderboard invisible to users 👻 |
| Billing | plans/history/checkout/portal scaffolds | Live charging (by design, ADR-005) |
| Password reset | authService.resetPassword | `/reset-password` route/page |
| Notifications digests | storage, frequencies, quiet hours, schedulers | In-app execution (external scripts), click-through capture for K-13 |
| Connection blocking | DB enum BLOCKED | Types/UI path (unreachable) |
| Message DELIVERED | enum value | Any producer/consumer |
| Backend testing | ~43 test files run in CI | Local runnability (no Maven wrapper) |
| Admin user/settings management | service methods (`getAllUsers`, `getSystemSettings`) | UI consumers 👻 |

### 6.4 Inconsistencies (doc/code/type drift)
CLAUDE.md ports & X-User-Email claim vs reality · `.env.example` advertises unused storage buckets · README/feed claims vs synthesized feed · challenge difficulty type union (legacy Low/Medium/High/Extreme) vs enum EASY/MEDIUM/HARD · connection_status types omit BLOCKED · two parallel realtime transports (socket.io notifications vs Supabase messages) · dev script port 3000 vs Vite config 3001 proxy · skills typing duplicated/conflicting (`types/skills.ts` orphaned) · SSOT.md self-declared stale yet still referenced elsewhere.

### 6.5 Missing Requirements (never specified anywhere)
Password-reset completion UX (post-token form) · header avatar menu (profile/logout entry point) · data-retention/export policy for drafts & analytics (Q-6) · certificate strategy decision (Q-10) · recruiter scope statement for network/messages (Q-7) · cross-browser support matrix · Judge0 execution contract (Q-5).

### 6.6 Dead Code / Technical Debt Inventory [VC]
Orphaned libs: `oauth.ts`, `websocket.ts`, `searchTokenizer.ts`, `types/skills.ts` · Orphaned service methods: `applyToJob`(et al.) in jobService, `markMessageAsRead`(per-message), `getAllUsers`, `getSystemSettings` · Orphaned slice: partial `aiSlice` redundancy · Unwired shell components: MobileMenu variants, AuraStatusBar usage gaps · Dual toast systems · Unbatched analytics inserts · Decorative header avatar · Gamification service+schema with no consumer.

---

## 7. KPI Instrumentation Map (feeds BRD §8.3)

| KPI | Required events (status) |
|---|---|
| K-11 AI acceptance | `automation_suggestion_generated/saved/dismissed` ✅ exist |
| K-12 Prefill utility | `workflow_prefill_used/rejected` ✅ |
| K-15 Degradation rate | `degraded_state_shown` ✅ |
| K-03/K-05 conversion/response | job/application events partially present; need funnel joins [PLN] |
| K-06 course completion | enrollment status transitions in DB ✅; computation PLN |
| K-07/K-08 challenge metrics | submission records incl. retry history ✅; computation PLN |
| K-09/K-10 network/messaging | connection + message events partial; latency metric PLN |
| K-13 digest engagement | delivery rows ✅; **click capture missing** [REC] |
| K-01/K-02/K-14 activation/WAU/retention | raw events exist; cohort jobs absent [PLN] |

---

## 8. Verification Changelog (v1.x → v2.0 corrections)

| Prior claim | Verified reality |
|---|---|
| "94.2% match rate" landing stat | Replaced with live counts + labeled fallback (shipped) |
| Profile/resume dates UTC-shifted | Fixed via shared `parseDateInput` (local-midnight parsing) |
| Withdraw = soft cancel | Delete-based; resubmission allowed (RU-07 rewritten) |
| "AI powered by external model" | Local heuristics only; provenance-labeled |
| Digest delivery in-app | External audited scheduler scripts |
| Docs silent on scorecards/bulk actions | Shipped and gated (now documented) |
| Gateway forwards user email | Injects Id+Role only |
| Storage buckets via Supabase | file-service multipart REST |

*Maintain this file as the single dispute-resolution ledger for any "is it really implemented?" question.*
