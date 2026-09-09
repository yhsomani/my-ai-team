# TalentSphere — Database Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: `supabase-schema.sql` (50 tables, 119 RLS policies, 15 enums, 29 triggers, 5 functions, 116 indexes).  
> **Migration Authority**: `infra/db/migrations/0001_initial_baseline.sql`  
> **Conflict Resolution**: Code > Tests > Config > Schema > Docs (ADR-003)

---

## 1. Schema Summary

| Metric | Count | Source |
|---|---|---|
| Canonical tables | **50** | `supabase-schema.sql` |
| Enums | **15** | `supabase-schema.sql` |
| Row-Level Security policies | **119** | `supabase-schema.sql` |
| Triggers | **29** | `supabase-schema.sql` |
| Stored functions | **5** | `supabase-schema.sql` |
| Indexes | **116** | `supabase-schema.sql` |

### Legacy Isolation Note
Per **ADR-003** / **DECISION-005**: Schema authority resides exclusively in ordered SQL migrations. `infra/supabase_master.sql` contained **10 unique legacy tables** isolated as historical artifacts. These are excluded from the production schema baseline and tracked via `validate-legacy-schema-disposition.mjs`.

---

## 2. 50 Canonical Tables

### 2.1 Identity & User Management (9 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 1 | `profiles` | User public profiles | 3 | `id` (PK, FK→auth.users), `full_name`, `avatar_url`, `role`, `title`, `bio`, `created_at` |
| 2 | `user_profiles` | Extended profile metadata | 3 | `id` (PK), `user_id` (FK→profiles), `location`, `website`, `linkedin_url`, `github_url` |
| 3 | `skills` | User skills & endorsements | 3 | `id` (PK), `user_id` (FK→profiles), `name`, `endorsement_count`, `verified` |
| 4 | `educations` | Education history | 3 | `id` (PK), `user_id` (FK→profiles), `institution`, `degree`, `field`, `start_date`, `end_date` |
| 5 | `experiences` | Work experience history | 3 | `id` (PK), `user_id` (FK→profiles), `company`, `title`, `description`, `start_date`, `end_date` |
| 6 | `languages` | Spoken languages | 3 | `id` (PK), `user_id` (FK→profiles), `language`, `proficiency` |
| 7 | `certifications` | User certifications | 3 | `id` (PK), `user_id` (FK→profiles), `name`, `issuer`, `issued_date`, `expiry_date` |
| 8 | `resume_artifacts` | Uploaded/generated resumes | 3 | `id` (PK), `user_id` (FK→profiles), `title`, `content` (JSONB), `template`, `file_url` |
| 9 | `resume_export_events` | Resume download/export audit | 2 | `id` (PK), `user_id` (FK→profiles), `format`, `artifact_id`, `exported_at` |

### 2.2 Jobs & Recruitment (9 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 10 | `companies` | Employer profiles | 3 | `id` (PK), `name`, `description`, `logo_url`, `industry`, `size`, `website`, `owner_id` |
| 11 | `jobs` | Job postings | 3 | `id` (PK), `company_id` (FK→companies), `title`, `description`, `requirements`, `job_type` (enum), `experience_level` (enum), `salary_min`, `salary_max`, `location`, `remote`, `status`, `author_id` |
| 12 | `job_applications` | Submitted applications | 4 | `id` (PK), `job_id` (FK→jobs), `user_id` (FK→profiles), `status` (enum: application_status), `cover_letter`, `resume_url`, `applied_at` |
| 13 | `application_status_events` | Application lifecycle history | 3 | `id` (PK), `application_id` (FK→job_applications), `from_status`, `to_status`, `changed_by`, `changed_at`, `notes` |
| 14 | `application_drafts` | Working draft applications | 3 | `id` (PK), `user_id` (FK→profiles), `job_id` (FK→jobs), `draft_data` (JSONB), `updated_at` |
| 15 | `application_draft_versions` | Versioned draft snapshots | 2 | `id` (PK), `draft_id` (FK→application_drafts), `version`, `snapshot` (JSONB), `created_at` |
| 16 | `job_post_templates` | Reusable job post templates | 3 | `id` (PK), `author_id` (FK→profiles), `title`, `description`, `requirements`, `is_public` |
| 17 | `job_post_draft_versions` | Versioned job post drafts | 2 | `id` (PK), `author_id` (FK→profiles), `version`, `snapshot` (JSONB), `created_at` |
| 18 | `hidden_explore_jobs` | User-hidden job recommendations | 3 | `id` (PK), `user_id` (FK→profiles), `job_id` (FK→jobs), `hidden_at` |

