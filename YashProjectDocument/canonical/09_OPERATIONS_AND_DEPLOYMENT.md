# TalentSphere — Operations & Deployment Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: Rebuild baselines 09, 01; `docker-compose.yml`, `infra/k8s/`, `scripts/run-*.mjs`.  
> **Governing ADRs**: ADR-002 (Maven Reactor & Service Topology), ADR-003 (Migration Authority Baseline), ADR-005 (Demo Mode Billing Lifecycle).

---

## 1. Infrastructure Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT TOPOLOGY                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                    Nginx Ingress (:80)                   │        │
│  │              TLS Termination + Reverse Proxy              │        │
│  └────────────────────────┬────────────────────────────────┘        │
│                           │                                          │
│            ┌──────────────┼──────────────┐                          │
│            │              │              │                          │
│            ▼              ▼              ▼                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │  React SPA   │ │   Gateway    │ │  Chrome Ext  │               │
│  │  :3000/:5173 │ │    :8080     │ │   (MV3)      │               │
│  └──────┬───────┘ └──────┬───────┘ └──────────────┘               │
│         │                │                                          │
│         │ Direct PostgREST    │ Feign RPC + RabbitMQ               │
│         ▼                ▼                                          │
│  ┌──────────────┐ ┌──────────────────────────────────┐            │
│  │   Supabase   │ │     26 Spring Boot Services      │            │
│  │  PostgreSQL  │ │     Ports 8081-8098               │            │
│  │  + Auth      │ │     + Redis :6379                 │            │
│  │  + Realtime  │ │     + RabbitMQ :5672              │            │
│  └──────────────┘ │     + Eureka :8098                │            │
│                    └──────────────────────────────────┘            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Container Orchestration

### 2.1 Docker Compose (`docker-compose.yml` at repo root)

| Service | Image/Build | Port | Health Check |
|---|---|---|---|
| `frontend` | React SPA (Vite build) | 3000 | HTTP GET `/` |
| `gateway` | Spring Cloud Gateway | 8080 | HTTP GET `/api/v1/auth/health` |
| `redis` | `redis:7` | 6379 | `redis-cli ping` |
| `rabbitmq` | `rabbitmq:3.12-management` | 5672 / 15672 | `rabbitmq-diagnostics check_running` |

**Note**: Supabase is external (hosted); not containerized locally.

### 2.2 Development Workflow

```bash
# Frontend with mock API (recommended for dev)
cd apps/frontend && npm run dev:mock

# Or separately:
cd apps/frontend && npm run mock-server   # terminal 1 (port 3001)
cd apps/frontend && npm run dev           # terminal 2 (port 5173)

# Full validation suite
npm run validate:all
```

---

## 3. Kubernetes Deployment

### 3.1 Manifest Structure

```
infra/k8s/base/
├── infrastructure.yaml            # Namespace, Ingress, NetworkPolicy
├── kustomization.yaml             # Kustomize entry point
├── notification-digest-cronjobs.yaml  # Scheduled digest CronJobs
├── service-template.yaml          # Reusable Deployment + Service template
└── services/
    ├── api-gateway.yaml
    ├── auth-service.yaml
    ├── user-service.yaml
    ├── profile-service.yaml
    ├── job-service.yaml
    ├── application-service.yaml
    ├── company-service.yaml
    ├── notification-service.yaml
    ├── search-service.yaml
    ├── gamification-service.yaml
    ├── challenge-service.yaml
    ├── lms-service.yaml
    ├── video-service.yaml
    ├── file-service.yaml
    ├── messaging-service.yaml
    ├── networking-service.yaml
    ├── payment-service.yaml
    ├── recruiter-service.yaml
    ├── discovery-service.yaml
    └── ai-service.yaml
```

### 3.2 Service Template (`service-template.yaml`)
Reusable Kubernetes Deployment + Service manifest:
- **Deployment**: Replicas, resource limits, envFrom (Secrets/ConfigMaps), liveness/readiness probes
- **Service**: ClusterIP, port mapping
- **Probes**: HTTP GET `/{service}/health` endpoints

### 3.3 Infrastructure Resources (`infrastructure.yaml`)
- **Namespace**: Dedicated project namespace
- **Ingress**: Nginx Ingress Controller with TLS termination
- **NetworkPolicy**: Service-to-service communication rules

---

## 4. Background Schedulers (5 Jobs)

| # | Scheduler Script | Schedule | Purpose | Output |
|---|---|---|---|---|
| 1 | `run-notification-digests.mjs` | Daily | Batch pending unread notifications into email/push digests | `notification_digest_items` processed |
| 2 | `discover-saved-search-digests.mjs` | Daily | Match new jobs against saved candidate searches; queue alerts | Alert notifications |
| 3 | `run-networking-reminders.mjs` | Daily | Identify stale connection requests; issue nudge notifications | Connection reminders |
| 4 | `run-kpi-aggregations.mjs` | Hourly | Roll up `product_analytics_events` into aggregate metrics | KPI summary rows |
| 5 | `scheduler-audit.mjs` | Daily | Audit scheduler health; verify all jobs executed successfully | Audit log entry |

