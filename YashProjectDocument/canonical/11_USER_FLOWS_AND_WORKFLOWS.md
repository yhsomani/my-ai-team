# TalentSphere — User Flows & Workflow Specifications (Canonical SSOT)

> **Document Version**: 1.0-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-09  
> **Authority**: Synthesized from `USER_WORKFLOW_AUTOMATION_GUIDE.md`, `FEATURES_AND_DASHBOARDS.md`, `PRD.md`, and live route components.  
> **Rule**: Zero knowledge loss from source documentation.

---

## 1. User Flow Index

| Flow ID | Flow Name | Primary Persona | Entry Route | Key Features | Target Entities |
|---|---|---|---|---|---|
| WF-01 | Candidate Discovery → Application | P-A (Aisha) | `/jobs` | F-04, F-25 | `jobs`, `job_applications`, `application_status_events` |
| WF-02 | Recruiter Posting → Applicant Triage | P-B (Rohan) | `/post-job` | F-05, F-06 | `jobs`, `job_applications`, `candidate_scorecards` |
| WF-03 | LMS Enrollment → Course Completion → XP | P-A / P-D | `/lms` | F-07, F-22 | `courses`, `enrollments`, `lesson_progress`, `xp_transactions` |
| WF-04 | Challenge Solving → XP & Leaderboard | P-D (Dev) | `/challenges` | F-08, F-22, F-23 | `challenges`, `challenge_submissions`, `xp_transactions`, `leaderboard` |
| WF-05 | Profile Building → Resume Export | P-A (Aisha) | `/profile` | F-12, F-13 | `profiles`, `skills`, `experiences`, `resume_artifacts` |
| WF-06 | Messaging & Interview Coordination | P-A / P-B | `/messaging` | F-10 | `conversations`, `messages`, `conversation_participants` |
| WF-07 | Chrome Extension External Job Capture | P-A / P-D | Extension popup | F-18, F-27, F-28 | `chrome.storage.local` |
| WF-08 | Admin Governance & Moderation | P-C (Priya) | `/admin` | F-17, F-24 | `audit_log`, `content_reports`, `system_settings` |
| WF-09 | AI Career Pathing & Resume Suggestions | P-A / P-D | `/ai-assistant` | F-11 | `ai_sessions`, `automation_suggestions` |
| WF-10 | Notification Consumption & Digest | All | `/notifications` | F-14, F-29 | `notifications`, `notification_settings`, `notification_digest_items` |

---

## 2. End-to-End Workflow Blueprints

### 2.1 WF-01: Candidate Job Discovery to Application Lifecycle

```
TRIGGER: User navigates to /jobs or clicks "Find Jobs" from dashboard
AUTH: ROLE_USER required
FEATURES: F-04 (Job Marketplace), F-25 (Job Detail), F-04 (Application Modal)

[ /jobs — JobsPage.tsx ]
    |
    +--> [ Filter Bar ]
    |    - Role dropdown (e.g., "Software Engineer")
    |    - Salary range slider (min/max)
    |    - Remote toggle (boolean)
    |    - Location input (text search)
    |    - Experience level (junior/mid/senior)
    |    - Industry filter
    |
    +--> [ Job Cards Grid ] -- PostgREST: GET /rest/v1/jobs?select=*
    |    - Title, Company, Salary Range, Remote Badge
    |    - Bookmark toggle (saved_job_searches)
    |    - Quick-apply button
    |
    +--> [ Click Job Card ] --> /jobs/:id (JobDetailPage.tsx)
         |
         +--> [ Job Detail View ]
         |    - Full description, requirements, benefits
         |    - Company profile link
         |    - Similar jobs sidebar
         |
         +--> [ "Apply Now" Button ]
              |
              +--> [ Application Modal ]
              |    - Attach Resume (select from resume_artifacts or upload new)
              |    - Cover Letter textarea
              |    - Auto-save draft (application_drafts)
              |
              +--> [ "Submit" Action ]
                   |
                   +--> INSERT INTO job_applications (user_id, job_id, status='APPLIED')
                   +--> INSERT INTO application_status_events (from=NULL, to='APPLIED')
                   +--> INSERT INTO notifications (recipient=recruiter, type='NEW_APPLICATION')
                   +--> INSERT INTO xp_transactions (user_id, ref_type='application', ref_id=<new_id>, amount=10)
                   +--> TOAST: "Application submitted! +10 XP earned"
```

