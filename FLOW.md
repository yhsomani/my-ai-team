# TalentSphere Living Execution Flow Model

> Documentation status: Current living execution model documenting runtime triggers, call chains, data transformations, state mutations, persistence, error recovery, and modification paths.

---

## Flow 1: User Authentication & Role-Based Session Bootstrap

### Trigger
User submits login credentials on `/login` or registers on `/register`.

### Entry Point
- File: `apps/frontend/src/pages/auth/LoginPage.tsx` / `RegisterPage.tsx`
- Function: `handleLogin(e)` / `handleRegister(e)`

### Execution Path
1. `LoginPage.tsx -> handleLogin()`: Validates input fields using `authErrorCopy.ts`.
2. `supabaseClient.auth.signInWithPassword({ email, password })`: Authenticates against Supabase Auth endpoint.
3. Supabase Auth returns session with JWT token containing `role` / `app_metadata` claims.
4. `authSlice.ts -> setCredentials()`: Updates Redux store state (`user`, `token`, `role`).
5. `Header.tsx / Sidebar.tsx`: Selects navigation items filtered by `roleRegistry.ts` (`ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`).
6. `ResponsiveLayout.tsx`: Renders authenticated application shell with route-specific main landmark (`Dashboard application content`).
7. `DashboardPage.tsx`: Mounts and triggers initial dashboard metrics fetch.

### Data Flow
- Input: `email`, `password`, role intent (`talent` | `recruiter`).
- Transformation: Normalizes role to `ROLE_*` standard.
- Output: Authenticated user session object in Redux + localStorage auth token.

### State Changes
- Redux: `state.auth.user` populated, `state.auth.isAuthenticated = true`.
- LocalStorage: Supabase session key saved.

### Persistence
- Database: `auth.users` session created in Supabase; `public.profiles` loaded/created.

### Error Path
- Invalid credentials: Caught in `LoginPage.tsx`, sanitized by `authErrorCopy.ts`, rendered as accessible alert without raw exception leakage.
- Network failure: Displays safe fallback error message with retry button.

### Final Result
User lands on `/dashboard` with role-specific widgets, navigation, and metrics.

---

## Flow 2: Job Search, Filtering, and Application Submission

### Trigger
Talent searches/filters jobs on `/jobs` and clicks "Apply" on a job card.

### Entry Point
- File: `apps/frontend/src/pages/jobs/JobsPage.tsx`
- Function: `handleApplyJob(jobId)` -> `handleSubmitApplication(payload)`

### Execution Path
1. `JobsPage.tsx -> loadJobs()`: Queries `public.jobs` (joined with `public.companies`) via `jobService.ts`.
2. User applies filters (location, remote, salary, type, search term): updates local filter state and URL search params.
3. User clicks "Apply": `handleOpenApplicationModal(job)` loads previous application draft or pre-fills from profile.
4. User attaches resume and enters cover note: `handleFormChange()`.
5. User clicks "Submit Application": `applicationService.submitApplication({ jobId, resumeUrl, coverLetter })`.
6. `applicationService.ts`: Inserts row into `public.job_applications` with status `PENDING`.
7. Inserts initial timeline event into `public.application_status_events` (`status = PENDING`).
8. Triggers `notificationService.createNotification` for the recruiter owning the job.
9. Redux store `jobSlice.ts` / local query cache invalidates and updates applied state.
10. `JobsPage.tsx` renders success toast: "Application submitted successfully".

### Data Flow
- Input: `job_id`, `user_id`, `resume_url`, `cover_letter`, `answers`.
- Transformation: Synthesizes `job_applications` record with timestamp and UUID.
- Output: Confirmed application record with status `PENDING`.

### State Changes
- Local State: Modal closes, job card switches to "Applied" badge.
- Database: 1 row in `job_applications`, 1 row in `application_status_events`, 1 row in `notifications`.

### Error Path
- Network / Database error: Modal displays safe error copy (`Jobs action-failure contract`), preserves entered cover letter and resume in draft storage, keeps "Submit Application" button available for retry.

### Final Result
Application is permanently recorded and visible under the "Applied" tab and recruiter candidate queue.

---

## Flow 3: Recruiter Job Creation & Publishing

### Trigger
Recruiter navigates to `/jobs/post`, fills job requirements, and clicks "Publish Job".

### Entry Point
- File: `apps/frontend/src/pages/jobs/PostJobPage.tsx`
- Function: `handlePublishJob()`

### Execution Path
1. `PostJobPage.tsx -> useEffect()`: Verifies recruiter company profile via `companyService.getCompanyByUser(user.id)`.
2. Form fields populated: Title, Description, Department, Location, Type, Salary range, Required skills.
3. User can save draft (`handleSaveDraft`) or apply template (`handleApplyTemplate`).
4. User clicks "Review & Publish": Checklist verifies required fields, salary validity, and non-duplicate title.
5. `jobService.createJob(jobData)`: Inserts into `public.jobs` with `status = 'PUBLISHED'`.
6. Increments recruiter posting metrics and records `recruiterPublishAnalytics.ts` event.
7. Displays success toast and redirects to `/jobs` (My Posts tab).

