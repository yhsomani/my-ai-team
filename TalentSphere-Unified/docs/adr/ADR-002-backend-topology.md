# ADR-002 Backend Topology

> Documentation status: Current accepted architecture decision. Keep synchronized with `../../../PLAN.md`, `../ARCHITECTURE_STATUS_INDEX.md`, `../MODULE_MANIFEST.md`, and backend module/deployment source changes.

Date: 2026-06-27

Status: Accepted

Owner: Platform architecture

## Context

The repository currently contains a broad Spring service-module topology and a separate incomplete backend shell:

| Source | Evidence | Current behavior |
| --- | --- | --- |
| Root Maven reactor | `pom.xml` | Builds 26 Maven reactor modules including shared libraries, service modules, and `api-gateway`. Local Maven execution is not available in this workspace. |
| Backend module classification | `module-manifest.json` | Classifies active Maven reactor modules, active deployable services, and one orphaned Maven module. |
| Active service tree | `services/*` | Contains Spring service modules for identity/auth, users, profiles, jobs, applications, companies, notifications, search, gamification, challenges, LMS, video, files, messaging, networking, payments, AI, and API Gateway. |
| Orphaned chat module | `services/chat-service`, `module-manifest.json`, and ADR-004 | Source exists with a `pom.xml`, but the root Maven reactor does not include it. Gateway and deployment references are intentionally removed; ADR-004 accepts one messaging boundary, so chat-service must be retired or merged as adapter code rather than promoted as a second product boundary. |
| Unified backend shell | `apps/backend/src/main/resources/application.yml` | A backend shell exists, but it is not a complete Spring Boot application and is not part of the root Maven reactor. |
| API Gateway | `services/api-gateway/src/main/resources/application.yml` | Routes active `/api/v1/*` service families to active deployable service modules. |
| Infrastructure references | `docker-compose.yml`, `infra/docker/docker-compose.yml`, `infra/k8s/base`, `scripts/validate-infrastructure-manifest.mjs` | Compose, Kustomize, Gateway, and scheduler references are source-validated against active/orphaned module classification, but Docker/Kubernetes runtime is not locally verified. |
| Static API contracts | `docs/API_CONTRACT_MISMATCH_REPORT.md`, `docs/API_OPENAPI_CONTRACT.json` | Source-derived route and payload contracts are generated from current active service controllers, not from a running unified backend. |

The current service layout provides useful domain boundaries, but it does not prove production-ready microservice independence. The repository does not prove separate database ownership, independent deployment cadence, service discovery runtime, live observability dashboards, Maven execution in this workspace, Docker image availability, Kubernetes rollout, or production traffic behavior.

The `apps/backend` shell also does not prove a completed modular monolith. It is a target shell and migration destination, not current runtime evidence.

## Decision

The rebuild target is **modular monolith first, with explicit extractable service boundaries**.

This means:

1. The product should converge on one backend application boundary for rebuild clarity, local developer experience, transaction consistency, API contract generation, and simpler production readiness.
2. Existing `services/*` modules remain the current source evidence and migration source until domains are moved or retired deliberately.
3. Domain boundaries from the current service tree must be preserved inside the target backend as modules, not collapsed into a god application.
4. Extractable boundaries must remain explicit so a domain can become a separately deployed service later only when independent deployment, database ownership, scaling, and observability are proven.
5. `api-gateway` remains the current edge/auth/routing component while the service tree is active; it may become an ingress/BFF edge or be retired only after the modular backend has equivalent auth, routing, rate-limit, and contract coverage.
6. `services/chat-service` remains orphaned after ADR-004; follow-up work must retire it or merge useful realtime adapter code into the messaging domain without duplicate persistence.

This ADR accepts the PLAN recommendation in section 11.2. It does not claim the modular monolith is implemented today.

## Target Backend Shape

The target backend should use feature/domain modules with explicit layers:

```text
apps/backend/src/main/java/com/talentsphere/
  TalentSphereApplication.java
  identity/
    domain/
    application/
    infrastructure/
    web/
  profile/
  jobs/
  applications/
  learning/
  assessment/
  networking/
  messaging/
  billing/
  ai/
  notifications/
  files/
  admin/
  shared/
    security/
    persistence/
    events/
    observability/
```

Dependency direction:

