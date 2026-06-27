# Schema Authority Workspace

> Documentation status: Current schema authority workspace. Keep synchronized with `../../docs/adr/ADR-003-schema-authority.md`, `../../data-ownership-manifest.json`, `../../docs/DATA_OWNERSHIP.md`, and migration/type-generation work.

ADR-003 accepts migration-first Supabase/Postgres authority with generated TypeScript types and backend validation.

Current source state:

- `../../supabase-schema.sql` is the reviewed SQL baseline and migration source evidence.
- `migrations/0001_initial_baseline.sql` mirrors `../../supabase-schema.sql` as the current source-derived migration baseline.
- `infra/db/generated/database.types.ts` is generated from `infra/db/migrations/0001_initial_baseline.sql` by `npm run report:db-types` and checked by `npm run validate:schema-migrations`; it includes source-derived table, enum, and public foreign-key relationship metadata.
- `legacy-schema-disposition.json` classifies the current 10 legacy-master-only tables and 15 duplicate reviewed SQL-source tables with service-local evidence and required migration/retirement resolution.
- `../supabase_master.sql` is legacy historical schema evidence and must not receive new product schema changes.
- `../../docker/init-db.sql` is bootstrap/integration support, not the schema authority.
- `../../data-ownership-manifest.json` classifies every observed frontend direct table and reviewed SQL table with owner, target access mode, schema sources, migration status, RLS status, and index status.

Target structure:

```text
infra/db/
  README.md
  migrations/
    0001_initial_baseline.sql
  rls/
  generated/
    database.types.ts
  legacy-schema-disposition.json
```

Current implementation limits:

- The initial baseline migration exists, but the baseline has not been decomposed into smaller domain-ordered migrations.
- Generated TypeScript database types are source-derived from the baseline migration, not from a live Supabase migration-applied database.
- Relationship metadata in generated types is parsed from source SQL foreign keys and must be regenerated from a live migration-applied Supabase schema before it is treated as production database evidence.
- Legacy-only and duplicate SQL-source tables have source-level dispositions, but their final migration, service-private retention, or retirement work is incomplete.
- RLS policy behavior is not live-verified.
- Index adequacy and query plans are not live-verified.
- Supabase migration execution is Not verified from the codebase.

Use these commands after schema-source or table-ownership changes:

```bash
npm run report:db-types
npm run validate:schema-migrations
npm run validate:legacy-schema-disposition
npm run validate:schema-authority-adr
npm run validate:data-ownership
```
