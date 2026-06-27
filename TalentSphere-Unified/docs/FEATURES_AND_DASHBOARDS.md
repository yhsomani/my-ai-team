# TalentSphere Feature And Dashboard Documentation

> Documentation status: Current detailed feature, route, workflow, role, and UI reference. Keep synchronized with `../../PLAN.md`.

Last reviewed from code: 2026-06-26

This file is the single detailed reference for TalentSphere features, dashboards, user inputs, outputs, workflows, data sources, backend endpoints, role access, and visible UI contents.

For current architecture status and document precedence, start with `docs/ARCHITECTURE_STATUS_INDEX.md`.

## 1. Product Scope

TalentSphere is a career and hiring platform with:

- A React/Vite web app in `apps/frontend`.
- Supabase-backed data access for most frontend features.
- Spring Boot service modules in `services/*` with REST APIs for backend domains.
- A Chrome extension companion in `chrome-extension-project`.

The web app centers on talent users, recruiters, and admins:

- Talent users browse jobs, apply, learn, solve challenges, build a profile/resume, network, message, and use AI guidance.
- Recruiters manage jobs, view candidates, and act on applications.
- Admins view platform health and service status.

## 2. Main Web App Map

The frontend route registry is defined in `apps/frontend/src/navigation/routeRegistry.ts`. `apps/frontend/src/App.tsx` maps those protected route definitions to lazy page components, and `Sidebar.tsx` plus `Header.tsx` consume the same registry for navigation, mobile priorities, search destinations, and role visibility.

| Route | Page | Access | Main purpose |
|---|---|---|---|
| `/` | `LandingPage` | Public | Marketing/public entry page and platform stats |
| `/login` | `LoginPage` | Public, redirects logged-in users | User sign-in |
| `/register` | `RegisterPage` | Public, redirects logged-in users | User registration |
| `/dashboard` | `DashboardPage` | Authenticated | Main dashboard; switches between talent and recruiter view |
| `/networking` | `NetworkingPage` | Authenticated | People suggestions, connection requests, reminders, and workflow analytics |
| `/lms` | `LMSPage` | `ROLE_USER` | Course catalog, course progress, enrollment |
| `/challenges` | `ChallengesPage` | `ROLE_USER` | Challenge listing, category filtering, workspace, reviewed starter-code reset, local sample checks, retry history, and workflow analytics |
| `/jobs` | `JobsPage` | `ROLE_USER`, `ROLE_RECRUITER` | Job discovery, applications, recruiter posting workspace, recruiter full post-page handoff |
| `/jobs/post` | `PostJobPage` | `ROLE_RECRUITER` | Full job posting form |
| `/ai` | `AIAssistant` | Authenticated | Chat-style AI career assistant with recommendation review queue |
| `/career-path` | `AICareerPath` | Authenticated | Generated career-path guidance with retryable unavailable state |
| `/messaging` | `MessagingPage` | Authenticated | Direct conversations, real-time message stream, reviewed link/file attachments |
| `/billing` | `BillingPage` | Authenticated | Subscription plans, payment method, payment history, provider handoffs, and workflow analytics |
| `/settings` | `SettingsPage` | Authenticated | Profile, notification, security, and billing settings |
| `/profile` | `ProfilePage` | Authenticated | Profile overview, edit modal, experience, education, achievements, and workflow analytics |
| `/profile/:userId` | `ProfilePage` | Authenticated | Read-only profile view for another user, such as candidate review, with bounded profile-load analytics |
| `/resume` | `ResumeBuilder` | Authenticated | Resume editor, preview, import/export, and workflow analytics |
| `/admin` | `AdminDashboard` | `ROLE_ADMIN` | System stats and service health |
| `/candidates` | `CandidatesPage` | `ROLE_RECRUITER` | Candidate/application review pipeline |
| `*` | `NotFound` | Any | 404 page |

## 3. Global Layout And Dashboard Shell

The authenticated app shell is built by `ResponsiveLayout`, `Sidebar`, and `Header`.

### What the shell contains

- Left sidebar on desktop.
- Slide-over sidebar on mobile.
- Bottom mobile navigation showing role-prioritized destinations from the shared route registry.
- Top sticky header with:
  - Mobile menu toggle.
  - Platform search input with role-aware destination results and keyboard shortcut focus.
  - Notification bell with due-aware account notifications and actionable reminder popover.
  - User avatar initial.
- Sidebar footer with:
  - Theme toggle.
  - Sign out.
  - Desktop collapse/expand control.

### Sidebar navigation

| Nav item | Route | Role visibility |
|---|---|---|
| Dashboard | `/dashboard` | Any authenticated user |
| Jobs | `/jobs` | `ROLE_USER`, `ROLE_RECRUITER` |
| Candidates | `/candidates` | `ROLE_RECRUITER` |
| Learning | `/lms` | `ROLE_USER` |
| Challenges | `/challenges` | `ROLE_USER` |
| Network | `/networking` | Any authenticated user |
| AI Assistant | `/ai` | Any authenticated user |
| Messages | `/messaging` | Any authenticated user |
| Admin Console | `/admin` | `ROLE_ADMIN` |
| Profile | `/profile` | Any authenticated user |
| Settings | `/settings` | Any authenticated user |

The route registry is covered by `apps/frontend/src/navigation/routeRegistry.test.ts`, which verifies role-gated route access, desktop nav visibility, mobile priority order, header search visibility, and unique route IDs.

Shell workflows:

1. The header search input filters role-visible destinations by label, description, and keywords.
2. Pressing Enter opens the first matching destination.
3. Clicking a search result navigates to that feature and closes search.
4. `Cmd/Ctrl+K` focuses the header search input.
5. The notification bell opens account notification rows and role-aware reminders that navigate only after the user selects one.
6. Future scheduled networking reminders stay visible in the notification list but do not trigger the urgent unread indicator until due.
7. Scheduled workers can promote due networking reminders and saved-search digests without taking the underlying user action.
8. Sidebar, slide-over, desktop collapsed nav, and mobile bottom nav mark the active route with `aria-current="page"`.

### Product Analytics

The frontend product analytics helper records append-only product events without blocking user workflows.

Tracked event taxonomy:

| Event group | Examples |
|---|---|
| Task lifecycle | `task_started`, `task_completed`, `task_abandoned`, `task_failed` |
| Automation | `automation_suggestion_generated`, `automation_suggestion_saved`, `automation_suggestion_dismissed`, `automation_handoff_opened` |
| Prefill/review | `workflow_prefill_used`, `workflow_prefill_rejected`, `preference_updated`, `bulk_action_reviewed`, `bulk_action_confirmed` |
| Reliability | `error_recovery_clicked`, `degraded_state_shown` |

Storage behavior:

1. Events are written to Supabase `product_analytics_events` when available.
2. If Supabase is unavailable, events are retained in a bounded local fallback queue.
3. Analytics failures do not block chat, review, navigation, saving, sending, applying, or critical user actions.
4. Initial event coverage is wired into the AI recommendation review queue and reviewed AI chat clearing.
5. AI destination workflow prefill decisions emit `workflow_prefill_used` or `workflow_prefill_rejected` for Profile, Resume, Jobs/Application, and Learning handoffs.
6. Recruiter publish review opens, publish successes, publish overrides, and publish failures emit task lifecycle events with checklist issue metadata.
7. Jobs Explore Hide, Restore Last, Restore All, and current-view preference refinement actions emit `preference_updated` events with hidden counts and explicit-control metadata.
8. Registration account-type selection, submit, completion, and failure actions emit onboarding events without storing email or password values.
9. Recruiter company setup open, dashboard exit, role-draft handoff, company creation, and company update actions emit onboarding events without blocking the underlying workflow.
10. Jobs saved-search create, update, apply, delete-review, delete-cancel, delete-confirm, alert-enable, and alert-disable actions emit analytics without storing raw search text or saved-search names.
11. Jobs application review open, profile-draft use, draft restore, draft clear, submit success, and submit failure actions emit analytics without storing resume URLs or cover letter text.
12. Candidate review focus, detail/queue opens, draft-aid use, private-review reset review/cancel/confirm, scorecard saves, status review/outcome, and bulk status review/outcome actions emit analytics without storing private notes, scorecard evidence, scorecard ratings, resume URLs, or cover letter text.
13. Messaging conversation selection, load/retry, mark-read, suggested-reply, link/file attachment, upload, send, failed-send, and retry actions emit analytics without storing message text, attachment URLs, or file names.
14. Settings tab selection, profile save, notification preference/save, Billing handoff, password reset review/cancel/outcomes, and account deactivation review/cancel/outcomes emit analytics without storing profile field values, email addresses, quiet-hour exact times, or deactivation confirmation text.
15. Extension operational decisions write to a bounded local queue at `ts_extension_operational_analytics` only when Usage Diagnostics is enabled, without storing raw URLs, company names, role names, resume text, job descriptions, notes, prep topics, page content, generated reports, or raw errors; the popup Diagnostics tab can review the count/latest event, clear visible console logs after inline review, export sanitized JSON, or clear the local queue only after inline review.
16. Dashboard/Admin operational actions emit analytics for load, degraded-state, refresh/retry, activation/checklist handoff, Admin service investigation, Admin audit pagination, scheduled automation status/run-history review, and Admin product-analytics insight decisions without storing raw issue text, service URLs, log queries, scheduler status URLs, runbook URLs, provider output, audit actor IDs, audit IP addresses, raw error text, or user emails.
17. LMS catalog, filter, pagination, AI learning-plan, enrollment, lesson selection, and lesson completion actions emit analytics without storing raw search terms, course titles, lesson titles, provider names, recommendation text, suggestion text, or raw error messages.
18. Challenges category selection, workspace open, language changes, reset review/cancel/confirm, local sample checks, retry-history load/retry, and submission outcomes emit analytics without storing solution code, starter code, challenge prompt/title/description, sample input, expected output, actual output, feedback text, or raw error messages.
19. Billing data load/failure, retry, plan review/cancel, checkout handoff/popup-blocked/submitted/failure, payment-method review/cancel, and billing-portal outcomes emit analytics without storing card details, invoice descriptions, provider URLs, exact payment amounts, plan names, feature text, or raw error messages.
20. Admin Product Analytics Insights reads recent analytics through admin RLS or local fallback and renders aggregate event counts, acceptance/rejection/failure rates, top areas, friction signals, and prioritized improvement opportunities without raw user IDs, object IDs, event metadata, issue text, or raw errors.
19. Profile load/failure, tab selection, basic edit/save/cancel, AI draft review/failure/discard, local suggestion prefill, completion task open/cancel/validation/save/failure, row delete review/cancel/complete/failure, and photo upload/removal review/cancel/validation/success/failure outcomes emit analytics without storing headline, bio, location, full name, skill names, company names, institution names, descriptions, row labels, image URLs, file names, or raw error messages.
20. Resume load/failure, tab selection, import open/cancel/file/analyze/apply, AI draft review/failure/discard, detected-skill save, detected-row save, profile-field save, export, and export-history load/sync outcomes emit analytics without storing resume text, contact details, file names, skill names, row titles, company names, institution names, descriptions, export artifacts, generated HTML, or raw error messages.
21. Networking suggestion load/failure, tab selection, profile preview/full-profile handoff, connect/accept/decline/withdraw, reminder set/clear/sync/backfill, and suggestion hide/restore/sync outcomes emit analytics without storing names, profile text, request notes, skill names, locations, exact reminder timestamps, recommendation reasons, or raw error messages.

### Auth behavior

- Supabase auth session is read on app load.
- In development mode, if Supabase auth does not resolve or has no session, the app creates a mock user:
  - ID: `mock-user-dev-001`
  - Email: `dev@talentsphere.test`
  - Roles: `ROLE_USER`, `ROLE_ADMIN`, `ROLE_RECRUITER`
- Protected routes require a user in Redux auth state.
- Role-restricted routes pass allowed roles to `ProtectedRoute`.

## 4. Dashboard Details

### 4.1 Standard Talent Dashboard

Location: `/dashboard`

Rendered when the logged-in user does not have `ROLE_RECRUITER`.

Data source:

- `dashboardService.fetchDashboardData(userId)`
- Tables: `leaderboard`, `job_applications`, `jobs`, `challenges`, `conversation_participants`, `messages`
- Append-only dashboard operational analytics for load, degraded-state, refresh/retry, checklist, stat-card, quick-action, and panel handoff decisions

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| `user.id` | Auth state | Yes | Identifies the dashboard owner |
| Dashboard operational analytics context | Page actions and load state | No | Records explicit dashboard actions and observed load/degraded states without mutating dashboard data |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Welcome message and "Browse Jobs" action | User name, dashboard description, job navigation button |
| Dashboard Status | Data freshness and source health | Last refreshed timestamp plus Live, Partially refreshed, or Needs attention label |
| Stat cards | Applications, messages, XP earned, level | Numeric snapshot of user activity plus direct navigation to applications, messages, challenges, or profile |
| Recent Opportunities | Up to 5 latest published jobs | Job title, company, location, match score |
| Quick Actions | Profile, LMS, challenges shortcuts | Buttons to `/profile`, `/lms`, `/challenges` |
| Active Challenges | Up to 3 challenges | Title, participant count, difficulty |

Workflow:

1. Page reads the logged-in user.
2. Page calls `dashboardService.fetchDashboardData(user.id)`.
3. Service fetches dashboard data in parallel.
4. XP and level are derived from `leaderboard.total_xp`.
5. Applications are counted from `job_applications`.
6. Messages count is derived from unread incoming messages in user conversations and excludes messages sent by the current user.
7. Fetch results are labeled with metadata for last refresh time and partial failures.
8. Jobs and challenges are displayed as dashboard widgets.
9. Stat cards are buttons that route to the related workflow.
10. Empty job and challenge sections include Browse Jobs or Explore Challenges actions.
11. Dashboard operational analytics records load, degraded-state, refresh/retry, header, checklist, stat-card, quick-action, and panel handoff decisions without recording raw issue text or user email.

Output data shape:

```ts
{
  stats: {
    xp: number,
    level: number,
    applications: number,
    messages: number,
    xpTrend?: string,
    appsTrend?: string,
    msgTrend?: string
  },
  jobs: any[],
  challenges: any[],
  meta: {
    fetchedAt: string,
    source: 'live' | 'partial',
    issues: string[]
  }
}
```

Empty/error states:

- Loading skeleton is shown while data loads.
- Toast error: "Failed to load dashboard data. Please try again."
- Dashboard Status remains visible after load and shows Live, Partially refreshed, or Needs attention with the last refresh time.
- Partial query failures list affected sections such as XP and level, application count, opportunities, challenges, or unread messages.
- Empty sections show "No recent jobs found" or "No active challenges" with direct next-action buttons.

### 4.2 Recruiter Dashboard

Location: `/dashboard`

Rendered when the logged-in user has `ROLE_RECRUITER`.

Data source:

- `recruiterService.getStats(userId)`
- `recruiterService.getRecentApplications(userId)`
- Tables: `jobs`, `job_applications`, `profiles`
- Append-only dashboard operational analytics for load, degraded-state, refresh/retry, checklist, stat-card, quick-action, and panel handoff decisions

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| `user.id` | Auth state | Yes | Recruiter ID |
| Dashboard operational analytics context | Page actions and load state | No | Records explicit recruiter dashboard actions and observed load/degraded states without mutating recruiter data |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Recruiter Console title and "Post a Job" action | Navigation to `/jobs/post` |
| Dashboard Status | Data freshness and source health | Last refreshed timestamp plus Live, Partially refreshed, or Needs attention label |
| Stat cards | Active Jobs, Total Applicants, New Today, Offers | Numeric recruiting funnel snapshot plus direct navigation to jobs or candidates |
| Recent Applications | Latest 5 candidate applications | Candidate name, job title, status badge |
| Quick Actions | Create job, review applications, message candidates | Buttons to `/jobs/post`, `/candidates`, `/messaging` |

Workflow:

1. Page checks `user.roles` for `ROLE_RECRUITER`.
2. Page requests recruiter stats and recent applications independently.
3. Stats count jobs owned by recruiter and applications against those jobs.
4. Recent application rows display candidate profile and job title when available.
5. Recruiter can navigate into candidate review or job posting.
6. Recruiter stat cards are buttons that route to jobs or candidate review.
7. Dashboard Status shows whether both recruiter sections refreshed or only one refreshed.
8. Empty recent applications includes a Post a Job action.
9. Dashboard operational analytics records load, degraded-state, refresh/retry, header, checklist, stat-card, quick-action, and panel handoff decisions without recording raw issue text or user email.

Output data shape:

```ts
{
  activeJobs: number,
  totalApplications: number,
  newApplications: number,
  hiredCount: number
}
```

Implementation note:

- Recruiter-owned jobs are read from `jobs.posted_by`, matching the Supabase schema.
- Recruiter dashboard job counts include current recruiter postings in `DRAFT` or `PUBLISHED` status.
- Dashboard analytics is append-only and non-blocking; it never navigates, retries, creates jobs, changes applications, sends messages, or mutates recruiter data by itself.

### 4.3 Admin Dashboard

Location: `/admin`

Access: `ROLE_ADMIN`

Data source:

- `adminService.getDashboardStats()`
- `adminService.getAuditLogsPage()`
- `adminService.getScheduledAutomationStatus()`
- Tables: `profiles`, `job_applications`, `audit_log`
- Live metadata when Supabase counts load successfully
- Explicit fallback metadata and mock service rows after a 2 second timeout or Supabase failure
- Frontend-safe scheduler rollout catalog, optional provider run-history status API, and environment metadata for configured scheduled workers
- Append-only admin operational analytics for console load/failure/refresh, degraded states, service investigation links, scheduled automation status review, audit retry, audit load more, and audit load completion

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| Admin role | Auth state | Yes | Allows route access |
| Refresh click | Admin user | No | Reloads admin stats and service health |
| Service health/status link click | Admin user | No | Opens read-only service or provider investigation target |
| Scheduled automation refresh | Admin user | No | Rechecks frontend-visible scheduler rollout metadata, optional provider run history, and expected worker catalog |
| Audit-log load more | Admin user | No | Loads the next cursor-backed audit-log page |
| Audit-log retry | Admin user | No | Retries audit-log loading without hiding service health |
| Admin operational analytics context | Page actions and load state | No | Records explicit Admin decisions and observed load/degraded states without mutating operational data |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Admin Console title, source badge, last refresh, Refresh button | System overview with data provenance |
| Fallback warning | Visible only when fallback/mock data is displayed | Degraded-state explanation and latency |
| Stat cards | Total Users, System Load, Services Online, Security Alerts, source badge | Current platform health snapshot with live/mock label |
| Scheduled Automations | Expected scheduler jobs, rollout status, optional latest-run status, schedule, command, manifest path, config-key count, optional status link, optional image/runbook hint | Read-only visibility into saved-search digest discovery, notification digest delivery, and networking reminder delivery rollout/readiness/run-history status |
| Service Health table | Service Name, Status, Uptime, Version, Source, Detail, Actions | Operational table of backend dependencies with source, checked time, direct health/status links, and log queries |
| Audit Log panel | Recent audit event time, action, entity, actor, request context, loaded/total count, Load more | Cursor-backed operational activity without loading the full audit table |
| Admin operational analytics | Read-only event recording | Visibility into refresh, degraded state, investigation, scheduled automation status review, audit retry, and audit pagination decisions |

Output data shape:

```ts
{
  stats: {
    totalUsers: number,
    systemLoad: number,
    servicesOnline: number,
    totalServices: number,
    securityAlerts: number
  },
  services: Array<{
    name: string,
    status: 'Running' | 'Degraded' | 'Offline',
    uptime: number,
    version: string,
    source?: 'live' | 'fallback',
    detail?: string,
    checkedAt?: string,
    serviceId?: string,
    logQuery?: string,
    observabilityLinks?: Array<{
      type: 'health' | 'metrics' | 'logs' | 'status',
      label: string,
      href: string,
      description: string,
      external?: boolean
    }>
  }>,
  metadata: {
    source: 'live' | 'fallback',
    fetchedAt: string,
    latencyMs: number,
    degraded: boolean,
    message: string
  }
}
```

Scheduled automation status output:

