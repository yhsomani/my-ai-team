# ADR-005 Payment Mode

> Documentation status: Current accepted architecture decision. Keep synchronized with `../../../PLAN.md`, `../ARCHITECTURE_STATUS_INDEX.md`, `../MODULE_MANIFEST.md`, billing source, payment-service source, API contracts, and schema changes.

Date: 2026-06-27

Status: Accepted

Owner: Platform architecture

## Context

The repository currently exposes billing and payment behavior from multiple partial sources:

| Source | Evidence | Current behavior |
| --- | --- | --- |
| Frontend billing page | `apps/frontend/src/pages/billing/BillingPage.tsx` | Loads plans, payment history, and active subscription through the frontend payment service; now displays explicit demo billing mode when provider-backed checkout is not verified. |
| Frontend payment service | `apps/frontend/src/services/paymentService.ts` | Reads and writes Supabase billing tables and invokes repo-external Supabase Edge Functions named `create-checkout-session`, `create-subscription`, and `create-billing-portal-session`. |
| Frontend billing tests | `apps/frontend/src/services/paymentService.test.ts` | Verifies the explicit `billingMode` export is demo and provider-backed mode is false. |
| Backend payment service | `services/payment-service/src/main/java/com/talentsphere/payment/service/PaymentService.java` | Creates synthetic `sess_...` session IDs, saves local transactions, and builds a `paymentUrl` from `STRIPE_PAYMENT_URL_BASE` or a default Stripe-looking URL. |
| Stripe config | `services/payment-service/src/main/java/com/talentsphere/payment/config/StripeConfig.java`, `services/payment-service/pom.xml` | Stripe Java dependency and helper config exist, but the active payment service does not use this helper from checkout creation. |
| API contract | `docs/API_CONTRACT_MISMATCH_REPORT.md`, `docs/API_OPENAPI_CONTRACT.json` | Active payment routes include checkout, status, history, plans, and health. No active webhook route is present in the generated contracts. |
| Billing schema | `supabase-schema.sql`, `data-ownership-manifest.json` | `subscription_plans`, `subscriptions`, and `payments` exist in reviewed SQL and ownership metadata, but runtime migration execution is not verified. |

The source proves a billing demo/request workflow exists. It does not prove live provider checkout, webhook signature validation, provider-owned subscription state, tax/invoice handling, refunds through a provider, billing portal sessions, idempotency keys, or production Stripe credentials.

Live Stripe integration, webhook endpoint execution, provider catalog, invoice/tax handling, provider-owned subscription state, and payment-provider failure behavior are Not verified from the codebase.

## Decision

The current rebuild mode is **explicit demo billing mode**.

This means:

1. The product must label current billing as demo/non-provider-backed anywhere it could otherwise imply live payment processing.
2. Frontend billing actions may collect user intent and attempt configured handoffs, but client redirects must not be treated as final subscription/payment state.
3. Backend `payment-service` synthetic sessions are demo/request records, not live Stripe checkout sessions.
4. Stripe dependency/config may remain as inactive provider-adapter scaffolding, but it must not be documented as production-ready until checkout creation and webhooks use it with tests.
5. Provider-backed mode may be accepted only after webhook signature validation, idempotency, provider-owned subscription/payment state, audit events, no-sensitive-logging guarantees, and runtime provider tests exist.
6. Billing tables remain source-visible state, but provider webhooks must own final subscription/payment transitions when live mode is implemented.

## Target Live Billing Requirements

Provider-backed billing requires:

- configured provider credentials and callback URLs outside source control
- checkout session creation through a provider adapter
- signed webhook endpoint and tests
- idempotency keys for checkout and webhook event processing
- webhook-owned payment/subscription state transitions
- explicit demo/live mode flag and UI source label
- audit records for checkout commands and webhook events
- no card, token, secret, or raw provider payload logging
- fallback UX for provider unavailable, abandoned checkout, duplicate events, and inactive subscriptions

## Alternatives Considered

| Alternative | Outcome | Reason |
| --- | --- | --- |
| Treat current checkout as live Stripe | Rejected | Active backend checkout is synthetic, frontend Edge Functions are repo-external, and no source-backed webhook route exists. |
| Remove billing UI until provider mode exists | Rejected for now | The product already has billing pages, schema, tests, and plan/history flows; hiding all billing would be broader product work than the evidence requires. |
| Keep billing ambiguous | Rejected | Money-handling ambiguity is a production risk. Demo/live mode must be explicit. |
| Implement full provider-backed billing now | Deferred | Requires credentials, webhook runtime, provider test fixtures, idempotency storage, and integration environment evidence not present in this workspace. |

## Consequences

- Billing remains visible but explicitly labeled as demo/non-provider-backed.
- Plan changes and payment-method actions must not claim final provider success without webhook evidence.
- API contracts may continue exposing current payment routes as active source surface, but production readiness remains blocked until provider-backed mode is implemented or billing is intentionally demo-only in production.
- Any future live billing work must update this ADR, validators, runbooks, security checks, and UI source labels.

## Migration Plan

1. Keep `billingMode.providerBacked` false until live provider requirements are implemented.
2. Add provider mode configuration and fail-fast production checks before live payment processing is enabled.
3. Implement a backend provider adapter for checkout sessions and billing portal sessions.
4. Add a signed webhook endpoint with idempotency and audited event processing.
5. Move subscription/payment final state changes to webhook-owned transitions.
6. Update frontend billing UI to switch source labels from demo to live only after source-level and runtime verification.
7. Add provider contract tests and runbook entries for checkout failures, webhook failures, duplicate events, and refunds.

## Rollback Plan

- Keep demo billing mode as the safe fallback while provider integration is incomplete.
- If provider-backed checkout fails in staging, disable live mode and preserve read-only plan/history display.
- Do not process client redirect success as final payment state during rollback.

## Acceptance Criteria

- ADR-005 is accepted and classified in `module-manifest.json`.
- `npm run validate:payment-mode-adr` passes locally and in CI.
- Frontend `paymentService.ts` exports `billingMode` with `mode: 'demo'` and `providerBacked: false`.
- Billing page displays demo billing state when provider-backed mode is false.
- Active API contracts do not expose a payment webhook route as implemented.
- Payment-service source remains classified as synthetic/demo until provider adapter and webhook-owned state exist.
- PLAN and architecture docs keep provider-backed payment runtime gaps explicit.

## Validation Commands

```bash
npm run validate:payment-mode-adr
npm run validate:module-manifest
npm run validate:docs-lifecycle
npm run validate:security-contract
npm run report:api-contracts
npm run report:api-openapi
npm run validate:api-openapi-contract
npm run test:unit -- --run src/services/paymentService.test.ts
```

Live Stripe integration, signed webhook execution, provider-owned subscription/payment state, and provider runtime tests are Not verified from the codebase in the current workspace environment.
