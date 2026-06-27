# ADR-001 Primary Identity Provider

> Documentation status: Current accepted architecture decision. Keep synchronized with `../../../PLAN.md`, `../ARCHITECTURE_STATUS_INDEX.md`, and auth/gateway source changes.

Date: 2026-06-27

Status: Accepted

Owner: Platform architecture

## Context

The repository currently has two authentication implementations:

| Source | Evidence | Current behavior |
| --- | --- | --- |
| Frontend Supabase Auth | `apps/frontend/src/services/authService.ts` | Registration, login, logout, password reset, user updates, and session reads call `supabase.auth`. |
| Frontend session bootstrap | `apps/frontend/src/App.tsx` | App startup calls `supabase.auth.getSession()` and subscribes to `supabase.auth.onAuthStateChange()`. Development mode can activate a mock user when no session is available. |
| Frontend API bearer token | `apps/frontend/src/api/axios.ts` | Request interceptor reads the Supabase session and sends `Authorization: Bearer <session.access_token>` to API calls. |
| Route roles | `apps/frontend/src/navigation/routeRegistry.ts` | Route and navigation permissions use `ROLE_USER`, `ROLE_RECRUITER`, and `ROLE_ADMIN`. |
| API Gateway routes | `services/api-gateway/src/main/resources/application.yml` | Protected service routes use `AuthenticationFilter`; `/api/v1/auth/**` is routed to `auth-service`. |
| Gateway public-route validator | `services/api-gateway/src/main/java/com/talentsphere/gateway/filter/RouteValidator.java`, `services/api-gateway/src/test/java/com/talentsphere/gateway/filter/RouteValidatorTest.java` | Public route matching uses exact public paths and explicit prefixes instead of substring matching; protected paths that merely contain public path text remain secured. |
| Gateway token validation | `services/api-gateway/src/main/java/com/talentsphere/gateway/util/JwtUtils.java`, `services/api-gateway/src/main/resources/application.yml`, `scripts/validate-auth-contract.mjs` | Current source-level validation parses bearer JWTs and verifies them with `JWT_SECRET` using HMAC. The unused Supabase JWKS URI was removed from Gateway config, and `npm run validate:auth-contract` checks that the source contract stays aligned. |
| Gateway user headers | `services/api-gateway/src/main/java/com/talentsphere/gateway/filter/AuthenticationFilter.java`, `services/api-gateway/src/main/java/com/talentsphere/gateway/util/JwtUtils.java` | The filter forwards `X-User-Id` from verified claims and `X-User-Role` from normalized `role`, `roles`, `app_metadata`, or `user_metadata` claims, defaulting to least-privileged `ROLE_USER`. Source-level tests exist in `services/api-gateway/src/test/java/com/talentsphere/gateway/util/JwtUtilsTest.java`; Maven execution is not locally available. |
| Backend auth-service | `services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java`, `services/auth-service/src/main/java/com/talentsphere/auth/service/AuthService.java`, `services/auth-service/src/main/resources/application.yml`, `services/auth-service/src/test/java/com/talentsphere/auth/controller/AuthControllerLocalCredentialsDisabledTest.java` | Service still contains local credential implementation for compatibility, but `/api/v1/auth/register` and `/api/v1/auth/login` return `410 Gone` by default unless `AUTH_LOCAL_CREDENTIALS_ENABLED=true` is explicitly set. |

This creates split login authority. The active frontend does not call backend `auth-service` login/register for normal user authentication, while the backend still exposes local credential flows. Keeping both as login authorities would leave user lifecycle, token claims, password policy, role assignment, password reset, and session revocation ambiguous.

Production Supabase project settings, deployed callback URLs, Supabase JWT algorithm for the configured project, and runtime Gateway validation with a live Supabase token are Not verified from the codebase.

## Decision

Supabase Auth is the primary login, registration, logout, session, password-reset, and user-authentication authority for the current rebuild path.

Backend `auth-service` must not remain a second product login authority. It is retained only as a compatibility module until a follow-up implementation either:

1. converts it into an identity bootstrap/profile bridge and auth-related event producer that trusts verified Supabase identity, or
2. retires its local credential endpoints from deployable product paths after dependent services and docs are migrated.

The target token contract is:

| Contract item | Target |
| --- | --- |
| Browser token source | Supabase session access token. |
| API header | `Authorization: Bearer <supabase_access_token>`. |
| Gateway responsibility | Validate the Supabase access token with one configured verifier and reject missing, expired, malformed, or invalid-signature tokens. |
| User identity header | Forward stable authenticated user ID to backend services after validation. |
| Role source | Normalize roles from Supabase app metadata/profile data into `ROLE_USER`, `ROLE_RECRUITER`, and `ROLE_ADMIN`; do not infer privileged roles from missing claims. |
| Missing role behavior | Default only to least-privileged `ROLE_USER` after the token is verified and the user is known. |
| Local development fallback | Keep mock user behavior dev-only and impossible to activate in production builds. |

