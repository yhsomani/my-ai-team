# TalentSphere — Product Requirements Document (PRD)

> Documentation status: Current codebase-verified product requirements (v2.0). Keep synchronized with the implementation and docs/CODEBASE_TRACEABILITY.md.

| | |
|---|---|
| **Version** | 2.0 — Codebase-Verified Rewrite |
| **Date** | 2026-08-22 |
| **Authority** | Reverse-engineered from the actual repository (primary source of truth). Prior v1.x statements were corrected against code. |
| **Companions** | [BRD](./BRD.md) · [Codebase Traceability & Gap Analysis](./CODEBASE_TRACEABILITY.md) · [Recommended Improvements](./RECOMMENDED_IMPROVEMENTS.md) · ADR-001…005 (`docs/adr/`) |

---

## 0. Methodology & Label Legend

### 0.1 How this document was produced
Every claim below was audited against source on 2026-08-22: 21 frontend page components (`apps/frontend/src/pages/**`), ~40 service/library modules (`src/services`, `src/lib`), the Redux store (7 slices), the navigation registry (`src/navigation/routeRegistry.ts`), the Supabase schema (`supabase-schema.sql`: **49 tables, 110 RLS policies, 12 enums**), seed scripts, scheduler runtime scripts (`scripts/run-notification-digests.mjs` et al.), CI workflow, the Chrome extension, the Spring backend module inventory, and prior documentation (PLAN.md, ARCHITECTURE_STATUS_INDEX.md, SSOT.md, ADRs).

### 0.2 Evidence labels
| Label | Meaning |
|---|---|
| **[VC]** | Verified from Codebase — behavior confirmed by reading source and/or tests |
| **[VD]** | Verified from Documentation — stated in authoritative docs (PLAN.md, ADRs); code not independently traced here |
| **[INF]** | Inferred — strong structural evidence (naming, wiring, tests); end-to-end behavior not fully traced |
| **[ASM]** | Assumption — reasonable product assumption, unverified |
| **[REC]** | Recommendation — proposed improvement, not current behavior |
| **[PLN]** | Planned — documented intent, not built |
| **[UNK]** | Unknown — requires confirmation before relying on it |

### 0.3 Implementation-status values
**Implemented** · **Partially Implemented** · **Documented but Not Implemented** · **Implemented but Not Documented** (exists in code, was missing from all prior docs) · **Planned/Future** · **Unclear**

Discovered gaps, dead code, and contradictions are consolidated in [CODEBASE_TRACEABILITY.md §Gap Analysis].

---

## 1. Product Overview

### 1.1 Purpose
TalentSphere is an AI-assisted career platform unifying **job discovery**, **learning (LMS)**, **skill challenges**, **professional networking**, and **career-management tools** for candidates — plus **candidate management** and **job publishing** for recruiters, and platform administration for admins. [VC]

Product tagline shipped in `apps/frontend/index.html`: *"LinkedIn + Coursera + HackerRank, powered by AI."* [VC]

### 1.2 Vision & mission
Build the trusted career operating system where every AI output is reviewable, every failure degrades gracefully, and candidates own their data. [VD — PLAN.md]

### 1.3 Problem statement
Career management today is fragmented across job boards, course platforms, coding-practice sites, and networking apps; none of them assist with the actual work (tailoring resumes, drafting applications, planning learning) and none are honest about AI limitations. [ASM/VD]

### 1.4 Target users & value propositions
| Segment | Value proposition |
|---|---|
| Candidates (role `USER`) [VC] | One place to find jobs, track applications, learn skills, practice challenges, grow networks, build resumes, and get **review-gated** AI assistance |
| Recruiters (role `RECRUITER`) [VC] | Publish jobs with quality gates; manage candidate pipelines with notes, scorecards, bulk actions, and interview planning |
| Admins (role `ADMIN`) [VC] | Platform stats, service observability links, scheduled-automation status, audit logs, product-analytics insights |
| Companion users [VC] | Chrome extension (MV3) scrapes jobs from LinkedIn/Indeed/Glassdoor into a strictly **local** draft pipeline |

### 1.5 Scope
**In scope (this release):** everything tagged *Implemented* in §4. **Explicitly out of scope / proven absent** [VC]: social feed posting (feed is synthesized from profiles only), certificate issuance, video calls, mentorship, referrals, i18n, leaderboard UI (see F-09 note). See Traceability §6.1 for the full proven-absence list.