```ts
{
  jobs: Array<{
    id: string,
    name: string,
    purpose: string,
    schedule: string,
    command: string,
    manifestPath: string,
    requiredConfig: string[],
    status: 'configured' | 'needs_verification' | 'degraded',
    detail: string,
    statusUrl?: string,
    lastVerifiedAt?: string,
    lastRunStatus?: 'succeeded' | 'failed' | 'running' | 'missed' | 'unknown',
    lastRunAt?: string,
    nextRunAt?: string,
    consecutiveFailures?: number
  }>,
  summary: {
    total: number,
    configuredCount: number,
    needsVerificationCount: number,
    degradedCount: number,
    runHistoryReportedCount: number,
    runHistoryMissingCount: number,
    lastRunSucceededCount: number,
    lastRunFailedCount: number,
    lastRunRunningCount: number,
    lastRunMissedCount: number,
    lastRunUnknownCount: number
  },
  metadata: {
    source: 'frontend-config' | 'provider',
    fetchedAt: string,
    degraded: boolean,
    message: string,
    providerStatus: 'not_configured' | 'connected' | 'unavailable',
    providerCheckedAt?: string,
    image?: string,
    runbookUrl?: string
  }
}
```

Paginated audit log output:

```ts
{
  logs: Array<{
    id: string,
    userId?: string,
    action: string,
    entityType?: string,
    entityId?: string,
    oldValue?: Record<string, any> | null,
    newValue?: Record<string, any> | null,
    ipAddress?: string,
    userAgent?: string,
    createdAt: string
  }>,
  total: number | null,
  limit: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

How audit logs work:

1. Admin Dashboard requests the latest bounded audit page with `adminService.getAuditLogsPage({ limit })`.
2. `adminService.getAuditLogsPage()` queries `audit_log` with exact count metadata, orders by `created_at` and `id` descending, and applies a Supabase `range` for compatibility.
3. The Admin page shows loaded/total audit context when count metadata is available.
4. The first page returns an opaque `nextCursor` when older rows are available.
5. Load more audit events requests `adminService.getAuditLogsPage({ limit, cursor })`, fetches `limit + 1` rows for lookahead, and appends unseen rows.
6. Audit-log retry reloads only the audit-log panel, preserving service-health visibility.
7. Audit browsing is read-only and does not mutate operational records.
8. Admin operational analytics records retry/load-more/load-completion/failure metadata without recording audit actor IDs, audit IP addresses, raw error text, or audit row payloads.

How service investigation links work:

1. `adminService` maps known service names to stable service IDs and health/status routes.
2. Service rows include read-only `observabilityLinks` plus a log query such as `service="job-service"`.
3. Logs and metrics links are added only when `VITE_LOGS_BASE_URL` or `VITE_METRICS_BASE_URL` is configured.
4. Without a configured logs provider, the Admin table shows the log query instead of a broken link.
5. Opening health/status/log/metrics links does not restart services, change settings, edit users, acknowledge incidents, or mutate audit records.
6. Admin operational analytics records only service ID, service status, link type, and external-link flag; it does not record service URLs or log queries.

How scheduled automation status works:

1. `adminService.getScheduledAutomationStatus()` builds a frontend-safe catalog from the expected Kubernetes CronJobs in `infra/k8s/base/notification-digest-cronjobs.yaml`.
2. The catalog lists saved-search digest discovery, notification digest delivery, and networking reminder delivery with cron schedule, command, manifest path, purpose, and config-key count.
3. `VITE_SCHEDULER_ROLLOUT_STATUS` marks the catalog as configured, needs verification, or degraded; `VITE_SCHEDULER_STATUS_BASE_URL`, `VITE_SCHEDULER_IMAGE`, `VITE_SCHEDULER_IMAGE_TAG`, `VITE_SCHEDULER_RUNBOOK_URL`, and `VITE_SCHEDULER_LAST_VERIFIED_AT` add optional operational context.
4. `VITE_SCHEDULER_STATUS_API_URL` optionally loads provider run history JSON and merges recognized per-job latest-run status, last/next run timestamps, consecutive failure counts, status links, image context, and runbook context into the catalog.
5. Provider run-history failures fall back to the rollout catalog and show a degraded/unavailable state without exposing raw provider errors.
6. The Admin page shows status summaries and job details but does not trigger jobs, change schedules, mutate notifications, modify reminders, edit saved searches, or expose secret values.
7. Explicit refresh reloads the frontend-visible status and records bounded configured/needs-verification/degraded plus run-history counts only.
8. Kubernetes pod health, secret health, image digest verification, and a backend-owned provider status contract remain future integration points.

## 5. Feature Details

### 5.1 Landing Page And Public Stats

Route: `/`

Purpose:

- Public product entry point.
- Shows TalentSphere branding, platform feature teasers, call-to-action buttons, and public statistics.

Inputs:

| Input | Source |
|---|---|
| Public stats | Supabase/Admin public stats where available |
| User click | Role-specific registration CTAs, sign-in link, section navigation links |

Page contents:

- Navigation with platform section links, Sign In, and Get Started.
- Hero copy with role-specific CTAs:
  - Join as Talent: routes to `/register?role=talent`.
  - Hire Talent: routes to `/register?role=recruiter`.
- Public feature/pillar cards.
- Public stats bar with:
  - Loading skeletons while public stats are being fetched.
  - Active users, opportunities, match rate, and system status.
  - Live or fallback source label.
  - Last-updated time.
- Footer branding.

How it works:

1. Page renders immediately with hero, navigation, and a loading state for counters.
2. Page requests public profile and published job counts from Supabase.
3. Successful stats load updates counters and marks stats as live.
4. Stats fetch errors keep fallback estimates visible and mark stats as fallback.
5. Role-specific CTA links pass `role=talent` or `role=recruiter` into the registration route.

Outputs:

- Public counters such as active users, opportunities, match rate, and system status.
- Public stats source/freshness label.
- Navigation to role-preselected registration, sign-in, or platform sections.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/admin/public/stats` | None | `totalUsers`, `activeJobs`, `successRate` |

### 5.2 Authentication And Authorization

Routes: `/login`, `/register`

Register route query behavior:

- `/register?role=talent` preselects Talent.
- `/register?role=recruiter` preselects Recruiter.

Frontend service: `authService`

Purpose:

- Register new users.
- Sign users in and out.
- Read current user/session.
- Reset password.
- Update auth user fields.

Inputs:

| Operation | Inputs |
|---|---|
| Register | `email`, `password`, `fullName`, `role`, optional route query `role=talent|recruiter` |
| Login | `email`, `password` |
| Logout | Current Supabase session |
| Reset password | `email` |
| Update user | Optional `email`, `password`, `full_name`, `avatar_url` |

Register page contents:

- Account type selector with:
  - Talent option: explains that the account can browse jobs, build a profile, learn skills, solve challenges, and apply.
  - Recruiter option: explains that the account can post jobs, review candidates, manage applications, and coordinate hiring.
- Role-specific next-step panel:
  - Talent: dashboard checklist.
  - Recruiter: company setup before the first role draft.
- Full name input.
- Email input.
- Password input with minimum-length helper text.
- Create Account submit button.
- Link to sign in for existing users.

How it works:

1. Register page asks for account type, full name, email, and password.
2. If the route includes `role=recruiter`, the Recruiter account type is preselected.
3. If the route includes `role=talent` or no role query, Talent is preselected.
4. The account type selector exposes short role outcome descriptions before the user submits registration.
5. Account type maps to `ROLE_USER` for Talent and `ROLE_RECRUITER` for Recruiter.
6. The visible next-step panel updates when the account type changes.
7. `authService.register` calls `supabase.auth.signUp`.
8. Account-type selections, registration submissions, registration completions, and registration failures emit append-only onboarding analytics without storing email or password values.
9. Talent registration routes to `/dashboard`.
10. Recruiter registration routes to `/jobs/post?companySetup=1`.
11. Login calls `supabase.auth.signInWithPassword`.
12. `App.tsx` listens to Supabase auth state and stores user/session in Redux.
13. Logout calls `supabase.auth.signOut`, clears Redux auth state, and routes to `/login`.

Outputs:

| Operation | Output |
|---|---|
| Register | Supabase auth signup response |
| Login | Supabase auth session/user response |
| Logout | Empty success or thrown error |
| Get current user | Supabase user object |
| Get session | Supabase session object |

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/auth/register` | `User` request body | `410 Gone` with `ApiResponse.success=false` by default; local credential registration requires explicit `AUTH_LOCAL_CREDENTIALS_ENABLED=true` compatibility mode |
| `POST /api/v1/auth/login` | `User` body with email/password | `410 Gone` with `ApiResponse.success=false` by default; local credential login requires explicit `AUTH_LOCAL_CREDENTIALS_ENABLED=true` compatibility mode |
| `GET /api/v1/auth/.well-known/jwks.json` | None | JWK set |
| `GET /api/v1/auth/health` | None | `UP` |

Implementation note:

- Registration uses the same `ROLE_RECRUITER` role expected by recruiter-only routes.
- Registration role descriptions are UI guidance only; they do not change role mapping or grant extra permissions.
- Registration role query preselection is only a default selection; the user can still change account type before submitting.
- ADR-001 makes Supabase Auth the primary login/session authority; backend auth-service local credential endpoints are compatibility-only and disabled by default.

### 5.3 Profile

Routes: `/profile`, `/profile/:userId`

Frontend service: `profileService`

Purpose:

- Display a user's professional profile.
- Edit headline, location, and bio.
- Add/edit/remove saved skill rows and add/edit/remove work experience and education rows.
- Show local, source-labeled profile suggestions that prefill drafts only after user review.
- Review AI profile drafts from the AI Review Queue as editable Headline, Location, and Bio diffs before saving.
- Review, crop, upload, and remove an own-profile avatar image.
- Show skills, experience, education, achievements, connections, and application count.
- Record append-only profile workflow analytics for explicit profile load, tab, edit, suggestion, AI draft, completion, delete, and photo upload/removal decisions.

Inputs:

| Input | Source | Used for |
|---|---|---|
| `user.id` | Auth state | Fetch and update profile |
| `headline` | Edit profile modal | Professional headline |
| `location` | Edit profile modal | Public location |
| `bio` | Edit profile modal | About section |
| Skill task | Profile completion modal | Skill name, proficiency, optional years |
| Skill row ID | Own-profile skill chip | Edit or delete a saved skill |
| Experience task | Profile completion modal | Title, company, optional location, start/end dates, current role flag, description |
| Experience row ID | Own-profile experience tab | Edit or delete a saved work experience row |
| Education task | Profile completion modal | Institution, degree, field of study, start/end dates, optional GPA |
| Education row ID | Own-profile education tab | Edit or delete a saved education row |
| Profile avatar image, crop controls, or current avatar URL | Own-profile header photo actions | Reviewed profile photo crop/upload or removal |
| Profile suggestion draft | Existing headline, bio, location, skills, and work history | Prefill profile or skill modal fields for user review |
| AI profile draft handoff | AI Review Queue recommendation text | Prefill headline, location, and bio fields with current/proposed review before save |
| Profile workflow analytics | Own/external profile scope, entry point, tab ID, row type/mode, field keys, bounded row counts, completion band, suggestion source type, AI field count, and error category | Product analytics only |

Page contents:

- Profile header with avatar/initial, name, role badge, headline, location, website, join year.
- Own-profile avatar camera action that opens an image picker and preview modal.
- Own-profile avatar remove action that opens a confirmation modal when an avatar is present.
- Profile photo review modal:
  - Shows a circular preview of the selected image.
  - Provides zoom, horizontal focus, vertical focus, and reset controls before upload.
  - Upload Photo uploads only after explicit confirmation.
  - Cancel closes the modal without changing the profile.
- Profile photo removal modal:
  - Shows the current avatar and initials fallback.
  - Remove Photo clears the saved avatar only after explicit confirmation.
  - Cancel closes the modal without changing the profile.
- Profile counters: connections, applications, badges.
- Skill chips with edit and remove controls on the user's own profile when a skill row ID is available.
- Tabs:
  - Overview: About text and profile completion.
  - Experience: Work history list with own-profile add, edit, and remove controls.
  - Education: Education history list with own-profile add, edit, and remove controls.
  - Achievements: Badge cards.
- Profile completion card:
  - Shows computed progress from basic info, skills, work experience, and education.
  - Completed tasks show a check state.
  - Missing tasks show direct actions to edit basic info or add skills, work experience, and education.
- Profile Suggestions card:
  - Appears only on the user's own overview when local suggestions are available.
  - Shows source-labeled suggestions for missing headline, location, bio, or inferred skills.
  - Apply Draft opens Edit Profile with the suggested field prefilled.
  - Review Skill opens the skill modal with the suggested skill prefilled.
- AI profile draft review:
  - Opens from the AI Review Queue when a profile recommendation includes structured Headline, Location, or Bio values.
  - Shows current and AI draft values before the editable fields.
  - Provides Discard AI draft, Cancel, and Save Changes controls.
- Completion task modal:
  - Reuses existing `profileService.addSkill`, `profileService.addExperience`, and `profileService.addEducation`.
  - Updates local profile state after successful save.
- Own-profile skill rows:
  - Show row-level edit and remove controls when a saved row ID is available.
  - Reuse the completion task modal with existing skill name, proficiency, and years prefilled when editing.
  - Call `profileService.updateSkill` for edited skill rows and replace only that row in local state after success.
- Own-profile experience and education rows:
  - Show direct Add controls even after the completion task is already complete.
  - Show row-level edit and remove controls when a saved row ID is available.
  - Reuse the completion task modal with existing row data prefilled when editing.
  - Call update services for edited rows and replace only that row in local state after success.
  - Confirm deletion before calling the delete service.
  - Disable destructive row actions while deletion is in progress.

How it works:

1. Page calls `profileService.getProfile(user.id)`.
2. Service selects `user_profiles` with linked `profiles`, `skills`, `experiences`, `educations`, `certifications`, `languages`, and `projects`.
3. Edit modal updates `user_profiles` fields.
4. Completion task actions open targeted forms for missing profile sections.
5. Skill, experience, and education forms write to their related Supabase tables.
6. Skill, experience, and education edit actions prefill the same modal and call update services instead of create services.
7. Local profile suggestions are derived from existing work history, skills, profile text, and a small keyword map.
8. Applying a profile suggestion only pre-fills the edit modal; applying a skill suggestion only pre-fills the skill modal.
9. Suggestions do not call update APIs until the user explicitly saves the modal.
10. AI profile draft handoff parses structured Headline, Location, and Bio suggestions into an editable draft, shows current/proposed values, and clears route state after loading.
11. Discard AI draft and Cancel reset unsaved fields to the current saved profile values.
12. UI updates local state after successful save.
13. Profile photo camera action opens a local image picker, validates image type and size, then opens a crop/preview modal without uploading immediately.
14. Own-profile skill edit controls call `profileService.updateSkill(skillId)` and replace only that skill in local profile state after success.
15. Own-profile skill remove controls call `profileService.deleteSkill(skillId)` and remove only that skill from local profile state after success.
16. Own-profile experience and education remove controls confirm the action, call `profileService.deleteExperience(experienceId)` or `profileService.deleteEducation(educationId)`, and remove only that row from local profile state after success.
17. Confirmed profile photo upload creates a reviewed square crop locally, calls file-service in the `avatars` folder with the cropped image, persists the returned URL with `profileService.updateAvatar(userId, avatarUrl)`, and updates local profile state after success.
18. If file upload succeeds but avatar persistence fails, the page attempts to delete the uploaded file before showing failure feedback.
19. Profile photo remove action opens a confirmation modal; confirmed removal clears `profiles.avatar_url` with `profileService.updateAvatar(userId, null)`, refreshes local state to initials, and attempts file-service cleanup after persistence succeeds.
20. Profile workflow analytics records load, tab, edit, local suggestion, AI draft, completion task, row delete, validation, failure, and photo upload/removal decisions without storing profile text, row labels, names, descriptions, image URLs, file names, or raw error messages.

Outputs:

| Operation | Output |
|---|---|
| Get profile | Profile row plus nested related profile data |
| Update profile | Updated `user_profiles` row |
| Add skill | New `skills` row |
| Update skill | Updated `skills` row |
| Delete skill | Empty success |
| Add experience | New `experiences` row |
| Update experience | Updated `experiences` row |
| Delete experience | Empty success |
| Add education | New `educations` row |
| Update education | Updated `educations` row |
| Delete education | Empty success |
| Apply profile suggestion | Prefilled modal draft only |
| Profile photo upload | Updated `profiles.avatar_url` plus refreshed local cropped avatar display |
| Profile photo removal | Cleared `profiles.avatar_url` plus refreshed local initials display |
| Profile workflow analytics | Server or local append-only analytics events for explicit Profile decisions |

Implementation note:

- Profile photo upload uses explicit crop preview confirmation, image validation, local square crop generation, and file-service upload; photo removal uses explicit confirmation and clears the persisted avatar before provider cleanup; provider retention proof remains a follow-up.
- Profile workflow analytics is append-only and non-blocking; it does not edit profile fields, insert suggestions without a click, save AI drafts automatically, create profile rows, delete rows, upload or remove photos by itself, send messages, create notifications, or mutate profile data by itself.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/profile/{userId}` | `userId` path | `ProfileResponse` |
| `PUT /api/v1/profile/{userId}` | `ProfileUpdateRequest` | Updated `ProfileResponse` |
| `GET /api/v1/profile/{userId}/skills` | `userId` path | `Skill[]` |
| `POST /api/v1/profile/{userId}/skills` | `SkillRequest` | Created `Skill` |
| `PUT /api/v1/profile/{userId}/skills/{skillId}` | `userId`, `skillId`, skill request body | Updated `Skill` |
| `DELETE /api/v1/profile/{userId}/skills/{skillId}` | `userId`, `skillId` | Empty success |
| `GET /api/v1/profile/{userId}/experience` | `userId` | `Experience[]` |
| `POST /api/v1/profile/{userId}/experience` | Experience request body | Created `Experience` |
| `PUT /api/v1/profile/{userId}/experience/{experienceId}` | `userId`, `experienceId`, experience request body | Updated `Experience` |
| `DELETE /api/v1/profile/{userId}/experience/{experienceId}` | `userId`, `experienceId` | Empty success |
| `GET /api/v1/profile/{userId}/education` | `userId` | `Education[]` |
| `POST /api/v1/profile/{userId}/education` | Education request body | Created `Education` |
| `PUT /api/v1/profile/{userId}/education/{educationId}` | `userId`, `educationId`, education request body | Updated `Education` |
| `DELETE /api/v1/profile/{userId}/education/{educationId}` | `userId`, `educationId` | Empty success |
| `POST /api/v1/files/upload` | Avatar image file plus `folder=avatars` | Uploaded avatar URL |
| `DELETE /api/v1/files` | Uploaded avatar URL | Empty success for cleanup after failed persistence or confirmed removal |

Frontend data support:

- `profileService.updateAvatar(userId, avatarUrl)` updates or clears `profiles.avatar_url` for the signed-in user.
- `fileUploadService.uploadFile(file, 'avatars')` uploads explicitly confirmed avatar files.
- `fileUploadService.deleteFile(url)` is used as cleanup if upload succeeds but avatar persistence fails, and after confirmed avatar removal clears profile persistence.

### 5.4 Resume Builder

Route: `/resume`

Purpose:

- Build, edit, preview, save, import draft fields plus reviewed profile skills/rows, export a resume from profile data, and record privacy-bounded workflow analytics.

Inputs:

| Input | Source |
|---|---|
| Profile data | `profileService.getProfile(user.id)` |
| Personal information | Editor inputs: full name, email, phone, location, website |
| Summary | Resume summary textarea |
| Resume import text | Import Text modal |
| Resume import file | Import Text modal text/markdown/DOCX/searchable-PDF file upload |
| Detected resume skills | Import Text modal selectable skill review |
| Detected work experience and education rows | Import Text modal selectable profile-row review |
| AI resume draft handoff | AI Review Queue recommendation text |
| PDF artifact upload | Explicit Upload PDF action using file-service |
| Uploaded PDF artifact library | Account-synced `resume_artifacts` records plus local current-user fallback |
| Uploaded PDF delete receipts | Local current-user deletion receipts after confirmed provider delete |
| Export activity sync | Current user ID and resume export records |
| Resume workflow analytics context | Explicit resume actions, bounded counts, source/status labels, and error categories |
| Experience | Profile experiences |
| Education | Profile educations |
| Skills | Profile skills |

Page contents:

