# TalentSphere — Requirements (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Extracted 2026-09-08. CURRENT STATE vs DOCUMENTED INTENT clearly separated.

## Functional Requirements

### FR-01: Authentication & Session Management
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Supabase Auth (ADR-001), email/password + OAuth
- **Frontend**: LoginPage, RegisterPage, ResetPasswordPage, AuthEntry
- **Backend**: auth-service (2 controllers: auth + JWKS)
- **Evidence**: `authService.ts`, `supabaseClient.ts`
- **Tests**: auth tests in frontend, auth contract tests in backend

### FR-02: Job Marketplace
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Full CRUD, search, advanced search, featured, recommended
- **Frontend**: JobsPage, JobDetailPage, PostJobPage
- **Backend**: job-service (1 controller)
- **Evidence**: `jobService.ts` (935 lines), 6 API endpoints
- **Routes**: `/jobs`, `/jobs/:id`, `/jobs/post`

### FR-03: Candidate Review Pipeline
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Pagination, search, bulk actions, scorecards, notes
- **Frontend**: CandidatesPage
- **Backend**: application-service (2 controllers), recruiter-service (1 controller)
- **Evidence**: `applicationService.ts`, `recruiterService.ts`

### FR-04: Learning Management System
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Hybrid — API Gateway for complex ops, Supabase for data
- **Frontend**: LMSPage
- **Backend**: lms-service (1 controller)
- **Evidence**: `lmsService.ts`
- **Features**: Courses, enrollments, lessons, learning paths, progress tracking

### FR-05: Challenges Arena
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Category filtering, submissions, evaluation
- **Frontend**: ChallengesPage
- **Backend**: challenge-service (1 controller)
- **Evidence**: `challengeService.ts`

### FR-06: Professional Networking
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Suggestions, connect/accept/decline, feed, posts, likes
- **Frontend**: NetworkingPage
- **Backend**: networking-service (1 controller)
- **Evidence**: `networkingService.ts`

### FR-07: Direct Messaging
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Supabase Realtime (ADR-004), attachments, mark-read, history
- **Frontend**: MessagingPage
- **Backend**: messaging-service (1 controller)
- **Evidence**: `messagingService.ts`
- **Note**: chat-service (1 controller) is ORPHANED/RETIRED — not in reactor, see DECISION-004

### FR-08: AI Career Assistant
- **Status**: FULLY IMPLEMENTED (but rule-based, not real AI)
- **Implementation**: Rule-based heuristics with SourceStatusBadge provenance
- **Frontend**: AIAssistant, AICareerPath
- **Backend**: ai-service (1 controller)
- **Evidence**: `aiService.ts`, `ai drafts/prefill/audit` in lib/
- **Limitation**: No actual LLM integration — uses heuristic scoring

### FR-09: Profile Management
- **Status**: FULLY IMPLEMENTED
- **Implementation**: AI suggestions, skill/experience/education management
- **Frontend**: ProfilePage
- **Backend**: profile-service (1 controller)
- **Evidence**: `profileService.ts` + CRUD variants

### FR-10: Resume Builder
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Import/export/PDF generation
- **Frontend**: ResumePage (inside profile/)
- **Evidence**: resume_artifacts table, resume_export_events table

### FR-11: Notifications
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Real-time, unread count, dropdown, digest
- **Frontend**: NotificationsPage, NotificationBell
- **Backend**: notification-service (1 controller)
- **Evidence**: `notificationService.ts`, `notificationDigestService.ts`
- **Background**: Notification digest cron jobs (5 scheduler scripts)

### FR-12: Settings
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Profile, keyboard shortcuts, digest preferences, quiet hours
- **Frontend**: SettingsPage
- **Evidence**: `settingsService.ts`

### FR-13: Admin Console
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Scheduler status, audit logs, analytics, feature flags
- **Frontend**: AdminDashboard
- **Backend**: No dedicated admin controller — uses feature-flag endpoints
- **Evidence**: `adminService.ts`
- **Routes**: `/admin`

### FR-14: Chrome Extension
- **Status**: FULLY IMPLEMENTED
- **Implementation**: MV3, local-first privacy (ADR-006)
- **Location**: `chrome-extension-project/`
- **Features**: Job tracking, resume matching, page scanning, diagnostics
- **Tests**: 7 test suites

