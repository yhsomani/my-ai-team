# TalentSphere — API Contract Specification (Canonical SSOT)

> **Document Version**: 3.2-canonical
> **Status**: Production Baseline
> **Reconciled Date**: 2026-09-09
> **Authority**: `reference/API_OPENAPI_CONTRACT.json` (123 operations, 19 domains).
> **Governing ADRs**: ADR-001 (Supabase Auth & Gateway JWT), ADR-002 (Spring Cloud Gateway Routing), ADR-004 (Realtime WebSocket Messaging).
> **Conflict Resolution**: OpenAPI contract is the binding API truth; inline annotations supplement.
> **Reconciliation note**: Sections 2/3 enumerate the full 123-operation contract. Operations previously
> documented under legacy path shapes are preserved verbatim in **Section 7 (Legacy / Drift Surface)**.

---

## 1. API Architecture Overview

TalentSphere exposes **two complementary API surfaces**:

1. **Primary Data Plane**: React 19 SPA → Supabase PostgREST (direct PostgreSQL queries with RLS)
   - Endpoint: `https://<project-ref>.supabase.co/rest/v1/*`
   - Auth: Supabase JWT in `Authorization: Bearer` header
   - Query: PostgREST query syntax (`select`, `eq`, `ilike`, `order`, `limit`, `offset`)

2. **Secondary Compute Plane**: React 19 SPA → Spring Cloud Gateway (port 8080) → Microservices
   - Endpoint: `http://localhost:8080/api/v1/*`
   - Auth: Same Supabase JWT, verified by `JwtAuthenticationFilter` via HMAC `JWT_SECRET`
   - Forwarded headers: `X-User-Id`, `X-User-Role`

---

## 2. OpenAPI Operation Summary (123 Operations / 19 Domains)

| # | Domain | Operations | Service Module | Auth Required |
|---|---|---|---|---|
| 1 | Admin & Governance | 11 | `api-gateway` / `user-service` | Admin-only (10), Public (1) |
| 2 | AI & Career Copilot | 8 | `ai-service` | All authenticated |
| 3 | Applications | 7 | `application-service` | User/Admin (varies) |
| 4 | Authentication & Identity | 4 | `auth-service` | Mixed (JWKS public, login/register public) |
| 5 | Coding Challenges | 4 | `challenge-service` | All authenticated |
| 6 | Companies | 8 | `company-service` | Recruiter/Admin (write), All (read) |
| 7 | Files & Media | 4 | `file-service` | All authenticated |
| 8 | Gamification | 5 | `gamification-service` | All authenticated |
| 9 | Jobs Marketplace | 8 | `job-service` | All authenticated (read), Recruiter (write) |
| 10 | LMS & Courses | 14 | `lms-service` | All authenticated |
| 11 | Messaging | 5 | `messaging-service` | All authenticated |
| 12 | Networking | 8 | `networking-service` | All authenticated |
| 13 | Notifications | 5 | `notification-service` | All authenticated |
| 14 | Payments & Billing | 5 | `payment-service` | All authenticated |
| 15 | Profile Management | 11 | `profile-service` | All authenticated |
| 16 | Recruiter Studio | 2 | `recruiter-service` | Recruiter/Admin |
| 17 | Search | 4 | `search-service` | All authenticated |
| 18 | User Management | 5 | `user-service` | Admin (write), All (read) |
| 19 | Video & Interviews | 5 | `video-service` | All authenticated |

**Total**: **123 API operations**

---

## 3. Complete Operation Catalog by Domain (Binding Contract)

