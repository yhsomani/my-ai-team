# TalentSphere — API Reference (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Authoritative contract baseline: `docs/API_OPENAPI_CONTRACT.json` (123 operations).
> Extracted 2026-09-08.

## API Architecture

TalentSphere uses a dual-access pattern:
1. **Primary**: React Frontend → Supabase PostgREST (direct PostgreSQL queries with RLS)
2. **Secondary**: React Frontend → Spring Cloud Gateway (:8080) → Microservices (heavy ops)

## 123 API Operations by Domain

### Admin (8 endpoints)
- `GET /api/v1/admin/feature-flags` — List feature flags
- `POST /api/v1/admin/feature-flags/{key}/enable` — Enable feature flag
- `POST /api/v1/admin/feature-flags/{key}/disable` — Disable feature flag
- `POST /api/v1/admin/feature-flags/{key}/reset` — Reset flag to default
- `POST /api/v1/admin/feature-flags/reset-all` — Reset all flags
- `GET /api/v1/admin/feature-flags/categories` — Flag categories
- `GET /api/v1/admin/feature-flags/core` — Core feature flags
- `GET /api/v1/admin/feature-flags/enabled` — Currently enabled flags
- `GET /api/v1/admin/public/stats` — Public platform statistics
- `GET /api/v1/admin/stats` — Protected admin platform statistics

### AI & Career (8 endpoints)
- `POST /api/v1/ai/analyze-resume` — Parse & score resume text
- `POST /api/v1/ai/career-path` — Generate career milestone recommendations
- `POST /api/v1/ai/chat` — Conversational career coaching (heuristic)
- `GET /api/v1/ai/health` — AI service health check
- `GET /api/v1/ai/insights` — Profile optimization suggestions
- `POST /api/v1/ai/match-job` — Calculate candidate-to-job match score
- `GET /api/v1/ai/results` — Fetch previous AI analysis runs
- `POST /api/v1/ai/save-results` — Persist AI recommendation feedback

### Applications (7 endpoints)
- `POST /api/v1/applications` — Submit a new job application
- `GET /api/v1/applications/events` — Stream application lifecycle events
- `PATCH /api/v1/applications/{id}/status` — Update status (Recruiter/Admin)
- `GET /api/v1/applications/count` — Aggregate application counts
- `GET /api/v1/applications/health` — Health check
- `GET /api/v1/applications/job/{jobId}` — List applicants for a specific job
- `GET /api/v1/applications/user/{userId}` — List user's job applications

### Authentication & Identity (4 endpoints)
- `GET /api/v1/auth/.well-known/jwks.json` — Public JWKS key set for verification
- `GET /api/v1/auth/health` — Health check
- `POST /api/v1/auth/login` — Authenticate and issue session tokens
- `POST /api/v1/auth/register` — Create new user identity

### Challenges (5 endpoints)
- `GET /api/v1/challenges` — List published coding challenges
- `POST /api/v1/challenges` — Create a new challenge (Admin/Recruiter)
- `GET /api/v1/challenges/{id}` — Get challenge detail & test cases
- `POST /api/v1/challenges/{id}/submit` — Execute code & record submission
- `GET /api/v1/challenges/{id}/submissions` — User's submission history

### Companies (4 endpoints)
- `GET /api/v1/companies` — Search & list company profiles
- `POST /api/v1/companies` — Register new employer entity
- `GET /api/v1/companies/{id}` — Get company details & open jobs
- `PUT /api/v1/companies/{id}` — Update company branding & profile

### Files & Media (4 endpoints)
- `POST /api/v1/files/upload` — Upload multipart resume/avatar
- `GET /api/v1/files/{id}/download` — Stream secure file artifact
- `DELETE /api/v1/files/{id}` — Delete file artifact
- `GET /api/v1/files/health` — Health check

### Gamification (5 endpoints)
- `GET /api/v1/gamification/badges` — Available badge catalog
- `GET /api/v1/gamification/leaderboard` — Global/weekly XP rankings
- `GET /api/v1/gamification/user/{userId}/xp` — User XP balance & breakdown
- `POST /api/v1/gamification/award` — Internal XP transaction trigger
- `GET /api/v1/gamification/health` — Health check

