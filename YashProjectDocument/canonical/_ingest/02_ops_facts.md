# TalentSphere — Extracted Operational, Stack, Module & Deployment Facts

> **Source Documents**: `MASTER_TRUTH_MATRIX.md`, `MODULE_MANIFEST.md`, `LOCAL_SETUP_GUIDE.md`, `OPERATIONAL_RUNBOOK.md`, `INCIDENT_RUNBOOKS.md`, `SEED_DATA_GUIDE.md`, `CURRENT_STATE_AND_ACTION_PLAN.md`, `QUICK_PREVIEW.md`, `system/README.md`, `backend/README.md`, `frontend/README.md`, `frontend/typedoc.json`.  
> **Extraction Standard**: Faithful transcription of hard facts with zero invented values. Stale or contradictory claims are explicitly attributed. Absent details are marked `[RECONSTRUCT: <what>]`.

---

## 1. Tech Stack Pins

| Component / Layer | Technology | Exact Version Pin | Stated Location / Source | Notes / Status |
|---|---|---|---|---|
| **Frontend Framework** | React | `19.2.5` | `MASTER_TRUTH_MATRIX.md` §12.1, `package.json` | Stated as `^18.2.0` in historical `frontend/README.md` |
| **DOM Renderer** | react-dom | `19.2.5` | `MASTER_TRUTH_MATRIX.md` §12.1 | Canonical |
| **Frontend Routing** | react-router-dom | `7.14` | `MASTER_TRUTH_MATRIX.md` §12.1 | Stated as `^6.23.0` in `frontend/README.md`; Wouter `3.7.1` in SSOT v3.1.0 rejected |
| **State Management** | @reduxjs/toolkit | `2.11` (or `^2.11.2`) | `MASTER_TRUTH_MATRIX.md` §12.1, `frontend/README.md` | Redux state slices |
| **Redux Bindings** | react-redux | `9` | `MASTER_TRUTH_MATRIX.md` §12.1 | Canonical |
| **Supabase Client** | @supabase/supabase-js | `2.105` | `MASTER_TRUTH_MATRIX.md` §12.1 | Primary PostgREST client |
| **HTTP Client** | axios | `1.15` (or `^1.6.8`) | `MASTER_TRUTH_MATRIX.md` §12.1, `frontend/README.md` | API gateway client |
| **UI Motion / Animation** | framer-motion | `12.38` (or `^11.18.2`) | `MASTER_TRUTH_MATRIX.md` §12.1, `frontend/README.md` | UI animations |
| **Icons** | lucide-react | `latest` (or `^0.378.0`) | `MASTER_TRUTH_MATRIX.md` §12.1, `frontend/README.md` | Component iconography |
| **Realtime Client** | socket.io-client | `4.8` | `MASTER_TRUTH_MATRIX.md` §12.1 | Present in deps; Supabase Realtime used in practice |
| **CSS Framework** | tailwindcss | `4.2` | `MASTER_TRUTH_MATRIX.md` §12.1 | Tailwind v4 config |
| **Build Tool / Bundler** | vite | `7` | `MASTER_TRUTH_MATRIX.md` §12.1 | Frontend build |
| **Language (Frontend)** | typescript | `5.7` | `MASTER_TRUTH_MATRIX.md` §12.1 | Strict TypeScript |
| **Unit Test Runner** | vitest | `4.1` | `MASTER_TRUTH_MATRIX.md` §12.1 | 136-137 test files |
| **E2E Test Runner** | playwright | `latest` | `MASTER_TRUTH_MATRIX.md` §12.1 | 28 spec files |
| **Backend Runtime** | Java / JDK | `21` / `26` | `CLAUDE.md`, `CURRENT_STATE_AND_ACTION_PLAN.md` | Target Java 21; JDK 26 present in workspace |
| **Backend Framework** | Spring Boot | `3.2.5` | `backend/README.md`, `MASTER_TRUTH_MATRIX.md` | Spring Boot 3 microservices |
| **API Gateway** | Spring Cloud Gateway | `2023.0.1` | `backend/README.md` | Gateway routing engine |
| **OpenAPI Docs** | springdoc-openapi | `2.5.0` | `backend/README.md` | OpenAPI 3.1 / Swagger UI |
| **JWT Library** | jjwt | `0.12.5` | `backend/README.md` | JWT verification |
| **Node.js Runtime** | Node.js | `18+` / `Node 20-compatible` | `QUICK_PREVIEW.md`, `MODULE_MANIFEST.md` | CDP transport & build |
| **Container Engine** | Docker Engine | `20+` | `LOCAL_SETUP_GUIDE.md` | Local container runtime |
| **Database (Primary)** | PostgreSQL / Supabase | PostgreSQL (50 tables) | `MASTER_TRUTH_MATRIX.md`, `0001_initial_baseline.sql` | ADR-003 Unified PostgreSQL baseline |
| **Database (Secondary/Hist.)**| MongoDB | `7.0` | `system/README.md` | Historical per-service datastore |
| **Cache Store** | Redis | `7` | `system/README.md` | Session & rate limiting |
| **Message Broker** | RabbitMQ | `3.13` | `system/README.md` | Asynchronous event exchange |
| **Search Engine** | Elasticsearch | `8.15` | `system/README.md`, `MASTER_TRUTH_MATRIX.md` | Search indexing |
| **Browser Extension** | Chrome Extension | Manifest V3 (MV3) | `MODULE_MANIFEST.md`, `MASTER_TRUTH_MATRIX.md` | 5,922 files |

