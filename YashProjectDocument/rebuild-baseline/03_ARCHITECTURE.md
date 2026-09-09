# TalentSphere — Architecture (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Extracted 2026-09-08. Verified against ADRs 001-006.

## Architecture Decision Records

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Supabase Auth as identity SSOT | Accepted |
| ADR-002 | Spring Boot microservices as secondary plane | Accepted |
| ADR-003 | RLS for tenant isolation (119 policies) | Accepted |
| ADR-004 | Supabase Realtime for messaging; retire chat-service | Accepted |
| ADR-005 | Demo-mode billing until Stripe provider verified | Accepted |
| ADR-006 | Chrome extension local-first privacy posture | Accepted |

## System Architecture

### Primary Data Plane (Supabase)
```
React SPA → PostgREST → PostgreSQL 15
         → Supabase Auth (JWT)
         → Supabase Realtime (messaging)
         → Supabase Storage (files)
```

### Secondary Compute Plane (Spring Boot)
```
React SPA → Spring Cloud Gateway (:8080) → Microservices
                                            ├── ai-service
                                            ├── application-service
                                            ├── auth-service
                                            ├── challenge-service
                                            ├── company-service
                                            ├── file-service
                                            ├── gamification-service
                                            ├── job-service
                                            ├── lms-service
                                            ├── messaging-service
                                            ├── networking-service
                                            ├── notification-service
                                            ├── payment-service
                                            ├── profile-service
                                            ├── search-service
                                            ├── user-service
                                            └── video-service
```

### Companion Plane (Chrome Extension)
```
MV3 Extension → chrome.storage (local-first)
             → Optional: Supabase queries (authenticated)
             → Page scanning, job tracking, resume matching
```

## Frontend Architecture

### Stack
- React 19.2.5 SPA (no SSR)
- Vite 7 with Module Federation (exposes `./AuthComponents`)
- TypeScript 5.7 strict
- Tailwind CSS 4.2
- Redux Toolkit 2.11
- react-router-dom v7.14

### Module Federation
- Host name: `talentsphere_host`
- Exposed module: `./AuthComponents` → `LoginPage.tsx`
- Shared: react, react-dom, react-router-dom, @reduxjs/toolkit (singletons)

### Design System: Aura
18 shared component primitives (+ barrel `index.ts`) in `apps/frontend/src/components/shared/`:
AuraButton, AuraCard, AuraImage, AuraInput, AuraModal, AuraNavbar,
AuraStatusBar, AuraThemeProvider, Badge, EmptyState, GlassCard,
PageHeader, ResponsiveLayout, Skeleton, SourceStatusBadge, Tabs,
Toast, Toggle, index (barrel). Total 34 UI components across `apps/frontend/src/components/`.

### Route Structure
- **3 public routes**: `/`, `/login`, `/register`
- **19 protected routes** (from `routeRegistry.ts`): `/dashboard`, `/jobs`, `/jobs/:id`, `/jobs/post`, `/candidates`, `/lms`, `/challenges`, `/networking`, `/messaging`, `/ai`, `/career-path`, `/profile`, `/profile/:userId`, `/resume`, `/portfolio`, `/notifications`, `/settings`, `/admin`, `/billing`
- **CONFLICT — PRD vs code**: PRD §5.2 lists 20 protected routes using legacy paths `/post-job`, `/ai-assistant`, `/ai-career-path`, and `/admin/analytics` + `/admin/trust-safety` sub-routes. Code (`routeRegistry.ts`) uses `/jobs/post`, `/ai`, `/career-path`, and a single `/admin` route. Code is truth (19 routes); PRD paths preserved as intent-history.

### Navigation
- Route registry: `apps/frontend/src/navigation/routeRegistry.ts`
- Feature ownership: `apps/frontend/src/navigation/featureOwnership.test.ts`
- Command search: role-filtered, keyboard navigation

