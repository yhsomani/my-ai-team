# TalentSphere — Testing Strategy (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Authoritative testing baseline. Extracted 2026-09-08.

## Test Stack

| Layer | Framework | Location |
|-------|-----------|----------|
| Frontend unit | Vitest 4.1.5 | `apps/frontend/src/**/*.test.{ts,tsx}` |
| Frontend E2E | Playwright 1.59.1 | `apps/frontend/tests/*.spec.ts` |
| Backend | JUnit + Spring Boot Test | `services/*/src/test/` |
| Schedulers | Node test runner | `scripts/*.test.mjs` |
| Validators | Node test runner | `scripts/validate-*.mjs` |
| Extension | Node test runner | `chrome-extension-project/` (7 suites) |

## Test Inventory

| Metric | Count |
|--------|-------|
| Frontend unit test files | 137 |
| Frontend unit tests | 846 |
| E2E spec files | 28 |
| E2E scenarios | ~235 |
| Scheduler suites | 5 |
| Extension suites | 7 |
| Repository validators | 22 (20 .mjs + 2 .sh) |

## Frontend Unit Tests (846, Vitest)

**Pattern**: Each `services/*.ts` has a corresponding `*.test.ts`. Pages have co-located test files.

### Navigation & Routing Tests
- `navigation/featureOwnership.test.ts` — verifies feature→route ownership mapping
- `navigation/routeRegistry.test.ts` — verifies route definitions match page registry

### Service Tests (each with .test.ts)
adminService, aiService, applicationService, authService, challengeService,
companyService, dashboardService, entitlementService, fileUploadService,
gamificationService, jobService, lmsService, messagingService,
networkingService, notificationDigestService, notificationService,
paymentService, profileService, recruiterService, settingsService,
trustAndSafetyService

### Component & Page Tests
Co-located in `src/pages/**` and `src/components/**`.

## E2E Tests (28 specs, 114 test() declarations, Playwright)

Key specs:
- `accessibility-semantics.spec.ts` — semantic HTML + ARIA (chromium)
- `color-contrast.spec.ts` — WCAG 2.1 AA contrast (all projects)
- `keyboard-navigation.spec.ts` — full keyboard operation
- Plus standard user-journey specs (auth, jobs, messaging, networking, etc.)

## Specialized A11y Test Scripts

| Script | Purpose |
|--------|---------|
| `npm run test:a11y` | Accessibility semantics, chromium only |
| `npm run test:contrast` | Color contrast, chromium only |
| `npm run test:contrast:all` | Color contrast, all browsers |
| `npm run test:keyboard` | Keyboard navigation, chromium only |

## Backend Tests

- Per-service JUnit tests in `services/*/src/test/`
- Contract/health tests verify service boot + endpoint reachability
- Not exhaustively enumerated in this baseline (backend test inventory is a known partial gap — see Technical Debt)

## Scheduler Tests (5)

`scripts/run-notification-digests.test.mjs`, `scripts/discover-saved-search-digests.test.mjs`, `scripts/run-networking-reminders.test.mjs`, `scripts/run-kpi-aggregations.test.mjs`, `scripts/scheduler-audit.test.mjs`

## Repository Validators (22 total: 20 .mjs + 2 .sh)

- 20 `.mjs` validators run via **`npm run validate:all`**:
  `validate-module-manifest`, `validate-infrastructure-manifest`, `validate-docs-lifecycle`, `validate-runbooks`, `validate-observability-contract`, `validate-ui-design-system`, `validate-feature-flags`, `validate-backend-topology-adr`, `validate-schema-authority-adr`, `validate-schema-migrations`, `validate-seed-data-safety`, `validate-typed-supabase-boundary`, `validate-legacy-schema-disposition`, `validate-messaging-boundary-adr`, `validate-payment-mode-adr`, `validate-data-ownership`, `validate-auth-contract`, `validate-security-contract`, `validate-write-fallback-safety`, `validate-openapi-contract`.
- 2 `.sh` validators exist but are **not** wired into `validate:all`:
  `validate-coverage.sh` (coverage thresholds), `validate-docs.sh` (markdown link/syntax checks).

All 22 enforce:
- Schema-to-code alignment (types match DB columns)
- ADR compliance (e.g., `validate-messaging-boundary-adr.mjs` enforces chat-service retirement resolution)
- Module manifest integrity
- Documentation/schema/seed consistency
- Frontend type ↔ schema entity alignment

**Run (20 .mjs)**: `npm run validate:all`

## Test Commands

```bash
# Frontend unit tests
cd apps/frontend && npm run test:unit

# All frontend E2E
cd apps/frontend && npm run test:e2e

# A11y / contrast / keyboard subsets
npm run test:a11y / test:contrast / test:keyboard

# All repository validators
npm run validate:all

# Schedulers
cd scripts && npm test
```
