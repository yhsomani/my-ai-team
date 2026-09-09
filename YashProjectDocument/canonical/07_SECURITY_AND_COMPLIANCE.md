# TalentSphere — Security & Compliance Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: Rebuild baseline 07, ADRs 001/003/005/006, `validate-security-contract.mjs`, `validate-auth-contract.mjs`.  
> **Credential Hygiene**: `notebooklm_cookies.txt` screened out entirely per master directive.

---

## 1. Security Architecture Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER STACK                              │
├──────────────────────────────────────────────────────────────────────┤
│ Layer 1: Public Ingress    │ Nginx / Vite (TLS, CSP headers)       │
│ Layer 2: Identity          │ Supabase Auth (JWT, OAuth, MFA-ready) │
│ Layer 3: Gateway Edge      │ HMAC JWT verification + Rate limiting  │
│ Layer 4: Route Guard       │ Frontend RBAC route protection         │
│ Layer 5: Database Engine   │ PostgreSQL RLS (119 policies, 50 tbls) │
│ Layer 6: Extension Privacy │ Local-first (ADR-006), zero exfil     │
│ Layer 7: Financial Safety  │ Demo-mode billing guard (ADR-005)     │
│ Layer 8: Secret Hygiene    │ Zero secrets in source control         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Identity & Authentication (ADR-001)

### 2.1 Supabase Auth as Identity SSOT
- **Binding Decision**: ADR-001 — Supabase Auth is the sole login, registration, password reset, and user authentication authority.
- **Backend Auth**: `auth-service` local credential endpoints default-disabled (`AUTH_LOCAL_CREDENTIALS_ENABLED=false` → `410 Gone`).
- **Token Format**: JWT with standard claims (`sub`, `aud`, `exp`, `iat`) + `user_metadata` (role, name).

### 2.2 Authentication Methods
| Method | Status | Notes |
|---|---|---|
| Email + Password | Active | Primary method; Supabase GoTrue handles hashing |
| Google OAuth | Active | OAuth 2.0 via Supabase Auth |
| GitHub OAuth | Active | OAuth 2.0 via Supabase Auth |
| Magic Link | Available | Supabase built-in |
| MFA | Ready | Supabase Auth supports TOTP; not yet enforced |

### 2.3 Session Management
- **Access Tokens**: Short-lived (typically 1 hour), signed by Supabase
- **Refresh Tokens**: Handled transparently by `@supabase/supabase-js` client library
- **Token Storage**: HTTP-only cookies (production) or in-memory (development)

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Three System Roles

```typescript
export const USER_ROLES = {
  USER: 'ROLE_USER',          // Candidates, learners, developers
  RECRUITER: 'ROLE_RECRUITER',// Hiring managers, corporate recruiters
  ADMIN: 'ROLE_ADMIN',        // Platform admins, moderators
} as const;
```

### 3.2 Authorization Enforcement Layers

| Layer | Mechanism | Scope |
|---|---|---|
| **Database** | 119 PostgreSQL RLS policies | Data-level isolation at SQL engine |
| **Frontend** | `RouteGuard` component + `routeRegistry.ts` | Route-level access control |
| **Gateway** | `JwtAuthenticationFilter` + HMAC `JWT_SECRET` | API-level token verification |
| **Service** | `@PreAuthorize` annotations on controllers | Endpoint-level role checks |

### 3.3 Role-Resource Access Matrix

| Resource | ROLE_USER | ROLE_RECRUITER | ROLE_ADMIN |
|---|---|---|---|
| Job listings (read) | ✅ | ✅ | ✅ |
| Job listings (create) | ❌ | ✅ | ✅ |
| Application (submit) | ✅ | ❌ | ❌ |
| Application (review) | Own only | All (company) | All |
| Candidate scorecards | ❌ | ✅ | ✅ |
| Candidate notes | ❌ | ✅ | ✅ |
| Profile (edit own) | ✅ | ✅ | ✅ |
| Profile (edit any) | ❌ | ❌ | ✅ |
| Feature flags | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| Content moderation | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |
| Billing (subscribe) | ❌ | ✅ | ❌ |
| LMS courses | ✅ | ✅ | ✅ |
| Coding challenges | ✅ | ✅ | ✅ |
| Messaging | ✅ | ✅ | ✅ |
| Networking | ✅ | ✅ | ✅ |