- Header with "Import Text", "Download PDF", "Upload PDF", "Download HTML", "Print PDF", and "Save Changes" buttons.
- Import Text modal:
  - Accepts pasted resume text.
  - Accepts `.txt`, `.md`, `.markdown`, `.docx`, and searchable `.pdf` resume files by reading extractable text locally into the import textarea.
  - Shows explicit unsupported-file feedback for unavailable file formats and unreadable/scanned image-only PDFs.
  - Generates a local draft for supported fields: headline, phone, location, website, summary, skills, dated work experience, and education.
  - Shows detected fields for review with current/proposed values and the source labeled as pasted resume text.
  - Shows detected skills that are not already on the profile, selected by default.
  - Save Skills explicitly adds only selected detected skills to Profile with intermediate proficiency.
  - Shows detected work experience and education rows that are not already on the profile, selected by default.
  - Save Rows explicitly adds only selected detected rows to Profile through the existing profile services.
  - Opens as Review AI Resume Draft when an AI Review Queue resume handoff contains structured Headline, Phone, Location, Website, or Summary fields.
  - Shows AI draft fields with current/proposed values and the source labeled as the AI assistant.
  - Selects detected fields by default and lets the user deselect individual fields before applying.
  - Apply Selected updates only the selected editor draft fields.
- Tabs:
  - Editor.
  - Preview.
- Export Activity:
  - Shows the latest provider-PDF, native-PDF, browser-print, and HTML-download export attempts from account-synced records plus local fallback records.
  - Labels each attempt as Uploaded PDF, Downloaded PDF, Print ready, Downloaded, or Blocked.
  - Labels each attempt as Account synced or Local only.
  - Shows when the attempt happened and whether a PDF was uploaded, a native PDF was downloaded, the print dialog opened, a local HTML file was prepared, or the popup was blocked.
  - Shows recent uploaded PDF links after successful provider uploads.
  - Provides explicit Copy Link controls for uploaded PDF artifact links.
  - Provides explicit Delete controls for uploaded PDF artifact links.
  - Opens a Delete Uploaded PDF confirmation modal before provider deletion.
  - Merges account-synced active artifact metadata with local artifact links and suppresses locally deleted links until account sync catches up.
  - Shows recent deleted PDF receipts after confirmed provider deletion without displaying deleted artifact URLs.
- Editor sections:
  - Personal Information.
  - Professional Summary.
  - Work Experience.
  - Education.
  - Skills.
- Preview sections:
  - Header with name/headline/contact.
  - Summary.
  - Experience.
  - Education.
  - Skills.

Outputs:

- Save action persists supported resume/profile fields to `user_profiles`: headline, summary, phone, location, and website.
- Import Text generates a selectable, reviewable editor draft from pasted text, supported text files, readable DOCX files, or searchable PDF files; it does not save profile fields until the user clicks Save Changes.
- Save Skills adds only selected detected skills to the user's Profile; the user can edit or remove those skills from Profile afterward.
- Save Rows adds only selected detected work-experience and education rows to the user's Profile; the user can edit or remove those rows from Profile afterward.
- AI resume handoff generates a selectable, reviewable editor draft from structured assistant recommendations only; it does not save profile fields until the user clicks Save Changes.
- Download PDF creates a native local PDF resume file from the current editor state and profile rows.
- Upload PDF creates the same reviewed native PDF and uploads it to file-service only after an explicit click; the returned link is added to the uploaded-PDF artifact list and synced to the user's account when available.
- Uploaded PDF Copy Link copies a normalized uploaded artifact URL to the clipboard after an explicit click.
- Uploaded PDF Delete opens an in-app confirmation modal, removes the provider artifact through file-service after explicit Delete PDF confirmation, clears the local artifact record, and marks account artifact metadata deleted when account sync is available.
- Uploaded PDF Delete Receipt stores a local receipt with sanitized file label, deletion time, and local/server persistence target after provider deletion succeeds.
- Download HTML creates a print-ready local HTML resume file from the current editor state and profile rows.
- Print PDF opens a print-ready resume document so the user can save it as PDF from the browser print dialog.
- Export Activity stores the latest export status records locally first under the current user, then syncs the activity record to `resume_export_events` when account storage is available.
- Preview renders resume-like formatted content from the current editor state and profile rows.
- Resume workflow analytics emits append-only load, tab, import, AI-draft, skill-save, row-save, save, export, export-history, artifact-library, artifact-link, artifact-delete-review, and artifact-delete events.

Backend/data support:

- `profileService.saveResume(userId, resume)` updates `user_profiles.summary`.
- `profileService.addSkill(userId, skill)` creates explicitly selected skills detected from resume text.
- `profileService.addExperience(userId, experience)` creates explicitly selected work-experience rows detected from resume text.
- `profileService.addEducation(userId, education)` creates explicitly selected education rows detected from resume text.
- `profileService.getResume(userId)` returns summary, experiences, educations, skills, certifications, and languages.
- `profileService.getResumeExportHistory(userId)` reads recent account-synced export activity from `resume_export_events`.
- `profileService.getResumeArtifacts(userId)` reads active uploaded resume artifact metadata from `resume_artifacts`.
- `profileService.saveResumeArtifactRecord(record)` upserts uploaded resume artifact metadata for cross-device continuity.
- `profileService.markResumeArtifactDeleted(record)` marks uploaded artifact metadata deleted after the user confirms deletion and file-service deletion succeeds.
- `fileUploadService.uploadFile(file, 'resumes')` uploads an explicitly generated reviewed PDF artifact through file-service.
- `fileUploadService.deleteFile(url)` deletes an explicitly selected uploaded PDF artifact through file-service.
- `profileService.saveResumeExportRecord(record)` upserts a user-owned export activity record for `provider-pdf`, `native-pdf`, `html-download`, or `browser-print`; browser-local history remains the fallback if this call fails.
- `recordResumeWorkflowAnalytics` writes privacy-bounded product analytics through the shared local-fallback analytics helper.

Implementation note:

- Full name and email are displayed as read-only account/profile identity fields.
- Work experience and education are managed through profile completion/profile services, can be added from reviewed resume import row suggestions, and are reflected in the resume preview/export.
- DOCX import extracts readable document text locally from the document body and feeds the same review-before-apply parser used for pasted text.
- Searchable PDF import extracts readable text-layer content locally and feeds the same review-before-apply parser; scanned/image-only PDFs are rejected with manual-paste guidance rather than silently uploading content for OCR.
- Resume-imported skills can be saved through the reviewed Save Skills action; they still use profile skill services and remain editable/removable from Profile.
- Resume-imported profile rows require usable date ranges, are saved only through the reviewed Save Rows action, and remain editable/removable from Profile.
- Native PDF export is generated locally from the current reviewed editor/profile data after an explicit click; Upload PDF uses the same reviewed data and a separate explicit provider-upload click.
- Uploaded PDF links are retained in a small account-synced/local-fallback current-user library and can be explicitly opened, copied, or deleted; deletion uses the shared app modal with dialog semantics and focus containment before provider cleanup, recent local delete receipts show confirmed provider deletion without exposing deleted artifact URLs, and formal provider retention policy plus backend lifecycle audit remain follow-up work.
- Export sync records only status metadata for explicit user-triggered export actions. Generated PDF/HTML files remain local unless the user explicitly chooses Upload PDF.
- Resume workflow analytics is append-only and non-blocking; it records source labels, field keys/counts, skill counts, detected/selected/saved/failed profile row counts, export method/status, persistence target, artifact counts, artifact delete review/cancel decisions, input length band, normalized file type including PDF, and error category, not resume text, extracted PDF text, contact details, file names, skill names, row titles, company names, institution names, descriptions, generated files, upload URLs, artifact URLs, clipboard contents, or raw errors.

### 5.5 Jobs

Routes: `/jobs`, `/jobs/post`

Route query behavior:

- `/jobs?tab=applied` opens the Applied tab.
- `/jobs?tab=postings` opens the recruiter-only My Posts tab.
- `/jobs/post?draftId=<id>` opens the full post form in edit mode for a recruiter-owned draft job.
- Returning to Explore clears the `tab` query parameter.

Frontend services: `jobService`, `applicationService`, `profileService`, `recruiterService`, `companyService`

Purpose:

- Let talent users browse published jobs and apply.
- Let recruiters post jobs.
- Let recruiters reuse account-synced job-post templates as editable drafts with local fallback.
- Let recruiters review a job draft before saving it.
- Warn recruiters before saving a draft that appears to duplicate an active job.
- Attach an existing recruiter company profile to a draft with explicit opt-out.
- Let recruiters create, attach, complete, and update company profile context inside the posting workflow.
- Let recruiters track owned draft and published jobs in My Posts.
- Let recruiters edit owned draft jobs from My Posts without creating duplicate drafts.
- Let recruiters publish a draft only after reviewing a visible checklist.
- Prevent public posting status until required publish details are present.
- Let product teams observe publish-review friction without changing recruiter publish control.
- Let users view their submitted applications.

Inputs:

| Operation | Inputs |
|---|---|
| Fetch jobs | Optional `status`, `job_type`, `location`, `search`, `salary_min`, `salary_max`, `limit`, `offset`, `cursor` |
| Search and filter jobs | Search box text, location text, job type, minimum salary, maximum salary |
| Paginate Explore jobs | Selected page size, previous/next page action, and internally stored page cursor when available |
| Explain Explore fit | Current user profile skills/location plus visible job title, description, location, and requirements |
| Hide Explore job | Selected Explore job ID, title, company, job type, location, current user ID or guest scope |
| Restore hidden Explore jobs | Last hidden job action or restore-all action for the current user ID or guest scope |
| Refine Explore from hidden preferences | Repeated hidden job-type insight and explicit current-view preference action |
| Save job search | Current search text and filters, optional user-entered saved search name |
| Apply saved search | Saved search selected by user |
| Delete saved search | Saved search selected by user plus explicit delete confirmation |
| Saved-search analytics | Saved search ID, action, filter-count metadata, alert state, match count, and saved-search counts |
| Build profile application draft | Selected job, current user profile, profile links, skills, latest experience, job requirements |
| Replace with profile application draft | Generated profile draft plus explicit inline replacement confirmation when current draft content exists |
| Restore application draft version | Selected recent draft version, current user ID, selected job ID |
| Clear application draft | Current editable resume URL/cover letter state plus explicit inline confirmation |
| Apply | `jobId`, `userId`, optional `resumeUrl`, optional `coverLetter`, explicit submit confirmation |
| Full post job page | `title`, `description`, `location`, `jobType`, `salaryMin`, `salaryMax`, newline-separated `requirements`, attach-company choice, company profile details |
| Recruiter company setup handoff | `companySetup=1` route query, current recruiter ID, optional company profile details |
| Create company context | Company name, optional industry/location/website/description/employee count, current recruiter ID |
| Update company profile | Existing company ID plus company name, industry, location, website, description, and employee count |
| Job post template | Recruiter ID, current full post form fields, selected template ID |
| Job-post draft history | Recruiter ID, current full post form fields, draft key, company attachment state, selected history version |
| Review full post draft | Current full post form fields, recruiter company context, attach-company choice, recruiter's existing active jobs, and original draft values when editing |
| Recruiter postings | Current recruiter ID, selected My Posts tab, search text |
| Edit recruiter draft | Recruiter-owned draft ID from `draftId`, verified recruiter jobs, edited full post form fields |
| Publish recruiter posting | Selected recruiter-owned draft job, checklist review, explicit publish action |
| Publish analytics | Selected recruiter-owned posting, checklist issues, explicit review/open or publish outcome |
| Update job | `id` plus changed job fields |
| Delete job | `id` |

Jobs page contents:

- Header with role-aware description.
- Recruiters see "Post a Job" action that opens the full draft workflow at `/jobs/post`.
- Tabs:
  - Explore: available jobs.
  - Applied: user's submitted applications.
  - My Posts: recruiter-owned draft and published jobs.
- Search input with applied-tab application search support.
- Explore filters for location, job type, minimum salary, and maximum salary.
- Clear filters button and matching/visible-result count.
- Explore pagination controls with page size, query-backed result range, total count when available, cursor-backed next-page loading, and previous/next actions.
- Save Search button when Explore filters are active.
- Saved Searches row with apply, new-match tracking, and reviewed delete controls.
- Hidden Explore jobs strip with hidden count, last hidden job, Restore Last, Restore All, and explicit current-view preference refinement controls.
- Opted-in saved searches can create in-app new-match notifications shown in the header notification popover, or queue digest items through client-side deferral and server-side discovery when daily/weekly digest preferences are selected.
- Job cards show:
  - Company logo or icon.
  - Title.
  - Company name.
  - Location.
  - Job type.
  - Salary range when available.
  - Match score when present.
  - Local fit reasons from profile skills, location, and visible requirements.
  - Hide action that removes the card from account/local Explore visibility until restored.
  - Apply button, or View Application when the user already applied.
- Applied cards show:
  - Application status badge.
  - Details button.
- Applied-tab load failures show an Applications unavailable state with Retry Applications instead of an empty applications list.
- My Posts cards show:
  - Posting title.
  - Company context.
  - Draft or published status badge.
  - Location, job type, and salary when available.
  - Checklist warning count for incomplete drafts.
  - Edit Draft and Review Publish actions for drafts.
  - View Checklist action for published jobs.
- Publish checklist modal:
  - Posting summary.
  - Missing title, description, location, company context, or requirement warnings.
  - Explicit Publish Job action when required details are present.
  - Edit Draft action when required details are missing.
  - Copy clarifying that publishing makes the job visible in Explore and does not contact candidates automatically.
- Application review modal:
  - Job summary.
  - Application draft source/status block.
  - Profile-generated draft loading, profile/manual/AI/error labels, and helper copy.
  - AI application draft review with current/proposed Resume URL and Cover Letter values when an AI Review Queue jobs/applications handoff contains structured fields.
  - Apply AI Draft and Dismiss AI draft controls.
  - Recent draft versions with source/reason labels, saved time, preview text, and explicit Restore action.
  - Use Profile Draft action with inline replacement review when current draft content exists.
  - Reviewed Clear draft action with Keep Draft and Clear Draft controls.
  - Optional resume or profile URL input.
  - Optional editable cover letter input.
  - Explicit submit button.
  - Append-only workflow analytics for review, draft, restore, clear, submit, and failure decisions.
- Application details modal:
  - Status badge.
  - Applied date.
  - Timeline for Submitted, Reviewed, Interview, and Offer stages.
  - Rejected state when applicable.
  - Submitted resume link and cover letter when available.
- Full post job page:
  - Company setup onboarding panel when opened with `companySetup=1`, including Dashboard and Continue to Role Draft controls.
- Job template selector.
- Use Template action that inserts the selected template into editable fields.
- Save Current action that stores the current form as a recruiter-scoped account template when sync is available, with local fallback.
- Delete action for the selected account/local template that opens a Delete Job Template confirmation modal before removal.
- Template status copy explaining sync state and that saving still requires review.
  - Recent draft versions panel with autosaved, template-applied, reviewed, saved, and restored checkpoints.
  - Account synced or Local only labels for each draft version.
  - Explicit Restore action that replaces only the editable form fields.
  - Company context status with Attach Company checkbox when a recruiter-owned company profile is available.
  - Company profile completion percent and missing field labels.
  - Editable company profile fields for name, industry, location, website, employee count, and description.
  - Create & Attach Company action when no recruiter-owned company profile exists.
  - Save Company Profile action when a recruiter-owned company profile already exists.
  - Company location field that can default from the role location when that value is not remote.
  - Labeled title, description, location, job type, salary, and requirements fields.
  - Review Draft action that validates required fields before any job is saved.
  - Draft review state with title, job type, location, company, salary, description, requirement count, and normalized requirement preview.
  - Changes to Save panel in draft edit mode, comparing normalized field values before updating an existing draft.
  - Advisory duplicate warning when an active recruiter job already matches title, location, and job type.
  - Back to Edit and Save Draft or Save Changes actions.

How it works:

