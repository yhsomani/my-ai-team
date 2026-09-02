# TalentSphere — Product Requirements Document (PRD)

> **Version 3.0 — Canonical Reconstructed Baseline**
> Date: 2026-08-30
> Authority: Reconstructed from a full bidirectional repository analysis (documentation → implementation and implementation → documentation). This document supersedes PRD v2.0, which contained several claims this revision corrects (see §26 Verification Changelog).

---

## 0. Methodology, Evidence Labels & Status Model

### 0.1 How this document was produced

This PRD was reconstructed by independently analyzing, in both directions, the complete evidence set:

- **Implementation**: `apps/frontend` (React 19 SPA — 17 protected routes, ~19 page surfaces, ~19 service modules, 7 Redux slices, ~50 lib modules, ~126 Vitest test files, ~28 Playwright E2E/a11y/UX specs), `services/` (26 Maven reactor modules, 18 active business services + `api-gateway`, ~40 backend test files), `chrome-extension-project/` (MV3 companion with 7 contract/UX test suites), `infra/db` (baseline migration, generated types), `scripts/` (3 schedulers + audit wrapper + 22 contract validators), `infra/` (docker, k8s, observability, CDN, security), `.github` CI.
- **Documentation**: Workspace-root living docs (`PLAN.md`, `FLOW.md`, `ARCHITECTURE.md`, `DECISION.md`, `PROBLEMS.md`, `PROJECT-BOUNDARIES.md`, `IMPLEMENTATION-PLAN.md`), monorepo docs (`FEATURES_AND_DASHBOARDS.md`, `USER_WORKFLOW_AUTOMATION_GUIDE.md`, `PRODUCT_UX_AUTOMATION_AUDIT.md`, `CODEBASE_TRACEABILITY.md`, `DATA_OWNERSHIP.md`, ADRs 001–005, runbooks, prior PRD/BRD v2.0, and historical docs).

### 0.2 Evidence labels

| Label | Meaning |
|---|---|
| **[VC]** | Verified from Codebase — behavior confirmed by reading source and/or tests |
| **[VD]** | Verified from Documentation — stated in authoritative docs (PLAN.md, ADRs, living docs); not independently re-traced here |
| **[CONFLICT]** | Sources contradict; resolution and residual uncertainty are stated inline |
| **[INF]** | Inferred — strong structural evidence (naming, wiring, tests); end-to-end behavior not fully traced |
| **[UNK]** | Unknown — evidence insufficient; requires confirmation before relying on it |
| **[ASM]** | Assumption — reasonable product assumption, unverified |
| **[REC]** | Recommendation — proposed improvement, not current behavior |
| **[PLN]** | Planned — documented intent, not built |

### 0.3 Implementation-status values (used throughout)

- **Implemented** — behavior is present and usable in the running product surface
- **Partially Implemented** — a meaningful subset exists; the remainder is missing or by-design deferred
- **Documented but Not Implemented** — described in docs; no implementation evidence
- **Implemented but Not Documented** — exists in code/product behavior; was absent from prior docs
- **Implemented Differently** — actual behavior differs from prior docs
- **Orphaned (Code without consumer)** — code/schema exists; no UI or runtime consumer
- **Planned / Future** — documented intent, no implementation
- **Unclear** — cannot be determined from current evidence

### 0.4 Canonical discovery ledger (State A–H)

The reconciliation of every discovery against prior documentation is captured in the §7 feature catalog and summarized in §21 Implementation Status Matrix and §22 Gap Analysis.

---

## 1. Executive Summary

TalentSphere is an AI-assisted, all-in-one career platform that combines a professional networking + job marketplace (**LinkedIn model**), a learning management system (**Coursera model**), and a technical-assessment coding arena (**HackerRank model**), plus candidate/recruiter tooling and a local-first Chrome companion. The shipped tagline is *"LinkedIn + Coursera + HackerRank, powered by AI."* [VC — `apps/frontend/index.html`]

The product serves three authenticated roles — candidate (`USER`), recruiter (`RECRUITER`), and administrator (`ADMIN`) — plus anonymous visitors (landing, login, register, password reset) and companion users (Chrome extension).

The current release is a **Supabase-first web application**: authentication, data, RLS security, and realtime messaging are powered directly by Supabase, while a parallel Spring Boot microservice layer (~19 services / 123 OpenAPI operations behind an API Gateway) remains present but largely secondary. Billing operates in explicit **demo mode** (ADR-005) with Stripe Edge-Function scaffolding but no live charging. The AI assistant is powered by **local rule-based heuristics**, not an external LLM, and every AI output is explicitly review-gated (`draft/saved/dismissed`) before it can mutate user data.

---

## 2. Product Overview

| Item | Content |
|---|---|
| **Product name** | TalentSphere |
| **Tagline** | LinkedIn + Coursera + HackerRank, powered by AI [VC] |
| **Purpose** | Unify job discovery, learning, skill practice, networking, resume/application tooling, and review-gated AI assistance for candidates; job publishing and candidate-pipeline management for recruiters; and platform oversight for administrators. |
| **Vision (docs)** | "The trusted career operating system where every AI output is reviewable, every failure degrades gracefully, and candidates own their data." [VD — PLAN.md; partially enforced in code, see §14] |
| **Problem being solved** | Career management is fragmented across job boards, course platforms, coding-practice sites, and networking apps; none assist with the actual work (tailoring resumes, drafting applications, planning learning) and few are transparent about AI limitations. [ASM/VD] |
| **Scope (this release)** | All features tagged *Implemented* / *Partially Implemented* in §7–§9. |
| **Explicitly out of scope (proven absent)** | Social feed authoring (feed is profile-synthesized only) [VC], certificate issuance (schema passes `certificate_url` only) [VC], video calls, mentorship, referrals, i18n, live payments, leaderboard UI (orphaned gamification). See §28. |

### 2.1 Product domains

The product is organized into nine business/engineering domains (per `PROJECT-BOUNDARIES.md` target model [VD] and the current feature layout):

1. **Identity & Access** — auth, sessions, roles, security settings
2. **Talent** — profile, skills, resume, portfolio artifacts
3. **Jobs & Recruiting** — marketplace, postings, applications, candidate management
4. **Learning & Assessment** — LMS, challenges, judging
5. **Communication & Networking** — connections, messaging, notifications
6. **Billing & Monetization** — plans, checkout, payments (demo-mode)
7. **AI Insights** — assistant, career path, resume analysis, automation suggestions
8. **Platform Foundation** — gateway, file service, gamification engine, analytics, audit
9. **Browser Companion** — Chrome extension (local-first)

### 2.2 Architectural context (read-first)

- **Supabase-first data plane**: Supabase Auth (primary identity authority per DECISION-001/ADR-001), Postgres + Row-Level Security, PostgREST direct access, Realtime channels, and Edge Functions (payment scaffolding). [VC]
- **Spring Boot secondary layer**: ~19 active service modules + `api-gateway` (Spring Cloud Gateway, JWT verification, Redis rate limiting, role-header normalization) exposing 123 OpenAPI paths. Operative where the SPA needs server-side logic (e.g., file upload security, LMS gateway-first fallback, AI endpoints). [VC]
- **Hybrid fetch patterns**: services use fallback chains (`Supabase → API Gateway → local/mock`) with explicit degradation labels. LMS uses gateway-first with Supabase fallback. [VC]
- **AI is heuristic**: `analyzeResume`, `getMatchScore`, `generateCareerPath`, `getChatResponse` are local rule-based (keyword extraction, regex experience-year parsing, canned responses) with provenance metadata; the backend `ai-service` endpoints return heuristic output. No external LLM call is wired. [VC]
- **Billing is demo**: `paymentService` exports `billingMode = 'demo'` with provider-backed charging disabled (ADR-005). [VC]
- **Documentation precedence** (when sources conflict): `PLAN.md` + `ARCHITECTURE_STATUS_INDEX.md` > this PRD > `SSOT.md` (marked stale). [VD]

---

## 3. Users, Roles & Permissions

### 3.1 Roles [VC]

`user_role` enum: `USER | ADMIN | RECRUITER`. Frontend role strings: `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` (`src/navigation/routeRegistry.ts`). Roles originate from Supabase `app_metadata.roles`; the API Gateway normalizes JWT claims into canonical `ROLE_*` headers for downstream services.

### 3.2 Route-level permission matrix (verified against `routeRegistry.ts` + `App.tsx` `ProtectedRoute` wiring)

Legend: ✅ accessible · ❌ denied · — public / not gated. "All" means any authenticated role.

| Route | USER | RECRUITER | ADMIN | Notes |
|---|---|---|---|---|
| `/` (landing), `/login`, `/register`, `/reset-password` | public | public | public | Auth pages redirect authenticated users to `/dashboard` |
| `/dashboard` | ✅ | ✅ | ✅ | Role-adaptive variants |
| `/jobs` | ✅ | ✅ | ❌ | **CONFLICT** with PRD v2.0 matrix, which listed ADMIN access; registry restricts to USER+RECRUITER [VC] |
| `/jobs/post` | ❌ | ✅ | ❌ | Recruiter-only |
| `/candidates` | ❌ | ✅ | ❌ | Recruiter-only |
| `/lms` | ✅ | ❌ | ❌ | USER-only (note: docs also reference `/learning`; live path is `/lms`) [VC] |
| `/challenges` | ✅ | ❌ | ❌ | USER-only |
| `/networking` | ✅ | ✅ | ✅ | All roles |
| `/messaging` | ✅ | ✅ | ✅ | All roles |
| `/ai` | ✅ | ✅ | ✅ | All roles |
| `/career-path` | ✅ | ✅ | ✅ | All roles |
| `/billing` | ✅ | ✅ | ✅ | All roles |
| `/settings` | ✅ | ✅ | ✅ | All roles |
| `/profile` | ✅ | ✅ | ✅ | All roles |
| `/profile/:userId` | ✅ | ✅ | ✅ | All roles (public-profile alias maps to ProfilePage) |
| `/resume` | ✅ | ✅ | ✅ | All roles |
| `/notifications` | ✅ | ✅ | ✅ | All roles |
| `/admin` | ❌ | ❌ | ✅ | ADMIN-only |
| `*` (catch-all) | 404 recovery with role-filtered destinations | | | |

IA contract: **exactly one primary feature owner per route**, enforced by `featureOwnership.ts` and the `test:ia` suite. [VC]

**Behavioral notes [VC]:**
- `ProtectedRoute` redirects unauthenticated users to `/login` and role-mismatched users to `/dashboard`.
- Authenticated users visiting `/login` or `/register` are redirected to `/dashboard`.
- Mobile bottom-tab navigation shows the top 5 destinations by role group (`default` / `recruiter` / `admin`).

### 3.3 Personas

| ID | Persona | Role | Core goals |
|---|---|---|---|
| P-A | Candidate (e.g., "Aisha") | USER | Find & apply to jobs, track applications, learn skills, solve challenges, grow network, build resumes, use review-gated AI assistance |
| P-B | Recruiter (e.g., "Rohan") | RECRUITER | Publish quality-gated jobs, manage candidate pipelines (notes/scorecards/bulk/interview planning) |
| P-C | Administrator (e.g., "Priya") | ADMIN | Platform stats, service health, automation status, audit logs, analytics insights |
| P-D | Extension power-user (e.g., "Dev") | Compan-ion | Scrape jobs from LinkedIn/Indeed/Glassdoor into a strictly local pipeline |

---

## 4. Product Architecture Context (user-facing)