### 2.3 Learning Management System (5 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 19 | `courses` | LMS course catalog | 2 | `id` (PK), `title`, `description`, `instructor_id`, `level` (enum: course_level), `thumbnail_url`, `slug`, `published` |
| 20 | `lessons` | Course lesson content | 2 | `id` (PK), `course_id` (FK→courses), `title`, `content`, `order`, `type`, `duration` |
| 21 | `enrollments` | User course enrollments | 3 | `id` (PK), `user_id` (FK→profiles), `course_id` (FK→courses), `status` (enum: enrollment_status), `enrolled_at`, `completed_at` |
| 22 | `lesson_progress` | Lesson completion tracking | 3 | `id` (PK), `user_id` (FK→profiles), `lesson_id` (FK→lessons), `completed`, `completed_at` |
| 23 | `saved_job_searches` | Saved search queries + alerts | 3 | `id` (PK), `user_id` (FK→profiles), `name`, `filters` (JSONB), `alert_enabled`, `last_run_at` |

### 2.4 Gamification (4 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 24 | `xp_transactions` | XP ledger (idempotent) | 2 | `id` (PK), `user_id` (FK→profiles), `amount`, `ref_type`, `ref_id`, `description`, `created_at`. **UNIQUE constraint**: `(user_id, ref_type, ref_id)` |
| 25 | `badges` | Badge definitions catalog | 2 | `id` (PK), `name`, `description`, `icon_url`, `xp_threshold`, `category` |
| 26 | `user_badges` | Earned badges | 3 | `id` (PK), `user_id` (FK→profiles), `badge_id` (FK→badges), `earned_at` |
| 27 | `leaderboard` | Aggregated XP rankings | 2 | `id` (PK), `user_id` (FK→profiles), `total_xp`, `rank`, `period`, `updated_at` |

### 2.5 Coding Challenges (3 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 28 | `challenges` | Challenge catalog | 2 | `id` (PK), `title`, `description`, `difficulty` (enum: challenge_difficulty), `status` (enum: challenge_status), `category`, `test_cases` (JSONB), `xp_reward` |
| 29 | `challenge_submissions` | Submission records | 3 | `id` (PK), `challenge_id` (FK→challenges), `user_id` (FK→profiles), `status` (enum: submission_status), `code`, `language`, `test_results` (JSONB), `xp_awarded` |

> **Note**: XP auto-award for passing challenges is handled by a database trigger writing to `xp_transactions` (see §5 Triggers) — not a dedicated table.

### 2.6 Platform Analytics & Event Pipeline (1 Table)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 30 | `product_analytics_events` | Append-only product/operational analytics event pipeline | 2 | `id` (PK), `user_id` (FK→profiles), `event_name`, `area`, `metadata` (JSONB, whitelist-sanitized), `created_at`; indexed by user/area/event/time; direct insert from `lib/productAnalytics.ts` with bounded ≤100-event `localStorage` fallback; consumed by Admin Console analytics insights (admin RLS read) and `run-kpi-aggregations.mjs` (KPIs K-11/K-12/K-15/K-16) |

### 2.7 Messaging & Communication (4 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 31 | `conversations` | Conversation threads | 3 | `id` (PK), `type` (direct/group), `title`, `created_by`, `created_at` |
| 32 | `conversation_participants` | Membership records | 3 | `id` (PK), `conversation_id` (FK→conversations), `user_id` (FK→profiles), `joined_at`, `last_read_at` |
| 33 | `messages` | Individual messages | 3 | `id` (PK), `conversation_id` (FK→conversations), `sender_id` (FK→profiles), `content`, `attachment_url`, `created_at`, `read_at` |
| 34 | `notifications` | In-app notification alerts | 3 | `id` (PK), `user_id` (FK→profiles), `type` (enum: notification_type), `title`, `body`, `link`, `read`, `created_at` |

### 2.8 Notifications & Settings (3 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 35 | `notification_settings` | User notification preferences | 3 | `id` (PK), `user_id` (FK→profiles), `channel`, `type`, `enabled`, `quiet_hours_start`, `quiet_hours_end` |
| 36 | `notification_digest_items` | Queued digest items | 2 | `id` (PK), `user_id` (FK→profiles), `type`, `payload` (JSONB), `digest_status`, `created_at` |
| 37 | `system_settings` | Global platform configuration | 2 | `id` (PK), `key`, `value` (JSONB), `description`, `updated_at` |

