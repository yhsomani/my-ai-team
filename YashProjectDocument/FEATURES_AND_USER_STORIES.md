# TalentSphere Feature Catalog & User Stories Specification

> Documentation status: Canonical feature catalog and user stories baseline. Reconciled with codebase on 2026-09-08.

---

## 1. Document Overview & Traceability Framework

This document provides the exhaustive, unified feature catalog, user stories, acceptance criteria, and bidirectional requirement traceability for the **TalentSphere** platform. It links high-level business objectives (`BRD.md`) and product specifications (`PRD.md`) directly to frontend components, backend services, database entities, and test suites.

### 1.1 Traceability Matrix Summary

| Domain | Feature Range | Implemented Features | Partial Features | Total Test Suites |
|---|---|---|---|---|
| Identity & Access | F-01, F-12, F-15 | 3 | 0 | 14 |
| Job Marketplace & Recruitment | F-04, F-05, F-06, F-25 | 4 | 0 | 11 |
| Learning & Assessment | F-07, F-08, F-26 | 3 | 0 | 9 |
| Networking & Realtime Comms | F-09, F-10, F-14 | 3 | 0 | 12 |
| AI & Career Acceleration | F-11, F-13 | 2 | 0 | 7 |
| Monetization & Billing | F-16 | 0 | 1 (Demo Mode) | 3 |
| Governance, Admin & Safety | F-17, F-24 | 2 | 0 | 6 |
| Gamification & Engagement | F-22, F-23 | 2 | 0 | 5 |
| Analytics & Core Platform | F-02, F-03, F-18, F-19, F-20, F-21 | 6 | 0 | 15 |
| **Total** | **F-01 through F-26** | **25** | **1** | **82+ Unit / E2E** |

---

## 2. Stakeholder Personas & Roles

```typescript
export const USER_ROLES = {
  USER: 'ROLE_USER',          // Candidate / Learner / Developer
  RECRUITER: 'ROLE_RECRUITER',// Hiring Manager / Employer
  ADMIN: 'ROLE_ADMIN',        // Platform Administrator / Content Moderator
} as const;
```

| Persona | Role Key | Focus Areas | Primary Workflows |
|---|---|---|---|
| **P-A: Aisha (Candidate/Learner)** | `ROLE_USER` | Learning, job discovery, skill validation | Course enrollment, coding challenges, job application, resume building, networking |
| **P-B: Rohan (Recruiter/Employer)** | `ROLE_RECRUITER` | Talent sourcing, applicant review, requisitions | Job posting, candidate pipeline review, applicant scoring, interview coordination |
| **P-C: Priya (Platform Admin)** | `ROLE_ADMIN` | Governance, safety, platform monitoring | User moderation, content report triage, system metrics inspection, feature flag toggling |
| **P-D: Dev (Technical Specialist)** | `ROLE_USER` | Assessment mastery, portfolio showcase | Sandboxed challenges, XP leaderboard climb, verifiable credential issuance, portfolio publishing |

---

## 3. Comprehensive Feature Catalog & User Stories

### Domain 1: Identity, Authentication & Profile Management