**Data Flow**: `JobsPage` → `supabase.from('jobs').select('*')` → PostgreSQL RLS filters by auth.uid() → PostgREST JSON response → React state render.

**Edge Cases**:
- Duplicate application prevention: `UNIQUE(user_id, job_id)` constraint on `job_applications`.
- Draft persistence: Auto-saves every 30s to `application_drafts` for recovery on accidental navigation.
- XP deduplication: `UNIQUE(user_id, ref_type, ref_id)` prevents double-awarding.

---

### 2.2 WF-02: Recruiter Job Posting & Applicant Pipeline Triage

```
TRIGGER: Recruiter clicks "Post a Job" from dashboard or /post-job
AUTH: ROLE_RECRUITER or ROLE_ADMIN required
FEATURES: F-05 (Post Job Studio), F-06 (Candidate Pipeline)

[ /post-job — PostJobPage.tsx ]
    |
    +--> [ Template Selection ] -- job_post_templates
    |    - Pre-filled industry templates (Tech, Healthcare, Finance)
    |    - "Start from Scratch" option
    |
    +--> [ Job Editor Form ]
    |    - Title, Department, Description (rich text)
    |    - Requirements (skills array)
    |    - Salary Min/Max, Location, Remote toggle
    |    - Experience Level, Industry
    |
    +--> [ "Save Draft" ] --> job_post_draft_versions (versioned drafts)
    |
    +--> [ "Publish" ]
         |
         +--> INSERT INTO jobs (company_id, posted_by, status='ACTIVE')
         +--> INSERT INTO notifications (type='JOB_PUBLISHED')
         |
         v
[ /candidates — CandidatesPage.tsx ]
    |
    +--> [ Kanban Pipeline Board ]
    |    Columns: APPLIED → SCREENING → INTERVIEWING → OFFERED → HIRED
    |                                           ↘ REJECTED
    |
    +--> [ Candidate Card ] -- job_applications JOIN profiles
    |    - Name, Applied Date, Resume Preview
    |    - Match Score (if available)
    |    - Current Stage Badge
    |
    +--> [ Drag & Drop Stage Transition ]
    |    UPDATE job_applications SET status='SCREENING' WHERE id=<app_id>
    |    INSERT INTO application_status_events (application_id, from='APPLIED', to='SCREENING')
    |
    +--> [ Scorecard Modal ] -- candidate_scorecards
    |    - Technical Rating (1-5)
    |    - Communication Rating (1-5)
    |    - Culture Fit Rating (1-5)
    |    - Notes textarea
    |    - "Submit Evaluation" → INSERT INTO candidate_scorecards
    |
    +--> [ "Message Candidate" ] --> /messaging (creates conversation)
    |
    +--> [ "Reject" Action ]
         UPDATE job_applications SET status='REJECTED'
         INSERT INTO notifications (recipient=candidate, type='APPLICATION_REJECTED')
```

---

### 2.3 WF-03: LMS Course Enrollment → Completion → XP Reward