### 2.9 Networking & Social (2 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 38 | `connections` | Professional network graph | 4 | `id` (PK), `requester_id` (FK→profiles), `addressee_id` (FK→profiles), `status` (enum: connection_status), `requested_at`, `responded_at` |
| 39 | `networking_suggestion_preferences` | AI networking tuning knobs | 3 | `id` (PK), `user_id` (FK→profiles), `weights` (JSONB), `excluded_ids`, `updated_at` |

### 2.10 AI & Automation (3 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 40 | `ai_sessions` | AI assistant session context | 3 | `id` (PK), `user_id` (FK→profiles), `context` (JSONB), `created_at`, `expires_at` |
| 41 | `automation_suggestions` | AI-generated action suggestions | 3 | `id` (PK), `user_id` (FK→profiles), `type`, `title`, `description`, `status`, `metadata` (JSONB) |
| 42 | `automation_suggestion_audit_events` | AI action audit trail | 2 | `id` (PK), `suggestion_id` (FK→automation_suggestions), `action`, `performed_by`, `performed_at` |

### 2.11 Trust & Safety (2 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 43 | `content_reports` | User-submitted content reports | 3 | `id` (PK), `reporter_id` (FK→profiles), `target_type`, `target_id`, `reason` (enum: report_reason), `status` (enum: report_status), `details`, `created_at` |
| 44 | `audit_log` | Platform audit trail | 2 | `id` (PK), `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSONB), `created_at` |

### 2.12 Monetization & Billing (3 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 45 | `subscription_plans` | Billing plan catalog | 2 | `id` (PK), `name`, `description`, `price`, `interval` (enum: billing_interval), `features` (JSONB), `active` |
| 46 | `subscriptions` | User/org subscriptions | 3 | `id` (PK), `user_id` (FK→profiles), `plan_id` (FK→subscription_plans), `status` (enum: subscription_status), `current_period_start`, `current_period_end`, `cancel_at` |
| 47 | `payments` | Payment transaction records | 3 | `id` (PK), `user_id` (FK→profiles), `subscription_id` (FK→subscriptions), `amount`, `currency`, `status`, `provider_ref`, `created_at` |

### 2.13 Portfolio & Projects (1 Table)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 48 | `projects` | Portfolio project showcase | 3 | `id` (PK), `user_id` (FK→profiles), `title`, `description`, `url`, `repo_url`, `technologies`, `image_url`, `featured` |

### 2.14 Recruiter Scorecards (2 Tables)

| # | Table | Purpose | RLS Policies | Key Columns |
|---|---|---|---|---|
| 49 | `candidate_scorecards` | Structured candidate evaluations | 3 | `id` (PK), `application_id` (FK→job_applications), `evaluator_id` (FK→profiles), `scores` (JSONB), `overall_rating`, `notes`, `created_at` |
| 50 | `candidate_notes` | Private recruiter notes | 3 | `id` (PK), `application_id` (FK→job_applications), `author_id` (FK→profiles), `content`, `visibility`, `created_at` |

---

## 3. 15 Enums

| # | Enum Name | Values |
|---|---|---|
| 1 | `user_role` | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` |
| 2 | `job_type` | `full_time`, `part_time`, `contract`, `internship`, `freelance` |
| 3 | `experience_level` | `entry`, `mid`, `senior`, `lead`, `executive` |
| 4 | `application_status` | `submitted`, `under_review`, `interviewing`, `offered`, `rejected`, `withdrawn` |
| 5 | `connection_status` | `pending`, `accepted`, `declined`, `blocked` |
| 6 | `challenge_difficulty` | `easy`, `medium`, `hard` |
| 7 | `challenge_status` | `draft`, `published`, `archived` |
| 8 | `submission_status` | `pending`, `evaluating`, `passed`, `failed` |
| 9 | `course_level` | `beginner`, `intermediate`, `advanced` |
| 10 | `enrollment_status` | `active`, `completed`, `dropped` |
| 11 | `notification_type` | `system`, `message`, `application`, `connection`, `course`, `challenge`, `badge` |
| 12 | `report_status` | `pending`, `investigating`, `resolved`, `dismissed` |
| 13 | `report_reason` | `spam`, `harassment`, `inappropriate_content`, `fraud`, `other` |
| 14 | `billing_interval` | `monthly`, `yearly` |
| 15 | `subscription_status` | `active`, `canceled`, `past_due`, `trialing` |

