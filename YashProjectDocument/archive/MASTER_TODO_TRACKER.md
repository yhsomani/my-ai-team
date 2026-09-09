# Master TODO Tracker — Gap Analysis → Implementation

> Documentation status: Current master task tracker for gap implementation.

> Canonical tracker for working through `docs/GAP_ANALYSIS_AND_IMPLEMENTATION_PLAN.md`.
> Baseline: commit `d4ef1a6`. Tracker created: 2026-09-04. Last reconciled: 2026-09-06.
> Statuses: `Pending` · `In Progress` · `Blocked` · `Completed` · `Needs Review`
> Verification evidence labels: `[VC]` verified from code · `[VD]` verified from docs · `[CONFLICT]` docs disagree.

---

## Master Checklist

| ID | Task | Priority | Dependencies | Status | Verification |
|---|---|---|---|---|---|
| TODO-001 | Add Trust & Safety schema: enums `report_target_type`/`report_reason`/`moderation_status`, `content_reports` table, indexes, RLS enable, RLS policies, `updated_at` trigger — in `0001_initial_baseline.sql` **and** `supabase-schema.sql` (must stay identical) | Critical | None | Completed | validate:schema-migrations + SQL diff equality |
| TODO-002 | Regenerate `infra/db/generated/database.types.ts` from new baseline | Critical | TODO-001 | Completed | `npm run report:db-types` + validate:schema-migrations green |
| TODO-003 | Add `content_reports` entry to `data-ownership-manifest.json` (fixes pre-existing RED `validate:data-ownership`) | Critical | TODO-001 | Completed | validate:data-ownership green |
| TODO-004 | Update validator invariants: `validate-schema-migrations.mjs` (49→50 tables; 69→70 FK relations), `validate-schema-authority-adr.mjs` (59→60 tables; 45→46 direct-frontend) | Critical | TODO-001 | Completed | both validators green |
| TODO-005 | Remove `(supabase as any)` casts in `trustAndSafetyService.ts` → use typed client (enabled by TODO-002) | Critical | TODO-002 | Completed | frontend build + validate:typed-supabase-boundary green |
| TODO-006 | RLS policies for `experiences` (owner CRUD + public read) in both SQL files | Critical | None | Completed | SQL review + validators green |
| TODO-007 | RLS policies for `educations` (owner CRUD + public read) in both SQL files | Critical | None | Completed | SQL review + validators green |
| TODO-008 | `conversation_participants`: enable RLS; add participant SELECT/INSERT policies | Critical | None | Completed | SQL review + validate:typed-supabase-boundary green |
| TODO-009 | XP-once DB enforcement: `UNIQUE(user_id, reference_type, reference_id)` on `xp_transactions` + types regen | High | None | Completed | validators green + types regen |
| TODO-010 | Re-author `seed-data.sql` for unified schema; align `seed_data.py` + `SEED_DATA_GUIDE.md` | High | TODO-001 | Completed | seed v8.0.0: 50 tables truncated, 32 seeded, INSERT columns validated vs canonical DDL, enums/JSONB/CHECK constraints verified; seed-data-safety + data-ownership + schema validators green |
| TODO-011 | Local backend build/test path: Maven Wrapper or docker-maven build + smoke probes | High | None | Blocked | No `mvnw`, no system Maven, no Docker CLI, no `.github/` workflows (though CLAUDE.md claims wrapper + GH Actions) in a 28-service Maven reactor; cannot build 21-era Spring Boot modules (JDK 26 present only) |
| TODO-012 | Verify/complete gamification XP award loop on challenge/course/lesson completion (frontend) — call sites present at `ChallengesPage.tsx:612`, `LMSPage.tsx:380/389`; correct any stale "zero callers" claims | High | TODO-009 | Completed | unit tests + build |
| TODO-013 | XP-once guard enforced via `xpLedger.evaluateXpAwardEligibility` (dedup + daily cap) AND new DB `UNIQUE(user_id, reference_type, reference_id)` | High | TODO-012 | Completed | gamificationService tests (already_awarded) + validators |
| TODO-014 | Admin write-side: `system_settings` management UI + `getAllUsers` admin view | Medium | None | Completed | `SystemSettingsPanel` + `AdminUsersPanel` wired into `AdminDashboard`; `admin_user_role_*` / `admin_system_setting_*` analytics; 4 new tests (7 total in `AdminDashboard.test.tsx`); 136 files/807 tests pass; `tsc --noEmit` clean |
| TODO-015 | Data export/retention admin tooling (CSV export + retention policy note) | Medium | TODO-014 | Completed | `DataCompliancePanel` + `csvExport.ts` + `adminService` retention/export fns wired into `AdminDashboard`; `admin_audit_csv_export_*` / `admin_retention_policy_*` analytics; 2 new test files (137 files / 815 tests pass); `tsc --noEmit` clean |
| TODO-016 | KPI aggregation job scaffold (`scripts/run-kpi-aggregations.mjs` + test) | Medium | TODO-001 | Completed | `run-kpi-aggregations.mjs` + `.test.mjs` (18-KPI catalog K-01…K-18; computes K-11/K-12/K-15/K-16; honest not_computable reasons for planned/external/gated); wired into `package.json` `test` aggregate; node test green + all validators green |
| TODO-017 | AI provenance / honest-AI disclosure label on evaluation screens | Medium | None | Completed | 2026-09-06 — SourceStatusBadge in 6 pages; AICareerPath test; accessible match-score aria; all validators pass |
| TODO-018 | Feature-flag governance via `system_settings`; align `validate-feature-flags` | Medium | TODO-014 | Completed | validator green (40 stable flags, system_settings governance canonical) |
| TODO-019 | Digest click-through capture (K-13 metadata) + scheduler test update | Medium | None | Completed | scheduler test + UI click-through analytics verified in Header.test.tsx and NotificationsPage.test.tsx |
| TODO-020 | PRD/BRD: correct F-23 gamification status. **Corrected finding [VC]:** UI wired `Header.tsx` AND award loop wired (`ChallengesPage.tsx:612`, `LMSPage.tsx:380/389`, method is `awardXP`); update GA-05/RK-10 | Medium | TODO-012 | Completed | Verified across PRD v3.0, BRD v3.0, GAP analysis; unit tests green |
| TODO-021 | PRD/BRD: validator count wording (22 = 20 `.mjs` + 2 `.sh`); BRD §15 KPI range → K-01…K-18 | Medium | None | Completed | Verified across PRD v3.0, BRD v3.0, GAP analysis; all 22 validators pass |
| TODO-022 | PRD/BRD/GAP docs: Q-14 resolved; GA-15/RK-14 closed; F-25 persistence `[VC]`; K-18 computable-on-provision | Medium | TODO-001 | Completed | Verified across PRD v3.0, BRD v3.0, GAP analysis; schema + RLS + types in sync |
| TODO-023 | `module-manifest.json`: PRD/BRD annotations v2.0 → v3.0 | Medium | None | Completed | `module-manifest.json` updated with v3.0 notes; `validate:module-manifest` green |
| TODO-024 | `SSOT.md`: reconform to v3.0 or archive with explicit status banner | Medium | None | Completed | Explicit status header added; points to PRD v3.0, BRD v3.0, and Unified Schema Baseline; `validate:docs-lifecycle` green |
| TODO-025 | `CURRENT_STATE_AND_ACTION_PLAN.md`: correct test-count claims + feature numbering mismatch note | Medium | None | Completed | Rebased with measured test counts (827 unit tests) and canonical feature numbering; `validate:docs-lifecycle` green |
| TODO-026 | `ARCHITECTURE_STATUS_INDEX.md` location mismatch: add root pointer or fix `PLAN.md` §1.2/§20 | Medium | None | Completed | Verified canonical location in `docs/ARCHITECTURE_STATUS_INDEX.md`; references aligned |
| TODO-027 | `CLAUDE.md` staleness: annotate header only (Architect-owned content) — `mvnw`/layout/ports false | Medium | None | Completed | Preserved Architect-owned body while adding explicit top status disclaimer pointing to canonical PRD/BRD/Schema |
| TODO-028 | `RECOMMENDED_IMPROVEMENTS.md`: rebase to v3.0 (QC-5 done → F-25; QC-9 alias; QC-10) | Medium | None | Completed | Rebased to PRD v3.0 / BRD v3.0; QC-5 marked done (F-25); QC-9/QC-10 aligned |
| TODO-029 | `CODEBASE_TRACEABILITY.md`: rebase (BRD aliases, gamification status, routes) | Medium | None | Completed | Rebased with v3.0 BRD aliases, gamification UI/award status, and current routes |
| TODO-030 | `USER_WORKFLOW_AUTOMATION_GUIDE.md`: fix broken seed step + stale storage/AI claims | Medium | None | Completed | Seed step updated for unified schema; storage and AI claims aligned with heuristic client and local storage |
| TODO-031 | `FEATURES_AND_DASHBOARDS.md`: gamification wording + `chat-service` reconcile vs ADR-004 | Medium | None | Completed | Reconciled gamification display/award loops and annotated `chat-service` per ADR-004 |
| TODO-032 | `ARCHITECTURE_MIGRATION.md`: mark historical/obsolete | Medium | None | Completed | Explicit historical status banner added; redirects to canonical PRD v3.0 and Unified Schema Baseline |
| TODO-033 | `DATA_OWNERSHIP.md`: add 50-canonical vs 60-with-legacy split note | Medium | TODO-003 | Completed | Updated with explicit 50-canonical vs 60-total table boundary documentation |
| TODO-034 | OPS docs: `OPERATIONAL_RUNBOOK.md` per-service DB claims, BCDR, contacts; `runbooks/` alignment | Medium | None | Completed | Aligned disaster recovery targets (RTO: 4h, RPO: 1h) to unified DB; removed placeholder contacts; `validate:runbooks` green |
| TODO-035 | Close-out tracker section in GAP analysis + this tracker updated to final state | Medium | all | Completed | All Phase 0, Phase 1, and Phase 2 items closed out and verified; Phase 3 backlog boundaries codified |
| TODO-036 | Live billing provider adapter + webhook idempotency (BO-5) | Low | None | Blocked | **Blocked — external PSP credentials/contracts; document exit gates** |
| TODO-037 | E-mail channel / provider integration (Q-7) | Low | None | Blocked | **Blocked — external SMTP creds; scaffold design note only** |
| TODO-038 | OAuth social login live (M-15) | Low | None | Blocked | **Blocked — external provider client IDs** |
| TODO-039 | Backend-owned authz for high-risk writes (I-9) | Low | None | Blocked | **Blocked — spans 28 Java modules; requires working build env; design-only** |
| TODO-040 | i18n framework (Q-8) | Low | None | Pending | Backlog — large refactor |
| TODO-041 | Certificates generation E2E (Q-10) | Low | None | Pending | Backlog |
| TODO-042 | Observability console + outbox/DLQ + feature-flag governance at scale | Low | None | Pending | Backlog |
| TODO-043 | Cross-browser matrix + axe/WCAG + perf budgets | Low | None | Pending | Backlog |
| TODO-044 | Messaging gating (only connected users) backend enforcement | Low | None | Pending | Backlog — Java |
| TODO-045 | **Newly discovered:** `LeaderboardModal.test.tsx` fixtures missing required `badge_count` (broke `tsc`/build) | High | None | Completed | `badge_count` added; `tsc` clean |
| TODO-046 | **Newly discovered:** `recruiterFunnelAnalytics.test.ts` fixtures used `candidateId`/`id`/`content` fields not in `Application`/`CandidateNote` types (broke `tsc`/build) | High | None | Completed | Fixture types aligned; `tsc` clean |

---

## Implementation Order (dependency-respecting)

**Phase 0 — Critical (schema & security):** TODO-001 → 002 → 003 → 004 → 005, then 006, 007, 008 (parallel-safe), 009. **[ALL COMPLETED]**
**Phase 1 — High (product truth):** 010, 011 (Blocked), 012 → 013, 045, 046. **[COMPLETED / BLOCKED ENUMERATED]**
**Phase 2 — Medium (compliance/UX/docs):** 014–019, then 020–035. **[ALL COMPLETED]**
**Phase 3 — Blocked/backlog:** 036–044 (documented reasons; revisit when requirements/env change). **[TRACKED AS FUTURE WORK]**

## Rules of engagement
1. One TODO at a time; verify before marking Completed.
2. Newly discovered issues → append to this tracker with dependency + priority before addressing.
3. Docs never describe non-existent functionality.
4. Run the full validator suite + relevant tests after each schema change.
