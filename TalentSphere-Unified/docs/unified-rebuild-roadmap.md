# Unified Production Rebuild Roadmap

## 1. Final Unified Architecture

Target structure:

```text
project-root/
  apps/
    frontend/
    backend/
  modules/
    auth/
    user/
    jobs/
    applications/
    companies/
    profiles/
    search/
    messaging/
    networking/
    learning/
    challenges/
    gamification/
    notifications/
    payments/
    files/
    video/
    analytics/
    ai/
    shared/
      api/
      errors/
      events/
      security/
      persistence/
      observability/
  types/
  utils/
  config/
  infra/
  scripts/
```

Backend target: one Spring Boot application with internal feature modules, one API surface, one security stack, one response schema, one error handler, and one integration test runtime.

Frontend target: one Vite React app with one active `src` tree. The nested legacy app at `apps/frontend/src/src` must be merged into canonical feature routes and deleted.

## 2. System Inventory

### Keep

- `apps/frontend/src` active React application.
- `services/shared`: shared API envelope, exceptions, config, feature flags.
- `services/contracts` and `services/schemas`: contract/schema source of truth.
- Core domains: auth, user, profile, job, application, company, search, messaging, networking, lms, challenge, gamification, notification, payment, file, video, ai.
- `infra`, `docker`, and root scripts that remain relevant after consolidation.

### Merge

- All `services/*-service` modules into `apps/backend` plus `modules/<domain>`.
- `api-gateway` routing/security behavior into the single backend edge layer.
- Duplicate frontend route/component tree from `apps/frontend/src/src` into canonical `apps/frontend/src`.
- Duplicate LMS controllers: `LmsController` and `CourseController`.
- Duplicate navigation/layout components: `layouts/Sidebar`, `components/layout/Sidebar`, `AuraSidebar`, `ResponsiveLayout`, `AuraNavbar`.

### Rewrite

- Authentication flow: replace split Supabase/backend login behavior with one backend-owned auth flow or one explicit external identity adapter.
- API routing: normalize every endpoint to `/api/v1/<resource>`.
- Module communication: replace Feign/service-to-service calls with in-process module services and domain events.
- Error handling: single `ApiResponse<T>`/problem-details style response.
- Tests: add real unit and integration coverage per module.

### Delete

- Empty `Startup/TalentSphere/spring-boot`.
- Empty/broken `modules/*` placeholder folders until they are replaced by real modules.
- Per-service application bootstrap classes after migrating into `apps/backend`.
- Gateway-only proxy routes after backend consolidation.
- Generated stale docs/build outputs when they reference removed source.
- All Stitch-related code, configs, docs, and packages were removed.

## 3. Duplication Map

- Frontend app shells: `apps/frontend/src` vs `apps/frontend/src/src`.
- Layout/navigation: multiple sidebars and navbar systems.
- LMS: `/api/v1/lms` controller and `/api/courses` controller overlap.
- Auth: Supabase auth state plus backend `/auth/login` calls create split source of truth.
- API clients: active `apps/frontend/src/services/*` plus legacy `apps/frontend/src/src/services/api.ts`.
- Response/error handling: service-local exception handlers plus shared handler.
- Health endpoints: manually implemented in many controllers instead of standardized actuator checks.

## 4. Broken Integration Map

- Auth frontend calls `/api/v1/auth/*`; backend exposed `/api/auth/*`. Fixed by moving auth controllers to `/api/v1/auth`.
- Company frontend calls `/api/v1/companies/*`; backend currently exposes `/api/companies/*`.
- Application frontend calls `/api/v1/applications/apply`; backend has `/api/applications` without `/apply`.
- Messaging frontend calls `/api/v1/messages/conversations`; backend exposes `/api/messages/conversation`.
- Gamification frontend calls `/api/v1/gamification/*`; backend exposes `/api/gamification/*`.
- Search backend exposes `/api/search/*`; gateway and future frontend should use `/api/v1/search/*`.
- Dashboard service calls unversioned paths such as `/jobs/recommended` and `/challenges/trending`.
- Payment/company clients use mixed `/v1/*` paths while other clients include `/api/v1/*`.