---

## 2. Ports Registry

| Service / Component Name | Port | Protocol / Path | Stated Location / Source | Status / Classification |
|---|---|---|---|---|
| **Web Gateway (Nginx)** | `80` | HTTP | `system/README.md` | Historical / Docker edge |
| **Frontend Dev Server** | `3000` / `5173` | HTTP | `QUICK_PREVIEW.md`, `LOCAL_SETUP_GUIDE.md` | Vite dev server |
| **Mock API Server** | `3001` (or `3002`) | HTTP | `QUICK_PREVIEW.md` | `MOCK_PORT` dev mock server |
| **PostgreSQL (Primary DB)** | `5432` | TCP | `LOCAL_SETUP_GUIDE.md` | Supabase / Postgres container |
| **RabbitMQ Broker** | `5672` | AMQP | `system/README.md` | Event broker |
| **Redis Cache** | `6379` | TCP | `system/README.md` | Rate limiting / cache |
| **api-gateway** | `8080` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Cloud Gateway |
| **auth-service** | `8081` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **user-service** | `8082` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **profile-service** | `8083` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **job-service** | `8084` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **application-service** | `8085` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **company-service** | `8086` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **notification-service** | `8087` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **search-service** | `8088` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **analytics-service** | `8089` | HTTP | `MASTER_TRUTH_MATRIX.md` | Active Spring Boot Service |
| **gamification-service** | `8090` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **challenge-service** | `8091` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **lms-service** | `8092` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **video-service** | `8093` | HTTP | `MASTER_TRUTH_MATRIX.md` | Active Spring Boot Service |
| **file-service** | `8094` | HTTP | `MASTER_TRUTH_MATRIX.md` | Active Spring Boot Service |
| **messaging-service** | `8096` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service (ADR-004) |
| **chat-service** | `8096` | HTTP | `system/README.md`, `MODULE_MANIFEST.md` | Orphaned source (ADR-004) |
| **networking-service** | `8097` | HTTP | `MASTER_TRUTH_MATRIX.md`, `backend/README.md` | Active Spring Boot Service |
| **payment-service** | `8098` | HTTP | `MASTER_TRUTH_MATRIX.md` | Active Spring Boot Service (ADR-005) |
| **Elasticsearch** | `9200` | HTTP | `system/README.md` | Search backend |
| **MongoDB** | `27017` | TCP | `system/README.md` | Historical datastore |
| **ai-service** | `[RECONSTRUCT: port]` | HTTP (`/api/ai/**`) | `MASTER_TRUTH_MATRIX.md` §9.3 | Route exists in Gateway |
| **service-parent** | `[RECONSTRUCT: port]` | N/A (Root POM) | `MASTER_TRUTH_MATRIX.md` | Parent Maven POM |
| **shared-security** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md` | Shared security library |
| **shared-messaging** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md` | Shared messaging library |
| **shared-resilience** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md` | Shared resilience library |
| **contracts** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md`, `system/README.md` | Shared API contracts (`ApiResponse`) |
| **schemas** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md` | Shared schema definitions |
| **shared** | `[RECONSTRUCT: port]` | N/A (Library) | `MASTER_TRUTH_MATRIX.md`, `system/README.md` | Feature flags & common config |
| **bom** | `[RECONSTRUCT: port]` | N/A (BOM) | `system/README.md` | Bill of Materials POM |

---

## 3. Module Manifest & Services

### 3.1 Spring Boot Services Inventory (27-28 Modules in Reactor / Tree)

| Module / Service Directory | Classification | Scope / Purpose | Owned Endpoints / Events / Contracts |
|---|---|---|---|
| `services/api-gateway` | Active Reactor | Reverse proxy, JWT HMAC validation, rate limiting | `lb://*` routing, `/api/**`, CORS, rate limiting filters |
| `services/auth-service` | Active Reactor | User authentication & token management | `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/health` (local creds disabled by default per ADR-001) |
| `services/user-service` | Active Reactor | User identity and base accounts | `/api/users/**`, listens to `user.registered` event |
| `services/profile-service` | Active Reactor | Candidate and recruiter extended profiles | `/api/profiles/**`, skills, experiences, educations |
| `services/job-service` | Active Reactor | Job posting lifecycle and search cache | `/api/jobs/**`, company job listings, status events |
| `services/application-service` | Active Reactor | Job application tracking and review | `/api/applications/**`, application status updates |
| `services/company-service` | Active Reactor | Employer profiles and verification | `/api/companies/**`, company registration & settings |
| `services/notification-service`| Active Reactor | Push, email, and digest notifications | `/api/notifications/**`, RabbitMQ event consumer |
| `services/search-service` | Active Reactor | Elasticsearch indexing and search querying | `/api/search/**` |
| `services/analytics-service` | Active Reactor | Platform metrics and event ingestion | `/api/analytics/**`, operational analytics |
| `services/gamification-service`| Active Reactor | XP calculations, badges, leaderboard ranks | `/api/gamification/**`, XP ledger transactions |
| `services/challenge-service` | Active Reactor | Coding challenges and evaluation logic | `/api/challenges/**`, submission scoring |
| `services/lms-service` | Active Reactor | Courses, lessons, module progress tracking | `/api/lms/**` (Gateway with Supabase fallback) |
| `services/video-service` | Active Reactor | Video calling / interview infrastructure | `/api/video/**` (WebRTC placeholder / stub) |
| `services/file-service` | Active Reactor | Secure file upload and S3 proxying | `/api/files/**`, signature checks, MIME allowlist |
| `services/messaging-service` | Active Reactor | Canonical direct messaging service | `/api/messages/**`, conversation lifecycle (ADR-004) |
| `services/networking-service` | Active Reactor | Connections, invitations, suggestions | `/api/networking/**`, connection requests |
| `services/payment-service` | Active Reactor | Billing and subscriptions (Demo mode) | `/api/payments/**`, synthetic sessions (ADR-005) |
| `services/chat-service` | **Orphaned Source** | Legacy chat implementation | `/api/v1/chat/*` (Excluded from Maven reactor; to be retired per ADR-004) |
| `services/service-parent` | Maven Parent | Root POM dependency management | Parent POM configuration |
| `services/bom` | Maven BOM | Dependency version management | Version lock catalog |
| `services/shared-security` | Shared Library | Security filters, HMAC validators, headers | `MandatoryEnvironmentPostProcessor`, auth filters |
| `services/shared-messaging` | Shared Library | RabbitMQ event serialization / producers | `talentsphere.events` exchange models |
| `services/shared-resilience`| Shared Library | Circuit breakers and retry policies | Resilience4j configurations |
| `services/contracts` | Shared Library | Common DTOs and API response models | `ApiResponse<T>` wrapper |
| `services/schemas` | Shared Library | Schema validation objects | Shared DTO definitions |
| `services/shared` | Shared Library | Feature flags and global error handlers | `Feature.java`, `GlobalExceptionHandler` |
| `apps/backend` | **Legacy Monolith Stub**| Target modular-monolith shell | Preserved under ADR-002; non-runnable shell |