### State Changes
- Database: New row in `public.jobs`, optional update to `public.job_post_draft_versions`.

### Error Path
- Validation failure: Highlights invalid fields with accessible descriptions.
- Server error: Preserves entire draft in browser storage (`jobPostDraftHistory.ts`), offers retry.

---

## Flow 4: Recruiter Candidate Review, Scorecards, & Pipeline Status

### Trigger
Recruiter reviews incoming applications on `/candidates`.

### Entry Point
- File: `apps/frontend/src/pages/recruiter/CandidatesPage.tsx`
- Function: `handleSelectApplication(id)` / `handleUpdateStatus(status)` / `handleSaveScorecard(scores)`

### Execution Path
1. `CandidatesPage.tsx`: Loads `job_applications` filtered by recruiter's company jobs via `recruiterService.ts`.
2. Candidate selection: Opens application details panel, candidate resume, and timeline.
3. Recruiter adds scorecard: `recruiterService.saveScorecard({ applicationId, technicalScore, cultureScore, notes })` -> Inserts into `public.candidate_scorecards`.
4. Recruiter changes status (e.g., `PENDING` -> `INTERVIEW` -> `OFFER`): `applicationService.updateApplicationStatus(applicationId, newStatus)`.
5. Database trigger / service appends to `public.application_status_events`.
6. Dispatcher generates notification to candidate in `public.notifications`.
7. Candidate table and pipeline summary metrics re-render with updated counts.

---

## Flow 5: Interactive Resume Builder & Multi-Format Export

### Trigger
Talent edits resume on `/resume` and exports to PDF or HTML.

### Entry Point
- File: `apps/frontend/src/pages/profile/ResumeBuilder.tsx`
- Function: `handleDownloadPdf()` / `handleDownloadHtml()` / `handleSyncProfile()`

### Execution Path
1. `ResumeBuilder.tsx`: Loads profile, skills, experience, and education from `profileService.ts`.
2. User edits sections, toggles layout themes, or runs AI Resume Enhancer (`aiService.ts -> analyzeResumeDraft`).
3. User selects "Download PDF":
   - `resumePdfExport.ts` generates structured print-ready DOM.
   - Triggers client-side PDF renderer / browser print stream.
4. User selects "Download HTML": Serializes sanitized standalone HTML with embedded Aura tokens.
5. Logs export event to `public.resume_export_events` and syncs metadata to `public.resume_artifacts`.
6. Updates `resumeExportHistory.ts` local cache.

---

## Flow 6: LMS Course Catalog, Lesson Progress, & Certification

### Trigger
User enrolls in course on `/learning` and completes a lesson.

### Entry Point
- File: `apps/frontend/src/pages/lms/LMSPage.tsx` / `CoursePlayer.tsx`
- Function: `handleEnroll(courseId)` / `handleCompleteLesson(lessonId)`

### Execution Path
1. `LMSPage.tsx`: Loads active courses from `public.courses` via `lmsService.ts`.
2. User clicks "Enroll": Inserts row into `public.enrollments` (`status = 'IN_PROGRESS'`).
3. User watches video / reads lesson: updates playback position in `public.lesson_progress`.
4. User clicks "Mark Lesson Complete":
   - Updates `lesson_progress.completed = true`.
   - Computes course completion percentage.
   - If 100% complete: Updates `enrollments.status = 'COMPLETED'`, awards Course Badge via `gamificationService.awardBadge()`, and credits XP to `public.user_profiles.xp`.
5. Toast notification displays "Lesson Completed! +50 XP".

---

## Flow 7: Coding Challenge Solve, Execution, & Judging

### Trigger
User opens challenge on `/challenges/:id`, types solution in code editor, and clicks "Submit".

### Entry Point
- File: `apps/frontend/src/pages/challenges/ChallengesPage.tsx`
- Function: `handleSubmit()` / `handleRunSampleTests()`

### Execution Path
1. `ChallengesPage.tsx`: Loads challenge details, starter code, test case hints from `challengeService.ts`.
2. User clicks "Run Sample Tests": Evaluates local sample assertions client-side or via sandbox execution API.
3. User clicks "Submit Solution":
   - `challengeService.submitChallengeSolution(challengeId, { code, language, status: 'SUBMITTED' })`.
   - Backend evaluates test suite against hidden test cases.
   - Computes score (0-100) and status (`ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`).
   - Inserts row into `public.challenge_submissions`.
4. If `ACCEPTED` with score 100:
   - Awards XP and updates `public.leaderboard`.
   - Unlocks challenge completion badge.
5. `ChallengesPage.tsx` renders updated attempt history, score badge, and output diff.

---

## Flow 8: Professional Networking & Connections

### Trigger
User sends connection request or accepts incoming request on `/network`.

### Entry Point
- File: `apps/frontend/src/pages/networking/NetworkingPage.tsx`
- Function: `handleConnect(userId)` / `handleAccept(connectionId)` / `handleDecline(connectionId)`

