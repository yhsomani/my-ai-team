# TalentSphere Project Boundaries & Decomposition (PROJECT-BOUNDARIES.md)

> Documentation status: Current living decomposition architecture defining bounded contexts, interface contracts, data ownership, extraction order, and multi-team distribution.

---

## 1. The God-Project Decomposition Plan

### Current Monolithic God-Project
```text
TALENTSPHERE GOD-PROJECT
├── Identity & Auth (Spring + Supabase)
├── Profiles, Skills, Resumes, Portfolios
├── Job Marketplace, Postings, Applications, Recruiter Reviews
├── LMS, Courses, Video Lessons, Enrollments
├── Coding Challenges, IDE, Test Runner, Leaderboard
├── Connections, Suggestions, Reminders
├── Realtime Messaging, Attachments, Notifications
├── Subscription Plans, Billing, Invoices
├── AI Career Paths, Resume Analysis, Prompt Audits
├── Platform Infrastructure, Gateway, Schedulers
└── Browser Companion Extension
```

### Target Decomposed Multi-Team System
```text
TALENTSPHERE PLATFORM ECOSYSTEM
│
├── [Project 1: IAM] Identity & Access Management Team
├── [Project 2: Talent] Talent & Profile Services Team
├── [Project 3: Jobs] Job Marketplace & Recruiting Team
├── [Project 4: LMS/Code] Learning & Technical Assessment Team
├── [Project 5: Social] Communication & Networking Team
├── [Project 6: Billing] Billing & Monetization Team
├── [Project 7: AI] AI Insights & Career Assistant Team
├── [Project Foundation] Platform & Foundation Team
└── [Project Extension] Browser Tools & Extension Team
```

---

## 2. Detailed Project Specifications

### Project 1: Identity & Access Management (IAM)
- **Team**: IAM Engineering Team
- **Purpose**: Authenticate users, manage sessions, enforce role-based access control (RBAC), and maintain security audit logs.
- **Owned Features**: User registration, login, session validation, password reset, role mapping, security settings.
- **Owned Routes**: `/login`, `/register`, `/settings` (Security tab).
- **Owned Tables**: `auth.users`, `public.profiles`, `public.audit_log`, `public.system_settings`.
- **Public Interfaces**:
  - `POST /api/v1/auth/login` (Forwarded/Handled via Supabase)
  - `GET /api/v1/users/me` -> `UserDTO`
  - JWT Token validation & role normalization filter in API Gateway.
- **Dependencies**: Supabase Auth, PostgreSQL.
- **Dependents**: All other domain projects depend on IAM for authenticated identity context (`userId`, `role`).
- **Extraction Order**: 1 (Foundational).

---

### Project 2: Talent & Profile Services
- **Team**: Talent Experience Team
- **Purpose**: Empower candidates to showcase skills, work experience, education, and generate interactive, exportable resumes.
- **Owned Features**: Profile view & edit, skill proficiency management, work experience, education, resume builder, PDF/HTML export, artifact library.
- **Owned Routes**: `/profile`, `/resume`.
- **Owned Tables**: `public.user_profiles`, `public.skills`, `public.experiences`, `public.educations`, `public.certifications`, `public.languages`, `public.projects`, `public.resume_artifacts`, `public.resume_export_events`.
- **Public Interfaces**:
  - `GET /api/v1/profiles/{userId}` -> `ProfileDTO`
  - `PUT /api/v1/profiles/{userId}` -> `ProfileDTO`
  - `POST /api/v1/resumes/export` -> `ExportResultDTO`
- **Dependencies**: IAM (for auth context), File Service (for avatar/resume storage).
- **Dependents**: Jobs (candidate profiles), Networking (connection preview cards), AI Assistant (talent skills context).
- **Extraction Order**: 2.

---

### Project 3: Job Marketplace & Recruiting
- **Team**: Marketplace & Recruiting Team
- **Purpose**: Connect job seekers with hiring companies; provide recruiters with posting workflows, applicant tracking, and candidate scorecards.
- **Owned Features**: Job search & filters, saved searches, application submission, application status timeline, recruiter posting form, draft history, candidate review queue, interview notes & scorecards.
- **Owned Routes**: `/jobs`, `/jobs/post`, `/jobs/applied`, `/jobs/saved`, `/candidates`.
- **Owned Tables**: `public.companies`, `public.jobs`, `public.job_post_draft_versions`, `public.job_post_templates`, `public.job_applications`, `public.application_status_events`, `public.application_drafts`, `public.candidate_notes`, `public.candidate_scorecards`, `public.saved_job_searches`, `public.hidden_explore_jobs`.
- **Public Interfaces**:
  - `GET /api/v1/jobs` -> `Page<JobSummaryDTO>`
  - `POST /api/v1/jobs` -> `JobDTO`
  - `POST /api/v1/applications` -> `ApplicationDTO`
  - `GET /api/v1/recruiter/candidates` -> `Page<CandidateApplicationDTO>`
- **Dependencies**: IAM, Talent (applicant resumes/profiles), Notification Service.
- **Dependents**: Dashboard (job recommendations/stats), AI Assistant (job match scoring).
- **Extraction Order**: 3.

---

### Project 4: Learning & Technical Assessment
- **Team**: LMS & Assessment Team
- **Purpose**: Deliver online courses, video lessons, interactive coding challenges, automated code evaluation, and leaderboard rankings.
- **Owned Features**: Course catalog, video lesson player, enrollment tracking, coding challenge catalog, Monaco/code editor workspace, sample test execution, submission judging, leaderboard.
- **Owned Routes**: `/learning`, `/learning/courses/:id`, `/challenges`, `/challenges/:id`.
- **Owned Tables**: `public.courses`, `public.lessons`, `public.enrollments`, `public.lesson_progress`, `public.challenges`, `public.challenge_submissions`.
- **Public Interfaces**:
  - `GET /api/v1/courses` -> `List<CourseDTO>`
  - `POST /api/v1/courses/{id}/enroll` -> `EnrollmentDTO`
  - `POST /api/v1/challenges/{id}/submit` -> `SubmissionResultDTO`