---

## 4. Row-Level Security (RLS) — 119 Policies

### 4.1 Policy Architecture

Every table has RLS enabled via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Policies use PostgreSQL's `auth.uid()` function to extract the authenticated user's UUID from the JWT.

### 4.2 Access Pattern Templates

| Pattern | SQL Predicate | Usage Count |
|---|---|---|
| **User Owner** | `auth.uid() = user_id` | ~50 policies |
| **Recruiter Gate** | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_RECRUITER')` | ~25 policies |
| **Admin Gate** | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_ADMIN')` | ~20 policies |
| **Public Read** | `true` (for SELECT only on public resources) | ~14 policies |
| **Conversation Participant** | `EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = ... AND user_id = auth.uid())` | ~10 policies |

### 4.3 Table-Level Policy Distribution

| Table | Policies | Applied Operations |
|---|---|---|
| `connections` | **4** | SELECT (own), INSERT (own), UPDATE (own or addressee), DELETE (own) |
| `job_applications` | **4** | SELECT (own or job author), INSERT (own), UPDATE (job author recruiter), DELETE (own or admin) |
| `profiles` | 3 | SELECT (public), UPDATE (own), DELETE (admin) |
| `jobs` | 3 | SELECT (public), INSERT (recruiter), UPDATE (owner), DELETE (owner or admin) |
| `messages` | 3 | SELECT (participant), INSERT (participant), DELETE (sender or admin) |
| `conversations` | 3 | SELECT (participant), INSERT (authenticated), UPDATE (participant) |
| `conversation_participants` | 3 | SELECT (conversation member), INSERT (conversation member), DELETE (self or admin) |
| `content_reports` | 3 | SELECT (own or admin), INSERT (own), UPDATE (admin) |
| `candidate_scorecards` | 3 | SELECT (job author or evaluator), INSERT (recruiter), UPDATE (evaluator) |
| `candidate_notes` | 3 | SELECT (application recruiter), INSERT (recruiter), UPDATE (author) |
| All other tables (2 or 3 each) | 78 | Consistent owner-admin-public pattern |

> **Reconciliation note**: The per-table policy counts above are indicative reconstructions from documented schema behavior and are **not** a rigorous sum — multiple operations (SELECT/INSERT/UPDATE/DELETE) map to policy evaluation in non-trivial ways. The authoritative total is **119 RLS policies**, verified directly from `supabase-schema.sql` (ADR-003 / DECISION-005). Where an individual per-table count and the 119 total conflict, **119 wins**.

### 4.4 RLS Enforcement Boundary
- **Zero-trust at the engine layer**: RLS policies evaluate at the PostgreSQL engine level, not in application code.
- **JWT injection**: Supabase Auth injects `auth.uid()` via the PostgREST request context.
- **Backend bypass**: Spring Boot services access the database through the same PostgREST endpoint with the user's JWT, enforcing identical RLS.

---

## 5. 29 Triggers

### 5.1 Trigger Inventory

| # | Trigger Name | Table | Event | Function |
|---|---|---|---|---|
| 1-18 | `set_updated_at` (one per mutable table) | 18 tables | BEFORE UPDATE | `update_updated_at_column()` |
| 19 | `on_application_status_change` | `job_applications` | AFTER UPDATE | `record_application_status_event()` |
| 20 | `on_xp_insert` | `xp_transactions` | AFTER INSERT | Auto-update `leaderboard` |
| 21 | `on_badge_award` | `user_badges` | AFTER INSERT | Send badge notification |
| 22 | `on_new_message` | `messages` | AFTER INSERT | Send notification + update unread count |
| 23 | `on_connection_request` | `connections` | AFTER INSERT | Send connection notification |
| 24 | `on_connection_accepted` | `connections` | AFTER UPDATE (status→accepted) | Send acceptance notification |
| 25 | `on_enrollment_create` | `enrollments` | AFTER INSERT | Send enrollment confirmation |
| 26 | `on_lesson_complete` | `lesson_progress` | AFTER UPDATE (completed→true) | Check course completion |
| 27 | `on_submission_pass` | `challenge_submissions` | AFTER UPDATE (status→passed) | Auto-award XP via `xp_transactions` |
| 28 | `on_application_submit` | `job_applications` | AFTER INSERT | Send application confirmation notification |
| 29 | `on_profile_create` | `profiles` | AFTER INSERT | Initialize default notification settings |