```
TRIGGER: User clicks "Enroll" on a course in /lms
AUTH: ROLE_USER required
FEATURES: F-07 (LMS), F-22 (Gamification XP)

[ /lms — LMSPage.tsx ]
    |
    +--> [ Course Catalog Grid ] -- GET /rest/v1/courses?select=*
    |    - Course Title, Thumbnail, Difficulty, Duration
    |    - Lesson Count, Enrollment Count
    |    - "Enroll" / "Continue Learning" button
    |
    +--> [ "Enroll" Action ]
    |    INSERT INTO enrollments (user_id, course_id, status='ACTIVE')
    |    INSERT INTO xp_transactions (ref_type='enrollment', amount=5)
    |    TOAST: "Enrolled! +5 XP"
    |
    +--> [ Course Detail View ]
    |    - Lesson list with completion checkmarks
    |    - Progress bar (% complete)
    |
    +--> [ Click Lesson ] --> Lesson Content View
    |    - Video / Article / Interactive content
    |    - "Mark Complete" button
    |
    +--> [ "Mark Complete" ]
         INSERT INTO lesson_progress (user_id, lesson_id, completed=true, completed_at=NOW())
         |
         +--> [ Check Course Completion ]
              SELECT COUNT(*) FROM lessons WHERE course_id=<id>
              SELECT COUNT(*) FROM lesson_progress WHERE user_id=<uid> AND lesson_id IN (lessons)
              |
              +--> IF all lessons complete:
                   UPDATE enrollments SET status='COMPLETED', completed_at=NOW()
                   INSERT INTO xp_transactions (ref_type='course_completion', amount=50)
                   TOAST: "Course completed! +50 XP"
              |
              +--> ELSE:
                   UPDATE progress bar in UI
```

**Gamification Rules**:
- Enrollment: +5 XP (one-time per course).
- Each lesson completion: +2 XP.
- Full course completion: +50 XP bonus.
- Daily XP cap: 200 XP per user (enforced in `gamificationService.ts`).

---

### 2.4 WF-04: Challenge Solving → XP & Leaderboard Ranking

```
TRIGGER: User clicks "Start Challenge" in /challenges
AUTH: ROLE_USER required
FEATURES: F-08 (Challenges), F-22 (XP), F-23 (Leaderboard)

[ /challenges — ChallengesPage.tsx ]
    |
    +--> [ Challenge Grid ]
    |    - Category filter (Algorithms, Data Structures, SQL, etc.)
    |    - Difficulty badges (Easy/Medium/Hard)
    |    - Submission count, pass rate
    |
    +--> [ Click Challenge ] --> Challenge Detail View
    |    - Problem description
    |    - Input/output examples
    |    - Language selector (JS, TS, Python, SQL)
    |
    +--> [ Monaco Code Editor ]
    |    - Syntax highlighting per language
    |    - Error checking (type errors, linting)
    |    - "Run Tests" button (sandboxed execution)
    |
    +--> [ "Run Tests" ]
    |    POST /api/v1/challenges/:id/submit
    |    → challenge-service (Port 8090) → sandbox execution
    |    → Returns: test_results[], stdout, stderr, pass/fail
    |
    +--> [ "Submit" (all tests pass) ]
         INSERT INTO challenge_submissions (user_id, challenge_id, status='PASSED', code, language)
         INSERT INTO xp_transactions (ref_type='challenge', ref_id=<challenge_id>, amount=50)
         INSERT INTO leaderboard UPDATE (total_xp recalculated)
         TOAST: "Challenge passed! +50 XP. New rank: #42"
```

**Deduplication**: `UNIQUE(user_id, ref_type, ref_id)` on `xp_transactions` prevents re-awarding XP for the same challenge.

---

### 2.5 WF-07: Chrome Extension External Job Capture (MV3)

```
TRIGGER: User clicks extension icon on LinkedIn/Indeed job page
AUTH: None (local-first, ADR-006)
FEATURES: F-18 (Extension), F-27 (Resume Match), F-28 (Scraper)

[ LinkedIn / Indeed Job Page ]
    |
    +--> [ Content Script Injected (content/scraper.ts) ]
    |    DOM selectors extract:
    |    - Job Title (h1 or .job-title)
    |    - Company Name (.company-name)
    |    - Job Description (.description)
    |    - Salary Range (if present)
    |    - Location
    |    - Application URL
    |
    +--> [ Popup UI (popup/index.html) ]
    |    - Displays extracted job info
    |    - "Save Job" button → chrome.storage.local
    |    - Match Score calculation
    |
    +--> [ Resume Match Engine (lib/resumeMatchStatus.ts) ]
    |    - Loads cached candidate profile from chrome.storage.local
    |    - TF-IDF keyword matching: job requirements vs candidate skills
    |    - Calculates match percentage
    |    - Identifies missing skills (shown as badges)
    |
    +--> [ "Save Job" ]
         chrome.storage.local.set({
           savedJobs: [...existing, {
             id: uuid,
             title, company, description, salary, url,
             matchScore: calculated,
             savedAt: timestamp
           }]
         })
         |
         +--> Zero cloud exfiltration (ADR-006)
         +--> User can manually export JSON or sync to TalentSphere
```