---

## 4. Environment Variables Catalog

> **Security Guard**: Credential values are strictly suppressed. Names and operational purposes only.

| Variable Name | Purpose / Function | Configuration Scope / File Location |
|---|---|---|
| `POSTGRES_USER` | Local PostgreSQL superuser username | Root `.env` (Docker compose) |
| `POSTGRES_PASSWORD` | Local PostgreSQL superuser password | Root `.env` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `POSTGRES_HOST` | Hostname for local PostgreSQL container (`postgres`) | Root `.env` (Docker compose) |
| `MONGO_USER` | MongoDB admin username | Root `.env` (Docker compose) |
| `MONGO_PASSWORD` | MongoDB admin password | Root `.env` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `RABBITMQ_USER` | RabbitMQ broker username | Root `.env` (Docker compose) |
| `RABBITMQ_PASSWORD` | RabbitMQ broker password | Root `.env` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `RABBIT_USER` / `RABBIT_PASSWORD` | Legacy RabbitMQ credential keys | Flagged in `MODULE_MANIFEST.md` for migration to `RABBITMQ_*` |
| `REDIS_HOST` | Redis cache hostname (`redis`) | Root `.env` (Docker compose) |
| `CORS_ORIGIN` | Allowed CORS origin URL (`http://localhost:5173`) | Root `.env` (Backend / Gateway) |
| `NODE_ENV` | Node runtime environment (`development` / `production`) | Root `.env`, CI workflow |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key ID for file uploads | Root `.env` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `AWS_SECRET_ACCESS_KEY`| AWS S3 secret access key for file uploads | Root `.env` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `AWS_REGION` | AWS S3 deployment region (e.g. `us-east-1`) | Root `.env` |
| `S3_BUCKET` | AWS S3 storage bucket name | Root `.env` |
| `VITE_SUPABASE_URL` | Supabase API endpoint URL | `apps/frontend/.env.local` |
| `VITE_SUPABASE_ANON_KEY`| Supabase public anonymous API key | `apps/frontend/.env.local` `[CREDENTIAL PRESENT in LOCAL_SETUP_GUIDE.md - value suppressed]` |
| `VITE_SUPABASE_STORAGE_BUCKET_AVATARS` | Supabase storage bucket name for user avatars (`avatars`) | `apps/frontend/.env.local` |
| `VITE_SUPABASE_STORAGE_BUCKET_RESUMES` | Supabase storage bucket name for PDF resumes (`resumes`) | `apps/frontend/.env.local` |
| `VITE_SUPABASE_STORAGE_BUCKET_LOGOS` | Supabase storage bucket name for company logos (`company-logos`) | `apps/frontend/.env.local` |
| `VITE_APP_NAME` | Application display title (`TalentSphere`) | `apps/frontend/.env.local` |
| `VITE_APP_URL` | Public frontend URL (`http://localhost:5173` or `3000`) | `apps/frontend/.env.local` |
| `VITE_API_URL` | Base URL for API Gateway (`http://localhost:8080`) | `apps/frontend/.env.local` |
| `JWT_SECRET` | Shared HMAC secret for API Gateway JWT token verification | `services/api-gateway`, K8s `talentsphere-secrets` |
| `MOCK_PORT` | Custom port override for the dev mock server (`3001`/`3002`)| `QUICK_PREVIEW.md` |
| `NON_PRODUCTION_DATABASE_URL` | Target Postgres DB connection URL for non-prod seed execution | `SEED_DATA_GUIDE.md` |
| `TALENTSPHERE_SEED_ENV` | Non-production environment scope for legacy Python seed script | `SEED_DATA_GUIDE.md` (`development`, `test`, `ci`) |
| `ALLOW_DESTRUCTIVE_SEED_DATA` | Mandatory literal token for destructive seed script truncation | `SEED_DATA_GUIDE.md` (`I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA`) |
| `TALENTSPHERE_SEED_DB_HOST` | Database host for legacy Python seed runner | `SEED_DATA_GUIDE.md` |
| `TALENTSPHERE_SEED_DB_USER` | Database user for legacy Python seed runner | `SEED_DATA_GUIDE.md` |
| `TALENTSPHERE_SEED_DB_PASSWORD` | Database password for legacy Python seed runner | `SEED_DATA_GUIDE.md` `[CREDENTIAL PRESENT in SEED_DATA_GUIDE.md - value suppressed]` |
| `ALLOW_REMOTE_DEV_SEED` | Override token for remote non-production seed runs | `SEED_DATA_GUIDE.md` |
| `X-Service-Secret` | Shared internal secret header for inter-service communication | `system/README.md` |
| `SERVICE_ROLE_KEY` / `service_role_token` | Admin Supabase service-role token for scheduler runs | Guarded against frontend leakage; used in CI / CronJobs |

