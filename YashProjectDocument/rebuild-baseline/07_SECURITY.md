# TalentSphere — Security Architecture (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Authoritative security baseline. Extracted 2026-09-08.

## Identity & Authentication

- **SSOT**: Supabase Auth (ADR-001)
- **Token format**: JWT with standard claims + `user_metadata`
- **Supported methods**: Email/Password, OAuth (Google, GitHub)
- **Session management**: Refresh tokens handled transparently by `@supabase/supabase-js`

## Role-Based Access Control (RBAC)

### Three Core Roles
1. `ROLE_USER` — Standard candidate/job seeker
2. `ROLE_RECRUITER` — Employer/hiring team member
3. `ROLE_ADMIN` — Platform administrator

### Authorization Enforcement
- **Database layer**: 119 PostgreSQL Row-Level Security (RLS) policies enforce data boundaries at the SQL engine level. Bypassing client code cannot bypass RLS.
- **Frontend layer**: Protected routes guarded by `RouteGuard` component checking user role.
- **Backend layer**: Spring Security filters validate JWT claims on Gateway/service ingress.

## Row-Level Security (RLS) Baseline

- Every table has RLS explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Isolation model:
  - Candidates can only mutate their own records (`auth.uid() = user_id`)
  - Recruiters can view applications for jobs belonging to their company
  - Admins have read/write overrides on moderation and system audit tables
  - Public tables (`jobs`, `companies`, `courses`) permit unrestricted SELECT for active records

## Secret Management & Hygiene

- **Rule**: Zero secrets in source control.
- Enforced via `.gitignore`:
  - `.env*` (all environment files)
  - `.claude-omniroute/`
  - `.product_intelligence/`
  - `documentation-audit/`
  - `notebooklm_cookies.txt` (sensitive credential dump)

## Extension Privacy Model

- ADR-006: Chrome Extension runs with a **local-first privacy posture**.
- Scanned job data and resume matches reside in `chrome.storage.local`.
- No telemetry or extracted page contents are sent to external endpoints without explicit user opt-in.
