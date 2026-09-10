# ADR-004 Messaging Boundary

> Documentation status: Current accepted architecture decision. Keep synchronized with `../../../PLAN.md`, `../ARCHITECTURE_STATUS_INDEX.md`, `../MODULE_MANIFEST.md`, `../API_CONTRACT_MISMATCH_REPORT.md`, `../API_OPENAPI_CONTRACT.json`, and messaging/chat source changes.

Date: 2026-06-27

Status: Accepted

Owner: Platform architecture

## Context

The repository currently has two overlapping messaging/chat implementations:

| Source | Evidence | Current behavior |
| --- | --- | --- |
| Active messaging service | `services/messaging-service` | Root Maven reactor includes this module. The source-derived API report lists active `/api/v1/messages/*` routes for send, conversation history, unread count, mark-read, and health. |
| Frontend messaging feature | `apps/frontend/src/services/messagingService.ts`, `apps/frontend/src/pages/messaging/MessagingPage.tsx` | Frontend messaging uses Supabase tables such as `conversations`, `conversation_participants`, `messages`, and `profiles`; it does not call `/api/v1/chat/*` as deployable product API surface. |
| Orphaned chat service | `services/chat-service`, `module-manifest.json` | Source exists with a `pom.xml`, Mongo config, STOMP/WebSocket config, `/api/v1/chat/*` REST routes, and tests, but the root Maven reactor does not include it. |
| API Gateway and deployment source | `services/api-gateway/src/main/resources/application.yml`, `docker-compose.yml`, `infra/docker/docker-compose.yml`, `infra/k8s/base` | Gateway, Compose, and Kustomize references to `chat-service` have been removed; `messaging-service` remains active. |
| Static API report | `docs/API_CONTRACT_MISMATCH_REPORT.md` | Records 3 non-active backend controller routes from `services/chat-service` and active messaging routes from `services/messaging-service`. |
| OpenAPI payload contract | `docs/API_OPENAPI_CONTRACT.json` | Excludes orphaned chat operations from deployable `paths` and records them under `x-talentsphere.nonActiveOperations`. |

The source proves the product currently has durable messaging concepts, unread state, and direct frontend realtime/table usage. It does not prove a separate production chat product boundary, separate chat database ownership, independent chat deployment, working STOMP runtime, live Mongo deployment, or deployable Gateway route for `/api/v1/chat/*`.

Runtime WebSocket/STOMP behavior, live message ordering, live dedupe, conversation membership authorization, attachment signed access, and backend Maven execution are Not verified from the codebase.

## Decision

The rebuild target is **one messaging domain boundary**.

Durable messages, conversation membership, unread state, attachments, realtime delivery, and retry/reconciliation behavior belong to the `messaging` domain. `services/messaging-service` remains the current active backend source evidence while the modular-monolith rebuild is incomplete.

`services/chat-service` is not a deployable product boundary. It remains explicitly orphaned and quarantined until follow-up work either:

1. migrates useful STOMP/WebSocket adapter ideas into the messaging domain without creating duplicate persistence, or
2. retires the module and removes its source after confirming no production route, deployment, test, or documentation dependency remains.

ADR-004 rejects adding `chat-service` back to the Maven reactor, Gateway, Docker Compose, or Kubernetes as a separate chat product service unless a future ADR supersedes this one with evidence for independent deployment, ownership, scale, persistence, observability, and authorization.

## Target Boundary

The target messaging domain owns:

- conversations and participants
- direct and group message persistence
- unread state and read markers
- attachment references and file-service signed-access integration
- realtime fanout and reconnect reconciliation
- delivery status transitions
- membership authorization
- notification events for unread/digest flows

It must not own:

- file binary storage or malware scanning
- notification delivery providers
- profile/user identity authority
- AI reply generation outside explicit suggestion/review workflows
- a second `chat_messages` persistence model unless a future ADR accepts a separate boundary

## Alternatives Considered

| Alternative | Outcome | Reason |
| --- | --- | --- |
| Promote `chat-service` as a separate deployable service | Rejected | The module is orphaned from the reactor, Gateway, and deployment manifests; live STOMP/Mongo runtime is Not verified from the codebase. |
| Keep both `messaging-service` and `chat-service` as product authorities | Rejected | Duplicate message/conversation persistence would keep unread semantics, membership authorization, realtime ordering, and data ownership ambiguous. |
| Delete `chat-service` immediately | Deferred | It still contains source evidence and tests that may inform a messaging realtime adapter; deletion should happen after a migration/retirement checklist and validation update. |
| Frontend-only Supabase messaging as final authority | Rejected as final state | Direct Supabase access exists today, but PLAN targets backend-owned writes and typed repository migration unless explicit direct access is retained behind policy and generated types. |

## Consequences

- `messaging-service` remains active and `chat-service` remains orphaned in `module-manifest.json`.
- `/api/v1/chat/*` remains non-active API surface and must not be added back to Gateway/deployment by default.
- Realtime behavior should be implemented as an adapter inside the messaging boundary, not as a second persistence authority.
- Frontend direct Supabase messaging access remains migration debt until moved behind typed repositories or backend-owned APIs.
- Any future chat-specific feature must prove why it cannot live in the messaging domain before adding a separate service boundary.

## Migration Plan

1. Keep `services/chat-service` orphaned and non-deployable while this decision is implemented.
2. Inventory useful chat-service code:
   - STOMP/WebSocket config,
   - realtime fanout patterns,
   - fallback behavior,
   - tests that can become messaging-domain adapter tests.
3. Add messaging-domain authorization tests for conversation membership before moving or exposing realtime send/read operations.
4. Move any retained realtime adapter source into the messaging domain or target modular-monolith messaging package.
5. Remove `services/chat-service` source, API report non-active route entries, and orphaned-module manifest classification only after no dependency remains.
6. Update OpenAPI contracts, runbooks, and frontend repositories after the active messaging API becomes the single product messaging path.

## Rollback Plan

- Keep `services/chat-service` source available until migration/retirement is verified.
- If realtime adapter migration fails, keep chat-service orphaned and non-deployable while the messaging API remains the active durable path.
- Do not restore Gateway/deployment references to `/api/v1/chat/*` without a superseding ADR and source-level validation.

## Acceptance Criteria

- ADR-004 is accepted and classified in `module-manifest.json`.
- `npm run validate:messaging-boundary-adr` passes locally and in CI.
- `module-manifest.json` keeps `services/messaging-service` active and `services/chat-service` explicitly orphaned.
- `docs/API_CONTRACT_MISMATCH_REPORT.md` continues to classify `/api/v1/chat/*` routes as non-active orphaned routes.
- `docs/API_OPENAPI_CONTRACT.json` continues to exclude `/api/v1/chat/*` from deployable `paths`.
- Gateway, Docker Compose, and Kubernetes manifests do not deploy or route to `chat-service`.
- PLAN and architecture docs describe a single messaging boundary and keep runtime realtime gaps explicit.

## Validation Commands

```bash
npm run validate:messaging-boundary-adr
npm run validate:module-manifest
npm run validate:infrastructure-manifest
npm run report:api-contracts
npm run report:api-openapi
npm run validate:api-openapi-contract
```

Runtime WebSocket/STOMP behavior, Mongo connectivity, message ordering/dedupe, attachment signed access, and backend Maven execution are Not verified from the codebase in the current workspace environment.
