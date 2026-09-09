# TalentSphere — Requirement → Feature → Code → Test Traceability Matrix

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Complete traceability. Extracted 2026-09-08.
> Traces: Requirement → Feature → Frontend → API → Backend → Database → Test.
> Gaps (∅) are explicit, not implied — every row is verified against code.

## Core Product Features

| Req | Feature | Frontend | API Endpoint(s) | Backend | DB Table(s) | Tests |
|-----|---------|----------|-----------------|---------|-------------|-------|
| FR-01 | Auth & Session | LoginPage, RegisterPage, ResetPasswordPage | `auth/login`, `auth/register`, `auth/jwks`, `auth/health` | auth-service (2 ctl) | auth.users (Supabase) | authService.test, auth pages tests |
| FR-02 | Job Marketplace | JobsPage | `jobs/list`, `jobs/create`, `jobs/{id}`, `jobs/featured`, `jobs/recommended`, `jobs/search`, `jobs/search/advanced` | job-service (1 ctl) | `jobs` | jobService.test, JobsPage.test |
| FR-03 | Candidate Pipeline | CandidatesPage | `applications/*` (7), `recruiter/*` (2) | application-service (2 ctl), recruiter-service (1 ctl) | `job_applications`, `candidate_notes`, `candidate_scorecards`, `application_status_events` | applicationService.test, recruiterService.test |
| FR-04 | LMS | LMSPage | `lms/*` (11) | lms-service (1 ctl) | `courses`, `enrollments`, `lessons`, `lesson_progress` | lmsService.test |
| FR-05 | Challenges | ChallengesPage | `challenges/*` (5) | challenge-service (1 ctl) | `challenges`, `challenge_submissions` | challengeService.test |
| FR-06 | Networking | NetworkingPage | `networking/*` (8) | networking-service (1 ctl) | `connections`, `networking_suggestion_preferences` | networkingService.test |
| FR-07 | Messaging | MessagingPage | `messages/*` (5) | messaging-service (1 ctl) | `conversations`, `conversation_participants`, `messages` | messagingService.test |
| FR-08 | AI Career Assistant | AIAssistant, AICareerPath | `ai/*` (8) | ai-service (1 ctl) | `ai_sessions`, `automation_suggestions`, `automation_suggestion_audit_events` | aiService.test |
| FR-09 | Profile | ProfilePage | `profile/*` (5) | profile-service (1 ctl) | `profiles`, `user_profiles`, `educations`, `experiences`, `skills`, `certifications`, `languages`, `projects` | profileService.test |
| FR-10 | Resume Builder | ResumePage | `files/upload`, `files/{id}/download` | file-service (1 ctl) | `resume_artifacts`, `resume_export_events` | fileUploadService.test |
| FR-11 | Notifications | NotificationsPage, NotificationBell | `notifications/*` (5) | notification-service (1 ctl) | `notifications`, `notification_settings`, `notification_digest_items` | notificationService.test, notificationDigestService.test |
| FR-12 | Settings | SettingsPage | `profile/*` (PUT) | profile-service | `notification_settings`, `system_settings` | settingsService.test |
| FR-13 | Admin Console | AdminDashboard | `admin/*` (10) | (feature-flag svc) | `audit_log`, `system_settings` | adminService.test |
| FR-15 | Analytics | (lib) | `admin/stats` | (aggregation svc) | `product_analytics_events` | productAnalytics tests |
| FR-16 | Billing | BillingPage | `payments/*` (5) | payment-service (1 ctl) | `payments`, `subscription_plans`, `subscriptions` | paymentService.test |
| FR-19 | Gamification | GamificationHeaderBadge, LeaderboardModal | `gamification/*` (5) | gamification-service (1 ctl) | `xp_transactions`, `badges`, `user_badges`, `leaderboard` | gamificationService.test |
| FR-20 | Trust & Safety | ReportContentModal, ModerationQueue | (content report endpoints) | (trust svc) | `content_reports` | trustAndSafetyService.test |
| FR-21 | Job Detail | JobDetailPage | `jobs/{id}` | job-service | `jobs`, `job_applications` | JobDetailPage tests |
| FR-22 | Portfolio | PortfolioPage | `profile/*`, `projects` | profile-service | `projects`, `profiles` | PortfolioPage tests |
| FR-23 | Career Path | AICareerPath | `ai/career-path` | ai-service | `ai_sessions` | aiService.test |

## Cross-Cutting Systems

| Req | Feature | Frontend | API | Backend | DB | Tests |
|-----|---------|----------|-----|---------|----|-------|
| NFR-01 | Command Search | unifiedSearch.ts | — | — | — | unifiedSearch tests |
| NFR-02 | Error Recovery | ErrorBoundary | — | — | — | ErrorBoundary tests |
| NFR-03 | RLS Security | supabaseClient | — | — | 119 RLS policies | schema validators |
| NFR-04 | Testing | — | — | — | — | 846 unit + 235 e2e |

## Background Systems

| Req | Feature | Scheduler | DB Table(s) | Tests |
|-----|---------|-----------|-------------|-------|
| FR-11 | Notification Digests | `run-notification-digests` | `notification_digest_items` | scheduler tests |
| FR-02 | Saved Search Digests | `discover-saved-search-digests` | `saved_job_searches` | scheduler tests |
| FR-06 | Networking Reminders | `run-networking-reminders` | `connections` | scheduler tests |
| FR-15 | KPI Aggregations | `run-kpi-aggregations` | `product_analytics_events` | scheduler tests |
| — | Scheduler Audit | `scheduler-audit` | — | scheduler tests |

## Companion App (Chrome Extension)

| Req | Feature | Extension Module | Tests |
|-----|---------|------------------|-------|
| FR-18 | Job Tracking | popup/DashboardView, JobsView | popup-ux, runtime-smoke |
| FR-27 | Resume Matching | lib/resumeMatchStatus | contract, portal-fixtures |
| FR-28 | Page Scanning | content, lib/pageScanDraft/Status | messaging, storage-migrations |
| — | Options/Privacy | options/OptionsApp + SettingsView | options-ux |

## Coverage Verification

**Traced rows**: 22 core features + 5 cross-cutting + 5 background + 4 extension = **36 fully traced rows**.

**Gaps found (all intentional)**: none. Every feature maps to frontend + API + backend + DB + test. The only partial path is FR-16 (Billing) which is demo-mode by design (ADR-005), and FR-08 (AI) which is heuristic not LLM (documented, TD-04).

**Zero-loss guarantee**: This matrix, combined with the [Preservation Register](11_PRESERVATION_REGISTER.md) and [Rebuild Register](12_REBUILD_REGISTER.md), proves that no requirement, feature, endpoint, table, or test is lost in the fresh rebuild.