### 4.1 Kubernetes CronJob Manifest
`notification-digest-cronjobs.yaml` defines CronJob resources for schedulers 1-4. Scheduler 5 (audit) runs after the others as a dependent job.

---

## 5. Alerting & Monitoring (12 Alerts)

### 5.1 Alert Categories

| Category | Alerts | Threshold |
|---|---|---|
| **Service Health** | Gateway down, service unavailable | 2 consecutive failures |
| **Rate Limiting** | Token bucket exhausted, Redis connection lost | > 80% bucket utilization |
| **Database** | RLS policy violation spike, connection pool exhaustion | > 10 violations/min, > 90% pool |
| **Authentication** | JWT verification failures, refresh token abuse | > 5 failures/min |
| **Messaging** | RabbitMQ queue depth, message delivery failures | > 1000 queued, > 5% failure rate |
| **Scheduler** | Digest job failure, KPI aggregation timeout | Any failure |
| **Financial** | Demo mode violation attempt, unauthorized charge | Any occurrence |
| **Security** | Secret detected in source, extension telemetry attempt | Any occurrence |

### 5.2 Health Check Endpoints
Every microservice exposes `GET /api/v1/{service}/health`:
- Used by Docker Compose `healthcheck` directives
- Used by Kubernetes liveness/readiness probes
- Used by Spring Cloud Gateway for circuit-breaker decisions

---

## 6. Port Allocation Matrix

| Port | Subsystem | Access Level |
|---|---|---|
| **80** | Nginx Ingress | Public |
| **3000 / 5173** | React Frontend (Vite Dev) | Local Development |
| **3001** | Mock API Server | Local Development |
| **5432** | PostgreSQL (Supabase) | Direct DB |
| **5672 / 15672** | RabbitMQ / Admin UI | Internal |
| **6379** | Redis 7 | Internal |
| **8080** | Spring Cloud Gateway | Primary Compute Entry |
| **8081-8097** | Spring Boot Services | Internal |
| **8098** | Eureka Discovery | Internal |
| **9200** | Elasticsearch (optional) | Internal |

---

## 7. Build Pipeline

### 7.1 Frontend Build
```bash
cd apps/frontend
npm install          # Install dependencies
tsc && vite build    # TypeScript check + Vite production build
```
- **Module Federation**: Host `talentsphere_host`, exposes `./AuthComponents`
- **PWA**: via `vite-plugin-pwa`
- **Code Splitting**: Dynamic route imports for all 22 pages

### 7.2 Backend Build
```bash
mvn clean install    # Build all 33 Maven modules (reactor)
```
- Java 21, Spring Boot 3.3.0
- Shared libraries compiled first, then services in dependency order

### 7.3 Full Validation
```bash
npm run validate:all # 20 .mjs validators — must all pass before deployment
```

---

## 8. Migration Authority

| Artifact | Purpose |
|---|---|
| `supabase-schema.sql` | Authoritative DDL (50 tables, 119 RLS, 15 enums, 29 triggers, 5 functions, 116 indexes) |
| `infra/db/migrations/0001_initial_baseline.sql` | Ordered migration baseline (mirrors schema) |
| `seed-data.sql` | Test/dev seed data |
| `npm run report:db-types` | Auto-generated TypeScript types from schema |

**Schema change workflow**:
1. Edit `supabase-schema.sql` (source of truth)
2. Create ordered migration in `infra/db/migrations/`
3. Run `npm run validate:all` to verify consistency
4. Run `npm run report:db-types` to regenerate TypeScript types

---

## 9. Module Registry

`module-manifest.json` — **28 entries**:
- 26 active Spring Boot service modules (in Maven reactor)
- 1 orphaned module (`chat-service`)
- 1 retired stub (`apps/backend`)

Enforced by `validate-module-manifest.mjs`.

---

## 10. Root Package Scripts (53 Total)

| Script Category | Count | Examples |
|---|---|---|
| Validation | 22 | `validate:all`, `validate:auth`, `validate:security` |
| Testing | 12 | `test:unit`, `test:e2e`, `test:a11y`, `test:contrast`, `test:keyboard` |
| Build | 8 | `build`, `build:frontend`, `build:backend` |
| Development | 6 | `dev`, `dev:mock`, `mock-server` |
| Database | 3 | `report:db-types`, `db:migrate`, `db:seed` |
| Schedulers | 2 | `scheduler:run`, `scheduler:audit` |