### Jobs Marketplace (8 endpoints)
- `GET /api/v1/jobs` — Paginated job listings
- `POST /api/v1/jobs` — Create new job post
- `GET /api/v1/jobs/{id}` — Detailed job view
- `PUT /api/v1/jobs/{id}` — Update job listing
- `GET /api/v1/jobs/featured` — Curated featured jobs
- `GET /api/v1/jobs/recommended` — Personalized recommendations
- `GET /api/v1/jobs/search` — Keyword + location search
- `POST /api/v1/jobs/search/advanced` — Multi-facet filtered search

### LMS & Courses (11 endpoints)
- `GET /api/v1/lms/courses` — Course catalog
- `POST /api/v1/lms/courses` — Author new course
- `GET /api/v1/lms/courses/{id}` — Course details & syllabus
- `POST /api/v1/lms/courses/{id}/enroll` — Enroll user
- `DELETE /api/v1/lms/courses/{id}/enrollment` — Drop course
- `GET /api/v1/lms/learning-paths` — Curated curriculum paths
- `GET /api/v1/lms/lessons/{id}` — Lesson content & assets
- `POST /api/v1/lms/lessons/{id}/complete` — Mark lesson finished
- `GET /api/v1/lms/courses/slug/{slug}` — Fetch course by URL slug
- `GET /api/v1/lms/health` — Health check
- `GET /api/v1/lms/user/enrollments` — Active user enrollments

### Messaging & Communication (5 endpoints)
- `GET /api/v1/messages/conversations` — List active conversations
- `GET /api/v1/messages/conversations/{id}` — Message history in thread
- `POST /api/v1/messages/send` — Send message to recipient/group
- `POST /api/v1/messages/read` — Acknowledge message read state
- `GET /api/v1/messages/unread/count` — Badge unread total

### Professional Networking (8 endpoints)
- `POST /api/v1/networking/connect` — Send connection request
- `GET /api/v1/networking/connections` — List confirmed connections
- `POST /api/v1/networking/accept` — Accept incoming request
- `GET /api/v1/networking/feed` — Network activity feed
- `POST /api/v1/networking/posts` — Create feed post
- `POST /api/v1/networking/posts/{id}/like` — Like/unlike post
- `GET /api/v1/networking/suggestions` — People you may know
- `GET /api/v1/networking/health` — Health check

### Notifications (5 endpoints)
- `GET /api/v1/notifications` — In-app notification list
- `PATCH /api/v1/notifications/{id}/read` — Mark single notification read
- `POST /api/v1/notifications/read-all` — Mark all as read
- `GET /api/v1/notifications/unread-count` — Count unread alerts
- `GET /api/v1/notifications/health` — Health check

### Payments & Billing (5 endpoints)
- `POST /api/v1/payments/checkout` — Initiate checkout session (Demo mode)
- `GET /api/v1/payments/plans` — List subscription plans
- `GET /api/v1/payments/history` — User payment ledger
- `GET /api/v1/payments/status` — Current subscription status
- `GET /api/v1/payments/health` — Health check

### Profile Management (5 endpoints)
- `GET /api/v1/profile` — Current user profile
- `PUT /api/v1/profile` — Update bio/title/contact
- `POST /api/v1/profile/education` — Add education entry
- `POST /api/v1/profile/experience` — Add work history entry
- `POST /api/v1/profile/skills` — Add/endorse skills

### Recruiter Studio (2 endpoints)
- `GET /api/v1/recruiter/applications/recent` — Recent pipeline activity
- `GET /api/v1/recruiter/stats` — Pipeline KPI metrics

### Search Service (4 endpoints)
- `GET /api/v1/search/health` — Health check
- `GET /api/v1/search/jobs` — Cross-cutting job search
- `GET /api/v1/search/profiles` — Candidate search
- `POST /api/v1/search/profiles/skills` — Match candidates by skill array

### User Management (5 endpoints)
- `GET /api/v1/users` — Paginated user directory (Admin)
- `GET /api/v1/users/{id}` — User public details
- `PUT /api/v1/users/{id}` — Update user record
- `DELETE /api/v1/users/{id}` — Soft-delete / deactivate user
- `GET /api/v1/users/health` — Health check

### Video & Interviews (4 endpoints)
- `POST /api/v1/video/schedule` — Create interview room
- `POST /api/v1/video/session/start` — Initialize WebRTC room
- `POST /api/v1/video/session/end` — Teardown interview session
- `GET /api/v1/video/token` — Generate ephemeral video token