1. Explore tab uses Redux `useGetJobsPageQuery(queryParams)`, backed by `jobService.getJobsPage`.
2. The page reads `tab=applied` or `tab=postings` from the URL to open the Applied or recruiter My Posts tab directly.
3. Changing tabs updates the URL so dashboard application cards and recruiter draft saves can deep-link to the relevant workspace.
4. `jobService.getJobsPage` first queries Supabase `jobs` and joins `companies`.
5. If Supabase fails, it calls API Gateway `GET /api/v1/jobs`.
6. Search, location, type, salary, limit, offset, and optional cursor are sent as query params and also applied client-side as a fallback guard.
7. First-page Supabase reads request an exact count with limit/offset.
8. Later Supabase pages can use opaque cursor tokens based on `posted_at` and `id`, with `limit + 1` lookahead.
9. Explore stores per-page cursor tokens, requests one result page at a time, and shows the current result range.
10. Search, filter, or page-size changes reset Explore pagination to page 1 and clear stored cursors.
11. Supabase responses provide exact total count when available; cursor pages preserve the previously known total while returning `total: null`.
12. API fallback responses use total metadata when present, cursor metadata when present, or `hasNext` from page size.
13. `jobService.getJobs` remains available for saved-search alert checks and other array-returning callers.
14. Explore loads the current profile while the tab is active and builds local advisory fit reasons from profile skills/location plus visible job title, description, location, and requirements.
15. If profile data is unavailable, Explore shows a non-blocking status and job cards still support search, filtering, saved searches, and application review.
16. Fit reasons never sort, hide, filter, apply, or mutate jobs by themselves.
17. Hide stores the selected job in a user-scoped local hidden-Explore preference with title, company, job type, location, and hidden time context; it removes the job from the visible Explore card list and leaves applications, saved searches, and job records unchanged.
18. When signed in, the page loads account hidden Explore jobs from `hidden_explore_jobs`, merges them with local hidden jobs by recency, writes the merged list back to local storage, and backfills missing account rows.
19. Hide, Restore Last, and Restore All update local visibility immediately, then sync the matching account preference when available.
20. Restore Last removes the most recent hidden job from that preference; Restore All clears the hidden-Explore preference and current-view hidden-preference refinements.
21. If hidden preference sync fails, the UI warns that hidden jobs are stored locally and keeps the explicit restore controls available.
22. Repeated hidden job types can surface explicit current-view refinement actions such as hiding that job type in the current Explore view.
23. Active current-view preference refinements appear as visible chips with clear buttons.
24. Restore Last clears a matching current-view job-type refinement.
25. Hide, Restore Last, Restore All, and current-view refinement apply/clear actions emit append-only `preference_updated` product analytics events; analytics failures never block the preference change.
26. Save Search opens a review modal that stores the current search text and filters in browser local storage under a user-specific saved-search key.
27. Saved-search create/update actions emit append-only analytics with filter-count metadata but without raw search text or saved-search names.
28. Saved-search new-match delivery checks the Job Alerts channel and digest frequency: immediate/no-digest settings can create an in-app alert, while daily/weekly digest settings queue a `notification_digest_items` row, update the reviewed match baseline, and show an immediate-alert paused status instead.
29. `npm run discover:saved-search-digests -- --commit` can be scheduled by an operator/worker with Supabase service credentials to discover new matches for alert-enabled saved searches, queue digest items, and update saved-search baselines.
30. Kubernetes CronJobs in `infra/k8s/base/notification-digest-cronjobs.yaml` run saved-search digest discovery every 30 minutes, digest delivery hourly, and networking reminder delivery every 15 minutes when the scheduler image and Supabase service credentials are configured.
31. Selecting a saved search re-applies its saved search text and filters to Explore and emits append-only apply analytics.
32. Toggling saved-search new-match tracking emits append-only alert preference analytics.
33. Delete opens a confirmation modal; Delete Search removes only that saved-search record, stops tracking new matches for that search, and emits append-only review/delete analytics.
34. Clicking Apply opens a review modal instead of immediately submitting.
35. While the review modal is open, the page loads the current user's profile through `profileService.getProfile(user.id)`.
36. The application draft builder uses profile name, headline, summary/bio, website or social URL, skills, latest experience, and selected job requirements to populate editable resume/profile URL and cover-letter fields.
37. AI application handoffs from `/ai` are stored as pending draft sources until the user chooses a job to apply to.
38. If structured Resume URL or Cover Letter fields are present, the Review Application modal shows current/proposed values with Apply AI Draft and Dismiss controls.
39. Apply AI Draft copies only the suggested fields into the editable draft and records the `ai` source; it does not submit.
40. If the user edits before profile loading finishes, the late profile draft is not applied automatically; the user can still click Use Profile Draft.
41. Use Profile Draft applies immediately only when the editable draft is empty or unchanged; otherwise it opens an inline replacement review with Keep Current and Replace Draft controls.
42. Draft edits are stored in the current draft and recorded as recent checkpoints with rapid autosaves coalesced into one useful version.
43. Draft history loads from local storage first, then merges account-synced `application_draft_versions` when available.
44. Restore replaces only the editable draft fields and then autosaves that restored draft as a new checkpoint.
45. Clear opens an inline review panel before removing any draft fields.
46. Confirmed Clear records the current draft as a restorable checkpoint before removing the active draft.
47. Review open, Use Profile Draft review/cancel/apply, Restore, Clear review, Clear cancel, confirmed Clear, submit success, and submit failure actions emit append-only application workflow analytics without storing resume URLs or cover letter text.
48. Submitting the review modal calls `applicationService.submitApplication`.
49. If application persistence fails, no mock or local application is created; the review modal keeps the editable draft visible and warns that nothing was sent.
50. Existing applications are loaded for duplicate awareness; previously applied jobs show View Application.
51. The Applied tab calls `applicationService.getUserApplications(user.id)` and receives normalized `JobApplication` objects with nested job data; if loading fails, the tab shows a retryable Applications unavailable state instead of treating the result as zero applications.
52. Details opens an application timeline modal.
53. Recruiter Post a Job action navigates to `/jobs/post`; it does not create a job from the Jobs page.
54. Full post page loads recruiter-scoped job-post templates from browser storage first, then merges account-synced `job_post_templates` when available.
55. Full post page loads the recruiter's company profile and defaults Attach Company on when a profile is available.
56. When opened with `companySetup=1`, Post Job shows a recruiter onboarding panel and company-focused page title before any job draft is saved.
57. The company setup handoff records an append-only setup-open event, then offers Dashboard and Continue to Role Draft controls so the recruiter can skip or continue explicitly.
58. The company context panel calculates completion for company name, industry, location, website, description, and employee count.
59. If no recruiter company profile is available, the full post page shows company setup fields inside the draft workflow.
60. Company location can prefill from the role location when the role location is not remote and the company location field is still empty.
61. Create & Attach Company calls `companyService.registerCompany` with the current recruiter as owner and the visible company profile fields.
62. The created company becomes the visible attached company context, but the job draft remains unsaved until the recruiter reviews and saves it.
63. Creating company context emits append-only onboarding analytics after the company is created; analytics failures do not block the created company or draft state.
64. If a recruiter-owned company profile exists, Save Company Profile calls `companyService.updateCompany` and keeps job draft save/publish separate.
65. Updating company profile details emits append-only onboarding analytics after the company update succeeds; analytics failures do not block the update.
66. Recruiters can uncheck Attach Company before review or save.
67. Dashboard and Continue to Role Draft onboarding controls emit explicit exit/handoff analytics before navigation.
68. Save Current stores the current form as a reusable template, syncs it to the recruiter account when available, and keeps the form editable.
69. Full post page loads local job-post draft history first, then merges account-synced `job_post_draft_versions` when available.
70. Useful draft edits autosave into recent checkpoints, with rapid autosaves coalesced into one current version.
71. Use Template copies the selected template into editable form fields, records a template-applied checkpoint, and does not submit.
72. Delete opens a confirmation modal; Delete Template removes only the selected account/local template and leaves current form fields unchanged.
73. Restore replaces the editable full post form and company attachment state with the selected version, then records a restored checkpoint.
74. Restoring a draft version does not save, publish, contact candidates, create notifications, or change application status.
75. Review Draft validates title, description, location, and at least one normalized requirement before showing the local review state.
76. The full post page checks existing recruiter jobs and shows an advisory duplicate warning for active matches by title, location, and job type.
77. Back to Edit returns to the editable form without creating or updating a job record.
78. Save Draft normalizes newline or bullet requirements, includes `companyId` only when Attach Company remains enabled, calls `jobService.postJob` with `status: 'DRAFT'`, records a saved checkpoint under the created draft ID, then navigates back to `/jobs?tab=postings`.
79. The My Posts tab calls `recruiterService.getRecruiterJobs(user.id)` for recruiter-owned postings.
80. My Posts search matches posting title, description, location, company name, and status.
81. Edit Draft navigates to `/jobs/post?draftId=<id>`.
81. Draft edit mode reloads recruiter-owned jobs, verifies that the selected job belongs to the recruiter and is still `DRAFT`, then pre-fills the full post form.
82. Draft edit mode excludes the current draft from duplicate warnings.
83. Review Changes shows a normalized Changes to Save panel for title, description, location, job type, salary, requirements, and company attachment.
84. Whitespace-only text differences, equivalent requirement bullet markers, and unchanged company IDs are ignored in the change summary.
85. Save Changes normalizes requirements, applies the visible company attachment choice, calls `jobService.updateJob`, records a saved checkpoint, and returns to `/jobs?tab=postings`.
86. Review Publish or View Checklist opens a checklist modal built from the selected posting and records append-only publish-review analytics with checklist issue metadata.
87. If checklist blockers remain, the modal offers Edit Draft and returns the recruiter to `/jobs/post?draftId=<id>`.
88. If blockers are clear, Publish Job calls `jobService.updateJob(id, { status: 'PUBLISHED' })`, records append-only publish success or failure analytics, updates local posting state, and refreshes Explore results.
89. The database publish readiness policy rejects `PUBLISHED` jobs missing title, description, location, company context, or at least one non-empty requirement.
90. Product analytics failures stay non-blocking and do not change registration, company setup, saved searches, or posting status.
91. No candidate is contacted automatically by registration onboarding, creating company context, updating company profile details, saving, applying, deleting, or toggling saved searches, saving, editing, restoring, replacing, or clearing an application draft, restoring a job-post draft, hiding or restoring an Explore job, refining the current Explore view from hidden preferences, or publishing a job.

Outputs:

| Operation | Output |
|---|---|
| Get jobs | `Job[]` |
| Paginate Explore jobs | `{ jobs, total, limit, offset, hasNext, nextCursor }`; no data mutation |
| Explain Explore fit | Local advisory fit label, matched skills, reasons, and missing profile signals; no data mutation |
| Hide Explore job | User-scoped account/local hidden-job preference with job type/location context and updated visible Explore list; no application, saved-search, or job mutation |
| Restore hidden Explore jobs | Updated account/local hidden-job preference, restored visible Explore list, and cleared conflicting current-view preference refinements |
| Refine Explore from hidden preference | Current-view job-type preference refinement, visible chip, and append-only preference analytics event |
| Get job by ID | `Job` |
| Recommended jobs | `Job[]` filtered by user skills where possible |
| Review job draft | Local review summary, company context, and optional duplicate warning; no data mutation |
| Recruiter company setup handoff | Company setup page mode with dashboard/role-draft controls; no job mutation |
| Create company context | Created company profile attached to current draft; no job mutation |
| Update company profile | Updated recruiter-owned company profile details; no job mutation |
| Onboarding analytics | Append-only registration and company setup task/preference/handoff events; no workflow mutation by itself |
| Post job | Created draft `Job` |
| Recruiter postings | Recruiter-owned draft and published `Job[]` for My Posts |
| Edit recruiter draft | Normalized local change summary, then updated existing draft `Job`; no duplicate draft and no publish action |
| Publish recruiter posting | Updated `Job` status reflected as `PUBLISHED`; candidates are not contacted |
| Publish readiness policy | Database-enforced acceptance or rejection of public posting status; rejected drafts remain drafts |
| Publish analytics | Append-only task lifecycle event with checklist issue metadata; no job mutation by itself |
| Update job | Updated `Job` |
| Delete job | Empty success |
| Save search | `SavedJobSearch` stored in local browser storage |
| Apply saved search | Search text and filters restored in the Jobs Explore tab |
| Delete saved search | Selected saved search removed from local browser storage after explicit confirmation |
| Saved-search analytics | Append-only preference/task event with non-sensitive filter metadata; no workflow mutation by itself |
| Save job post template | Account-synced/local-fallback reusable recruiter-scoped template; no job is created |
| Apply job post template | Editable full post form fields; no job is created |
| Delete job post template | Selected account/local template removed after confirmation; current form unchanged |
| Job-post draft history | Recent account/local recruiter draft versions with restore actions; no job is created, updated, or published |
| Profile application draft | Editable local draft for resume/profile URL and cover letter; no application is submitted |
| AI application draft | Editable local/account-synced draft for resume/profile URL and cover letter after explicit Apply AI Draft; no application is submitted |
| Application draft history | Recent account/local draft versions with restore actions; no application is submitted |
| Application workflow analytics | Append-only task/prefill events with non-sensitive draft metadata; no workflow mutation by itself |
| Apply | Created `JobApplication` only after successful persistence; failed inserts keep the editable draft open and do not create a local/mock application |
| User applications | `JobApplication[]` with nested job data; load failure throws so the Applied tab can show retry instead of an empty state |

Job output shape:

```ts
{
  id: string,
  title: string,
  description: string,
  companyId: string,
  companyName?: string,
  companyLogoUrl?: string,
  location: string,
  jobType: string,
  salaryMin?: number,
  salaryMax?: number,
  requirements: string[],
  postedAt: string,
  status: string,
  matchScore?: number
}
```

Saved search output shape:

```ts
{
  id: string,
  name: string,
  searchTerm: string,
  filters: {
    jobType: string,
    location: string,
    minSalary: string,
    maxSalary: string
  },
  createdAt: string,
  lastUsedAt?: string
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/jobs` | None | Active `Job[]` |
| `GET /api/v1/jobs/featured` | None | Featured `Job[]` |
| `POST /api/v1/jobs` | `Job` body, recruiter role | Created `Job` |
| `GET /api/v1/jobs/search?location=` | `location` query | Matching `Job[]` |
| `GET /api/v1/jobs/search/advanced?location=&jobType=` | Query params | Matching `Job[]` |
| `GET /api/v1/jobs/recommended?userId=` | Optional `userId` | Recommended `Job[]` |
| `GET /api/v1/jobs/{id}` | `id` path | `Job` |

### 5.6 Applications And Candidate Pipeline

Routes: `/jobs`, `/candidates`, recruiter dashboard section

Frontend services: `applicationService`, `recruiterService`

Purpose:

- Track job applications by user.
- Allow recruiters to review and update candidate status.
- Let recruiters inspect candidate details without leaving the review pipeline.
- Help recruiters draft interview plans without automatically contacting candidates.
- Let recruiters capture server-backed or local-fallback private structured scorecards before final decisions.
- Let recruiters prioritize review with explainable advisory candidate signals.
- Let recruiters focus the current loaded page on all visible, needs-scorecard, or high-signal candidates.
- Let recruiters turn current-page analytics into direct review-focus actions.
- Let recruiters open the first current visible or focused candidate for detailed review.
- Let recruiters move previous/next through the current review queue inside candidate details.
- Protect unsaved private notes and scorecards before closing details or moving through the queue.
- Review private-review resets before discarding unsaved note or scorecard edits.
- Show current-page scorecard coverage and evidence gaps.
- Let recruiters move selected eligible candidates to Interview, Offer, or Rejected after reviewing skipped records.

Inputs:

| Operation | Inputs |
|---|---|
| Submit application | `jobId`, `userId`, optional `coverLetter`, optional `resumeUrl` |
| List user applications | `userId` |
| List recruiter applications | `recruiterId`, optional `jobId`, optional `limit`, optional `offset`, optional `cursor` |
| Update application status | `applicationId`, `status` |
| Withdraw application | `applicationId` |
| Candidate search | Candidate name or job title |
| Candidate details | Selected candidate/application row |
| Candidate note | Selected application ID and private recruiter note text |
| Candidate interview plan | Selected candidate name, email, role title, current status |
| Candidate scorecard | Selected application ID, role fit rating, technical depth rating, communication rating, execution rating, evidence notes |
| Candidate advisory signal | Application status, resume presence, cover-letter presence, recruiter-note presence, saved scorecard average, scorecard source |
| Candidate review focus | All visible, needs-scorecard, or high-signal mode |
| Candidate analytics focus action | Review gaps, Review high signal, or Show all action |
| Candidate review queue action | Current visible/focused candidate order |
| Candidate detail queue navigation | Selected candidate ID and current visible/focused candidate order |
| Candidate unsaved review guard | Saved note, draft note, saved scorecard ratings/evidence, draft scorecard ratings/evidence |
| Candidate private-review reset decision | Keep unsaved private review edits or restore drafts to the last saved state |
| Candidate scorecard analytics | Visible candidate IDs, saved scorecard averages, scorecard source |
| Candidate workflow analytics | Application ID, job ID, previous/target status, focus mode, entry point, selected/eligible/skipped/success/failure counts, scorecard presence/source, recruiter-note presence, unsaved note/scorecard flags, advisory score band, error category |
| Bulk Interview move | Visible selected application IDs, current statuses, explicit review confirmation |
| Bulk Offer move | Visible selected application IDs, current statuses, explicit review confirmation |
| Bulk Rejection | Visible selected application IDs, current statuses, explicit review confirmation |

Candidate page contents:

- Header with Refresh and Filter buttons.
- Search input.
- Result range with high-signal count, focus control, advisory/current sort control, page-size, previous-page, and cursor-backed next-page controls during normal browsing.
- Current-page scorecard analytics for coverage, average rubric, evidence gaps, and synced/local scorecards, with direct Review gaps, Review high signal, and Show all focus actions.
- Review first visible/in focus action, page-scoped Select visible control, selected count, target eligibility counts, Clear action, Review Interview Move action, Review Offer Move action, and Review Rejection action.
- Candidate cards show:
  - Selection checkbox.
  - Candidate icon.
  - Candidate name.
  - Status badge.
  - Applied job title.
  - Applied date.
  - Email.
  - Resume link if available.
  - Saved note indicator when recruiter notes exist.
  - Saved scorecard indicator when a private scorecard exists.
  - Advisory signal label and score.
  - Details button.
  - Interview button for pre-interview statuses.
  - Offer button.
  - Reject button.
- Candidate details modal shows:
  - Candidate name, email, job title, applied date, and current status.
  - Current queue position with Previous and Next detail navigation.
  - Unsaved private review warning with Save Note, Save Scorecard, and reviewed Reset Changes actions when draft review edits differ from saved state.
  - Application ID, job ID, and last updated date.
  - Advisory signal action, factors, and safeguards.
  - Resume link and cover letter when submitted.
  - Review guidance.
  - Interview plan draft with suggested business-day slots.
  - Candidate scorecard with Role Fit, Technical Depth, Communication, Execution, evidence notes, overall signal, synced/local save state, Save Scorecard, and Use in Notes actions.
  - Private recruiter notes textarea.
  - Use in Notes action for interview-plan drafts.
  - Save Note action.
  - Open Profile, Interview, Offer, and Reject actions.
- Bulk status review modal shows:
  - Selected, Will Update, and Skipped counts.
  - Eligible application list with current status and target status.
  - Skipped application list with skip reasons.
  - Explicit Confirm Interview Moves, Confirm Offer Moves, or Confirm Rejections action.

How it works:

1. Candidate page reads recruiter user ID.
2. `recruiterService.getApplicationsPage(user.id, { limit, offset, search, cursor })` finds recruiter jobs and returns one application page with total metadata when available.
3. First-page Supabase reads request exact counts with limit/offset.
4. Later Supabase pages can use opaque cursor tokens based on `created_at` and `id`, with `limit + 1` lookahead.
5. Search mode resolves matching profile IDs by candidate full name/email and recruiter-owned job IDs by title before applying application pagination.
6. Candidate search can advance by cursor while preserving matching profile/job filters.
7. The page stores per-page cursor tokens, preserves the known total count when cursor pages return `total: null`, and retains defensive display filtering by candidate name, candidate email, or job title.
8. The page computes advisory signals from saved scorecards, submitted materials, private notes, and current status.
9. Focus control filters only the current loaded page by all visible, needs-scorecard, or high-signal mode.
10. Sort by Advisory Signal reorders only the focused current page and never selects or mutates candidates.
11. The page computes current-page scorecard analytics for coverage, average saved scorecard, strong signals, evidence gaps, and synced/local scorecards.
12. Review gaps, Review high signal, and Show all actions change only the current-page focus.
13. Review first visible/in focus opens the first current filtered/sorted candidate in the in-page details modal.
14. Previous and Next in Candidate Details move through the current filtered/sorted candidate queue.
15. Unsaved private review guards compare saved note/scorecard state with the current note and scorecard drafts.
16. When unsaved review edits exist, Candidate Details close and Previous/Next navigation are blocked until the recruiter saves or resets.
17. Reset Changes opens an inline review; Keep Changes leaves draft note and scorecard edits untouched, while Reset Drafts restores them to the last saved state without saving or changing candidate status.
18. Candidate selection is scoped to the currently loaded page and clears when search, focus, page, or page size changes.
19. Review Interview Move, Review Offer Move, and Review Rejection build target-specific eligibility summaries from selected candidates.
20. Bulk Interview skips candidates already in Interview, Offer, or Rejected status.
21. Bulk Offer only includes candidates currently in Interview.
22. Bulk Rejection skips existing Offer and Rejected rows to avoid accidental offer rescinds or duplicate final-state changes.
23. Confirm bulk status calls `recruiterService.updateApplicationStatus` for eligible selected applications only.
24. Successful bulk updates refresh local cards and the open detail modal when relevant; failed updates remain selected for review or retry.
25. Details opens an in-page modal for application review.
26. Recruiter notes are loaded from browser local storage under a recruiter-scoped key and then from server notes when available.
27. Local scorecards load immediately from recruiter-scoped local storage by application ID.
28. `recruiterService.getCandidateScorecards` syncs scorecards from `candidate_scorecards` when available.
29. Save Scorecard writes local state first, then attempts `recruiterService.saveCandidateScorecard` and shows synced/local state.
30. Use in Notes inserts the advisory scorecard summary into the editable note field and does not save automatically.
31. Save Note stores, updates, or clears the selected application's private note locally and attempts server sync.
32. The interview planner generates two business-day suggested slots and a private-note draft for non-final candidates.
33. Use in Notes inserts the interview plan into the editable note field and does not save automatically.
34. Interview, Offer, and Reject all open a confirmation modal before calling `recruiterService.updateApplicationStatus`.
35. The returned status updates local page state and the open detail modal.
36. Candidate workflow analytics records explicit review focus, detail/queue open, draft-aid, private-review reset review/cancel/confirm, scorecard, status review/outcome, and bulk review/outcome actions.
37. Candidate workflow analytics stores only IDs, counts, status names, source flags, unsaved draft flags, score bands, and error categories; it does not store private notes, scorecard evidence, scorecard ratings, resume URLs, or cover letter text.

Paginated recruiter application output:

