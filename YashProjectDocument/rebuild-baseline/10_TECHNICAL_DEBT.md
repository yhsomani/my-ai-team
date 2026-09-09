# TalentSphere — Technical Debt Register (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Complete technical debt register. Extracted 2026-09-08.
> Each debt item: severity (CRITICAL/HIGH/MEDIUM/LOW), impact, and rebuild disposition.

## CRITICAL Debt

| # | Debt | Details | Disposition |
|---|------|---------|-------------|
| TD-01 | **Chat-service orphaned** | 1 controller exists but module is OUTSIDE the Maven reactor. `validate-messaging-boundary-adr.mjs` enforces that resolution must "retire" OR "merge". Dead weight in repo. | Retire or merge realtime adapter into messaging-service (ADR-004) |
| TD-02 | **apps/backend non-runnable stub** | Historical Spring shell that cannot boot. Causes confusion about the "real" backend. | Remove from implementation; preserve as artifact |

## HIGH Debt

| # | Debt | Details | Disposition |
|---|------|---------|-------------|
| TD-03 | **Billing is DEMO-ONLY** | payment-service + tables exist but all flows simulated (`billingMode: 'demo'`). No live Stripe, no webhooks. | DEFER live; keep demo scaffold until provider verified (ADR-005) |
| TD-04 | **AI assistant is rule-based, not LLM** | F-11 claims "AI" but uses heuristics, not a real model. `SourceStatusBadge` discloses provenance. | Keep; document honestly as heuristics. Swap to LLM behind the same interface later |
| TD-05 | **Stale pnpm-lock.yaml socket.io entry** | socket.io-client removed from package.json/vite.config but lockfile not regenerated. | Regenerate lockfile on next `pnpm install` |
| TD-06 | **Backend test inventory incomplete** | Frontend (846) + validators (22) well-documented; per-service JUnit coverage not enumerated. | Enumerate in rebuild; backfill service tests |

## MEDIUM Debt

| # | Debt | Details | Disposition |
|---|------|---------|-------------|
| TD-07 | **Docs sprawl history** | Older `docs/` files reference superseded Express/tRPC/MySQL stack (contradicts ADRs). | Rebuild-baseline set supersedes; legacy docs marked historical |
| TD-08 | **Feature flags count volatility** | 40 stable flags; enable/disable/reset endpoints are runtime-mutable. Need governance. | Add flag-change audit in rebuild |
| TD-09 | **Extension test coverage thinner** | 7 suites exist but no E2E for extension popup flows beyond contract/runtime-smoke. | Add popup E2E in rebuild |

## LOW Debt

| # | Debt | Details | Disposition |
|---|------|---------|-------------|
| TD-10 | **Vite federation only exposes AuthComponents** | Only 1 module federated. Full micro-FE not realized. | Keep; expand only if MFE is truly needed |
| TD-11 | **Mock server duplicated logic** | `scripts/mock-server.cjs` mirrors real API; drift risk. | Keep for dev; guard with schema validation |
| TD-12 | **No CI/CD config captured** | Docker/k8s manifests exist; no pipeline definition in baseline. | Add CI pipeline in rebuild |

## Debt Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 4 |
| MEDIUM | 3 |
| LOW | 3 |
| **Total** | **12** |

## Debt vs Rebuild Register Cross-Reference

Every debt item has a corresponding disposition in the [Rebuild Register](12_REBUILD_REGISTER.md):
- TD-01 → RR-REFACTOR (chat-service)
- TD-02 → RR-REMOVE (apps/backend)
- TD-03 → RR-DEFER (billing)
- TD-05 → RR-REFACTOR (lockfile)
- TD-04 → RR-PRESERVE (AI heuristics)
