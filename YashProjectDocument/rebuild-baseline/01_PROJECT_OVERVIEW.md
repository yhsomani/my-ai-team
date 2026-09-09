# TalentSphere — Project Overview (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Zero-loss knowledge baseline. Extracted 2026-09-08. Source-of-truth: code > tests > config > schema > docs for implementation facts.

## What TalentSphere Is

Unified career platform integrating professional networking, job marketplace, learning management, and technical challenges into a single cohesive experience. Serves job seekers, recruiters, and administrators through role-based access control and AI-powered assistance.

## User Roles

| Role | Constant | Persona |
|------|----------|---------|
| Job Seeker | `ROLE_USER` | Aisha — find jobs, build profile, learn skills |
| Recruiter | `ROLE_RECRUITER` | Rohan — post jobs, review candidates, track pipeline |
| Admin | `ROLE_ADMIN` | Priya — monitor platform, enforce policies, manage users |
| Developer | (ROLE_USER subset) | Dev — solve challenges, showcase skills |

## Dual-Plane Architecture

### Primary Plane: Supabase
- **Database**: PostgreSQL 15 via Supabase
- **Auth**: Supabase Auth (ADR-001) — JWT-based, email/password + OAuth
- **RLS**: Row-Level Security for tenant isolation (ADR-003) — 119 policies
- **Realtime**: Supabase Realtime for messaging (ADR-004)
- **Data Access**: Direct PostgREST queries from frontend

### Secondary Plane: Spring Boot Microservices
- **Gateway**: Spring Cloud Gateway on port 8080 (ADR-002)
- **Modules**: 26 active Java 21 / Spring Boot 3.3.0 Maven reactor modules
- **Purpose**: Async/heavy compute only (AI analysis, video sessions, file processing, notification digests, KPI aggregation)
- **NOT the primary data path** — frontend talks to Supabase directly for CRUD

### Chrome Extension (Companion)
- MV3 Chrome Extension in `chrome-extension-project/`
- Local-first privacy posture (ADR-006)
- Job tracking, resume matching, page scanning

## Billing Governance

- ADR-005: Explicit DEMO MODE (`billingMode: 'demo'`)
- Stripe integration is scaffolded but NOT live
- All payment flows are simulated

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript + Vite | 19.2.5 / 5.7.3 / 7.x |
| Styling | Tailwind CSS | 4.2.2 |
| State | Redux Toolkit | 2.11.2 |
| Routing | react-router-dom | 7.14.0 |
| Icons | Lucide React | 1.8.0 |
| Animation | Framer Motion | 12.38.0 |
| Design System | Aura (custom primitives) | — |
| Backend | Java + Spring Boot | 21 / 3.3.0 |
| Build | Maven | — |
| Database | PostgreSQL 15 (Supabase) | — |
| Auth | Supabase Auth | — |
| Tests | Vitest (unit) + Playwright (E2E) | 4.1.5 / 1.59.1 |
| Infra | Docker Compose + Kubernetes | — |

## Repository Structure

```
TalentSphere-Unified/
├── apps/frontend/          # React SPA (main UI)
├── services/               # 26 Spring Boot modules + 2 orphans
├── chrome-extension-project/ # MV3 Chrome Extension
├── infra/                  # DB migrations, k8s manifests
├── supabase-schema.sql     # Authoritative database schema (50 tables)
├── seed-data.sql           # Seed data
├── module-manifest.json    # Service registry (28 entries)
├── scripts/                # 20 validators + 5 schedulers
├── docs/                   # All documentation
└── package.json            # Root scripts (53), no runtime deps
```

## Key Constraints

- **Never commit secrets**: `.env*`, `.claude-omniroute/`, `.product_intelligence/`, `documentation-audit/` are git-ignored
- **Schema changes are migration-first**: edit `supabase-schema.sql` + run `infra/db/migrations/`
- **Aura design system**: all shared UI uses `apps/frontend/src/components/shared/Aura*.tsx` primitives
- **TypeScript strict mode** across frontend
- **Test convention**: Vitest in `src/**/*.test.{ts,tsx}`
- **20 automated validators**: `npm run validate:all`