---

### 2.6 WF-08: Admin Governance & Trust Moderation

```
TRIGGER: Admin navigates to /admin
AUTH: ROLE_ADMIN required
FEATURES: F-17 (Admin Console), F-24 (Trust & Safety)

[ /admin — AdminDashboard.tsx ]
    |
    +--> [ Overview Dashboard ]
    |    - Active users count, new registrations (7d)
    |    - Job postings count, applications count
    |    - System health indicators
    |
    +--> [ Scheduler Status ]
    |    - run-digests: last run, next run, status
    |    - run-kpi-aggr: last run, row count
    |    - run-reminders: last run, dispatched count
    |    - scheduler_audit: last 10 runs
    |
    +--> [ Audit Log Viewer ] -- audit_log table
    |    - Filterable by action type, user, timestamp
    |    - Action, actor_ip, resource_type, resource_id, details
    |
    +--> [ Feature Flags Panel ] -- feature_flags table
    |    - Toggle flags on/off
    |    - Audit who changed what and when

[ /admin/trust-safety — TrustAndSafetyPage.tsx ]
    |
    +--> [ Report Queue ] -- content_reports WHERE status='pending'
    |    - Reporter, Target Content, Category, Notes
    |    - Created timestamp, priority
    |
    +--> [ Triage Actions ]
    |    - "Review" → status='under_review'
    |    - "Resolve (Hide Content)" → status='resolved', soft-delete content
    |    - "Dismiss" → status='dismissed'
    |    - All transitions logged to audit_log
    |
    +--> [ Analytics Page ] -- /admin/analytics
         - product_analytics_events aggregation
         - User engagement metrics
         - Feature usage heatmaps
```

---

## 3. Cross-Flow Data Dependencies

```
+----------------------------------------------------------------------------------------------+
| FLOW      | PRODUCES (WRITE)                    | CONSUMES (READ)             | XP EVENTS  |
|-----------|-------------------------------------|------------------------------|------------|
| WF-01     | job_applications, status_events,    | jobs, profiles,             | +10 XP     |
|           | application_drafts, notifications   | resume_artifacts            | (apply)    |
| WF-02     | jobs, candidate_scorecards,         | companies, profiles,        | None       |
|           | candidate_notes, messages           | job_applications            |            |
| WF-03     | enrollments, lesson_progress,       | courses, lessons,           | +5, +2/    |
|           | notifications                       | profiles                    | +50 XP     |
| WF-04     | challenge_submissions,              | challenges, challenge_      | +50 XP     |
|           | leaderboard updates                 | test_cases                  | (pass)     |
| WF-05     | skills, experiences, educations,    | profiles, resume_artifacts  | +5 XP      |
|           | resume_artifacts                    |                             | (save)     |
| WF-06     | messages, conversation_             | conversations, profiles     | None       |
|           | participants, message_attachments   |                             |            |
| WF-07     | chrome.storage.local entries        | Local cached profile        | None       |
| WF-08     | audit_log, content_reports triage,  | All platform tables (read), | None       |
|           | feature_flags updates               | content_reports             |            |
| WF-09     | ai_sessions, automation_            | profiles, resume_artifacts, | None       |
|           | suggestions (draft state)           | skills                      |            |
| WF-10     | notifications (read/dismiss),       | notification_settings,      | None       |
|           | notification_digest_items           | profiles                    |            |
+----------------------------------------------------------------------------------------------+
```

---

## 4. RBAC Route Enforcement Matrix