### 3.1 Admin & Governance (11 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/admin/feature-flags` | List all feature flags | Admin | — | `FeatureFlag[]` |
| GET | `/api/v1/admin/feature-flags/categories` | List flag categories | Admin | — | `string[]` |
| GET | `/api/v1/admin/feature-flags/core` | Core flag subset | Admin | — | `FeatureFlag[]` |
| GET | `/api/v1/admin/feature-flags/enabled` | Currently enabled flags | Admin | — | `FeatureFlag[]` |
| POST | `/api/v1/admin/feature-flags/reset-all` | Reset all flags | Admin | — | `FeatureFlag[]` |
| GET | `/api/v1/admin/feature-flags/{flagName}` | GET /api/v1/admin/feature-flags/{flagName} | Admin-only (9), Public (2) | path: `flagName*` | `FlagStatus` |
| POST | `/api/v1/admin/feature-flags/{flagName}/disable` | POST /api/v1/admin/feature-flags/{flagName}/disable | Admin-only (9), Public (2) | path: `flagName*` | `ApiResponse` |
| POST | `/api/v1/admin/feature-flags/{flagName}/enable` | POST /api/v1/admin/feature-flags/{flagName}/enable | Admin-only (9), Public (2) | path: `flagName*` | `ApiResponse` |
| POST | `/api/v1/admin/feature-flags/{flagName}/reset` | POST /api/v1/admin/feature-flags/{flagName}/reset | Admin-only (9), Public (2) | path: `flagName*` | `ApiResponse` |
| GET | `/api/v1/admin/public/stats` | Public platform stats | Public | — | `PlatformStats` |
| GET | `/api/v1/admin/stats` | Protected admin stats | Admin | — | `AdminStats` |

### 3.2 AI & Career Copilot (8 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/ai/analyze-resume` | Parse & score resume | Authenticated | Body: `{ resumeText }` | `ResumeAnalysis` |
| GET | `/api/v1/ai/career-path/{userId}` | GET /api/v1/ai/career-path/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| POST | `/api/v1/ai/chat` | Conversational career coaching | Authenticated | Body: `{ message, sessionId? }` | `ChatResponse` |
| GET | `/api/v1/ai/health` | AI service health | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/ai/insights` | Profile optimization suggestions | Authenticated | — | `Insight[]` |
| POST | `/api/v1/ai/match-job` | Candidate-job match score | Authenticated | Body: `{ jobId }` | `MatchScore` |
| GET | `/api/v1/ai/results/{userId}` | GET /api/v1/ai/results/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| POST | `/api/v1/ai/save-results` | Persist AI feedback | Authenticated | Body: `{ results }` | `SaveConfirmation` |

### 3.3 Applications (7 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/applications` | Submit application | Authenticated | Body: `{ jobId, coverLetter?, resumeUrl? }` | `Application` |
| GET | `/api/v1/applications/count/{userId}` | GET /api/v1/applications/count/{userId} | User/Admin (varies) | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/applications/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/applications/job/{jobId}` | Applicants for job | Recruiter | Path: `jobId` | `Application[]` |
| GET | `/api/v1/applications/user/{userId}` | User's applications | Authenticated | Path: `userId` | `Application[]` |
| GET | `/api/v1/applications/{id}/events` | GET /api/v1/applications/{id}/events | User/Admin (varies) | path: `id*` | `ApiResponse` |
| PATCH | `/api/v1/applications/{id}/status` | Update status (recruiter) | Recruiter/Admin | Body: `{ status, notes? }` | `Application` |

### 3.4 Authentication & Identity (4 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/auth/.well-known/jwks.json` | Public JWKS key set | Public | — | `JWKS` |
| GET | `/api/v1/auth/health` | Auth service health | Public | — | `HealthStatus` |
| POST | `/api/v1/auth/login` | Authenticate user | Public | Body: `{ email, password }` | `AuthToken` |
| POST | `/api/v1/auth/register` | Create new user | Public | Body: `{ email, password, name, role? }` | `AuthToken` |

### 3.5 Coding Challenges (4 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/challenges` | List published challenges | Authenticated | Query: `difficulty?, category?` | `Challenge[]` |
| GET | `/api/v1/challenges/health` | GET /api/v1/challenges/health | All authenticated | — | `ApiResponse` |
| POST | `/api/v1/challenges/submit` | POST /api/v1/challenges/submit | All authenticated | query: `userId*`, query: `challengeId*`, query: `language*`, Body: JSON | `Submission` |
| GET | `/api/v1/challenges/trending` | GET /api/v1/challenges/trending | All authenticated | — | `ApiResponse` |