---

## 5. Local Setup Procedures

### Option 1: Mock Server + Frontend (Fastest Preview — ~3-5 Minutes)
```bash
# 1. Navigate to frontend directory and install dependencies
cd apps/frontend
npm install

# 2. Run mock API server (port 3001) and frontend dev server (port 3000) together
npm run dev:mock

# 3. Access in browser
# URL: http://localhost:3000
# Credentials: demo@talentsphere.dev / demo123
```

### Option 2: Frontend Read-Only Mode (Minimal Env)
```bash
cd apps/frontend
cat > .env.local << EOF
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
VITE_APP_NAME=TalentSphere
VITE_APP_URL=http://localhost:3000
EOF

npm run dev
# App starts on http://localhost:3000 with local mock data fallbacks
```

### Option 3: Local PostgreSQL + Hybrid Stack (~15 Minutes)
```bash
# 1. Prepare environment configuration
cp .env.example .env
cd apps/frontend && cp .env.example .env.local && cd ../..

# 2. Start PostgreSQL container via Docker Compose
docker-compose up -d postgres

# 3. Apply baseline database schema (50 tables)
CONTAINER_ID=$(docker ps --filter "name=ts-postgres" --format "{{.ID}}")
docker cp supabase-schema.sql $CONTAINER_ID:/tmp/schema.sql
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -f /tmp/schema.sql

# 4. Optional: Seed initial non-production data
docker cp seed-data.sql $CONTAINER_ID:/tmp/seed.sql
docker exec -e PGPASSWORD=localdev123 ts-postgres psql -U postgres -d talentsphere -f /tmp/seed.sql

# 5. Start frontend
cd apps/frontend
npm install
npm run dev
# Access: http://localhost:5173
```

