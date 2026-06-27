# Data Ownership

> Documentation status: Current governance reference for table ownership, reviewed SQL sources, and direct Supabase access validation.

`data-ownership-manifest.json` is the source-validated table ownership matrix for the current Supabase/Postgres surface. It records every table found in frontend direct Supabase access and reviewed SQL `CREATE TABLE` declarations.

ADR-003 accepts migration-first Supabase/Postgres authority with generated TypeScript types and backend validation. `supabase-schema.sql` remains the reviewed SQL baseline, `infra/db/migrations/0001_initial_baseline.sql` mirrors that baseline as the current source-derived initial migration, and `infra/supabase_master.sql` is legacy historical schema evidence, not the target authority for new product schema.

Validate it with:

```bash
npm run validate:data-ownership
npm run validate:schema-authority-adr
npm run report:db-types
npm run validate:schema-migrations
npm run validate:legacy-schema-disposition
```

## What Is Validated

The validator fails when:

- a frontend `.from('table')` target is missing from the manifest
- a frontend production file imports the untyped compatibility Supabase export instead of `typedSupabase`
- a reviewed SQL `CREATE TABLE` target is missing from the manifest
- a manifest entry no longer matches actual direct frontend access
- a manifest entry no longer matches the SQL files where the table is defined
- a table is missing a domain, target owner, target access mode, migration status, RLS status, or index status
- a table has no reviewed SQL source but is not marked with a missing migration status

Current validated scope:

| Metric | Count |
| --- | ---: |
| Tables classified | 59 |
| Direct frontend Supabase tables | 45 |
| SQL-defined tables | 59 |

## Current Findings

- Resolved 2026-06-27: `subscription_plans` and `subscriptions` are now defined in `supabase-schema.sql` with RLS, indexes, and updated-at triggers, and `payments` includes the `subscription_id` and `stripe_session_id` columns used by seed data and payment status lookup.
- Resolved 2026-06-27: `profiles.is_active` and `profiles.deleted_at` are now defined in `supabase-schema.sql` and the baseline migration to match the existing settings soft-delete command, with `idx_profiles_is_active` added for active-profile filters.
- Resolved 2026-06-27: `settingsService` now uses the generated typed Supabase client for `notification_settings`, `profiles`, and `user_profiles`; profile settings writes are split across the correct identity and extended-profile tables.
- Resolved 2026-06-27: `create_user_profile()` now inserts only declared `user_profiles` columns, `user_profiles.user_id` is unique in the baseline, and `validate-schema-migrations` checks SQL `INSERT` column references against declared table columns.
- Resolved 2026-06-27: `profileService` now uses the generated typed Supabase client for profile, skill, experience, education, resume export, and resume artifact table paths; resume artifact server writes require the schema-required `user_id`.
- Resolved 2026-06-27: `LandingPage` public stats now use the generated typed Supabase client for `profiles` and `jobs` count queries, including the schema-supported active-profile filter.
- Resolved 2026-06-27: `messagingService` now uses the generated typed Supabase client for `conversations`, `conversation_participants`, `messages`, and participant profile lookups; realtime subscriptions remain outside the generated database contract.
- Resolved 2026-06-27: `networkingService` now uses the generated typed Supabase client for connection, suggestion preference, profile hydration, feed activity table paths, and the generated `get_mutual_connection_counts` RPC contract.
- Resolved 2026-06-27: `recruiterService` now uses the generated typed Supabase client for recruiter job/application reads, candidate notes, scorecards, application status updates, and status event inserts.
- Resolved 2026-06-27: `aiService.analyzeResume` now uses the backend AI API instead of a repo-missing Supabase RPC, and `npm run validate:typed-supabase-boundary` prevents production frontend table/generated-RPC access from falling back to the untyped compatibility client.
- Resolved 2026-06-27: `gamificationService` now uses the generated typed Supabase client for `leaderboard`, `user_badges`, and `xp_transactions`; user XP reads now use `leaderboard.total_xp` instead of non-schema `profiles.total_xp`.
- Resolved 2026-06-27: Product analytics and automation suggestion audit helpers now use the generated typed Supabase client for `product_analytics_events` and `automation_suggestion_audit_events`; automation audit records without a user id stay local because the SQL table requires `user_id`.
- Resolved 2026-06-27: `npm run validate:data-ownership` now rejects frontend production imports of the untyped compatibility Supabase export, and auth bootstrap, OAuth, realtime, and Edge Function frontend production imports now use `typedSupabase`; the untyped export remains only as a legacy/test compatibility surface.
- Resolved 2026-06-27 at decision level: ADR-003 accepts migration-first Supabase/Postgres authority, generated TypeScript types, backend validation, and `infra/db/README.md` as the schema authority workspace marker.
- Resolved 2026-06-27 at source-validation level: `infra/db/migrations/0001_initial_baseline.sql` mirrors `supabase-schema.sql`, `infra/db/generated/database.types.ts` provides source-derived database types generated from that migration with 69 public FK relationships and mutual-count RPC metadata, `apps/frontend/src/lib/supabaseClient.ts` exports a generated-`Database` typed `typedSupabase` migration boundary, and `npm run validate:schema-migrations` checks the 49-table baseline, 38 source-level RLS-enabled tables, 46 indexed tables, generated relationship metadata, generated RPC metadata, generated type drift, and typed-client boundary.
- Resolved 2026-06-27 at source-classification level: `infra/db/legacy-schema-disposition.json` classifies all 10 `legacy-master-only` tables and all 15 `multiple-reviewed-sql-sources` tables, including service-local migration evidence and required migration/retirement resolution.
- Several tables exist in both `supabase-schema.sql` and `infra/supabase_master.sql`; their `migrationStatus` is `multiple-reviewed-sql-sources` until ADR-003 follow-up work migrates, retains with explicit status, or retires the legacy duplicate source.
- Legacy identity and chat tables exist only in `infra/supabase_master.sql`; they are classified as `legacy-master-only`.
- Live RLS policy behavior and query-plan/index adequacy remain `not-verified` until they are executed and reviewed table by table.

## Ownership Model

The manifest does not claim that production ownership is complete. It records the target owner needed for the rebuild:

- `identity`: auth boundary decision
- `profile`: profile-service
- `jobs`: job-service and company-service
- `applications`: application-service
- `recruiting`: application-service candidate review surface
- `ai`: ai-service
- `analytics`: privacy-bounded analytics/audit ingestion
- `networking`: networking-service
- `messaging`: messaging-service, pending chat boundary decision
- `learning`: lms-service
- `challenges`: challenge-service
- `gamification`: gamification-service
- `notifications`: notification-service and audited scheduler jobs
- `billing`: payment-service
- `admin`: api-gateway/admin ops surface

## Rebuild Rules

- New direct Supabase table access must be added to the manifest before CI passes.
- New SQL tables must be added to the manifest before CI passes.
- A table cannot be treated as production-ready while `migrationStatus`, `rlsStatus`, or `indexStatus` is unresolved.
- Direct frontend writes remain migration debt unless explicitly retained behind a typed repository adapter and security policy decision.
- Legacy-only and duplicate SQL-source tables must keep a disposition entry until each table is migrated, retained as service-private with explicit boundaries, or retired.
- Live Supabase migration execution, Supabase CLI-generated types from a live migration-applied database, live RLS behavior, query-plan/index validation, and repository-wide replacement of untyped direct Supabase service access remain Not verified from the codebase.