### 3.6 Companies (8 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/companies` | Search & list companies | Authenticated | Query: `search?, industry?` | `Company[]` |
| POST | `/api/v1/companies` | Register employer | Recruiter | Body: `CompanyInput` | `Company` |
| GET | `/api/v1/companies/health` | GET /api/v1/companies/health | Recruiter/Admin (write), All (read) | — | `ApiResponse` |
| GET | `/api/v1/companies/search` | GET /api/v1/companies/search | Recruiter/Admin (write), All (read) | query: `q*` | `ApiResponse` |
| GET | `/api/v1/companies/user/{userId}` | GET /api/v1/companies/user/{userId} | Recruiter/Admin (write), All (read) | path: `userId*` | `Company` |
| GET | `/api/v1/companies/{id}` | Company detail + jobs | Authenticated | Path: `id` | `CompanyDetail` |
| PUT | `/api/v1/companies/{id}` | Update company profile | Recruiter (owner) | Body: `CompanyUpdate` | `Company` |
| POST | `/api/v1/companies/{id}/verify` | POST /api/v1/companies/{id}/verify | Recruiter/Admin (write), All (read) | path: `id*` | `Company` |

### 3.7 Files & Media (4 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| DELETE | `/api/v1/files` | DELETE /api/v1/files | All authenticated | query: `url*` | `ApiResponse` |
| GET | `/api/v1/files/download/{folder}/{fileName:.+}` | GET /api/v1/files/download/{folder}/{fileName:.+} | All authenticated | path: `folder*`, path: `fileName*` | `ApiResponse` |
| GET | `/api/v1/files/health` | Health check | Authenticated | — | `HealthStatus` |
| POST | `/api/v1/files/upload` | Upload file (multipart) | Authenticated | `multipart/form-data` | `FileArtifact` |

### 3.8 Gamification (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/gamification/achievements` | POST /api/v1/gamification/achievements | All authenticated | Body: JSON | `Achievement` |
| GET | `/api/v1/gamification/achievements/{userId}` | GET /api/v1/gamification/achievements/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/gamification/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/gamification/leaderboard` | Global/weekly rankings | Authenticated | Query: `period?, limit?` | `LeaderboardEntry[]` |
| GET | `/api/v1/gamification/stats/{userId}` | GET /api/v1/gamification/stats/{userId} | All authenticated | path: `userId*` | `ApiResponse` |

### 3.9 Jobs Marketplace (8 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/jobs` | Paginated job listings | Authenticated | Query: `page?, limit?, type?, level?` | `Job[]` |
| POST | `/api/v1/jobs` | Create job post | Recruiter | Body: `JobInput` | `Job` |
| GET | `/api/v1/jobs/featured` | Featured jobs | Authenticated | — | `Job[]` |
| GET | `/api/v1/jobs/health` | GET /api/v1/jobs/health | All authenticated (read), Recruiter (write) | — | `ApiResponse` |
| GET | `/api/v1/jobs/recommended` | Personalized recommendations | Authenticated | — | `Job[]` |
| GET | `/api/v1/jobs/search` | Keyword + location search | Authenticated | Query: `q, location?` | `Job[]` |
| GET | `/api/v1/jobs/search/advanced` | GET /api/v1/jobs/search/advanced | All authenticated (read), Recruiter (write) | query: `location*`, query: `jobType` | `ApiResponse` |
| GET | `/api/v1/jobs/{id}` | Job detail | Authenticated | Path: `id` | `JobDetail` |