### Option 4: Supabase Cloud Integration
```bash
# 1. Link project using Supabase CLI
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 2. Push schema to Supabase cloud
supabase db push

# 3. Configure apps/frontend/.env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# 4. Start frontend
cd apps/frontend && npm run dev
```

---

## 6. Deployment, Infrastructure & Schedulers

### 6.1 Container & Orchestration Specifications

| Service / Container | Base Image / Runtime | Port Binding | Configuration & Volume Mounts |
|---|---|---|---|
| `ts-postgres` | PostgreSQL 15+ / Supabase | `5432:5432` | Volume: `/var/lib/postgresql/data`, Database: `talentsphere` |
| `redis` | Redis 7 | `6379:6379` | API cache and rate limiting key store |
| `mongodb` | MongoDB 7.0 | `27017:27017` | Historical per-service datastore |
| `rabbitmq` | RabbitMQ 3.13 | `5672:5672` | Event exchange: `talentsphere.events` |
| `elasticsearch` | Elasticsearch 8.15 | `9200:9200` | Search service indexing |
| `api-gateway` | Java 21 / Spring Cloud Gateway | `8080:8080` | Route mapping, JWT validation, rate limiting |
| `talentsphere-web` | Node 20 / Nginx (built dist) | `3000:80` / `5173` | Production web bundle / SPA |
| `k8s-services` | Kubernetes Base Manifests | ClusterIP | Consumes runtime Secret: `talentsphere-secrets` |