---

## 4. Row-Level Security (RLS) — 119 Policies

### 4.1 Zero-Trust Database Model
Every table has RLS explicitly enabled via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Policies evaluate at the PostgreSQL engine level — bypassing application code cannot bypass RLS.

### 4.2 Isolation Model

| Access Pattern | SQL Predicate | Applies To |
|---|---|---|
| **User Owner** | `auth.uid() = user_id` | All user-owned data (profiles, applications, messages, etc.) |
| **Recruiter Gate** | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_RECRUITER')` | Job creation, candidate review, scorecards |
| **Admin Gate** | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_ADMIN')` | Audit log, system settings, user management |
| **Public Read** | `true` (SELECT only) | Jobs, companies, courses, challenges, public profiles |
| **Conversation Member** | `EXISTS (SELECT 1 FROM conversation_participants WHERE ...)` | Messages, conversation history |

### 4.3 Policy Coverage
- **50/50 tables** have RLS enabled (100% coverage)
- **119 total policies** across all tables
- **Zero tables with bypass policies** — no `FORCE ROW LEVEL SECURITY` exemptions

---

## 5. Gateway Security (Spring Cloud Gateway)

### 5.1 JWT Verification
- **Algorithm**: HMAC (`HS256`) via `JWT_SECRET` environment variable
- **Flow**: `JwtAuthenticationFilter` validates JWT signature → extracts `sub` (user ID) and `user_metadata.role` → forwards as `X-User-Id` and `X-User-Role` headers
- **Role Normalization**: Supabase role values mapped to Spring Security constants (`ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`)

### 5.2 Rate Limiting
- **Strategy**: Token bucket via `RedisRateLimiter`
- **Storage**: Redis 7 (port 6379)
- **Scope**: Per-IP and per-API-key rate limits
- **Circuit Breaker**: Resilience4j for downstream service protection

### 5.3 Substring Bypass Defense
- Gateway validates exact prefix matching on public routes to prevent path traversal attacks
- `/api/v1/auth/` prefix is strictly matched; no wildcard or substring matching

---

## 6. Frontend Security Controls

### 6.1 Route Guards
- Protected routes wrapped in `RouteGuard` component
- Checks authenticated session + role before rendering
- Redirects unauthenticated users to `/login`
- Redirects unauthorized users to `/dashboard`

### 6.2 Client-Side Data Handling
- JWT tokens stored in HTTP-only cookies (not `localStorage`)
- Sensitive data never persisted in `localStorage` or `sessionStorage`
- Supabase client configured with `autoRefreshToken: true`

---

## 7. Secret Management & Hygiene

### 7.1 Zero Secrets in Source Control
- **Enforced by**: `validate-security-contract.mjs` via `npm run validate:all`
- **Validated**: No `.env*` files, no API keys, no tokens in any committed file

### 7.2 Gitignore Exclusions
| Pattern | Purpose |
|---|---|
| `.env*` | All environment files |
| `.claude-omniroute/` | AI session data |
| `.product_intelligence/` | Analytics internals |
| `documentation-audit/` | Audit working files |
| `notebooklm_cookies.txt` | **Screened out entirely** — credentials never re-enter documentation |

### 7.3 Environment Variable Handling
- **36 environment variables** defined across services (see `06_BACKEND_SPEC.md`)
- All secrets injected at runtime via environment, never hardcoded
- Docker Compose uses `.env` files (gitignored)
- Kubernetes uses Secret resources

---