### 3.10 LMS & Courses (14 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/lms/courses` | Course catalog | Authenticated | Query: `level?, search?` | `Course[]` |
| POST | `/api/v1/lms/courses` | Create course | Recruiter/Admin | Body: `CourseInput` | `Course` |
| GET | `/api/v1/lms/courses/slug/{slug}` | Fetch by URL slug | Authenticated | Path: `slug` | `CourseDetail` |
| GET | `/api/v1/lms/courses/{courseId}` | GET /api/v1/lms/courses/{courseId} | All authenticated | path: `courseId*` | `Course` |
| POST | `/api/v1/lms/courses/{courseId}/enroll` | POST /api/v1/lms/courses/{courseId}/enroll | All authenticated | path: `courseId*`, query: `userId*` | `Enrollment` |
| GET | `/api/v1/lms/courses/{courseId}/enrollment` | GET /api/v1/lms/courses/{courseId}/enrollment | All authenticated | path: `courseId*`, query: `userId*` | `Enrollment` |
| POST | `/api/v1/lms/courses/{courseId}/enrollments/drop` | POST /api/v1/lms/courses/{courseId}/enrollments/drop | All authenticated | path: `courseId*`, query: `userId*` | `Enrollment` |
| POST | `/api/v1/lms/courses/{courseId}/enrollments/start` | POST /api/v1/lms/courses/{courseId}/enrollments/start | All authenticated | path: `courseId*`, query: `userId*` | `Enrollment` |
| GET | `/api/v1/lms/courses/{courseId}/learning-paths` | GET /api/v1/lms/courses/{courseId}/learning-paths | All authenticated | path: `courseId*` | `ApiResponse` |
| GET | `/api/v1/lms/courses/{courseId}/lessons` | GET /api/v1/lms/courses/{courseId}/lessons | All authenticated | path: `courseId*` | `ApiResponse` |
| POST | `/api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete` | POST /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete | All authenticated | path: `courseId*`, path: `lessonId*`, query: `userId*` | `Enrollment` |
| GET | `/api/v1/lms/enrollments/{userId}` | GET /api/v1/lms/enrollments/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/lms/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/lms/learning-paths` | Curated curriculum paths | Authenticated | — | `LearningPath[]` |

### 3.11 Messaging (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/messages/conversation` | GET /api/v1/messages/conversation | All authenticated | query: `user1*`, query: `user2*` | `ApiResponse` |
| GET | `/api/v1/messages/health` | GET /api/v1/messages/health | All authenticated | — | `ApiResponse` |
| PATCH | `/api/v1/messages/read` | PATCH /api/v1/messages/read | All authenticated | query: `user1*`, query: `user2*` | `ApiResponse` |
| POST | `/api/v1/messages/send` | Send message | Authenticated | Body: `{ conversationId, content, attachmentUrl? }` | `Message` |
| GET | `/api/v1/messages/unread/count/{userId}` | GET /api/v1/messages/unread/count/{userId} | All authenticated | path: `userId*` | `ApiResponse` |

### 3.12 Networking (8 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/networking/connect` | Send connection request | Authenticated | Body: `{ userId }` | `Connection` |
| POST | `/api/v1/networking/connections/accept/{id}` | POST /api/v1/networking/connections/accept/{id} | All authenticated | path: `id*` | `ApiResponse` |
| GET | `/api/v1/networking/connections/{userId}` | GET /api/v1/networking/connections/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/networking/feed` | Activity feed | Authenticated | Query: `limit?, offset?` | `FeedItem[]` |
| GET | `/api/v1/networking/health` | Health check | Authenticated | — | `HealthStatus` |
| POST | `/api/v1/networking/posts` | Create feed post | Authenticated | Body: `{ content, visibility? }` | `FeedPost` |
| POST | `/api/v1/networking/posts/like/{postId}` | POST /api/v1/networking/posts/like/{postId} | All authenticated | path: `postId*` | `Post` |
| GET | `/api/v1/networking/suggestions/{userId}` | GET /api/v1/networking/suggestions/{userId} | All authenticated | path: `userId*`, query: `10` | `ApiResponse` |

### 3.13 Notifications (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/notifications/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/notifications/user/{userId}` | GET /api/v1/notifications/user/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| PATCH | `/api/v1/notifications/user/{userId}/read-all` | PATCH /api/v1/notifications/user/{userId}/read-all | All authenticated | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/notifications/user/{userId}/unread-count` | GET /api/v1/notifications/user/{userId}/unread-count | All authenticated | path: `userId*` | `ApiResponse` |
| PATCH | `/api/v1/notifications/{id}/read` | Mark single read | Authenticated | Path: `id` | `Notification` |

### 3.14 Payments & Billing (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/payments/checkout` | Initiate demo checkout | Authenticated | Body: `{ planId }` | `CheckoutSession` |
| GET | `/api/v1/payments/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/payments/history/{userId}` | GET /api/v1/payments/history/{userId} | All authenticated | path: `userId*` | `ApiResponse` |
| GET | `/api/v1/payments/plans` | List subscription plans | Authenticated | — | `Plan[]` |
| GET | `/api/v1/payments/status/{sessionId}` | GET /api/v1/payments/status/{sessionId} | All authenticated | path: `sessionId*` | `ApiResponse` |

