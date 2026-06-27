# TalentSphere Incident Runbooks

> Documentation status: Current source-backed incident runbook. Runtime cloud, Kubernetes, Supabase, Stripe, antivirus, Redis, and Chrome Web Store behavior is Not verified from the codebase.

## Purpose

Use these runbooks when a critical source-level validation, CI gate, scheduler workflow, extension build, API contract, security guardrail, or admin operational surface fails. The commands here are repository commands that exist in `package.json`, `chrome-extension-project/package.json`, or the root GitHub Actions workflow.

This document does not claim that production infrastructure exists or is healthy. Runtime probes against a deployed cluster, Supabase project, Redis instance, external scanner, Stripe account, or browser extension store require environment-specific evidence that is Not verified from the codebase.

## Triage Rules

1. Capture the failing command, branch, commit, and changed files.
2. Reproduce with the exact command listed in the incident runbook.
3. Check generated artifacts before hand-editing documentation.
4. Keep user-facing systems read-only while source validation is failing.
5. Do not paste secrets, raw resume text, raw job descriptions, raw message content, tokens, or provider output into issues, analytics, or runbook notes.
6. Update `PLAN.md` and the relevant generated/current documentation after a fix.

## Command Index

| Area | Source command |
| --- | --- |
| Route contract report | `npm run report:api-contracts` |
| OpenAPI payload contract | `npm run report:api-openapi`, `npm run validate:api-openapi-contract` |
| Module ownership | `npm run validate:module-manifest` |
| Infrastructure references | `npm run validate:infrastructure-manifest` |
| Documentation lifecycle | `npm run validate:docs-lifecycle` |
| Data ownership | `npm run validate:data-ownership` |
| Observability contract | `npm run validate:observability-contract` |
| Auth and gateway source contract | `npm run validate:auth-contract` |
| Security source contract | `npm run validate:security-contract` |
| Scheduler audit helper | `npm run test:scheduler-audit` |
| Saved-search scheduler | `npm run test:saved-search-digest-discovery` |
| Notification digest scheduler | `npm run test:notification-digests` |
| Networking reminder scheduler | `npm run test:networking-reminders` |
| Extension messaging | `npm run test:extension-messaging` |
| Extension storage migrations | `npm run test:extension-storage-migrations` |
| Extension privacy/local-only contract | `npm run test:extension-contract` |
| Frontend lint/tests/build | `npm run lint`, `npm run test:unit`, `npm run build` |

## Incident: API Route Contract Drift

Symptoms:

- CI fails at `Generate API contract report`.
- CI fails at `Verify generated API contract report is committed`.
- Frontend API calls show no active backend controller match.
- Active controller routes lose Gateway prefix coverage.

Immediate checks:

```bash
npm run report:api-contracts
git diff -- docs/API_CONTRACT_MISMATCH_REPORT.md
```

Source evidence to inspect:

- `docs/API_CONTRACT_MISMATCH_REPORT.md`
- `scripts/generate-api-contract-report.mjs`
- `services/*/src/main/java/**/controller/*Controller.java`
- `services/api-gateway/src/main/resources/application.yml`
- `module-manifest.json`

Resolution:

1. If a frontend call is legitimate, add or correct the active controller route and Gateway prefix.
2. If a controller belongs to an orphaned module, keep it classified as non-active until the module is added to the Maven reactor and deployment references.
3. If the report changed because source changed intentionally, regenerate and commit the report.
4. Update `PLAN.md` if route ownership, module status, or remaining runtime gaps changed.

Runtime follow-up:

Gateway, service discovery, JWT claims, database access, and live HTTP behavior are Not verified from the codebase. Run deployed Gateway/service smoke tests in the target environment before declaring runtime recovery.

## Incident: OpenAPI Payload Contract Drift

Symptoms:

- CI fails at `Generate OpenAPI payload contract`.
- CI fails at `Validate OpenAPI payload contract`.
- CI fails at `Verify generated OpenAPI payload contract is committed`.
- The generated contract contains missing `$ref` targets or parser warnings.

Immediate checks:

```bash
npm run report:api-openapi
npm run validate:api-openapi-contract
git diff -- docs/API_OPENAPI_CONTRACT.json
```

Source evidence to inspect:

- `docs/API_OPENAPI_CONTRACT.json`
- `scripts/generate-openapi-contract.mjs`
- `scripts/validate-openapi-contract.mjs`
- controller method signatures and request/response payload classes under `services/*/src/main/java`

Resolution:

1. Prefer explicit DTO/entity payload types over untyped `Map<String, Object>` when changing public API contracts.
2. If a nested payload class, enum, or record is newly exposed, make sure the generator resolves it without `x-contract-warning`.
3. Regenerate the JSON contract after source changes.
4. Keep `chat-service` operations non-active unless the module is added to the Maven reactor and deployment surface.

