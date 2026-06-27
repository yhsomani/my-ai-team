# Module Manifest

> Documentation status: Current governance reference for module, artifact, infrastructure, and documentation lifecycle validation.

`module-manifest.json` is the machine-readable source ownership manifest for this repository. It classifies active runtime modules, backend Maven reactor modules, orphaned source modules, infrastructure, tooling, documentation lifecycle, legacy sources, dev-only artifacts, generated outputs, and stale paths that must remain removed.

The manifest and deployment references are validated by:

```bash
npm run validate:module-manifest
npm run validate:infrastructure-manifest
npm run validate:docs-lifecycle
npm run validate:runbooks
npm run validate:observability-contract
npm run validate:backend-topology-adr
npm run validate:schema-authority-adr
npm run validate:schema-migrations
npm run validate:legacy-schema-disposition
npm run validate:messaging-boundary-adr
npm run validate:payment-mode-adr
npm run validate:data-ownership
npm run validate:auth-contract
npm run validate:security-contract
npm run report:api-openapi
npm run validate:api-openapi-contract
npm run report:db-types
```

## Current Classifications

| Category | Current state |
| --- | --- |
| Active web app | `apps/frontend`, package `talentsphere-web`, npm workspace member |
| Active extension | `chrome-extension-project`, package `talentsphere-companion`, separate npm project; `npm run test:messaging` validates content scan extraction and background/content message wiring, `npm run test:portal-fixtures` validates LinkedIn/Indeed/Glassdoor selector fixture parsing, `npm run test:storage-migrations` validates versioned local storage migration behavior, `npm run test:contract` validates local-only sync posture, bounded diagnostics, metadata allowlists, and raw resume/job text exclusion, and `npm run test:runtime-smoke` validates the built MV3 artifact, host-mapped portal fixture tabs, popup, local storage, and background messaging in a live Chromium-compatible runtime with Node 20-compatible CDP transport |
| Active backend reactor | Modules listed in the root `pom.xml` and `module-manifest.json` |
| Orphaned backend source | `services/chat-service` has a `pom.xml` and source tree but is not listed in the root Maven reactor |
| Active CI | `.github/workflows/talentsphere-ci.yml` at the actual git root |
| Infrastructure references | Compose module references, frontend dev bind mounts, Kustomize service resources, and scheduler npm commands are validated against the manifest |
| Data ownership | `data-ownership-manifest.json` classifies observed Supabase/Postgres tables, direct frontend access, reviewed SQL sources, and target owners |
| API contracts | `docs/API_CONTRACT_MISMATCH_REPORT.md` validates frontend/backend/gateway/security route drift, while `docs/API_OPENAPI_CONTRACT.json` captures source-derived OpenAPI 3.1 paths, parameters, request bodies, response bodies, and component schemas for active backend controllers |
| Auth contract | ADR-001, frontend Supabase Auth usage, Gateway HMAC verifier config, exact public-route matching, normalized `ROLE_*` forwarding, sensitive-route rate-limit wiring, and default-disabled backend local credentials are validated by `npm run validate:auth-contract` |
| Security contract | Production startup secret validation, safe public error handling, file upload content/security policy, audited service-role scheduler runs, CI dependency/secret/container scan gates, shared validator tests, Kubernetes runtime secret references, and absence of committed production placeholder secrets are validated by `npm run validate:security-contract` |
| Legacy sources | `apps/backend`, root `index.html`, root `vite.config.ts` |
| Documentation lifecycle | Markdown docs are classified under `documentation` as current, generated-current, historical, stale, proposal, draft, or working notes |
| Incident runbooks | `docs/runbooks/INCIDENT_RUNBOOKS.md` is the current source-backed incident runbook and is validated by `npm run validate:runbooks`; `docs/OPERATIONAL_RUNBOOK.md` remains a draft/unverified environment runbook |
| Observability contract | `infra/observability/alerts/critical-alerts.json` and `infra/observability/dashboards/critical-flows-dashboard.json` define source-level critical alert and dashboard coverage, validated by `npm run validate:observability-contract`; deployed Prometheus/Grafana/Alertmanager behavior remains unverified |
| Backend topology ADR | ADR-002 accepts modular monolith first with extractable service boundaries while preserving the current service tree as migration source evidence; validated by `npm run validate:backend-topology-adr` |
| Schema authority ADR | ADR-003 accepts migration-first Supabase/Postgres authority with generated TypeScript types and backend validation; `infra/db/README.md` marks the schema workspace; `infra/db/migrations/0001_initial_baseline.sql` and `infra/db/generated/database.types.ts` are source-validated by `npm run validate:schema-migrations`; `infra/db/legacy-schema-disposition.json` is source-validated by `npm run validate:legacy-schema-disposition` |
| Messaging boundary ADR | ADR-004 accepts one messaging domain boundary; `messaging-service` remains active while `chat-service` remains orphaned until retired or merged as adapter code; validated by `npm run validate:messaging-boundary-adr` |
| Payment mode ADR | ADR-005 accepts explicit demo billing mode; provider-backed checkout and webhook-owned payment state remain pending; validated by `npm run validate:payment-mode-adr` |
| Dev-only artifacts | Workspace-root repair scripts, task notes, generated snapshots, generated analysis reports, and local agent/cookie artifacts are classified under `developmentArtifacts` |
| Generated/external outputs | `node_modules`, frontend `dist`, extension `dist`, `.gemini/skills` |