### 3.15 Profile Management (11 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/profile/health` | GET /api/v1/profile/health | All authenticated | — | `ApiResponse` |
| GET | `/api/v1/profile/{userId}` | GET /api/v1/profile/{userId} | All authenticated | path: `userId*` | `ProfileResponse` |
| PUT | `/api/v1/profile/{userId}` | PUT /api/v1/profile/{userId} | All authenticated | path: `userId*`, Body: JSON | `ProfileResponse` |
| GET | `/api/v1/profile/{userId}/education` | GET /api/v1/profile/{userId}/education | All authenticated | path: `userId*` | `ApiResponse` |
| POST | `/api/v1/profile/{userId}/education` | POST /api/v1/profile/{userId}/education | All authenticated | path: `userId*`, Body: JSON | `Education` |
| GET | `/api/v1/profile/{userId}/experience` | GET /api/v1/profile/{userId}/experience | All authenticated | path: `userId*` | `ApiResponse` |
| POST | `/api/v1/profile/{userId}/experience` | POST /api/v1/profile/{userId}/experience | All authenticated | path: `userId*`, Body: JSON | `Experience` |
| DELETE | `/api/v1/profile/{userId}/experience/{experienceId}` | DELETE /api/v1/profile/{userId}/experience/{experienceId} | All authenticated | path: `userId*`, path: `experienceId*` | `ApiResponse` |
| GET | `/api/v1/profile/{userId}/skills` | GET /api/v1/profile/{userId}/skills | All authenticated | path: `userId*` | `ApiResponse` |
| POST | `/api/v1/profile/{userId}/skills` | POST /api/v1/profile/{userId}/skills | All authenticated | path: `userId*`, Body: JSON | `Skill` |
| DELETE | `/api/v1/profile/{userId}/skills/{skillId}` | DELETE /api/v1/profile/{userId}/skills/{skillId} | All authenticated | path: `userId*`, path: `skillId*` | `ApiResponse` |

### 3.16 Recruiter Studio (2 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/recruiter/applications/recent` | Recent pipeline activity | Recruiter | Query: `limit?` | `RecentApplication[]` |
| GET | `/api/v1/recruiter/stats` | Pipeline KPI metrics | Recruiter | — | `RecruiterStats` |

### 3.17 Search (4 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/search/health` | Health check | Authenticated | — | `HealthStatus` |
| GET | `/api/v1/search/jobs` | Cross-cutting job search | Authenticated | Query: `q, filters?` | `SearchResult<Job>[]` |
| GET | `/api/v1/search/profiles` | Candidate search | Authenticated | Query: `q, skills?` | `SearchResult<Profile>[]` |
| GET | `/api/v1/search/profiles/skills` | GET /api/v1/search/profiles/skills | All authenticated | query: `skills*` | `ApiResponse` |

### 3.18 User Management (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/v1/users` | User directory (paginated) | Admin | Query: `page?, limit?, role?` | `User[]` |
| GET | `/api/v1/users/health` | Health check | Authenticated | — | `HealthStatus` |
| DELETE | `/api/v1/users/{id}` | Soft-delete user | Admin | Path: `id` | 204 No Content |
| GET | `/api/v1/users/{id}` | User public details | Authenticated | Path: `id` | `UserProfile` |
| PUT | `/api/v1/users/{id}` | Update user record | Admin | Body: `UserUpdate` | `User` |

