# TalentSphere Feature And Dashboard Documentation

Last reviewed from code: 2026-06-25

This file is the single detailed reference for TalentSphere features, dashboards, user inputs, outputs, workflows, data sources, backend endpoints, role access, and visible UI contents.

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

The frontend route map is defined in `apps/frontend/src/App.tsx`.

| Route | Page | Access | Main purpose |
|---|---|---|---|
| `/` | `LandingPage` | Public | Marketing/public entry page and platform stats |
| `/login` | `LoginPage` | Public, redirects logged-in users | User sign-in |
| `/register` | `RegisterPage` | Public, redirects logged-in users | User registration |
| `/dashboard` | `DashboardPage` | Authenticated | Main dashboard; switches between talent and recruiter view |
| `/networking` | `NetworkingPage` | Authenticated | People suggestions and connection requests |
| `/lms` | `LMSPage` | Authenticated | Course catalog, course progress, enrollment |
| `/challenges` | `ChallengesPage` | Authenticated | Challenge listing and category filtering |
| `/jobs` | `JobsPage` | Authenticated | Job discovery, applications, recruiter job-post modal |
| `/jobs/post` | `PostJobPage` | `ROLE_RECRUITER` | Full job posting form |
| `/ai` | `AIAssistant` | Authenticated | Chat-style AI career assistant |
| `/career-path` | `AICareerPath` | Authenticated | AI-generated career path recommendations |
| `/messaging` | `MessagingPage` | Authenticated | Direct conversations and real-time message stream |
| `/billing` | `BillingPage` | Authenticated | Subscription plans, payment method, payment history |
| `/settings` | `SettingsPage` | Authenticated | Profile, notification, security, and billing settings |
| `/profile` | `ProfilePage` | Authenticated | Profile overview, edit modal, experience, education, achievements |
| `/profile/:userId` | `ProfilePage` | Authenticated | Read-only profile view for another user, such as candidate review |
| `/resume` | `ResumeBuilder` | Authenticated | Resume editor and preview |
| `/admin` | `AdminDashboard` | `ROLE_ADMIN` | System stats and service health |
| `/candidates` | `CandidatesPage` | `ROLE_RECRUITER` | Candidate/application review pipeline |
| `*` | `NotFound` | Any | 404 page |

## 3. Global Layout And Dashboard Shell

The authenticated app shell is built by `ResponsiveLayout`, `Sidebar`, and `Header`.

### What the shell contains

- Left sidebar on desktop.
- Slide-over sidebar on mobile.
- Bottom mobile navigation showing the first five allowed main nav items.
- Top sticky header with:
  - Mobile menu toggle.
  - Platform search input with role-aware destination results and keyboard shortcut focus.
  - Notification bell with actionable reminder popover.
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

Shell workflows:

1. The header search input filters role-visible destinations by label, description, and keywords.
2. Pressing Enter opens the first matching destination.
3. Clicking a search result navigates to that feature and closes search.
4. `Cmd/Ctrl+K` focuses the header search input.
5. The notification bell opens role-aware reminders that navigate only after the user selects one.
6. Sidebar, slide-over, desktop collapsed nav, and mobile bottom nav mark the active route with `aria-current="page"`.

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

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| `user.id` | Auth state | Yes | Identifies the dashboard owner |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Welcome message and "Browse Jobs" action | User name, dashboard description, job navigation button |
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
6. Messages count is derived from unread messages in user conversations.
7. Jobs and challenges are displayed as dashboard widgets.
8. Stat cards are buttons that route to the related workflow.
9. Empty job and challenge sections include Browse Jobs or Explore Challenges actions.

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
  challenges: any[]
}
```

Empty/error states:

- Loading skeleton is shown while data loads.
- Toast error: "Failed to load dashboard data. Please try again."
- Empty sections show "No recent jobs found" or "No active challenges" with direct next-action buttons.

### 4.2 Recruiter Dashboard

Location: `/dashboard`

Rendered when the logged-in user has `ROLE_RECRUITER`.

Data source:

- `recruiterService.getStats(userId)`
- `recruiterService.getRecentApplications(userId)`
- Tables: `jobs`, `job_applications`, `profiles`

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| `user.id` | Auth state | Yes | Recruiter ID |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Recruiter Console title and "Post a Job" action | Navigation to `/jobs/post` |
| Stat cards | Active Jobs, Total Applicants, New Today, Offers | Numeric recruiting funnel snapshot plus direct navigation to jobs or candidates |
| Recent Applications | Latest 5 candidate applications | Candidate name, job title, status badge |
| Quick Actions | Create job, review applications, message candidates | Buttons to `/jobs/post`, `/candidates`, `/messaging` |

Workflow:

1. Page checks `user.roles` for `ROLE_RECRUITER`.
2. Page requests recruiter stats and recent applications.
3. Stats count jobs owned by recruiter and applications against those jobs.
4. Recent application rows display candidate profile and job title when available.
5. Recruiter can navigate into candidate review or job posting.
6. Recruiter stat cards are buttons that route to jobs or candidate review.
7. Empty recent applications includes a Post a Job action.

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

### 4.3 Admin Dashboard

Location: `/admin`

Access: `ROLE_ADMIN`

Data source:

- `adminService.getDashboardStats()`
- Tables: `profiles`, `job_applications`
- Live metadata when Supabase counts load successfully
- Explicit fallback metadata and mock service rows after a 2 second timeout or Supabase failure

Inputs:

| Input | Source | Required | Meaning |
|---|---|---:|---|
| Admin role | Auth state | Yes | Allows route access |
| Refresh click | Admin user | No | Reloads admin stats and service health |

Dashboard contents:

| Section | What it shows | Output to user |
|---|---|---|
| Header | Admin Console title, source badge, last refresh, Refresh button | System overview with data provenance |
| Fallback warning | Visible only when fallback/mock data is displayed | Degraded-state explanation and latency |
| Stat cards | Total Users, System Load, Services Online, Security Alerts, source badge | Current platform health snapshot with live/mock label |
| Service Health table | Service Name, Status, Uptime, Version, Source, Detail | Operational table of backend dependencies with source and checked time |

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
    checkedAt?: string
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
6. `authService.register` calls `supabase.auth.signUp`.
7. Login calls `supabase.auth.signInWithPassword`.
8. `App.tsx` listens to Supabase auth state and stores user/session in Redux.
9. Logout calls `supabase.auth.signOut`, clears Redux auth state, and routes to `/login`.

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
| `POST /api/v1/auth/register` | `User` request body | Registered `User` wrapped in `ApiResponse` |
| `POST /api/v1/auth/login` | `User` body with email/password | JWT token string wrapped in `ApiResponse` |
| `GET /api/v1/auth/.well-known/jwks.json` | None | JWK set |
| `GET /api/v1/auth/health` | None | `UP` |

Implementation note:

- Registration uses the same `ROLE_RECRUITER` role expected by recruiter-only routes.
- Registration role descriptions are UI guidance only; they do not change role mapping or grant extra permissions.
- Registration role query preselection is only a default selection; the user can still change account type before submitting.

### 5.3 Profile

Routes: `/profile`, `/profile/:userId`

Frontend service: `profileService`

Purpose:

- Display a user's professional profile.
- Edit headline, location, and bio.
- Add profile completion items for skills, work experience, and education.
- Show skills, experience, education, achievements, connections, and application count.

Inputs:

| Input | Source | Used for |
|---|---|---|
| `user.id` | Auth state | Fetch and update profile |
| `headline` | Edit profile modal | Professional headline |
| `location` | Edit profile modal | Public location |
| `bio` | Edit profile modal | About section |
| Skill task | Profile completion modal | Skill name, proficiency, optional years |
| Experience task | Profile completion modal | Title, company, optional location, start/end dates, current role flag, description |
| Education task | Profile completion modal | Institution, degree, field of study, start/end dates, optional GPA |

Page contents:

- Profile header with avatar/initial, name, role badge, headline, location, website, join year.
- Own-profile avatar camera action with explicit unavailable feedback when photo upload is not configured.
- Profile counters: connections, applications, badges.
- Skill badges.
- Tabs:
  - Overview: About text and profile completion.
  - Experience: Work history list.
  - Education: Education history list.
  - Achievements: Badge cards.
- Profile completion card:
  - Shows computed progress from basic info, skills, work experience, and education.
  - Completed tasks show a check state.
  - Missing tasks show direct actions to edit basic info or add skills, work experience, and education.
- Completion task modal:
  - Reuses existing `profileService.addSkill`, `profileService.addExperience`, and `profileService.addEducation`.
  - Updates local profile state after successful save.

How it works:

1. Page calls `profileService.getProfile(user.id)`.
2. Service selects `user_profiles` with linked `profiles`, `skills`, `experiences`, `educations`, `certifications`, `languages`, and `projects`.
3. Edit modal updates `user_profiles` fields.
4. Completion task actions open targeted forms for missing profile sections.
5. Skill, experience, and education forms write to their related Supabase tables.
6. UI updates local state after successful save.
7. Profile photo camera action shows an unavailable toast and does not mutate profile data until an upload flow is configured.

Outputs:

| Operation | Output |
|---|---|
| Get profile | Profile row plus nested related profile data |
| Update profile | Updated `user_profiles` row |
| Add skill | New `skills` row |
| Delete skill | Empty success |
| Add experience | New `experiences` row |
| Add education | New `educations` row |
| Profile photo unavailable action | Warning toast only |

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/profile/{userId}` | `userId` path | `ProfileResponse` |
| `PUT /api/v1/profile/{userId}` | `ProfileUpdateRequest` | Updated `ProfileResponse` |
| `GET /api/v1/profile/{userId}/skills` | `userId` path | `Skill[]` |
| `POST /api/v1/profile/{userId}/skills` | `SkillRequest` | Created `Skill` |
| `DELETE /api/v1/profile/{userId}/skills/{skillId}` | `userId`, `skillId` | Empty success |
| `GET /api/v1/profile/{userId}/experience` | `userId` | `Experience[]` |
| `POST /api/v1/profile/{userId}/experience` | Experience request body | Created `Experience` |
| `DELETE /api/v1/profile/{userId}/experience/{experienceId}` | `userId`, `experienceId` | Empty success |
| `GET /api/v1/profile/{userId}/education` | `userId` | `Education[]` |
| `POST /api/v1/profile/{userId}/education` | Education request body | Created `Education` |

