# TalentSphere — Infrastructure (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Authoritative infrastructure baseline. Extracted 2026-09-08.

## Runtime Architecture

| Component | Port | Notes |
|-----------|------|-------|
| Vite dev server | 3000 | Frontend SPA |
| Mock API server | 3001 | Dev-only mock (`scripts/mock-server.cjs`) |
| Spring Cloud Gateway | 8080 | Routes to backend services |
| Supabase | external | PostgreSQL, Auth, Realtime, Storage |

## Containerization

**`docker-compose.yml`** at repo root defines:
- `frontend` service — React SPA container
- `gateway` service — Spring Cloud Gateway container

## Kubernetes Manifests

**`infra/k8s/base/`**:
- `infrastructure.yaml` — base infra resources (ingress, namespace)
- `kustomization.yaml` — kustomize entry point
- `notification-digest-cronjobs.yaml` — scheduled digest jobs
- `services/` — per-service deployment manifests
- `service-template.yaml` — reusable service template

## Background Schedulers (5)

Run as cron jobs / scheduled processes:
1. `run-notification-digests` — batch email digests
2. `discover-saved-search-digests` — saved-search alert digests
3. `run-networking-reminders` — networking nudge reminders
4. `run-kpi-aggregations` — analytics KPI rollups
5. `scheduler-audit` — audits scheduler health

## Module Registry

**`module-manifest.json`** — 28 entries:
- 26 active Spring Boot service modules (in Maven reactor)
- 1 orphaned/retired module (chat-service)
- 1 retired stub (apps/backend)

## Build & Tooling

- **Root package.json**: 53 scripts, no runtime dependencies
- **20 validators**: `scripts/validate-*.mjs`
- **5 schedulers**: `scripts/run-*.mjs`
- **Maven reactor**: 26 Java 21 / Spring Boot 3.3.0 modules
- **Migration authority**: `infra/db/migrations/0001_initial_baseline.sql`

## Frontend Build Pipeline

- Vite 7 build (target: esnext)
- Module Federation: host `talentsphere_host`, remote entry `remoteEntry.js`, exposes `./AuthComponents`
- PWA support via `vite-plugin-pwa`
- TypeScript strict compilation before build (`tsc && vite build`)

## Dev Workflow

```bash
# Frontend with mock API (recommended for dev)
cd apps/frontend && npm run dev:mock

# Or separately
cd apps/frontend && npm run mock-server   # terminal 1
cd apps/frontend && npm run dev           # terminal 2

# Validate everything
npm run validate:all
```