### 3.19 Video & Interviews (5 Operations)

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/video/schedule` | Create interview room | Authenticated | Body: `{ participants, scheduledAt }` | `VideoRoom` |
| GET | `/api/v1/video/session/{sessionId}` | GET /api/v1/video/session/{sessionId} | All authenticated | path: `sessionId*` | `ApiResponse` |
| POST | `/api/v1/video/session/{sessionId}/end` | POST /api/v1/video/session/{sessionId}/end | All authenticated | path: `sessionId*`, query: `recordingUrl` | `ApiResponse` |
| POST | `/api/v1/video/session/{sessionId}/start` | POST /api/v1/video/session/{sessionId}/start | All authenticated | path: `sessionId*` | `ApiResponse` |
| GET | `/api/v1/video/session/{sessionId}/token` | GET /api/v1/video/session/{sessionId}/token | All authenticated | path: `sessionId*` | `ApiResponse` |

---

## 4. Shared Data Types

### 4.1 Health Status (Common Response)
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  service: string;
  timestamp: string;        // ISO 8601
  uptime: number;           // seconds
}
```

### 4.2 Pagination Envelope
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### 4.3 Error Response
```typescript
interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
```

---

## 5. Authentication & Authorization Contract

### 5.1 JWT Verification (Gateway)
- **Algorithm**: HMAC (`HS256`) via `JWT_SECRET` environment variable
- **Header extraction**: `Authorization: Bearer <supabase_access_token>`
- **Forwarded claims**: `X-User-Id` (UUID), `X-User-Role` (normalized: `ROLE_USER` | `ROLE_RECRUITER` | `ROLE_ADMIN`)

