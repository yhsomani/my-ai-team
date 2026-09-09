# TalentSphere — Database Schema (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Authoritative schema baseline: `supabase-schema.sql` (50 tables, 119 RLS policies, 15 enums, 29 triggers, 5 functions, 116 indexes).
> Extracted 2026-09-08. Migration authority: `infra/db/migrations/0001_initial_baseline.sql`.

## Schema Summary

| Metric | Count |
|--------|-------|
| Canonical tables | 50 |
| Enums | 15 |
| RLS policies | 119 |
| Triggers | 29 |
| Stored functions | 5 |
| Indexes | 116 |

## 50 Canonical Tables

| # | Table | Purpose | RLS Policies |
|---|-------|---------|--------------|
| 1 | `ai_sessions` | AI assistant session state | 3 |
| 2 | `application_draft_versions` | Versioned draft applications | 2 |
| 3 | `application_drafts` | Working draft applications | 3 |
| 4 | `application_status_events` | Application lifecycle history | 3 |
| 5 | `audit_log` | System audit trail | 2 |
| 6 | `automation_suggestion_audit_events` | AI automation action history | 2 |
| 7 | `automation_suggestions` | AI-generated action suggestions | 3 |
| 8 | `badges` | Gamification badge definitions | 2 |
| 9 | `candidate_notes` | Recruiter notes on candidates | 3 |
| 10 | `candidate_scorecards` | Structured candidate evaluation | 3 |
| 11 | `certifications` | User certifications | 3 |
| 12 | `challenge_submissions` | Code challenge submissions | 3 |
| 13 | `challenges` | Coding challenges catalog | 2 |
| 14 | `companies` | Employer profiles | 3 |
| 15 | `connections` | Professional network graph | 4 |
| 16 | `content_reports` | Trust & safety reports | 3 |
| 17 | `conversation_participants` | Group/direct chat membership | 3 |
| 18 | `conversations` | Messaging threads | 3 |
| 19 | `courses` | LMS course catalog | 2 |
| 20 | `educations` | User education history | 3 |
| 21 | `enrollments` | Course enrollments | 3 |
| 22 | `experiences` | Work experience history | 3 |
| 23 | `hidden_explore_jobs` | User-hidden job recommendations | 3 |
| 24 | `job_applications` | Submitted applications | 4 |
| 25 | `job_post_draft_versions` | Versioned job post drafts | 2 |
| 26 | `job_post_templates` | Reusable job post templates | 3 |
| 27 | `jobs` | Job postings | 3 |
| 28 | `languages` | Spoken languages | 3 |
| 29 | `leaderboard` | Gamification leaderboard views | 2 |
| 30 | `lesson_progress` | LMS lesson completion tracking | 3 |
| 31 | `lessons` | LMS course lessons | 2 |
| 32 | `messages` | Direct/group messages | 3 |
| 33 | `networking_suggestion_preferences` | AI networking tuning | 3 |
| 34 | `notification_digest_items` | Queued digest items | 2 |
| 35 | `notification_settings` | User notification preferences | 3 |
| 36 | `notifications` | In-app notifications | 3 |
| 37 | `payments` | Payment transactions (demo/live) | 3 |
| 38 | `product_analytics_events` | Event tracking | 2 |
| 39 | `profiles` | User public profiles | 3 |
| 40 | `projects` | Portfolio projects | 3 |
| 41 | `resume_artifacts` | Uploaded/generated resumes | 3 |
| 42 | `resume_export_events` | Resume download/export audit | 2 |
| 43 | `saved_job_searches` | Saved search queries + alerts | 3 |
| 44 | `skills` | User skills catalog & endorsements | 3 |
| 45 | `subscription_plans` | Billing plans catalog | 2 |
| 46 | `subscriptions` | Active user/org subscriptions | 3 |
| 47 | `system_settings` | Global platform config | 2 |
| 48 | `user_badges` | Earned gamification badges | 3 |
| 49 | `user_profiles` | Extended profile metadata | 3 |
| 50 | `xp_transactions` | Gamification XP ledger | 2 |

## 15 Enums

1. `user_role` — `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`
2. `job_type` — `full_time`, `part_time`, `contract`, `internship`, `freelance`
3. `experience_level` — `entry`, `mid`, `senior`, `lead`, `executive`
4. `application_status` — `submitted`, `under_review`, `interviewing`, `offered`, `rejected`, `withdrawn`
5. `connection_status` — `pending`, `accepted`, `declined`, `blocked`
6. `challenge_difficulty` — `easy`, `medium`, `hard`
7. `challenge_status` — `draft`, `published`, `archived`
8. `submission_status` — `pending`, `evaluating`, `passed`, `failed`
9. `course_level` — `beginner`, `intermediate`, `advanced`
10. `enrollment_status` — `active`, `completed`, `dropped`
11. `notification_type` — `system`, `message`, `application`, `connection`, `course`, `challenge`, `badge`
12. `report_status` — `pending`, `investigating`, `resolved`, `dismissed`
13. `report_reason` — `spam`, `harassment`, `inappropriate_content`, `fraud`, `other`
14. `billing_interval` — `monthly`, `yearly`
15. `subscription_status` — `active`, `canceled`, `past_due`, `trialing`

## Row-Level Security (RLS) Rules

- **Total policies**: 119
- **Policy pattern**: Every table has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- **Default access**: `auth.uid() = user_id` for user-owned rows
- **Recruiter access**: `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_RECRUITER')`
- **Admin access**: `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ROLE_ADMIN')`
- **Public access**: SELECT on public resources (`jobs`, `companies`, `courses`, `challenges`, `profiles` where public)

## 29 Triggers

Triggers handle:
- `updated_at` auto-updating on every mutable table
- XP ledger auto-calculation and leaderboard updates
- Application status event recording
- Notification generation on key events (new message, connection request, application status change)
- Gamification badge unlocks based on XP milestones

## 5 Stored Functions

1. `handle_new_user()` — creates profile and user_roles on auth.users INSERT
2. `calculate_user_xp(user_id UUID)` — sums xp_transactions for a user
3. `record_application_status_event()` — trigger function for status changes
4. `update_updated_at_column()` — universal trigger for timestamp tracking
5. `cleanup_expired_drafts()` — scheduled cleanup for stale draft versions

## Migration Authority

- Primary baseline: `infra/db/migrations/0001_initial_baseline.sql`
- Validation scripts: `scripts/validate-schema-baseline.mjs`, `scripts/validate-schema-entity-alignment.mjs`
- Test seed: `seed-data.sql`