### 1.6 Architectural context (read first)
- **Supabase-first data plane**: Auth, Postgres + RLS, Realtime (messaging), Edge Functions (payments scaffolding). [VC]
- **Spring Boot microservices exist (~19 modules)** but are **secondary**; the SPA works without them via direct Supabase access and REST-with-fallback patterns. [VC]
- **Hybrid access pattern** (verified in LMS): API Gateway first → graceful Supabase fallback. [VC]
- **AI is currently heuristic**: `aiService.analyzeResume/getMatchScore/generateCareerPath/getChatResponse` run **local rule-based heuristics** — no external LLM call is wired. Provenance metadata marks outputs accordingly. [VC]
- **Billing is explicit DEMO mode** (ADR-005): `paymentService` exports `billingMode: 'demo'`; Edge Functions scaffold Stripe but no live charging. [VC]
- Docs precedence when sources conflict: PLAN.md + ARCHITECTURE_STATUS_INDEX.md > this PRD > SSOT.md (marked stale). [VD]

---

## 2. Users, Roles & Permissions

### 2.1 Roles [VC]
Enum `user_role`: `USER | ADMIN | RECRUITER` (`supabase-schema.sql`). Frontend gatekeeper uses `USER_ROLES.{user, recruiter, admin}` (`routeRegistry.ts`).

### 2.2 Route-level permission matrix [VC]
| Route | USER | RECRUITER | ADMIN | Nav placement |
|---|---|---|---|---|
| `/dashboard` | ✅ | ✅ (recruiter variant) | ✅ | Primary |
| `/jobs`, `/jobs/:id` | ✅ | ✅ | ✅ | Primary |
| `/jobs/post` | ❌ | ✅ | ❌ | Hidden (search-reachable) |
| `/candidates` | ❌ | ✅ | ❌ | Primary (recruiter) |
| `/lms` | ✅ | ❌ | ❌ | Primary |
| `/challenges` | ✅ | ❌ | ❌ | Primary |
| `/network`, `/messages` | ✅ | ✅* | ❌ | Primary (*recruiter access inferred [INF]) |
| `/ai` | ✅ | ✅ | ✅ | Primary |
| `/admin/*` | ❌ | ❌ | ✅ | Primary (admin) |
| `/billing`, `/settings` | ✅ | ✅ | ✅ | Hidden |
| `/profile` (own), `/profile/:userId` (alias) | ✅ | ✅ | ✅ | Hidden |
| `/resume`, `/career-path` | ✅ | ✅ | ✅ | Hidden (search-reachable) |
| `/notifications` | ✅ | ✅ | ✅ | Hidden (bell entry point) |
| `/login`, `/register`, `/` (landing) | public | public | public | — |
| `*` catch-all | `NotFoundPage` with **role-filtered search destinations** recovery [VC] | | | |

IA contract: **exactly one primary owner per route**, enforced by `featureOwnership.ts` + `npm run test:ia`. [VC]

### 2.3 Personas
P-A Candidate (Aisha) · P-B Recruiter (Rohan) · P-C Admin (Priya) · P-D Extension power-user (Dev). Journeys J-1…J-8 map 1:1 to the primary flows in §4 (see Traceability §5).

---

## 3. Information Architecture

Verified shell structure (`AppShell`, `AuraNavbar`, `AuraSidebar`, `AuraStatusBar`) [VC]:
- Desktop: sidebar primary nav + top bar (universal search trigger, notification bell with unread badge + dropdown preview, theme toggle, decorative avatar).
- Mobile: hamburger drawer nav; bottom tab bar for top-5 destinations; `MobileMenu`/`AuraStatusBar` variants exist but some are **not wired into the live shell** (debt — Traceability §6.6).
- Global keyboard: `Ctrl/Cmd+K` opens universal command search (F-20).
- Dark mode via `ThemeContext`/`AuraThemeProvider`, persisted preference. [VC]
- Dev/E2E auth override: mock user `mock-user-dev-001` with all three roles, dev-only fallback in the auth gatekeeper. [VC]

---

## 4. Feature Catalog (implementation-verified)

Status column reflects the **whole feature**; sub-capabilities carry their own tags. Every feature lists its primary code surface.

---