### 5.2 Public vs Protected Routes
- **Public routes** (no JWT required): `/api/v1/admin/public/stats`, `/api/v1/auth/.well-known/jwks.json`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/health`
- **All other routes**: JWT required; role-based authorization enforced by `@PreAuthorize` annotations in controllers

---

<!-- section marker '## 6. Operational Contracts' not found -->

---

## 7. Legacy / Drift Surface (Preserved — NOT in Current Contract)

The following operations are documented in the canonical, rebuild-baseline and frontend service layer but do **not** appear in `reference/API_OPENAPI_CONTRACT.json`. They are preserved verbatim for zero-loss grounding so a rebuild agent can distinguish legacy shapes from the binding 123-operation contract. Flag: `[NOT IN CURRENT CONTRACT]`.

| Method | Path | Description | Auth | Request | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/admin/feature-flags/{key}/disable` | Disable a flag | Admin | Path: `key` | `FeatureFlag` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/admin/feature-flags/{key}/enable` | Enable a flag | Admin | Path: `key` | `FeatureFlag` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/admin/feature-flags/{key}/reset` | Reset flag to default | Admin | Path: `key` | `FeatureFlag` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/ai/career-path` | Career milestone recommendations | Authenticated | Body: `{ profile }` | `CareerPath` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/ai/results` | Previous AI analysis runs | Authenticated | Query: `sessionId?` | `AIResult[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/applications/count` | Aggregate counts | Authenticated | Query: `jobId?, userId?` | `{ total, byStatus }` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/applications/events` | Stream lifecycle events | Authenticated | Query: `since?` | `ApplicationEvent[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/challenges` | Create challenge | Admin/Recruiter | Body: `ChallengeInput` | `Challenge` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/challenges/{id}` | Challenge detail + test cases | Authenticated | Path: `id` | `ChallengeDetail` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/challenges/{id}/submissions` | Submission history | Authenticated | Path: `id` | `Submission[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/challenges/{id}/submit` | Execute code & record | Authenticated | Body: `{ code, language }` | `Submission` |  [NOT IN CURRENT CONTRACT] |
| DELETE | `/api/v1/files/{id}` | Delete file | Authenticated | Path: `id` | 204 No Content |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/files/{id}/download` | Download file | Authenticated | Path: `id` | Binary stream |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/gamification/award` | Internal XP trigger | System/Internal | Body: `{ userId, amount, refType, refId }` | `XPTransaction` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/gamification/badges` | Badge catalog | Authenticated | — | `Badge[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/gamification/user/{userId}/xp` | User XP breakdown | Authenticated | Path: `userId` | `XPBalance` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/jobs/search/advanced` | Multi-facet advanced search | Authenticated | Body: `AdvancedSearchFilters` | `Job[]` |  [NOT IN CURRENT CONTRACT] |
| PUT | `/api/v1/jobs/{id}` | Update job listing | Recruiter (owner) | Body: `JobUpdate` | `Job` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/lms/courses/{id}` | Course detail + syllabus | Authenticated | Path: `id` | `CourseDetail` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/lms/courses/{id}/enroll` | Enroll in course | Authenticated | Path: `id` | `Enrollment` |  [NOT IN CURRENT CONTRACT] |
| DELETE | `/api/v1/lms/courses/{id}/enrollment` | Drop course | Authenticated | Path: `id` | 204 No Content |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/lms/lessons/{id}` | Lesson content | Authenticated | Path: `id` | `LessonDetail` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/lms/lessons/{id}/complete` | Mark lesson complete | Authenticated | Path: `id` | `LessonProgress` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/lms/user/enrollments` | User's active enrollments | Authenticated | — | `Enrollment[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/messages/conversations` | List conversations | Authenticated | — | `Conversation[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/messages/conversations/{id}` | Message history | Authenticated | Path: `id`, Query: `limit?, before?` | `Message[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/messages/read` | Mark as read | Authenticated | Body: `{ conversationId, messageIds? }` | 200 OK |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/messages/unread/count` | Unread badge total | Authenticated | — | `{ count }` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/networking/accept` | Accept request | Authenticated | Body: `{ connectionId }` | `Connection` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/networking/connections` | List connections | Authenticated | Query: `status?` | `Connection[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/networking/posts/{id}/like` | Like/unlike post | Authenticated | Path: `id` | `{ liked: boolean }` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/networking/suggestions` | People you may know | Authenticated | Query: `limit?` | `ProfileSuggestion[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/notifications` | Notification list | Authenticated | Query: `read?, type?, limit?` | `Notification[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/notifications/read-all` | Mark all read | Authenticated | — | 200 OK |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/notifications/unread-count` | Unread count | Authenticated | — | `{ count }` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/payments/history` | Payment ledger | Authenticated | — | `Payment[]` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/payments/status` | Subscription status | Authenticated | — | `SubscriptionStatus` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/profile` | Current user profile | Authenticated | — | `Profile` |  [NOT IN CURRENT CONTRACT] |
| PUT | `/api/v1/profile` | Update bio/title/contact | Authenticated | Body: `ProfileUpdate` | `Profile` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/profile/education` | Add education entry | Authenticated | Body: `EducationInput` | `Education` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/profile/experience` | Add work history | Authenticated | Body: `ExperienceInput` | `Experience` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/profile/skills` | Add/endorse skills | Authenticated | Body: `SkillInput[]` | `Skill[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/search/profiles/skills` | Skill-based matching | Authenticated | Body: `{ skills: string[] }` | `SearchResult<Profile>[]` |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/video/session/end` | Teardown session | Authenticated | Body: `{ roomId }` | 200 OK |  [NOT IN CURRENT CONTRACT] |
| POST | `/api/v1/video/session/start` | Initialize WebRTC room | Authenticated | Body: `{ roomId }` | `SessionToken` |  [NOT IN CURRENT CONTRACT] |
| GET | `/api/v1/video/token` | Generate ephemeral token | Authenticated | Query: `roomId?` | `VideoToken` |  [NOT IN CURRENT CONTRACT] |

---

*End of API Contract Specification.*