#### F-01: Authentication & Session Management
- **PRD Reference**: PRD v3.0 §3.2, §4.1
- **BRD Reference**: BRD v3.0 §4 (RU-01, RU-02)
- **SSOT Traceability**: `FEAT-001`, `FEAT-002`, `FEAT-003`
- **Routes**: `/login`, `/register`, `/reset-password`
- **Components**: `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `ProtectedRoute.tsx`
- **Services & Store**: `authService.ts`, `authSlice.ts`
- **Database Entities**: `auth.users`, `profiles`, `user_settings`
- **Test Suites**: `authService.test.ts`, `authSlice.test.ts`, `ResetPasswordPage.test.tsx`, `AuthEntry.test.tsx`, `ProtectedRoute.test.tsx`

**User Stories:**
- **US-01.1 (Registration)**: *As a new candidate or recruiter, I want to create an account with email and password so that I can access personalized features.*
  - **Acceptance Criteria**: Form validation enforces email format and minimum 8-character password; creates `profiles` record with default role `ROLE_USER`; handles duplicate email conflict gracefully.
- **US-01.2 (Authentication)**: *As a registered user, I want to sign in securely so that my session persists across browser reloads.*
  - **Acceptance Criteria**: Authenticates via Supabase Auth (or dev mock in local mode); populates Redux `authSlice` with JWT and profile claims; redirects to intended target route.
- **US-01.3 (Role Guarding)**: *As an unauthenticated user, I should be redirected to `/login` when accessing protected routes.*
  - **Acceptance Criteria**: `ProtectedRoute` intercepts unauthenticated attempts and preserves return URL; blocks unauthorized role access (e.g., non-admin accessing `/admin`).

---

#### F-12: Profile Management
- **PRD Reference**: PRD v3.0 §7.1
- **BRD Reference**: BRD v3.0 §4 (RU-10)
- **SSOT Traceability**: `FEAT-001`
- **Routes**: `/profile`, `/profile/:userId`
- **Components**: `ProfilePage.tsx`, `ProfileSettings.tsx`
- **Services**: `profileService.ts`
- **Database Entities**: `profiles`, `user_profiles`, `skills`, `user_skills`
- **Test Suites**: `ProfilePage.test.tsx`, `profileService.test.ts`, `profileWorkflowAnalytics.test.ts`

**User Stories:**
- **US-12.1 (Profile Customization)**: *As a user, I want to edit my bio, headline, skills, and contact information so that recruiters can discover my capabilities.*
  - **Acceptance Criteria**: Updates `profiles` and `user_profiles` in Supabase; validates skill tag inputs; renders live preview of profile changes.
- **US-12.2 (Public Profile Inspection)**: *As a recruiter, I want to view a candidate's public profile and verified skill badges at `/profile/:userId` so that I can evaluate their candidacy.*
  - **Acceptance Criteria**: Read-only rendering of candidate bio, completed courses, challenge badges, and portfolio links with RLS security check.

---

#### F-15: User & Platform Settings
- **PRD Reference**: PRD v3.0 §3.3
- **BRD Reference**: BRD v3.0 §4 (RU-01)
- **SSOT Traceability**: `FEAT-001`
- **Routes**: `/settings`
- **Components**: `SettingsPage.tsx`, `SecuritySettings.tsx`, `NotificationSettings.tsx`, `BillingSettings.tsx`, `ProfileSettings.tsx`
- **Services**: `settingsService.ts`
- **Database Entities**: `user_settings`, `profiles`
- **Test Suites**: `SettingsPage.test.tsx`, `settingsService.test.ts`, `settingsWorkflowAnalytics.test.ts`

**User Stories:**
- **US-15.1 (Preference Management)**: *As a user, I want to configure notification delivery preferences, theme settings, and quiet hours so that the platform aligns with my workflow.*
  - **Acceptance Criteria**: Changes save to `user_settings` with optimistic UI updates; supports toggle states for email digests and in-app alerts.

---

### Domain 2: Job Marketplace & Recruitment Operations

#### F-04: Job Marketplace & Search
- **PRD Reference**: PRD v3.0 §8.1, §8.2
- **BRD Reference**: BRD v3.0 §1 (BO-1, BO-2)
- **SSOT Traceability**: `FEAT-010`, `FEAT-014`, `FEAT-015`
- **Routes**: `/jobs`
- **Components**: `JobsPage.tsx`, `JobFilters.tsx`
- **Services & Store**: `jobService.ts`, `jobSlice.ts`
- **Database Entities**: `jobs`, `companies`, `saved_jobs`, `job_bookmarks`
- **Test Suites**: `JobsPage.test.tsx`, `jobService.test.ts`

**User Stories:**
- **US-04.1 (Discovery & Filtering)**: *As a job seeker, I want to search and filter jobs by keyword, location, salary, experience level, and remote policy so that I find relevant opportunities.*
  - **Acceptance Criteria**: Real-time multi-facet filtering; pagination support; URL query parameter synchronization.
- **US-04.2 (Job Bookmarking)**: *As a job seeker, I want to bookmark jobs so that I can review and apply to them later.*
  - **Acceptance Criteria**: Persists bookmark to `saved_jobs` / `job_bookmarks` table; updates UI bookmark icon state immediately.

---

#### F-25: Job Detail Page
- **PRD Reference**: PRD v3.0 §8.1
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `F-25`
- **Routes**: `/jobs/:id`
- **Components**: `JobDetailPage.tsx`
- **Database Entities**: `jobs`, `companies`, `job_applications`
- **Test Suites**: `JobDetailPage.test.tsx`

**User Stories:**
- **US-25.1 (Job Details Inspection)**: *As a candidate, I want to view the complete job description, required skills, company profile, and application status so that I can decide whether to apply.*
  - **Acceptance Criteria**: Fetches job record with company joins; renders rich markdown job description; disables Apply button if already applied.

---

#### F-05: Post Job Studio
- **PRD Reference**: PRD v3.0 §8.3
- **BRD Reference**: BRD v3.0 §2 (P-B Rohan), §4 (RU-02)
- **SSOT Traceability**: `FEAT-011`
- **Routes**: `/jobs/post`
- **Components**: `PostJobPage.tsx`
- **Services**: `recruiterService.ts`
- **Database Entities**: `jobs`, `companies`
- **Test Suites**: `PostJobPage.test.tsx`

**User Stories:**
- **US-05.1 (Requisition Creation)**: *As a recruiter, I want to create a new job posting with title, requirements, salary band, and job type so that candidates can apply.*
  - **Acceptance Criteria**: Restricts route to `ROLE_RECRUITER`; validates required fields; supports draft saving and instant publishing to `jobs` table.

---

#### F-06: Candidate Review Pipeline
- **PRD Reference**: PRD v3.0 §8.4
- **BRD Reference**: BRD v3.0 §1 (BO-2), §5 (K-05)
- **SSOT Traceability**: `FEAT-012`, `FEAT-013`
- **Routes**: `/candidates`
- **Components**: `CandidatesPage.tsx`
- **Services**: `recruiterService.ts`, `applicationService.ts`
- **Database Entities**: `job_applications`, `application_status_events`, `recruiter_notes`, `scorecards`
- **Test Suites**: `CandidatesPage.test.tsx`, `applicationService.test.ts`, `candidateWorkflowAnalytics.test.ts`

**User Stories:**
- **US-06.1 (Applicant Triage)**: *As a recruiter, I want to view applicants grouped by pipeline stage (`applied`, `screening`, `interviewing`, `offered`, `hired`, `rejected`) so that I can track hiring progress.*
  - **Acceptance Criteria**: Kanban / list view filtering by stage; updates application status and records transition in `application_status_events`.
- **US-06.2 (Candidate Notes & Scorecards)**: *As a recruiter, I want to add evaluation notes and rubric scores to an application so that our hiring team can make informed decisions.*
  - **Acceptance Criteria**: Saves notes to `recruiter_notes` and scores to `scorecards` with actor timestamp.

---

### Domain 3: Learning Management System & Coding Assessment

#### F-07: Learning Management System (LMS)
- **PRD Reference**: PRD v3.0 §10.1
- **BRD Reference**: BRD v3.0 §1 (BO-1), §5 (K-03)
- **SSOT Traceability**: `FEAT-004`, `FEAT-005`
- **Routes**: `/lms`
- **Components**: `LMSPage.tsx`
- **Services & Store**: `lmsService.ts`, `lmsSlice.ts`
- **Database Entities**: `courses`, `modules`, `enrollments`, `module_progress`, `certificates`
- **Test Suites**: `LMSPage.test.tsx`, `lmsService.test.ts`, `lmsWorkflowAnalytics.test.ts`

**User Stories:**
- **US-07.1 (Course Discovery & Enrollment)**: *As a learner, I want to browse courses by domain and enroll in them so that I can expand my technical knowledge.*
  - **Acceptance Criteria**: Renders course list with category chips; handles one-click enrollment in `enrollments` table; initializes module progress tracking.
- **US-07.2 (Lesson Progression)**: *As an enrolled learner, I want to mark lessons completed and track my completion percentage so that I can earn course completion certificates.*
  - **Acceptance Criteria**: Progress bar updates on lesson completion; generates certificate record upon 100% module progress.

---

#### F-08: Coding Challenges Arena
- **PRD Reference**: PRD v3.0 §10.2
- **BRD Reference**: BRD v3.0 §1 (BO-1), §5 (K-04)
- **SSOT Traceability**: `FEAT-006`, `FEAT-007`, `FEAT-008`, `FEAT-009`
- **Routes**: `/challenges`
- **Components**: `ChallengesPage.tsx`
- **Services & Store**: `challengeService.ts`, `challengeSlice.ts`
- **Database Entities**: `challenges`, `challenge_submissions`, `test_cases`
- **Test Suites**: `ChallengesPage.test.tsx`, `challengeService.test.ts`, `challengeWorkflowAnalytics.test.ts`

**User Stories:**
- **US-08.1 (Challenge Problem Solving)**: *As a developer, I want to select coding challenges by difficulty and topic so that I can test my coding skills.*
  - **Acceptance Criteria**: Filter by difficulty (`Easy`, `Medium`, `Hard`) and category; Monaco code editor with multi-language starter templates.
- **US-08.2 (Submission & Automated Evaluation)**: *As a developer, I want to submit my solution and receive test pass/fail results so that I can verify correctness.*
  - **Acceptance Criteria**: Executes code against test harness; evaluates pass rate, execution time, and memory usage; records submission to `challenge_submissions` and triggers XP award on success.

---

#### F-26: Portfolio Showcase
- **PRD Reference**: PRD v3.0 §7.3
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `NEW (F-26)`
- **Routes**: `/portfolio`
- **Components**: `PortfolioPage.tsx`
- **Database Entities**: `portfolio_items`, `profiles`
- **Test Suites**: `PortfolioPage.test.tsx`

**User Stories:**
- **US-26.1 (Project Showcase)**: *As a candidate, I want to add projects, live demo links, and GitHub repositories to my portfolio page so that recruiters can review real-world evidence of my work.*
  - **Acceptance Criteria**: Supports adding/editing portfolio cards; validates URLs; presents responsive gallery layout.

---

### Domain 4: Networking & Real-Time Communication

#### F-09: Professional Networking
- **PRD Reference**: PRD v3.0 §11.1
- **BRD Reference**: BRD v3.0 §1 (BO-1, BO-2)
- **SSOT Traceability**: `FEAT-026`
- **Routes**: `/networking`
- **Components**: `NetworkingPage.tsx`
- **Services & Store**: `networkingService.ts`, `networkingSlice.ts`
- **Database Entities**: `connections`, `profiles`
- **Test Suites**: `NetworkingPage.test.tsx`, `networkingService.test.ts`, `networkingWorkflowAnalytics.test.ts`

**User Stories:**
- **US-09.1 (Connection Discovery & Requests)**: *As a user, I want to receive connection suggestions and send connection requests so that I can expand my professional network.*
  - **Acceptance Criteria**: Suggests peer profiles based on shared skills/industry; sends request creating `connections` record with status `pending`.
- **US-09.2 (Request Triage)**: *As a user, I want to accept or decline incoming connection requests so that I control my professional circle.*
  - **Acceptance Criteria**: Updates connection state to `accepted` or `declined`; updates UI count badge immediately.

---

#### F-10: Direct Messaging
- **PRD Reference**: PRD v3.0 §11.2
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `FEAT-027`, `FEAT-028`
- **Routes**: `/messaging`
- **Components**: `MessagingPage.tsx`
- **Services & Store**: `messagingService.ts`, `messagingSlice.ts`
- **Database Entities**: `messages`, `conversations`, `conversation_participants`
- **Test Suites**: `MessagingPage.test.tsx`, `messagingService.test.ts`, `messagingWorkflowAnalytics.test.ts`

**User Stories:**
- **US-10.1 (Real-Time Chat)**: *As a user or recruiter, I want to exchange direct messages with my connections in real time so that we can discuss opportunities.*
  - **Acceptance Criteria**: Realtime WebSocket delivery via Supabase Realtime channel; unread indicator tracking; auto-scroll on new message.

---

#### F-14: In-App Notifications
- **PRD Reference**: PRD v3.0 §11.3
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `FEAT-037`, `FEAT-038`
- **Routes**: `/notifications`
- **Components**: `NotificationsPage.tsx`, `NotificationBell.tsx`
- **Services**: `notificationService.ts`, `notificationDigestService.ts`
- **Database Entities**: `notifications`
- **Test Suites**: `NotificationsPage.test.tsx`, `notificationService.test.ts`, `notificationsWorkflowAnalytics.test.ts`

**User Stories:**
- **US-14.1 (Notification Feed & Mark Read)**: *As a user, I want to view unread alerts for job updates, messages, and connection requests and mark them as read.*
  - **Acceptance Criteria**: Unread badge count on Header bell; mark single or mark-all as read updating `notifications` in DB.

---

### Domain 5: AI Career Assistance & Resume Engineering

#### F-11: AI Career Assistant
- **PRD Reference**: PRD v3.0 §12.1, §12.2
- **BRD Reference**: BRD v3.0 §1 (BO-6), §4 (RU-03)
- **SSOT Traceability**: `FEAT-016`, `FEAT-017`, `FEAT-018`, `FEAT-019`
- **Routes**: `/ai`, `/career-path`
- **Components**: `AIAssistant.tsx`, `AICareerPath.tsx`
- **Services & Store**: `aiService.ts`, `aiSlice.ts`
- **Database Entities**: `ai_drafts`, `career_paths`
- **Test Suites**: `AIAssistant.test.tsx`, `aiService.test.ts`, `AICareerPath.test.tsx`, `aiAssistantWorkflowAnalytics.test.ts`

**User Stories:**
- **US-11.1 (Career Pathway Recommendations)**: *As a candidate, I want AI-generated career transition roadmaps based on my existing skills so that I know what to learn next.*
  - **Acceptance Criteria**: Outputs step-by-step career path milestones; saves output to `ai_drafts` with review-gated `draft` -> `saved` lifecycle.
- **US-11.2 (Mock Interview Practice)**: *As a candidate, I want to practice role-specific interview questions and receive feedback so that I am prepared for technical screens.*
  - **Acceptance Criteria**: Generates adaptive interview prompts; evaluates candidate text answers across key competency dimensions.

---

#### F-13: Resume Builder
- **PRD Reference**: PRD v3.0 §7.2
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `FEAT-039`, `FEAT-040`, `FEAT-041`
- **Routes**: `/resume`
- **Components**: `ResumeBuilder.tsx`
- **Services**: `resumeService.ts`
- **Database Entities**: `resumes`, `profiles`
- **Test Suites**: `ResumeBuilder.test.tsx`, `resumeWorkflowAnalytics.test.ts`

**User Stories:**
- **US-13.1 (Resume Creation & Export)**: *As a job seeker, I want to build a formatted resume with work experience, education, and skills and export it to PDF/JSON.*
  - **Acceptance Criteria**: Live resume layout builder; auto-fills data from user profile; client-side export generation.

---

### Domain 6: Monetization, Governance & Gamification

#### F-16: Billing & Subscriptions (Demo Mode)
- **PRD Reference**: PRD v3.0 §16
- **BRD Reference**: BRD v3.0 §3, §4 (RU-04), ADR-005
- **SSOT Traceability**: `FEAT-024`, `FEAT-025`
- **Routes**: `/billing`
- **Components**: `BillingPage.tsx`, `BillingSettings.tsx`
- **Services**: `paymentService.ts`, `entitlementService.ts`
- **Database Entities**: `subscriptions`, `subscription_plans`, `payments`
- **Test Suites**: `BillingPage.test.tsx`, `paymentService.test.ts`, `billingWorkflowAnalytics.test.ts`

**User Stories:**
- **US-16.1 (Subscription Plan Selection in Demo Mode)**: *As a recruiter or premium candidate, I want to explore subscription tiers and test plan upgrades in demo mode without live card charges.*
  - **Acceptance Criteria**: Explicit "DEMO MODE" badge on all UI pricing cards; simulates successful upgrade without live payment processor calls.

---

#### F-17: Admin Console & Governance
- **PRD Reference**: PRD v3.0 §17
- **BRD Reference**: BRD v3.0 §1 (BO-7), §2 (P-C Priya), §4 (RU-02)
- **SSOT Traceability**: `FEAT-030`, `FEAT-031`, `FEAT-032`, `FEAT-033`
- **Routes**: `/admin`
- **Components**: `AdminDashboard.tsx`, `AdminUsersPanel.tsx`, `SystemSettingsPanel.tsx`, `FeatureFlagsPanel.tsx`, `DataCompliancePanel.tsx`
- **Services**: `adminService.ts`
- **Database Entities**: `system_metrics`, `profiles`, `audit_logs`
- **Test Suites**: `AdminDashboard.test.tsx`, `adminService.test.ts`

**User Stories:**
- **US-17.1 (System Health & User Administration)**: *As an administrator, I want to view system metrics, manage user roles, and inspect security audit logs so that platform stability and compliance are maintained.*
  - **Acceptance Criteria**: Strict `ROLE_ADMIN` access control; tabular view of users with role escalation controls; system metrics chart rendering.

---

#### F-24: Trust & Safety Moderation
- **PRD Reference**: PRD v3.0 §24
- **BRD Reference**: BRD v3.0 §1 (BO-5), §4 (RU-09)
- **SSOT Traceability**: `FEAT-030`
- **Components**: `ReportContentModal.tsx`, `TrustAndSafetyModerationQueue.tsx`
- **Services**: `trustAndSafetyService.ts`
- **Database Entities**: `content_reports`
- **Test Suites**: `trustAndSafetyService.test.ts`, `ReportContentModal.test.tsx`, `TrustAndSafetyModerationQueue.test.tsx`

**User Stories:**
- **US-24.1 (Content Reporting)**: *As a user, I want to report abusive messages, fake jobs, or inappropriate profiles with a descriptive reason.*
  - **Acceptance Criteria**: Modal captures target entity ID, category, and reason; inserts record into `content_reports` with status `pending`.
- **US-24.2 (Moderation Triage)**: *As a moderator/admin, I want to review flagged content and mark reports as resolved or dismissed.*
  - **Acceptance Criteria**: Filter queue by status; actions update status to `under_review`, `resolved`, or `dismissed`.

---

#### F-22 & F-23: Gamification Engine & UI
- **PRD Reference**: PRD v3.0 §22, §23
- **BRD Reference**: BRD v3.0 §1 (BO-4), §4 (RU-06, RU-07, RU-08)
- **SSOT Traceability**: `FEAT-020`, `FEAT-021`, `FEAT-022`, `FEAT-023`, `F-23`
- **Components**: `GamificationHeaderBadge.tsx`, `LeaderboardModal.tsx`
- **Services**: `gamificationService.ts`
- **Database Entities**: `xp_ledger`, `badges`, `user_badges`
- **Test Suites**: `gamificationService.test.ts`, `xpLedger.test.ts`, `LeaderboardModal.test.tsx`, `GamificationHeaderBadge.test.tsx`

**User Stories:**
- **US-23.1 (XP Ledger & Level Progression)**: *As a learner, I want to earn XP for completing courses and challenges and see my level rise.*
  - **Acceptance Criteria**: Idempotent XP awarding via `UNIQUE(user_id, reference_type, reference_id)`; daily ceiling enforcement (200 XP); level formula `floor(total_xp / 100) + 1`.
- **US-23.2 (Leaderboard & Badge Inspection)**: *As a user, I want to open the Leaderboard modal to see my ranking and earned achievement badges.*
  - **Acceptance Criteria**: Fetches global XP standings; displays unlocked vs. locked badge icons.

---

### Domain 7: Universal Experience, Search & Accessibility

#### F-02: Public Landing Page
- **PRD Reference**: PRD v3.0 §1.1
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `FEAT-004`
- **Routes**: `/`
- **Components**: `LandingPage.tsx`
- **Test Suites**: `LandingPage.test.tsx`

**User Stories:**
- **US-02.1 (Platform Onboarding)**: *As a prospective user, I want to understand TalentSphere's features and view platform metrics so that I am motivated to sign up.*
  - **Acceptance Criteria**: Renders hero banner, core feature grid, dynamic platform metrics counter, and call-to-action buttons.

---

#### F-03: Role-Adaptive Dashboard
- **PRD Reference**: PRD v3.0 §13
- **BRD Reference**: BRD v3.0 §1 (BO-1, BO-2)
- **SSOT Traceability**: `FEAT-005`
- **Routes**: `/dashboard`
- **Components**: `DashboardPage.tsx`
- **Services**: `dashboardService.ts`
- **Database Entities**: `profiles`, `jobs`, `job_applications`, `enrollments`
- **Test Suites**: `DashboardPage.test.tsx`, `dashboardService.test.ts`, `dashboardOperationalAnalytics.test.ts`

**User Stories:**
- **US-03.1 (Adaptive Dashboard View)**: *As an authenticated user, I want to see a personalized dashboard tailored to my role (`ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`).*
  - **Acceptance Criteria**: Candidates see active course progress, recommended jobs, and challenge streaks; recruiters see open job stats and applicant funnel metrics.

---

#### F-20: Universal Command Search
- **PRD Reference**: PRD v3.0 §5.1
- **BRD Reference**: BRD v3.0 §1 (BO-1)
- **SSOT Traceability**: `F-20`
- **Components**: `CommandSearch.tsx`
- **Test Suites**: `CommandSearch.test.tsx`, `unifiedSearch.test.ts`

**User Stories:**
- **US-20.1 (Quick Navigation)**: *As a user, I want to press `Ctrl+K` / `Cmd+K` from any screen to search pages, jobs, and courses quickly.*
  - **Acceptance Criteria**: Modal opens on shortcut; keyboard arrow navigation; role-filtered destination results; instant navigation on Enter.

---

#### F-21: Resilient Error Recovery & Fallbacks
- **PRD Reference**: PRD v3.0 §5.2
- **BRD Reference**: BRD v3.0 §1 (BO-8)
- **SSOT Traceability**: `F-21`
- **Routes**: `*` (Catch-all)
- **Components**: `NotFound.tsx`, `ErrorBoundary.tsx`
- **Test Suites**: `NotFound.test.tsx`, `ErrorBoundary.test.tsx`

**User Stories:**
- **US-21.1 (Graceful Error Handling)**: *As a user encountering an unexpected UI error or missing route, I want to see helpful recovery options instead of a broken screen.*
  - **Acceptance Criteria**: Catches component render failures; provides "Reload Page" and "Return to Dashboard" action buttons; renders 404 illustration for unknown paths.

---

#### F-18: Chrome Extension Companion
- **PRD Reference**: PRD v3.0 §15
- **SSOT Traceability**: `FEAT-036`
- **Architecture**: Manifest V3 extension in `chrome-extension-project/`
- **Storage**: `chrome.storage.local`

**User Stories:**
- **US-18.1 (External Job Capture)**: *As a job seeker browsing LinkedIn or Indeed, I want to save job postings into my TalentSphere account with one click.*
  - **Acceptance Criteria**: Scrapes job title, company, and description from external DOM; stores locally and syncs to platform.

---

#### F-19: Product Analytics & Event Tracking
- **PRD Reference**: PRD v3.0 §19
- **BRD Reference**: BRD v3.0 §5 (K-01)
- **SSOT Traceability**: `FEAT-034`, `FEAT-035`
- **Database Entities**: `product_analytics_events`
- **Test Suites**: `productAnalytics.test.ts`, `productAnalyticsInsights.test.ts`

**User Stories:**
- **US-19.1 (Telemetry Collection)**: *As a product owner, I want anonymized telemetry on feature usage and navigation paths so that we can optimize user workflows.*
  - **Acceptance Criteria**: Batches client events to `product_analytics_events` with session context without impacting UI performance.

---

## 4. Verification & Testing Traceability Matrix

Every feature is verified by automated test suites running in CI:

```
+-------------------------------------------------------------------------------+
|                            TESTING PYRAMID                                    |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   | Playwright E2E Suites (732 Tests across Chromium, Firefox, WebKit)    |   |
|   | - Keyboard Navigation (14 tests)                                      |   |
|   | - Color Contrast & WCAG AA (44 tests)                                 |   |
|   | - Full Page & Workflow Audits (44 a11y tests)                         |   |
|   +-----------------------------------------------------------------------+   |
|   | Vitest Unit & Integration Suites (846 Tests in 137 Files)             |   |
|   | - Slices, Services, Components, Analytics, Hooks, Validation          |   |
|   +-----------------------------------------------------------------------+   |
|   | Repository Quality & Schema Validators (20 Automated Scripts)         |   |
|   | - ADRs, Manifests, OpenAPI, Schemas, Seed Integrity, Data Ownership   |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 5. Maintenance & Governance Lifecycle

1. **New Feature Introduction**: Must receive an ID (`F-XX`), user stories, acceptance criteria, and be registered in:
   - `docs/PRD.md`
   - `docs/BRD.md`
   - `docs/FEATURES_AND_USER_STORIES.md`
   - `docs/MASTER_TRACEABILITY_MATRIX.json`
   - `module-manifest.json`
2. **Schema & Contract Alignment**: Database table additions must be reflected in `supabase-schema.sql`, `data-ownership-manifest.json`, and tested via `npm run validate:all`.