### 5.4 Resume Builder

Route: `/resume`

Purpose:

- Build, edit, preview, save, and export a resume from profile data.

Inputs:

| Input | Source |
|---|---|
| Profile data | `profileService.getProfile(user.id)` |
| Personal information | Editor inputs: full name, email, phone, location, website |
| Summary | Resume summary textarea |
| Experience | Profile experiences |
| Education | Profile educations |
| Skills | Profile skills |

Page contents:

- Header with "Export PDF" and "Save Changes" buttons.
- Tabs:
  - Editor.
  - Preview.
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
- Export action opens a print-ready resume document so the user can save it as PDF from the browser print dialog.
- Preview renders resume-like formatted content from the current editor state and profile rows.

Backend/data support:

- `profileService.saveResume(userId, resume)` updates `user_profiles.summary`.
- `profileService.getResume(userId)` returns summary, experiences, educations, skills, certifications, and languages.

Implementation note:

- Full name and email are displayed as read-only account/profile identity fields.
- Work experience, education, and skills are managed through profile completion/profile services and reflected in the resume preview/export.

### 5.5 Jobs

Routes: `/jobs`, `/jobs/post`

Route query behavior:

- `/jobs?tab=applied` opens the Applied tab.
- Returning to Explore clears the `tab` query parameter.

Frontend services: `jobService`, `applicationService`, `profileService`

Purpose:

- Let talent users browse published jobs and apply.
- Let recruiters post jobs.
- Let users view their submitted applications.

Inputs:

| Operation | Inputs |
|---|---|
| Fetch jobs | Optional `status`, `job_type`, `location`, `search`, `salary_min`, `salary_max`, `limit`, `offset` |
| Search and filter jobs | Search box text, location text, job type, minimum salary, maximum salary |
| Save job search | Current search text and filters, optional user-entered saved search name |
| Apply saved search | Saved search selected by user |
| Delete saved search | Saved search selected by user |
| Build profile application draft | Selected job, current user profile, profile links, skills, latest experience, job requirements |
| Apply | `jobId`, `userId`, optional `resumeUrl`, optional `coverLetter`, explicit submit confirmation |
| Post job modal | `title`, `company`, `location`, `type`, optional `description` |
| Full post job page | `title`, `description`, `location`, `jobType`, `salaryMin`, `salaryMax`, newline-separated `requirements` |
| Update job | `id` plus changed job fields |
| Delete job | `id` |

Jobs page contents:

- Header with role-aware description.
- Recruiters see "Post a Job" action.
- Tabs:
  - Explore: available jobs.
  - Applied: user's submitted applications.
- Search input with applied-tab application search support.
- Explore filters for location, job type, minimum salary, and maximum salary.
- Clear filters button and matching-result count.
- Save Search button when Explore filters are active.
- Saved Searches row with apply and delete controls.
- Job cards show:
  - Company logo or icon.
  - Title.
  - Company name.
  - Location.
  - Job type.
  - Salary range when available.
  - Match score when present.
  - Apply button, or View Application when the user already applied.
- Applied cards show:
  - Application status badge.
  - Details button.
- Application review modal:
  - Job summary.
  - Application draft source/status block.
  - Profile-generated draft loading, profile/manual/error labels, and helper copy.
  - Use Profile Draft action.
  - Clear draft action.
  - Optional resume or profile URL input.
  - Optional editable cover letter input.
  - Explicit submit button.
- Application details modal:
  - Status badge.
  - Applied date.
  - Timeline for Submitted, Reviewed, Interview, and Offer stages.
  - Rejected state when applicable.
  - Submitted resume link and cover letter when available.

How it works:

1. Explore tab uses Redux `useGetJobsQuery(queryParams)`, backed by `jobService.getJobs`.
2. The page reads `tab=applied` from the URL to open the Applied tab directly.
3. Changing tabs updates the URL so dashboard application cards can deep-link to submitted applications.
4. `jobService.getJobs` first queries Supabase `jobs` and joins `companies`.
5. If Supabase fails, it calls API Gateway `GET /api/v1/jobs`.
6. Search, location, type, and salary filters are sent as query params and also applied client-side as a fallback guard.
7. Save Search opens a review modal that stores the current search text and filters in browser local storage under a user-specific saved-search key.
8. Selecting a saved search re-applies its saved search text and filters to Explore.
9. Deleting a saved search removes only that saved-search record.
10. Clicking Apply opens a review modal instead of immediately submitting.
11. While the review modal is open, the page loads the current user's profile through `profileService.getProfile(user.id)`.
12. The application draft builder uses profile name, headline, summary/bio, website or social URL, skills, latest experience, and selected job requirements to populate editable resume/profile URL and cover-letter fields.
13. If the user edits before profile loading finishes, the late profile draft is not applied automatically; the user can still click Use Profile Draft to replace the current draft.
14. Clear removes the local draft only.
15. Submitting the review modal calls `applicationService.submitApplication`.
16. Existing applications are loaded for duplicate awareness; previously applied jobs show View Application.
17. The Applied tab calls `applicationService.getUserApplications(user.id)` and receives normalized `JobApplication` objects with nested `job` data.
18. Details opens an application timeline modal.
19. Recruiter post modal calls `jobService.postJob`.
20. Full post page also calls `jobService.postJob`, then navigates back to `/jobs`.

Outputs:

| Operation | Output |
|---|---|
| Get jobs | `Job[]` |
| Get job by ID | `Job` |
| Recommended jobs | `Job[]` filtered by user skills where possible |
| Post job | Created `Job` |
| Update job | Updated `Job` |
| Delete job | Empty success |
| Save search | `SavedJobSearch` stored in local browser storage |
| Apply saved search | Search text and filters restored in the Jobs Explore tab |
| Delete saved search | Saved search removed from local browser storage |
| Profile application draft | Editable local draft for resume/profile URL and cover letter; no application is submitted |
| Apply | Created `JobApplication`, or mock pending application if insert fails; optional resume and cover-letter values are retained in the UI response |
| User applications | `JobApplication[]` with nested job data |

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

Inputs:

| Operation | Inputs |
|---|---|
| Submit application | `jobId`, `userId`, optional `coverLetter`, optional `resumeUrl` |
| List user applications | `userId` |
| List recruiter applications | `recruiterId`, optional `jobId` |
| Update application status | `applicationId`, `status` |
| Withdraw application | `applicationId` |
| Candidate search | Candidate name or job title |
| Candidate details | Selected candidate/application row |
| Candidate note | Selected application ID and private recruiter note text |

Candidate page contents:

