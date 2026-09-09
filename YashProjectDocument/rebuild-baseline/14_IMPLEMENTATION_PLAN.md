# TalentSphere — Fresh Rebuild Implementation Plan

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Implementation blueprint derived from the rebuild baseline. Extracted 2026-09-08.
> **Scope boundary**: This plan is for the FRESH REBUILD phase (which begins AFTER documentation completes). It is the "PLAN" output of the DISCOVER→ANALYZE→VERIFY→CLASSIFY→CONSOLIDATE→DOCUMENT→TRACE→PLAN sequence. Do not begin implementing until this phase is explicitly authorized.

## Rebuild Principles

1. **Zero-loss**: Nothing in the [Preservation Register](11_PRESERVATION_REGISTER.md) is dropped.
2. **Disposition-driven**: Every artifact follows its [Rebuild Register](12_REBUILD_REGISTER.md) disposition.
3. **Migration-first**: Schema changes go through `infra/db/migrations/`, never direct edits.
4. **Validate continuously**: All 20 validators + 846 tests stay green.
5. **Preserve security**: 119 RLS policies are the security core — never regress.

## Recommended Implementation Order

### Phase 0 — Foundation (no code)
- [ ] Confirm baseline set completeness (Final Knowledge Audit, [15_KNOWLEDGE_AUDIT.md](15_KNOWLEDGE_AUDIT.md))
- [ ] Authorize fresh-build start (exit analysis phase)
- [ ] Establish clean git branch for rebuild

### Phase 1 — Core Scaffolding
- [ ] Initialize frontend: React 19 + Vite 7 + TS strict + Tailwind 4.2 + Redux Toolkit + Router v7
- [ ] Initialize Aura design system (23 primitives from baseline)
- [ ] Initialize Supabase client + auth bootstrap
- [ ] Initialize backend: Maven reactor, Spring Cloud Gateway (:8080)
- [ ] Restore database schema from `supabase-schema.sql` + migrations

### Phase 2 — Data Plane
- [ ] Restore 50 tables with RLS (119 policies) + enums + triggers + functions + indexes
- [ ] Apply seed data
- [ ] Restore all 20 schema validators; green

### Phase 3 — Core Features (in dependency order)
- [ ] Auth (FR-01) + role guards
- [ ] Landing + Dashboard (FR-02/03)
- [ ] Profile + Resume (FR-09/10)
- [ ] Jobs + Job Detail + Post Job (FR-02/21)
- [ ] Notifications + Settings (FR-11/12)

### Phase 4 — Engagement Features
- [ ] Networking (FR-06)
- [ ] Messaging + Realtime (FR-07)
- [ ] LMS (FR-04)
- [ ] Challenges (FR-05)
- [ ] Gamification (FR-19)

### Phase 5 — Intelligence & Governance
- [ ] AI Assistant heuristics (FR-08) — keep SourceStatusBadge provenance
- [ ] Career Path (FR-23)
- [ ] Admin Console + Feature Flags (FR-13/57)
- [ ] Trust & Safety (FR-20)
- [ ] Analytics (FR-15)

### Phase 6 — Companion & Operations
- [ ] Chrome Extension (FR-18, FR-27, FR-28)
- [ ] Schedulers (digests, reminders, KPIs) + cron manifests
- [ ] Docker Compose + k8s manifests

### Phase 7 — Debt Disposition
- [ ] Refactor pnpm-lock.yaml (regenerate, drop stale socket.io) — TD-05
- [ ] Backfill backend JUnit inventory — TD-06
- [ ] Do NOT build live billing yet (DEFER, ADR-005)
- [ ] Do NOT rebuild chat-service (REMOVE) — TD-01
- [ ] Remove apps/backend stub (REMOVE) — TD-02

### Phase 8 — Verification
- [ ] 846 frontend unit tests pass
- [ ] 235 E2E scenarios pass
- [ ] All 20 validators pass
- [ ] 5 scheduler suites pass
- [ ] 7 extension suites pass
- [ ] Traceability matrix verified end-to-end

## Explicitly Excluded From This Rebuild

| Item | Reason | Register |
|------|--------|----------|
| Live Stripe / real payments | ADR-005 demo-mode governance | DEFER |
| LLM-powered AI (beyond heuristics) | Not a rebuild blocker; future enhancement | PRESERVE BUT IMPROVE |
| chat-service as a service | Retired (ADR-004) | REMOVE |
| apps/backend stub | Non-runnable shell | REMOVE |
| Micro-FE expansion (beyond AuthComponents) | Only if MFE actually required | PRESERVE BUT IMPROVE |

## Definition of Done

The fresh rebuild is complete when:
1. Every feature in [05_FEATURES.md](05_FEATURES.md) with a PRESERVE disposition is rebuilt and verified.
2. Zero knowledge from [11_PRESERVATION_REGISTER.md](11_PRESERVATION_REGISTER.md) is lost.
3. All dispositions in [12_REBUILD_REGISTER.md](12_REBUILD_REGISTER.md) are honored.
4. The full test + validator suite is green.
5. The traceability matrix ([13_TRACEABILITY.md](13_TRACEABILITY.md)) holds.