**No runtime dependencies** in root `package.json` — all dependencies are in `apps/frontend/package.json` or Maven `pom.xml` files.

---

## 11. Comprehensive Seed Data Guide (seed-data.sql)

> **Source**: `reference/SEED_DATA_GUIDE.md` (version 8.0.0, 2026). Preserved in full for zero-loss grounding.
> **Status**: Current operational guide. Validate coverage claims against `seed-data.sql`, `supabase-schema.sql`, and the migration baseline before production use.
> **Danger**: The seed scripts are **destructive** — they truncate application tables before inserting deterministic demo records. Guarded by `npm run validate:seed-data-safety`. **Never run against production or a shared customer database.**

### 11.1 Overview

`seed-data.sql` populates a local, development, test, or CI Supabase/Postgres database with realistic test data covering all user types, workflows, edge cases, and failure scenarios.

### 11.2 User Personas (5 Users)

| Email | Role | Profile Type | Scenario |
|---|---|---|---|
| `alice.dev@talentsphere.test` | Talent | Active Developer | Complete profile, job seeker, networker |
| `bob.recruiter@talentsphere.test` | Recruiter | Active Recruiter | Posting jobs, reviewing applications |
| `carol.student@talentsphere.test` | Talent | Student | Learning, applying to entry-level roles |
| `david.power@talentsphere.test` | Talent | Power User | Expert profile, instructor, premium subscriber |
| `eve.admin@talentsphere.test` | Admin | Platform Admin | System oversight |

> All test users default password: `password123`. Mark each as **Email Confirmed** in Supabase.
> **Unified schema note**: `seed-data.sql` targets the canonical Supabase schema (`infra/db/migrations/0001_initial_baseline.sql` == `supabase-schema.sql`). Legacy feed tables (`feed_posts`, `post_likes`, `post_comments`) are **not** part of the unified schema and are **not seeded**. `scripts/seed_data.py` is a legacy per-service-database runner.

### 11.3 Data Coverage

1. **Profile Data**: skills (varying proficiency), work experience (current & past), education (completed & in-progress), projects (tech-stack arrays), certifications (with expiry dates), languages.
2. **Jobs & Applications**: 6 jobs (active, closed, expired), 3 applications (pending, interview, rejected), 3 companies with full details, salary ranges/benefits/requirements.
3. **Networking**: connections (accepted, pending), real-time messaging conversations, content reports (Trust & Safety moderation workflow).
4. **Learning (LMS)**: 3 courses (published), 9 lessons (free preview & locked), enrollments (in-progress, completed), lesson progress tracking.
5. **Challenges**: 2 coding challenges (easy, medium), submissions (accepted, wrong_answer), execution metrics.
6. **Gamification**: 6 badge types, user badges awarded, XP transactions, leaderboard rankings.
7. **Payments**: 3 subscription plans, active subscription, payment history.
8. **Notifications**: connection requests, application updates, system reminders.

### 11.4 How to Run

**Option 1 — Supabase Dashboard (SQL Editor):** open a reviewed local/dev/test/CI project; declare seed scope first:
```sql
SET app.seed_environment = 'development';
SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';
```
(`app.seed_environment` accepts `local`, `development`, `dev`, `test`, `testing`, or `ci`.) Then run `seed-data.sql` contents (~5–10s). Expected output:
```
NOTICE: SEEDING COMPLETE
NOTICE: Users: 5, Jobs: 6, Courses: 3, Challenges: 2, XP transactions: 4
```

**Option 2 — Supabase CLI:**
```bash
supabase link --project-ref <non-production-project-ref>
psql "$NON_PRODUCTION_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "SET app.seed_environment = 'development'; SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';" \
  -f seed-data.sql
```

**Option 3 — Legacy Python runner (`scripts/seed_data.py`)** targets the legacy per-service databases (`user_db`, `job_db`, `application_db`), **not** the unified Supabase schema. Refuses to run until environment scope + confirmation present:
```bash
TALENTSPHERE_SEED_ENV=development \
ALLOW_DESTRUCTIVE_SEED_DATA=I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA \
TALENTSPHERE_SEED_DB_HOST=localhost TALENTSPHERE_SEED_DB_USER=postgres \
TALENTSPHERE_SEED_DB_PASSWORD=postgres python scripts/seed_data.py
```
Remote dev/test DBs require an additional `ALLOW_REMOTE_DEV_SEED=I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA` override — never use for production.

### 11.5 Important Behavior & Safety

