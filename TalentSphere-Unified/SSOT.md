# TalentSphere Unified SSOT

**Version**: 4.2.0-Unified  
**Java Version**: 25  
**Spring Boot**: 3.5.0  

## Overview
TalentSphere Unified is the finalized, consolidated architecture merging features, security enhancements, and infrastructural components from `newproject`, `Startup`, and `MyProject`. It adopts a Spring Boot 3.5.0 Microservices backend paired with a React 19 Frontend.

## Architecture Guidelines

### Backend Structure
- All domain logic runs on Java 25.
- Employs Hexagonal boundaries.
- Adopts **RabbitMQ** for event distribution rather than Kafka to simplify operational overhead.
- Monitoring utilizes **Grafana Loki** and **Tempo** coupled with OpenTelemetry matching the legacy `MyProject` setup.

### Security Baseline
- Hardcoded fallback secrets within `application.yml` files are banned.
- `MandatoryEnvironmentPostProcessor` validates critical variables like `NODE_ENV` or DB passwords at application startup to stop booting instantly if missing.

### Frontend
- Based on Vite + React 19 and Tailwind V4.
- Includes micro-frontend modules and 3D animations ported from the legacy node-based `Startup` context.

## Active Microservices
- ai-service
- application-service
- auth-service
- challenge-service
- chat-service
- company-service
- gamification-service
- job-service
- lms-service
- messaging-service
- networking-service
- notification-service
- payment-service
- profile-service
- search-service
- user-service
- etc.


## Full-Spectrum Codebase Audit

This section provides a definitive, end-to-end analysis of every page and component within the TalentSphere Unified platform.

### 1. Dashboard Page (`/dashboard`)
- **Route & Access**: `/dashboard` | Protected | `ROLE_USER`, `ROLE_RECRUITER`
- **Features**:
  - **Recruiter View**: Stats (Active Jobs, Pending Applications, Hired Today), Recruiter Actions (Post Job, Manage Talent, View Analytics), Recent Activity feed.
  - **Talent View**: Stats (Applications, Courses, XP, Skill Level), Talent Actions (Find Jobs, Continue Learning, Build Resume), Recommendations.
- **UI Structure**:
  - `PageHeader` with dynamic greeting.
  - `GlassCard` layout for metrics and action buttons.
  - `Skeleton` loaders for async data states.
  - Role-based conditional rendering for recruiter/talent dashboards.
- **Data Flow**:
  - `DashboardPage` -> `useEffect` -> `dashboardService.fetchDashboardData()`.
  - Aggregates data from 5+ services concurrently using `Promise.allSettled`.
  - Redux `authSlice` used for identity and role detection.
- **Backend Mappings**:
  - `GET /api/v1/gamification/profile/${userId}` -> Points/Level/Badges.
  - `GET /api/v1/applications/count/${userId}` -> Application metrics.
  - `GET /api/v1/jobs/featured` -> Featured job nodes.
  - `GET /api/v1/challenges/recommended` -> Active arena challenges.
  - `GET /api/v1/messaging/unread` -> Notification/Message counts.
- **Dependencies**: `dashboardService`, `authSlice`, `GlassCard`, `AuraButton`, `PageHeader`.
- **Issues**:
  - **Performance**: High fan-out at the Gateway level; potential for "N+1" like UI latency if any single service lags.
  - **Gap**: No real-time WebSocket updates for metrics yet (planned for Signal Matrix integration).

### 2. Jobs Page (`/jobs`)
- **Route & Access**: `/jobs` | Protected | `ROLE_USER`, `ROLE_RECRUITER`
- **Features**:
  - **Search & Filter**: Keyword, Location, Job Type, Salary Range.
  - **Recruiter**: "Post New Job" modal, management of active listings.
  - **Talent**: Job exploration, detailed view, application protocol initiation.
- **UI Structure**:
  - `PageHeader` with "Post Job" action (Recruiter only).
  - Search bar with filter dropdowns.
  - Grid of `GlassCard` job nodes.
  - `AuraModal` for job posting and detailed view.