### Execution Path
1. `NetworkingPage.tsx`: Fetches suggestions and active connections via `networkingService.ts`.
2. User clicks "Connect": Inserts row into `public.connections` with `status = 'PENDING'`.
3. Target user receives notification.
4. Target user clicks "Accept": Updates `connections.status = 'ACCEPTED'`.
5. Both users' connection counts increment.
6. User can set follow-up reminders via `networkingReminders.ts`.

---

## Flow 9: Direct Realtime Messaging & File Attachments

### Trigger
User opens `/messages`, selects thread, and sends a message with optional attachment.

### Entry Point
- File: `apps/frontend/src/pages/messaging/MessagingPage.tsx`
- Function: `handleSendMessage()` / `handleAttachFile(file)`

### Execution Path
1. `MessagingPage.tsx`: Loads user conversations from `public.conversations` / `public.conversation_participants`.
2. Attaching file: `fileUploadService.uploadFile()` uploads to storage, validates MIME type and content security.
3. Sending message: `messagingService.sendMessage({ conversationId, content, attachments })`.
4. Inserts row into `public.messages` with `status = 'SENT'`.
5. Supabase Realtime channel broadcasts message payload to conversation room subscribers.
6. Receiver's client receives websocket event, updates Redux `messagingSlice.ts`, marks status `DELIVERED` / `READ`.
7. Receiver unread indicator updates in shell Header.

---

## Flow 10: AI Copilot & Career Path Guidance

### Trigger
User requests personalized career guidance on `/ai/career-path` or queries AI Assistant on `/ai`.

### Entry Point
- File: `apps/frontend/src/pages/ai/AICareerPath.tsx` / `AIAssistant.tsx`
- Function: `handleGenerateCareerPath()` / `handleSendPrompt()`

### Execution Path
1. Gathers sanitized talent context (current role, target role, skills, completed courses).
2. Calls `aiService.generateCareerPath()` -> calls Spring `ai-service` endpoint or typed client fallback.
3. Normalizes milestone recommendations, skill gap analysis, and recommended LMS courses.
4. Saves session record in `public.ai_sessions`.
5. Generated drafts placed in review queue (`aiSuggestionReviewQueue.ts`) - never auto-mutates user profile without explicit user review and approval.
6. User reviews and clicks "Apply Suggestion": Profile skills and roadmap update accordingly.

---

## Flow 11: Billing Subscription & Payment History

### Trigger
User upgrades subscription on `/billing`.

### Entry Point
- File: `apps/frontend/src/pages/billing/BillingPage.tsx`
- Function: `handleSelectPlan(planId)` / `handleOpenBillingPortal()`

### Execution Path
1. `BillingPage.tsx`: Loads available tiers from `public.subscription_plans` and active status from `public.subscriptions`.
2. User selects Pro/Enterprise plan: `paymentService.createSession(planId)`.
3. In Demo mode (per **ADR-005**): Displays explicit demo checkout confirmation, records simulated payment in `public.payments`, and activates subscription tier.
4. In Live provider mode: Redirects to Stripe Checkout session; Stripe webhook triggers backend `payment-service` to activate subscription in `public.subscriptions`.
5. User transaction list updates.

---

## Flow 12: Automated Background Schedulers & Digest Notifications

### Trigger
Cron execution of Node.js scheduler scripts in `scripts/`.

### Entry Point
- Files: `discover-saved-search-digests.mjs`, `run-notification-digests.mjs`, `run-networking-reminders.mjs`
- Function: `main()` wrapped with `scheduler-audit.mjs`

### Execution Path
1. `scheduler-audit.mjs` opens execution audit log entry in `public.audit_log` with sanitized payload.
2. `discover-saved-search-digests.mjs`:
   - Queries active saved searches in `public.saved_job_searches`.
   - Finds newly published matching jobs from `public.jobs`.
   - Inserts pending items into `public.notification_digest_items`.
3. `run-notification-digests.mjs`:
   - Batches unread notifications and digests per user preference.
   - Dispatches consolidated notifications.
4. `scheduler-audit.mjs` writes completion status and metrics to `public.audit_log`.

---

## Current Modification Path

```markdown
# Current Modification Path

Feature: God-Project Transformation & UI Consistency
Objective: Establish comprehensive living documentation, multi-team decomposition boundaries, and verify end-to-end consistency.

Entry Point: Master Architecture Suite & Living Knowledge Docs

Current Files:
- `ARCHITECTURE.md`
- `FLOW.md`
- `DECISION.md`
- `PROBLEMS.md`
- `PROJECT-BOUNDARIES.md`
- `IMPLEMENTATION-PLAN.md`

Affected Modules: All frontend feature slices, backend reactor services, database schemas, extension companion, and CI workflows.
Affected UI: Landing, Dashboard, Jobs, Candidates, Profile, Resume, LMS, Challenges, Networking, Messaging, Billing, AI, Admin.
Affected State: Redux slices, Supabase schema models, storage adapters.
Affected API: OpenAPI 3.1 contract (123 operations, 56 schemas).
Affected Database: 59 PostgreSQL tables with RLS and indexes.

Verification Performed:
- 20 static & runtime governance validators passed.
- 114 frontend unit test files (631 tests) passed.
- Frontend lint and production build passed.
- Scheduler tests and Chrome extension build passed.
```
