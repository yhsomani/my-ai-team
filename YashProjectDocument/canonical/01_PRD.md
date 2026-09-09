# TalentSphere — Product Requirements Document (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: Synthesized from `BRD.md`, `PRD.md`, `FEATURES_AND_USER_STORIES.md`, and rebuild baselines.  
> **Rule**: Zero knowledge loss from source documentation.

---

## 1. Executive Summary & Product Vision

TalentSphere is an enterprise-grade, unified career acceleration and talent acquisition ecosystem that merges:
1. **Professional Networking & Realtime Communications** (candidate/peer/recruiter connections, messaging feed).
2. **Comprehensive Job Marketplace & Hiring Pipeline** (multi-facet search, ATS applicant triage, scorecards).
3. **Interactive Learning Management System (LMS)** (modular curricula, progress tracking, auto-certification).
4. **Sandboxed Coding Challenges Arena** (browser-based multi-language evaluation, XP/badge gamification).
5. **AI-Powered Career & Resume Copilots** (heuristic-driven suggestions with provenance tracking).

The platform operates on a **dual-plane architecture**: a high-throughput primary data plane on React 19 + Supabase PostgreSQL (direct PostgREST with 119 RLS policies) coupled with a secondary compute plane of 26 Spring Boot microservices behind a Spring Cloud Gateway for asynchronous and heavy compute workloads.

---

## 2. Stakeholder Personas & RBAC Roles

The system enforces strict role-based access control with three system constants:

```typescript
export const USER_ROLES = {
  USER: 'ROLE_USER',          // Candidates, learners, general developers
  RECRUITER: 'ROLE_RECRUITER',// Hiring managers, corporate recruiters, talent ops
  ADMIN: 'ROLE_ADMIN',        // Platform compliance, security, content moderators
} as const;
```

### Core Persona Archetypes

| Persona ID | Name & Target Role | Archetype Description | Primary Workflows | Key Features Used |
|---|---|---|---|---|
| **P-A** | **Aisha** (`ROLE_USER`) | Active Job Seeker & Upskiller | Discovers remote opportunities, builds verified resumes, tracks application states, takes LMS courses. | F-01, F-04, F-07, F-09, F-10, F-12, F-13, F-14, F-25 |
| **P-B** | **Rohan** (`ROLE_RECRUITER`) | Corporate Recruiter & Hiring Lead | Publishes structured job postings, manages applicant pipeline stages, evaluates candidates using scorecards. | F-01, F-05, F-06, F-10, F-14, F-16 (Demo), F-19 |
| **P-C** | **Priya** (`ROLE_ADMIN`) | Platform Moderator & Compliance Officer | Oversees platform health, enforces content safety via moderation queues, audits scheduler jobs, toggles flags. | F-01, F-17, F-19, F-20, F-24, F-35 |
| **P-D** | **Dev** (`ROLE_USER`) | Technical Specialist & Competitive Coder | Solves complex coding challenges, showcases verifiable project portfolio, climbs the global XP leaderboard. | F-01, F-08, F-12, F-22, F-23, F-26 |

---

## 3. Comprehensive Feature Catalog & Status Matrix

The platform catalogs **39 distinct features** tracked against the 14 fine-grained status classifications.

### Status Legend
- **FI**: FULLY IMPLEMENTED (34 features)
- **PI**: PARTIALLY IMPLEMENTED (1 feature)
- **DE**: DEPRECATED / RETIRED (2 features)
- **IB, II, PH, EX, DI, UN, PL, DO, CO, IR, UK**: Checked, 0 occurrences found.

```
+-------------------------------------------------------------------------------+
|                       TALENTSPHERE FEATURE STATUS MAP                         |
+-------------------------------------------------------------------------------+
| [FI] Fully Implemented (34)   : F-01..15, F-17..37                            |
| [PI] Partially Implemented (1): F-16 (Billing — Demo Mode only per ADR-005)   |
| [DE] Deprecated / Retired (2) : F-38 (chat-service), F-39 (apps/backend stub) |
| Total Cataloged               : 39 Features                                   |
+-------------------------------------------------------------------------------+
```

### Complete 39-Feature Matrix