Runtime follow-up:

Runtime Springdoc `/v3/api-docs`, Jackson serialization details, validation groups, and typed client generation are Not verified from the codebase. Add runtime OpenAPI smoke evidence before treating source-derived contracts as deployed API proof.

## Incident: Auth Or Gateway Security Contract Regression

Symptoms:

- `npm run validate:auth-contract` fails.
- Public routes unexpectedly match by substring.
- Gateway stops forwarding normalized `ROLE_*` headers.
- Sensitive route families lose source-level rate-limit filters.
- Backend auth-service local credentials become enabled by default.

Immediate checks:

```bash
npm run validate:auth-contract
git diff -- services/api-gateway services/auth-service docs/adr/ADR-001-primary-identity-provider.md scripts/validate-auth-contract.mjs
```

Source evidence to inspect:

- `docs/adr/ADR-001-primary-identity-provider.md`
- `services/api-gateway/src/main/resources/application.yml`
- Gateway auth and route validation classes
- `services/auth-service/src/main/java`
- `scripts/validate-auth-contract.mjs`

Resolution:

1. Preserve Supabase Auth as the primary source-level login/session authority.
2. Keep backend local register/login disabled by default behind the explicit compatibility flag.
3. Restore exact public-route matching and normalized role extraction if either regressed.
4. Restore rate-limit key resolvers and route-specific rate-limit filters for sensitive route families.

Runtime follow-up:

Live Supabase token verification, JWT secret alignment, Redis-backed rate-limit behavior, and expected 429 responses are Not verified from the codebase.

## Incident: Production Secret Or Safe Error Contract Regression

Symptoms:

- `npm run validate:security-contract` fails.
- Production/strict startup no longer fails fast for placeholders or missing configured secrets.
- Public API errors expose raw exception messages.
- Kubernetes service manifests stop consuming runtime Secrets.

Immediate checks:

```bash
npm run validate:security-contract
git diff -- services/shared services/file-service infra/k8s infra/docker scripts/validate-security-contract.mjs
```

Source evidence to inspect:

- `services/shared/src/main/java/com/talentsphere/shared/env/MandatoryEnvironmentPostProcessor.java`
- `services/shared/src/main/java/com/talentsphere/shared/exception/GlobalExceptionHandler.java`
- `infra/k8s/base/services/*.yaml`
- `infra/docker/application.yml.template`
- `scripts/validate-security-contract.mjs`

Resolution:

1. Restore strict secret validation for `prod`, `production`, and explicit strict mode.
2. Keep local/test behavior warning-only where the shared validator expects it.
3. Keep raw exception details in logs, not public API payloads.
4. Keep Kubernetes manifests wired to `talentsphere-secrets`, not committed placeholder production values.

Runtime follow-up:

Real production secret creation, secret-manager loading, Kubernetes rollout, and live API error responses are Not verified from the codebase.

## Incident: File Upload Security Regression

Symptoms:

- `npm run validate:security-contract` fails on file-service checks.
- Upload handling stops checking MIME, extension, signature, active text content, or scanner hook results.
- Upload/delete failures return raw exception strings.

Immediate checks:

```bash
npm run validate:security-contract
git diff -- services/file-service scripts/validate-security-contract.mjs
```

Source evidence to inspect:

- `services/file-service/src/main/java/com/talentsphere/file/service/FileService.java`
- file-service tests under `services/file-service/src/test`
- `scripts/validate-security-contract.mjs`

Resolution:

1. Restore extension-to-MIME allowlists.
2. Restore PDF/PNG/JPEG/WebP/DOCX/text content signature checks.
3. Restore active HTML/script-like content rejection.
4. Restore scanner hook behavior and EICAR rejection coverage.
5. Keep user-facing upload/delete failures sanitized.

Runtime follow-up:

Provider-backed object storage, external antivirus, CDN, signed URLs, scan status persistence, and live upload tests are Not verified from the codebase.

## Incident: Scheduler Automation Failure

Symptoms:

- Scheduler tests fail.
- A scheduler script loses dry-run defaults, idempotency-oriented behavior, service-role audit records, or sanitized metadata.
- Admin scheduled automation status no longer matches expected catalog behavior.

Immediate checks:

```bash
npm run test:scheduler-audit
npm run test:saved-search-digest-discovery
npm run test:notification-digests
npm run test:networking-reminders
npm run validate:security-contract
```

Source evidence to inspect:

- `scripts/scheduler-audit.mjs`
- `scripts/discover-saved-search-digests.mjs`
- `scripts/run-notification-digests.mjs`
- `scripts/run-networking-reminders.mjs`
- `infra/k8s/base/notification-digest-cronjobs.yaml`
- scheduler sections in `docs/FEATURES_AND_DASHBOARDS.md`

Resolution:

1. Keep dry-run non-mutating unless `--commit` is explicit.
2. Keep commit-mode start/completed/failed audit rows in `audit_log`.
3. Keep audit metadata sanitized and bounded.
4. Preserve idempotency keys and skip reasons for scheduler-created work.
5. Update Admin scheduled automation docs when catalog fields change.

Runtime follow-up:

Runtime Supabase audit inserts, Kubernetes CronJob execution, scheduler image build/push, and production run history are Not verified from the codebase.

## Incident: Extension Regression

Symptoms:

- Extension build fails.
- Messaging, local storage migration, privacy/local-only contract, or diagnostics tests fail.
- Source introduces `chrome.storage.sync`, network sync, or raw content diagnostics metadata.

Immediate checks:

```bash
npm run test:extension-messaging
npm run test:extension-storage-migrations
npm run test:extension-contract
cd chrome-extension-project && npm run build
```

Source evidence to inspect:

- `chrome-extension-project/public/manifest.json`
- `chrome-extension-project/src/background`
- `chrome-extension-project/src/content`
- `chrome-extension-project/src/lib`
- `chrome-extension-project/scripts/*.test.mjs`

Resolution:

1. Keep extension storage local-only unless ADR-006 accepts sync.
2. Keep diagnostics metadata allowlisted and free of raw resume text, raw job text, prompts, URLs, tokens, and email addresses.
3. Preserve `scrape_job_metadata`, `analyze_page`, `ping`, and unhandled response contracts.
4. Preserve storage schema markers, known-key preservation, and bounded malformed-key warnings.

Runtime follow-up:

Live Chrome runtime messaging, `chrome.storage.local` migration behavior, supported-portal DOM drift, Chrome Web Store packaging, and published extension behavior are Not verified from the codebase.

## Incident: Data Ownership Or Schema Drift

Symptoms:

- `npm run validate:data-ownership` fails.
- A frontend Supabase table appears without ownership classification.
- Reviewed SQL creates or removes a table without manifest alignment.
- Billing/payment tables drift from frontend access expectations.

Immediate checks:

```bash
npm run validate:data-ownership
git diff -- data-ownership-manifest.json supabase-schema.sql infra/supabase_master.sql apps/frontend/src/services
```

Source evidence to inspect:

- `data-ownership-manifest.json`
- `docs/DATA_OWNERSHIP.md`
- `supabase-schema.sql`
- `infra/supabase_master.sql`
- frontend `.from(...)` usage under `apps/frontend/src`

Resolution:

1. Classify every observed table with owner, target access, migration status, RLS status, and index status.
2. Keep frontend direct-access flags aligned with source.
3. Update reviewed SQL sources when table definitions move or split.
4. Update `PLAN.md` if ownership decisions or unresolved schema authority gaps change.

Runtime follow-up:

Applied Supabase migrations, generated types, deployed RLS policy behavior, and query performance are Not verified from the codebase.

## Incident: Deployment Reference Drift

Symptoms:

- `npm run validate:module-manifest` fails.
- `npm run validate:infrastructure-manifest` fails.
- Compose, Kustomize, Gateway, or scheduler references point at missing, orphaned, or unclassified modules.

Immediate checks:

```bash
npm run validate:module-manifest
npm run validate:infrastructure-manifest
git diff -- module-manifest.json docker-compose.yml infra/k8s services/api-gateway/src/main/resources/application.yml
```

Source evidence to inspect:

- `module-manifest.json`
- `docker-compose.yml`
- `infra/docker/docker-compose.yml`
- `infra/k8s/base/kustomization.yaml`
- `infra/k8s/base/services/*.yaml`
- `services/api-gateway/src/main/resources/application.yml`

Resolution:

1. Keep `services/chat-service` orphaned unless it is added to the Maven reactor and deployment surface intentionally.
2. Keep Gateway `lb://` targets aligned to active deployable modules.
3. Keep scheduler CronJob commands aligned to root package scripts.
4. Keep generated/external artifacts classified separately from current Markdown documentation.

Runtime follow-up:

Docker image builds, image availability, Compose startup, Kubernetes rollout, and live service discovery are Not verified from the codebase.

## Incident: Observability Contract Drift

Symptoms:

- `npm run validate:observability-contract` fails.
- A critical flow loses source-level alert or dashboard coverage.
- An alert or dashboard panel loses owner, severity, source command, signal, response, or runbook linkage.
- Runtime limitation wording implies deployed Prometheus, Grafana, or Alertmanager behavior without evidence.