### F-01 — Authentication & Session Management — **Implemented** [VC]
Surface: `pages/LoginPage.tsx`, `RegisterPage.tsx`, `services/authService.ts` (pure Supabase Auth wrapper: register/login/logout/getCurrentUser/getSession/resetPassword/updateUser), Module Federation host exposing `AuthComponents` micro-frontend. [VC]
| Capability | Status | Notes |
|---|---|---|
| Email/password register & login | Implemented [VC] | Register accepts `?role=` param for recruiter signup [VC] |
| Logout | Implemented [VC] | Sidebar + mobile menu; **header avatar has no menu** (gap) |
| Password reset | Implemented [VC] | `authService.resetPassword` + `/reset-password` route + `ResetPasswordPage` component all wired and tested |
| Session restore & 401 recovery | Implemented [VC] | Axios interceptor promise-queue prevents refresh races; dispatches logout → `/login` |
| Registration onboarding signals | Implemented but Not Documented [VC] | `lib/registrationOnboarding.ts` post-registration flow |
| OAuth providers | Documented but Not Implemented [VC] | `lib/oauth.ts` is orphaned/dead code |

Acceptance criteria (representative): AC-1 unauthenticated access to protected routes redirects to `/login`; AC-2 login redirects by role; AC-3 concurrent 401s trigger exactly one refresh.

---

### F-02 — Public Landing Page with Honest Live Stats — **Implemented** [VC]
Surface: `pages/LandingPage.tsx`.
- Public hero + feature tour; **real counts** for registered profiles, open jobs, open challenges fetched live, with labeled fallback values when the fetch fails (never silent fake numbers). Replaced earlier fabricated "94.2% match rate". [VC]

AC: stats render real DB counts; on failure, fallback copy is explicitly labeled.

---

### F-03 — Dashboard (Candidate + Recruiter variants) — **Implemented** [VC]
Surface: `pages/DashboardPage.tsx`, `services/dashboardService.ts`.
- Role-routed variant rendering; aggregates via `Promise.allSettled` so partial upstream failures yield a **partial dashboard with meta.source = live|partial** instead of a blank page. [VC]
- Quick actions, recent applications/jobs, streaks, recommendations cards. [VC]

---

### F-04 — Job Marketplace — **Implemented** [VC]
Surface: `pages/JobsPage.tsx`, `services/jobService.ts` (935 lines).
| Capability | Status |
|---|---|
| Browse/search/filter (status, job_type, location, text search, salary min/max, limit/offset/cursor pagination) | Implemented [VC] — `JobQueryParams`, `PaginatedJobsResult` |
| Saved searches | Implemented [VC] — `saved_job_searches` table |
| Search-based **job alerts + daily/weekly digests** | Implemented [VC] — `discover-saved-search-digests.mjs` + `notification_digest_items` (delivery_key dedup, digest_frequency, action_url) |
| Hide-from-explore (with preference insights) | Implemented [VC] — localStorage-backed `hiddenExploreJobs`; insights lib surfaced in JobsPage |
| Excluded job types preference | Implemented but Not Documented [VC] |
| My postings / My applications tabs (recruiter/user split) | Implemented [VC] |
| Posting templates + draft autosave history | Implemented but Not Documented [VC] — `jobPostTemplates`, `jobPostDraftHistory` (localStorage) |
| Apply handoff to Application Studio | Implemented [VC] |
| Company attach during posting (with completion util) | Implemented but Not Documented [VC] |
| Dead exports (`applyToJob` etc.) | Debt [VC] — see Traceability §6.6 |

---

### F-05 — Application Studio (Draft-first lifecycle) — **Implemented** [VC]
Surface: `services/applicationService.ts`, Application Studio UI.
| Capability | Status |
|---|---|
| Local-first drafts (localStorage) + opt-in account sync | Implemented [VC] |
| Draft **versions & change history** | Implemented [VC] |
| Submit review dialog (pre-send checklist) | Implemented [VC] |
| AI draft assist handoff (assistant → application fields) | Implemented [VC] — `workflow_prefill_used/rejected` events |
| Withdraw | Implemented [VC] — **delete-based** (record removed; resubmission possible — rule RU-07 adjusted) |
| Status timeline (`application_status` PENDING→REVIEWED→INTERVIEW→OFFER/REJECTED) | Implemented [VC] |

---