| Feature ID | Feature Name | Domain | Status | Component / Location | Primary Entities / API | Evidence & Rebuild Notes |
|---|---|---|---|---|---|---|
| **F-01** | Auth & Session Management | Identity | **FI** | `LoginPage`, `RegisterPage`, `ResetPasswordPage` | `auth.users`, `profiles`, `auth-service` | Supabase Auth SSOT (ADR-001); email/pass + OAuth; 19 protected route guards. |
| **F-02** | Public Landing Page | Core Platform | **FI** | `LandingPage.tsx` | Platform stats API, `companies`, `jobs` | Public entry point; live metrics counters; responsive feature overview. |
| **F-03** | Adaptive Role Dashboard | Core Platform | **FI** | `DashboardPage.tsx` | `dashboardService.ts`, `profiles`, `jobs` | Role-adaptive widgets (candidates see courses/jobs; recruiters see pipeline KPIs). |
| **F-04** | Job Marketplace & Search | Recruitment | **FI** | `JobsPage.tsx`, `JobFilters.tsx` | `jobs`, `companies`, `saved_job_searches` | 935-line `jobService.ts`; full multi-facet filtering, bookmarking, and search. |
| **F-05** | Post Job Studio | Recruitment | **FI** | `PostJobPage.tsx` | `jobs`, `job_post_templates`, `companies` | Recruiter-gated; template selection; draft auto-save and immediate publishing. |
| **F-06** | Candidate Review Pipeline | Recruitment | **FI** | `CandidatesPage.tsx` | `job_applications`, `candidate_scorecards`, `candidate_notes` | Kanban & list views; stage transitions; recruiter scoring and feedback logs. |
| **F-07** | Learning Management System | Learning | **FI** | `LMSPage.tsx` | `courses`, `lessons`, `enrollments`, `lesson_progress` | Hybrid gateway/Supabase; modular video/text curricula; auto-certificate generation. |
| **F-08** | Coding Challenges Arena | Assessment | **FI** | `ChallengesPage.tsx` | `challenges`, `challenge_submissions` | Monaco code editor; multi-language sandboxed execution; automated XP awarding. |
| **F-09** | Professional Networking | Networking | **FI** | `NetworkingPage.tsx` | `connections`, `networking_suggestion_preferences` | Friend/connection graph; suggestions engine; connection request triage lifecycle. |
| **F-10** | Direct Realtime Messaging | Communications | **FI** | `MessagingPage.tsx` | `conversations`, `messages`, `conversation_participants` | Supabase Realtime WebSocket delivery (ADR-004); unread counters; file attachments. |
| **F-11** | AI Career Assistant | AI & Copilot | **FI** | `AIAssistant.tsx`, `AICareerPath.tsx` | `ai_sessions`, `automation_suggestions` | Heuristic-driven rule engine (honest provenance with `SourceStatusBadge`; TD-04). |
| **F-12** | User Profile Management | Identity | **FI** | `ProfilePage.tsx`, `ProfileSettings.tsx` | `profiles`, `user_profiles`, `skills`, `educations` | Multi-section portfolio & experience manager; skill endorsements; AI suggestions. |
| **F-13** | Interactive Resume Builder | Career Tools | **FI** | `ResumePage.tsx`, `ResumeBuilder.tsx` | `resume_artifacts`, `resume_export_events` | Live layout rendering; profile data pre-fill; client-side JSON/PDF export. |
| **F-14** | In-App Notification Center | Communications | **FI** | `NotificationsPage.tsx`, `NotificationBell.tsx` | `notifications`, `notification_settings` | Realtime bell alerts; mark-read/mark-all actions; background digest queues. |
| **F-15** | User & Platform Settings | Identity | **FI** | `SettingsPage.tsx` | `notification_settings`, `system_settings` | Profile, security, keyboard navigation, email digest preferences, quiet hours. |
| **F-16** | Monetization & Billing | Monetization | **PI** | `BillingPage.tsx`, `BillingSettings.tsx` | `subscriptions`, `subscription_plans`, `payments` | **DEMO MODE ONLY** (ADR-005); Stripe scaffolded but inert; charges disabled. |
| **F-17** | Administration Console | Governance | **FI** | `AdminDashboard.tsx`, `AdminPage.tsx` | `audit_log`, `system_settings`, `profiles` | Role management; scheduler status inspection; system audit logs; telemetry. |
| **F-18** | Chrome Extension Companion | Client Ecosystem | **FI** | `chrome-extension-project/` (MV3) | `chrome.storage.local` (ADR-006) | Local-first scraper for LinkedIn/Indeed; resume matching; page scanning. |
| **F-19** | Product Telemetry & Analytics| Analytics | **FI** | `productAnalytics.ts`, `AnalyticsPage.tsx` | `product_analytics_events` | Batched client-side event tracking; funnel and conversion aggregation. |
| **F-20** | Universal Command Search | Core Platform | **FI** | `CommandSearch.tsx`, `unifiedSearch.ts` | Static route registry & dynamic entities | Global `Cmd+K` / `Ctrl+K` hotkey; role-filtered search across pages and jobs. |
| **F-21** | Resilient Error Recovery | Core Platform | **FI** | `ErrorBoundary.tsx`, `NotFound.tsx` | Client error logging hooks | Safe error recovery views; automatic session recovery; friendly 404 views. |
| **F-22** | Gamification Engine | Gamification | **FI** | `xpLedger.ts`, `gamificationService.ts` | `xp_transactions`, `badges`, `user_badges` | Idempotent XP ledger (`UNIQUE(user_id, ref_type, ref_id)`); daily 200 XP ceiling. |
| **F-23** | Leaderboard & Achievement UI | Gamification | **FI** | `GamificationHeaderBadge`, `LeaderboardModal`| `leaderboard`, `user_badges` | Realtime XP badge in navbar; modal with global rankings and badge unlock gallery. |
| **F-24** | Trust & Safety Moderation | Governance | **FI** | `ReportContentModal`, `ModerationQueue` | `content_reports` | User report creation (`pending`); admin triage queue (`under_review`/`resolved`). |
| **F-25** | Job Detail View | Recruitment | **FI** | `JobDetailPage.tsx` | `jobs`, `job_applications`, `companies` | Dedicated route `/jobs/:id`; detailed description, company info, apply trigger. |
| **F-26** | Public Portfolio Showcase | Career Tools | **FI** | `PortfolioPage.tsx` | `projects`, `profiles` | Public candidate project cards, live demo links, repository badges. |
| **F-27** | Extension Resume Matching | Companion | **FI** | `chrome-extension-project/lib/resumeMatchStatus`| Local extension storage | Offline keyword & semantic matching against scanned job posts. |
| **F-28** | Extension Page Scanning | Companion | **FI** | `chrome-extension-project/content` | Local extension storage | Scrapes DOM for job postings; extracts structured metadata for user review. |
| **F-29** | Scheduled Notification Digest | Background Ops | **FI** | `scripts/run-notification-digests.mjs` | `notification_digest_items` | Batches pending unread alerts into scheduled email/push digests. |
| **F-30** | Scheduled Networking Reminders| Background Ops | **FI** | `scripts/run-networking-reminders.mjs` | `connections` | Identifies stale connection requests and issues nudge notifications. |
| **F-31** | KPI Analytics Aggregation | Background Ops | **FI** | `scripts/run-kpi-aggregations.mjs` | `product_analytics_events` | Hourly/daily rollup of active users, application counts, and funnel metrics. |
| **F-32** | Saved Search Alert Digest | Background Ops | **FI** | `scripts/discover-saved-search-digests.mjs` | `saved_job_searches`, `jobs` | Discovers new jobs matching saved candidate criteria and queues alerts. |
| **F-33** | WebRTC Video Interviewing | Communications | **FI** | `video-service` (Spring Boot module) | Video session tokens & rooms | Room scheduling, token generation, and WebRTC signaling endpoints. |
| **F-34** | Cross-Cutting Unified Search | Core Platform | **FI** | `search-service`, `unifiedSearch.ts` | Search index across jobs, users, skills | Multi-entity search backend complementing client command search. |
| **F-35** | Dynamic Feature Flag Control | Governance | **FI** | `admin/feature-flags` endpoints | In-memory / DB flag storage | 40 runtime feature flags with enable/disable/reset endpoints. |
| **F-36** | Application Draft Autosave | Recruitment | **FI** | `application_drafts`, `application_draft_versions` | Database draft tables | Multi-step job application saving and version restoration before final submit. |
| **F-37** | Job Post Templates | Recruitment | **FI** | `job_post_templates` | Database template table | Reusable job descriptions and requirement templates for recruiters. |
| **F-38** | Legacy Chat Service | Communications | **DE** | `services/chat-service` | MongoDB / STOMP (retired) | **RETIRED** per ADR-004; superseded by Supabase Realtime messaging-service. |
| **F-39** | Unified Backend Stub | Architecture | **DE** | `apps/backend/` | Non-runnable Spring shell | **RETIRED** per ADR-002; superseded by 26 Spring Boot services in Maven reactor. |