### 6.2 Scheduled Automation / CronJobs

| Job Name / Script | Cron Schedule | Script Path / Command | Operational Purpose |
|---|---|---|---|
| **Saved-Search Digest Discovery** | Daily / Scheduled | `npm run test:saved-search-digest-discovery` (`scripts/discover-saved-search-digests.mjs`) | Scans saved job criteria against new postings; generates candidate match queues |
| **Notification Digest Runner** | Periodic / Hourly | `npm run test:notification-digests` (`scripts/run-notification-digests.mjs`) | Aggregates unread notifications into batched digest deliveries per user preferences |
| **Networking Reminders** | Daily | `npm run test:networking-reminders` (`scripts/run-networking-reminders.mjs`) | Identifies stale pending connection requests and schedules reminder notifications |
| **Scheduler Audit Helper** | CI / Pre-run | `npm run test:scheduler-audit` (`scripts/scheduler-audit.mjs`) | Validates dry-run safety, idempotency keys, and audit logging into `audit_log` |

### 6.3 Backup & Recovery SLA (Operational Runbook Target)

| Logical Domain | Backup Mechanism | Frequency | Retention | Recovery SLA |
|---|---|---|---|---|
| **Unified DB (`platform`)** | Point-in-Time Recovery (PITR) | Continuous WAL + Snapshots | 30 days | RTO: 4 hours, RPO: 1 hour |
| **Identity (`auth`)** | Hourly WAL + Daily Snapshot | Hourly / Daily | 7 days | RTO: 4 hours, RPO: 1 hour |
| **User Data (`profiles`)** | Daily Snapshot | Daily | 30 days | RTO: 4 hours, RPO: 1 hour |
| **Marketplace (`jobs`)** | Daily Snapshot | Daily | 30 days | RTO: 4 hours, RPO: 1 hour |
| **Payments (`billing`)** | Hourly WAL + Daily Snapshot | Hourly / Daily | 30 days | RTO: 4 hours, RPO: 1 hour |

---

## 7. Seed Data Catalog

> **Scope**: The canonical `seed-data.sql` populates 5 test personas and realistic domain entities into the unified 50-table schema. Destructive execution requires `SET app.seed_environment = 'development';` and `SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';`.

| Entity / Domain | Seed Count | Purpose & Personas Covered |
|---|---|---|
| **User Personas** | 5 Users | `alice.dev@talentsphere.test` (Talent/Dev), `bob.recruiter@talentsphere.test` (Recruiter), `carol.student@talentsphere.test` (Student/Talent), `david.power@talentsphere.test` (Power User/Instructor), `eve.admin@talentsphere.test` (Platform Admin) |
| **Companies** | 3 Companies | Tech, Fintech, Energy enterprise profiles with full branding |
| **Jobs** | 6 Postings | 5 published jobs, 1 closed/expired summer internship |
| **Job Applications** | 3 Applications | PENDING, INTERVIEW, and REJECTED status funnel verification |
| **Connections** | 3 Rows | 2 accepted peer connections, 1 pending connection request |
| **Messages & Threads** | 4 Messages | 2 distinct conversations, attachment support, unread status testing |
| **Content Moderation** | 2 Reports | `content_reports` table; PENDING and UNDER_REVIEW Trust & Safety triage |
| **LMS Courses & Lessons**| 3 Courses / 9 Lessons | Published courses, free preview vs locked lessons, completion tracking |
| **Skill Challenges** | 2 Challenges | Easy & Medium algorithm challenges, sample test cases, submissions |
| **Gamification** | 6 Badges / 4 XP Txns | Leaderboard ranking entries, milestone badge awards, XP ledger events |
| **Billing / Payments** | 3 Plans / 1 Sub | Free, Pro, Enterprise tiers; 1 active Pro subscription with mock txns |
| **Notifications** | Multiple rows | Connection requests, application updates, system reminders |
| **Profiles & Resumes** | 5 Profiles | Skills, work experiences, educations, certifications, projects, languages |
| **Operational State** | Tables seeded | `audit_log`, `system_settings`, `product_analytics_events`, `saved_job_searches`, `hidden_explore_jobs` |