## 8. Chrome Extension Privacy (ADR-006)

### 8.1 Local-First Posture
- **Storage**: All scraped job data and resume matches reside in `chrome.storage.local`
- **Zero Exfiltration**: No telemetry, no extracted page contents sent to external endpoints
- **User Consent**: Data leaves the browser only when the user explicitly triggers an action (e.g., save to profile)
- **Content Scripts**: DOM extraction for LinkedIn/Indeed job postings occurs entirely client-side

### 8.2 Privacy Boundary
```
Browser (Extension) ←→ chrome.storage.local (private)
         ↓ (only on explicit user action)
   Supabase Authenticated API Call
```

---

## 9. Financial Safety (ADR-005)

### 9.1 Demo Mode Guard
- **Binding Decision**: ADR-005 — All billing operates in explicit demo mode
- **Configuration**: `billingMode: 'demo'`, `providerBacked: false`
- **Stripe Integration**: SDK scaffolded but inert; no live credentials configured
- **UI Requirement**: All payment surfaces must display "DEMO MODE" badge
- **Charge Protection**: No real charges can be processed in demo mode

### 9.2 Validation
- `validate-payment-mode-adr.mjs` verifies demo mode configuration
- `validate-security-contract.mjs` verifies no live Stripe keys in source

---

## 10. Content Safety & Moderation

### 10.1 Trust & Safety Pipeline
1. **User Report**: `ReportContentModal` → `content_reports` table (status: `pending`)
2. **Admin Triage**: Moderation Queue at `/admin` → investigate → `under_review` → `resolved` / `dismissed`
3. **Audit Trail**: All moderation actions logged to `audit_log`

### 10.2 Report Reasons
| Enum Value | Description |
|---|---|
| `spam` | Unsolicited or repetitive content |
| `harassment` | Abusive or threatening behavior |
| `inappropriate_content` | Violates community guidelines |
| `fraud` | Fake job posting or identity |
| `other` | Miscellaneous |

---

## 11. Compliance & Audit

### 11.1 Audit Logging
- **Table**: `audit_log` — records user actions, resource mutations, and admin operations
- **Fields**: `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSONB), `created_at`
- **Access**: Admin-only (RLS policy)

### 11.2 AI Provenance
- All AI-generated suggestions tagged with `SourceStatusBadge` indicating heuristic nature
- `automation_suggestion_audit_events` tracks all AI action executions
- Transparent disclosure: users are informed suggestions are rule-based, not LLM-generated

### 11.3 Data Ownership
- `data-ownership-manifest.json` tracks table lifecycle and ownership
- Validated by `validate-data-ownership-manifest.mjs`
- Supabase Auth `auth.users` is the canonical user identity source

---

## 12. Security Validation Scripts

| Script | Purpose | Wired into `validate:all` |
|---|---|---|
| `validate-security-contract.mjs` | Verifies zero secrets in source control | ✅ |
| `validate-auth-contract.mjs` | Verifies Supabase Auth SSOT and JWT contract | ✅ |
| `validate-payment-mode-adr.mjs` | Verifies demo mode billing guard | ✅ |
| `validate-messaging-boundary-adr.mjs` | Verifies chat-service retirement | ✅ |
| `validate-legacy-schema-disposition.mjs` | Isolates legacy schema tables | ✅ |

---

## 13. Security Testing

### 13.1 Automated Security Tests
- **E2E**: Playwright tests verify route guard behavior, auth redirect, and role enforcement
- **Validators**: 20 `.mjs` scripts verify ADR compliance, secret hygiene, and schema integrity
- **Extension**: 7 test suites verify local-first privacy (no network exfil)

### 13.2 Manual Security Review Points
1. JWT token handling in browser (HTTP-only cookies)
2. RLS policy coverage (50/50 tables verified)
3. Gateway path traversal defenses
4. File upload sanitization (file-service)
5. WebSocket connection authentication (Supabase Realtime)