---

## 4. Route Registry & Navigation Specifications

### Reconciled Route Authority
- **Code SSOT**: `apps/frontend/src/navigation/routeRegistry.ts`
- **Total Validated Routes**: **22 Routes** (3 Public + 19 Protected)

```
+-------------------------------------------------------------------------------+
|                       TALENTSPHERE ROUTE MAP (22 TOTAL)                       |
+-------------------------------------------------------------------------------+
| Public Routes (3)     : / , /login , /register                                |
| Protected Routes (19) : /dashboard, /jobs, /jobs/:id, /jobs/post,             |
|                         /candidates, /lms, /challenges, /networking,          |
|                         /messaging, /ai, /career-path, /profile,              |
|                         /profile/:userId, /resume, /portfolio,                |
|                         /notifications, /settings, /admin, /billing           |
+-------------------------------------------------------------------------------+
```

### Conflict Resolution Note (CR-01)
*Historical PRD documents listed 20 protected routes with legacy paths (`/post-job`, `/ai-assistant`, `/ai-career-path`, `/admin/analytics`, `/admin/trust-safety`). Per the architectural hierarchy (`code > tests > config > schema > docs`), `routeRegistry.ts` is the binding authority with 19 protected routes. Sub-admin surfaces are hosted within tabs on `/admin`.*