- **User creation limitation**: direct `auth.users` inserts may fail with `NOTICE: Could not insert into auth.users directly`; manually create the 5 users (Auth → Users → Add User) marked **Email Confirmed**, then re-run.
- **Idempotency/scope**: script begins with `TRUNCATE ... CASCADE` (deletes all existing data). Safe only in reviewed local/dev/test/CI. `seed-data.sql` refuses to proceed without `app.seed_environment` + `app.allow_destructive_seed_data`; `seed_data.py` refuses without matching env/confirmation.
- **RLS**: seed runs as `postgres` superuser (bypasses RLS); RLS remains enabled for normal app users.
- **Safety validation**: run `npm run validate:seed-data-safety` after changing seed scripts, this guide, CI, or the manifest. Fails when destructive truncation is unguarded, Python seeding lacks env confirmation, or the guide reintroduces production-unsafe instructions.

### 11.6 Testing Scenarios Covered

- **Empty states**: new user with no profile (create a 6th user manually); jobs with zero applications.
- **Boundary values**: salary $20/hr (intern) → $200k/yr (senior); course prices Free ($0) → Premium ($99.99); progress 0%/10%/45%/100%.
- **Edge cases**: expired job `Intern (Summer 2023)`; David's rejected application (with reason); Carol's pending connection to Alice; unread message in Alice–David conversation; challenge deadlines 5–10 days out; Carol's education ending 2026.
- **Failure scenarios**: apply to an already-closed job (error); accept an already-accepted connection (graceful); enroll in a course twice (block duplicate); submit a challenge after deadline (reject); view another user's private notifications (RLS blocks).
- **Performance**: run script 10× → ~50 users / 60 jobs; test pagination, leaderboard/LMS/challenges scale.

### 11.7 Verification Queries (post-seed)

```sql
SELECT (SELECT count(*) FROM profiles) users, (SELECT count(*) FROM jobs) jobs,
       (SELECT count(*) FROM companies) companies, (SELECT count(*) FROM connections) connections,
       (SELECT count(*) FROM courses) courses, (SELECT count(*) FROM lessons) lessons,
       (SELECT count(*) FROM challenges) challenges;

SELECT up.user_id, p.full_name, p.role,
  (SELECT count(*) FROM skills s WHERE s.profile_id = up.id) skills,
  (SELECT count(*) FROM experiences ex WHERE ex.profile_id = up.id) experiences,
  (SELECT count(*) FROM educations ed WHERE ed.profile_id = up.id) educations
FROM user_profiles up JOIN profiles p ON p.id = up.user_id;

SELECT j.title, j.status, count(a.id) applications,
  count(CASE WHEN a.status = 'PENDING' THEN 1 END) pending,
  count(CASE WHEN a.status = 'INTERVIEW' THEN 1 END) interview,
  count(CASE WHEN a.status = 'REJECTED' THEN 1 END) rejected
FROM jobs j LEFT JOIN job_applications a ON j.id = a.job_id GROUP BY j.id, j.title, j.status;

SELECT p.full_name, l.total_xp, l.rank FROM leaderboard l JOIN profiles p ON l.user_id = p.id ORDER BY l.rank;
```

### 11.8 Cleanup

```sql
-- Quick cleanup (same as script header)
TRUNCATE TABLE
  audit_log, system_settings,
  payments, subscriptions, subscription_plans,
  notification_digest_items, notifications, notification_settings,
  content_reports,
  xp_transactions, user_badges, badges, leaderboard,
  challenge_submissions, challenges,
  lesson_progress, enrollments, lessons, courses,
  messages, conversation_participants, conversations,
  networking_suggestion_preferences, connections,
  product_analytics_events,
  automation_suggestion_audit_events, automation_suggestions, ai_sessions,
  hidden_explore_jobs, saved_job_searches,
  candidate_scorecards, candidate_notes,
  resume_artifacts, resume_export_events,
  application_draft_versions, application_drafts, application_status_events,
  job_applications, job_post_templates, job_post_draft_versions, jobs, companies,
  projects, languages, certifications, educations, experiences, skills,
  user_profiles, profiles
CASCADE;

-- Delete seeded auth users (permanent; admin required)
DELETE FROM auth.users WHERE email LIKE '%@talentsphere.test';
```

> **Cross-check**: this truncate list enumerates the 50 canonical tables (see `03_DATABASE_SPEC.md` §2) and includes `product_analytics_events`.

### 11.9 Expected Data Summary (post-seed)

| Entity | Count | Notes |
|---|---|---|
| Users | 5 | All roles covered |
| Companies | 3 | Tech, Fintech, Energy |
| Jobs | 6 | 5 published, 1 closed/expired |
| Applications | 3 | Mixed statuses |
| Connections | 3 | 2 accepted, 1 pending |
| Messages | 4 | Across 2 conversations |
| Content Reports | 2 | Moderation workflow (pending + under_review) |
| Courses | 3 | Different levels |
| Lessons | 9 | 3 per course |
| Challenges | 2 | Easy & Medium |
| Badges | 6 | Various criteria |
| XP Transactions | 4 | Reference-type aware (app-compatible keys) |
| Subscriptions | 1 | Pro plan active |
