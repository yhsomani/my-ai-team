# TalentSphere Problem Discovery & Technical Debt Register (PROBLEMS.md)

> Documentation status: Current living problem register classifying defects, architecture risks, code quality issues, security vulnerabilities, UI/UX gaps, and verification statuses.

---

# PROBLEM-0001 — CI Setup-Node Duplicate Keys & Trivy Action Pin Mismatch

Severity: HIGH
Category: CI / DEPLOYMENT
Status: FIXED
Affected Files: `.github/workflows/talentsphere-ci.yml`, `scripts/validate-security-contract.mjs`

## Problem
CI workflow contained invalid duplicate `with:` blocks under `actions/setup-node@v4` in multiple jobs (`frontend`, `security-scans`, `extension`, `scheduler-scripts`). Additionally, Trivy security action was pinned to `0.24.0` while `validate-security-contract.mjs` required `0.30.0`.

## Evidence
`node scripts/validate-security-contract.mjs` exited with code 1:
`security contract validation failed: ../.github/workflows/talentsphere-ci.yml must contain Trivy action pin`

## Root Cause
Incomplete copy-paste during CI configuration update left duplicate `node-version` blocks and stale action version pins.

## Impact
Blocked CI pipeline execution and prevented automated security validation from passing.

## Fix
Cleaned up duplicate YAML keys in all jobs and updated Trivy action references to `aquasecurity/trivy-action@0.30.0`.

## Verification
`npm run validate:security-contract` passes with exit code 0.

---

# PROBLEM-0002 — Async Promise Race in Challenge Submission Test

Severity: MEDIUM
Category: BUG / TESTING
Status: FIXED
Affected Files: `apps/frontend/src/pages/challenges/ChallengesPage.test.tsx`

## Problem
`ChallengesPage.test.tsx` failed when asserting the submission error toast heading `expect(screen.getByRole('heading', { name: 'Submission failed' }))`.

## Evidence
Vitest output:
`Test Files: 1 failed | 113 passed (114)`
`Tests: 1 failed | 630 passed (631)`

## Root Cause
The test asserted the toast heading immediately after `waitFor(() => expect(submitChallengeSolution).toHaveBeenCalledTimes(1))`. Because `handleSubmit` is an async function, the Promise rejection catch block had not yet scheduled `addToast` on the event loop when the synchronous assertion ran.

## Fix
Moved the heading assertion inside the `await waitFor(...)` callback, allowing the async catch block to complete before verifying toast rendering.

## Verification
`npm run test:unit` passes 114/114 test files and 631/631 tests.

---

# PROBLEM-0003 — God-Project Monolithic Sprawl Across 3 Complex Business Models

Severity: HIGH
Category: ARCHITECTURE
Status: FIXED (Target Architecture & Boundaries Established)
Affected Files: Monorepo root, `services/*`, `apps/frontend/src`

## Problem
A single monorepo combined professional networking (LinkedIn), learning management (Coursera), and coding challenges (HackerRank) without formal domain boundaries or independent team ownership.

## Root Cause
Rapid feature accretion without domain-driven architecture governance.

## Impact
High cognitive load, coupling between unrelated features (e.g., LMS progress triggering Gamification XP triggering Profile Rank), and deployment friction.

## Fix
Established formal domain boundaries in `PROJECT-BOUNDARIES.md` dividing the system into 8 distinct domain teams plus a Platform Foundation team, governed by ADR-001 through ADR-007.

## Verification
`npm run validate:backend-topology-adr`, `npm run validate:data-ownership`, and `npm run test:ia` pass.

---

# PROBLEM-0004 — Competing Authentication Systems (Spring Auth vs Supabase Auth)

Severity: HIGH
Category: SECURITY / ARCHITECTURE
Status: FIXED
Affected Files: `services/auth-service`, `services/api-gateway`, `apps/frontend/src/services/authService.ts`

## Problem
Both Spring `auth-service` and Supabase Auth managed user credentials, creating split session state and potential authentication bypasses.

## Root Cause
Dual backend development tracks without an explicit single source of truth for identity.