Immediate checks:

```bash
npm run validate:observability-contract
git diff -- infra/observability scripts/validate-observability-contract.mjs docs/runbooks/INCIDENT_RUNBOOKS.md
```

Source evidence to inspect:

- `infra/observability/alerts/critical-alerts.json`
- `infra/observability/dashboards/critical-flows-dashboard.json`
- `scripts/validate-observability-contract.mjs`
- `docs/runbooks/INCIDENT_RUNBOOKS.md`
- `PLAN.md`

Resolution:

1. Restore alert and dashboard coverage for every required critical flow.
2. Keep every alert and panel linked to a current incident runbook anchor.
3. Keep owners, severities, source commands, signals, summaries, and responses explicit.
4. Keep runtime Prometheus/Grafana/Alertmanager behavior marked as Not verified from the codebase until deployed evidence exists.
5. Update `PLAN.md` and governance docs if the critical flow inventory changes.

Runtime follow-up:

Deployed dashboards, metric names, alert routing, notification receivers, and alert firing behavior are Not verified from the codebase.

## Incident: Frontend Validation Or Build Failure

Symptoms:

- CI fails at frontend lint, unit tests, or production build.
- Generated API/docs changes unexpectedly break frontend type checks.

Immediate checks:

```bash
npm run lint
npm run test:unit
npm run build
```

Source evidence to inspect:

- failing test output
- `apps/frontend/src`
- `apps/frontend/package.json`
- generated route/API/data docs if the failure follows a contract change

Resolution:

1. Fix lint/type/test errors at the source.
2. Update tests for intentional behavior changes.
3. Re-run the API/data/doc validators when frontend services or Supabase access change.
4. Keep generated build output out of source review unless specifically needed for a release artifact.

Runtime follow-up:

Browser E2E coverage, deployed frontend behavior, and production CDN behavior are Not verified from the codebase in this local loop.

## Incident: CI Security Scan Failure

Symptoms:

- GitHub Actions security scan job fails on npm audit, Trivy filesystem scan, or Trivy image scan.
- `npm run validate:security-contract` reports missing scan gates.

Immediate checks:

```bash
npm run validate:security-contract
npm audit --audit-level=high
cd chrome-extension-project && npm audit --audit-level=high
```

Source evidence to inspect:

- `.github/workflows/talentsphere-ci.yml`
- `package-lock.json`
- `chrome-extension-project/package-lock.json`
- Dockerfiles under `docker/`
- `scripts/validate-security-contract.mjs`

Resolution:

1. Triage high/critical findings before merging.
2. Prefer dependency upgrades with tests over audit suppressions.
3. Keep Docker smoke builds dependent on source-level security scans.
4. Keep Trivy filesystem and image scan gates in the root workflow.

Runtime follow-up:

Live scanner database availability, GitHub-hosted CI behavior, Docker image scan runtime, and registry context are Not verified from the codebase.

## Incident: Admin Operational Dashboard Degraded Or Misleading

Symptoms:

- Admin service-health or scheduler status panels show mock, inferred, or fallback state as if it were live.
- Admin operational analytics starts recording raw service URLs, status URLs, provider output, log queries, audit actor IDs, IP addresses, raw errors, or user emails.

Immediate checks:

```bash
npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts src/lib/dashboardOperationalAnalytics.test.ts src/lib/productAnalytics.test.ts
npm run validate:security-contract
```

Source evidence to inspect:

- `apps/frontend/src/services/adminService.ts`
- `apps/frontend/src/lib/dashboardOperationalAnalytics.ts`
- `docs/FEATURES_AND_DASHBOARDS.md`
- `docs/COMPREHENSIVE_PRODUCT_UX_TECHNICAL_ANALYSIS_2026-06-26.md`

Resolution:

1. Preserve explicit live, inferred, mock, degraded, and not-configured labels.
2. Keep admin actions read-only unless a dedicated audited command exists.
3. Preserve analytics privacy filters and bounded metadata.
4. Update feature docs if the admin source model changes.

Runtime follow-up:

Deployed observability backends, health providers, alert manager, production audit reads, and real scheduler status provider behavior are Not verified from the codebase.

## Escalation And Documentation Closure

After any incident fix:

1. Re-run the relevant source commands from this runbook.
2. Re-run `npm run validate:docs-lifecycle` if docs changed.
3. Re-run `git diff --check` on touched files.
4. Update `PLAN.md` with implementation status, verification evidence, remaining blockers, and next actions.
5. Keep the older `docs/OPERATIONAL_RUNBOOK.md` treated as draft/unverified until its environment-specific commands and contacts are owner-verified.