1. `web` and adapters depend inward on application/domain contracts.
2. Domain modules do not depend on controllers, persistence implementations, external providers, or other domain internals.
3. Cross-domain communication uses application ports, domain events, or explicit read models.
4. Shared modules contain primitives only: security, persistence, events, observability, contracts, and resilience.
5. No target module may own unrelated business rules.

## Alternatives Considered

| Alternative | Outcome | Reason |
| --- | --- | --- |
| Keep broad microservice deployment as the rebuild default | Rejected as default | The repo has many service modules, but production service independence, separate databases, live service discovery, Docker/Kubernetes rollout, and observability are Not verified from the codebase. Keeping microservices as the target would require proving every service boundary before the product is production-ready. |
| Complete `apps/backend` immediately and delete all services | Rejected as immediate action | Existing service modules contain the current backend source evidence. Deleting or bypassing them without migration would risk losing implemented controllers, service logic, tests, contracts, and infrastructure references. |
| Hybrid indefinitely: direct Supabase, Gateway services, and backend shell all remain peers | Rejected | Indefinite hybrid ownership keeps API contracts, auth, data ownership, observability, and developer workflows ambiguous. Hybrid access can remain only as a migration state with explicit ownership and validation. |
| Modular monolith first with extractable boundaries | Accepted | Matches the PLAN recommendation, preserves discovered domains, reduces production-readiness complexity, and keeps future extraction possible when a domain proves independent operational needs. |

## Consequences

- Backend topology work should prioritize target domain modules, explicit ownership, generated contracts, and local verification over adding new service sprawl.
- Existing service modules remain active until each domain is migrated, wrapped, or retired with tests and docs.
- Infrastructure validators continue to protect the current service deployment surface while it exists.
- New backend features should not add new deployable services without an ADR amendment proving independent scaling, database ownership, deployment, monitoring, and rollback needs.
- ADR-004 must resolve the `messaging-service` versus orphaned `chat-service` boundary before chat source is routed or deployed.
- Runtime production readiness still requires Maven execution, runtime API smoke tests, Docker builds, Kubernetes rollout, and observability verification.

## Migration Plan

1. Keep `module-manifest.json` as the source classifier for active, orphaned, legacy, and target modules while migration is underway.
2. Preserve static API contracts from active service controllers with `npm run report:api-contracts`, `npm run report:api-openapi`, and `npm run validate:api-openapi-contract`.
3. Define target domain package boundaries in `apps/backend` before moving behavior.
4. Move one domain at a time behind stable API/schema contracts, starting with domains that currently have the least runtime provider coupling.
5. For each migrated domain, add domain unit tests, adapter tests, API contract tests, authorization tests, migration/RLS/index evidence if database-backed, and runbook/observability updates.
6. Remove or retire old service-module routes only after frontend/API contracts and Gateway behavior prove equivalent behavior.
7. Keep `api-gateway` routing to current active services until replacement auth/routing/rate-limit behavior is verified in the target backend.
8. Decide `chat-service` through ADR-004 before adding it back to the Maven reactor or routing/deploying it.

## Rollback Plan

- During migration, keep current service modules and Gateway routes available until the target backend domain has passing source, contract, and runtime smoke validation.
- If a migrated domain fails integration testing, route traffic back to the existing service module and keep the target module disabled or non-deployable.
- If the modular backend creates unacceptable coupling or deployability risk for a domain, write an ADR amendment and extract that domain only after proving database ownership, observability, scaling, rollback, and CI/runtime tests.

## Acceptance Criteria

- ADR-002 is accepted and classified in `module-manifest.json`.
- `npm run validate:backend-topology-adr` enforces the accepted decision and current evidence references.
- `PLAN.md` and `docs/ARCHITECTURE_STATUS_INDEX.md` no longer list backend topology as an undecided architecture question.
- Current service modules remain source-classified until migration evidence exists.
- `services/chat-service` remains orphaned unless ADR-004 changes its status and validators are updated.
- New deployable backend services require an ADR amendment and manifest/infrastructure validation.

## Validation Commands

```bash
npm run validate:backend-topology-adr
npm run validate:module-manifest
npm run validate:infrastructure-manifest
npm run report:api-contracts
npm run report:api-openapi
npm run validate:api-openapi-contract
```

Backend Maven execution, Docker image builds, Kubernetes rollout, and live service smoke tests are Not verified from the codebase in the current workspace environment.