### Route Access Matrix

| Route Path | Associated Page Component | Permitted Roles | Layout Container | Notes |
|---|---|---|---|---|
| `/` | `LandingPage.tsx` | Public | Public Navbar + Footer | Hero, metrics, value proposition |
| `/login` | `LoginPage.tsx` | Public | Centered Auth Card | Module Federation exposed component |
| `/register` | `RegisterPage.tsx` | Public | Centered Auth Card | Includes role picker (`USER` vs `RECRUITER`) |
| `/dashboard` | `DashboardPage.tsx` | `ROLE_USER`, `ROLE_RECRUITER` | Main App Shell | Role-adaptive dashboard widgets |
| `/jobs` | `JobsPage.tsx` | All Authenticated | Main App Shell | Job search, faceted filters, bookmarking |
| `/jobs/:id` | `JobDetailPage.tsx` | All Authenticated | Main App Shell | Detailed job spec & application modal |
| `/jobs/post` | `PostJobPage.tsx` | `ROLE_RECRUITER` | Main App Shell | Multi-step job posting wizard |
| `/candidates` | `CandidatesPage.tsx` | `ROLE_RECRUITER` | Main App Shell | ATS pipeline, candidate scorecards |
| `/lms` | `LMSPage.tsx` | All Authenticated | Main App Shell | Course catalog, video lessons, quiz engine |
| `/challenges` | `ChallengesPage.tsx` | All Authenticated | Main App Shell | Code challenges, Monaco IDE, test runner |
| `/networking` | `NetworkingPage.tsx` | All Authenticated | Main App Shell | Peer suggestions, connection requests |
| `/messaging` | `MessagingPage.tsx` | All Authenticated | Main App Shell | Split-pane realtime chat & attachments |
| `/ai` | `AIAssistant.tsx` | All Authenticated | Main App Shell | Heuristic career copilot & mock interview |
| `/career-path` | `AICareerPath.tsx` | All Authenticated | Main App Shell | Visual career milestone progression |
| `/profile` | `ProfilePage.tsx` | All Authenticated | Main App Shell | Personal profile editor & skill tags |
| `/profile/:userId` | `ProfilePage.tsx` | All Authenticated | Main App Shell | Read-only candidate inspection view |
| `/resume` | `ResumePage.tsx` | All Authenticated | Main App Shell | Live resume generator & PDF export |
| `/portfolio` | `PortfolioPage.tsx` | All Authenticated | Main App Shell | Project showcase gallery & repo links |
| `/notifications` | `NotificationsPage.tsx` | All Authenticated | Main App Shell | Full-page notification management feed |
| `/settings` | `SettingsPage.tsx` | All Authenticated | Main App Shell | Account, security, theme, quiet hours |
| `/admin` | `AdminDashboard.tsx` | `ROLE_ADMIN` | Admin Shell | Governance, telemetry, flags, moderation |
| `/billing` | `BillingPage.tsx` | `ROLE_RECRUITER` | Main App Shell | Subscription tiers (DEMO MODE label) |