### 5.2 Trigger Function Bodies

1. **`update_updated_at_column()`**: Sets `NEW.updated_at = NOW()` on every UPDATE. Applied to 18 mutable tables.
2. **`record_application_status_event()`**: Inserts a row into `application_status_events` capturing old/new status, changer, and timestamp.
3. **`handle_new_user()`**: (Stored function, invoked via Supabase Auth webhook on `auth.users INSERT`) Creates `profiles` row and `user_roles` entry.
4. **`calculate_user_xp(user_id UUID)`**: (Stored function) Sums `xp_transactions.amount` for the given user. Used by leaderboard refresh.
5. **`cleanup_expired_drafts()`**: (Scheduled function) Deletes `application_draft_versions` and `job_post_draft_versions` older than 30 days.

---

## 6. 5 Stored Functions

| # | Function | Signature | Purpose |
|---|---|---|---|
| 1 | `handle_new_user()` | `RETURNS TRIGGER` | Creates `profiles` + `user_roles` on `auth.users INSERT`. Invoked by Supabase Auth webhook trigger. |
| 2 | `calculate_user_xp(user_id UUID)` | `RETURNS INTEGER` | Aggregates total XP from `xp_transactions` for the specified user. Used by leaderboard refresh scheduler. |
| 3 | `record_application_status_event()` | `RETURNS TRIGGER` | Trigger function recording `application_status_events` rows on `job_applications` status mutations. |
| 4 | `update_updated_at_column()` | `RETURNS TRIGGER` | Universal `NEW.updated_at = NOW()` trigger for 18 mutable tables. |
| 5 | `cleanup_expired_drafts()` | `RETURNS void` | Scheduled cleanup of stale draft versions older than 30 days. Called by `run-draft-cleanup` scheduler. |

---

## 7. 116 Indexes (Summary by Domain)

| Domain | Index Count | Representative Indexes |
|---|---|---|
| Identity & Profiles | 14 | `idx_profiles_user_id`, `idx_profiles_role`, `idx_skills_user_id`, `idx_user_profiles_user_id` |
| Jobs & Applications | 22 | `idx_jobs_company_id`, `idx_jobs_status`, `idx_jobs_job_type`, `idx_jobs_location`, `idx_job_applications_job_id`, `idx_job_applications_user_id`, `idx_job_applications_status`, `idx_application_drafts_user_job` |
| Learning Management | 10 | `idx_courses_slug`, `idx_lessons_course_id`, `idx_enrollments_user_id`, `idx_enrollments_course_id`, `idx_lesson_progress_user_lesson` |
| Gamification | 10 | `idx_xp_transactions_user_id`, `idx_xp_transactions_unique_ref` (UNIQUE), `idx_user_badges_user_id`, `idx_leaderboard_xp_desc`, `idx_leaderboard_period` |
| Challenges | 8 | `idx_challenges_status`, `idx_challenges_difficulty`, `idx_challenge_submissions_user_id`, `idx_challenge_submissions_challenge_id` |
| Messaging | 12 | `idx_conversations_id`, `idx_conversation_participants_user_id`, `idx_conversation_participants_conv_id`, `idx_messages_conversation_id`, `idx_messages_sender_id`, `idx_messages_created_at` |
| Notifications | 8 | `idx_notifications_user_id`, `idx_notifications_read`, `idx_notifications_created_at`, `idx_notification_settings_user_id` |
| Networking | 6 | `idx_connections_requester_id`, `idx_connections_addressee_id`, `idx_connections_status`, `idx_networking_suggestion_preferences_user_id` |
| AI & Automation | 6 | `idx_ai_sessions_user_id`, `idx_automation_suggestions_user_id`, `idx_automation_suggestions_status` |
| Trust & Safety | 6 | `idx_content_reports_status`, `idx_content_reports_reporter_id`, `idx_audit_log_user_id`, `idx_audit_log_created_at` |
| Billing | 8 | `idx_subscriptions_user_id`, `idx_subscriptions_status`, `idx_payments_user_id`, `idx_payments_subscription_id`, `idx_subscription_plans_active` |
| Portfolio | 4 | `idx_projects_user_id`, `idx_projects_featured` |
| Recruiter | 4 | `idx_candidate_scorecards_application_id`, `idx_candidate_notes_application_id` |
| Misc / Composite | 18 | Composite indexes on frequently filtered column sets (e.g., `idx_jobs_type_location_status`) |