### FR-15: Product Analytics
- **Status**: FULLY IMPLEMENTED
- **Implementation**: `product_analytics_events` table, workflow recorders in lib/
- **Evidence**: `productAnalytics.ts`, analytics recorders in `lib/`

### FR-16: Command Search
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Role-filtered routes, keyboard navigation
- **Evidence**: `unifiedSearch.ts` in lib/

### FR-17: Error Recovery
- **Status**: FULLY IMPLEMENTED
- **Implementation**: ErrorBoundary with safe failure copy, retry workflows
- **Evidence**: ErrorBoundary component, auth error copy

### FR-18: Billing & Payments
- **Status**: PARTIALLY IMPLEMENTED (DEMO MODE)
- **Implementation**: Stripe scaffolded but NOT live (ADR-005)
- **Frontend**: BillingPage
- **Backend**: payment-service (1 controller)
- **Evidence**: `paymentService.ts`
- **Missing**: Live Stripe integration, webhooks, real payment processing
- **Current**: All payment flows are simulated (`billingMode: 'demo'`)

### FR-19: Gamification System
- **Status**: FULLY IMPLEMENTED
- **Implementation**: XP ledger, badges, leaderboard
- **Frontend**: GamificationHeaderBadge, LeaderboardModal
- **Backend**: gamification-service (1 controller)
- **Evidence**: `gamificationService.ts`, `xpLedger.ts`
- **Tables**: xp_transactions, badges, user_badges, leaderboard

### FR-20: Trust & Safety
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Content reports, moderation queue, triage lifecycle
- **Frontend**: ReportContentModal, ModerationQueue
- **Evidence**: `trustAndSafetyService.ts`
- **Table**: content_reports

### FR-21: Job Detail View
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Detailed job posting page with apply workflow
- **Frontend**: JobDetailPage
- **Route**: `/jobs/:id`

### FR-22: Portfolio Showcase
- **Status**: FULLY IMPLEMENTED
- **Implementation**: Public portfolio display for candidates
- **Frontend**: PortfolioPage + portfolioData
- **Route**: `/portfolio`

### FR-23: Career Path
- **Status**: FULLY IMPLEMENTED
- **Implementation**: AI-powered career path visualization
- **Frontend**: AICareerPath
- **Route**: `/career-path`

## Non-Functional Requirements

### NFR-01: Performance
- Lazy-loaded routes (22 pages)
- Code splitting by feature
- Optimistic UI updates
- Real-time updates via Supabase Realtime

### NFR-02: Accessibility
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG 2.1 AA)
- Dedicated a11y test suites (`test:a11y`, `test:contrast`, `test:keyboard`)

### NFR-03: Security
- RLS on all tables (119 policies)
- JWT-based auth via Supabase Auth
- Role-based access control (3 roles)
- Never commit secrets (enforced via .gitignore)

### NFR-04: Testing
- 846 frontend unit tests (Vitest)
- 137 test files
- 28 E2E spec files (114 test() declarations, Playwright)
- 22 automated repository validators (20 .mjs + 2 .sh)
- 5 scheduler test suites

## Requirements Status Summary

| Category | Total | Fully Implemented | Partially Implemented | Not Implemented |
|----------|-------|-------------------|-----------------------|-----------------|
| Functional | 23 | 22 | 1 (Billing — demo mode) | 0 |
| Non-Functional | 4 | 4 | 0 | 0 |

## Current State vs Documented Intent

### CURRENT STATE (what exists today)
- 22 fully implemented features, 1 partial (billing in demo mode)
- Dual-plane architecture operational
- 846 tests passing, 20 validators green via `validate:all` (22 validator files total)
- Complete database schema (50 tables, 119 RLS policies)

### DOCUMENTED INTENT (what docs say should exist)
- All 23 features are documented in PRD as existing or partially existing
- No gap between docs and implementation for feature coverage
- PRD is accurate as of 2026-09-08 reconciliation

### FUTURE STATE (what is planned but not implemented)
- Live Stripe integration (blocked by ADR-005 until provider verification)
- Real AI/LLM integration for career assistant (currently rule-based)
- Potential chat-service retirement/merge (ADR-004, DECISION-004)