### State Management
- Redux Toolkit with slices per feature
- Supabase client for direct DB queries
- Optimistic UI updates

### Services Layer (21 services, 22 test files)
adminService, aiService, applicationService, authService, challengeService,
companyService, dashboardService, entitlementService, fileUploadService,
gamificationService, jobService, lmsService, messagingService,
networkingService, notificationDigestService, notificationService,
paymentService, profileService (+crud test), recruiterService, settingsService,
trustAndSafetyService

### Lib Layer (~60 files)
Workflow analytics recorders, AI drafts/prefill/audit, xpLedger, dateUtils,
csvExport, unifiedSearch, historyManager, productAnalytics, supabaseClient

## Backend Architecture

### Spring Boot Modules (26 active in reactor)
| Service | Controller Count | Purpose |
|---------|-----------------|---------|
| ai-service | 1 | AI analysis, career path, chat, insights, match |
| application-service | 2 | Application CRUD, events, status |
| auth-service | 2 | Authentication, JWKS |
| challenge-service | 1 | Challenge CRUD, submissions |
| company-service | 1 | Company management |
| file-service | 1 | File upload/download/delete |
| gamification-service | 1 | XP, badges, leaderboard |
| job-service | 1 | Job CRUD, search, featured |
| lms-service | 1 | Courses, enrollments, lessons |
| messaging-service | 1 | Conversations, messages |
| networking-service | 1 | Connections, feed, posts |
| notification-service | 1 | Notifications, read status |
| payment-service | 1 | Checkout, plans, history |
| profile-service | 1 | Profile CRUD, education, experience |
| search-service | 1 | Job/profile search |
| user-service | 2 | User CRUD, list |
| video-service | 1 | Video sessions, tokens |

### Orphaned/Retired Modules
| Module | Status | Resolution |
|--------|--------|------------|
| chat-service | Retired | Retire or merge useful realtime adapter code into messaging-service |
| apps/backend | Retired | Non-runnable stub shell; preserved as artifact |

### Validators (22 total: 20 .mjs + 2 .sh)
`scripts/validate-*.mjs` and `scripts/validate-*.sh` — enforce schema-to-code alignment, ADR compliance, messaging boundary, module manifest integrity.

## API Architecture

### 123 Operations (from OpenAPI Contract)
Organized by domain:
- **Admin**: feature-flags (enable/disable/reset/reset-all/categories/core/enabled), public/stats, stats
- **AI**: analyze-resume, career-path, chat, health, insights, match-job, results, save-results
- **Applications**: create, events, status, count, health, by-job, by-user
- **Auth**: jwks, health, login, register
- **Challenges**: CRUD, submissions
- **Companies**: CRUD
- **Files**: upload, download, delete, health
- **Gamification**: XP, badges, leaderboard
- **Jobs**: list, create, get, featured, health, recommended, search, advanced-search
- **LMS**: courses CRUD, enroll, enrollment, drop, start, learning-paths, lessons, complete, slug, health, enrollments
- **Messages**: conversation, health, read, send, unread-count
- **Networking**: connect, connections, accept, feed, health, posts, like, suggestions
- **Notifications**: read, health, user, read-all, unread-count
- **Payments**: checkout, health, history, plans, status
- **Profile**: CRUD, education, experience, skills
- **Recruiter**: applications/recent, stats
- **Search**: health, jobs, profiles, profiles/skills
- **Users**: list, get, update, delete, health
- **Video**: schedule, session, start, end, token

### API Routing
- Frontend → Supabase PostgREST (primary CRUD)
- Frontend → Spring Cloud Gateway :8080 (secondary compute)
- Gateway → individual Spring Boot services

## Database Architecture

See [04_DATABASE.md](04_DATABASE.md) for full schema.

## Security Architecture

See [06_SECURITY.md](06_SECURITY.md) for full security model.

## Infrastructure Architecture

See [08_INFRASTRUCTURE.md](08_INFRASTRUCTURE.md) for deployment model.