## Validation Rules

The validator fails when:

- a required manifest path is missing
- package names do not match their package files
- root npm workspaces diverge from workspace modules in the manifest
- root Maven reactor modules diverge from the manifest
- a `services/*/pom.xml` module is not either in the Maven reactor list or explicitly classified as orphaned
- a required dev-only artifact listed in `developmentArtifacts` is missing without a manifest update
- a required generated artifact listed in `generatedOrExternal` is missing without a manifest update
- removed stale paths reappear, including nested workflow files and the workspace-root `project_structure.txt` snapshot

The documentation lifecycle validator fails when:

- a root Markdown doc or `docs/**/*.md` file is not classified in `documentation`, unless it is explicitly classified as a dev-only artifact
- a documentation entry is missing required metadata such as `id`, `kind`, `status`, or `note`
- a documentation entry path is missing
- a classified Markdown doc is missing a top-level `Documentation status:` banner

The data ownership validator fails when:

- a frontend Supabase `.from(...)` table or reviewed SQL `CREATE TABLE` table is missing from `data-ownership-manifest.json`
- a table's direct frontend access flag or SQL source list drifts from source
- a table is missing ownership, target access, migration, RLS, or index status metadata

The runbook validator fails when:

- the current incident runbook is missing
- the runbook is missing a documentation status banner
- required incident sections for API contracts, OpenAPI payloads, auth/gateway, production secrets, file uploads, schedulers, extension regressions, data ownership, deployment drift, observability contract drift, frontend validation, CI security scans, or admin dashboard degradation are removed
- required source commands are removed from the runbook command index
- placeholder contacts or unsafe raw-content recording guidance appears
- runtime-only evidence is no longer marked as "Not verified from the codebase"

The observability contract validator fails when:

- the critical alert or dashboard catalog is missing
- catalog schema or source-level status drifts
- runtime limitations no longer use the exact "Not verified from the codebase" phrase
- a required critical flow lacks alert or dashboard coverage
- alert groups or dashboard panels lack owners, runbook links, source commands, signals, summaries, responses, or valid severities
- alert source commands reference missing root npm scripts

The backend topology ADR validator fails when:

- ADR-002 is missing, no longer accepted, or loses required evidence/decision wording
- ADR-002 is not classified as an accepted ADR in `module-manifest.json`
- `services/api-gateway` or `services/messaging-service` disappear from active reactor classification before migration evidence exists
- `services/chat-service` is no longer explicitly orphaned before ADR-004 resolves it
- `PLAN.md` still lists ADR-002 as proposed or leaves the backend topology checklist item unchecked
- `docs/ARCHITECTURE_STATUS_INDEX.md` stops summarizing the accepted topology decision

The schema authority ADR validator fails when:

- ADR-003 is missing, no longer accepted, or loses required evidence/decision wording
- ADR-003 or `infra/db/README.md` is not classified in `module-manifest.json`
- `PLAN.md` still lists ADR-003 as proposed or omits the schema-authority checklist item
- `docs/ARCHITECTURE_STATUS_INDEX.md` or `docs/DATA_OWNERSHIP.md` stops summarizing the accepted schema authority decision
- schema-source table counts, duplicate-source counts, or direct frontend table counts change without updating the ADR validator and governance docs

The schema migration validator fails when:

- `infra/db/migrations/0001_initial_baseline.sql` no longer matches `supabase-schema.sql` while it is still the accepted baseline migration
- the source-derived baseline table count changes without validator review
- directly exposed baseline tables lose source-level RLS enablement
- baseline tables lose source-level index coverage for expected filter or ordering paths
- `infra/db/generated/database.types.ts` drifts from `npm run report:db-types`

The legacy schema disposition validator fails when:

- any `legacy-master-only` table or `multiple-reviewed-sql-sources` table is missing from `infra/db/legacy-schema-disposition.json`
- a disposition entry drifts from `data-ownership-manifest.json` domain or target owner metadata
- a legacy-only table no longer has source evidence in `infra/supabase_master.sql` and service-local migrations or source
- a duplicate reviewed-source table no longer appears in both the canonical baseline and legacy master SQL
- `chat_messages` stops being tied to the explicitly orphaned `services/chat-service` retirement path before ADR-004 migration work is complete
- `apps/frontend/src/lib/supabaseClient.ts` stops importing the generated `Database` type or stops exporting `typedSupabase`

The messaging boundary ADR validator fails when:

- ADR-004 is missing, no longer accepted, or loses required evidence/decision wording
- ADR-004 is not classified as an accepted ADR in `module-manifest.json`
- `services/messaging-service` disappears from active reactor classification
- `services/chat-service` becomes active or is no longer explicitly orphaned before retirement/merge execution is complete
- `PLAN.md` still lists ADR-004 as proposed or omits the messaging-boundary checklist item
- `docs/API_CONTRACT_MISMATCH_REPORT.md` stops classifying `/api/v1/chat/*` routes as orphaned non-active routes
- `docs/API_OPENAPI_CONTRACT.json` exposes `/api/v1/chat/*` as deployable paths instead of non-active operations

The payment mode ADR validator fails when:

- ADR-005 is missing, no longer accepted, or loses required evidence/decision wording
- ADR-005 is not classified as an accepted ADR in `module-manifest.json`
- frontend billing no longer exposes or displays explicit demo mode while provider-backed mode is false
- payment-service source stops evidencing synthetic sessions without a corresponding provider-backed/webhook ADR update
- `PLAN.md` still lists ADR-005 as proposed or omits the payment-mode checklist item
- generated API/OpenAPI contracts expose a payment webhook route before provider-backed mode is accepted

The OpenAPI payload contract validator fails when:

- `docs/API_OPENAPI_CONTRACT.json` is missing
- generated path operations drift from the declared active operation count
- a generated operation is missing an `operationId` or `200` response contract
- a generated schema `$ref` is missing or points outside `components.schemas`
- source-parser warnings remain in the generated contract
- duplicate OpenAPI operations are produced

The auth contract validator fails when:

- ADR-001 is missing or no longer accepted
- frontend auth stops using Supabase Auth for signup, login, logout, session bootstrap, and bearer-token reads
- route roles drift away from `ROLE_USER`, `ROLE_RECRUITER`, and `ROLE_ADMIN`
- API Gateway config no longer uses the single source-level HMAC `JWT_SECRET` verifier contract
- Gateway public-route validation reintroduces substring matching for unauthenticated paths
- Gateway role forwarding bypasses normalized `ROLE_*` extraction
- Gateway sensitive route families lose route-specific Redis rate limits or rate-limit key resolvers for public IP and authenticated user/IP fallback
- backend auth-service local credential register/login endpoints are no longer disabled by default

The security contract validator fails when:

- shared production startup validation stops failing fast for configured required secrets
- shared validator tests no longer cover production failure, explicit strict mode, non-production warning behavior, and service-scoped requirements
- shared exception handling returns raw exception messages, themed access-denied copy, or successful validation responses for invalid input
- shared exception-handler tests no longer cover correlation IDs and raw-message suppression for general, domain, invalid-request, access-denied, and validation failures
- file-service upload handling loses extension-to-MIME allowlists, content signature checks, active-content rejection, malware scanner hook coverage, or safe upload/delete error messages
- file-service tests no longer cover missing MIME type, MIME mismatch, spoofed file signatures, active text content, EICAR rejection, and scanner-hook rejection
- service-role scheduler scripts lose `audit_log` start/completed/failed run records, sanitized audit metadata, dry-run non-mutating defaults, or CI coverage for the scheduler audit helper
- root CI loses npm dependency audits, Trivy filesystem dependency/secret/misconfiguration scans, Trivy container image scans, high/critical failing thresholds, or the dependency from Docker smoke builds to source-level security scans
- service templates reintroduce a default JWT placeholder secret
- notification-service drifts back to legacy `RABBIT_USER` or `RABBIT_PASSWORD` variables instead of the shared `RABBITMQ_*` contract
- production Kubernetes base manifests commit placeholder secrets or placeholder production config values
- backend service manifests stop consuming the `talentsphere-secrets` runtime Secret
- package scripts, CI, or `module-manifest.json` no longer expose the validator

The infrastructure validator fails when:

- Compose `SERVICE_NAME` or `MODULE: services/...` references point to missing, unclassified, or orphaned modules
- Compose `depends_on` entries point to services that are not defined in that file
- root Compose uses stale frontend bind mounts such as `./src:/app/src`
- Kustomize omits an active deployable module, references an orphaned module, or leaves an unlisted service YAML in `infra/k8s/base/services`
- scheduler CronJob commands reference missing npm scripts
- API Gateway `lb://...` route targets point to missing, unclassified, or orphaned deployable modules

The extension contract test fails when:

- the extension manifest expands beyond storage, activeTab, scripting, or the supported LinkedIn/Indeed/Glassdoor content-script hosts without updating the contract
- extension manifest icon assets under `chrome-extension-project/public/icons` are missing or the runtime smoke can no longer load the built MV3 artifact, open the popup, round-trip `chrome.storage.local`, and ping the background worker
- source code introduces `chrome.storage.sync`, network fetch/XHR, or remote sync behavior before ADR-006 accepts extension sync
- operational diagnostics lose the explicit metadata allowlist, local queue cap, or opt-in usage diagnostics key
- raw resume text, raw job descriptions, notes, URLs, prompts, tokens, email addresses, or other content-like fields become diagnostics metadata
- diagnostics export stops using the sanitized operational analytics queue

The extension messaging test fails when:

- content scan parsing no longer extracts role, company, source host, URL, description limits, and confidence from supported page metadata
- background draft creation no longer maps scanned metadata or active-tab fallback data into a local tracker draft
- background and content scripts drift away from the `scrape_job_metadata`, `analyze_page`, `ping`, and unhandled-message response contracts
- background message listeners stop keeping the async response port open or content handlers stop responding synchronously

The extension storage migration test fails when:

- unversioned existing extension storage no longer receives the current schema marker while preserving known local keys
- current-version storage mutates unnecessarily
- newer storage versions are not treated as non-destructive no-ops with a warning
- malformed known local keys are not reported through bounded warning codes
- the MV3 install/update lifecycle no longer invokes storage migration or logs only sanitized migration counts

## Current Open Decisions

- `services/chat-service` remains source-classified as orphaned and is intentionally not routed or deployed until it is either added to the Maven reactor and CI or retired/merged into `messaging-service` after the messaging boundary decision.
- Docker Compose image builds and Kubernetes cluster rollout remain Not verified from the codebase because local Docker/Kubernetes execution is unavailable.
- Legacy root Vite files and the `apps/backend` modular-monolith stub need a final keep/remove decision.
- Tracked dev-only artifacts are now classified, but final archive/remove decisions remain open. `notebooklm_cookies.txt` is a sensitive local cookie export and should be purged after owner review.
- Documentation lifecycle is source-validated, but historical docs remain in place for context until final archive/remove decisions are made.
- Data ownership is source-validated, but table migrations, RLS, and index coverage remain incomplete until Phase 2 schema authority work is implemented.