```mermaid
flowchart LR
    V[Anonymous Visitor] -->|"/ /login /register /reset-password"| WEB
    U[USER / RECRUITER / ADMIN] -->|Authed SPA route| WEB[Frontend SPA<br/>React 19 + Redux + Aura UI]
    EXT[Chrome Companion MV3] -.local scrape/match.-> LOCAL[(chrome.storage.local)]
    EXT -.optional manual import.-> WEB
    WEB -->|Supabase JS client| SB[(Supabase<br/>Auth + Postgres + RLS + Realtime + Edge Functions)]
    WEB -->|HTTP /api/v1 via Axios| GW[API Gateway :8080<br/>JWT verify + rate limit + RBAC headers]
    GW --> MS[18-19 service modules<br/>e.g. file-service, lms, ai, payment]
    SB --> MS
    Sched[Node scheduler scripts] --> SB
    [[Background: Redis, RabbitMQ, Prometheus, Grafana]]
```

- Users interact primarily with the **web SPA**; the Spring services are a secondary, fallback-capable layer. [VC]
- The **Chrome extension** is a strictly local-first companion (no cloud sync without explicit user export action; DECISION-006). [VC]

---

## 5. Information Architecture & Shell

Verified shell structure (`ResponsiveLayout`, `AuraNavbar`, `AuraSidebar`, `AuraStatusBar`, mobile drawer + bottom tabs) [VC]:

- **Desktop**: sidebar primary navigation + top bar (universal search trigger `Ctrl/Cmd+K`, notification bell with unread badge and dropdown preview, theme toggle, decorative avatar).
- **Mobile**: hamburger drawer navigation; bottom tab bar for the top-5 prioritized destinations per role. `MobileMenu`/`AuraStatusBar` variants exist; some are **not wired into the live shell** (known debt). [VC]
- **Global keyboard**: `Ctrl/Cmd+K` opens the Universal Command Search palette (F-20). [VC]
- **Dark mode**: `ThemeContext`/`AuraThemeProvider`, persisted preference, light+dark Aura token sets. [VC]
- **Dev/E2E auth override**: mock user `mock-user-dev-001` (all three roles) activates in dev when Supabase session resolution times out/errors; E2E override via `localStorage` (`talentsphere.e2e.auth`) behind `window.__E2E_TESTING__`. **Must never leak into production builds** (REC). [VC]
- **Accessibility**: focus-visible ring tokens, `role="alert"`/`dialog`/`status` patterns, named landmarks ("{Route} application content"), reduced-motion kill switch. [VC]

---

## 6. Capability Map (Product → Domain → Module)

```
TalentSphere
├── 6.1 Identity & Access
│     ├── Authentication & Session Management (F-01)
│     ├── Role-based Access Control (3.2)
│     └── Security Settings & Account Lifecycle (F-18)
├── 6.2 Talent
│     ├── Profile Management (F-15)
│     ├── Resume Builder & Artifacts (F-14)
│     └── Skills / Experience / Education / Certifications / Languages / Projects
├── 6.3 Jobs & Recruiting
│     ├── Job Marketplace & Discovery (F-04)
│     ├── Application Studio (F-05)
│     ├── Post-a-Job Studio (F-07)
│     ├── Candidate Management & Scorecards (F-06)
│     └── Companies (F-22)
├── 6.4 Learning & Assessment
│     ├── LMS — Courses, Enrollments, Progress (F-08)
│     ├── Challenges — Arena, IDE, Submissions (F-09)
│     └── Gamification — XP, Badges, Leaderboard (F-23, orphaned)
├── 6.5 Communication & Networking
│     ├── Professional Networking (F-10)
│     ├── Direct Messaging (F-11)
│     └── Notifications Center & Digests (F-16)
├── 6.6 Billing & Monetization (F-17 — demo mode)
├── 6.7 AI Insights
│     ├── AI Career Assistant (F-12)
│     ├── AI Career Path (F-13)
│     └── AI Draft / Suggestion Pipeline (cross-cutting)
├── 6.8 Platform Foundation
│     ├── Dashboard (F-03)
│     ├── Admin Console (F-19)
│     ├── Universal Command Search (F-20)
│     ├── Landing Page & Public Stats (F-02)
│     ├── Product Analytics (cross-cutting)
│     ├── Audit & Observability (cross-cutting)
│     └── Settings Hub (F-18)
├── 6.9 Browser Companion
│     └── Chrome Extension (F-21): Popup Dashboard, Job Tracker,
│           Resume Match Preview, Interview Planner, Diagnostics
├── 6.10 Trust & Safety
│     └── Content Reporting & Moderation (F-25): report modal (job posting /
│           user profile / company / message), admin moderation queue,
│           status triage, per-status stats
└── 6.11 Cross-Cutting Platform Behaviors (F-24)
      ├── Safe-failure / degradation standard
      ├── File uploads & security
      ├── Feature flags
      ├── Scheduler automations
      └── Design system (Aura)
```

---

## 7. Feature Catalog — Detailed Feature Requirements

> Each feature: actors, prerequisites, functional requirements, business rules (→ BRD §13), validations, states, permissions, error scenarios, integrations, notifications, audit/data impact, implementation status, and evidence. Feature IDs F-01…F-25. Cross-references: business rules `RU-xx` → BRD §13; flows `J-xx` → §10; integrations `INT-xx` → §17.

---

### F-01 — Authentication & Session Management

**Status: Implemented** [VC] · **Actors:** Anonymous → USER/RECRUITER; all roles for session ops