**Total**: 116 indexes across 50 tables.

---

## 8. Schema Authority & Validation

### 8.1 Source of Truth Hierarchy
Per **ADR-003** / **DECISION-005**:
1. `supabase-schema.sql` — Authoritative DDL
2. `infra/db/migrations/0001_initial_baseline.sql` — Migration baseline (mirrors schema)
3. `npm run report:db-types` — Auto-generated TypeScript types from schema

### 8.2 Validation Scripts

| Script | Purpose |
|---|---|
| `scripts/validate-schema-baseline.mjs` | Ensures migration baseline matches `supabase-schema.sql` |
| `scripts/validate-schema-entity-alignment.mjs` | Verifies table-to-entity mapping integrity |
| `scripts/validate-legacy-schema-disposition.mjs` | Isolates 10 legacy `supabase_master.sql` tables |
| `scripts/validate-data-ownership-manifest.mjs` | Validates `data-ownership-manifest.json` table registry |

### 8.3 Type Generation Pipeline
```bash
npm run report:db-types  # Generates TypeScript interfaces from supabase-schema.sql
```
Output consumed by `typedSupabase` client in `apps/frontend/src/lib/typedSupabase.ts`.

---

## 9. Citus Horizontal Scaling (Proposal / UNVERIFIED — Target State, Not Current)

> **Status**: **PROPOSAL / UNVERIFIED** (source: `reference/DATABASE_SHARDING.md`). This is a **target-state scaling architecture, not part of the running Primary Data Plane** (Supabase / PostgreSQL 15). No production Citus deployment is verified from the codebase; current data-plane usage remains single-instance Supabase PostgREST. Preserved here for zero-loss grounding so an implementer knows the documented scaling direction.

### 9.1 Overview & Node Topology
TalentSphere's documented (planned) approach to horizontal PostgreSQL scaling uses **Citus**:
- 1 Coordinator Node (`citus-coordinator: 5432`, primary)
- 3 Worker Nodes (expandable): `citus-worker-0: 5433`, `citus-worker-1: 5434`, `citus-worker-2: 5435`

### 9.2 Table Classification

**Reference Tables (Replicated to ALL nodes)** — small lookup tables:
- `skills` (~500 rows), `categories` (~100 rows), `countries` (~200 rows), `job_types` (~20 rows)
```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
SELECT create_reference_table('skills');  -- Now replicated to all workers
```

**Distributed Tables (Sharded by tenant/user key)** — large tables:
- `users` (shard by `user_id`), `job_applications` (shard by `applicant_id`), `audit_logs` (shard by `user_id`)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
SELECT create_distributed_table('users', 'user_id');  -- Sharded across workers by user_id
```

### 9.3 Query Rules (Shard-Key Discipline)

**GOOD — includes the shard key**:
```sql
SELECT * FROM users WHERE user_id = 'abc-123';
SELECT * FROM job_applications WHERE applicant_id = 'user-456';
```

**BAD — broadcast queries (scan ALL nodes)**:
```sql
SELECT * FROM users WHERE email = 'test@email.com';          -- missing shard key
SELECT u.*, a.* FROM users u
JOIN applications a ON u.id = a.user_id;                     -- JOIN without shard key
```

**Application guidance** (never query PostgreSQL without a shard key): global search must go through the search service (Elasticsearch; indexes: `users`, `jobs`) instead.

### 9.4 Maintenance
- **Add a worker**: `SELECT citus_add_node('citus-worker-3', 5433); SELECT rebalance_table_shards('users');`
- **Monitor distribution**: `SELECT * FROM citus_shards; SELECT * FROM citus_get_worker_health();`

### 9.5 Performance Target
| Query Type | Target Latency |
|---|---|
| By shard key | ~5ms |
| Reference table | ~10ms |
| Broadcast | ~200ms+ (avoid) |

### 9.6 Migration Path (Monolith → Sharded)
1. Identify a shard key per table
2. Create table as distributed
3. Test that queries include the shard key
4. Update ORMs to always use the shard key
5. Monitor logs for broadcast queries

> **Consistency with Primary Plane**: these recommendations (always filter by `user_id`; reference tables for small lookups) are already broadly consistent with the RLS access patterns in §4.2, so adopting this proposal would not contradict current policy design.