## Fix
Adopted ADR-001 designating Supabase Auth as the primary identity provider. Spring `auth-service` returns `410 Gone` for local credentials by default, and `api-gateway` verifies Supabase JWTs with normalized `ROLE_*` header forwarding.

## Verification
`npm run validate:auth-contract` passes.

---

# PROBLEM-0005 — Raw Exception & Database Stack Trace Leakage in API Responses

Severity: HIGH
Category: SECURITY
Status: FIXED
Affected Files: `services/shared/src/main/java/com/talentsphere/shared/GlobalExceptionHandler.java`

## Problem
Backend exception handlers previously returned `e.getMessage()` and internal error prefixes to clients, leaking database schemas and internal implementation details.

## Root Cause
Generic catch blocks directly serializing Java exception strings into API error payloads.

## Fix
Refactored `GlobalExceptionHandler` to return stable, safe error codes (`INTERNAL_ERROR`, `VALIDATION_ERROR`, `INVALID_REQUEST`, `ACCESS_DENIED`) and attach `X-Correlation-ID` for internal log correlation without exposing raw error messages.

## Verification
`npm run validate:security-contract` and shared unit tests pass.

---

# PROBLEM-0006 — Insecure File Uploads & Missing Malware Inspection

Severity: HIGH
Category: SECURITY
Status: FIXED
Affected Files: `services/file-service/src/main/java/com/talentsphere/file/service/FileService.java`

## Problem
File uploads previously accepted user-supplied extensions without validating binary signatures or checking for embedded scripts.

## Root Cause
Relying on client-supplied `Content-Type` headers without deep binary inspection.

## Fix
Implemented magic-byte binary header verification for PDF, PNG, JPEG, WebP, and DOCX files, active HTML/script tag stripping, and an EICAR test malware scanner hook.

## Verification
`npm run validate:security-contract` passes.

---

# PROBLEM-0007 — Destructive Seed Data Truncation Risks

Severity: HIGH
Category: DATA
Status: FIXED
Affected Files: `seed-data.sql`, `scripts/seed_data.py`, `SEED_DATA_GUIDE.md`

## Problem
`seed-data.sql` executed unconditional `TRUNCATE` statements across all tables, creating severe data-loss risks if executed against a production database.

## Root Cause
Missing environment guard rails in SQL scripts.

## Fix
Added session-level environment checks (`app.seed_environment`) requiring explicit local/test confirmation before truncation. The Python runner also enforces non-production host verification.

## Verification
`npm run validate:seed-data-safety` passes.

---

# PROBLEM-0008 — UI Visual & Semantic Token Inconsistencies

Severity: MEDIUM
Category: UI / UX / ACCESSIBILITY
Status: FIXED
Affected Files: `apps/frontend/src/index.css`, atomic components, `LandingPage.tsx`, `JobsPage.tsx`, `PostJobPage.tsx`

## Problem
Ad hoc hex color literals, inconsistent focus states, and low-contrast text elements caused visual drift and failed accessibility audits.

## Root Cause
Absence of automated token validation and disparate styling conventions across feature pages.

## Fix
Standardized the Aura design token system (`--bg-primary`, `--text-primary`, `--accent`), refactored all atomic components, added WCAG 2.1 AA contrast checks, and built `scripts/validate-ui-design-system.mjs` to block future styling drift.

## Verification
`npm run validate:ui-design-system` and `npm run test:contrast:all` pass across Chromium, Firefox, and WebKit.

---

# PROBLEM-0009 — Windows Cross-Platform Path Separator Normalization in Contract & OpenAPI Generators

Severity: MEDIUM
Category: BUILD / TOOLING
Status: FIXED
Affected Files: `scripts/generate-api-contract-report.mjs`, `scripts/generate-openapi-contract.mjs`

