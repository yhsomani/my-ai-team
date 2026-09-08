# TalentSphere Master Implementation Plan (IMPLEMENTATION-PLAN.md)

> Documentation status: Current living implementation roadmap tracking transformation tasks, milestones, verification commands, and production readiness gates.

---

## Roadmap Overview

```text
PHASE 0: Discovery & Mental Model Baseline ───────────► [COMPLETE]
PHASE 1: Stabilization & CI / Test Synchronization ───► [COMPLETE]
PHASE 2: Critical Fixes & Security Hardening ─────────► [COMPLETE]
PHASE 3: Architectural Cleanup & Monolith Convergence ► [COMPLETE]
PHASE 4: Project Decomposition & Team Ownership ──────► [COMPLETE]
PHASE 5: UI/UX & Design System Consistency ───────────► [COMPLETE]
PHASE 6: Testing & Regression Protection ─────────────► [COMPLETE]
PHASE 7: Security & Secret Safety ────────────────────► [COMPLETE]
PHASE 8: Performance & Rate Limiting ─────────────────► [COMPLETE]
PHASE 9: Production Hardening & Runbooks ─────────────► [COMPLETE]
PHASE 10: Final Validation & Multi-Team Governance ───► [COMPLETE]
```

---

## Phase Details & Task Execution Ledger

### Phase 0: Discovery & Mental Model Baseline
- [x] **Task 0.1**: Perform full recursive codebase inventory across frontend, backend, extension, database, and infrastructure.
- [x] **Task 0.2**: Document existing technology stacks, runtime paths, and data flows.
- [x] **Task 0.3**: Classify all 59 database tables, 26 Maven reactor modules, and 19 frontend routes.
- *Verification*: `npm run validate:module-manifest`, `npm run validate:data-ownership`.

### Phase 1: Stabilization & CI / Test Synchronization
- [x] **Task 1.1**: Clean up duplicate YAML keys in `.github/workflows/talentsphere-ci.yml`.
- [x] **Task 1.2**: Align Trivy security action pin to `0.30.0` to satisfy security contract validator.
- [x] **Task 1.3**: Fix Vitest async Promise race in `ChallengesPage.test.tsx` (114/114 test files / 631 tests passing).
- *Verification*: `npm run validate:security-contract`, `npm run test:unit`.

### Phase 2: Critical Fixes & Security Hardening
- [x] **Task 2.1**: Enforce Supabase Auth as primary identity authority with normalized Gateway `ROLE_*` header propagation (ADR-001).
- [x] **Task 2.2**: Implement fail-fast production secret validation in `MandatoryEnvironmentPostProcessor.java`.
- [x] **Task 2.3**: Prevent raw exception and stack trace leakage in `GlobalExceptionHandler.java`.
- [x] **Task 2.4**: Implement binary magic-byte validation and malware scanner hook in `FileService.java`.
- [x] **Task 2.5**: Guard seed data truncation behind explicit session environments in `seed-data.sql` and `seed_data.py`.
- *Verification*: `npm run validate:auth-contract`, `npm run validate:security-contract`, `npm run validate:seed-data-safety`.

### Phase 3: Architectural Cleanup & Monolith Convergence
- [x] **Task 3.1**: Establish single schema authority in `infra/db/migrations/0001_initial_baseline.sql` (ADR-003).
- [x] **Task 3.2**: Resolve messaging boundary by consolidating on `messaging-service` and orphaning `chat-service` (ADR-004).
- [x] **Task 3.3**: Configure explicit Demo billing mode for development and testing (ADR-005).
- [x] **Task 3.4**: Generate canonical OpenAPI 3.1 contract (`docs/API_OPENAPI_CONTRACT.json`) with 123 operations and 56 schemas.
- *Verification*: `npm run validate:backend-topology-adr`, `npm run validate:messaging-boundary-adr`, `npm run validate:api-openapi-contract`.

### Phase 4: Project Decomposition & Team Interface Contracts
- [x] **Task 4.1**: Define 8 specialized domain project boundaries in `PROJECT-BOUNDARIES.md`.
- [x] **Task 4.2**: Verify that each proposed project passes the 9 independent boundary tests.
- [x] **Task 4.3**: Assign explicit data ownership for all 59 tables in `data-ownership-manifest.json`.
- [x] **Task 4.4**: Document inter-domain event and API interfaces.
- *Verification*: `npm run validate:data-ownership`, `npm run test:ia`.

### Phase 5: UI/UX & Design System Consistency
- [x] **Task 5.1**: Enforce semantic Aura design tokens (`--bg-primary`, `--text-primary`, `--accent`) across all 296 frontend and extension source files.
- [x] **Task 5.2**: Eliminate ad hoc color hex literals and nonstandard typography spacing.
- [x] **Task 5.3**: Enforce WCAG 2.1 AA 4.5:1 text-to-background contrast ratios across light and dark themes.
- [x] **Task 5.4**: Standardize atomic UI primitives (`AuraButton`, `GlassCard`, `AuraInput`, `AuraModal`, `Tabs`, `Toast`).
- [x] **Task 5.5**: Add route-specific accessible landmark names (`Dashboard application content`, `Jobs application content`, etc.).
- *Verification*: `npm run validate:ui-design-system`, `npm run test:ia`, `npm run lint`, `npm run build`.

