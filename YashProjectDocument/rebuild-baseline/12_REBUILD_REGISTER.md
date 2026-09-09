# TalentSphere — Rebuild Register (MANDATORY)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Complete rebuild disposition for EVERY artifact. Extracted 2026-09-08.
> Dispositions: **PRESERVE AS-IS**, **PRESERVE BUT IMPROVE**, **REFACTOR**, **REIMPLEMENT**, **REDESIGN**, **REMOVE FROM IMPLEMENTATION**, **DEFER**, **UNKNOWN**.
> This register pairs with the [Preservation Register](11_PRESERVATION_REGISTER.md): preservation guarantees the knowledge is never lost; this register decides what happens to the code in the fresh rebuild.

## Rebuild Disposition Matrix

| Artifact | Disposition | Notes |
|----------|-------------|-------|
| **Frontend (React SPA)** | PRESERVE AS-IS | Complete, 846 tests passing |
| Aura design system | PRESERVE AS-IS | SSOT, consistent |
| 21 frontend services | PRESERVE AS-IS | Well-tested API layer |
| Route registry / navigation | PRESERVE AS-IS | Role-guarded, tested |
| Auth pages + authService | PRESERVE AS-IS | Supabase Auth SSOT |
| 22 page components | PRESERVE AS-IS | 22 fully implemented |
| Vite federation setup | PRESERVE BUT IMPROVE | Expand exposes if MFE needed (TD-10) |
| **Database schema** | PRESERVE AS-IS | 50 tables, migration-first |
| 119 RLS policies | PRESERVE AS-IS | Security core |
| **26 Spring Boot services** | PRESERVE AS-IS | Maven reactor, 18 with controllers |
| Spring Cloud Gateway | PRESERVE AS-IS | Entry point :8080 |
| Supabase client | PRESERVE AS-IS | DB access layer |
| **Chrome extension** | PRESERVE AS-IS | Local-first MV3 |
| **Billing (payments)** | DEFER | Demo-mode until Stripe verified (TD-03) |
| **AI assistant heuristics** | PRESERVE BUT IMPROVE | Honest heuristics; LLM behind same interface (TD-04) |
| **chat-service** | REMOVE FROM IMPLEMENTATION | Retired; merge realtime adapter into messaging-service if useful (TD-01) |
| **apps/backend stub** | REMOVE FROM IMPLEMENTATION | Non-runnable shell (TD-02) |
| pnpm-lock.yaml | REFACTOR | Regenerate to drop stale socket.io (TD-05) |
| **Feature flags** | PRESERVE BUT IMPROVE | Add flag-change audit (TD-08) |
| Scheduler scripts | PRESERVE AS-IS | 5 schedulers tested |
| Validators | PRESERVE AS-IS | 22 governance scripts (20 .mjs + 2 .sh) |
| **Backend tests** | PRESERVE BUT IMPROVE | Enumerate + backfill JUnit coverage (TD-06) |
| Mock server | PRESERVE BUT IMPROVE | Schema-validate to reduce drift (TD-11) |
| **Docs** | PRESERVE AS-IS | Canonical baseline set |
| Legacy (Express/tRPC/MySQL) docs | REMOVE FROM IMPLEMENTATION | Superseded; preserve as marked history |
| CI/CD | REDESIGN | No pipeline captured (TD-12) |

## Disposition Summary

| Disposition | Count | Artifacts |
|-------------|-------|-----------|
| PRESERVE AS-IS | 16 | Frontend, Aura, services, routes, auth, pages, DB, RLS, 26 services, gateway, supabase client, extension, schedulers, validators, docs |
| PRESERVE BUT IMPROVE | 5 | Federation, AI heuristics, feature flags, backend tests, mock server |
| REFACTOR | 1 | pnpm-lock.yaml |
| REIMPLEMENT | 0 | — |
| REDESIGN | 1 | CI/CD |
| REMOVE FROM IMPLEMENTATION | 3 | chat-service, apps/backend stub, legacy docs |
| DEFER | 1 | Billing (demo mode) |
| UNKNOWN | 0 | — |
| **Total** | **27** | |

## Key Dispositions Detail

### REMOVE FROM IMPLEMENTATION
These are removed from the fresh build, but their knowledge is preserved in the [Preservation Register](11_PRESERVATION_REGISTER.md):
- **chat-service** — realtime adapter may merge into messaging-service; otherwise retired (ADR-004, DECISION-004)
- **apps/backend stub** — superseded by services/ reactor (ADR-002)
- **legacy docs** — superseded by rebuild-baseline set; kept as marked history

### DEFER
- **Billing live integration** — keep demo-mode scaffold; do NOT invest in live Stripe until provider verified (ADR-005)

### PRESERVE BUT IMPROVE (with ceilings)
- **AI assistant** (`ponytail:` note) — heuristics are honest; LLM swap is a future enhancement, not a rebuild blocker
- **Federation** — 1 exposed module is sufficient unless MFE is actually required