## Problem
Contract generation scripts relied on Unix-style `/src/main/java/` path filtering without normalizing Windows `\` path separators, causing `extractBackendRoutes` and `extractOperations` to return 0 active routes and schemas on Windows platforms.

## Root Cause
Direct path string substring comparisons on raw OS file paths without slash normalization.

## Fix
Updated `walk()` in both `generate-api-contract-report.mjs` and `generate-openapi-contract.mjs` to normalize all discovered file paths with `.replaceAll(path.sep, '/')`.

## Verification
`node scripts/generate-api-contract-report.mjs` and `node scripts/generate-openapi-contract.mjs` now correctly discover and generate all 123 active operations and 56 schemas across all platforms. `npm run validate:api-openapi-contract`, `npm run validate:messaging-boundary-adr`, and `npm run validate:payment-mode-adr` pass with exit code 0.

---

# PROBLEM-0010 — Documentation Lifecycle and Manifest Synchronization Gaps

Severity: LOW
Category: DOCUMENTATION / GOVERNANCE
Status: FIXED
Affected Files: `module-manifest.json`, `scripts/validate-docs-lifecycle.mjs`

## Problem
`CURRENT_STATE_AND_ACTION_PLAN.md` and `task.md` were present in the root directory but unclassified in `module-manifest.json`, triggering doc lifecycle validation failures.

## Root Cause
New documentation was authored without updating the central `module-manifest.json` registry.

## Fix
Classified `CURRENT_STATE_AND_ACTION_PLAN.md` as active documentation (`current-action-plan`) and `task.md` as a development artifact (`historical-task-list`) in `module-manifest.json`.

## Verification
`npm run validate:docs-lifecycle` passes with 43 classified Markdown documents.

---

# PROBLEM-0011 — Missing Public Route Registration for Password Reset Flow

Severity: MEDIUM
Category: FRONTEND / NAVIGATION
Status: FIXED
Affected Files: `apps/frontend/src/navigation/featureOwnership.ts`

## Problem
`PublicRoutePath` and `publicRoutePaths` in `featureOwnership.ts` omitted `'/reset-password'` even though it was actively routed in `App.tsx`, causing a discrepancy in feature ownership and route parity definitions.

## Root Cause
Route additions in `App.tsx` were not reflected in the centralized navigation metadata and ownership registry.

## Fix
Added `'/reset-password'` to `PublicRoutePath` union, `publicRoutePaths` array, and added a dedicated `password-reset` ownership definition documenting its purpose, journey value, and Supabase credential reset lifecycle.

## Verification
`npm run test:ia` and `npm run test:unit` in `apps/frontend` pass 100% (19/19 IA tests, 653/653 unit tests).

---

# PROBLEM-0012 — Container Build Layer Incompleteness & Local Script Path Alignment

Severity: HIGH
Category: DEPLOYMENT / BUILD
Status: FIXED
Affected Files: `docker/Dockerfile.service`, `build.bat`, `start-backend.ps1`, `services/bom/pom.xml`, `services/file-service/pom.xml`

## Problem
1. `docker/Dockerfile.service` omitted copying required shared modules (`shared-security`, `shared-messaging`, `shared-resilience`, `schemas`, `service-parent`), causing multi-stage Docker builds to fail.
2. `build.bat` referenced outdated `frontend` paths instead of `apps/frontend`.
3. `start-backend.ps1` referenced service `mongodb` instead of `ts-mongodb` and listed incorrect LMS port 8090.
4. `services/file-service/pom.xml` hardcoded AWS SDK S3 `2.20.0` while `bom/pom.xml` used `2.29.35`.

## Root Cause
Repository restructuring to monorepo/workspace layout (`apps/frontend`) and shared library expansion left legacy references in auxiliary build scripts and Dockerfiles.

## Fix
1. Updated `docker/Dockerfile.service` to install all shared Maven modules (`bom`, `service-parent`, `contracts`, `shared`, `shared-security`, `shared-messaging`, `shared-resilience`, `schemas`).
2. Updated `build.bat` to reference `apps/frontend`.
3. Fixed `start-backend.ps1` service name to `ts-postgres ts-mongodb ts-redis ts-rabbitmq` and LMS port to `8085`.
4. Aligned AWS SDK version across `services/bom/pom.xml` and `services/file-service/pom.xml`.

## Verification
All 20 architecture validators pass, frontend production build completes with 0 errors (`npm run build`), and IA tests pass.