---

## 5. End-to-End User Journeys

### Journey J-1: Candidate Onboarding, Skill Verification & Job Application
1. **Discovery**: Aisha visits `/` (LandingPage), reviews platform metrics, clicks "Get Started" and registers at `/register`.
2. **Profile Setup**: Redirected to `/dashboard`, prompted to complete profile at `/profile`. Aisha enters education, work experience, and adds "TypeScript" skill.
3. **Assessment & XP**: Aisha visits `/challenges`, solves a medium-difficulty algorithm challenge in the Monaco IDE, passes all tests, and receives 50 XP and a badge (F-22).
4. **Learning**: Aisha visits `/lms`, enrolls in "Advanced React Architecture", completes all lessons, and earns a certificate.
5. **Job Application**: Aisha searches `/jobs` for "Senior Frontend Engineer", opens `/jobs/:id`, and submits an application with her generated resume from `/resume`.
6. **Notification**: Aisha receives an in-app realtime toast notification acknowledging application submission.

### Journey J-2: Recruiter Sourcing & Pipeline Management
1. **Requisition**: Rohan logs in as `ROLE_RECRUITER`, navigates to `/jobs/post`, selects a template (F-37), enters job parameters, and clicks "Publish".
2. **Candidate Review**: Rohan navigates to `/candidates`, views Aisha's application under the "Applied" column, and inspects her verified challenge badges and LMS certificate.
3. **Evaluation**: Rohan opens the scorecard modal, inputs evaluation scores, adds private notes (`candidate_notes`), and drags Aisha to "Interviewing".
4. **Communication**: Rohan initiates a direct conversation via `/messaging`, sending an interview invitation with an attached prep guide.

### Journey J-3: Platform Governance & Trust Moderation
1. **Incident Trigger**: A candidate flags a suspicious job listing via `ReportContentModal` (F-24).
2. **Admin Triage**: Priya logs in as `ROLE_ADMIN`, opens `/admin`, and accesses the Moderation Queue.
3. **Investigation**: Priya inspects the report reasons (`fraud`), reviews the job author profile, and deactivates the listing.
4. **Resolution**: Priya marks the report status as `resolved`, triggering an audit log entry in `audit_log` and sending a notification to the reporter.

---

## 6. Non-Functional & Quality Requirements

1. **Performance**:
   - Initial bundle load (LCP) under 2.5s via Vite code-splitting and dynamic route imports across all 22 pages.
   - API p95 response times < 200ms through Gateway caching and direct PostgREST queries.
2. **Accessibility (WCAG 2.1 AA Compliance)**:
   - Full keyboard navigation for all interactive controls (enforced via `keyboard-navigation.spec.ts`).
   - Strict contrast ratios (> 4.5:1 for normal text, > 3:1 for large text) across light/dark themes (`color-contrast.spec.ts`).
   - Semantic HTML and ARIA labels on all modal dialogs, drawers, and form inputs.
3. **Security & Data Isolation**:
   - 100% table coverage with Row-Level Security (119 policies in PostgreSQL).
   - Zero secrets committed to source control (strictly validated by `validate-security-contract.mjs`).
   - Chrome Extension operates strictly under local-first privacy (ADR-006).
4. **Testing Standards**:
   - 846 frontend unit tests across 137 test files (Vitest).
   - 28 E2E spec files with 114 test declarations (Playwright).
   - 20 automated validation scripts wired into `npm run validate:all`.