---

## 8. Incident Response & Operational Runbooks

### 8.1 Source-Backed Incident Runbooks (`INCIDENT_RUNBOOKS.md`)

| Incident Type | Symptoms | Response & Verification Steps |
|---|---|---|
| **API Route Contract Drift** | CI contract failure; Gateway route mismatch | 1. Run `npm run report:api-contracts`.<br>2. Inspect `docs/API_CONTRACT_MISMATCH_REPORT.md` and controller annotations.<br>3. Correct route or Gateway prefix.<br>4. Re-generate and commit report. |
| **OpenAPI Payload Drift** | OpenAPI validation failure; missing `$ref` | 1. Run `npm run report:api-openapi` and `npm run validate:api-openapi-contract`.<br>2. Replace untyped `Map<String, Object>` with explicit DTOs.<br>3. Re-generate `docs/API_OPENAPI_CONTRACT.json`. |
| **Auth / Gateway Security Drift**| `npm run validate:auth-contract` fails; loose route matching | 1. Run `npm run validate:auth-contract`.<br>2. Restore Supabase Auth as primary provider.<br>3. Ensure exact public-route regex matches; restore normalized `ROLE_*` header forwarding and rate limits. |
| **Production Secret / Safe Error**| `npm run validate:security-contract` fails; raw errors leaked | 1. Run `npm run validate:security-contract`.<br>2. Ensure strict secret check on startup.<br>3. Verify `GlobalExceptionHandler` sanitizes user-facing error payloads.<br>4. Check K8s manifests consume `talentsphere-secrets`. |
| **File Upload Security** | Upload validation fails; MIME spoofing | 1. Run `npm run validate:security-contract`.<br>2. Restore extension-to-MIME allowlist and binary magic signature checks in `FileService.java`.<br>3. Verify EICAR / script rejection tests. |
| **Scheduler Automation Failure** | CronJob failure; missing audit records | 1. Run `npm run test:scheduler-audit`, `npm run test:notification-digests`, `npm run test:networking-reminders`.<br>2. Enforce `--commit` requirement for mutations.<br>3. Ensure audit rows written to `audit_log`. |
| **Extension Regression** | Extension build fails; remote sync leakage | 1. Run `npm run test:extension-messaging`, `npm run test:extension-storage-migrations`, `npm run test:extension-contract`.<br>2. Enforce local-only storage (no `chrome.storage.sync` or network XHR).<br>3. Sanitize diagnostics export. |
| **Data Ownership / Schema Drift**| `npm run validate:data-ownership` fails | 1. Run `npm run validate:data-ownership`.<br>2. Ensure every frontend `.from()` table is classified in `data-ownership-manifest.json`.<br>3. Align RLS, index, and owner metadata. |
| **Deployment Reference Drift** | K8s / Compose references orphaned service | 1. Run `npm run validate:module-manifest` and `npm run validate:infrastructure-manifest`.<br>2. Ensure `chat-service` is excluded from deployable lists.<br>3. Align Gateway `lb://` targets to active modules. |
| **Observability Contract Drift** | Critical alert / dashboard panel unlinked | 1. Run `npm run validate:observability-contract`.<br>2. Verify `critical-alerts.json` and `critical-flows-dashboard.json` link to current runbooks.<br>3. Mark unverified runtime metrics explicitly. |
| **Frontend Build / Validation** | Vitest failure, TypeScript build failure | 1. Run `npm run lint`, `npm run test:unit`, `npm run build`.<br>2. Fix source regressions; ensure `typedSupabase` boundary is maintained. |
| **CI Security Scan Failure** | Trivy / npm audit high/critical CVEs | 1. Run `npm run validate:security-contract`, `npm audit --audit-level=high`.<br>2. Upgrade dependencies; fix Dockerfile vulnerabilities. |
| **Admin Dashboard Degraded** | Admin panels display unverified live state | 1. Run `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts ...`.<br>2. Ensure explicit labels (`mock`, `inferred`, `live`, `degraded`).<br>3. Sanitize audit logs. |