### F-06 — Candidate Management (Recruiter) — **Implemented** (was largely undocumented) [VC]
Surface: `pages/CandidatesPage.tsx`, `services/recruiterService.ts` (675 lines).
- Pipeline queue; **private candidate notes**; **scorecards**; **interview planner integration** with bulk-status gating; **bulk actions gated behind review + confirm** (`bulk_action_reviewed/confirmed` events). [VC]
- Previously missing from all product docs → discovery finding. [VC]

---

### F-07 — Post-a-Job Studio — **Implemented** [VC]
Surface: `PostJobPage.tsx`.
- Guided multi-section composer; publish gating via `canPublishRecruiterPosting` (duplicate-match check, required-field completeness); templates + draft history (see F-04); company attach; publish → DRAFT/PUBLISHED lifecycle (`job_status` enum incl. CLOSED/ARCHIVED). [VC]

---

### F-08 — Learning (LMS) — **Implemented** [VC]
Surface: `pages/LMSPage.tsx`, `services/lmsService.ts` (1112 lines).
| Capability | Status |
|---|---|
| Catalog browse + pagination + filters | Implemented [VC] |
| Enroll (**idempotent**; duplicate enroll returns existing enrollment) | Implemented [VC] |
| Progress updates + progress-filter tabs | Implemented [VC] — `enrollment_status` ENROLLED/IN_PROGRESS/COMPLETED/DROPPED |
| **Gateway-first → Supabase-fallback hybrid access** | Implemented [VC] — degradation banners when falling back |
| AI learning-plan draft handoff | Implemented [VC] |

---

### F-09 — Skill Challenges — **Implemented** (gamification layer orphaned) [VC]
Surface: `pages/ChallengesPage.tsx` (+ editor workspace), `services/challengeService.ts`.
- Listing with category/difficulty filters (`challenge_category` FRONTEND…DATA_SCIENCE; `challenge_difficulty` EASY/MEDIUM/HARD). [VC]
- Monaco editor workspace; starter-code **reset requires review**; **local sample checks** before submit; submissions recorded (`passed_tests` boolean → PASSED/FAILED/SUBMITTED); retry history preserved. [VC]
- XP award rule: once per challenge pass (DB view enforces uniqueness). [VC]
- ⚠️ `gamificationService` (leaderboards, badges) is **fully implemented but consumed by zero UI** — schema supports a leaderboard view nobody renders. Partially Implemented as a product capability. [VC]
- Difficulty type union in frontend is messy vs enum (Low/Medium/High/Extreme legacy values) — inconsistency logged. [VC]
- Judge0 execution wiring: **Unknown** (stack lists it; no traced call) [UNK].

---

### F-10 — Professional Networking — **Implemented** [VC]
Surface: `pages/NetworkPage.tsx`, `services/networkingService.ts`.
- Suggestions with mutual-connection counts; dismissal memory; connection preferences; connect with optional note; accept/decline/withdraw; **reminder scheduling** (`run-networking-reminders.mjs` background job); profile preview drawer. [VC]
- Workflow analytics catalog ~30 actions. [VC]
- Gap: schema `connection_status` includes `BLOCKED`; frontend types/UI expose only PENDING/ACCEPTED/REJECTED — block is unreachable. [VC]

---

### F-11 — Direct Messaging — **Implemented** [VC]
Surface: `pages/MessagingPage.tsx`, `services/messagingService.ts`.
- Conversations list + messages, both paginated; send with retry; attachments validated client-side (size cap `maxMessageAttachmentBytes`, type allowlist); conversation-level mark-read; **realtime updates via Supabase Realtime** (`postgres_changes` on `messages`). [VC]
- Reply suggestions insertable into composer (analytics `reply_suggestion_inserted`). Implemented but Not Documented [VC]
- `message_status` SENT/DELIVERED/READ exists in enum; per-message mark-read helper is dead code — DELIVERED effectively unused. [VC]
- Legacy `websocket.ts` orphaned (realtime goes through Supabase, notifications through socket.io — two parallel realtime paths, documented as debt). [VC]

---

