# TalentSphere Security & DevOps Specification

> Documentation status: Canonical security and DevOps baseline. Reconciled with codebase on 2026-09-08.

## 1. Security Architecture

### 1.1 Authentication & Authorization

```
+------------------+     +-------------------+     +---------------------+
|   Client App     | --> |   Supabase Auth   | --> |   PostgreSQL RLS    |
| (JWT in storage) |     |  (GoTrue Engine)  |     | (119 Policy Checks) |
+------------------+     +-------------------+     +---------------------+
                                   |
                                   v (Bearer Token)
                         +-------------------+
                         | Spring API Gateway|
                         | (JWT Validation)  |
                         +-------------------+
```

#### Multi-Tier Role Model
- `ROLE_USER`: Standard candidate/learner access.
- `ROLE_RECRUITER`: Job posting, applicant pipeline management, candidate scorecards.
- `ROLE_ADMIN`: Platform analytics, user governance, moderation queue, audit log inspect.

### 1.2 Row-Level Security (RLS) Policy Model
- **40 Tables Enforced**: All application tables with personal or privileged data have RLS enabled.
- **119 Active Policies**: Covering SELECT, INSERT, UPDATE, and DELETE operations.
- **Tenant Isolation**: Queries strictly isolate records by `auth.uid() = user_id` or explicit team/organization memberships.

### 1.3 Content Security Policy (CSP) & HTTP Headers

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 2. Infrastructure & Deployment Topology

### 2.1 Containerized Microservices Topology

```
                                 [ Internet ]
                                      |
                                  (HTTPS:443)
                                      v
                         +--------------------------+
                         | Ingress NGINX Controller |
                         +--------------------------+
                                      |
                     +----------------+----------------+
                     | (Port 80)                       | (Port 8080)
                     v                                 v
          +----------------------+          +----------------------+
          |  Frontend React SPA  |          | Spring Cloud Gateway |
          |     (Nginx Pods)     |          |  (Rate Limit / Auth) |
          +----------------------+          +----------+-----------+
                                                       |
        +------------------+------------------+--------+---------+------------------+
        |                  |                  |                  |                  |
        v                  v                  v                  v                  v
+---------------+  +---------------+  +---------------+  +---------------+  +---------------+
|  Auth Service |  |  Job Service  |  |  LMS Service  |  | Challenge Svc |  | Analytics Svc |
|  (Port 8081)  |  |  (Port 8083)  |  |  (Port 8085)  |  |  (Port 8086)  |  |  (Port 8090)  |
+---------------+  +---------------+  +---------------+  +---------------+  +---------------+
```

### 2.2 Docker & Kubernetes Deployments
- **Docker Compose**: Multi-container setup for local environment (`docker-compose.yml`) supporting Gateway, Eureka, Redis 7, RabbitMQ 3.12, and Spring services.
- **Kubernetes**: Helm charts and declarative manifests for production rollouts across dedicated namespaces (`talentsphere-prod`, `talentsphere-staging`).

---

## 3. Automated Validation Pipeline (20+ Quality Gates)

The repository maintains an automated validation framework executing in CI/CD before merges:

| Script Command | Purpose | Target Surface |
|----------------|---------|----------------|
| `validate:data-ownership` | Verifies manifest against database tables | `data-ownership-manifest.json` |
| `validate:schema-migrations` | Verifies baseline migrations & RLS | `0001_initial_baseline.sql` |
| `validate:schema-authority-adr` | Ensures ADR compliance | ADR records & SQL schema |
| `validate:typed-supabase-boundary`| Blocks untyped Supabase imports | `apps/frontend/src/` |
| `validate:seed-data-safety` | Prevents destructive seed execution in prod | `seed-data.sql`, Python scripts |
| `validate:legacy-schema-disposition`| Audits legacy table tracking | `legacy-schema-disposition.json`|
| `validate:feature-inventory` | Validates feature registry match | `routeRegistry.ts` |
| `validate:rbac-guards` | Checks route permissions | `routeRegistry.ts` |
| `validate:aura-tokens` | Enforces design system compliance | Tailwind config & components |
| `validate:test-coverage` | Enforces unit and integration test bar | 136 test suites / 824 unit tests|

---

## 4. Observability, Monitoring & Alerting

### 4.1 Prometheus Metric Instrumentation
- **Spring Actuator**: Exposing `/actuator/prometheus` on all backend microservices.
- **Frontend RUM**: Custom performance tracking on page transitions and API latency.

### 4.2 Production Alert Catalog (12 Core Alerts)

| Alert Rule | Condition | Severity | Action |
|------------|-----------|----------|--------|
| `HighHttp5xxRate` | >2% 5xx errors for 5m | Critical | Page on-call, inspect service logs |
| `ServiceDown` | Up == 0 for 2m | Critical | Restart container, check health check |
| `DatabasePoolExhausted` | Active connections >90% | Warning | Scale connection pool / PgBouncer |
| `HighMemoryUsage` | Memory >85% for 10m | Warning | Scale pod replicas, check heap dump |
| `HighCpuUsage` | CPU >80% for 10m | Warning | Scale horizontal pod autoscaler |
| `RateLimitExceededSpike`| 429s >100/sec for 2m | Warning | Identify offending IP/client |
| `GatewayLatencyHigh` | p95 latency >1000ms for 5m | Warning | Check downstream Feign dependencies |
| `RabbitMqQueueBacklog` | Message count >5000 for 5m | Warning | Scale consumer service pods |
| `RedisHighMemory` | Used memory >80% | Warning | Flush expired keys / expand cluster |
| `RealtimeDropRate` | WS disconnects >10% | Warning | Check Supabase Realtime cluster |
| `AdminLoginSpike` | Admin logins >20 in 5m | Info | Verify security audit trail |
| `CertificateExpiring` | Days to expiry <14 | Warning | Renew TLS cert via Let's Encrypt |

### 4.3 Grafana Dashboard Panels (12 Core Panels)
1. Monorepo Service Health Grid
2. Spring Cloud Gateway Throughput (RPS) & Error Rates
3. PostgreSQL Query Latency (p50, p95, p99)
4. Active User Sessions & Role Distribution
5. Redis Token Bucket Rate Limiting Hits
6. RabbitMQ Exchange Throughput & Queue Depth
7. Supabase Realtime Active Channel Count
8. JVM Heap Allocation & Garbage Collection Pauses
9. Pod CPU/Memory Utilization Heatmap
10. RLS Policy Evaluation Overhead
11. Trust & Safety Moderation Backlog Depth
12. Gamification XP Award Velocity

---

## 5. Incident Response & Operational Runbooks

Codified incident response workflows are documented in `docs/runbooks/INCIDENT_RUNBOOKS.md`:

1. **Sev-1 Outage Runbook**: Immediate failover, communication channel spin-up, status page update.
2. **Database Connection Saturation**: PgBouncer pooling tuning, idle connection reap script execution.
3. **Gateway Circuit Breaker Tripping**: Downstream service isolation, fallback cache validation.
4. **Data Corruption / Rollback**: Point-in-time recovery (PITR) execution from PostgreSQL backups.
5. **Malicious Actor Mitigation**: IP throttling via Cloudflare / Gateway Redis token bucket lockdown.
