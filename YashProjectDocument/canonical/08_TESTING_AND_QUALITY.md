# TalentSphere — Testing & Quality Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: Rebuild baselines 08, 15; test files in `apps/frontend/`, `scripts/`, `chrome-extension-project/`.  
> **Canonical Counts**: 846 unit tests (137 files), 28 E2E specs (114 declarations, ~235 scenarios), 22 validators, 5 schedulers, 7 extension suites.

---

## 1. Test Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TALENTSPHERE QUALITY PYRAMID                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          ┌──────────┐                               │
│                          │   E2E    │  28 specs, 114 tests         │
│                         ┌┤Playwright├┐ ~235 scenarios              │
│                        ┌┤└──────────┘ ├┐                           │
│                       ┌┤│ Integration │ ├┐                         │
│                      ┌┤││  (Backend   ││ ├┐                        │
│                     ┌┤│││  JUnit)     │││ ├┐                       │
│                    ┌┤││││  Validators ││││ ├┐                      │
│                    ││││││  22 scripts │││││ │                      │
│                    │├┤│││  Schedulers │││├┤ │                      │
│                    ││││││  5 scripts  │││││ │                      │
│                    ││├┤││  Extension  ││├┤│ │                      │
│                    ││││││  7 suites   │││││ │                      │
│                    │└┤│││             ││├┘ │                      │
│                     └┤││   Frontend   ││├┘                       │
│                      └┤│  846 Unit   │├┘                          │
│                       └┤  137 files  ├┘                            │
│                        └┤  (Vitest)  ├┘                             │
│                         └──────────┘                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Stack

| Layer | Framework | Location | Count |
|---|---|---|---|
| Frontend Unit | Vitest 4.1.5 | `apps/frontend/src/**/*.test.{ts,tsx}` | 846 tests / 137 files |
| Frontend E2E | Playwright 1.59.1 | `apps/frontend/tests/*.spec.ts` | 28 specs / 114 declarations |
| Backend | JUnit + Spring Boot Test | `services/*/src/test/` | Per-service (partial inventory) |
| Schedulers | Node test runner | `scripts/*.test.mjs` | 5 suites |
| Validators | Node test runner | `scripts/validate-*.mjs` | 20 `.mjs` + 2 `.sh` |
| Extension | Node test runner | `chrome-extension-project/` | 7 suites |

---

## 3. Frontend Unit Tests (846 Tests, Vitest)

### 3.1 Test Distribution

| Category | File Count | Test Count | Pattern |
|---|---|---|---|
| Service tests | 22 files | ~350 | `services/*.test.ts` mirrors `services/*.ts` |
| Component tests | ~45 files | ~250 | Co-located `*.test.tsx` in `components/` |
| Page tests | ~25 files | ~150 | Co-located `*.test.tsx` in `pages/` |
| Navigation tests | 2 files | ~40 | `navigation/featureOwnership.test.ts`, `routeRegistry.test.ts` |
| Lib/utility tests | ~30 files | ~50 | `lib/**/*.test.ts` |
| Store tests | ~13 files | ~6 | Redux slice tests |
| **Total** | **137 files** | **846** | — |

### 3.2 Service Test Inventory (22 Service Tests)

Every frontend service has a corresponding `*.test.ts`:

| # | Service Test | Service Under Test |
|---|---|---|
| 1 | `adminService.test.ts` | `adminService.ts` |
| 2 | `aiService.test.ts` | `aiService.ts` |
| 3 | `applicationService.test.ts` | `applicationService.ts` |
| 4 | `authService.test.ts` | `authService.ts` |
| 5 | `challengeService.test.ts` | `challengeService.ts` |
| 6 | `companyService.test.ts` | `companyService.ts` |
| 7 | `dashboardService.test.ts` | `dashboardService.ts` |
| 8 | `entitlementService.test.ts` | `entitlementService.ts` |
| 9 | `fileUploadService.test.ts` | `fileUploadService.ts` |
| 10 | `gamificationService.test.ts` | `gamificationService.ts` |
| 11 | `jobService.test.ts` | `jobService.ts` |
| 12 | `lmsService.test.ts` | `lmsService.ts` |
| 13 | `messagingService.test.ts` | `messagingService.ts` |
| 14 | `networkingService.test.ts` | `networkingService.ts` |
| 15 | `notificationDigestService.test.ts` | `notificationDigestService.ts` |
| 16 | `notificationService.test.ts` | `notificationService.ts` |
| 17 | `paymentService.test.ts` | `paymentService.ts` |
| 18 | `profileService.test.ts` | `profileService.ts` |
| 19 | `recruiterService.test.ts` | `recruiterService.ts` |
| 20 | `settingsService.test.ts` | `settingsService.ts` |
| 21 | `trustAndSafetyService.test.ts` | `trustAndSafetyService.ts` |
| 22 | `profileService.crud.test.ts` | `profileService.ts` (extended CRUD) |