### F-12 — AI Career Assistant — **Implemented** (heuristic engine; review-gated) [VC]
Surface: `pages/AIAssistantPage.tsx` (948 lines), `services/aiService.ts`, `store/slices/aiSlice`.
- Chat sessions **persisted**; messages saved; provenance metadata normalized across response shapes. [VC]
- **Automation suggestions** (task detection, one-click task creation, dismissals) with statuses `review_status ∈ {draft, saved, dismissed}` — nothing applies without explicit user save. Events: `automation_suggestion_generated/saved/dismissed`, `task_started/completed/abandoned/failed`, `error_recovery_clicked`, `degraded_state_shown`. [VC]
- ⚠️ Engine honesty: `analyzeResume`, `getMatchScore`, `generateCareerPath`, `getChatResponse` are **local heuristics** — no external model call exists. Marketing/docs implying live LLM are inaccurate. [VC]
- `aiSlice` may be partially redundant with service-local state — flagged for cleanup. [INF]

---

### F-13 — AI Career Path Guidance — **Implemented** (read-only governance) [VC]
Surface: `pages/AICareerPathPage.tsx` (241 lines).
- Read-only guidance with explicit **"Review Boundaries" governance panel**; error card `role="alert"` + retry; no autonomous writes. [VC]

---

### F-14 — Resume Builder — **Implemented** [VC]
Surface: `ResumeBuilderPage.tsx`, `services/resumeService.ts`, `lib/resumePdfExport.ts`.
| Capability | Status |
|---|---|
| Editor tabs (sections) | Implemented [VC] |
| Import resume parse with **field-by-field review** | Implemented [VC] |
| Export: `browser-print` \| `html-download` \| `native-pdf` \| `provider-pdf` | Implemented [VC] — client-side PDF byte builder [INF on exact lib] |
| Artifact library with **tombstones** (deleted artifacts retained as markers) | Implemented [VC] |
| Export history | Implemented [VC] |
| Workflow analytics: **43 recorded actions** | Implemented [VC] |

---

### F-15 — Profile Management — **Implemented** [VC]
Surface: `ProfilePage.tsx`, `ProfileDetailPage.tsx`, `services/profileService.ts`.
- Personal info; experience/education CRUD with **modal-scoped failures** (modal stays open, inline error, no data loss); avatar upload with crop + removal reviews; skills management (`proficiency_level` BEGINNER→EXPERT; derived `profile_rank` NOVICE…MASTER). [VC]
- Timezone-correct date display via shared `parseDateInput` (UTC-shift bug fixed 2026-08). [VC]

---

### F-16 — Notifications Center & Digest System — **Implemented** [VC]
Surface: `pages/notifications/NotificationsPage.tsx`, `NotificationContext`, `services/notificationDigestService.ts`, bell dropdown preview.
| Capability | Status |
|---|---|
| History, unread filter, per-item mark read | Implemented [VC] |
| Mark-all-read with confirmation dialog | Implemented [VC] |
| Degraded-state banner logic (fallback vs stale data distinguished) | Implemented [VC] |
| Bell dropdown preview + unread badge; cross-tab sync event | Implemented [VC] |
| Digest items (`delivery_key`, immediate/daily/weekly/off frequencies) | Implemented [VC] |
| Quiet hours (`quiet_hours_enabled/start/end`) | Implemented [VC] |
| Delivery execution = **external scheduler scripts** (Supabase service-role, audited runs) — not in-app | Implemented [VC] |
| `notification_type` taxonomy: JOB_APPLICATION/JOB_ALERT/MESSAGE/CONNECTION/COURSE_UPDATE/CHALLENGE/ACHIEVEMENT/SYSTEM | Implemented [VC] |

---

### F-17 — Billing & Plans (DEMO mode) — **Partially Implemented by design** [VC]
Surface: `BillingPage.tsx`, `services/paymentService.ts`, Edge Functions (`create-checkout-session`, `create-subscription`, `create-billing-portal-session`).
- Plan catalog (`subscription_plans` incl. currency, interval, JSON features, `provider_price_id`), payment history (`payments` w/ `stripe_session_id`, transaction id, status), checkout intent creation with **explicit demo labeling**, portal session stub. [VC]
- `paymentService` exports `billingMode: 'demo'`; ADR-005 mandates demo until real keys exist. No live charging anywhere. [VC]

---

### F-18 — Settings Hub — **Implemented** [VC]
Surface: `SettingsPage.tsx`, `services/settingsService.ts`.
- Notification preferences (digest frequency, quiet hours); billing snapshot; profile settings; security: password change + **account deletion with typed confirmation** (`deleteAccount`). [VC]

---

