# ADR-003 Schema Authority

> Documentation status: Current accepted architecture decision. Keep synchronized with `../../../PLAN.md`, `../ARCHITECTURE_STATUS_INDEX.md`, `../DATA_OWNERSHIP.md`, `../MODULE_MANIFEST.md`, `../../infra/db/README.md`, SQL source changes, and generated type changes.

Date: 2026-06-27

Status: Accepted

Owner: Platform architecture

## Context

The repository currently has a hybrid and partially duplicated schema surface:

| Source | Evidence | Current behavior |
| --- | --- | --- |
| Frontend direct Supabase access | `docs/API_CONTRACT_MISMATCH_REPORT.md`, `apps/frontend/src/services/*` | The generated API report records 45 direct Supabase tables from frontend source. |
| Data ownership manifest | `data-ownership-manifest.json`, `docs/DATA_OWNERSHIP.md`, `scripts/validate-data-ownership.mjs` | Classifies 59 observed tables across frontend direct access and reviewed SQL files with target owner, target access mode, SQL source list, migration status, RLS status, and index status. |
| Reviewed product schema | `supabase-schema.sql` | Defines 49 table declarations, many indexes, RLS enablement, policies, triggers, seed-aligned billing tables, and product-facing tables used by current frontend services. |
| Initial baseline migration | `infra/db/migrations/0001_initial_baseline.sql` | Mirrors `supabase-schema.sql` and is validated by `npm run validate:schema-migrations` until the baseline is decomposed into smaller ordered migrations. |
| Source-derived database types | `infra/db/generated/database.types.ts`, `scripts/generate-db-types.mjs`, `apps/frontend/src/lib/supabaseClient.ts` | Generated from `infra/db/migrations/0001_initial_baseline.sql` by `npm run report:db-types` with table, enum, public FK relationship, and mutual-count RPC metadata, drift-checked by `npm run validate:schema-migrations`, and exposed through the frontend `typedSupabase` migration boundary; the untyped export remains only as a legacy/test compatibility surface. |
| Legacy schema disposition | `infra/db/legacy-schema-disposition.json`, `scripts/validate-legacy-schema-disposition.mjs` | Classifies 10 legacy-master-only tables and 15 duplicate reviewed SQL-source tables with service-local evidence and required migration/retirement resolution. |
| Legacy master schema | `infra/supabase_master.sql` | Defines 25 older table declarations, including legacy identity/chat tables and duplicates of several product tables. |
| Docker init schema | `docker/init-db.sql` | Is reviewed by the data ownership validator but currently contributes no `CREATE TABLE` declarations. |
| Current duplication | `data-ownership-manifest.json` | 15 tables appear in both `supabase-schema.sql` and `infra/supabase_master.sql`: `challenges`, `companies`, `connections`, `courses`, `educations`, `enrollments`, `experiences`, `job_applications`, `jobs`, `leaderboard`, `lessons`, `messages`, `notifications`, `profiles`, and `skills`. |
| Missing completion evidence | `data-ownership-manifest.json` | 10 tables are still `legacy-master-only`, 15 are `multiple-reviewed-sql-sources`, 56 have RLS status `not-verified`, and 56 have index status `not-verified`. |

This proves the repository has enough source evidence to choose a schema authority direction and validate the first migration/type baseline, but it does not prove production schema readiness. Runtime Supabase migration execution, Supabase CLI-generated types from a live migration-applied database, live RLS behavior, query-plan/index adequacy, rollback migration execution, and production data migration safety are Not verified from the codebase.

## Decision

The rebuild schema authority is **migration-first Supabase/Postgres authority with generated TypeScript types and backend validation**.

This means:

1. Canonical schema changes for the rebuild must be expressed as ordered, reviewable migrations under `infra/db/migrations`.
2. `supabase-schema.sql` is the reviewed SQL baseline, and `infra/db/migrations/0001_initial_baseline.sql` is the current source-derived initial migration until it is decomposed into smaller ordered migrations.
3. `infra/supabase_master.sql` is legacy historical schema evidence. It must not receive new product schema changes, and its remaining unique tables must be migrated, intentionally retained as legacy, or retired through explicit follow-up work.
4. `docker/init-db.sql` may remain bootstrap/integration support, but it is not the schema authority unless it is generated from or references the canonical migrations.
5. `data-ownership-manifest.json` remains the table ownership and migration-readiness control plane. Every table must keep an owner, target access mode, schema source list, migration status, RLS status, and index status.
6. Generated TypeScript database types must remain source-derived from the canonical migration baseline now, including source-derived public FK relationship and RPC metadata, and must be regenerated from a live migration-applied schema before frontend repositories are treated as production type-safe.
7. RLS/security policy source must live with the migration source and be validated table by table for any table that remains directly readable or writable from the frontend.
8. Backend services and repository adapters must validate business invariants even when RLS exists; RLS is a database safety boundary, not a replacement for domain authorization.

The current direct Supabase access posture is retained only as migration debt or as an explicit typed repository adapter decision. Feature code should not add new ad hoc `supabase.from(...)` calls without manifest classification and security-policy review.

## Target Schema Workspace

The accepted workspace is documented at `infra/db/README.md`.

Target layout:

```text
infra/db/
  README.md
  migrations/
    0001_initial_baseline.sql
    0002_<domain_change>.sql
  rls/
    <table_or_domain>_policies.sql
  generated/
    database.types.ts
```