### 8.2 Operational Infrastructure Runbooks (`OPERATIONAL_RUNBOOK.md`)

| Incident Scenario | Diagnostic Command | Immediate Remediation Steps |
|---|---|---|
| **High CPU Usage** | `kubectl top pods -n talentsphere` | 1. Check for infinite loops or missing DB indexes in logs.<br>2. Scale deployment: `kubectl scale deployment <name> --replicas=3`.<br>3. Restart pods: `kubectl rollout restart deployment/<name>`. |
| **DB Pool Exhaustion** | `psql -c "SELECT count(*) FROM pg_stat_activity"` | 1. Terminate idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle'`.<br>2. Enable PgBouncer / Supavisor connection pooling. |
| **Pod CrashLoopBackOff** | `kubectl describe pod <name>` / `kubectl logs --previous` | 1. Check missing environment variables or JWT secrets.<br>2. Check disk space and volume mounts.<br>3. Rollback: `kubectl rollout undo deployment/<name>`. |
| **Bundle Load Failure** | `curl -I http://<endpoint>/assets/index.js` | 1. Rebuild web bundle (`npm run build`).<br>2. Invalidate CDN cache and check CORS headers.<br>3. Restart web server / ingress pod. |
| **Circuit Breaker Open** | `curl http://<service>/actuator/health` | 1. Inspect downstream dependency.<br>2. Reset breaker: `curl -X POST http://<service>/actuator/circuitbreakers/<name>/reset`. |

---

## 9. Architectural Decisions (ADR Register)

| Decision ID | Topic | Choice / Direction Accepted | Rationale |
|---|---|---|---|
| **ADR-001** | Primary Identity Provider | Supabase Auth is canonical primary identity authority; API Gateway uses HMAC `JWT_SECRET` verifier. | Standardizes session management, RLS token passing, and disables vulnerable default local credentials. |
| **ADR-002** | Backend Architecture Topology | Modular monolith first with extractable domain boundaries; Java service tree preserved as source evidence. | Eliminates unnecessary microservice distributed overhead while maintaining clean domain boundaries. |
| **ADR-003** | Database Schema Authority | Migration-first unified Supabase / PostgreSQL baseline (`0001_initial_baseline.sql` / `supabase-schema.sql` = 50 tables). | Resolves multi-database split-brain by establishing a single relational source of truth with RLS enforcement. |
| **ADR-004** | Messaging Domain Boundary | `messaging-service` is active canonical messaging domain; `chat-service` is orphaned and slated for retirement/merge. | Removes duplicate chat/messaging implementations and prevents data fragmentation. |
| **ADR-005** | Payment Mode & Monetization | Explicit Demo Mode for billing until provider-backed payment gateway and webhooks are verified. | Prevents fake transaction security risks while enabling complete user workflow testing. |
| **ADR-006** | Chrome Extension Sync | Extension storage remains strictly local-only (`chrome.storage.local`); no remote sync or network exfiltration. | Protects candidate privacy, resumes, and credentials from unverified cloud sync leakage. |

---