### F-19 — Admin Console — **Implemented** (read-heavy) [VC]
Surface: `AdminPage.tsx` + admin subviews, `services/adminService.ts` (1011 lines).
- Dashboard stats; **service observability link grid** (health/metrics/logs/status per service); **scheduled automation status** panel (mirrors scheduler builders); audit logs browser (`audit_log`: action, entity, old/new values, ip, user-agent); product-analytics insights card. [VC]
- Dead code: `getAllUsers` & `getSystemSettings` have no UI consumers; `system_settings` table unused by UI. [VC]

---

### F-20 — Universal Command Search — **Implemented** [VC]
Surface: `CommandSearch.tsx`, `lib/unifiedSearch.ts`.
- `Ctrl/Cmd+K` palette; grouped results (navigation, jobs, courses, challenges, people); debounced query with stale-response guard; `?q=` consume-once deep links into Jobs/LMS. Shipped 2026-08. [VC]

---

### F-21 — Cross-Cutting Platform Behaviors — **Implemented** [VC]
| Behavior | Status |
|---|---|
| Safe-failure standard: degraded states labeled, retry affordances, provider errors never leaked | Implemented [VC] |
| Product analytics pipeline: `trackEvent` → `product_analytics_events` table (direct insert, **no batching**) + localStorage fallback capped at 100; 14 canonical events; **17 workflow recorder modules** (resume 43 actions, networking ~30, messaging 20, LMS 15, …) | Implemented [VC]; batching = REC |
| Dark mode | Implemented [VC] (was undocumented before) |
| Reduced-motion global kill switch; focus-visible ring tokens | Implemented [VC] |
| Dual toast systems (shared Toast + ToastContext) | Implemented; consolidation = REC [VC] |
| Chrome extension MV3 companion: scrape LinkedIn/Indeed/Glassdoor → local drafts, resume-match analysis, interview planner; **strictly local posture enforced by contract test** | Implemented but Not Documented [VC] |
| Module Federation host (AuthComponents) | Implemented [VC]; single-runtime ambiguity noted [VD] |
| E2E/dev auth override (`mock-user-dev-001`) | Implemented but Not Documented [VC] — must never reach prod builds [REC] |

---

## 5. Functional Requirements (consolidated)

Full requirement→code mapping: Traceability §4. Key behavioral rules (verified):

| ID | Rule | Evidence |
|---|---|---|
| FR-F01-1 | 401 responses coalesce into a single token refresh; on failure, logout + redirect `/login` | axios interceptor [VC] |
| FR-F04-1 | Job queries support cursor OR offset pagination; filters combinable | jobService [VC] |
| FR-F04-2 | Hidden explore jobs persist locally and never render in Explore | [VC] |
| FR-F05-1 | Application submits require passing pre-send review dialog | [VC] |
| FR-F05-2 | Withdraw deletes the application record (resubmission allowed) | [VC] |
| FR-F07-1 | Publish blocked unless `canPublishRecruiterPosting` passes (completeness + duplicate match) | [VC] |
| FR-F08-1 | Duplicate enrollment returns existing record (idempotent) | [VC] |
| FR-F08-2 | Gateway failure falls back to Supabase with visible degradation banner | [VC] |
| FR-F09-1 | Submission records sample-check result + `passed_tests`; retries append history | [VC] |
| FR-F09-2 | XP granted exactly once per challenge pass | DB view [VC] |
| FR-F11-1 | Attachments rejected above size cap or disallowed MIME before send | [VC] |
| FR-F11-2 | Message reads propagate realtime via Supabase `postgres_changes` | [VC] |
| FR-F12-1 | All AI outputs land in `draft` review_status; nothing mutates user data without explicit save | [VC] |
| FR-F14-1 | Imported resume fields require explicit user confirmation per field | [VC] |
| FR-F16-1 | Mark-all-read requires confirmation dialog | [VC] |
| FR-F16-2 | Digest delivery dedupes on `delivery_key` | [VC] |
| FR-F17-1 | Every checkout surface displays demo-mode labeling | ADR-005 [VC] |
| FR-F18-1 | Account deletion requires typed confirmation phrase | [VC] |
| FR-F20-1 | `?q=` deep-link param is consumed exactly once then stripped | [VC] |
| FR-F21-1 | Analytics failures never break UX (localStorage fallback) | [VC] |