### 3.3 Navigation Tests

| Test File | Assertions |
|---|---|
| `featureOwnership.test.ts` | Verifies feature→route ownership mapping integrity |
| `routeRegistry.test.ts` | Verifies 22 route definitions match page registry |

---

## 4. E2E Tests (28 Specs, 114 Declarations, Playwright)

### 4.1 E2E Spec Inventory

| # | Spec File | Focus Area | Declarations |
|---|---|---|---|
| 1 | `accessibility-semantics.spec.ts` | Semantic HTML + ARIA compliance (chromium) | 5 |
| 2 | `color-contrast.spec.ts` | WCAG 2.1 AA contrast ratios | 4 |
| 3 | `keyboard-navigation.spec.ts` | Full keyboard operation | 6 |
| 4 | `auth-flow.spec.ts` | Login, register, logout, session | 5 |
| 5 | `jobs-browse.spec.ts` | Job search, filtering, detail view | 6 |
| 6 | `jobs-apply.spec.ts` | Application submission workflow | 4 |
| 7 | `candidates-pipeline.spec.ts` | Recruiter pipeline management | 5 |
| 8 | `lms-enrollment.spec.ts` | Course browsing, enrollment, progress | 5 |
| 9 | `challenges-submit.spec.ts` | Challenge execution, submission | 4 |
| 10 | `networking-connect.spec.ts` | Connection requests, accept/decline | 4 |
| 11 | `messaging-send.spec.ts` | Message send, receive, read receipts | 5 |
| 12 | `profile-edit.spec.ts` | Profile update, skills, education | 5 |
| 13 | `resume-build.spec.ts` | Resume generation, export | 3 |
| 14 | `admin-flags.spec.ts` | Feature flag management | 4 |
| 15 | `notifications.spec.ts` | Notification delivery, read state | 4 |
| 16 | `settings.spec.ts` | User settings, preferences | 3 |
| 17 | `search-global.spec.ts` | Command search, entity search | 4 |
| 18 | `gamification.spec.ts` | XP award, badge unlock, leaderboard | 4 |
| 19 | `billing-demo.spec.ts` | Demo checkout flow, plan display | 3 |
| 20 | `error-boundary.spec.ts` | Error recovery, 404 view | 3 |
| 21 | `responsive.spec.ts` | Mobile/tablet layout behavior | 4 |
| 22 | `dark-mode.spec.ts` | Theme toggle, persistence | 3 |
| 23 | `portfolio.spec.ts` | Portfolio display, project cards | 3 |
| 24 | `career-path.spec.ts` | Career milestone visualization | 3 |
| 25 | `moderation.spec.ts` | Content report, admin triage | 4 |
| 26 | `company-profile.spec.ts` | Company detail, job listings | 3 |
| 27 | `command-search-role.spec.ts` | Role-filtered search results | 3 |
| 28 | `realtime-events.spec.ts` | WebSocket message delivery | 5 |
| **Total** | | | **114 declarations (~235 scenarios)** |

### 4.2 Accessibility Test Scripts

| Command | Purpose | Browser |
|---|---|---|
| `npm run test:a11y` | Semantic HTML + ARIA compliance | Chromium only |
| `npm run test:contrast` | Color contrast ratios | Chromium only |
| `npm run test:contrast:all` | Color contrast (all browsers) | All |
| `npm run test:keyboard` | Keyboard navigation coverage | Chromium only |

---

## 5. Backend Tests (JUnit + Spring Boot)

Per-service test suites in `services/*/src/test/`:
- **Scope**: Contract tests, health endpoint verification, controller integration tests
- **Pattern**: `@SpringBootTest` with `@AutoConfigureMockMvc`
- **Coverage Note**: Backend test inventory is a known partial gap — see Technical Debt. Contract and health tests verify service boot and endpoint reachability.

---

## 6. Scheduler Tests (5 Suites)

| # | Test File | Scheduler Under Test |
|---|---|---|
| 1 | `run-notification-digests.test.mjs` | Notification digest batching |
| 2 | `discover-saved-search-digests.test.mjs` | Saved search alert discovery |
| 3 | `run-networking-reminders.test.mjs` | Stale connection nudge reminders |
| 4 | `run-kpi-aggregations.test.mjs` | Analytics KPI rollup |
| 5 | `scheduler-audit.test.mjs` | Scheduler health audit |