**Surface:** `pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `services/authService.ts`, `lib/registrationOnboarding.ts`, axios 401 interceptor, Vite Module Federation host exposing `AuthComponents`.

**Capabilities:**
| Capability | Status | Details |
|---|---|---|
| Email/password registration | Implemented [VC] | Full name, email, password (≥8 chars), account-type selection (Talent / Recruiter). Role intent settable via `?role=` query param (`talent`/`recruiter`). Post-registration onboarding signals + analytics (`account_type_selected`, `registration_submitted/completed/failed`). |
| Email/password login | Implemented [VC] | Sign-in via Supabase; role from `app_metadata.roles`; safe error copy (no raw provider errors). Post-login redirect: authenticated → `/dashboard`. |
| Logout | Implemented [VC] | Sidebar + mobile menu. **Gap:** header avatar has no menu (no profile/logout entry from the avatar). |
| Password reset | Implemented [VC] | `authService.resetPassword`, `/reset-password` public route (reachable with or without a stale session), `ResetPasswordPage` wired + tested. **CONFLICT** vs PRD v2.0: PRD v2.0 claimed the route was missing (PROBLEM-0011 fixed it 2026-08). |
| Session restore & 401 recovery | Implemented [VC] | Axios interceptor: JWT auto-attach; concurrent 401s coalesce into a single token refresh (promise queue); on refresh failure → logout + redirect `/login`. |
| OAuth providers | **Documented but Not Implemented** [VC] | `lib/oauth.ts` is orphaned/dead code; no OAuth UI. |
| Dev/E2E auth override | Implemented but Not Documented [VC] | `mock-user-dev-001` dev fallback; guarded E2E override. |

**Functional requirements:**
- FR-F01-1: Concurrent 401 responses must trigger exactly one token refresh; failure must log the user out and redirect to `/login`. [VC]
- FR-F01-2: Unauthenticated access to a protected route redirects to `/login`; role-mismatched access redirects to `/dashboard`. [VC]
- FR-F01-3: Registration must only proceed with valid email, password ≥8 chars, and a selected account type. [VC]
- FR-F01-4: Provider/network errors must be rendered via safe, localized error copy (no raw Supabase/HTTP error strings). [VC]
- FR-F01-5: Password reset must be reachable even with a stale/expired session. [VC]

**Acceptance criteria:**
- AC-F01-1: Given an unauthenticated user navigating to `/dashboard`, When the route loads, Then they are redirected to `/login`.
- AC-F01-2: Given three concurrent API calls failing with 401, When they retry post-refresh, Then exactly one refresh happens and all three complete.
- AC-F01-3: Given a user registering with `?role=recruiter`, When registration succeeds, Then the account is created with RECRUITER role intent and redirected to the recruiter post-registration path.

---

### F-02 — Public Landing Page with Honest Live Stats

**Status: Implemented** [VC] · **Actors:** Anonymous visitors

**Surface:** `pages/LandingPage.tsx`.

- Public hero + feature tour; live counts for registered profiles, open jobs, and open challenges fetched from the database; on fetch failure, clearly-labeled fallback copy (never silent fake numbers). [VC]
- **CONFLICT** resolved: the earlier fabricated "94.2% match rate" stat was removed and replaced with live counts (per CODEBASE_TRACEABILITY §8). [VC]

**FR-F02-1:** Stats must render real DB counts, or — on failure — explicitly-labeled fallback copy. **AC-F02-1:** Given the stats query fails, When the landing page renders, Then it shows labeled fallback values, never fabricated numbers. [VC]

---

### F-03 — Dashboard (Candidate + Recruiter variants)

**Status: Implemented** [VC] · **Actors:** USER, RECRUITER, ADMIN

**Surface:** `pages/dashboard/DashboardPage.tsx`, `services/dashboardService.ts`.

- Role-routed variant rendering; aggregates via `Promise.allSettled` so partial upstream failures yield a **partial dashboard with `meta.source = live|partial`** and per-section retry affordances instead of a blank page. [VC]
- Metrics: **XP & level** (level = ⌊total_xp/100⌋ + 1, from `leaderboard.total_xp`), application count, unread message count, recommended jobs (top 5 published), trending challenges (top 5 by XP reward), onboarding checklist signals (profile completeness, skills count, applications, saved searches, enrollments, challenge submissions). [VC]
- Quick actions and recommended-job/challenge cards. [VC]
- Tests assert partial-refresh copy without leaking raw provider errors (e.g., `service_role_token` never rendered). [VC]

**FR-F03-1:** Dashboard sections must refresh independently; a failed section must render a labeled "did not refresh" state with retry, without blocking other sections.
**FR-F03-2:** Provider/internal error strings must never surface in dashboard UI.

---

### F-04 — Job Marketplace & Discovery

**Status: Implemented** [VC] · **Actors:** USER, RECRUITER

**Surface:** `pages/jobs/JobsPage.tsx` (~3,620 lines), `services/jobService.ts` (~935 lines).

| Capability | Status | Details |
|---|---|---|
| Browse / search / filter | Implemented [VC] | Filters: status, job_type, location, text search, salary min/max; combineable; cursor OR offset pagination (`JobQueryParams`, `PaginatedJobsResult`). |
| Saved searches | Implemented [VC] | `saved_job_searches` (user-owned, RLS) + localStorage mirror; save/delete with review; dedupe by signature. |
| Job alerts + digests | Implemented [VC] | Alert toggle per saved search; match-count tracking (`lastMatchCount`, `lastCheckedAt`); immediate vs digest delivery governed by notification settings (`digest_frequency`); digest queue items via `notification_digest_items` (dedupe on `delivery_key`, daily/weekly). |
| Hide-from-Explore | Implemented [VC] | localStorage-backed `hiddenExploreJobs` per user; drives preference insights; sync to `hidden_explore_jobs` table. |
| Excluded job types preference | Implemented but Not Documented [VC] | Local preference excluding certain job types from discovery. |
| "My Postings" / "My Applications" tabs | Implemented [VC] | Recruiter/user split workflows. |
| Posting templates + draft autosave history | Implemented but Not Documented [VC] | `job_post_templates` + `jobPostDraftHistory` (localStorage). |
| Apply handoff to Application Studio | Implemented [VC] | Job card → application draft → review → submit. |
| Company attach during posting | Implemented but Not Documented [VC] | Completion utility checks company profile completeness. |
| Dead exports (`applyToJob` et al.) | Debt [VC] | Unused service methods; see §28. |

**FR-F04-1:** Job queries support cursor or offset pagination that is switchable; filters must be combinable. [VC]
**FR-F04-2:** Jobs hidden from Explore must persist locally and never re-appear in Explore recommendations. [VC]
**FR-F04-3 (INF):** One active application per (user, job) pair is intended (schema UNIQUE(job_id, user_id)); withdraw makes resubmission possible. Process-level detail re-verify (`RU-06`).

**NFR note:** Timeout default 30s on API client; degraded states labeled for all remote-backed surfaces.

---

### F-05 — Application Studio (Draft-first Lifecycle)

**Status: Implemented** [VC] · **Actors:** USER

**Surface:** `services/applicationService.ts` + Application Studio UI.

| Capability | Status | Details |
|---|---|---|
| Local-first drafts + opt-in account sync | Implemented [VC] | Drafts persist in localStorage; sync to `application_drafts`/`application_draft_versions` (source: manual/profile/ai). |
| Draft versions & change history | Implemented [VC] | Autosave/restore/cleared reasons recorded. |
| Submit review dialog | Implemented [VC] | Pre-send checklist must pass before submit (RU-05). |
| AI draft assist handoff | Implemented [VC] | Assistant draft → application fields; `workflow_prefill_used/rejected` analytics. |
| Withdraw | Implemented (Implemented Differently vs prior docs) [VC] | **Delete-based** — record removed; resubmission permitted. PRD v1.x claimed soft-cancel; corrected (RU-07). |
| Status timeline | Implemented [VC] | `application_status`: PENDING → REVIEWED → INTERVIEW → (OFFER | REJECTED); transitions logged in `application_status_events`. |

**FR-F05-1:** Application submission requires passing the pre-send review dialog. [VC]
**FR-F05-2:** Withdraw deletes the application record; the user may re-apply. [VC]

---

### F-06 — Candidate Management (Recruiter)

**Status: Implemented** [VC] — was largely undocumented before discovery. · **Actors:** RECRUITER

**Surface:** `pages/candidates/CandidatesPage.tsx`, `services/recruiterService.ts` (~675 lines).

- Application pipeline queue filtered by recruiter's company jobs; cursor navigation. [VC]
- **Private candidate notes** (`candidate_notes`, 1 per recruiter+application, RLS to job poster). [VC]
- **Scorecards** (`candidate_scorecards`: technical/culture scores, evidence JSONB). [VC]
- **Interview planner integration** with bulk-status gating. [VC]
- **Bulk actions gated behind review + confirm** (`bulk_action_reviewed/confirmed` analytics). [VC]
- Status updates (`PENDING → REVIEWED → INTERVIEW → OFFER/REJECTED`) recorded in `application_status_events`; candidate notified. [VC/INF]

**FR-F06-1:** Bulk status changes must require an explicit review + confirm step before any change is committed. [VC]
**FR-F06-2:** Recruiter notes/scorecards are private to the job poster (RLS). [VC]

---

### F-07 — Post-a-Job Studio

**Status: Implemented** [VC] · **Actors:** RECRUITER

**Surface:** `pages/jobs/PostJobPage.tsx`.

- Guided multi-section composer; draft save + template apply; company attach; draft history. [VC]
- **Publish gating** via `canPublishRecruiterPosting`: required-field completeness + duplicate-match check (title/location/type signature) + salary validity. [VC]
- Publish → lifecycle `job_status`: DRAFT → PUBLISHED → (CLOSED | ARCHIVED). [VC]
- **DB-enforced readiness trigger** also guards `PUBLISHED` status: requires non-empty title, description, location, company_id, and ≥1 non-blank requirement (`enforce_job_publish_readiness`). [VC]

**FR-F07-1:** Publish is blocked unless `canPublishRecruiterPosting` passes (completeness + duplicate match). [VC]
**FR-F07-2:** The database trigger rejects any job status change to `PUBLISHED` that lacks title, description, location, company, and a requirement. [VC]

---

### F-08 — Learning (LMS)

**Status: Implemented** [VC] · **Actors:** USER (learning is talent-scoped in the route registry)

**Surface:** `pages/lms/LMSPage.tsx`, `services/lmsService.ts` (~1,112 lines).

| Capability | Status | Details |
|---|---|---|
| Catalog browse + pagination + filters | Implemented [VC] | Published courses; search/filter by term; pagination. |
| Enroll (idempotent) | Implemented [VC] | Duplicate enroll returns the existing enrollment (RU-08). |
| Progress tracking + filter tabs | Implemented [VC] | `enrollment_status`: ENROLLED / IN_PROGRESS / COMPLETED / DROPPED; lesson progress records; progress % computation. |
| Hybrid gateway-first → Supabase-fallback access | Implemented [VC] | Degradation banner rendered when falling back. |
| AI learning-plan draft handoff | Implemented [VC] | Career-path suggestions link to courses; AI drafts can flow into learning context. |

**FR-F08-1:** Enrolling twice in the same course must return the existing enrollment, never a duplicate. [VC]
**FR-F08-2:** When the API Gateway is unreachable, the LMS must fall back to Supabase and render a visible degradation banner (never a blank page). [VC]

---

### F-09 — Skill Challenges (Arena)

**Status: Implemented** (gamification layer orphaned) [VC] · **Actors:** USER

**Surface:** `pages/challenges/ChallengesPage.tsx` (+ editor workspace), `services/challengeService.ts`.

| Capability | Status | Details |
|---|---|---|
| Catalog with filters | Implemented [VC] | `challenge_category` (FRONTEND…DATA_SCIENCE); `challenge_difficulty` EASY/MEDIUM/HARD. |
| Monaco editor workspace | Implemented [VC] | Starter code; **reset requires review**; languages selectable. |
| Local sample checks before submit | Implemented [VC] | Client-side sample test evaluation. |
| Submissions & retry history | Implemented [VC] | Records `passed_tests`, status PASSED/FAILED/SUBMITTED; retries append history. |
| XP award (once per pass) | Partially Implemented [VC/INF] | Award intended once per challenge pass; **no DB view/uniqueness constraint verifiable in the canonical schema** — PRD v2.0's "DB view enforces uniqueness" is **CONFLICT**; the XP path relies on service logic. Enforcement point requires re-verification. |
| Leaderboard / badges UI | **Orphaned** [VC] | `gamificationService` (frontend) exists + tests but **zero UI consumers**; `leaderboard`/`badges`/`user_badges` tables have no rendering surface. |
| Judge0 execution | **UNK** [UNK] | Stack documents Judge0/Piston; no traced in-app call for challenge judging confirmed in this analysis. |
| Difficulty type drift | Implemented Differently [VC] | Frontend union allows legacy Low/Medium/High/Extreme; DB enum is EASY/MEDIUM/HARD — inconsistency logged. |

**FR-F09-1:** Submission records the sample-check outcome and `passed_tests` before status resolution; retries must append to history. [VC]

---

### F-10 — Professional Networking

**Status: Implemented** [VC] · **Actors:** USER, RECRUITER, ADMIN (all roles permitted by registry)

**Surface:** `pages/networking/NetworkingPage.tsx`, `services/networkingService.ts`.

| Capability | Status | Details |
|---|---|---|
| Suggestions with mutual-connection counts | Implemented [VC] | Uses `get_mutual_connection_counts` SECURITY DEFINER RPC. |
| Suggestion dismissal memory | Implemented [VC] | `networking_suggestion_preferences` (status `dismissed`). |
| Connection preferences | Implemented [VC] | Notifications/about visibility preferences. |
| Connect with optional note; accept/decline/withdraw | Implemented [VC] | `connection_status`: PENDING → ACCEPTED | REJECTED; withdraw removes pending. |
| Follow-up reminders | Implemented [VC] | `run-networking-reminders.mjs` scheduler promotes due reminder notifications. |
| Profile preview drawer | Implemented [VC] | |
| Connection BLOCKED | **Partially Implemented / unreachable** [VC] | `BLOCKED` exists in the DB enum but is absent from frontend types/UI — a user cannot block a connection. Decision pending. |

**FR-F10-1:** Mutual-connection counts must be computed server-side (RPC) and not exposed publicly to non-authenticated users. [VC]
**FR-F10-2 (RU-12):** Connection creation requires recipient acceptance; initiator may include an optional note; pending connections may be withdrawn. [VC]

---

### F-11 — Direct Messaging

**Status: Implemented** [VC] · **Actors:** USER, RECRUITER, ADMIN (all roles)

**Surface:** `pages/messaging/MessagingPage.tsx`, `services/messagingService.ts`.

| Capability | Status | Details |
|---|---|---|
| Conversations + messages, both paginated | Implemented [VC] | Cursor pagination; conversation list with unread indicators. |
| Send with retry | Implemented [VC] | Optimistic send + retry on failure. |
| Attachments (validated client-side) | Implemented [VC] | Size cap (`maxMessageAttachmentBytes`) + MIME type allowlist; disallowed rejected before send. |
| Conversation-level mark-read | Implemented [VC] | Read markers via `conversation_participants` (note: RLS not enabled on that table — see §29 risk). |
| Realtime updates | Implemented [VC] | Supabase Realtime `postgres_changes` on `messages` when configured at the Supabase project (publication not in schema). |
| Reply suggestions | Implemented but Not Documented [VC] | Insertable into composer; `reply_suggestion_inserted` analytics. |
| Per-message DELIVERED state | Orphaned/Unused [VC] | `message_status` includes DELIVERED; per-message mark-read helper is dead code. |
| WebSocket transport | **Documented but Not Implemented (active path)** [VC] | `lib/websocket.ts` orphaned; realtime messaging uses Supabase. socket.io remains for NotificationContext (dual realtime paths — debt). |

**FR-F11-1:** Attachments over the size cap or outside the MIME allowlist are rejected before send. [VC]
**FR-F11-2:** Message delivery/read propagation uses Supabase Realtime. [VC]

---

### F-12 — AI Career Assistant

**Status: Implemented** (heuristic engine; review-gated) [VC] · **Actors:** USER, RECRUITER, ADMIN

**Surface:** `pages/ai/AIAssistant.tsx` (~948 lines), `services/aiService.ts`, `store/slices/aiSlice`, `lib/aiProvenance`, `lib/aiSuggestionReviewQueue`, `lib/automationSuggestionAudit`.

| Capability | Status | Details |
|---|---|---|
| Chat sessions persisted | Implemented [VC] | `ai_sessions` (user-owned, JSONB messages); local fallback on sync failure. |
| Provenance metadata | Implemented [VC] | Normalized across response shapes; marks outputs as heuristic/degraded. |
| Automation suggestions | Implemented [VC] | Task detection, one-click task creation, dismissals; `review_status ∈ {draft, saved, dismissed}`; **nothing applies without explicit user save**. Events: `automation_suggestion_generated/saved/dismissed`, `task_started/completed/abandoned/failed`, `error_recovery_clicked`, `degraded_state_shown`. |
| Engine honesty | Implemented (heuristic) [VC] | `analyzeResume`, `getMatchScore`, `generateCareerPath`, `getChatResponse` are **local rule-based** — no external LLM call. Marketing/docs implying a live LLM are inaccurate. |
| Resume / match / career-path endpoints | Implemented [VC] | Calls backend `ai-service` `/api/v1/ai/analyze-resume`, `/match-job`, `/career-path/{userId}`, `/chat` with 10s timeouts and client-side fallbacks. |

**FR-F12-1:** All AI outputs land in `draft` review status; nothing mutates user data without an explicit save action. [VC]
**FR-F12-2:** AI failures must degrade to labeled fallback behavior (heuristics/copy) without breaking the page. [VC]

---

### F-13 — AI Career Path Guidance

**Status: Implemented** (read-only governance) [VC] · **Actors:** all roles

**Surface:** `pages/ai/AICareerPath.tsx`.

- Read-only guidance with explicit **"Review Boundaries" governance panel**; error card `role="alert"` + retry; **no autonomous writes**. [VC]

**FR-F13-1:** Career-path generation is read-only; it must not write to user profile/courses without explicit user action. [VC]

---

### F-14 — Resume Builder

**Status: Implemented** [VC] · **Actors:** all roles

**Surface:** `pages/profile/ResumeBuilder.tsx`, `services/resumeService.ts`, `lib/resumePdfExport.ts`.

| Capability | Status | Details |
|---|---|---|
| Sectioned editor tabs | Implemented [VC] | |
| Import resume parse with field-by-field review | Implemented [VC] | Imported fields require explicit user confirmation per field (FR-F14-1). |
| Export: `browser-print` / `html-download` / `native-pdf` / `provider-pdf` | Implemented [VC] | Client-side PDF byte builder; export events logged (`resume_export_events`: method/status ready|blocked). |
| Artifact library with tombstones | Implemented [VC] | `resume_artifacts` status active|deleted; deleted artifacts retained as markers. |
| Export history | Implemented [VC] | Local cache + DB events for cross-device continuity. |
| Workflow analytics (~43 recorded actions) | Implemented [VC] | |

**FR-F14-1:** Imported resume fields must require explicit user confirmation per field before being applied. [VC]

---

### F-15 — Profile Management

**Status: Implemented** [VC] · **Actors:** all roles

**Surface:** `pages/profile/ProfilePage.tsx` (+ `ProfileDetailPage` alias), `services/profileService.ts`.

- Identity row (`profiles`) + extended profile (`user_profiles`, auto-created by trigger on signup). [VC]
- Personal info; experience/education CRUD with **modal-scoped failures** (modal stays open, inline error, no data loss). [VC]
- Avatar upload with crop + removal reviews. [VC]
- Skills management (`proficiency_level` BEGINNER→EXPERT); derived `profile_rank` NOVICE…MASTER. [VC]
- Timezone-correct date display via shared `parseDateInput` (UTC-shift bug fixed 2026-08). [VC]
- Sections: certifications, languages, projects (portfolio). [VC]

**FR-F15-1:** CRUD errors in a modal must not lose entered data and must show inline error within the modal. [VC]
**FR-F15-2:** Dates must be parsed in local midnight semantics to avoid UTC day-shifts. [VC]

---

### F-16 — Notifications Center & Digest System

**Status: Implemented** [VC] · **Actors:** all roles

**Surface:** `pages/notifications/NotificationsPage.tsx`, `NotificationContext`, `services/notificationDigestService.ts`, bell dropdown.

| Capability | Status | Details |
|---|---|---|
| History, unread filter, per-item mark read | Implemented [VC] | Cursor pagination. |
| Mark-all-read with confirmation dialog | Implemented [VC] | RU-17. |
| Degraded-state banner logic | Implemented [VC] | Fallback vs stale data distinguished. |
| Bell dropdown preview + unread badge | Implemented [VC] | Cross-tab sync event (`NOTIFICATIONS_CHANGED_EVENT`). |
| Digest items | Implemented [VC] | `delivery_key` dedup; immediate/daily/weekly/off frequencies; `action_url`. |
| Quiet hours | Implemented [VC] | `quiet_hours_enabled/start/end` (default 18:00–09:00). |
| Delivery execution | Implemented via external scheduler scripts [VC] | Supabase service-role, audited runs, admin status panel. |
| Notification taxonomy | Implemented [VC] | `notification_type`: JOB_APPLICATION / JOB_ALERT / MESSAGE / CONNECTION / COURSE_UPDATE / CHALLENGE / ACHIEVEMENT / SYSTEM. |

**FR-F16-1:** Mark-all-read requires a confirmation dialog. [VC]
**FR-F16-2:** Digest delivery dedupes on `delivery_key`. [VC]

---

### F-17 — Billing & Plans (Explicit DEMO Mode)

**Status: Partially Implemented by design** [VC] · **Actors:** all roles

**Surface:** `pages/billing/BillingPage.tsx`, `services/paymentService.ts`, Supabase Edge Functions (`create-checkout-session`, `create-subscription`, `create-billing-portal-session`).

- Plan catalog (`subscription_plans`: price, currency, interval month/year, JSON features, `provider_price_id`); payment history (`payments`: status PENDING/COMPLETED/FAILED/REFUNDED, `stripe_session_id`, transaction id); checkout intent creation; portal session stub. [VC]
- `paymentService` exports `billingMode = 'demo'`; ADR-005 mandates demo until real keys exist. **No live charging path exists in the product.** [VC]
- **FR-F17-1:** Every billing action surface must show demo-mode labeling. [VC]

---

### F-18 — Settings Hub

**Status: Implemented** [VC] · **Actors:** all roles

**Surface:** `pages/settings/SettingsPage.tsx` + `components/{ProfileSettings, NotificationSettings, SecuritySettings, BillingSettings}`.

- Notification preferences (channels email/push/sms, job alerts, message notifications, newsletter, digest frequency, quiet hours). [VC]
- Billing snapshot (status/current plan/next billing date/payment history). [VC]
- Profile settings (name split into first/last + full_name; headline; location; writes split across `profiles` and `user_profiles`). [VC]
- Security: **password change** (Supabase `updateUser`) and **account deletion with typed confirmation** (`deleteAccount` = soft-delete: `is_active=false`, `deleted_at`). [VC — softer than PRD v2.0 text "deletion"; it is a soft-deactivation]

**FR-F18-1:** Account deletion requires a typed confirmation phrase before proceeding. [VC]
**FR-F18-2:** The current account-delete implementation is a soft-deactivate (profile flagged inactive), not a hard deletion — this differs from pure "self-serve deletion" marketing language. [VC, CONFLICT vs §9 claims]

---

### F-19 — Admin Console

**Status: Implemented** (read-heavy) [VC] · **Actors:** ADMIN

**Surface:** `pages/admin/AdminDashboard.tsx`, `services/adminService.ts` (~1,011 lines).

- Platform stats (live counts with 2s timeout + labeled fallback). [VC]
- **Service observability link grid** (health/metrics/logs/status per service). [VC]
- **Scheduled-automation status** panel (mirrors scheduler builders: notification digests, saved-search discovery, networking reminders). [VC]
- **Audit log browser** (`audit_log`: entity_type, action, entity_id, old/new JSONB, ip, user_agent; cursor-paginated). [VC]
- Product-analytics insights card (reads `product_analytics_events`). [VC]
- Dead code: `getAllUsers`, `getSystemSettings` have no UI consumers; `system_settings` table unused by UI. [VC]

**FR-F19-1:** Admin stats must degrade to labeled fallback rather than fail the console. [VC]

---

### F-20 — Universal Command Search

**Status: Implemented** [VC] · **Actors:** all roles

**Surface:** `CommandSearch.tsx`, `lib/unifiedSearch.ts`.

- `Ctrl/Cmd+K` palette; grouped results (navigation, jobs, courses, challenges, people); debounced query with stale-response guard; `?q=` consume-once deep links into Jobs/LMS. [VC]
- **FR-F20-1:** The `?q=` deep-link param is consumed exactly once then stripped. [VC]

---

### F-21 — Chrome Extension Companion (MV3)

**Status: Implemented but Not Documented (in prior docs); now documented** [VC] · **Actors:** Companion users (extension), deployed as a local-only tool

**Surface:** `chrome-extension-project/` (popup + options apps, background service worker, content scripts).

- Manifest V3; permissions exactly `['activeTab','scripting','storage']`; **no host permissions, no oauth2**; strict CSP. Local-first privacy enforced by contract test (DECISION-006). [VC]
- **Popup Dashboard**: local tracker counts; "Resume Match Preview" launch; "Scan Webpage" → `analyze_page`; page-scan status panel. [VC]
- **Popup Job Tracker**: add-job form, filter by company/role, delete/status-change with review modals, scanned-draft review with limited-draft warning, save/discard. [VC]
- **Popup Diagnostics**: export diagnostics JSON; clear-review modals; "Ping Worker"; "Log Test Event"; console log stream. [VC]
- **Options app**: Resume Match Preview (local keyword-overlap matching, thresholds SHORT=160 / LARGE=12000 chars, "Comparing locally" progress, local-only), Interview Planner (prep cards by category Technical/Behavioral/System Design, completion toggles, clear-all review), Local Settings (cloud-sync plan modal — **not enabled**, notification toggle, usage-diagnostics toggle, prep-card reset with review). [VC]
- **Content scripts**: role/company/description selector sets for LinkedIn/Indeed/Glassdoor + generic fallbacks; description capped at 600 chars; confidence high/medium/low; source = hostname. [VC]
- **Storage**: `chrome.storage.local` versioned (`ts_extension_storage_schema` v1 + `storageMigrations.ts`); keys `ts_jobs`, `ts_job_draft`, `ts_prep`, `ts_settings_notif`, `ts_settings_analytics`, `ts_extension_operational_analytics`. [VC]
- **Operational analytics**: bounded local queue (max 200 events), sanitized metadata allowlist (no raw text), consent gate. [VC]
- **Error handling**: safe visible copy with no raw storage keys/QuotaExceededError/tokens; ErrorBoundary with Reload. [VC]
- **Messaging**: `extMessaging.sendMessage` with 3× retry; web-preview fallback dispatches CustomEvent. [VC]

**FR-F21-1:** Scraped job data, drafts, prep cards, and diagnostics stay in local browser storage; no account-bound cloud sync occurs without an explicit user action. [VC]
**FR-F21-2:** Contract test enforces manifest minimality, no host permissions, and no OAuth. [VC]

---

### F-22 — Companies

**Status: Implemented** [VC] · **Actors:** USER (register company), RECRUITER (use/complete company context)

**Surface:** `services/companyService.ts`, company completion util, Companies table.

- Company CRUD: `getCompanies`, `getCompanyById`, `getCompanyByUser`, `registerCompany`, `updateCompany`, owner linkage; RLS owner-managed. [VC]
- Company attach during job posting with completion utility (implemented but not previously documented). [VC]

---

### F-23 — Gamification (XP / Badges / Leaderboard)

**Status: Orphaned as a user-facing capability** [VC] · **Actors:** (no UI) — backend/schema only

- Schema: `badges` (5 default badges seeded: First Steps 50 XP, Job Seeker 100, Networker 75, Learner 200, Problem Solver 150), `user_badges`, `xp_transactions` (ledger; trigger `update_leaderboard_xp` recomputes `leaderboard.total_xp`), `leaderboard` (public RLS SELECT; total/weekly/monthly XP, rank). [VC]
- Backend `gamification-service` with controller/service/event-consumer exists; frontend `gamificationService` (getLeaderboard/getUserBadges/getUserXP) + tests exist; **no page imports it** — leaderboard is invisible in the product. [VC]
- Dashboard XP/level reading comes from `leaderboard` directly via `dashboardService`. [VC]

**Gap:** Decision required — surface leaderboard/badges UI or cut the schema/service surface (see §28).

---

### F-24 — Cross-Cutting Platform Behaviors

| Behavior | Status | Evidence |
|---|---|---|
| Safe-failure standard (degraded states labeled, retry affordances, no provider error leakage) | Implemented [VC] | Shell/service patterns; `degraded_state_shown` telemetry; `validate:write-fallback-safety`. |
| Product analytics pipeline | Implemented [VC] | `trackEvent` → `product_analytics_events` (direct insert, no batching) + localStorage ring buffer (cap 100) fallback; canonical events; ~17–20 workflow recorder modules (resume ~43 actions, networking ~30, messaging 20, LMS 15, …). Batching = [REC]. |
| Dark mode + reduced-motion kill switch + focus-visible tokens | Implemented [VC] | Aura tokens; `test:contrast`, `test:keyboard`, a11y suite. |
| Dual toast systems (shared Toast + ToastContext) | Implemented (debt) [VC] | Consolidation [REC]. |
| Feature flags (backend) | Implemented [VC/VD] | `Feature` enum + `FeatureFlagService` (runtime overrides), `EnabledForFeature`/`RequiresFeature` AOP aspects, gateway `FeatureFlagController`; ~40 `enable_*` flags default-off posture. |
| Module Federation host (AuthComponents micro-frontend) | Implemented [VC] | Single-runtime ambiguity noted [VD]. |
| Auditor-safe scheduler runs | Implemented [VC] | `scheduler-audit.mjs` writes sanitized audit rows (secrets redacted). |
| File upload security | Implemented [VC] | Magic-byte inspection (PDF/PNG/JPEG/WebP/DOCX), script-tag stripping, EICAR malware scanner hook, MIME verification. |
| API error contract | Implemented [VC] | `GlobalExceptionHandler` returns stable codes (INTERNAL_ERROR/VALIDATION_ERROR/INVALID_REQUEST/ACCESS_DENIED) + `X-Correlation-ID`; no stack traces leaked (PROBLEM-0005 fixed). |

**FR-F24-1 (RU-25):** Analytics failures must degrade silently (localStorage ring buffer ≤100) and never block the UX. [VC]
**FR-F24-2 (RU-26):** Provider/vendor errors are never surfaced verbatim to users. [VC]

---

### F-25 — Trust & Safety: Content Reporting & Moderation

**Status: Implemented but Not Documented (persistence schema-dependent)** [VC] · **Actors:** any authenticated role (reporter), ADMIN (moderation triage)

**Surface:** `services/trustAndSafetyService.ts` (~410 lines), `components/trust/ReportContentModal.tsx`, `components/trust/TrustAndSafetyModerationQueue.tsx`, wired into `pages/jobs/JobsPage.tsx` ("Report job listing") and `pages/admin/AdminDashboard.tsx` (moderation queue). **Was absent from all prior PRD/BRD cataloging — discovered in the §30 self-review pass.**

| Capability | Status | Details |
|---|---|---|
| Report submission | Implemented [VC] | Target types `job_posting` / `user_profile` / `company` / `message`; reasons `spam`, `scam`, `harassment`, `inappropriate_content`, `misleading`, `other`; optional `details`. Required: target_type, target_id, reason. |
| Moderation queue | Implemented [VC] | Paginated; filterable by status (`pending` / `under_review` / `resolved` / `dismissed`) and target type; per-status counts. |
| Status triage | Implemented [VC] | Admin actions `under_review` → `resolve` / `dismiss`, each recording `resolution_notes`. |
| Stats | Implemented [VC] | `getReportStats` returns totals by status. |
| Persistence | Partially Implemented [VC] | Best-effort Supabase reads/writes to a **`content_reports` table that is NOT present in the canonical unified schema or generated types**; on absence/failure the service degrades to a localStorage queue (`talentsphere:moderation_reports:local`) with cross-tab `REPORT_SUBMITTED_EVENT` / `REPORT_RESOLVED_EVENT` custom events. |
| Degradation UX | Partial [VC] | Failures `console.warn` and fall back locally; **no explicit user-facing degradation label verified** for the moderation queue. |

**Functional requirements:**
- FR-F25-1: Report submission requires `target_type`, `target_id`, and `reason`; optional details are trimmed. [VC]
- FR-F25-2: Moderation status transitions: `pending → under_review → (resolved | dismissed)`; resolution notes recorded. [VC]
- FR-F25-3: If the Supabase operation fails or `content_reports` is absent, the report/queue must degrade to localStorage and dispatch cross-tab events without breaking the flow. [VC]

**Acceptance criteria:**
- AC-F25-1: Given a job card, When a user opens "Report job listing" and submits with a reason, Then a `pending` report is recorded (Supabase or local fallback) and a success state is shown. [VC]
- AC-F25-2: Given an admin opening the moderation queue with no `content_reports` table, When the Supabase query fails, Then the queue renders from local storage without a blank page. [VC]

**Gaps:** the shared moderation queue only functions when an admin provisions `content_reports` with RLS policies; on the canonical schema as shipped, reports are per-browser localStorage (Q-14). Stats counts are computed client-side from fetched rows, not server aggregates. [VC/INF]

---

## 8. Functional Requirements — Consolidated Index

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-F01-1 | 401s coalesce into one refresh; failure → logout + `/login` | Implemented | axios interceptor [VC] |
| FR-F01-2 | Unauthenticated → `/login`; role-mismatch → `/dashboard` | Implemented | ProtectedRoute [VC] |
| FR-F02-1 | Landing stats live or labeled-fallback | Implemented | LandingPage [VC] |
| FR-F03-1 | Dashboard partial-refresh with labeled sections + retry | Implemented | DashboardPage + tests [VC] |
| FR-F04-1 | Cursor-or-offset pagination, combinable filters | Implemented | jobService [VC] |
| FR-F04-2 | Hidden Explore jobs persist and never render | Implemented | hiddenExploreJobs [VC] |
| FR-F05-1 | Submit blocked without review dialog | Implemented | Application Studio [VC] |
| FR-F05-2 | Withdraw deletes record; resubmission allowed | Implemented | applicationService [VC] |
| FR-F06-1 | Bulk status actions require review + confirm | Implemented | CandidatesPage [VC] |
| FR-F07-1 | Publish gated by completeness + duplicate check | Implemented | canPublishRecruiterPosting [VC] |
| FR-F07-2 | DB trigger enforces publish readiness | Implemented | enforce_job_publish_readiness [VC] |
| FR-F08-1 | Enroll idempotent | Implemented | lmsService [VC] |
| FR-F08-2 | Gateway failure → Supabase fallback + banner | Implemented | lmsService hybrid [VC] |
| FR-F09-1 | Submission records sample-check + passed_tests; retries append | Implemented | challengeService [VC] |
| FR-F10-1 | Mutual counts server-side only | Implemented | get_mutual_connection_counts RPC [VC] |
| FR-F11-1 | Attachment size/MIME gate before send | Implemented | messagingService [VC] |
| FR-F11-2 | Realtime read propagation via Supabase | Implemented | postgres_changes [VC] |
| FR-F12-1 | AI outputs draft; no mutation without explicit save | Implemented | automation_suggestions [VC] |
| FR-F14-1 | Imported resume fields require per-field confirmation | Implemented | ResumeBuilder [VC] |
| FR-F16-1 | Mark-all-read confirmation | Implemented | NotificationsPage [VC] |
| FR-F16-2 | Digest dedupe on delivery_key | Implemented | digest machinery [VC] |
| FR-F17-1 | Demo-mode labeling on all billing surfaces | Implemented | billingMode [VC] |
| FR-F18-1 | Account deletion typed confirmation | Implemented | SecuritySettings [VC] |
| FR-F18-2 | Current deletion = soft-deactivate | Implemented Differently | settingsService [VC] |
| FR-F20-1 | `?q=` consumed once | Implemented | CommandSearch [VC] |
| FR-F21-1 | Extension local-only, no sync without explicit action | Implemented | extension + contract test [VC] |
| FR-F24-1 | Analytics degrade silently | Implemented | trackEvent [VC] |
| FR-F24-2 | No raw provider errors | Implemented | safe-failure patterns [VC] |
| FR-F25-1 | Report requires target_type/target_id/reason | Implemented | trustAndSafetyService [VC] |
| FR-F25-2 | Moderation triage pending→under_review→(resolved\|dismissed) | Implemented | trustAndSafetyService [VC] |
| FR-F25-3 | Local fallback when `content_reports` absent/fails | Implemented | trustAndSafetyService [VC] |

---

## 9. User Journeys (J-1…J-10)

| Flow | Path | Critical verified acceptance anchors |
|---|---|---|
| **J-1 Candidate discovery → apply** | Jobs explore → filter/save search → job detail → Studio draft → review dialog → submit → status timeline → track in "Applied" | Draft survives reload (localStorage); submit blocked without review confirm; withdraw deletes record; timeline records transitions [VC] |
| **J-2 Candidate learning** | LMS browse → enroll (idempotent) → progress + lesson completion → COMPLETED; optional AI learning-plan draft handoff | Double-enroll returns same enrollment; fallback shows banner, never blank [VC] |
| **J-3 Recruiter pipeline** | Post job (gated publish) → applicants queue → notes/scorecard → bulk status (review + confirm) → interview planner → status-event notifications to candidates | Publish blocked on incomplete/duplicate; bulk action impossible without confirm step [VC] |
| **J-4 Networking cadence** | Suggestions → connect (optional note) → recipient accept/decline → follow-up reminder scheduled → digest/notification | Withdrawn invites removable; reminders delivered by scheduler on due date [VC] |
| **J-5 Messaging exchange** | Conversations → thread pagination → attach (validated) → send/retry → realtime delivery/read | Oversized/disallowed attachment rejected; unread clears via conversation-level mark-read [VC] |
| **J-6 AI-assisted improvement** | AI chat → suggestion draft → save/dismiss → optional prefill into Profile/Resume/LMS/Application | No mutation without explicit save; provenance visible; degraded state labeled [VC] |
| **J-7 Account & settings ops** | Settings → prefs/password → soft-deactivate (typed confirm) | Typed confirmation required; billing snapshot demo-labeled [VC] |
| **J-8 Admin oversight** | Stats → service health links → automation status → audit log browser → analytics insights | Audit rows include actor/entity/ip/ua; automation panel mirrors schedulers [VC] |
| **J-9 Companion capture** (extension) | Scan portal page → local draft (review) → tracker → optional manual import to web app | Draft flagged "needs review" when details are partial; strictly local [VC] |
| **J-10 Report & moderate** | Report action (e.g., job card) → report modal (reason/details) → submit → admin moderation queue → triage (under_review/resolve/dismiss) → stats | Report requires target_type/target_id/reason; queue filterable by status; resolution notes captured; self-degrades to localStorage without `content_reports` table [VC] |

Flows J-1…J-8 were also mapped 1:1 in prior docs (PRD v2.0 §2.3). Flow-level detail for execution chains is maintained in `FLOW.md`.

---

## 10. Workflow Specifications (representative end-to-end flows)

### 10.1 Application submission (J-1 core step)
1. **Actor**: USER. **Trigger**: clicks "Apply" on a job card.
2. **Entry**: Application Studio opens with any existing draft / profile prefill.
3. Draft persisted locally; user may sync to account (`application_drafts`, source manual/profile/ai).
4. Submit opens a **pre-send review dialog**; if invalid, submission blocked.
5. On confirm → insert `job_applications` (status PENDING) + initial `application_status_events` row + recruiter notification.
6. **Success**: "Application submitted successfully" toast; job card → "Applied"; recruiter sees applicant in `/candidates`.
7. **Failure**: safe error copy; draft preserved; retry available.
8. **Alternative paths**: withdraw (delete + resubmit); status advances by recruiter (PENDING→REVIEWED→INTERVIEW→OFFER/REJECTED) with candidate notifications.

### 10.2 Job publishing (J-3 core step)
1. **Actor**: RECRUITER. **Entry**: `/jobs/post`.
2. Draft/template applied; company attached (completion utility).
3. "Review & Publish": `canPublishRecruiterPosting` + DB trigger both gate PUBLISHED.
4. Success → `/jobs` My Posts; failure → highlighted fields + preserved draft.
5. Later lifecycle: CLOSED/ARCHIVED.

### 10.3 Saved-search digest pipeline (automated)
1. **Trigger**: scheduler cron `discover-saved-search-digests.mjs`.
2. Loads alert-enabled saved searches, published jobs; matches by term/type/location/salary bounds.
3. Skips on: alert disabled, settings missing, digests off, baseline-not-initialized, no new matches.
4. Queues/upserts `notification_digest_items` (delivery_key dedupe; deliver_after now+1d/7d).
5. `run-notification-digests.mjs` promotes due items into `notifications` (JOB_ALERT; action_url `/jobs`), groups per user+frequency; marks delivered/skipped.
6. Audit rows (`scheduler.{job}.{started/completed/failed}`) written by `scheduler-audit.mjs` with redaction.

### 10.4 Networking reminder pipeline (automated)
1. **Trigger**: `run-networking-reminders.mjs`.
2. Selects unread notifications with metadata kind `networking_follow_up_reminder` not already delivered and due.
3. Promotes same row → "Connection follow-up due", action_url `/networking`.
4. Audit wrapped.

---

## 11. UX Requirements

- **Design system**: Aura kit — `PageHeader`, `GlassCard`, `AuraButton`, `AuraInput`, `AuraModal`, `Tabs`, `Badge`, `Skeleton` loaders, `EmptyState`, `SourceStatusBadge`, `Toast`; light+dark semantic tokens; no raw hex literals (enforced by `validate-ui-design-system.mjs`). [VC/VD]
- **State conventions**: loading = skeletons; empty = EmptyState with next-action CTA; error = inline alert + retry; degraded = banner explaining source (labeling `live`/`partial`/`fallback` where relevant). [VC]
- **Motion**: respects reduced-motion kill switch. [VC]
- **Accessibility**: WCAG 2.1 AA contrast (4.5:1 minimum) automated; `role=alert/dialog/status/list/listitem` usage; keyboard navigation tests; named landmarks (`{Route} application content`). [VC]
- **Responsive**: desktop shell (sidebar) + mobile drawer + bottom tabs; mobile priority groups per role. [VC]
- **Known UX debts**: header avatar non-interactive (no profile/logout menu); two toast systems; unwired shell variants (MobileMenu, AuraStatusBar inconsistent). [VC]

---

## 12. Business Rules Affecting Product Behavior

Business rules are governed in the BRD §13 (`RU-01…RU-26`). Product-facing highlights:

- **RU-01 (roles)** — exactly USER/RECRUITER/ADMIN; route access per §3.2.
- **RU-02 (ownership)** — exactly one primary feature owner per route.
- **RU-03/04 (jobs)** — lifecycle DRAFT→PUBLISHED→(CLOSED|ARCHIVED); publish requires completeness + no duplicate match.
- **RU-05/06/07 (applications)** — status flow; one active application per pair; withdraw = delete + resubmission allowed.
- **RU-08/09 (LMS)** — idempotent enrollment; ENROLLED→IN_PROGRESS→(COMPLETED|DROPPED).
- **RU-10/11 (challenges)** — XP once per pass (enforcement point [VC/INF]); submissions record sample-check + passed_tests.
- **RU-12 (networking)** — consent-based connections; BLOCKED defined but unreachable.
- **RU-13/14 (messaging)** — attachment gates; conversation-level read receipts.
- **RU-15 (AI)** — all AI outputs persist as `draft`; explicit save promotes; dismissals retained.
- **RU-16/17 (notifications)** — digest dedupe + frequencies + quiet hours; mark-all-read confirmable.
- **RU-18 (billing)** — demo labeling; no live charge path.
- **RU-19 (account)** — typed-confirmation deletion.
- **RU-20 (RLS)** — RLS governs every private table.
- **RU-21 (audit)** — sensitive admin actions write `audit_log`.
- **RU-22 (schedulers)** — service-role, audited runs.
- **RU-23 (seed)** — destructive seed requires the literal token.
- **RU-24 (extension)** — local-only storage.
- **RU-25/26 (UX)** — silent analytics degradation; no raw provider errors.
- **RU-27 (trust & safety)** — report triage lifecycle `pending → under_review → (resolved | dismissed)`; submission requires target type/id + reason; local fallback when the shared `content_reports` table is absent (F-25/Q-14).

---

## 13. Data Requirements (product-perspective)

### 13.1 Database at a glance [VC]

Supabase/PostgreSQL. Canonical baseline: `infra/db/migrations/0001_initial_baseline.sql` (1,483 lines) mirrored by `supabase-schema.sql` and `infra/db/generated/database.types.ts`.

- **49 tables** in the unified baseline (11 domains). `DATA_OWNERSHIP.md` classifies **59 tables** across current + legacy sources (49 + 10 legacy-master-only). **139 source-level index statements; 46 indexed tables; 69 public FK relationships.** [VC]
- **12 enums** (see §13.3) + several CHECK-constrained pseudo-enums (draft version reasons, review_status, digest_frequency, subscription/payment statuses, resume artifact/export statuses, saved-search source).
- **110 RLS policies across 38 tables** (11 tables have RLS disabled — see §13.6 and §29). [VC]
- **28 triggers** (25 `updated_at` + publish-readiness + auto-profile-create + leaderboard XP recompute) and **5 functions** (`update_updated_at_column`, `enforce_job_publish_readiness`, `create_user_profile`, `update_leaderboard_xp`, `get_mutual_connection_counts`). [VC]
- **Realtime publication: none defined in schema** — messages realtime must be enabled at the Supabase project level. [VC]
- **Views: none in canonical schema** (legacy `scripts/gamification_view.sql` and `search_partition.sql` reference pre-unification tables). [VC] This **CONFLICTs** with PRD v2.0's claim of an "XP-once DB view".

### 13.2 Key entities (business meaning)

| Entity | Meaning |
|---|---|
| `auth.users` / `profiles` | Identity chain: Supabase auth user ↔ 1:1 identity row (role, name, active flag, soft-delete). |
| `user_profiles` | Extended professional profile (headline, summary, XP/level); auto-created at signup; 1:1. |
| `skills / experiences / educations / certifications / languages / projects` | Career history building blocks. |
| `companies` | Employers; owner-verified; posted-by linkage. |
| `jobs` | Postings with publish gating, salary, requirements, lifecycle. |
| `job_applications` + `application_status_events` | Applications + immutable transition timeline. |
| `application_drafts` / `_draft_versions` | Draft-first application authoring with versioning. |
| `resume_artifacts` / `resume_export_events` | Resume files + export audit. |
| `candidate_notes` / `candidate_scorecards` | Private recruiter evaluation artifacts per application. |
| `saved_job_searches` | Reusable search presets + alert flag + match baselines for digests. |
| `hidden_explore_jobs` | "Hide this job" preferences. |
| `ai_sessions` / `automation_suggestions` / `_audit_events` | AI conversation + reviewable suggestions + audit. |
| `product_analytics_events` | Usage event stream. |
| `connections` / `networking_suggestion_preferences` | Consent graph + dismissal memory. |
| `conversations` / `conversation_participants` / `messages` | DM/group chat. |
| `courses` / `lessons` / `enrollments` / `lesson_progress` | LMS. |
| `challenges` / `challenge_submissions` | Coding challenge content + attempts. |
| `badges` / `user_badges` / `xp_transactions` / `leaderboard` | Gamification. |
| `notification_settings` / `notifications` / `notification_digest_items` | Preferences, inbox, digest queue. |
| `subscription_plans` / `subscriptions` / `payments` | Billing catalog + state + ledger. |
| `system_settings` / `audit_log` | Platform config + security audit trail. |
| `content_reports` (referenced by F-25; **absent from canonical baseline**) | Content moderation — reports against jobs/profiles/companies/messages with reason + status + resolution notes; best-effort Supabase write with localStorage fallback (F-25/Q-14). |

### 13.3 Enums (12)

`user_role` (USER/ADMIN/RECRUITER) · `proficiency_level` (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT) · `profile_rank` (NOVICE/COMPETENT/PROFICIENT/EXPERT/MASTER) · `job_type` (FULL_TIME/PART_TIME/CONTRACT/FREELANCE/INTERNSHIP) · `job_status` (DRAFT/PUBLISHED/CLOSED/ARCHIVED) · `application_status` (PENDING/REVIEWED/INTERVIEW/OFFER/REJECTED) · `connection_status` (PENDING/ACCEPTED/REJECTED/BLOCKED) · `challenge_difficulty` (EASY/MEDIUM/HARD) · `challenge_category` (FRONTEND/BACKEND/FULLSTACK/DATABASE/DEVOPS/MOBILE/DATA_SCIENCE) · `enrollment_status` (ENROLLED/IN_PROGRESS/COMPLETED/DROPPED) · `message_status` (SENT/DELIVERED/READ) · `notification_type` (JOB_APPLICATION/JOB_ALERT/MESSAGE/CONNECTION/COURSE_UPDATE/CHALLENGE/ACHIEVEMENT/SYSTEM).

### 13.4 Derived / calculated values

- **Level** = ⌊`total_xp`/100⌋ + 1 (dashboard computation). [VC]
- **Leaderboard XP** = SUM(`xp_transactions.amount`) recomputed by trigger per insert. [VC]
- **Course progress** = derived from completed lessons per enrollment. [INF]
- **Match counts / new-match counts** for saved-search digests computed during discovery. [VC]
- **Mutual connection counts** server-side RPC. [VC]

### 13.5 Lifecycle & state transitions (user-visible)

- Job: DRAFT → PUBLISHED → (CLOSED | ARCHIVED). [VC]
- Application: PENDING → REVIEWED → INTERVIEW → (OFFER | REJECTED). [VC]
- Enrollment: ENROLLED → IN_PROGRESS → (COMPLETED | DROPPED). [VC]
- Connection: PENDING → (ACCEPTED | REJECTED) [BLOCKED in enum, unreachable]. [VC]
- Message: SENT (DELIVERED/READ in enum, READ propagated at conversation level). [VC]
- Suggestion review: draft → (saved | dismissed). [VC]
- Resume artifact: active → deleted (tombstone). [VC]
- Account: active → soft-deactivated (`is_active=false` + `deleted_at`). [VC]

### 13.6 RLS / data-access gaps (canonical)

- `experiences` and `educations` have RLS **enabled with zero policies** → unreadable in practice as written. **CONFLICT/risk** (profile CRUD depends on them; resolution: add SELECT/INSERT/UPDATE/DELETE policies or disable RLS). [VC]
- `conversation_participants` never has RLS **enabled** despite having a (read-marker) policy → wide-open read risk. [VC]
- 11 tables have RLS OFF (`certifications`, `languages`, `projects`, `lessons`, `lesson_progress`, `conversation_participants`, `badges`, `user_badges`, `xp_transactions`, `system_settings`, `audit_log`). Several are intentionally public or admin-only; document intent per table. [VC]
- `subscriptions` has **user-own SELECT only** — no user INSERT/UPDATE; subscription changes happen via Edge Functions/service-role only. [VC]
- `audit_log` is unprotected (admin/service writes) — acceptable only if restricted to service-role; verify. [VC/UNK]
- `content_reports` has **no definition in the canonical schema**; the trust & safety service (F-25) writes it best-effort and degrades to a per-browser localStorage queue (Q-14). [VC]

---

## 14. Security & Privacy Requirements

Confirmed [VC unless noted]:

- **Authentication**: Supabase Auth as single identity authority (DECISION-001/ADR-001). Local Spring credentials disabled (410 Gone) unless `AUTH_LOCAL_CREDENTIALS_ENABLED=true`. JWT verified at gateway (HMAC HS256), roles normalized. [VC]
- **Authorization**: role matrix (§3.2) + 110 RLS policies. [VC]
- **Secrets**: never in client bundle; privileged ops service/scheduler-side; secret scanning + Trivy in CI; scheduler audit redacts secrets. [VC]
- **Error hygiene**: no stack traces / DB errors leaked; safe error codes + `X-Correlation-ID`. [VC]
- **File uploads**: MIME verification, magic bytes, script-tag stripping, EICAR malware scanner hook, allowed types. [VC]
- **Rate limiting**: gateway Redis `RequestRateLimiter` (per-route config). [VC]
- **Sensitive operations**: account soft-delete requires typed confirmation; mark-all-read confirmable; bulk recruiter actions review+confirm; publish gating. [VC]
- **Extension privacy**: strict local-first; contract-tested; no host permissions/OAuth; telemetry sanitized. [VC]
- **Auditability**: `audit_log` for sensitive/admin actions; scheduler audit trail. [VC]
- **Data deletion**: soft-deactivation only; **no hard-delete or export path confirmed** → compliance/retention gap (Q-6). [VC]
- **Dev backdoor**: mock/E2E auth override gated to dev; product-build strip assertion is a [REC]. [VC]

---

## 15. Non-Functional Requirements (discovered, not invented)

| NFR | Requirement | Status / evidence |
|---|---|---|
| Performance | API client timeout 30s; per-domain timeouts (AI 10s, admin 2s); dashboards aggregate in parallel | Implemented [VC] |
| Reliability | Every remote-backed surface defines fallback + labeled degradation; prompts recoverable | Implemented [VC] |
| Availability | Hybrid Supabase-first with gateway fallback; schedulers external (SPOF) | Implemented/Partial [VC] |
| Scalability | Pagination/cursors; unbatched analytics inserts (risk at scale) | Partial [VC] — batching [REC] |
| Security | §14 | Implemented [VC] |
| Privacy | Extension locality; no raw provider leakage; local-first drafts | Implemented [VC] |
| Accessibility | Contrast >=4.5:1, keyboard, semantics; automated suites | Implemented [VC] |
| Compatibility | Chromium-first (Playwright); responsive shells; cross-browser matrix UNK | Partial [VC/UNK] |
| Observability | Admin links; audit_log; scheduler audit; Prometheus/OTel/Tempo/Grafana configs | Implemented [VC/VD] |
| Maintainability | 22 contract validators; single-schema authority; typed client boundary | Implemented [VC] |
| Testability | ~126 Vitest files / ~736 tests; ~28 Playwright specs (~114 cases); 40 backend test files (CI-only); extension suites | Implemented; backend local runnability [UNK] |
| i18n | Not implemented | Absent [VC] |

---

## 16. Integrations

| ID | Integration | Direction/Trigger | Data exchanged | Status |
|---|---|---|---|---|
| INT-01 | Supabase Auth | Bidirectional; login/register/logout/reset | Credentials, session, JWT, roles | Implemented [VC] |
| INT-02 | Supabase PostgREST (direct) | Bidirectional; all core CRUD | Tables via typed client (45 tables direct) | Implemented [VC] |
| INT-03 | Supabase Realtime | Messages subscribe (postgres_changes) | Message rows | Implemented (project-level config [VC/UNK]) |
| INT-04 | socket.io | NotificationContext push | Notification events (redundant w/ polling — debt) | Implemented [VC] |
| INT-05 | Supabase Edge Functions | `create-checkout-session`, `create-subscription`, `create-billing-portal-session` | Payment/subscription intents | Implemented (scaffold/demo) [VC] |
| INT-06 | Spring API Gateway | HTTP `/api/v1/*`; gateway-first (LMS) with fallback | REST payloads; `X-User-Id`, `X-User-Role` headers | Implemented [VC] |
| INT-07 | File Service (Spring) | Multipart POST `/api/v1/files` | Uploaded docs/avatars; security checks | Implemented [VC] |
| INT-08 | RabbitMQ `talentsphere.events` | Publishers in 5+ services; domain routing keys | Domain events (`application.submitted`, `gamification.xp.added`, …) | Implemented (backend-side) [VC] |
| INT-09 | feature flags | Backend `FeatureFlagController` + AOP aspects | Flag lookups | Implemented (backend) [VC/VD] |
| INT-10 | Judge0 / Piston | Challenge execution | Code evaluation | **UNK** (documented only) [UNK] |
| INT-11 | Stripe (live) | Checkout/webhooks | Payments | **Not active** (demo mode; ADR-005) [VC] |
| INT-12 | Scheduler scripts | `scripts/*.mjs` with service-role | Digest/reminder curation + delivery | Implemented [VC] |
| INT-13 | Observability stack | Prometheus scrape, Tempo, Promtail, Grafana | Metrics/traces/logs | Configured [VD/VC] |
| INT-14 | Module Federation | Host exposes AuthComponents | Auth micro-frontend | Implemented [VC] |
| INT-15 | External portal scraping (extension) | Content-script read of LinkedIn/Indeed/Glassdoor | Local-only job metadata | Implemented [VC] |
| INT-16 | Redis (internal platform) | Gateway `RequestRateLimiter`; token blacklist, MFA OTP, email-verification + brute-force protection (auth); cache (search/company/job) | Throttle/blacklist/cache entries | Implemented [VC] |
| INT-17 | Elasticsearch (internal platform) | search-service document indexing/query | Profile/Job documents | Implemented (backend) [VC] |
| INT-18 | Eureka service discovery (internal platform) | `spring-cloud-starter-netflix-eureka-client` across services + gateway `lb://` routing | Service registry | Implemented (backend) [VC] |
| INT-19 | OpenFeign service-to-service (internal platform) | auth→user, profile→gamification clients, etc. | Internal REST calls | Implemented (backend) [VC] |
| INT-20 | Spring WebSocket/STOMP (internal platform) | `notification-service` realtime path; `chat-service` removed per ADR-004 (orphan) | Push frames | Implemented (backend; frontend realtime uses Supabase + socket.io) [VC] |

**Failure/retry behavior**: e.g., LMS gateway→Supabase fallback with banner; AI API→heuristic fallback; localStorage ring buffer for analytics; send-message retry; extension messaging 3× retry. [VC]

---

## 17. Notifications

| Trigger | Recipient | Channel | Timing | Notes / status |
|---|---|---|---|---|
| Application submitted | Recruiter (job poster) | Notification row | Immediate | [VC] |
| Application status change | Candidate | Notification row | On change | [INF] |
| Job-alert new matches | User | Notification / digest | Immediate or digest (daily/weekly) | `saved_search_digest` kind; dedupe [VC] |
| Connection request / response | User | Notification row | On event | [INF] |
| Networking follow-up reminder | User (initiator) | Notification row | On due date (scheduler) | `networking_follow_up_reminder`; promoted by scheduler [VC] |
| New message | Participants | Notification + realtime | Immediate | unread badge [VC] |
| Course/challenge/achievement events | User | Notification row | On event | taxonomy supports [VC/INF] |
| Mark-all-read | — | UI action | On demand, confirmable | [VC] |
| Quiet hours | User digests | Suppression window | 18:00–09:00 default | [VC] |

Digest UI preferences: channels email/push/sms; job alerts; message notifications; newsletter; digest frequency; quiet hours. [VC]

---

## 18. Reporting & Analytics

- **Event stream**: `product_analytics_events` (area, event_name, source, object, metadata, occurred_at; user-own + admin-read RLS). [VC]
- **Canonical events** (audited set): task lifecycle, automation-suggestion lifecycle, workflow prefill use/reject, bulk-action reviews, error recovery clicks, degraded-state shown; plus ~17–20 workflow-recorded catalogs (resume ~43, networking ~30, messaging 20, LMS 15, onboarding, saved-search, command-search, etc.). [VC]
- **Admin insights card** reads events for platform insight. [VC]
- **No historical aggregation jobs, cohort jobs, or computed KPI dashboards exist.** (KPI framework, with instrumentation status, is in BRD §16.) [VC]
- **Extension analytics**: bounded local queue (200), sanitized, consent-gated. [VC]

---

## 19. Error Handling & Edge Cases (verified)

| # | Edge case / error | Product behavior |
|---|---|---|
| E-01 | Supabase auth timeout in dev | Dev mock user activated (guarded); prod renders loading-fail state [VC] |
| E-02 | Partial dashboard failure | Partial dashboard with labeled section "did not refresh" + retry [VC] |
| E-03 | LMS gateway down | Supabase fallback + degradation banner [VC] |
| E-04 | Duplicate enroll | Returns existing enrollment [VC] |
| E-05 | AI API down | Heuristic fallback + provenance label [VC] |
| E-06 | Duplicate job posting | Publish gating rejects (duplicate match) [VC] |
| E-07 | Oversized/mis-typed attachment | Rejected client-side before send [VC] |
| E-08 | Digest settings missing/disabled | Scheduler skips with reason; no silent loss (skip reasons audited) [VC] |
| E-09 | Analytics insert failure | localStorage ring buffer (≤100) [VC] |
| E-10 | Provider error strings | Never rendered; safe copy + correlation ID [VC] |
| E-11 | Unknown route | 404 with role-filtered recovery destinations [VC] |
| E-12 | Stale password-reset session | `/reset-password` reachable regardless of session state [VC] |
| E-13 | `experiences`/`educations` RLS with no policies | **Data-write/read risk** for profile CRUD; requires policy resolution [VC] |
| E-14 | `conversation_participants` RLS disabled | Read-marker policy inert; access-listing risk [VC] |
| E-15 | `content_reports` table absent / Supabase insert fails | Report/queue self-heal to localStorage; moderation queue becomes per-browser, not shared, until the table is provisioned (F-25/Q-14) [VC] |

---

## 20. Acceptance Criteria (key features)

- **AC-F01-1/2/3** — see F-01.
- **AC-F02-1** — Landing stats live or labeled-fallback. [VC]
- **AC-F03-1** — Dashboard partial-refresh with labeled sections + retries; raw provider errors absent. [VC]
- **AC-F04-1** — Explore never shows a hidden job after hide. [VC]
- **AC-F05-1** — Submit without review-confirm is impossible. [VC]
- **AC-F07-2** — A job lacking title/description/location/company/requirements cannot reach PUBLISHED (DB-enforced). [VC]
- **AC-F08-1** — Enrolling twice yields one enrollment. [VC]
- **AC-F12-1** — Generating an AI output does not mutate any profile/resume/application field until explicit save. [VC]
- **AC-F14-1** — Imported resume fields are staged for per-field confirmation; nothing applies silently. [VC]
- **AC-F17-1** — Every billing surface displays demo-mode labeling. [VC]
- **AC-F18-1** — Account deactivation requires typed confirmation phrase. [VC]
- **AC-F21-1** — Extension contract test (manifest minimal, local-only) passes in CI. [VC]

---

## 21. Implementation Status Matrix

Legend — Documented: ✅ documented in prior docs · ⚠️ partially/incorrectly · ❌ undocumented. Implemented: ✅ complete · 🟡 partial/substantial · 👻 orphaned · ❌ absent · ? unclear. [VC unless noted]

| ID | Feature | Documented (prior) | Implemented | Implementation level | Evidence | Gap |
|---|---|:---:|:---:|---|---|---|
| F-01 | Auth & Sessions | ✅ (v2) | ✅ | Complete (OAuth absent) | authService, routes, interceptor | OAuth dead; avatar menu missing |
| F-02 | Landing + live stats | ✅ | ✅ | Complete | LandingPage | — |
| F-03 | Dashboard variants | ✅ | ✅ | Complete | DashboardPage, tests | — |
| F-04 | Job marketplace | ✅ | ✅ | Complete | JobsPage, jobService | dead exports; scroll memory (UNK) |
| F-05 | Application studio | ✅ (v2) | ✅ | Complete | applicationService | delete-withdraw semantics corrected |
| F-06 | Candidate management | ❌ → discovered | ✅ | Complete | CandidatesPage, recruiterService | — |
| F-07 | Post-a-Job studio | ✅ | ✅ | Complete | PostJobPage | — |
| F-08 | LMS | ✅ | ✅ | Complete | lmsService hybrid | `/learning` vs `/lms` naming drift |
| F-09 | Challenges | ✅ | ✅ (gamification layer 👻) | Substantial | ChallengesPage | Leaderboard/badges UI orphaned; Judge0 UNK; XP-once enforcement re-verify; difficulty type drift |
| F-10 | Networking | ✅ | ✅ | Complete | NetworkingPage | BLOCKED unreachable |
| F-11 | Messaging | ✅ | ✅ | Complete | MessagingPage | DELIVERED unused; websocket orphan; RLS gap on participants |
| F-12 | AI Assistant | ✅ | ✅ (heuristic) | Substantial | AIAssistant, aiService | No LLM; aiSlice redundancy |
| F-13 | Career path | ✅ | ✅ | Complete | AICareerPath | — |
| F-14 | Resume builder | ✅ | ✅ | Complete | ResumeBuilder | — |
| F-15 | Profile | ✅ | ✅ | Complete | ProfilePage | RLS policy gaps on experience/education |
| F-16 | Notifications | ✅ | ✅ | Complete | NotificationsPage + schedulers | In-app delivery absent (external scripts) |
| F-17 | Billing | ✅ | 🟡 by design | Demo-mode | paymentService, Edge Functions | Live charging blocked (ADR-005) |
| F-18 | Settings | ✅ | ✅ | Complete | SettingsPage | Soft-delete nuance |
| F-19 | Admin console | ✅ | ✅ | Complete (read-heavy) | AdminDashboard | getAllUsers/system_settings UI absent |
| F-20 | Command search | ✅ (v2) | ✅ | Complete | CommandSearch | — |
| F-21 | Chrome extension | ❌ → discovered | ✅ | Complete | extension project + tests | Store distribution pending |
| F-22 | Companies | ⚠️ (partial) | ✅ | Substantial | companyService | completion util undocumented |
| F-23 | Gamification | ⚠️ (schema only) | 👻 | Orphaned | gamificationService (no UI) | Wire or cut |
| F-24 | Cross-cutting behaviors | ⚠️ | ✅ | Substantial | shell/lib/services | toast consolidation, analytics batching, header avatar |
| F-25 | Trust & Safety content moderation | ❌ → discovered | ✅ | Substantial (persistence schema-dependent) | trustAndSafetyService + report modal + moderation queue | `content_reports` table missing from canonical schema (Q-14); no explicit degradation label |

---

## 22. Gap Analysis (summary — detail in BRD §19)

### 22.1 Confirmed gaps
- **Documented, not implemented**: OAuth login; WebSocket chat transport (Supabase Realtime is real); Supabase Storage buckets (uploads via file-service REST; `.env.example` advertises storage anyway); feed posting (feed is profile-synthesized); certificate issuance; video calls; mentorship; referrals; i18n. [VC]
- **Orphaned**: gamification UI (leaderboard/badges); `websocket.ts`, `oauth.ts`, `searchTokenizer.ts`, `types/skills.ts`; `applyToJob`/`markMessageAsRead`/`getAllUsers`/`getSystemSettings`; partial `aiSlice` redundancy; unwired shell components. [VC]
- **Partially implemented**: billing (live charging), backend local runnability (tests CI-only, no Maven wrapper locally), cross-browser matrix, admin user/settings management UI. [VC]
- **Schema/security gaps**: `experiences`/`educations` RLS no-policy lockout; `conversation_participants` RLS not enabled; no realtime publication defined; XP-once not DB-enforced; seed-data.sql incompatible with the unified schema (references `feed_posts`, `post_likes`, `post_comments`, `portfolio_items`, and legacy columns such as `skills.user_id`, `jobs.recruiter_id`); `seed_data.py` similarly targets a different `user_profiles` shape. [VC]
- **Trust & Safety persistence gap**: the `content_reports` table referenced by the trust & safety service (F-25) is absent from the canonical baseline and generated types — the moderation queue is shared only if an admin provisions the table, otherwise reports/queue run per-browser on localStorage (Q-14). [VC]
- **Data-lifecycle gap**: no hard-delete/export policy; account deactivation is soft. [VC]
- **Judging pipeline**: Judge0 wiring UNKNOWN. [UNK]

### 22.2 Suspected gaps (need confirmation)
- Recruiter access intent for networking/messaging (routes allow; product copy unclear) — Q-7.
- Click-through capture for digest engagement (K-13) absent.
- Realtime messaging end-to-end not provable from schema alone.

---

## 23. Open Questions

| ID | Question |
|---|---|
| Q-1 | Billing pricing tiers beyond seeded demo plans? |
| Q-2 | Extension store distribution & policy constraints? |
| Q-3 | Backend endgame: modular monolith (`apps/backend`) vs retained services? |
| Q-4 | Is socket.io still needed given Supabase Realtime? |
| Q-5 | What actually executes challenge submissions (Judge0/Piston wiring)? |
| Q-6 | Data-retention/export policy for drafts, sessions, analytics, and deleted accounts? |
| Q-7 | Intended recruiter access to Networking/Messaging? |
| Q-8 | i18n priority languages? |
| Q-9 | LLM vendor + privacy requirements when a live model is introduced? |
| Q-10 | Certificate strategy (schema has `certificate_url` passthrough only)? |
| Q-11 | Resolve `experiences`/`educations` RLS no-policy state and `conversation_participants` RLS-off state? |
| Q-12 | Resolve seed-data.sql vs unified schema incompatibility (maintain as legacy corpus, split, or re-author)? |
| Q-13 | Should XP-once be DB-enforced (unique constraint/function) to close the current reliance on service logic? |
| Q-14 | Should `content_reports` be added to the canonical schema (with RLS policies) so the moderation queue is shared, or is a per-browser/local-only scope acceptable? |

---

## 24. Assumptions

| # | Assumption | Class |
|---|---|---|
| A-1 | Single-region Supabase deployment acceptable near-term | ASM |
| A-2 | `seed-data.sql`/`seed_data.py` are legacy and must be re-authored or retired before use against the unified schema | [CONFLICT] resolved toward legacy/incompatible pending verification |
| A-3 | Heuristic AI acceptable until Q-9 lands | ASM |
| A-4 | Frontend test suite Windows-compatible and CI-executed | VD |

---

## 25. Future / Planned Capabilities (explicitly not yet built)

- Live LLM provider behind the existing provenance + review contracts (PRD v2 phase 3; BRD BO-2 [PLN]).
- Live Stripe activation per ADR-005 exit criteria [PLN].
- Modular monolith consolidation (`apps/backend`) [PLN].
- Leaderboard/badges UI surfacing or schema cut (decision needed) [PLN/REC].
- Connection BLOCKED implementation or enum removal [REC].
- Batched analytics writer; header avatar menu; toast unification [REC].
- i18n and cross-browser certification [PLN].
- Extension store distribution [PLN].
- KPI dashboards / cohort instrumentation [PLN].

## 26. Deprecated / Retired / Corrected Items

| Item | Disposition |
|---|---|
| WebSocket chat transport (`lib/websocket.ts`) | Orphaned/retired in favor of Supabase Realtime [VC] |
| Local Spring username/password credentials | Deprecated by default (410 Gone; ADR-001) [VC] |
| `chat-service` | Orphaned (removed from reactor + gateway; ADR-004) [VC] |
| Fabricated "94.2% match rate" landing stat | Removed; replaced with live counts [VC] |
| Feed authoring (posts/likes/comments) | Absent from unified schema; feed profile-synthesized [VC] |
| `supabase_smaster.sql` / `supabase_master.sql` legacy schema | Legacy evidence only (ADR-003) [VD] |
| PRD v2.0 "XP-once DB view" claim | Corrected: no canonical view; enforcement re-check [CONFLICT] |
| PRD v2.0 "job route for ADMIN" claim | Corrected: registry restricts `/jobs` to USER+RECRUITER [CONFLICT] |
| PRD v2.0 "seed-data.sql runnable" implication | Corrected: incompatible with unified schema [CONFLICT] |

## 27. Implementation Status Matrix — final (traceability)

See §21 comprehensive matrix above (per-feature documented/implemented/level/status/evidence/gap). Backend modules and API routes are tracked via generated reports (`report:api-contracts`, `report:api-openapi` — 123 operations, 56 schemas) and `docs/API_OPENAPI_CONTRACT.json`. [VC]

## 28. Gap Analysis

See §22 above; BRD §19 provides the business-aligned view.

## 29. Appendix / Evidence Index

| Evidence area | Location |
|---|---|
| Living architecture + decisions + boundaries | `ARCHITECTURE.md`, `DECISION.md`, `PROJECT-BOUNDARIES.md`, `PROBLEMS.md`, `FLOW.md`, `IMPLEMENTATION-PLAN.md` (workspace root) |
| Master plan | `PLAN.md` (workspace root; 29 sections incl. validation checklist, debt register, roadmap) |
| Feature/dashboard inventory | `docs/FEATURES_AND_DASHBOARDS.md` |
| Traceability & gaps | `docs/CODEBASE_TRACEABILITY.md` |
| Data ownership | `docs/DATA_OWNERSHIP.md` + `data-ownership-manifest.json` |
| Module/lifecycle registry | `docs/MODULE_MANIFEST.md` + `module-manifest.json` |
| ADRs | `docs/adr/ADR-001…005` |
| Runbooks | `docs/OPERATIONAL_RUNBOOK.md`, `docs/runbooks/INCIDENT_RUNBOOKS.md` |
| Schema & types | `infra/db/migrations/0001_initial_baseline.sql`, `supabase-schema.sql`, `infra/db/generated/database.types.ts` |
| Frontend | `apps/frontend/src` (pages/services/store/navigation/lib), `apps/frontend/tests` |
| Backend | `services/*` (26 reactor modules), `apps/backend` (skeleton) |
| Extension | `chrome-extension-project/src`, `scripts/*.test.mjs` |
| Schedulers/validators | `scripts/*.mjs` (~22 `validate-*.mjs` contract validators; the 3 schedulers + audit each ship `.test.mjs` counterparts) |
| Observability | `infra/observability/`, `docker/` |
| CI | `.github/workflows/talentsphere-ci.yml` |

---

*End of PRD v3.0. Any status dispute resolves via repository evidence; see BRD v3.0 for the business view and §26 correction log for prior-doc fixes.*