Current status:

- `infra/db/README.md` exists as the schema authority workspace marker.
- `infra/db/migrations/0001_initial_baseline.sql` exists and mirrors `supabase-schema.sql`.
- `infra/db/generated/database.types.ts` exists and is generated from the baseline migration.
- `infra/db/legacy-schema-disposition.json` exists and classifies all current legacy-only and duplicate reviewed SQL-source tables.
- `npm run validate:schema-migrations` checks baseline drift, generated type drift, generated relationship metadata, generated RPC metadata, source-level RLS enablement coverage, source-level index coverage, SQL insert-column references, and the frontend `typedSupabase` boundary.
- `npm run validate:legacy-schema-disposition` checks disposition coverage against `data-ownership-manifest.json`, `infra/supabase_master.sql`, the canonical baseline, service-local SQL evidence, and ADR-004 chat-service orphaning.
- Supabase migration execution, live database-generated types, live RLS behavior, and query-plan/index adequacy are Not verified from the codebase.

## Alternatives Considered

| Alternative | Outcome | Reason |
| --- | --- | --- |
| Keep multiple SQL files as equal authorities | Rejected | Duplicate table definitions already exist, and equal authority would keep migration, rollback, RLS, seed, and generated-type behavior ambiguous. |
| Treat JPA entities as schema authority | Rejected for current rebuild path | Current product data access is Supabase/Postgres-heavy, many frontend workflows use Supabase directly, and no complete JPA migration authority is verified. |
| Keep `supabase-schema.sql` as one large permanent authority file | Rejected as final state | It is useful baseline evidence, but ordered migrations are required for review, rollback, CI diffing, and environment promotion. |
| Generate a new schema from documentation | Rejected | The objective requires repository-backed evidence. Schema changes must be derived from current SQL, manifest ownership, and source usage, not invented. |

## Consequences

- ADR-003 resolves the schema-source decision for rebuild planning.
- The next data work should decompose the initial baseline into smaller ordered migrations and classify or retire unique `infra/supabase_master.sql` tables.
- Direct frontend table access must move behind typed domain repositories using `typedSupabase` or backend-owned APIs according to `data-ownership-manifest.json`.
- RLS and index statuses in `data-ownership-manifest.json` remain blockers until validated table by table.
- Seed data must be environment-scoped and migration-aligned before production use.
- Backend, frontend, and database tests must validate authorization from both API and database boundaries for directly exposed tables.

## Migration Plan

1. Keep `infra/db/migrations/0001_initial_baseline.sql` synchronized with `supabase-schema.sql`, then split the reviewed baseline into smaller ordered migrations without changing table semantics.
2. Compare each `infra/supabase_master.sql` table against the baseline:
   - migrate missing live tables into canonical migrations,
   - retain legacy-only tables only with explicit owner/status metadata,
   - retire obsolete tables with reversible migration notes.
3. Move RLS policies into migration-owned policy files or migration sections and update `data-ownership-manifest.json` from `not-verified` to source-validated statuses only after review.
4. Keep source-derived generated TypeScript database types synchronized now; replace them with types generated from a migration-applied schema before routing frontend direct access through domain repositories that consume those generated types.
5. Add backend validation tests for writes and authorization decisions before removing direct frontend fallback paths.
6. Add migration rollback and seed validation commands to CI once the migration runner is available.

## Rollback Plan

- Keep the current reviewed SQL files available while the migration series is introduced.
- Do not delete `infra/supabase_master.sql` until unique legacy tables are classified and migration/retirement evidence exists.
- If a migration fails in staging, roll back with the paired down migration or restore the last verified baseline from `supabase-schema.sql`.
- Keep `data-ownership-manifest.json` as the review gate so table ownership and direct-access status cannot drift silently during rollback.

## Acceptance Criteria

- ADR-003 is accepted and classified in `module-manifest.json`.
- `npm run validate:schema-authority-adr` passes locally and in CI.
- `npm run validate:schema-migrations` passes locally and in CI.
- `npm run report:db-types` produces the committed `infra/db/generated/database.types.ts`.
- `infra/db/README.md` documents the accepted schema authority workspace and current runtime limitations.
- `PLAN.md`, `docs/ARCHITECTURE_STATUS_INDEX.md`, `docs/DATA_OWNERSHIP.md`, and `docs/MODULE_MANIFEST.md` all reference the accepted decision.
- No new product schema change is documented as authoritative in `infra/supabase_master.sql`.
- Every table remains classified in `data-ownership-manifest.json`.
- Baseline migration and source-derived generated database types with public FK relationship and mutual-count RPC metadata are present; smaller domain-ordered migrations, live database-generated relationship/function types, live RLS validation, query-plan/index validation, rollback execution, runtime Supabase execution, and repository-wide generated-type adoption remain explicit follow-up work until proven.

## Validation Commands

```bash
npm run validate:schema-authority-adr
npm run report:db-types
npm run validate:schema-migrations
npm run validate:legacy-schema-disposition
npm run validate:data-ownership
npm run validate:docs-lifecycle
npm run validate:module-manifest
```

Runtime Supabase migration execution, Supabase CLI-generated types from a live migration-applied database, live database-generated relationship/function metadata, query plans, live RLS behavior, and repository-wide generated-type adoption are Not verified from the codebase in the current workspace environment.