Business-rule ledger RU-01…RU-26 maintained in [BRD §6].

---

## 6. Non-Functional Requirements (evidence-based)

| NFR | Requirement | Status / Evidence |
|---|---|---|
| Performance | API timeout 30s (axios); dashboards aggregate via `Promise.allSettled` (partial-render under failure) | Implemented [VC] |
| Reliability | Every remote-backed surface defines fallback + labeled degradation (`meta.source`, banners, `degraded_state_shown` telemetry) | Implemented [VC] |
| Security | 110 RLS policies across 49 tables; JWT auto-attach interceptor; secret scanning + Trivy in CI; extension keeps data local | Implemented [VC] |
| Privacy | Extension local-only contract test; account self-deletion; no provider error leakage | Implemented [VC] |
| Accessibility | Focus-visible tokens; aria patterns tested (alert/list/dialog); `test:a11y`, `test:contrast`, `test:keyboard` npm scripts; Playwright a11y specs | Implemented [VC] |
| Compatibility | Chromium-first (Playwright suite); responsive desktop/mobile shells | Implemented [VC]; cross-browser matrix UNK |
| Observability | Admin observability links; audit_log table + UI; scheduler audit trail | Implemented [VC] |
| Testability | **116 Vitest files (643 tests, green)**; ~20 Playwright E2E specs; contract test for extension; IA ownership test | Implemented [VC] |
| Backend testing | ~43 backend test files, **not runnable locally** (no Maven wrapper), executed only in CI | Debt [VC] |
| i18n | Not implemented | Absent [VC] |

---

## 7. UI/UX Requirements

- Design system: Aura kit — `PageHeader`, `GlassCard`, `AuraButton/Input/Modal`, Badge, Tabs, Skeleton loaders, EmptyState, SourceStatusBadge; light+dark token sets. [VC]
- Loading = skeletons; empty = EmptyState with next-action CTA; errors = inline alert + retry; degraded = banner explaining source. [VC]
- Motion respects reduced-motion kill switch. [VC]
- Screen inventory = §4 surfaces; state matrices per screen in Traceability §5.
- Known UX debts: header avatar non-interactive (no profile/logout menu); two toast systems; unwired shell components (`MobileMenu` variants, `AuraStatusBar` usage inconsistent). [VC]

---

## 8. Data Model & Integrations

### 8.1 Database (Supabase Postgres) [VC]
49 tables; notable: `user_profiles` (+trigger-default row on signup), `jobs`, `applications` (+events), `saved_job_searches`, `courses/enrollments/modules/lessons`, `challenges/submissions` (+XP-once view), `connections`, `messages` (Realtime-enabled), `notifications`, `notification_digest_items`, `product_analytics_events`, `badges/user_badges`, `subscription_plans/subscriptions/payments`, `audit_log`, `system_settings`.

12 enums: `user_role`, `proficiency_level`, `profile_rank`, `job_type`, `job_status`, `application_status`, `connection_status` (incl. unused BLOCKED), `challenge_difficulty`, `challenge_category`, `enrollment_status`, `message_status` (DELIVERED unused), `notification_type`.

Seeding: minimal defaults in `supabase-schema.sql`; rich fixture set in root `seed-data.sql` (584 lines, 46 inserts, 5 demo users alice→eve) **hard-gated** behind literal token `I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA` validated by `scripts/validate-seed-data-safety.mjs`. [VC]

No Supabase Storage buckets defined despite `.env.example` advertising them — file uploads go through the **file-service REST API** (`fileUploadService` multipart POST `/api/v1/files/...`). Doc/code mismatch. [VC]