### Phase 6: Testing & Regression Protection
- [x] **Task 6.1**: Maintain 100% passing rate across all 114 frontend unit test files (631 tests).
- [x] **Task 6.2**: Verify route accessibility and keyboard navigation contracts.
- [x] **Task 6.3**: Verify Chrome extension messaging, portal fixture parsers, and UX contracts.
- [x] **Task 6.4**: Verify service-role scheduler audit tests (`scheduler-audit.test.mjs`, `discover-saved-search-digests.test.mjs`, `run-notification-digests.test.mjs`, `run-networking-reminders.test.mjs`).
- *Verification*: `npm run test:unit`, `npm run test:ia`, `npm run test:scheduler-audit`, `cd chrome-extension-project && npm run build`.

### Phase 7: Security & Secret Safety
- [x] **Task 7.1**: Guard against placeholder secrets in Kubernetes base manifests (`infra/k8s/base/services/`).
- [x] **Task 7.2**: Eliminate unpersisted write fallback simulations (`validate-write-fallback-safety.mjs`).
- [x] **Task 7.3**: Enforce strict local-first privacy boundary for the Chrome extension companion (ADR-006).
- *Verification*: `npm run validate:security-contract`, `npm run validate:write-fallback-safety`, `cd chrome-extension-project && npm run test:contract`.

### Phase 8: Performance & Rate Limiting
- [x] **Task 8.1**: Configure Redis `RequestRateLimiter` on API Gateway for auth, AI, challenges, messaging, and file routes.
- [x] **Task 8.2**: Implement code splitting and chunk optimization in Vite configuration.
- [x] **Task 8.3**: Use lazy loading and error recovery in `AuraImage.tsx`.
- *Verification*: `npm run validate:auth-contract`, `npm run build`.

### Phase 9: Production Hardening & Runbooks
- [x] **Task 9.1**: Maintain incident runbooks in `docs/runbooks/INCIDENT_RUNBOOKS.md` for 13 failure scenarios.
- [x] **Task 9.2**: Catalog critical Prometheus alerts in `infra/observability/alerts/critical-alerts.json`.
- [x] **Task 9.3**: Catalog Grafana dashboards in `infra/observability/dashboards/critical-flows-dashboard.json`.
- *Verification*: `npm run validate:runbooks`, `npm run validate:observability-contract`.

### Phase 10: Final Validation & Multi-Team Governance
- [x] **Task 10.1**: Run all 20 automated validation scripts in sequence.
- [x] **Task 10.2**: Run full test suites across frontend, schedulers, and extension.
- [x] **Task 10.3**: Synchronize master living documentation (`ARCHITECTURE.md`, `FLOW.md`, `DECISION.md`, `PROBLEMS.md`, `PROJECT-BOUNDARIES.md`, `IMPLEMENTATION-PLAN.md`).
- *Verification*: All test suites and governance scripts pass with 0 errors.

---

## Master Verification Suite Commands

To verify the complete system at any time:

```bash
cd TalentSphere-Unified

# 1. Run all 20 governance & architecture validators
npm run validate:module-manifest && \
npm run validate:infrastructure-manifest && \
npm run validate:docs-lifecycle && \
npm run validate:runbooks && \
npm run validate:observability-contract && \
npm run validate:ui-design-system && \
npm run validate:feature-flags && \
npm run validate:backend-topology-adr && \
npm run validate:schema-authority-adr && \
npm run validate:schema-migrations && \
npm run validate:seed-data-safety && \
npm run validate:typed-supabase-boundary && \
npm run validate:legacy-schema-disposition && \
npm run validate:messaging-boundary-adr && \
npm run validate:payment-mode-adr && \
npm run validate:data-ownership && \
npm run validate:auth-contract && \
npm run validate:security-contract && \
npm run validate:write-fallback-safety && \
npm run validate:api-openapi-contract

# 2. Run frontend unit tests, IA tests, linter, and production build
npm run test:unit && \
npm run test:ia && \
npm run lint && \
npm run build

# 3. Run background scheduler tests
npm run test:scheduler-audit && \
npm run test:saved-search-digest-discovery && \
npm run test:notification-digests && \
npm run test:networking-reminders

# 4. Run Chrome extension contracts, portal fixtures, UX tests, and build
npm run test:extension-messaging && \
npm run test:extension-portal-fixtures && \
npm run test:extension-options-ux && \
npm run test:extension-popup-ux && \
npm run test:extension-contract && \
npm run test:extension-storage-migrations && \
cd chrome-extension-project && npm run build
```