Gateway validation is source-configured for the HMAC `JWT_SECRET` path used by `JwtUtils`. The rebuild must keep exactly one verified Gateway validation path for the configured Supabase project:

- If the project issues HMAC-signed access tokens, keep HMAC validation and the `JWT_SECRET` contract.
- If the project issues JWKS-verifiable access tokens, replace custom HMAC validation with JWKS-backed validation.

The correct runtime algorithm is Not verified from the codebase.

## Alternatives Considered

| Alternative | Outcome | Reason |
| --- | --- | --- |
| Backend auth-service as primary login authority | Rejected for current rebuild path | Active frontend already uses Supabase Auth for login/session/password flows, and switching authority would require a broader migration not evidenced as necessary. |
| Both Supabase Auth and backend auth-service remain login authorities | Rejected | Split credentials and split JWT claim contracts would keep route, Gateway, role, reset, revocation, and audit behavior ambiguous. |
| External enterprise IdP now | Deferred | No source evidence proves an enterprise IdP integration, tenant model, or production callback setup. |

## Consequences

- Frontend auth flows remain Supabase-backed.
- Backend services must consume a normalized, Gateway-verified identity contract instead of trusting local auth-service tokens by default.
- Backend auth-service local credential endpoints become compatibility or migration surfaces, not product authority.
- Gateway token verification and role extraction are now a P0 implementation item under Phase 1.
- Any future enterprise IdP support must be implemented through an auth provider adapter while preserving one primary login authority at runtime.

## Migration Plan

1. Add tests for current frontend bootstrap and API bearer-token installation. This is already partly implemented by `apps/frontend/src/main.test.tsx` and `apps/frontend/src/api/axios.test.ts`.
2. Add Gateway token-contract tests using a known Supabase-compatible token fixture for the selected validation path.
3. Keep Gateway auth configuration on exactly one verifier. Source-level HMAC `JWT_SECRET` validation is now enforced by `npm run validate:auth-contract`; live Supabase token verification remains pending.
4. Normalize Gateway role extraction from Supabase metadata/profile claims to `ROLE_*`; reject or downgrade unrecognized roles. Source-level implementation and tests were added on 2026-06-27; backend Maven execution remains pending.
5. Replace substring public-route matching with exact public path and explicit prefix matching. Implemented on 2026-06-27 with `RouteValidatorTest`; backend Maven execution remains pending.
6. Convert backend `auth-service` login/register endpoints into compatibility-only or remove them from deployable paths after dependent routes, docs, and tests are migrated. Compatibility-only default-disabled behavior was implemented on 2026-06-27 with `AUTH_LOCAL_CREDENTIALS_ENABLED=false` by default.
7. Add an identity bootstrap API if backend services need a local profile/user row created from a verified Supabase identity.
8. Update security docs, OpenAPI/contracts, and runbooks with the final token claim mapping.

## Rollback Plan

- Keep the current Supabase frontend session path available during Gateway validation changes.
- Gate any backend auth-service endpoint retirement behind route, contract, and frontend validation.
- If Gateway validation rejects valid Supabase tokens in staging, restore the previous verifier configuration and keep auth-service endpoints compatibility-only until token fixtures and project settings are corrected.

## Acceptance Criteria

- Frontend registration, login, logout, session restore, and password reset use Supabase Auth only.
- API requests carry Supabase access tokens through the configured HTTP client.
- Gateway validates the same token shape produced by the configured Supabase project.
- Gateway public-route matching cannot be bypassed by protected paths containing public path text as a substring.
- Gateway forwards a stable user ID and normalized least-privilege role header after validation.
- Backend local credential login is not presented as a product login authority and returns disabled-by-default responses unless compatibility mode is explicitly enabled.
- Role matrix tests cover unauthenticated, user, recruiter, and admin access.
- Production builds cannot activate the development mock user.

## Validation Commands

```bash
npm run validate:docs-lifecycle
npm run validate:module-manifest
npm run validate:auth-contract
npm run report:api-contracts
npm run test:unit -- --run src/main.test.tsx src/api/axios.test.ts src/navigation/routeRegistry.test.ts
```

Backend Gateway token validation tests require Maven or CI execution. Local backend Maven execution is Not verified from the codebase in the current workspace environment.