## 5. Removed Components + Reason

- `apps/stitch-desktop`: unrelated desktop/MCP app; violated one-project directive.
- `tools/stitch-mcp-server`: unrelated MCP server; violated one-project directive.
- `apps/frontend/src/services/stitchService.ts`, `apps/frontend/src/lib/stitchMCP.ts`, `apps/frontend/src/pages/ai/StitchWorkbench.tsx`, `apps/frontend/src/components/mcp`: removed unreachable Stitch integration.
- `/api/v1/stitch` nginx route and Stitch setup scripts/config: removed dead integration.
- Stale generated frontend docs and build artifacts referencing removed Stitch code.

## 6. Merged Features + Strategy

- Auth: keep backend auth as canonical; remove split assumptions by normalizing API paths and later replacing Supabase-only session handling with an identity adapter.
- Jobs/applications: merge job listing, featured jobs, search, application submission, application status, and counts into `modules/jobs` plus `modules/applications`.
- Learning/challenges: keep LMS courses/enrollments/progress and challenge submission; merge duplicate course controllers.
- Social: merge messaging, chat, and networking into separate modules under one backend runtime.
- Platform operations: merge notifications, files, video, payments, search, AI, and analytics as modules with shared observability.

## 7. Fixed Integration Issues

- Frontend build now succeeds after removing Stitch dependencies and routes.
- Root npm workspace no longer references deleted MCP/desktop packages.
- Root package lock no longer references the removed MCP workspace.
- Auth controllers now expose `/api/v1/auth`, matching frontend calls and gateway prefix expectations.
- Root Maven POM was corrected earlier to reference real `services/*` modules instead of empty `modules/*` placeholders.

## 8. Production Readiness Checklist

- One backend runtime under `apps/backend`.
- One frontend runtime under `apps/frontend`.
- All API paths use `/api/v1`.
- All controllers return the same response envelope.
- All errors use one global error format.
- Unit tests for every module service.
- Integration tests for auth, jobs, applications, messaging, LMS, challenge submission, payments, and notifications.
- Health/readiness/liveness endpoints.
- Structured JSON logs with correlation IDs.
- Redis-backed cache policy for read-heavy endpoints.
- Async worker model for video, notifications, AI, and file processing.
- Pagination on every list endpoint.
- CI pipeline running frontend build, backend tests, integration tests, and dependency audit.

## 9. Risks And Limitations

- A full rebuild cannot be honestly marked complete until the services are migrated into one backend runtime and integration tests pass.
- The current backend still has path inconsistencies beyond auth.
- Maven is not installed on the current PATH, so backend packaging could not be verified here.
- npm audit reports four high-severity vulnerabilities.
- The nested frontend app still represents duplicate code until feature parity migration is complete.

## 10. Step-By-Step Implementation Roadmap

1. Freeze feature work and use this document as the migration control plan.
2. Create `apps/backend` Spring Boot application and move shared config, security, error handling, and response schema first.
3. Move `auth` and `user` modules into the backend app; add auth integration tests.
4. Move `profile`, `company`, `jobs`, and `applications`; normalize endpoints and DTOs.
5. Move `lms`, `challenges`, and `gamification`; merge duplicate LMS controllers.
6. Move `messaging`, `chat`, and `networking`; replace service calls with in-process module services/events.
7. Move `search`, `notifications`, `payments`, `files`, `video`, `ai`, and `analytics`.
8. Replace gateway proxy behavior with backend routing/security filters.
9. Merge `apps/frontend/src/src` features into canonical `apps/frontend/src`; delete legacy tree.
10. Add integration tests for every frontend service client against backend endpoints.
11. Add caching, async queues, pagination, health checks, structured logging, and CI.
12. Delete old `services/*-service` bootstraps after the new backend passes all tests.