- **Data Flow**:
  - `JobsPage` -> `dispatch(fetchJobs())` -> `jobService.getJobs()`.
  - Search updates trigger re-fetching with query parameters.
  - `handleApply` -> `applicationService.apply()` -> Backend persistence -> RabbitMQ notification.
- **Backend Mappings**:
  - `GET /api/v1/jobs` -> Fetches all active jobs (MongoDB).
  - `GET /api/v1/jobs/search` -> Filtered discovery (MongoDB/Elasticsearch).
  - `POST /api/v1/jobs` -> Recruiter-only job creation (Transactional Outbox).
  - `POST /api/v1/applications` -> Application submission (Resilience4j protected).
- **Dependencies**: `jobService`, `applicationService`, `lmsSlice`, `AuraModal`, `AuraInput`.
- **Issues**:
  - **Validation**: Job posting form needs stricter client-side validation for salary ranges.

### 3. LMS Page (`/lms`)
- **Route & Access**: `/lms` | Protected | `ROLE_USER`
- **Features**:
  - **Course Discovery**: Browse courses by category (Engineering, Design, Business, AI).
  - **Enrollment**: One-click enrollment into professional development tracks.
  - **Progress Tracking**: Visual progress bars for in-progress courses.
  - **Certifications**: Tracking of completed courses and earned credentials.
- **UI Structure**:
  - `Tabs` for filtering (All, In Progress, Completed).
  - Search and Category filter bar.
  - Course cards with `Badge` for difficulty and topic.
  - Detail modal for course syllabus and instructor info.
- **Data Flow**:
  - `LMSPage` -> `dispatch(fetchCourses())` -> `lmsService.getCourses()`.
  - Enrolment -> `lmsService.enrollInCourse(courseId, userId)` -> UI State Update -> Toast Notification.
- **Backend Mappings**:
  - `GET /api/v1/lms/courses` -> Returns course registry (MongoDB).
  - `GET /api/v1/lms/courses/${id}` -> Fetch individual course details.
  - `POST /api/v1/lms/courses/${id}/enroll` -> Creates enrollment link.
- **Dependencies**: `lmsService`, `lmsSlice`, `Badge`, `AuraModal`, `Skeleton`.
- **Issues**:
  - **Gap**: Video streaming player integration is missing; currently only text/image curriculum supported.
  - **Side Effect**: Enrollment should trigger a "Course Started" event for the gamification engine (TS-011).

### 4. Profile Page (`/profile`)
- **Route & Access**: `/profile` | Protected | `ROLE_USER`, `ROLE_RECRUITER`
- **Features**:
  - **Overview**: Personal bio and profile completion metrics.
  - **Portfolio**: Management of Experience, Education, and Skills.
  - **Identity**: Avatar upload, Headline management, and Location data.
  - **Gamification Hub**: Display of earned badges and connection stats.
- **UI Structure**:
  - Glass-morphic Profile Header with dynamic stats.
  - `Tabs` (Overview, Experience, Education, Achievements).
  - Edit modal for rapid profile updates.
  - Completion progress bar (0-100%).
- **Data Flow**:
  - `ProfilePage` -> `profileService.getProfile(userId)` on mount.
  - `handleSaveProfile` -> `profileService.updateProfile()` -> Local state sync -> Toast.
- **Backend Mappings**:
  - `GET /api/v1/profile/${userId}` -> Full profile aggregate (PostgreSQL).
  - `PATCH /api/v1/profile/${userId}` -> Partial updates for headline/bio/location.
  - `GET /api/v1/gamification/profile/${userId}` -> Badge and XP data retrieval.
- **Dependencies**: `profileService`, `authSlice`, `AuraModal`, `AuraInput`, `Tabs`.
- **Issues**:
  - **Inconsistency**: Experience and Education sections are currently "read-only" in the UI (Buttons lead to "Coming Soon").

### 5. Resume Builder (`/resume`)
- **Route & Access**: `/resume` | Protected | `ROLE_USER`
- **Features**:
  - **Dynamic Editor**: Edit personal info, summary, experience, and skills in real-time.
  - **Live Preview**: Instantly see how changes affect the final resume layout.
  - **Export Protocol**: (Planned) PDF generation for professional distribution.