- Header with Refresh and Filter buttons.
- Search input.
- Candidate cards show:
  - Candidate icon.
  - Candidate name.
  - Status badge.
  - Applied job title.
  - Applied date.
  - Email.
  - Resume link if available.
  - Saved note indicator when recruiter notes exist.
  - Details button.
  - Offer button.
  - Reject button.
- Candidate details modal shows:
  - Candidate name, email, job title, applied date, and current status.
  - Application ID, job ID, and last updated date.
  - Resume link and cover letter when submitted.
  - Review guidance.
  - Private recruiter notes textarea.
  - Save Note action.
  - Open Profile, Offer, and Reject actions.

How it works:

1. Candidate page reads recruiter user ID.
2. `recruiterService.getAllApplications(user.id)` finds recruiter jobs and their applications.
3. Page filters candidates by candidate name or job title.
4. Details opens an in-page modal for application review.
5. Recruiter notes are loaded from browser local storage under a recruiter-scoped key.
6. Save Note stores, updates, or clears the selected application's private note locally.
7. Offer/Reject calls `recruiterService.updateApplicationStatus`.
8. The returned status updates local page state and the open detail modal.

Outputs:

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

Implementation note:

- Candidate Details opens in-page and can also open `/profile/{candidate.userId}` in read-only mode for non-owners.

### 5.7 Learning Management System

Route: `/lms`

Frontend service: `lmsService`

Purpose:

- Show a course catalog.
- Let users enroll in courses.
- Display lessons, progress, course metadata, and learning paths.

Inputs:

| Operation | Inputs |
|---|---|
| Get courses | Optional `category`, optional `published` |
| Get course by ID | `courseId` |
| Get course by slug | `slug` |
| Enroll | `courseId`, `userId` |
| Get user enrollments | `userId` |
| Get lesson progress | `enrollmentId`, optional `userId`, optional `courseId` |
| Mark lesson complete | `enrollmentId`, `lessonId`, optional `userId`, optional `courseId` |
| Create course | Course fields, `instructorId` |
| Page search | Course title text |
| Page tab filter | `all`, `in-progress`, `completed` |
| Continue learning selection | Enrollment progress and first incomplete lesson for each active course |
| Recommended next selection | Unstarted courses, active course categories, catalog order |

Page contents:

- Header: "Learning".
- Continue Learning panel for in-progress courses:
  - Course category.
  - Course title.
  - Progress percent and progress bar.
  - Next lesson title.
  - Completed lesson count.
  - Resume action.
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
  - Close button and Enroll Now button when the user is not enrolled.

How it works:

1. Page dispatches `fetchCourses()`.
2. For signed-in users, the page loads enrollments with `lmsService.getUserEnrollments(user.id)`.
3. `lmsService.getCourses()` tries API Gateway first.
4. If the gateway fails, it queries Supabase `courses`, `profiles`, and `lessons`.
5. If both fail, it returns an empty list.
6. Course cards and LMS tabs use enrollment progress when an enrollment exists.
7. Continue Learning derives active courses from enrollment progress between 1 and 99 percent.
8. Continue Learning opens the same course modal directly at the first incomplete lesson.
9. Recommended Next selects unstarted courses, prioritizing categories that match active in-progress courses when available.
10. Opening a course selects the first incomplete lesson, or the first lesson when nothing is started.
11. Mark Complete calls `lmsService.markLessonComplete(enrollmentId, lessonId, userId, courseId)`, enrolling first when needed.
12. After completion, the page updates local enrollment/course state and advances to the next incomplete lesson.

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

