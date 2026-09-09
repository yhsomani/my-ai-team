---
description: Validates SQL migrations against project standards and safety rules.
---
# Database Schema Validator
Ensures that all database changes for the **TalentSphere** project are safe, consistent, and well-documented.

## Goals
- Prevent destructive operations (e.g., `DROP TABLE`) in production migrations.
- Enforce naming conventions (snake_case for columns/tables).
- Ensure RLS (Row Level Security) is considered for new tables in **Supabase**.

## Steps
1. Before applying any SQL migration via the `supabase-mcp-server` or `psql`, I will review the SQL script.
2. I will check for the presence of appropriate constraints (Primary Keys, Foreign Keys).
3. I will flag any usage of `DROP` or `TRUNCATE` unless they are explicitly required for a migration and confirmed by the user.
4. I will suggest adding indexes for columns used frequently in `WHERE` clauses.

## Constraints
- Never execute a migration that contains destructive commands without a verbal "GO" from the user.
- Always assume the `public` schema unless otherwise specified.