- **UI Structure**:
  - Dual-panel layout (Editor vs. Preview).
  - Draggable items for work experience (using `GripVertical`).
  - Skill chip management (Add/Remove).
- **Data Flow**:
  - Currently utilizes local state (`useState`) for editor inputs.
  - (Gap) Needs to sync with `profileService` or a dedicated `resumeService`.
- **Backend Mappings**:
  - `POST /api/v1/ai/analyze-resume` -> Integrated for future AI-driven optimization.
  - `GET /api/v1/profile/${userId}` -> Source of truth for initial data.
- **Dependencies**: `AuraButton`, `AuraInput`, `Tabs`, `lucide-react`.
- **Issues**:
  - **Persistence**: Edits are not currently persisted to the backend; session-based only.
  - **Optimization**: No AI-driven resume scoring implemented yet (Future scope for `ai-service`).

### 6. Admin Console (`/admin`)
- **Route & Access**: `/admin` | Protected | `ROLE_ADMIN`
- **Features**:
  - **System Metrics**: Real-time stats for Users, System Load, and Security.
  - **Service Health**: Uptime tracking and status monitoring for all 19 microservices.
  - **Security Alerts**: Monitoring for unauthorized access attempts or circuit breaker trips.
- **UI Structure**:
  - Metric card grid with status indicators (`Badge`).
  - Comprehensive "Service Health" table.
  - Automatic skeleton loading for telemetry data.
- **Data Flow**:
  - `AdminDashboard` -> `adminService.getDashboardStats()` -> Telemetry Aggregate.
- **Backend Mappings**:
  - `GET /api/v1/admin/stats` -> Aggregated metrics from Prometheus/Grafana or direct service pings.
- **Dependencies**: `adminService`, `Badge`, `GlassCard`, `PageHeader`.
- **Issues**:
  - **Data Source**: Current implementation relies on a single endpoint; if the `admin-service` or `gateway` is down, the entire console fails (needs resilient monitoring fallback).

### 7. Challenges Page (`/challenges`)
- **Route & Access**: `/challenges` | Protected | `ROLE_USER`
- **Features**:
  - **Arena Selection**: Filter challenges by Coding, Design, or Architecture.
  - **Skill Validation**: Real-world problem solving for XP and badges.
  - **Social Proof**: Participant counts and difficulty indicators.
- **UI Structure**:
  - Category filter tabs.
  - Grid of challenge cards with `Trophy` iconography.
  - Difficulty `Badge` (Success/Warning/Destructive).
- **Data Flow**:
  - `ChallengesPage` -> `dispatch(fetchChallenges())` -> `challengeService.getChallenges()`.
- **Backend Mappings**:
  - `GET /api/v1/challenges` -> Fetches challenge documents (MongoDB).
- **Dependencies**: `challengeService`, `challengeSlice`, `Trophy`, `GlassCard`.
- **Issues**:
  - **Gap**: The "Solve Now" action is a placeholder; needs integration with a code execution engine (e.g., Piston or custom Sandbox).

### 8. Networking Page (`/networking`)
- **Route & Access**: `/networking` | Protected | `ROLE_USER`
- **Features**:
  - **Professional Discovery**: AI-driven suggestions for relevant connections.
  - **Connection Protocol**: Request/Accept/Ignore lifecycle for professional mesh.
  - **Search**: Real-time filtering of the global professional graph.
- **UI Structure**:
  - Header search integration.
  - Profile cards with location and role metadata.
  - Action-state buttons (Connect -> Request Sent).
- **Data Flow**:
  - `NetworkingPage` -> `dispatch(fetchSuggestions())` -> `networkingService.getSuggestions()`.
  - `handleConnect` -> `networkingService.sendConnectionRequest(id)`.
- **Backend Mappings**:
  - `GET /api/v1/networking/profiles` -> Discovery of nodes (PostgreSQL).
  - `POST /api/v1/networking/connect` -> Edge creation in the social graph.
- **Dependencies**: `networkingService`, `networkingSlice`, `UserPlus`, `AuraButton`.
- **Issues**:
  - **Technical Debt**: Connection graph visualization (e.g., D3.js or Force-directed) is missing from the UI.
  - **Consistency**: Profile data in Networking should sync immediately with the `profile-service` cache.