Backend support:

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/lms/courses` | Optional category query from frontend | `Course[]` |
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
- Submit challenge solutions through the service layer.

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
  - Reset button.
  - Sample test cases when available.
  - Latest submission status, score, and feedback when available.
  - Retry History panel with prior attempts, status, language, score, timestamp, and feedback preview.
  - Refresh submission history action.
  - Close and Submit Solution buttons.

How it works:

1. Page dispatches `fetchChallenges()` when challenge slice status is idle.
2. Page derives category tabs from loaded challenge data, with default fallback tabs before data is available.
3. Page filters challenge list by selected category.
4. Solve Now opens the in-page challenge workspace and pre-fills starter code when provided.
5. Users choose a language and edit the solution manually.
6. Reset restores starter code for the selected challenge.
7. Submit Solution validates that the user is signed in and that the solution is not empty.
8. Opening the workspace calls `challengeService.getUserSubmissions(user.id, challengeId)` for signed-in users.
9. Retry History shows the five most recent attempts for the selected challenge.
10. Refresh reloads the same submission-history query without changing solution code.
11. Submission calls `challengeService.submitChallengeSolution(challengeId, userId, language, code)`.
12. Latest submission status and score are shown after a successful submission.
13. The new submission is added to Retry History immediately after a successful submit.

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

AI Assistant page contents:

- Header with "Beta" badge.
- Local saved-chat status.
- Clear chat button.
- Chat history.
- Initial assistant message.
- Suggestion buttons:
  - Review my resume.
  - Prepare for interviews.
  - Suggest career paths.
  - Recommend skills to learn.
- Draft prompt preview after selecting a suggestion.
- Send to AI confirmation for draft prompts.
- Text input and send button.
- Assistant responses are marked as draft responses.
- Typing indicator while waiting.

Career Path page contents:

- Header with AI Powered badge.
- Career path cards showing:
  - Recommended path title.
  - Match percentage.
  - Estimated timeline.
  - Required skills.
  - Milestones.
  - Explore Path button linking to LMS.

How it works:

1. `/ai` loads saved chat history from browser local storage using the current user ID, or a guest key when signed out.
2. If no saved chat exists, the page starts with the initial assistant message.
3. Chat messages are saved back to local storage after changes.
4. Suggestion buttons create a visible draft prompt and pre-fill the input.
5. Draft prompts are only sent after the user clicks Send to AI or sends from the input.
6. Clear resets the local conversation for the current browser.
7. Sending a message calls Supabase Edge Function `chat-assistant`.
8. Response is appended as an assistant draft response.
9. AI responses do not automatically modify profile, resume, jobs, or applications.
10. `/career-path` calls Supabase Edge Function `generate-career-path`.
11. Page maps response fields into a visible path card.
12. `analyzeResume` tries Supabase RPC `analyze_resume`; if it fails, it extracts common skills client-side and estimates years from text.

Outputs:

| Operation | Output |
|---|---|
| Chat | `{ message: string }` |
| Resume analysis | Skills, experience years, and fallback marker |
| Match score | Edge function response |
| Career path | Recommended path, timeline, required skills |
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

### 5.10 Networking

Route: `/networking`

Frontend service: `networkingService`

Purpose:

- Suggest professionals to connect with.
- Send connection requests.
- Add optional request notes.
- Manage incoming, sent, and accepted connections.
- Support feeds and accepted connections through service methods.

Inputs:

| Operation | Inputs |
|---|---|
| Suggestions | `userId` |
| Send connection request | `recipientId`, `senderId`, optional `message` |
| Accept request | `connectionId` |
| Reject request | `connectionId` |
| Get connection requests | `userId` |
| Connections | `userId` |
| Feed | `userId` |
| Page search | Name or current role text |
| Request note | Optional message per suggested profile |

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
  - Open Profile button.
  - Optional note input.
  - Connect button.
  - Request Sent state after connection request.
- Incoming request cards show:
  - Requester profile summary.
  - Optional requester message.
  - Profile, Accept, and Decline actions.
- Sent request cards show:
  - Recipient profile summary.
  - Optional sent message.
  - Profile and Withdraw actions.
- Connection cards show:
  - Connected profile summary.
  - Open Profile action.

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
10. Open Profile opens `/profile/{userId}` for explicit profile review.

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
  isConnected?: boolean
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

- Show user conversations.
- Load messages for active conversation.
- Send direct messages.
- Listen for inserted messages in real time.

Inputs:

| Operation | Inputs |
|---|---|
| Get conversations | `userId` |
| Get messages | `conversationId`, `userId` |
| Send message | `conversationId`, `senderId`, `content`, optional `messageType`, optional `attachmentUrl` |
| Mark read | `messageId` |
| Create conversation | `participantIds`, `createdBy`, optional `isGroup` |
| Page search | Participant full name |
| Page input | Message text |

Page contents:

- Header: "Messages".
- Conversation list with:
  - Search box.
  - Participant initials.
  - Online indicator.
  - Last message preview.
- Mobile conversation picker:
  - Conversation list is visible first on small screens.
  - Selecting a conversation switches to chat.
  - Chat header includes a back button to return to conversations.
- Chat panel with:
  - Participant header.
  - Phone, video, and more action buttons marked unavailable when provider flows are not configured.
  - Message bubbles in a polite live-update log region.
  - Outgoing message delivery labels for sending, sent, delivered, read, and failed states.
  - Retry action for failed local sends.
  - Labeled text composer and accessible send button.
- Empty state when no conversation is selected.

How it works:

1. Page dispatches `fetchConversations(user.id)` when status is idle.
2. Selecting a conversation dispatches `setActiveConversation`.
3. On mobile, selecting a conversation hides the picker and opens the chat panel.
4. Active conversation triggers `fetchMessages`.
5. Page subscribes to Supabase `postgres_changes` inserts on `messages` for the active conversation.
6. Submitting the composer creates a UI-only optimistic message with `localStatus: 'sending'`.
7. Sending dispatches `sendMessage` through the messaging slice.
8. Successful sends remove the optimistic row after the persisted message reaches Redux.
9. Failed sends keep the local row, mark it `localStatus: 'failed'`, show a failed label, and expose Retry.
10. Retry resubmits the same message content through the same send path.
11. Service inserts into `messages` and updates `conversations.updated_at`.

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
  localStatus?: 'sending' | 'failed'
}
```