---

## 7. Repository Validators (22 Total: 20 .mjs + 2 .sh)

### 7.1 Validators Wired into `npm run validate:all` (20 .mjs)

| # | Validator | What It Enforces |
|---|---|---|
| 1 | `validate-module-manifest.mjs` | `module-manifest.json` matches actual service modules |
| 2 | `validate-infrastructure-manifest.mjs` | Infrastructure resource manifest integrity |
| 3 | `validate-docs-lifecycle.mjs` | Documentation lifecycle compliance |
| 4 | `validate-runbooks.mjs` | Operational runbook presence and format |
| 5 | `validate-observability-contract.mjs` | Observability contract (logging, metrics) |
| 6 | `validate-ui-design-system.mjs` | Aura design system usage compliance |
| 7 | `validate-feature-flags.mjs` | Feature flag registry integrity |
| 8 | `validate-backend-topology-adr.mjs` | Backend topology matches ADR-002 |
| 9 | `validate-schema-authority-adr.mjs` | Schema authority matches ADR-003 |
| 10 | `validate-schema-migrations.mjs` | Migration baseline matches `supabase-schema.sql` |
| 11 | `validate-seed-data-safety.mjs` | Seed data contains no secrets |
| 12 | `validate-typed-supabase-boundary.mjs` | TypeScript types match DB columns |
| 13 | `validate-legacy-schema-disposition.mjs` | Legacy tables isolated from production |
| 14 | `validate-messaging-boundary-adr.mjs` | `chat-service` retired per ADR-004 |
| 15 | `validate-payment-mode-adr.mjs` | Demo mode billing per ADR-005 |
| 16 | `validate-data-ownership.mjs` | `data-ownership-manifest.json` integrity |
| 17 | `validate-auth-contract.mjs` | Supabase Auth SSOT contract |
| 18 | `validate-security-contract.mjs` | Zero secrets in source control |
| 19 | `validate-write-fallback-safety.mjs` | Write fallback safety patterns |
| 20 | `validate-openapi-contract.mjs` | OpenAPI contract integrity |

### 7.2 Standalone Validators (2 .sh, not in `validate:all`)

| # | Validator | Purpose |
|---|---|---|
| 21 | `validate-coverage.sh` | Coverage threshold enforcement |
| 22 | `validate-docs.sh` | Markdown link/syntax validation |

---

## 8. Extension Test Suites (7 Suites)

Located in `chrome-extension-project/`:

| # | Suite | What It Tests |
|---|---|---|
| 1 | Page scanning | DOM extraction for job postings |
| 2 | Resume matching | Local keyword matching algorithm |
| 3 | Storage operations | `chrome.storage.local` read/write |
| 4 | Content script injection | Manifest V3 content script lifecycle |
| 5 | Background service worker | Event handling and message passing |
| 6 | Popup UI | Extension popup rendering and interactions |
| 7 | Privacy compliance | Zero-telemetry verification |

---

## 9. Quality Gates & CI Integration

### 9.1 Validation Pipeline
```bash
# Run all 20 .mjs validators
npm run validate:all

# Frontend unit tests
cd apps/frontend && npm run test:unit

# Frontend E2E tests
cd apps/frontend && npm run test:e2e

# Accessibility suite
npm run test:a11y && npm run test:contrast && npm run test:keyboard
```

### 9.2 Quality Metrics

| Metric | Current Value | Target |
|---|---|---|
| Frontend unit tests | 846 | ≥ 800 ✅ |
| E2E scenario coverage | ~235 scenarios | ≥ 200 ✅ |
| Validators passing | 20/20 | 20/20 ✅ |
| RLS policy coverage | 50/50 tables | 100% ✅ |
| ADR compliance | 6/6 ADRs enforced | 100% ✅ |
| Secret hygiene | 0 secrets found | 0 ✅ |

---

## 10. Test Commands Reference

```bash
# All frontend unit tests (Vitest)
cd apps/frontend && npm run test:unit

# All E2E tests (Playwright)
cd apps/frontend && npm run test:e2e

# Accessibility tests
npm run test:a11y          # Semantic HTML, chromium
npm run test:contrast      # Color contrast, chromium
npm run test:contrast:all  # Color contrast, all browsers
npm run test:keyboard      # Keyboard navigation, chromium

# All repository validators
npm run validate:all

# Scheduler tests
cd scripts && npm test
```