```ts
{
  applications: Application[],
  total: number | null,
  limit?: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

Outputs:

| Operation | Output |
|---|---|
| Candidate page | Cursor-backed application page, page metadata, visible selection state |
| Candidate advisory signal | Current-page review-priority label, score, factors, suggested review action, and safeguards |
| Candidate review focus | Current-page visible rows narrowed by selected focus only; no mutation |
| Candidate analytics focus action | Explicit display-focus change only; no selection or mutation |
| Candidate review queue action | Opens first visible/focused candidate details modal only; no selection or mutation |
| Candidate detail queue navigation | Opens previous or next candidate details in the same modal only; no selection or mutation |
| Candidate unsaved review guard | Save/reset prompt, reviewed reset decision, and blocked close/navigation until explicit user action |
| Candidate scorecard analytics | Current-page coverage, average score, strong-signal count, evidence-gap count, synced count, and local count |
| Candidate workflow analytics | Server or local append-only analytics events for explicit candidate review and status workflow decisions |
| Candidate note | Server-backed or local private note |
| Candidate interview plan | Editable note draft only; no status update |
| Candidate scorecard | Server-backed or local private rubric record and optional editable note draft; no status update |
| Bulk Interview move | Eligible selected applications updated to `INTERVIEW`; skipped applications unchanged |
| Bulk Offer move | Eligible selected Interview applications updated to `OFFER`; skipped applications unchanged |
| Bulk Rejection | Eligible selected applications updated to `REJECTED`; existing Offer/Rejected rows unchanged |
| Single status update | One updated application status after confirmation |

```ts
{
  id: string,
  userId: string,
  jobId: string,
  status: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | string,
  appliedAt: string,
  user?: { fullName: string, email: string },
  job?: { title: string },
  resumeUrl?: string,
  coverLetter?: string,
  updatedAt?: string,
  recruiterNote?: {
    applicationId: string,
    note: string,
    updatedAt: string
  }
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/applications` | `JobApplication` body | Created application |
| `GET /api/v1/applications/count/{userId}` | `userId` path | `{ count }` |
| `GET /api/v1/applications/user/{userId}` | `userId` path | User application list |
| `GET /api/v1/applications/job/{jobId}` | `jobId` path | Applications for job |
| `PATCH /api/v1/applications/{id}/status` | `{ status }` body, recruiter role | Updated application |
| `GET /api/v1/recruiter/stats` | Current recruiter context | Recruiter stats |
| `GET /api/v1/recruiter/applications/recent` | Current recruiter context | Recent applications |

Supabase support:

| Table | Purpose |
|---|---|
| `candidate_notes` | Private recruiter notes scoped to applications on jobs they posted |
| `candidate_scorecards` | Private recruiter rubric ratings and evidence scoped to applications on jobs they posted |

Implementation note:

- Candidate Details opens in-page and can also open `/profile/{candidate.userId}` in read-only mode for non-owners.
- Interview planning is draft-only: it does not create video sessions, messages, notifications, or status changes until the recruiter explicitly saves notes or confirms a status update.
- Candidate scorecards are private recruiter aids; they sync through `candidate_scorecards` when available and stay browser-local when server sync is unavailable.
- Advisory signals are private recruiter aids; they only affect displayed priority order and never change candidate status or contact candidates automatically.
- Candidate review focus filters are display-only current-page controls; they do not select candidates, create scorecards, change statuses, or contact candidates automatically.
- Candidate analytics focus actions only change display focus; they do not select candidates, create scorecards, change statuses, or contact candidates automatically.
- Candidate review queue actions only open the details modal; they do not select candidates, create scorecards, change statuses, or contact candidates automatically.
- Candidate detail queue navigation only changes the candidate shown in the details modal; it does not select candidates, create scorecards, change statuses, or contact candidates automatically.
- Candidate unsaved review guards block accidental close/navigation until the recruiter explicitly saves or reviews reset of private notes and scorecards.
- Candidate private-review reset review restores only local draft note and scorecard fields to the last saved state; it does not save notes, create scorecards, change status, send messages, schedule interviews, create notifications, contact candidates, or mutate applications by itself.
- Scorecard analytics are read-only page summaries; they do not create scorecards, select candidates, or contact candidates automatically.
- Candidate workflow analytics is append-only and non-blocking; it does not select candidates, create scorecards, edit notes, change statuses, send messages, schedule interviews, contact candidates, create notifications, or mutate applications by itself.

### 5.7 Learning Management System

Route: `/lms`

Frontend service: `lmsService`

Purpose:

- Show a course catalog.
- Let users enroll in courses.
- Display lessons, progress, course metadata, and learning paths.
- Record append-only LMS workflow analytics for explicit catalog, AI search, enrollment, and lesson decisions.

Inputs:

| Operation | Inputs |
|---|---|
| Get courses | Optional `category`, optional `published`, optional `search`, optional `limit`, optional `offset`, optional `cursor` |
| Get course by ID | `courseId` |
| Get course by slug | `slug` |
| Enroll | `courseId`, `userId` |
| Get user enrollments | `userId` |
| Get lesson progress | `enrollmentId`, optional `userId`, optional `courseId` |
| Mark lesson complete | `enrollmentId`, `lessonId`, optional `userId`, optional `courseId` |
| Create course | Course fields, `instructorId` |
| Paginate courses | Page size, previous page, next page, `limit`, `offset`, cursor checkpoint |
| Page search | Course title, description, category, or provider text sent as course query search |
| Page tab filter | `all`, `in-progress`, `completed` |
| AI learning handoff | AI Review Queue recommendation text and source metadata |
| Continue learning selection | Enrollment progress and first incomplete lesson for each active course |
| Recommended next selection | Unstarted courses, active course categories, catalog order |
| LMS workflow analytics | Tab/search/page context, course/lesson IDs, bounded counts, source flags, and error category |

Page contents:

- Header: "Learning".
- AI learning plan review panel when an AI Review Queue learning handoff includes structured fields:
  - Source label.
  - Review before enrolling badge.
  - Suggested Course Search, Skill, Course, Certification, or Learning Goal search terms.
  - Optional reason text.
  - Apply Search action for each suggestion.
  - Dismiss action.
- Continue Learning panel for in-progress courses:
  - Course category.
  - Course title.
  - Progress percent and progress bar.
  - Next lesson title.
  - Completed lesson count.
  - Resume action.
- Learning progress unavailable panel when enrolled-course progress cannot load:
  - Explains that progress could not be refreshed.
  - Preserves any already loaded progress.
  - Retry Progress action.
- Recommended Next panel for unstarted catalog courses:
  - Category.
  - Difficulty.
  - Title.
  - Description preview.
  - Start action.
- Tabs:
  - All Courses.
  - In Progress.
  - Completed.
- Search input.
- Course pagination controls:
  - Loaded range and total when available.
  - Matching result range for search when total metadata is available.
  - Query-backed result range, total count when available, and matching progress label when progress tabs are active.
  - Courses-per-page selector.
  - Previous and next page icon buttons.
- Course cards show:
  - Category.
  - Difficulty.
  - Title.
  - Description.
  - Duration.
  - Lesson count.
  - XP reward.
  - Provider.
  - Progress bar when progress is greater than zero.
  - Start/Continue/Review button.
- Course detail modal shows:
  - Category.
  - Duration.
  - Description.
  - Enrollment-aware course progress.
  - Curriculum lesson list with active and completed lesson states.
  - Lesson player with lesson title, duration, content, and optional video placeholder.
  - Mark Complete or Enroll and Complete action for the active lesson.
  - Progress-not-saved warning when LMS mutation persistence is unavailable.
  - Close button and Enroll Now button when the user is not enrolled.

How it works:

1. Page dispatches `fetchCourses({ search, limit, offset, cursor, userId, progress })` using the current search text, catalog page, selected page size, active cursor checkpoint, and active progress tab.
2. AI learning handoffs from `/ai` are parsed into suggested catalog searches and route state is cleared after loading.
3. Apply Search copies only the selected AI search term into the LMS search box, resets to All Courses page 1, and does not enroll or change progress.
4. Dismiss clears the AI learning handoff without changing search, enrollment, or lesson progress.
5. For signed-in users, the page loads enrollments with `lmsService.getUserEnrollments(user.id)` and shows a retryable progress-unavailable panel if both enrollment backends fail.
6. `lmsService.getCoursesPage()` tries API Gateway first, sending `category`, `published`, `search`, `userId`, `progress`, `limit`, `offset`, and `cursor` when provided.
7. If the gateway returns a legacy full-array response while search or progress filtering is active, the frontend filters matching courses before local page slicing.
8. If the gateway fails and a progress tab is active, Supabase enrollments are resolved first and matching course IDs are applied before course pagination.
9. If the gateway fails, it queries Supabase `courses` with search filtering, enrollment-aware progress filtering, exact count metadata on the first page, and cursor-backed `created_at`/`id` ordering for subsequent pages.
10. Supabase lesson metadata is fetched only for the visible course IDs.
11. If both fail, it returns an empty page.
12. `lmsService.getCourses()` remains available as the array-returning compatibility path.
13. Progress tabs use enrollment-aware query params and keep local display filtering as a defensive guard.
14. Course cards and LMS tabs use enrollment progress when an enrollment exists.
15. Continue Learning derives active courses from enrollment progress between 1 and 99 percent.
16. Continue Learning opens the same course modal directly at the first incomplete lesson.
17. Recommended Next selects unstarted courses, prioritizing categories that match active in-progress courses when available.
18. Opening a course selects the first incomplete lesson, or the first lesson when nothing is started.
19. Mark Complete calls `lmsService.markLessonComplete(enrollmentId, lessonId, userId, courseId)`, enrolling first when needed.
20. If enrollment progress loading fails, the page preserves any already loaded enrollment state and shows a Retry Progress action instead of implying the user has no enrolled courses.
21. If enrollment or lesson-completion persistence fails, the page keeps the lesson incomplete and warns that progress was not saved.
22. After persisted completion, the page updates local enrollment/course state and advances to the next incomplete lesson.
23. LMS workflow analytics records catalog load/failure, tab selection, search submission, page navigation, page-size changes, AI learning-plan review/apply/dismiss, course opening, enrollment outcomes, lesson selection, and lesson completion outcomes.
24. LMS workflow analytics stores only bounded metadata: tab ID, course ID, lesson ID, entry point, category, difficulty, progress band, lesson/page counts, total/next-page flags, search presence and length band, progress filter, suggestion count/label/index, enrollment flags, completion status, and error category.
25. Raw search terms, course titles, lesson titles, provider names, recommendation text, suggestion text, and raw error messages are not recorded.

Output data shape:

```ts
{
  id: string,
  title: string,
  slug?: string,
  provider: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  progress: number,
  description?: string,
  xp?: number,
  category?: string,
  duration?: string,
  difficulty?: 'Beginner' | 'Normal' | 'Advanced' | 'Expert',
  lessons?: Lesson[]
}
```

Paginated course result:

```ts
{
  courses: Course[],
  total: number | null,
  limit?: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

Outputs:

| Operation | Output |
|---|---|
| AI learning handoff | Reviewed catalog-search suggestions; no enrollment, progress, profile, application, or notification mutation |
| Apply AI learning search | LMS search term update and catalog page reset only |
| LMS workflow analytics | Server or local append-only analytics events for explicit LMS decisions |

Implementation note:

- LMS workflow analytics is append-only and non-blocking; it does not change search without a click, enroll automatically, complete lessons automatically, change course progress, create notifications, send messages, or mutate LMS data by itself.
- LMS catalog reads remain resilient through API Gateway/Supabase fallback, but user enrollment/progress reads and LMS mutations return explicit errors when persistence is unavailable so the UI does not show missing or unsaved progress as complete.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/lms/courses` | Optional category/published/search/limit/offset/cursor query from frontend | `Course[]` or paginated course payload |
| `POST /api/v1/lms/courses` | `Course` body, admin role | Created course |
| `GET /api/v1/lms/courses/{courseId}` | `courseId` | Course |
| `GET /api/v1/lms/courses/slug/{slug}` | `slug` | Course |
| `GET /api/v1/lms/courses/{courseId}/lessons` | `courseId` | `Lesson[]` |
| `POST /api/v1/lms/courses/{courseId}/enroll?userId=` | `courseId`, `userId` | Enrollment |
| `POST /api/v1/lms/courses/{courseId}/enrollments/start?userId=` | `courseId`, `userId` | Enrollment |
| `POST /api/v1/lms/courses/{courseId}/enrollments/drop?userId=` | `courseId`, `userId` | Enrollment |
| `POST /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete?userId=` | `courseId`, `lessonId`, `userId` | Updated enrollment |
| `GET /api/v1/lms/courses/{courseId}/enrollment?userId=` | `courseId`, `userId` | Enrollment |
| `GET /api/v1/lms/enrollments/{userId}` | `userId` | `Enrollment[]` |
| `GET /api/v1/lms/learning-paths` | None | `LearningPath[]` |
| `GET /api/v1/lms/courses/{courseId}/learning-paths` | `courseId` | `LearningPath[]` |

### 5.8 Challenges

Route: `/challenges`

Frontend service: `challengeService`

Purpose:

- Display coding/design/architecture challenges.
- Filter challenges by category.
- Let users run visible JavaScript/TypeScript sample checks before submitting.
- Show retry history for the selected challenge.
- Review starter-code resets before overwriting edited solutions.
- Submit challenge solutions through the service layer.
- Record append-only challenge workflow analytics for explicit challenge decisions.

Inputs:

| Operation | Inputs |
|---|---|
| Get challenges | Optional `isActive` |
| Get challenge by ID | `challengeId` |
| Submit solution | `challengeId`, `userId`, `language`, `code` |
| Get user submissions | `userId`, optional `challengeId` |
| Page filter | `all` plus categories derived from loaded challenge data, falling back to `coding`, `design`, `architecture` before data loads |
| Workspace language | `javascript`, `python`, `java`, `typescript` |
| Workspace code editor | Starter code or user-entered solution |
| Reset review decision | Keep edited code or replace it with starter code |
| Local sample check | JavaScript/TypeScript-style `solve(input)` solution plus visible sample-case input/expected output |
| Challenge workflow analytics | Challenge ID/category/difficulty, language, entry point, bounded sample counts, result counts, attempt count, prior-submission flag, score band, solution length band, and error category |

Page contents:

- Header: "Challenges".
- Category filter buttons based on available challenge categories.
- Challenge cards show:
  - Trophy icon.
  - Difficulty badge.
  - Title.
  - Description.
  - Participant count.
  - Duration/time limit.
  - Solve Now button.
- Challenge workspace modal shows:
  - Challenge difficulty, category, and XP.
  - Prompt.
  - Language selector.
  - Starter-code-backed solution editor.
  - Reviewed Reset button with Keep Code and Reset Code controls when edited code would be overwritten.
  - Sample test cases when available.
  - Local check results for visible sample cases when the user runs a local check.
  - Latest submission status, score, and feedback when available.
  - Retry History panel with prior attempts, status, language, score, timestamp, and feedback preview.
  - Refresh submission history action.
  - Close, Run Local Check, and Submit Solution buttons.

How it works:

1. Page dispatches `fetchChallenges()` when challenge slice status is idle.
2. Page derives category tabs from loaded challenge data, with default fallback tabs before data is available.
3. Page filters challenge list by selected category.
4. Solve Now opens the in-page challenge workspace and pre-fills starter code when provided.
5. Users choose a language and edit the solution manually.
6. Reset clears local sample-check results immediately when code already matches the starter code, or opens an inline review panel when edited solution code would be overwritten.
7. Keep Code closes the reset review without changing the editor; Reset Code replaces the current editor contents with starter code for the selected challenge.
8. Run Local Check validates that code exists, checks that the selected language is supported locally, and requires visible sample input/expected output.
9. Local sample checks run only in a short-lived browser worker for JavaScript/TypeScript-style `solve(input)` solutions.
10. Local check output compares normalized actual output with expected output and displays Matched, Mismatch, or Could not run.
11. Local checks do not save submissions or call backend challenge APIs.
12. Submit Solution validates that the user is signed in and that the solution is not empty.
13. Opening the workspace calls `challengeService.getUserSubmissions(user.id, challengeId)` for signed-in users.
14. Retry History shows the five most recent attempts for the selected challenge.
15. Refresh reloads the same submission-history query without changing solution code.
16. Submission calls `challengeService.submitChallengeSolution(challengeId, userId, language, code)`.
17. Latest submission status and score are shown after a successful submission.
18. The new submission is added to Retry History immediately after a successful submit.
19. Challenge workflow analytics records explicit filter, workspace, language, reset review/cancel/confirm, local-check, retry-history, and submission decisions without storing code, starter code, prompt text, sample values, feedback text, or raw error messages.

Outputs:

```ts
{
  id: string,
  title: string,
  description: string,
  difficulty: string,
  participantCount?: number,
  participantsCount?: number,
  xpReward?: number,
  xp_reward?: number,
  status?: string,
  category?: string,
  starterCode?: string,
  starter_code?: string,
  testCases?: ChallengeTestCase[],
  test_cases?: ChallengeTestCase[]
}
```

Submission output:

```ts
{
  id: string,
  challenge_id: string,
  user_id: string,
  language: string,
  code: string,
  status: string,
  score?: number,
  feedback?: string,
  submitted_at: string
}
```

Submission history output:

```ts
ChallengeSubmission[]
```

Local check output:

```ts
{
  label: string,
  input: string,
  expected: string,
  actual?: string,
  status: 'passed' | 'failed' | 'error',
  detail?: string
}
```

Analytics output:

| Operation | Output |
|---|---|
| Category, workspace, language, reset review/cancel/confirm, retry-history, local-check, and submission decisions | Server or local append-only analytics events for explicit Challenges decisions |

Implementation note:

- Challenge submissions require an authenticated user.
- Local sample checks are browser-only prechecks and do not replace server-side judging.
- Local sample checks support JavaScript/TypeScript-style `solve(input)` solutions only.
- Starter-code reset review is inline and user-confirmed; it does not run checks, save a submission, or change retry history.
- Retry History is read-only except for new submissions added by the user.
- Challenge workflow analytics is append-only and non-blocking; it does not change filters without a click, edit or reset solution code, run checks automatically, refresh retry history automatically, submit solutions, change scores, create notifications, send messages, or mutate challenge data by itself.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/challenges` | None | `Challenge[]` |
| `GET /api/v1/challenges/trending` | None | Trending `Challenge[]` |
| `POST /api/v1/challenges/submit?userId=&challengeId=&language=` | Code body | `Submission` |
| Supabase `challenge_submissions` query | `user_id`, optional `challenge_id` | `ChallengeSubmission[]` ordered by latest submission |

### 5.9 AI Assistant And Career Path

Routes: `/ai`, `/career-path`

Frontend service: `aiService`

Purpose:

- Provide chat-based career help.
- Review and hand off AI recommendations without automatic product changes.
- Audit explicit AI recommendation review decisions without blocking the review flow.
- Analyze resume text.
- Generate match scores.
- Generate career path recommendations.
- Provide platform insights.

Inputs:

| Operation | Inputs |
|---|---|
| Chat response | `message` |
| Resume analysis | Resume plain text |
| Match score | `resumeText`, `jobDescription` |
| Career path | `userId` |
| Insights | None |
| Recommendation review queue | Assistant draft response ID, review action, optional workflow handoff route, previous and next review status |
| Chat clear review | Current chat session ID plus bounded message/review counts |

AI Assistant page contents:

- Header with "Beta" badge.
- Saved-chat status badge showing Browser local, Saved locally, Syncing account, or Account synced persistence plus last saved time on wider screens.
- Clear chat button with inline review before history reset.
- Clear chat review panel with Keep Chat and Clear Chat controls.
- Chat history.
- Initial assistant message.
- Suggestion buttons:
  - Review my resume.
  - Prepare for interviews.
  - Suggest career paths.
  - Recommend skills to learn.
  - Improve my profile.
  - Draft application note.
- Draft prompt preview after selecting a suggestion.
- Send to AI confirmation for draft prompts.
- Text input and send button.
- Assistant responses are marked as draft responses.
- Assistant draft responses show source and control disclosure.
- Assistant draft responses can be saved or dismissed as account-synced review records with local fallback.
- AI Review Queue with:
  - Draft, saved, and dismissed counts.
  - Save all and Dismiss all actions for pending recommendations.
  - Per-recommendation Save, Dismiss, and Open workflow actions.
  - Workflow labels for resume, career path, learning, jobs/applications, profile, candidate review, or general AI guidance.
  - Profile recommendations open `/profile` with a draft handoff when structured fields are present.
  - Resume recommendations open `/resume` with a draft handoff when structured fields are present.
  - Jobs/application recommendations open `/jobs` with an application draft handoff when structured fields are present.
  - Learning recommendations open `/lms` with a catalog-search handoff when structured fields are present.
- Typing indicator while waiting.

Career Path page contents:

- Header with Generated Guidance or Needs data badge.
- Retryable unavailable/incomplete-data state when career-path generation fails or returns no usable path.
- Career path cards showing:
  - Recommended path title.
  - Review-first advisory badge.
  - Estimated timeline.
  - Required skills.
  - Milestones.
  - Explore Path button linking to LMS.

How it works:

1. `/ai` loads saved chat history from browser local storage using the current user ID, or a guest key when signed out.
2. If no saved chat exists, the page starts with the initial assistant message.
3. Chat messages are saved back to local storage after changes; the header status shows whether history is browser-local, saved locally after account sync failure, syncing to the account, or account-synced.
4. Suggestion buttons create a visible draft prompt and pre-fill the input.
5. Draft prompts are only sent after the user clicks Send to AI or sends from the input.
6. Clear opens an inline chat-clear review when conversation history exists.
7. Keep Chat closes the review without changing local or account chat history.
8. Clear Chat starts a fresh local conversation, clears the draft prompt/input, and best-effort deletes the previous account AI session when signed in.
9. Sending a message calls Supabase Edge Function `chat-assistant`.
10. Response is appended as an assistant draft response.
11. Assistant draft responses include source detail and a control note that no profile, resume, application, or settings data has changed.
12. The AI Review Queue collects non-welcome assistant responses, removes duplicates, places draft recommendations first, and classifies each recommendation into a likely workflow handoff.
13. Save or Dismiss updates local chat history metadata and attempts to sync review status to `automation_suggestions` when available.
14. Save or Dismiss also appends an `automation_suggestion_audit_events` record with previous status, next status, session context, source label, and bulk-review metadata when available; audit storage failures use a bounded local fallback.
15. Save all and Dismiss all update pending recommendation review states only.
16. Open workflow navigates to the relevant route; it does not apply the recommendation.
17. For Profile handoffs, the AI page passes recommendation text and source metadata to `/profile`; the Profile page may prefill an editable Headline, Location, and Bio draft if structured fields are present.
18. For Resume handoffs, the AI page passes recommendation text and source metadata to `/resume`; the Resume Builder may prefill selectable Headline, Phone, Location, Website, and Summary draft fields if structured fields are present.
19. For Jobs/Application handoffs, the AI page passes recommendation text and source metadata to `/jobs`; the Jobs page may hold a pending Resume URL/Cover Letter draft until the user chooses a job and explicitly applies it in the Review Application modal.
20. For Learning handoffs, the AI page passes recommendation text and source metadata to `/lms`; the LMS page may show Course Search, Skill, Course, Certification, or Learning Goal catalog-search suggestions that the user can explicitly apply or dismiss.
21. Destination apply/save/dismiss/cancel decisions for AI Profile, Resume, Application, and Learning handoffs emit `workflow_prefill_used` or `workflow_prefill_rejected` product analytics and automation audit events with local fallback.
22. Chat-clear review/cancel/confirm decisions, recommendation generation, save/dismiss decisions, service failure states, workflow handoff opens, and destination prefill decisions emit product analytics events with local fallback.
23. AI responses do not automatically modify profile, resume, jobs, applications, learning records, candidates, settings, messages, or notifications.
24. `/career-path` calls Supabase Edge Function `generate-career-path`.
25. Career Path normalizes the returned path, timeline, required skills, and optional milestones before rendering.
26. If generation fails or returns no path title, Career Path shows an explicit unavailable/incomplete state with Retry instead of a hard-coded default recommendation.
27. Career Path does not show a fabricated match percentage; generated guidance is labeled as review-first before users open LMS.
28. `analyzeResume` tries Supabase RPC `analyze_resume`; if it fails, it extracts common skills client-side and estimates years from text.

Outputs:

| Operation | Output |
|---|---|
| Chat | `{ message: string }` |
| Chat clear review | Fresh local AI chat after explicit confirmation; no destination workflow mutation |
| Recommendation review queue | Draft/saved/dismissed counts, reviewed recommendation state, append-only audit event, optional workflow handoff |
| Profile draft handoff | Editable profile form patch plus current/proposed field review; no profile update until explicit save |
| Resume draft handoff | Selectable resume editor patch plus current/proposed field review; no profile-backed resume update until explicit save |
| Application draft handoff | Pending Jobs application draft plus current/proposed field review; no application submission until explicit submit |
| Learning search handoff | Pending LMS catalog-search suggestions plus explicit Apply Search/Dismiss controls; no enrollment or progress mutation |
| Destination prefill decision audit | Append-only `workflow_prefill_used` or `workflow_prefill_rejected` analytics and automation audit event; no product mutation |
| Resume analysis | Skills, experience years, and fallback marker |
| Match score | Edge function response |
| Career path | Recommended path, timeline, required skills, optional milestones, or retryable unavailable state |
| Insights | `{ insight: string }` |

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/ai/analyze-resume` | Resume text body | Analysis string |
| `POST /api/v1/ai/match-job?resumeText=&jobDescription=` | Query params | Match result string |
| `POST /api/v1/ai/save-results?userId=&targetType=&targetId=&score=` | Result JSON body | `AnalysisResult` |
| `GET /api/v1/ai/results/{userId}` | `userId` | `AnalysisResult[]` |
| `POST /api/v1/ai/chat` | `{ prompt: string }` | `{ message: string }` |
| `GET /api/v1/ai/career-path/{userId}` | `userId` | Career path map |
| `GET /api/v1/ai/insights` | None | `{ insight: string }` |

Implementation note:

- Frontend `getChatResponse` sends `{ message }` to Supabase Edge Function, while Spring controller expects `{ prompt }` for `/api/v1/ai/chat`.
- AI recommendation review uses `automation_suggestions` when available and keeps a local chat-state fallback; review and handoff controls never apply product changes automatically.
- AI recommendation review audit uses `automation_suggestion_audit_events` when available and keeps a bounded local fallback; audit failures never block Save, Dismiss, Save all, or Dismiss all.
- AI chat-clear review restores only a fresh local chat session after explicit confirmation; it does not change profile, resume, applications, learning progress, settings, saved review decisions, messages, notifications, or destination workflow data automatically.
- AI review queue and chat-clear analytics use `product_analytics_events` when available and keep a bounded local fallback; analytics failures never block recommendation review, chat clearing, or workflow navigation. Chat-clear analytics stores bounded message/review counts and pending-prompt state, not message content, prompts, generated responses, recommendation text, resume text, job descriptions, or raw errors.

### 5.10 Networking

Route: `/networking`

Frontend service: `networkingService`

Purpose:

- Suggest professionals to connect with.
- Use backend graph-ranked suggestions when available, with Supabase profile hydration and client-ranked fallback.
- Explain warmer paths with aggregate mutual-connection counts when available.
- Send connection requests.
- Add optional request notes.
- Hide and restore irrelevant suggestions with account sync when available.
- Preview profile context inline before opening the full profile route.
- Add selectable-timing notification-backed sent-request follow-up reminders with local fallback.
- Backfill valid local reminder fallbacks into account notifications when sync is available.
- Promote due synced follow-up reminders through a dry-run-by-default scheduler and Kubernetes CronJob.
- Manage incoming, sent, and accepted connections.
- Support feeds and accepted connections through service methods.
- Record append-only networking workflow analytics for explicit suggestion, tab, preview, connection request, reminder, and suggestion-preference decisions.

Inputs:

| Operation | Inputs |
|---|---|
| Suggestions | `userId`, backend suggestion limit, profile hydration IDs, fallback profile signals |
| Send connection request | `recipientId`, `senderId`, optional `message` |
| Accept request | `connectionId` |
| Reject request | `connectionId` |
| Get connection requests | `userId` |
| Connections | `userId` |
| Feed | `userId` |
| Page search | Name or current role text |
| Request note | Optional message per suggested profile |
| Suggestion reason display | Suggested profile mutual-connection count, role, location, headline, and skills when available |
| Hidden suggestion preference | Suggested user ID, current user ID, local storage key, optional account preference row |
| Profile preview | Suggested/request/connection profile, recommendation reasons, skills, mutual counts, full-profile route |
| Follow-up reminder | Sent connection request ID, recipient ID/name, selected timing, due timestamp, current user ID, account notification metadata, local fallback storage key, local-to-account backfill status, scheduler delivery timestamp when due |
| Networking workflow analytics context | Explicit networking actions, bounded counts, bands, sync statuses, and error categories |

Page contents:

- Header: "Network".
- Search people input.
- Tabs:
  - Discover.
  - Incoming.
  - Sent.
  - Connections.
- Profile cards show:
  - Initials avatar.
  - Full name.
  - Current role.
  - Location.
  - Headline when available.
  - Why suggested context from backend graph reasons when available, otherwise mutual counts and available profile fields.
  - Mutual connection count when available.
  - Profile preview button.
  - Hide suggestion button.
  - Optional note input.
  - Connect button.
  - Request Sent state after connection request.
- Incoming request cards show:
  - Requester profile summary.
  - Optional requester message.
  - Received time.
  - Profile, Accept, and Decline actions.
- Sent request cards show:
  - Recipient profile summary.
  - Optional sent message.
  - Sent time.
  - Reminder timing selector.
  - Reminder state and due date when set.
  - Sent-tab reminder sync status when reminders exist.
  - Profile, Remind Me, and Withdraw actions.
- Connection cards show:
  - Connected profile summary.
- Profile preview action.
- Profile preview modal shows:
  - Profile summary.
  - Fit and mutual-connection context.
  - Location.
  - Recommendation reasons.
  - Shared skills or available skills.
  - Close and Full Profile actions.

How it works:

1. Page dispatches `fetchSuggestions(user.id)`.
2. Suggestions exclude existing connections and the current user.
3. Page loads pending incoming/sent requests with `networkingService.getConnectionRequests(user.id)`.
4. Page loads accepted connections with `networkingService.getConnections(user.id)`.
5. Page filters each tab client-side.
6. Connect button inserts a `PENDING` row in `connections`, including the optional note when provided.
7. Sent request state updates immediately after send and also reloads from backend state.
8. Accept calls `networkingService.acceptConnectionRequest(connectionId)` and moves the request to Connections.
9. Decline and Withdraw call `networkingService.rejectConnectionRequest(connectionId)` and remove the request from the relevant list.
10. Profile actions open an inline read-only profile preview modal.
11. Full Profile in the preview opens `/profile/{userId}` for deeper explicit review.
12. Suggestion ranking combines available profile signals with aggregate mutual-connection counts when the database RPC is available.
13. Mutual connection counts are returned as totals only; the UI does not expose the underlying shared connection identities.
14. Hidden suggestion IDs load from local storage first, then merge account-scoped `networking_suggestion_preferences` when available.
15. Hide suggestion removes the profile from Discover immediately and attempts account sync in the background.
16. Show hidden restores local visibility immediately and clears account-scoped dismissals when available.
17. The timing selector lets the user choose Tomorrow, In 3 days, or In 1 week before setting a reminder.
18. Remind Me stores or clears a sent-request reminder in browser local storage under a user-scoped key and syncs an unread account notification with the selected due timestamp when available.
19. Local reminder state normalizes legacy array storage and object storage with selected timing.
20. When sent requests load, valid local reminders with due timestamps are backfilled into account notifications through the existing networking reminder upsert path.
21. Malformed or legacy reminders without due timestamps remain local and are not promoted into urgent unscheduled notifications.
22. The Sent tab explains whether reminders are synced, syncing, stored locally, or waiting for notification sync.
23. Clearing Remind Me or withdrawing a request marks the matching reminder notification read when available.
24. If notification sync is unavailable, the local reminder remains visible with its due date so the user does not lose the follow-up cue.
25. `npm run run:networking-reminders -- --commit` can be scheduled by an operator/worker with Supabase service credentials to promote due unread networking reminders.
26. The reminder runner is dry-run by default, ignores read/future/invalid/already-delivered reminders, updates the existing notification row, and never sends a message or connection request automatically.
27. Networking workflow analytics records suggestions, tab selection, preview/full-profile handoff, connect/accept/decline/withdraw, reminder set/clear/sync/backfill, and suggestion hide/restore/sync outcomes.
28. Networking workflow analytics stores only bounded metadata: entry point, tab, request direction/status, visible/hidden suggestion counts, incoming/sent/connection/pending counts, search length band, request-note presence and length band, recommendation-score band, mutual-connection band, reason/shared-skill/profile-skill counts, reminder delay, sync status, and error category.
29. Names, profile text, request notes, skill names, locations, exact reminder timestamps, recommendation reasons, and raw error messages are not recorded.

Outputs:

```ts
{
  id: string,
  userId?: string,
  fullName?: string,
  firstName?: string,
  lastName?: string,
  headline?: string,
  currentRole?: string,
  location?: string,
  avatarUrl?: string,
  skills?: string[],
  mutualConnections?: number,
  isConnected?: boolean,
  recommendationScore?: number,
  recommendationReasons?: string[],
  sharedSkills?: string[],
  sharedCompanies?: string[]
}
```

Connection output:

```ts
{
  id: string,
  requesterId: string,
  receiverId: string,
  recipientId?: string,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED',
  message?: string,
  requester?: PublicProfile,
  recipient?: PublicProfile,
  createdAt: string,
  updatedAt?: string
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/networking/connect` | `{ requesterId, recipientId }` | `Connection` |
| `POST /api/v1/networking/connections/accept/{id}` | `id` | Empty success |
| `GET /api/v1/networking/connections/{userId}` | `userId` | Accepted `Connection[]` |
| `POST /api/v1/networking/posts` | `Post` body | Created post |
| `GET /api/v1/networking/feed` | None | Global `Post[]` |
| `POST /api/v1/networking/posts/like/{postId}` | `postId` | Updated post |

### 5.11 Messaging And Chat

Route: `/messaging`

Frontend service: `messagingService`

Purpose:

- Show a bounded latest page of user conversations.
- Show participant names and avatars for visible conversation rows when profile data is available.
- Show incoming unread badges for visible conversations.
- Let users explicitly load older conversation threads.
- Load the latest bounded message page for the active conversation.
- Let users explicitly load older message history.
- Suggest safe reply drafts from the latest visible incoming message.
- Send direct messages.
- Send reviewed public attachment links or explicitly uploaded file-service attachments with optional captions and clear hidden attachment drafts when the field is hidden.
- Listen for inserted messages in real time.

Inputs:

| Operation | Inputs |
|---|---|
| Get conversations | `userId`; default bounded page |
| Paginate conversations | `userId`, `limit`, `offset`, optional `cursor` |
| Get messages | `conversationId`, `userId`; default bounded page |
| Paginate active-thread messages | `conversationId`, `userId`, `limit`, `offset`, optional `cursor` |
| Send message | `conversationId`, `senderId`, `content`, optional `messageType`, optional `attachmentUrl` |
| Attach reviewed link | Public `http` or `https` URL, optional caption |
| Upload reviewed file attachment | Local file up to 10 MB, optional caption after upload |
| Mark read | `messageId` |
| Mark visible incoming read | `conversationId`, `userId` |
| Create conversation | `participantIds`, `createdBy`, optional `isGroup` |
| Page search | Participant full name |
| Page input | Message text |
| Suggested reply draft | Latest visible message list and current user ID |
| Messaging workflow analytics | Conversation ID, message type, suggestion ID, text/attachment presence, attachment source, bounded file type/size category, unread count, visible/loaded counts, error category |

Page contents:

- Header: "Messages".
- Conversation list with:
  - Search box.
  - Loaded/total conversation count when available.
  - Participant initials from enriched profile names when available.
  - Online indicator.
  - Last message preview.
  - Incoming unread badge when a conversation has unread messages from other users.
  - Realtime preview, activity time, and unread badge updates for visible conversations.
  - Last activity time.
  - Load more conversations action when older threads are available.
  - Retry state when conversations cannot load.
- Mobile conversation picker:
  - Conversation list is visible first on small screens.
  - Selecting a conversation switches to chat.
  - Chat header includes a back button to return to conversations.
- Chat panel with:
  - Participant header.
  - Conversation context with participant status, loaded/total message context, and last activity time.
  - Visible incoming unread count and explicit mark-read action when unread incoming messages are visible.
  - Phone, video, and more action buttons marked unavailable when provider flows are not configured.
  - Load older messages action when more history is available.
  - Retry state when message history cannot load.
  - Message bubbles in a polite live-update log region.
  - Attachment previews with image rendering when the link appears to be an image.
  - Message timestamps with full timestamp on hover.
  - Outgoing message delivery labels for sending, sent, delivered, read, and failed states.
  - Retry action for failed local sends.
  - Suggested reply drafts when the latest visible message is incoming and the composer is empty.
  - Explicit attachment panel with URL validation, file upload, upload status, server-side size/folder/blocked-extension guardrails, removable draft state, hidden-draft clearing, labeled text composer, and accessible send button.
- Empty state when no conversation is selected.

How it works:

1. Page dispatches `fetchConversations(user.id)` when status is idle.
2. Conversation fetches are backed by `messagingService.getConversationsPage`.
3. `getConversationsPage` queries `conversation_participants`, embeds `conversations!inner`, orders by conversation `updated_at` and `id`, filters out left conversations, limits each preview to the latest message, and applies `limit`/`offset` for the first page or cursor filtering for older pages.
4. The service fetches unread incoming-message counts for only the visible conversation IDs and maps `unreadCount` onto each row.
5. The service fetches profiles for non-current participant IDs in the visible page and maps direct-chat names/avatars plus deterministic group labels.
6. If `hasMoreConversations` is true, the page shows an explicit Load more conversations action.
7. Loading older threads dispatches `loadMoreConversations`, requests the next cursor page when available, and appends unique conversation rows through the entity adapter.
8. Selecting a conversation dispatches `setActiveConversation`.
9. On mobile, selecting a conversation hides the picker and opens the chat panel.
10. Active conversation triggers `fetchMessages`, backed by `messagingService.getMessagesPage`.
11. Page subscribes to Supabase `postgres_changes` inserts on `messages` for loaded visible conversation IDs using one bounded channel with per-conversation filters.
12. Realtime inserts dispatch `messageReceived` with the mapped message and current user ID.
13. The messaging slice appends new active-thread messages, refreshes visible conversation preview/activity timestamps, increments visible conversation unread badges only for new incoming unread messages, avoids appending non-active conversation messages to the active thread, and ignores duplicate realtime events for unread counting.
14. The messaging slice preserves conversation creation/update timestamps, unread counts, and participant profile context for UI display.
15. The first message fetch requests the latest bounded page in descending order, then maps it into chronological display order.
16. If `hasOlderMessages` is true, the page shows an explicit Load older messages action.
17. Conversation cursor pages filter older embedded conversations and use `limit + 1` lookahead.
18. The messaging slice preserves the known conversation total when cursor pages return `total: null`.
19. Loading older history dispatches `loadOlderMessages`, requests the next cursor page when available, and prepends unique messages by ID.
20. Message cursor pages order by `created_at` and `id`, filter older rows, and use `limit + 1` lookahead.
21. The messaging slice preserves the known message total when cursor pages return `total: null`.
22. If visible incoming unread messages exist, the chat header shows an explicit unread button.
23. Marking visible messages read dispatches `markConversationMessagesRead`, persists `read_at` and `READ` status for incoming unread messages, updates the local thread, clears the active conversation badge, and records the participant read marker when available.
24. If history loading fails, the chat panel shows a retry action.
25. The page merges persisted and local optimistic messages, then sorts visible messages by timestamp.
26. If the latest visible message is incoming and the composer is empty, a local helper suggests up to three reply drafts.
27. Selecting a suggested reply inserts editable text into the composer and does not send anything.
28. Users can expose an attachment panel, paste a public `http` or `https` URL, or explicitly upload a file up to 10 MB through file service, then review validation/upload feedback and remove the draft before sending.
29. Submitting the composer creates a UI-only optimistic message with `localStatus: 'sending'`, inferred `messageType`, optional `attachmentUrl`, and a generated fallback caption when no caption is typed.
30. Sending dispatches `sendMessage` through the messaging slice.
31. Successful sends remove the optimistic row after the persisted message reaches Redux.
32. Failed sends keep the local row, mark it `localStatus: 'failed'`, show a failed label, and expose Retry.
33. Retry resubmits the same message content and attachment metadata through the same send path.
34. Service inserts into `messages` and updates `conversations.updated_at`.
35. Hiding the attachment field through the paperclip control clears the attachment draft so a hidden link cannot be sent accidentally.
36. Messaging workflow analytics records explicit conversation selection, load/retry, mark-read, suggested-reply, link attachment, file upload, send, failure, and retry decisions.
37. Messaging workflow analytics stores only IDs, counts, type flags, attachment source, bounded file type/size categories, suggestion IDs, and error categories; it does not store message text, attachment URLs, or file names.

Outputs:

```ts
{
  id: string,
  conversationId?: string,
  senderId: string,
  content: string,
  timestamp: string | Date,
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO',
  attachmentUrl?: string,
  status?: 'SENT' | 'DELIVERED' | 'READ',
  readAt?: string
}
```

UI-only optimistic messages can also carry:

```ts
{
  localStatus?: 'sending' | 'failed',
  attachmentUrl?: string,
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO'
}
```

This local status is not persisted to the backend.

Messaging workflow analytics output:

| Operation | Output |
|---|---|
| Conversation selection | Append-only task-start event with conversation ID and unread/loaded counts |
| Conversation/message loading | Append-only task-completed or task-failed event with loaded counts and error category |
| Suggested reply insert | Append-only prefill-used event with suggestion ID only |
| Attachment open/clear/validation/upload | Append-only task-start, task-completed, prefill-rejected, or task-failed event without attachment URL or file name |
| Send/retry/read | Append-only task-completed, task-failed, or error-recovery event with type/count metadata only |

Paginated conversation output:

```ts
type Conversation = {
  id: string,
  participant?: Participant,
  participants?: string[],
  isGroup?: boolean,
  lastMessage?: Message,
  unreadCount?: number,
  createdAt?: string,
  updatedAt?: string
}

{
  conversations: Conversation[],
  total: number | null,
  limit?: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

Paginated active-thread message output:

```ts
{
  messages: Message[],
  total: number | null,
  limit?: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/messages/send?senderId=&receiverId=` | Content body | `Message` |
| `GET /api/v1/messages/conversation?user1=&user2=` | User IDs | `Message[]` |
| `GET /api/v1/messages/unread/count/{userId}` | `userId` | `{ count }` |
| `PATCH /api/v1/messages/read?user1=&user2=` | User IDs | Empty success |
| WebSocket `/chat.sendMessage` | `ChatMessage` payload | Broadcast to topic/user queue |
| `GET /api/v1/chat/channel/{channelId}` | `channelId` | Channel messages |
| `GET /api/v1/chat/user/{userId}` | `userId` | User conversations |
| `POST /api/v1/files/upload` | Multipart file and folder `messages` | Uploaded file URL |
| `GET /api/v1/files/download/{folder}/{fileName}` | Uploaded file path parts | File resource |

Implementation notes:

- `MessagingPage` subscribes once for loaded visible conversations and maps Realtime rows into the frontend message shape with current-user context.
- Messaging workflow analytics is append-only and non-blocking; it does not select conversations, insert text, edit messages, upload files, send messages, retry messages, mark messages read, open attachments, create notifications, or contact other users by itself.
- `messagingService.getConversations` remains available as an array-returning compatibility path and now delegates to the first bounded conversation page.
- `messagingService.getConversationsPage` enriches visible direct conversations with the other participant's profile name and avatar when available.
- `messagingService.getMessages` remains available as an array-returning compatibility path and now delegates to the first bounded page.
- Conversation-list and active-thread Load older actions use `nextCursor` when available; realtime inserts and optimistic local sends do not change older-page cursors.
- Conversation unread badges count incoming unread messages for the visible page and are cleared only after explicit read marking succeeds.
- Realtime inserts refresh visible conversation preview/activity timestamps and increment unread badges only for new incoming messages from other users.
- Attachment helper utilities validate `http`/`https` links, enforce the 10 MB file-upload limit, infer image/video/file message types, derive bounded file type/size categories for analytics, generate fallback captions, and hide generated captions when rendering attachment-only messages.
- File service enforces non-empty uploads, safe folder names, a 10 MB server-side limit, blocked executable/script-like extensions, safe download path parts, and matching upload/download URL behavior.
- Reply-suggestion helper utilities inspect only the visible local thread, generate editable drafts, and never call send/read/update services.
- Visible incoming read marking is explicit and does not run automatically when a conversation opens.
- Message bubble alignment compares `msg.senderId` with the current authenticated user ID.
- Mobile users can select conversations and return to the conversation list without leaving `/messaging`.

### 5.12 Billing And Payments

Route: `/billing`

Frontend service: `paymentService`

Purpose:

- Show subscription plans.
- Show current payment method.
- Show transaction history.
- Create checkout sessions and subscriptions through service methods.
- Open the secure billing provider for plan changes and payment-method updates.
- Record append-only billing workflow analytics for explicit load, retry, review, checkout, portal, popup-blocked, submitted, and failure outcomes.

Inputs:

| Operation | Inputs |
|---|---|
| Get plans | None |
| Get payment history | `userId` |
| Get active subscription | `userId` |
| Create checkout session | `userId`, `amount`, `currency`, `description` |
| Get payment status | `sessionId` |
| Subscribe to plan | `userId`, `planId` |
| Create billing portal session | `userId` |
| Review plan action | Selected `PaymentPlan` |
| Update payment method action | Current `userId` |
| Billing workflow analytics | Plan ID/current plan ID, interval, currency, price band, feature count, plan count, transaction count, subscription/payment-method presence, provider action, redirect/popup outcome, entry point, and error category |

Page contents:

- Billing provider unavailable banner with Retry when billing data cannot be loaded.
- Plan cards with:
  - Name.
  - Price.
  - Feature list.
  - Current Plan or Review Plan button.
- Plan catalog unavailable empty state with Retry Plans when no plans are available.
- Plan review modal:
  - Selected plan.
  - Price and billing interval.
  - Current plan.
  - Feature list.
  - Confirmation copy that checkout is completed through the billing provider.
  - Cancel and Continue buttons.
- Payment method card:
  - Current method when available, or no-method state.
  - Billing provider status copy.
  - Update button.
- Payment method update modal:
  - Confirmation copy that card changes happen through the secure billing provider.
  - Cancel and Open Billing Portal buttons.
- Transaction history:
  - Description.
  - Date.
  - Status.
  - Amount.

How it works:

1. Page loads plans, user payment history, and active subscription in parallel.
2. `paymentService.getPlans` reads active `subscription_plans`.
3. `paymentService.getHistory` reads user rows from `payments`.
4. `paymentService.getUserSubscription` reads the current active subscription.
5. Current Plan state is derived from active subscription plan ID/name.
6. If billing data cannot be loaded, the page shows an unavailable banner, clears stale billing data, and offers Retry.
7. If no plans are available after loading, the page shows a plan-catalog empty state with Retry Plans.
8. Review Plan opens a confirmation modal instead of immediately changing the subscription.
9. Confirming a plan calls `paymentService.subscribeToPlan(userId, planId)` when a plan ID exists.
10. If a backend plan has no plan ID, the page falls back to `paymentService.createSession(userId, price, currency, description)`.
11. Returned `url`, `checkoutUrl`, or `paymentUrl` values open in a new tab for secure checkout.
12. Update payment method opens a confirmation modal.
13. Confirming payment method update calls `paymentService.createBillingPortalSession(userId)` and opens the returned provider URL.
14. No plan or payment-method change is applied on the frontend without explicit confirmation.
15. Billing workflow analytics records load, retry, plan-review, checkout, payment-method-review, portal, popup-blocked, submitted, and failure outcomes without storing card details, invoice descriptions, provider URLs, exact amounts, plan names, feature text, or raw error messages.

Outputs:

```ts
{
  id: string,
  user_id: string,
  amount: number,
  currency: string,
  description: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
  payment_method?: string,
  stripe_session_id?: string,
  created_at: string,
  updated_at: string
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/payments/checkout` | `userId`, `amount`, `currency`, `description` | Checkout session map |
| `GET /api/v1/payments/status/{sessionId}` | `sessionId` | Payment status map |
| `GET /api/v1/payments/history/{userId}` | `userId` | Transaction history |
| `GET /api/v1/payments/plans` | None | Plan list |

Frontend-only/Edge Function support:

| Function | Input | Output |
|---|---|---|
| `create-subscription` | `{ userId, planId }` | Subscription or checkout response |
| `create-checkout-session` | `{ userId, amount, currency, description, paymentId }` | Checkout session URL |
| `create-billing-portal-session` | `{ userId }` | Billing portal URL |

Analytics output:

| Operation | Output |
|---|---|
| Billing load, retry, plan review/cancel, checkout, payment-method review/cancel, and billing portal decisions | Server or local append-only analytics events for explicit Billing decisions |

Implementation note:

- Billing workflow analytics is append-only and non-blocking; it does not change plans, open provider URLs without a click, retry automatically, edit payment methods, create subscriptions, change invoices, send messages, create notifications, or mutate billing data by itself.

### 5.13 Settings

Route: `/settings`

Frontend service: `settingsService`

Purpose:

- Let users manage account preferences, notification preferences, notification delivery controls, security options, and a billing summary that links to the dedicated Billing page, with append-only workflow analytics for explicit settings decisions.

Inputs:

| Section | Inputs |
|---|---|
| Profile Settings | First name, last name, email, headline, location |
| Notifications | Email notifications, push notifications, job alerts, message notifications, digest frequency, quiet-hours toggle, quiet-hours start/end |
| Security | Password reset confirmation, 2FA unavailable state, delete account confirmation |
| Billing | Current user ID |
| Settings workflow analytics | Tab ID, preference key, enabled flag, digest frequency, quiet-hours enabled flag, field count, enabled channel count, billing-record presence, invoice count, error category |

Page contents:

- Left settings nav:
  - Profile Settings.
  - Notifications.
  - Security.
  - Billing & Plans.
- Profile tab:
  - First name.
  - Last name.
  - Disabled email.
  - Professional headline.
  - Location.
  - Save Changes.
- Notifications tab:
  - Email notifications switch with accessible name, description, and checked state.
  - Push notifications switch with accessible name, description, and checked state.
  - Job alerts switch with accessible name, description, and checked state.
  - Message notifications switch with accessible name, description, and checked state.
  - Digest frequency select.
  - Quiet hours switch.
  - Quiet hours start and end time fields.
  - Current delivery preference summary.
  - Save Preferences.
- Security tab:
  - Update Password button that opens a reset-email confirmation modal.
  - 2FA row marked Coming soon with disabled Unavailable action.
  - Deactivate Account button that opens a typed-confirmation modal.
- Billing tab:
  - Current plan.
  - Subscription status.
  - Next billing date.
  - Invoice count.
  - Payment method summary.
  - Open Billing action to `/billing`.

How it works:

1. Page loads notification settings and billing data in parallel.
2. If no notification row exists, the page creates editable local defaults for the current user; existing rows are merged with current defaults for newly added delivery controls.
3. Profile save calls `settingsService.updateProfileSettings`.
4. Notification switches and delivery controls update local notification preference state.
5. Notification save calls `settingsService.updateNotifications`, which updates an existing row or inserts a new row with digest frequency and quiet-hour fields.
6. Password reset confirmation calls `authService.resetPassword(user.email)`.
7. 2FA is explicitly disabled until an authentication provider flow exists.
8. Account deactivation requires typing `DEACTIVATE`, with trimmed/case-insensitive matching, then calls `settingsService.deleteAccount(user.id)`.
9. Billing tab uses `settingsService.getBilling` for a read-only summary.
10. Account deactivation service performs soft delete on `profiles`.
11. Saving notification preferences does not mark notifications read, navigate, send messages, or trigger digest delivery immediately.
12. `npm run discover:saved-search-digests -- --commit` can be scheduled by an operator/worker with Supabase service credentials to find saved-search digest candidates and queue due digest items.
13. `npm run run:notification-digests -- --commit` can be scheduled by an operator/worker with Supabase service credentials to group due queued digest items into `JOB_ALERT` notifications; without `--commit`, both runners are dry-run only.
14. Kubernetes CronJobs deploy the saved-search discovery, digest delivery, and networking reminder delivery commands with `concurrencyPolicy: Forbid`, bounded job history, retry backoff, and resource limits.
15. `npm run run:networking-reminders -- --commit` promotes only due unread networking follow-up reminders; without `--commit`, it reports the due/future/invalid counts without writing.
16. Billing plan changes, payment method changes, and invoice details are handled by the dedicated `/billing` page.
17. Settings workflow analytics records explicit tab, profile-save, notification-preference, notification-save, billing-handoff, password-reset review/cancel/outcomes, and account-deactivation review/cancel/outcomes.
18. Settings workflow analytics stores only IDs, counts, preference keys, booleans, digest frequency, billing presence, invoice count, and error category; it does not store profile field values, email addresses, quiet-hour exact times, or deactivation confirmation text.

Outputs:

| Operation | Output |
|---|---|
| Get notifications | `NotificationSettings` or local editable defaults when no row exists |
| Update notifications | Updated notification settings row, including digest frequency and quiet-hour preferences |
| Saved-search alert delivery | Account notification row, local fallback notification, or queued digest item plus deferred reviewed-baseline update when daily/weekly digest preferences suppress immediate delivery |
| Get billing | `BillingInfo` |
| Open Billing | Navigation to `/billing` |
| Update profile settings | Updated profile row |
| Password reset | Supabase reset email request |
| 2FA | Explicit disabled/unavailable state |
| Deactivate account | Empty success from the profile soft-deactivation service |
| Settings workflow analytics | Server or local append-only analytics events for explicit settings decisions |

Implementation notes:

- Settings workflow analytics is append-only and non-blocking; it does not edit profile values, change notification settings, send reset emails, deactivate accounts, open Billing, change plans, mark notifications read, send messages, create notifications, or mutate settings by itself.

### 5.14 Companies

No dedicated company page is currently routed. Recruiter-owned company setup and profile completion are exposed inside `/jobs/post`.

Frontend service: `companyService`

Purpose:

- Manage company records for recruiters and job postings.
- Let recruiters complete core company profile fields while preparing a job draft.

Inputs:

| Operation | Inputs |
|---|---|
| List companies | None |
| Get company | `id` |
| Get company by user | `userId` |
| Register company | Name, description, website, location, logo URL, industry, employee count, owner user ID |
| Update company | Company ID and changed fields from the Post Job company profile panel |
| Verify company | Company ID |
| Search companies | Keyword |

Outputs:

```ts
{
  id: string,
  name: string,
  description?: string,
  website?: string,
  location?: string,
  logoUrl?: string,
  industry?: string,
  employeeCount: number,
  ownerUserId?: string,
  verified: boolean,
  verifiedAt?: string,
  createdAt?: string
}
```

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/companies` | `Company` body, recruiter role | Created company |
| `GET /api/v1/companies` | None | `Company[]` |
| `GET /api/v1/companies/search?q=` | Search query | `Company[]` |
| `GET /api/v1/companies/user/{userId}` | `userId` | Company |
| `GET /api/v1/companies/{id}` | `id` | Company |
| `PUT /api/v1/companies/{id}` | Company body | Updated company |
| `POST /api/v1/companies/{id}/verify` | `id`, admin role | Verified company |

### 5.15 Gamification

Frontend service: `gamificationService`

Purpose:

- Track XP, levels, badges, achievements, and leaderboard position.
- Feed dashboard XP/level and profile achievements.

Inputs:

| Operation | Inputs |
|---|---|
| Leaderboard | Optional `limit` |
| User badges | `userId` |
| User XP | `userId` |
| User level | `userId` |
| XP transactions | `userId`, optional `limit` |

Outputs:

| Operation | Output |
|---|---|
| Leaderboard | Rank, user ID, full name, total XP, level, badge count |
| Badges | Badge name, description, icon, earned date |
| XP | Number |
| Level | `Math.floor(xp / 100) + 1` |
| XP transactions | Raw transaction rows |

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/gamification/stats/{userId}` | `userId` | User stats map |
| `GET /api/v1/gamification/leaderboard` | None | `LeaderboardEntry[]` |
| `GET /api/v1/gamification/achievements/{userId}` | `userId` | `Achievement[]` |
| `POST /api/v1/gamification/achievements` | `Achievement` body | Created achievement |

### 5.16 Notifications

Frontend integration:

- Notification bell is visible in the global header.
- Header loads a bounded latest account notification page, can explicitly load older notifications with cursor tokens, can mark individual notifications read by opening them, can mark all unread notifications read when urgent unread rows exist, and keeps future scheduled reminders visible without urgent unread emphasis.
- Notification preferences and delivery controls are managed in Settings.

Header notification inputs:

| Operation | Inputs |
|---|---|
| Get notifications | `userId`, default bounded page |
| Paginate notifications | `userId`, `limit`, optional `offset`, optional `cursor` |
| Mark notification read | `userId`, `notificationId` |
| Mark all read | `userId` |

Header notification behavior:

1. Header loads the latest notification page through `notificationService.getNotificationsPage`.
2. First-page Supabase reads use `select('*', { count: 'exact' })`, `user_id`, `created_at DESC`, `id DESC`, and `limit`/`offset` range metadata.
3. Older Supabase pages use an opaque `cursor`, `created_at`/`id` older-than filtering, and `limit + 1` lookahead.
4. API fallback receives `limit` plus either `offset` or `cursor` params when Supabase is unavailable.
5. Local fallback notifications are still available and can be paginated by offset or cursor when both server paths fail.
6. The popover shows loaded/total context when notifications are available.
7. Load more notifications is explicit and does not mark items read.
8. Opening a notification still explicitly marks that one row read and navigates to its action URL or `/jobs`.
9. Future scheduled networking reminders show a Scheduled label and due timestamp while remaining visible in the list.
10. Future scheduled networking reminders do not trigger the urgent unread bell indicator until their due timestamp arrives.
11. The networking reminder scheduler can refresh a due reminder's notification row so it resurfaces in the bounded notification feed.
12. Mark read explicitly marks all unread notifications read; the control is not shown when only future scheduled reminders are unread.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/notifications/user/{userId}` | `userId` | `Notification[]` |
| `GET /api/v1/notifications/user/{userId}/unread-count` | `userId` | Number |
| `PATCH /api/v1/notifications/{id}/read` | Notification ID | Empty success |
| `PATCH /api/v1/notifications/user/{userId}/read-all` | `userId` | Empty success |

Settings inputs:

- Email notifications.
- Push notifications.
- SMS notifications in data type.
- Job alerts.
- Message notifications.
- Newsletter in data type.
- Digest frequency.
- Quiet-hours enabled.
- Quiet-hours start and end times.

Outputs:

- Notification settings row with channel toggles, digest frequency, and quiet-hour preferences.
- Notification digest item row for saved-search updates deferred by daily or weekly digest settings.
- Promoted notification row for due synced networking follow-up reminders.
- Paginated notification list/unread count from backend service or local fallback.

Paginated notification output:

```ts
{
  notifications: NotificationRecord[],
  total: number | null,
  limit: number,
  offset: number,
  hasNext: boolean,
  nextCursor: string | null
}
```

### 5.17 Search

Backend-only service currently visible.

Purpose:

- Search indexed jobs and profiles.
- Search profiles by skills.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/search/jobs?query=` | Query string and pageable params | Page of `JobDocument` |
| `GET /api/v1/search/profiles?query=` | Query string and pageable params | Page of `ProfileDocument` |
| `GET /api/v1/search/profiles/skills?skills=` | Skill list and pageable params | Page of `ProfileDocument` |

### 5.18 Files

Backend-only service currently visible.

Purpose:

- Upload and delete files, such as resumes or profile assets.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/files/upload` | Multipart `file`, optional `folder` default `general` | Uploaded file URL/string |
| `GET /api/v1/files/download/{folder}/{fileName}` | Uploaded file path parts | File resource |
| `DELETE /api/v1/files?url=` | File URL | Empty success |

File upload guardrails:

1. Empty files are rejected.
2. Files over 10 MB are rejected server-side.
3. Upload folder names must be single safe path parts.
4. Executable/script-like extensions such as `.exe`, `.js`, `.sh`, `.html`, `.jar`, and `.svg` are rejected before storage.
5. Declared content type must match an allowed file extension.
6. File bytes are checked for expected signatures for PDF, PNG, JPEG, WebP, DOCX, and plain text before storage.
7. Active HTML/script-like content is rejected even when uploaded as a text file.
8. A malware scanner hook runs before storage; the default local scanner rejects the EICAR test signature.
9. Download folder and filename path parts are validated before resolving local storage.
10. Provider-backed object storage hardening, external antivirus scanning, retention policies, and CDN configuration remain production follow-ups.

### 5.19 Video Interviews

Backend-only service currently visible.

Purpose:

- Schedule and manage video interview sessions.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/v1/video/schedule` | `jobId`, `applicantId`, `interviewerId`, `scheduledAt` | Session map |
| `GET /api/v1/video/session/{sessionId}` | `sessionId` | Session map |
| `POST /api/v1/video/session/{sessionId}/start` | `sessionId` | Updated session map |
| `POST /api/v1/video/session/{sessionId}/end` | `sessionId`, optional `recordingUrl` | Updated session map |
| `GET /api/v1/video/session/{sessionId}/token` | `sessionId` | Room token map |

### 5.20 Feature Flags

Backend: API Gateway feature flag admin controller.

Purpose:

- Inspect, enable, disable, and reset feature flags.
- List core/enabled/categorized feature sets.

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/admin/feature-flags` | None | Map of flag names to status |
| `GET /api/v1/admin/feature-flags/{flagName}` | Flag name | Flag status |
| `POST /api/v1/admin/feature-flags/{flagName}/enable` | Flag name | Success message |
| `POST /api/v1/admin/feature-flags/{flagName}/disable` | Flag name | Success message |
| `POST /api/v1/admin/feature-flags/{flagName}/reset` | Flag name | Success message |
| `POST /api/v1/admin/feature-flags/reset-all` | None | Success message |
| `GET /api/v1/admin/feature-flags/enabled` | None | Enabled features |
| `GET /api/v1/admin/feature-flags/core` | None | Core features |
| `GET /api/v1/admin/feature-flags/categories` | None | Feature groups |

## 6. Chrome Extension Companion

Location: `chrome-extension-project`

Manifest:

- Manifest V3.
- Name: TalentSphere Companion.
- Permissions: `storage`, `activeTab`, `scripting`.
- Popup: `src/popup/index.html`.
- Options page: `src/options/index.html`.
- Content scripts match LinkedIn, Indeed, and Glassdoor.

### 6.1 Popup Dashboard

Main file: `chrome-extension-project/src/popup/PopupApp.tsx`

Tabs:

- Dashboard.
- Tracker.
- Diagnostics.

Dashboard contents:

| Section | What it shows |
|---|---|
| Tracked Jobs | Number of locally tracked job records |
| Status cards | Interviewing and Offered counts |
| Resume Match Preview | Launches options page |
| Page Scan Draft | Sends `analyze_page` message to background worker and prepares an editable local job draft |

Inputs:

- Local tracked jobs from Chrome storage key `ts_jobs`.
- Optional scanned draft from Chrome storage key `ts_job_draft`.
- User click on Launch.
- User click on Scan Webpage.

Outputs:

- Dashboard counters labeled as local tracker records.
- Logs added to diagnostics.
- Background response summary such as "Drafted {role} at {company} for review."
- Tracker tab opens with a reviewable scanned draft when page analysis succeeds.
- Web-preview messaging reports the unavailable Chrome extension runtime instead of fabricating a scanned draft.
- Usage Diagnostics-gated local operational analytics events for popup open, tab changes, options handoffs, scan requests, scan outcomes, and bounded tracker context.

### 6.2 Popup Job Tracker

Inputs:

| Input | Meaning |
|---|---|
| Company | Company name |
| Role | Job title/role |
| Status | `Applied`, `Interviewing`, `Offered`, or `Rejected` |
| Posting URL | Optional scanned or user-edited source URL |
| Notes | Optional scanned excerpt or user-entered tracker note |
| Search text | Filters company and role |

Outputs:

- Scanned draft displayed from Chrome storage key `ts_job_draft`.
- Draft company, role, status, URL, and notes can be edited before saving.
- Draft discard opens an inline review before clearing only the scanned draft.
- First-run tracker state starts empty instead of seeding sample company records.
- New job saved into Chrome storage key `ts_jobs`.
- Existing job status updated.
- Job removal opens an inline review before deleting the local tracker row.
- Saved scanned jobs retain optional source URL/source metadata in `ts_jobs`.
- Empty tracker and empty filtered-search states provide direct Add Job or Clear Filter recovery actions.
- Diagnostic logs for add/update/delete actions using tracked-job wording.
- Usage Diagnostics-gated local operational analytics for manual add-form reveal, posting-link opens, job add/delete-review/delete/status changes, scanned-draft validation, save, and reviewed-discard decisions.

### 6.3 Popup Diagnostics

Contents:

- Live log terminal.
- Local Analytics panel.
- Clear Console button with inline review.
- Export Local Analytics button.
- Clear Local Analytics button with inline review.
- Log Test Event button.
- Ping Worker button.

Inputs:

- Logs from popup state.
- User diagnostic button clicks.

Outputs:

- Logs printed with `info`, `success`, or `warn` type.
- Local analytics count, latest event label, and latest event time.
- Sanitized local analytics JSON download.
- Inline console-log clear-review panel with Keep Logs and Clear Logs controls.
- Inline clear-review panel with Keep and Clear Queue controls.
- Cleared visible console logs only after explicit confirmation.
- Cleared local analytics queue only after explicit confirmation.
- Log Test Event adds a local diagnostics line and, when Store Local Usage Diagnostics is enabled, records a bounded local test-event analytic without syncing data.
- Ping Worker sends `{ action: 'ping' }` and receives `{ status: 'active', timestamp }`.
- Usage Diagnostics-gated local operational analytics for console clear-review/cancel/clear, analytics export, clear-review opened/cancelled, local diagnostic test-event logging, ping request, ping success, and ping failure outcomes; confirmed analytics clear intentionally leaves the queue empty.

### 6.4 Options Page

Main file: `chrome-extension-project/src/options/OptionsApp.tsx`

Tabs:

- Resume Match Preview.
- Interview Planner.
- Local Settings.

Resume Match Preview inputs:

- Target job description.
- Resume text.

Resume Match Preview outputs:

- Local keyword-overlap coverage score derived from the pasted job description and resume text.
- Keyword coverage stays pending while local comparison is running instead of showing a placeholder score.
- Alignment report with matched keywords, missing job keywords, and local editing suggestions.
- Usage Diagnostics-gated local operational analytics for validation, match request, and completion outcomes using input length bands, keyword-count bands, and score bands without storing pasted text or extracted keywords.

Interview Planner inputs:

- Topic.
- Review category: `Behavioral`, `Technical`, or `System Design`.

Interview Planner outputs:

- First-run prep list starts empty instead of seeding sample cards.
- New prep card stored in Chrome storage key `ts_prep`.
- Empty prep-card state explains that users can add a browser-local card from the form.
- Completion toggle.
- Reviewed Clear All flow for prep cards.
- Settings handoff that clears only prep cards after reviewed confirmation.
- Usage Diagnostics-gated local operational analytics for prep-card validation, add, toggle, clear-review, clear-cancel, confirmed clear, and Settings reset-review/reset-cancel/reset-confirm paths.

Local Settings inputs:

- Cloud synchronization local-only notice and Review Plan action.
- Local interview reminder preference toggle.
- Local usage diagnostics storage toggle.
- Reviewed prep-card clear action.

Local Settings outputs:

- Values saved in Chrome storage:
  - `ts_settings_notif`
  - `ts_settings_analytics`
- Usage Diagnostics-gated local operational analytics saved only in this browser at `ts_extension_operational_analytics`.
- Interview Reminder Preference stores a local setting for future reminder workflows; the extension does not schedule browser notifications yet.
- Cloud sync Review Plan records bounded interest/context without enabling sync or moving records.
- Reviewed Clear Prep Cards action records prep-card reset review/cancel/confirm outcomes and clears prep data only after explicit confirmation.

### 6.5 Background And Content Scripts

Background service worker:

| Message action | Output |
|---|---|
| `ping` | `{ status: 'active', timestamp }` |
| `analyze_page` | `{ status: 'success', summary, draft }`, where `draft` is saved to `ts_job_draft` |
| unknown | `{ status: 'unhandled' }` |

Content script:

| Message action | Output |
|---|---|
| `scrape_job_metadata` | `{ status, role, company, url, source, description, rawTitle, confidence }` |

Scanned draft shape:

```ts
{
  id: string,
  company: string,
  role: string,
  status: 'Applied' | 'Interviewing' | 'Offered' | 'Rejected',
  url: string,
  source: string,
  notes: string,
  scannedAt: string,
  confidence: 'high' | 'medium' | 'low',
  rawTitle?: string
}
```

User-control rule:

- Page scans never create tracked jobs automatically.
- The user must review the draft and click Save to Tracker before `ts_jobs` changes.
- Discard first opens review, then clears only `ts_job_draft` after explicit confirmation.
- Extension cloud sync is shown as local-only until authenticated sync exists; reviewing the sync plan does not import, export, or move records.
- Interview Reminder Preference is local-only until browser notifications and scheduling exist; toggling it does not schedule reminders or request notification permission.
- Extension operational analytics is local, append-only, and gated by Store Local Usage Diagnostics; it records bounded counts, statuses, confidence values, source categories, field-presence flags, input length bands, keyword-count bands, score bands, setting names, diagnostic action categories, message actions, response statuses, and error categories in this browser only, not raw URLs, company names, role names, resume text, job descriptions, extracted keywords, notes, prep topics, page titles, page content, generated reports, or raw errors.
- Diagnostics console clearing is reviewed and user-initiated, then empties only the visible popup log stream. Diagnostics export is user-initiated and downloads only the sanitized local analytics queue; Diagnostics analytics clear is reviewed and user-initiated, then empties `ts_extension_operational_analytics` without creating a replacement clear event after confirmation.

## 7. Backend Service Summary

| Service | Responsibility | Key data/output |
|---|---|---|
| `auth-service` | Compatibility-only local credentials, JWT/JWKS support, health | Local credential register/login are disabled by default because Supabase Auth is primary |
| `user-service` | User profile/admin stats | UserEntity, admin stats |
| `profile-service` | Career profile, skills, experience, education | ProfileResponse, Skill, Experience, Education |
| `job-service` | Jobs, recommendations, saved searches, hidden Explore preferences, job-post templates, and job-post draft history | Job, saved-search records, hidden Explore preference records, job-post template records, job-post draft version records |
| `application-service` | Job applications and recruiter summary | JobApplication |
| `company-service` | Companies and verification | Company |
| `lms-service` | Courses, lessons, enrollments, paths | Course, Lesson, Enrollment |
| `challenge-service` | Challenges and submissions | Challenge, Submission |
| `gamification-service` | XP, leaderboard, achievements | Stats, Achievement, LeaderboardEntry |
| `messaging-service` | Direct messages | Message |
| `chat-service` | WebSocket/channel chat | ChatMessage |
| `networking-service` | Connections and feed posts | Connection, Post |
| `ai-service` | Resume analysis, match, chat, career path | AnalysisResult, maps/strings |
| `notification-service` | Notifications and read state | Notification |
| `payment-service` | Checkout, plans, payment history | Transaction, plan maps |
| `search-service` | Job/profile search | Pages of documents |
| `file-service` | Upload/delete files | URL string or empty success |
| `video-service` | Video interview sessions | Session/token maps |
| `api-gateway` | Feature flags and gateway concerns | Feature flag status |

## 8. Important Implementation Notes

These notes are based on current code and should be considered when testing or planning fixes:

- Development mode automatically grants the mock user user/admin/recruiter roles, so local behavior can expose pages a production user may not see.
- Recruiter registration, recruiter route access, and recruiter dashboard data now use `ROLE_RECRUITER` and `jobs.posted_by` consistently.
- Candidate review uses the database application status enum, including `OFFER` for successful outcomes.
- Candidate "View" opens `/profile/{userId}` and non-owner profiles are read-only.
- Messaging uses one bounded Realtime channel for loaded visible conversations, aligns outgoing messages by current user ID, and supports explicit file-service upload/download attachments before the user sends the message.
- 2FA remains explicitly disabled until an authentication provider flow is configured.
- LMS catalog browsing is intentionally resilient: API Gateway first, Supabase second, empty paginated data as final fallback; user enrollment/progress reads and mutations surface explicit errors when persistence is unavailable.
- Admin dashboard uses a timeout fallback to mock stats if Supabase is slow or unreachable.
- API contract drift can be refreshed with `npm run report:api-contracts`; the generated report currently tracks frontend API client coverage, controller route coverage, gateway prefixes, legacy security matchers, and frontend Supabase table access. After the API alignment pass it reports 0 unmatched frontend API calls, 0 controller routes without gateway prefixes, and 0 legacy `/api/*` security matcher paths.
- Product analytics is append-only and local-fallback tolerant; it should be used to observe task and automation behavior, not to trigger workflow mutations.
- Admin Product Analytics Insights summarizes recent `product_analytics_events` for admins using aggregate counts, rates, top areas, friction signals, and prioritized improvement opportunities; the panel is read-only and does not expose raw event metadata, user IDs, object IDs, issue text, or raw errors.
- Scheduled automation rollout status is visible in Admin through a frontend-safe catalog and can consume an optional provider run-history status API; Kubernetes pod health, secret health, image digest verification, and a backend-owned provider contract are still pending.
- Dashboard/Admin operational analytics is append-only and local-fallback tolerant; it records bounded counts, IDs, routes, event categories, service IDs, link types, and scheduled automation status/run-history counts, not raw issue text, service URLs, scheduler status URLs, runbook URLs, provider output, log queries, audit actor IDs, audit IP addresses, raw error messages, or user emails.
- LMS workflow analytics is append-only and local-fallback tolerant; it records bounded IDs, counts, filter state, progress bands, suggestion counts/labels/indexes, and error categories, not raw search terms, course titles, lesson titles, provider names, recommendation text, suggestion text, or raw error messages.
- Challenge workflow analytics is append-only and local-fallback tolerant; it records bounded IDs, counts, language, reset review/cancel/confirm decisions, score bands, attempt context, solution length bands, and error categories, not solution code, starter code, challenge prompt/title/description, sample input, expected output, actual output, feedback text, or raw error messages.
- Billing workflow analytics is append-only and local-fallback tolerant; it records bounded plan IDs, interval, currency, price bands, counts, provider action, redirect/popup outcomes, and error categories, not card details, invoice descriptions, provider URLs, exact payment amounts, plan names, feature text, or raw error messages.
- Profile workflow analytics is append-only and local-fallback tolerant; it records bounded scope, tab IDs, row types/modes, field keys/counts, completion bands, suggestion source categories, AI field counts, and error categories, not headline, bio, location, full name, skill names, company names, institution names, descriptions, row labels, or raw error messages.
- Resume workflow analytics is append-only and local-fallback tolerant; it records bounded import/export/save metadata, field keys/counts, skill counts, source type, export method/status, persistence target, file type category, input length band, and error category, not resume text, contact details, file names, skill names, export artifacts, generated HTML, or raw error messages.
- Networking workflow analytics is append-only and local-fallback tolerant; it records bounded suggestion/request/reminder/preference metadata, counts, score bands, mutual-connection bands, request-note presence/length bands, reminder delay, sync status, and error category, not names, profile text, request notes, skill names, locations, exact reminder timestamps, recommendation reasons, or raw error messages.
- Messaging workflow analytics is append-only and local-fallback tolerant; it records bounded conversation IDs, message type, attachment source, file type/size category, counts, suggestion IDs, and error category, not message text, attachment URLs, uploaded file URLs, file names, or raw error messages.
- Extension operational analytics is append-only, local, and Store Local Usage Diagnostics-gated; it records popup/options/tracker/page-scan/resume-match-preview/planner/settings/background decisions with bounded metadata in this browser only, not raw URLs, company names, role names, resume text, job descriptions, extracted keywords, notes, prep topics, page content, generated reports, or raw errors. The popup Diagnostics tab shows local analytics count/latest event and gives users reviewed console-log clearing plus explicit analytics export and reviewed analytics clear controls.
- Recruiter publish readiness is database-enforced before `jobs.status` can become `PUBLISHED`; frontend checklist and recovery actions mirror that policy.

## 9. Quick Input/Output Index

| Feature | Main inputs | Main outputs |
|---|---|---|
| Auth | Email, password, full name, role, onboarding analytics action context | User/session/JWT and append-only onboarding analytics events |
| Dashboard | User ID, user roles, dashboard operational analytics context | Stats, jobs, challenges, applications, append-only dashboard operational analytics |
| Jobs | Search filters, saved search state, local fit explanation state, account/local hidden Explore job state, current-view hidden-preference refinement state, account/local job-post template state, job-post draft history, company context state, company setup/completion state, company setup onboarding analytics context, job-post review state, duplicate warning state, recruiter postings, edit-draft state, edit-change summary, publish checklist state, publish readiness policy state, publish review/outcome analytics context, job data, application data, application draft history | Job list, saved searches, local advisory fit reasons, reversible account-synced/local-fallback hidden Explore preferences, explicit current-view preference refinements, account-synced/local-fallback editable job-post templates, restorable recruiter draft versions, reviewed draft jobs, edited existing drafts, normalized draft-change summaries, company-attached drafts, inline company setup/completion output, append-only onboarding analytics, duplicate warnings, recruiter posting workspace, published status updates, database-enforced publish readiness, append-only publish analytics, applications, restorable application draft versions |
| Candidates | Recruiter ID, search text, review focus mode, analytics focus action, review queue action, detail queue navigation action, unsaved review draft state, private-review reset-review state, advisory sort mode, selected application IDs, bulk Interview/Offer/Rejection confirmation, status action, optional interview-plan draft, scorecard ratings/evidence, private note text, candidate workflow analytics context | Candidate list, focused candidate rows, advisory signal labels/scores/factors, current-page scorecard analytics, analytics-driven focus changes, first candidate details handoff, previous/next details handoff, unsaved review guard, reviewed private-review reset, target-specific selection summary, interview note draft, synced/local saved scorecards, saved notes, updated single or selected application status, append-only candidate workflow analytics |
| Profile | User ID, headline/location/bio, skills/experience/education, local/AI suggestion state, profile workflow analytics context | Profile view, updated rows, prefilled drafts, append-only profile workflow analytics |
| Resume | Profile data, resume fields, import text/file state, detected field/skill selections, export activity records, resume workflow analytics context | Resume preview, saved supported fields, reviewed import drafts, saved detected skills, print-ready PDF export, local HTML export, account/local export activity, append-only resume workflow analytics |
| LMS | Course filters, pagination params, course ID, user ID, LMS workflow analytics context | Paginated course list, enrollment, progress, append-only LMS workflow analytics |
| Challenges | Category filter, challenge ID, language, solution code, reset-review state, retry-history action, local-check action, challenge workflow analytics context | Challenge list, local sample-check results, retry history, submissions, append-only challenge workflow analytics |
| AI | Message, resume text, job description, user ID, recommendation review action, previous/next review status, workflow handoff action, destination prefill decision, chat-clear review state | Chat response, reviewed fresh-chat reset, review queue state, append-only review/prefill audit event, workflow handoff, analysis, career path, insight |
| Product analytics | Event area, event name, source, optional user ID/object/metadata, extension Usage Diagnostics context | Server or local append-only analytics event, including preference update, onboarding, dashboard/admin operations, LMS, Challenges, Billing, Profile, Resume, Networking, application, candidate, messaging, settings workflow, extension operational events, and Admin aggregate insight summaries |
| Networking | User ID, backend suggestion candidate IDs, recipient ID, search text, optional request note, explicit profile preview action, explicit reminder action and timing, local reminder fallback state, networking workflow analytics context | API-first graph-ranked suggestions with fallback profile hydration, profile preview, request state, accepted connections, follow-up reminder notification with due metadata, local-to-account reminder backfill, scheduler promotion metadata, and append-only networking workflow analytics |
| Messaging | Conversation ID, message text, latest visible messages, optional suggested draft, optional reviewed attachment URL or uploaded file, messaging workflow analytics context | Conversation list with unread badges, suggested reply draft, message stream, local send/upload feedback, sent message/link/file attachment, append-only messaging workflow analytics |
| Billing | User ID, plan ID, checkout data, billing portal action, billing workflow analytics context | Plans, payments, subscription info, provider handoffs, append-only billing workflow analytics |
| Settings | Profile fields, notification toggles, digest frequency, quiet hours, password reset confirmation/cancellation, account deactivation confirmation, settings workflow analytics context | Updated settings, notification delivery preferences, billing summary, reset email request, account deactivation, append-only settings workflow analytics |
| Admin | Admin role, service health/status link action, scheduled automation refresh action, audit pagination action, product analytics insight refresh action, admin operational analytics context | Platform stats, scheduled automation rollout/run-history status, service health with investigation links/log queries, product analytics aggregate counts/rates/friction signals, paginated audit events, append-only admin operational analytics |
| Chrome extension | Local jobs, tracked-job delete review state, diagnostics console clear review state, resume text, job description, prep cards, prep-card clear review state, cloud-sync plan review state, local interview reminder preference, toggles, Usage Diagnostics setting, local operational analytics queue | Local tracker dashboard, reviewed tracked-job removal, diagnostics, reviewed console-log clearing, local keyword-overlap match preview, reviewed prep-card clearing, explicit local-only sync status, local reminder preference without scheduled notifications, bounded local operational analytics queue, and reviewed analytics export/clear controls |