### 8.2 Integrations
| Integration | Mode | Status |
|---|---|---|
| Supabase Auth | Direct SDK | Implemented [VC] |
| Supabase Realtime | `postgres_changes` on messages | Implemented [VC] |
| socket.io (API base URL) | NotificationContext push channel | Implemented [VC]; redundancy vs polling UNK |
| Edge Functions (Stripe scaffold) | Demo-mode payments | Implemented (demo) [VC] |
| File service (Spring) | Multipart REST | Implemented [VC] |
| API Gateway | LMS-first path w/ fallback; injects `X-User-Id` + `X-User-Role` headers (**not** X-User-Email as CLAUDE.md claims) | Implemented [VC]; doc drift logged |
| RabbitMQ `talentsphere.events` | Publishers in 5 services | Implemented (backend-side) [VC] |
| Feature flags | ~40 `enable_*` flags across Feature.java/yml, default-off posture | Implemented (backend) [VC] |
| Judge0 | Challenge execution | Unknown [UNK] |
| Grafana stack | Metrics | Documented [VD] |
| Module Federation | AuthComponents host/expose | Implemented [VC] |
| Scheduler jobs | `run-notification-digests.mjs`, `discover-saved-search-digests.mjs`, `run-networking-reminders.mjs` (service-role, audited) | Implemented but Not Documented [VC] |
| CI | Parent workflow `talentsphere-ci.yml`: lint/typecheck/unit/e2e/a11y/security/docker | Implemented [VD/VC] |

Backend reality note: ~19 Spring modules with controllers/repos/events verified present; `ApiResponse` envelope on 22/23 controllers; **port registry in CLAUDE.md diverges from actual configured ports**; `apps/backend` modular-monolith skeleton is **not implemented**. [VC]

---

## 9. Analytics & Success Metrics

**Existing instrumentation (implemented)** [VC]: canonical events (task lifecycle, automation suggestions, workflow prefill, bulk-action reviews, error recovery, degraded states) + 17 workflow catalogs writing to `product_analytics_events`; admin insights card reads them.
**Recommended KPIs (not yet instrumented)**: retain K-01…K-15 ledger from BRD §8 (activation, WAU, application conversion, learning completion, challenge participation, network growth, message responsiveness, AI suggestion acceptance rate, digest engagement, retention cohorts…). Mapping of each KPI → required events: Traceability §7.

---

## 10. Risks & Edge Cases (top)

| # | Risk / edge case | Mitigation status |
|---|---|---|
| RSK-01 | Heuristic AI marketed as intelligent → trust damage | Disclosure panels exist; copy audit REC |
| RSK-02 | Demo billing mistaken for real charges | Mandatory demo labels [VC]; keep until ADR-005 exit |
| RSK-03 | Scheduler scripts are ops-hosted single points | Audited runs + admin status panel [VC]; HA plan PLN |
| RSK-04 | Dual realtime paths (socket.io + Supabase) drift | Consolidation REC |
| RSK-05 | Dev backdoor user reachable if env guards regress | Guard tests [VC]; prod-strip assertion REC |
| RSK-06 | Port/doc registry drift misleads contributors | Traceability §6.4 table; doc fix REC |
| RSK-07 | Orphaned gamification promises badges UI never shows | Wire or remove (roadmap Phase 2) |
| RSK-08 | Unbatched analytics inserts at scale | Batching REC |
| RSK-09 | Reset-password dead-end locks out users | Register route (Phase 1 fix) |
| RSK-10 | BLOCKED connection status unreachable → no user blocking | Decide: implement UI or drop enum value |

---

## 11. Release Roadmap

| Phase | Content |
|---|---|
| **Phase 1 — Correctness (now)** | Register `/reset-password` route; fix difficulty-type mess; reconcile CLAUDE.md ports/headers; remove dead exports (oauth, websocket, applyToJob, getAllUsers…); decide aiSlice fate |
| **Phase 2 — Completion** | Wire gamification UI or cut schema surface; unify toast systems; header avatar menu; batched analytics writer; implement BLOCKED flow or remove; wire system_settings admin UI |
| **Phase 3 — Scale** | Real LLM provider behind existing provenance/review contracts; Stripe live per ADR-005 exit criteria; backend modular monolith (`apps/backend`) decision; i18n; cross-browser matrix |
| **Phase 4 — Growth** | K-01…K-15 instrumentation; digests HA; extension store distribution |

---

## 12. Open Questions (carried forward)
Q-1 monetization pricing tiers beyond demo plans · Q-2 extension store policy constraints · Q-3 backend monolith vs services endgame · Q-4 socket.io necessity given Supabase Realtime · Q-5 Judge0 actual wiring · Q-6 data-retention policy for drafts/analytics · Q-7 recruiter access scope for network/messages · Q-8 i18n priority languages · Q-9 LLM vendor/privacy requirements · Q-10 certificate strategy (schema has `certificate_url` passthrough only).

---

*End of PRD v2.0. Corrections to any [VC] item should be raised against CODEBASE_TRACEABILITY.md evidence rows first.*