- **Dependencies**: IAM, File/Video Service, Gamification Engine (XP & badge awards).
- **Dependents**: Talent Profile (achievements), AI Career Path (course recommendations).
- **Extraction Order**: 4.

---

### Project 5: Communication & Social Networking
- **Team**: Social & Messaging Team
- **Purpose**: Facilitate professional networking, connection requests, recommendation feeds, and realtime direct messaging with attachments.
- **Owned Features**: Connection requests, suggestions feed, reminders, 1:1 and group conversations, realtime message delivery, attachment preview.
- **Owned Routes**: `/network`, `/messages`.
- **Owned Tables**: `public.connections`, `public.networking_suggestion_preferences`, `public.conversations`, `public.conversation_participants`, `public.messages`.
- **Public Interfaces**:
  - `GET /api/v1/connections` -> `List<ConnectionDTO>`
  - `POST /api/v1/connections/request` -> `ConnectionDTO`
  - `GET /api/v1/conversations` -> `List<ConversationDTO>`
  - `POST /api/v1/messages` -> `MessageDTO`
- **Dependencies**: IAM, Talent (user profile cards), File Service (attachments), Notification Service.
- **Dependents**: Shell navigation (unread message badges), Dashboard.
- **Extraction Order**: 5.

---

### Project 6: Billing & Monetization
- **Team**: Monetization Team
- **Purpose**: Manage subscription tiers, checkout sessions, invoice history, payment provider webhooks, and billing portals.
- **Owned Features**: Subscription plan catalog, upgrade/downgrade flow, payment history, billing portal handoff, demo-mode simulator.
- **Owned Routes**: `/billing`.
- **Owned Tables**: `public.subscription_plans`, `public.subscriptions`, `public.payments`.
- **Public Interfaces**:
  - `GET /api/v1/billing/plans` -> `List<PlanDTO>`
  - `POST /api/v1/billing/checkout` -> `CheckoutSessionDTO`
  - `POST /api/v1/billing/webhook` (Provider webhook endpoint)
- **Dependencies**: IAM, Stripe SDK.
- **Dependents**: Recruiter post limits, Talent Pro features, AI usage limits.
- **Extraction Order**: 6.

---

### Project 7: AI Insights & Career Assistant
- **Team**: Applied AI Team
- **Purpose**: Deliver personalized career path roadmaps, AI resume enhancement suggestions, interview prep questions, and prompt audit tracking.
- **Owned Features**: AI Career Path roadmap generator, resume text enhancement review queue, interview question generator, AI chat assistant.
- **Owned Routes**: `/ai`, `/ai/career-path`.
- **Owned Tables**: `public.ai_sessions`, `public.automation_suggestions`, `public.automation_suggestion_audit_events`.
- **Public Interfaces**:
  - `POST /api/v1/ai/career-path` -> `CareerPathResponseDTO`
  - `POST /api/v1/ai/resume-analysis` -> `ResumeAnalysisDTO`
  - `POST /api/v1/ai/chat` -> `AIChatResponseDTO`
- **Dependencies**: IAM, Talent (resume context), Jobs (job requirements), LMS (course recommendations).
- **Extraction Order**: 7.

---

### Project Foundation: Platform & Infrastructure
- **Team**: Platform Foundation & SRE Team
- **Purpose**: Provide cross-cutting infrastructure, API Gateway edge security, Aura design system tokens, gamification mechanics, notification dispatchers, file security, CI/CD, and observability.
- **Owned Modules**: `api-gateway`, `shared`, `shared-security`, `shared-messaging`, `shared-resilience`, `file-service`, `gamification-service`, `notification-service`, `scripts/`.
- **Owned Tables**: `public.notifications`, `public.notification_settings`, `public.notification_digest_items`, `public.leaderboard`, `public.badges`, `public.user_badges`, `public.xp_transactions`, `public.product_analytics_events`.
- **Extraction Order**: Always Active Core Foundation.

---

### Project Extension: Chrome Companion Tools
- **Team**: Browser Tools Team
- **Purpose**: Provide client-side job scraping, local resume matching, and interview prep in third-party browser tabs (LinkedIn, Indeed, Glassdoor).
- **Owned Modules**: `chrome-extension-project/`.
- **Data Boundary**: Isolated `chrome.storage.local` with versioned migrations (`storageMigrations.ts`).
- **Extraction Order**: Standalone companion artifact.

---

## 3. Project Boundary Verification Matrix

Every proposed project satisfies the 9 architectural tests:

| Project | Independent Understanding? | Independent Testing? | Clear Team Ownership? | Explicit Inputs/Outputs? | Strict Data Ownership? | Reduced Coupling? |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| **IAM** | YES | YES | YES | YES | YES | YES |
| **Talent & Profile** | YES | YES | YES | YES | YES | YES |
| **Job Marketplace** | YES | YES | YES | YES | YES | YES |
| **LMS & Assessment** | YES | YES | YES | YES | YES | YES |
| **Social & Messaging** | YES | YES | YES | YES | YES | YES |
| **Billing** | YES | YES | YES | YES | YES | YES |
| **AI Insights** | YES | YES | YES | YES | YES | YES |
| **Platform Foundation** | YES | YES | YES | YES | YES | YES |
| **Chrome Extension** | YES | YES | YES | YES | YES | YES |