Every workflow enforces RBAC at the route level (`App.tsx` routes) and database level (RLS policies):

| Flow | Route Guard | RLS Enforcement |
|---|---|---|
| WF-01 | `ProtectedRoute` requires `ROLE_USER` | `jobs` SELECT public; `job_applications` own-row only |
| WF-02 | `ProtectedRoute` requires `ROLE_RECRUITER` | `jobs` INSERT/UPDATE own-company only; `job_applications` own-job applicants |
| WF-03 | `ProtectedRoute` requires `ROLE_USER` | `enrollments` own-row only; `lesson_progress` own-row only |
| WF-04 | `ProtectedRoute` requires `ROLE_USER` | `challenge_submissions` own-row only |
| WF-05 | `ProtectedRoute` requires `ROLE_USER` | `profiles` own-row; `skills`/`experiences`/`educations` own-row |
| WF-06 | `ProtectedRoute` requires `ROLE_USER` | `messages` own-conversation only; `conversation_participants` own-row |
| WF-07 | No route (Chrome Extension) | N/A (local storage, no Supabase) |
| WF-08 | `ProtectedRoute` requires `ROLE_ADMIN` | `audit_log` admin read; `content_reports` admin write |
| WF-09 | `ProtectedRoute` requires `ROLE_USER` | `ai_sessions` own-row only |
| WF-10 | `ProtectedRoute` requires `ROLE_USER` | `notifications` own-row only |

---

## 5. Realtime & Async Event Flows

| Trigger | Realtime Channel | Consumer | Effect |
|---|---|---|---|
| New message sent | `messages:{conversation_id}` | Recipient's `MessagingPage` | Message appears in chat thread |
| Notification created | `notifications:{user_id}` | Bell icon widget | Unread count increments, toast |
| Application status change | `job_applications:{recruiter_id}` | Recruiter's `CandidatesPage` | Pipeline board updates |
| XP awarded | Client-side only | `GamificationHeaderBadge` | XP counter animates, level badge updates |
| Content report filed | Admin polling (no realtime) | `TrustAndSafetyPage` | Queue refreshes on page load |

**Supabase Realtime Configuration**:
```typescript
// MessagingPage.tsx — subscribe to new messages
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

---

## 6. Error Recovery & Resilience Patterns

| Flow | Error Scenario | Recovery Mechanism |
|---|---|---|
| WF-01 | PostgREST query fails | `ErrorBoundary` catches render; retry button re-fetches |
| WF-02 | Gateway timeout on job publish | Auto-save draft preserved; user retries publish |
| WF-03 | Lesson completion fails to save | Optimistic UI rollback; toast error; retry |
| WF-04 | Sandbox execution timeout | "Try Again" button; no XP awarded until tests pass |
| WF-06 | WebSocket disconnect | Auto-reconnect via Supabase Realtime; missed messages fetched on reconnect |
| WF-07 | Content script injection fails | Extension popup shows "Refresh page and try again" |
| All | Network offline | Offline toast banner; queued mutations retry on reconnect |

---

## 7. Traceability to Features & User Stories

| Workflow | Primary Features | User Stories |
|---|---|---|
| WF-01 | F-04, F-25 | US-02 (Job Search), US-01 (Registration prerequisite) |
| WF-02 | F-05, F-06 | US-03 (ATS Pipeline), US-02 (Job Publishing) |
| WF-03 | F-07, F-22 | LMS enrollment and progress tracking |
| WF-04 | F-08, F-22, F-23 | US-04 (Challenge Submission) |
| WF-05 | F-12, F-13 | US-01 (Profile), Resume Builder |
| WF-06 | F-10 | US-05 (Direct Messaging) |
| WF-07 | F-18, F-27, F-28 | Chrome Extension workflows |
| WF-08 | F-17, F-24 | US-06 (Trust & Safety), Admin governance |
| WF-09 | F-11 | AI career pathing and resume analysis |
| WF-10 | F-14, F-29 | Notification center and digest scheduler |

---

*End of User Flows & Workflow Specifications.*