This local status is not persisted to the backend.

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

Implementation notes:

- `MessagingPage` subscribes once per active conversation and maps Realtime rows into the frontend message shape.
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

### 5.13 Settings

Route: `/settings`

Frontend service: `settingsService`

Purpose:

- Let users manage account preferences, notification preferences, security options, and a billing summary that links to the dedicated Billing page.

Inputs:

| Section | Inputs |
|---|---|
| Profile Settings | First name, last name, email, headline, location |
| Notifications | Email notifications, push notifications, job alerts, message notifications |
| Security | Password reset confirmation, 2FA unavailable state, delete account confirmation |
| Billing | Current user ID |

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
  - Save Preferences.
- Security tab:
  - Update Password button that opens a reset-email confirmation modal.
  - 2FA row marked Coming soon with disabled Unavailable action.
  - Delete Account button that opens a typed-confirmation modal.
- Billing tab:
  - Current plan.
  - Subscription status.
  - Next billing date.
  - Invoice count.
  - Payment method summary.
  - Open Billing action to `/billing`.

How it works:

1. Page loads notification settings and billing data in parallel.
2. If no notification row exists, the page creates editable local defaults for the current user.
3. Profile save calls `settingsService.updateProfileSettings`.
4. Notification switches update local notification preference state.
5. Notification save calls `settingsService.updateNotifications`, which updates an existing row or inserts a new row.
6. Password reset confirmation calls `authService.resetPassword(user.email)`.
7. 2FA is explicitly disabled until an authentication provider flow exists.
8. Delete account requires typing `DELETE`, then calls `settingsService.deleteAccount(user.id)`.
9. Billing tab uses `settingsService.getBilling` for a read-only summary.
10. Delete account service performs soft delete on `profiles`.
11. Billing plan changes, payment method changes, and invoice details are handled by the dedicated `/billing` page.

Outputs:

| Operation | Output |
|---|---|
| Get notifications | `NotificationSettings` or local editable defaults when no row exists |
| Update notifications | Updated notification settings row |
| Get billing | `BillingInfo` |
| Open Billing | Navigation to `/billing` |
| Update profile settings | Updated profile row |
| Password reset | Supabase reset email request |
| 2FA | Explicit disabled/unavailable state |
| Delete account | Empty success |

### 5.14 Companies

No dedicated page is currently routed, but jobs and recruiter workflows rely on companies.

Frontend service: `companyService`

Purpose:

- Manage company records for recruiters and job postings.

Inputs:

| Operation | Inputs |
|---|---|
| List companies | None |
| Get company | `id` |
| Get company by user | `userId` |
| Register company | Name, description, website, location, logo URL, industry, employee count, owner user ID |
| Update company | Company ID and changed fields |
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
- Notification preferences are managed in Settings.

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

Outputs:

- Notification settings row.
- Notification list/unread count from backend service.

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
| `DELETE /api/v1/files?url=` | File URL | Empty success |

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
| Total Applications | Number of locally tracked jobs |
| Status cards | Interviewing and Offered counts |
| AI Resume Optimizer | Launches options page |
| Active Tab Analyzer | Sends `analyze_page` message to background worker and prepares an editable job draft |

Inputs:

- Local tracked jobs from Chrome storage key `ts_jobs`.
- Optional scanned draft from Chrome storage key `ts_job_draft`.
- User click on Launch.
- User click on Scan Webpage.

Outputs:

- Dashboard counters.
- Logs added to diagnostics.
- Background response summary such as "Drafted Software Engineer at Google for review."
- Tracker tab opens with a reviewable scanned draft when page analysis succeeds.

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
- Draft can be discarded without changing tracked jobs.
- New job saved into Chrome storage key `ts_jobs`.
- Existing job status updated.
- Job deleted.
- Saved scanned jobs retain optional source URL/source metadata in `ts_jobs`.
- Diagnostic logs for add/update/delete actions.

### 6.3 Popup Diagnostics

Contents:

- Live log terminal.
- Clear Console button.
- Simulate Sync button.
- Ping Worker button.

Inputs:

- Logs from popup state.
- User diagnostic button clicks.

Outputs:

- Logs printed with `info`, `success`, or `warn` type.
- Ping Worker sends `{ action: 'ping' }` and receives `{ status: 'active', timestamp }`.

### 6.4 Options Page

Main file: `chrome-extension-project/src/options/OptionsApp.tsx`

Tabs:

- AI Resume Matcher.
- Interview Planner.
- System Settings.

AI Resume Matcher inputs:

- Target job description.
- Resume text.

AI Resume Matcher outputs:

- Simulated match score that moves from 65 to 88.
- Alignment report with skill gaps, bullet optimizations, and relevance metrics.

Interview Planner inputs:

- Topic.
- Review category: `Behavioral`, `Technical`, or `System Design`.

Interview Planner outputs:

- New prep card stored in Chrome storage key `ts_prep`.
- Completion toggle.
- Clear all prep cards.

System Settings inputs:

- Cloud synchronization toggle.
- Interview notifications toggle.
- Usage diagnostics toggle.
- Clear database/reset action.

System Settings outputs:

- Values saved in Chrome storage:
  - `ts_settings_cloud`
  - `ts_settings_notif`
  - `ts_settings_analytics`
- Clear/reset action clears prep data.

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
- Discard clears only `ts_job_draft`.

## 7. Backend Service Summary

| Service | Responsibility | Key data/output |
|---|---|---|
| `auth-service` | Register, login, JWT/JWKS | User and token |
| `user-service` | User profile/admin stats | UserEntity, admin stats |
| `profile-service` | Career profile, skills, experience, education | ProfileResponse, Skill, Experience, Education |
| `job-service` | Jobs and recommendations | Job |
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
- Messaging uses one Realtime subscription per active conversation and aligns outgoing messages by current user ID.
- 2FA remains explicitly disabled until an authentication provider flow is configured.
- LMS is intentionally resilient: API Gateway first, Supabase second, empty data as final fallback.
- Admin dashboard uses a timeout fallback to mock stats if Supabase is slow or unreachable.

## 9. Quick Input/Output Index

| Feature | Main inputs | Main outputs |
|---|---|---|
| Auth | Email, password, full name, role | User/session/JWT |
| Dashboard | User ID, user roles | Stats, jobs, challenges, applications |
| Jobs | Search filters, saved search state, job data, application data | Job list, saved searches, created jobs, applications |
| Candidates | Recruiter ID, search text, status action | Candidate list, updated application status |
| Profile | User ID, headline/location/bio, skills/experience/education | Profile view and updated rows |
| Resume | Profile data, resume fields | Resume preview, saved supported fields, print-ready PDF export |
| LMS | Course filters, course ID, user ID | Course list, enrollment, progress |
| Challenges | Category filter, solution code | Challenge list, submissions |
| AI | Message, resume text, job description, user ID | Chat response, analysis, career path, insight |
| Networking | User ID, recipient ID, search text, optional request note | Suggestions, request state, accepted connections |
| Messaging | Conversation ID, message text | Conversation list, message stream, local send feedback, sent message |
| Billing | User ID, plan ID, checkout data | Plans, payments, subscription info |
| Settings | Profile fields, notification toggles, password reset confirmation, delete confirmation | Updated settings, billing summary, reset email request, account deactivation |
| Admin | Admin role | Platform stats and service health |
| Chrome extension | Local jobs, resume text, job description, prep cards, toggles | Local tracker dashboard, diagnostics, match report |
