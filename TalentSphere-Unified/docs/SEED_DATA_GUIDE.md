# TalentSphere Comprehensive Seed Data Guide

> Documentation status: Current seed-data guide. Validate coverage claims against `seed-data.sql`, `supabase-schema.sql`, and `../PLAN.md` before production use.

## Overview

This guide explains how to use the `seed-data.sql` script to populate a local, development, test, or CI Supabase/Postgres database with realistic test data covering all user types, workflows, edge cases, and failure scenarios.

The seed scripts are destructive. They truncate application tables before inserting deterministic demo records. They are guarded by `npm run validate:seed-data-safety` and must not be run against production or a shared customer database.

---

## 📦 What's Included

The seed script creates comprehensive data for:

### User Personas (5 Users)
| Email | Role | Profile Type | Scenario |
|-------|------|--------------|----------|
| `alice.dev@talentsphere.test` | Talent | Active Developer | Complete profile, job seeker, networker |
| `bob.recruiter@talentsphere.test` | Recruiter | Active Recruiter | Posting jobs, reviewing applications |
| `carol.student@talentsphere.test` | Talent | Student | Learning, applying to entry-level roles |
| `david.power@talentsphere.test` | Talent | Power User | Expert profile, instructor, premium subscriber |
| `eve.admin@talentsphere.test` | Admin | Platform Admin | System oversight |

### Data Coverage

> Unified schema note: `seed-data.sql` targets the canonical Supabase schema
> (`infra/db/migrations/0001_initial_baseline.sql` == `supabase-schema.sql`).
> The legacy feed tables (`feed_posts`, `post_likes`, `post_comments`) are not
> part of the unified schema and are not seeded. `scripts/seed_data.py` is a
> legacy per-service-database runner (see "Local Python Seed Runner" below).

#### 1. **Profile Data**
- ✅ Skills (varying proficiency levels)
- ✅ Work Experience (current & past)
- ✅ Education (completed & in-progress)
- ✅ Projects (with tech stack arrays)
- ✅ Certifications (with expiry dates)
- ✅ Languages

#### 2. **Jobs & Applications**
- ✅ 6 Jobs (active, closed, expired)
- ✅ 3 Applications (pending, interview, rejected)
- ✅ 3 Companies with full details
- ✅ Salary ranges, benefits, requirements

#### 3. **Networking**
- ✅ Connections (accepted, pending)
- ✅ Real-time messaging conversations
- ✅ Content reports (Trust & Safety moderation workflow)

#### 4. **Learning (LMS)**
- ✅ 3 Courses (published)
- ✅ 9 Lessons (free preview & locked)
- ✅ Enrollments (in-progress, completed)
- ✅ Lesson progress tracking

#### 5. **Challenges**
- ✅ 2 Coding Challenges (easy, medium)
- ✅ Submissions (accepted, wrong_answer)
- ✅ Execution metrics

#### 6. **Gamification**
- ✅ 6 Badge types
- ✅ User badges awarded
- ✅ XP transactions
- ✅ Leaderboard rankings

#### 7. **Payments**
- ✅ 3 Subscription plans
- ✅ Active subscription
- ✅ Payment history

#### 8. **Notifications**
- ✅ Connection requests
- ✅ Application updates
- ✅ System reminders

---

## 🚀 How to Run

### Option 1: Via Supabase Dashboard

1. **Open SQL Editor**
   - Open the SQL editor for a reviewed local, development, test, or CI project.
   - Confirm that the target project is not production.

2. **Declare the seed scope**
   - Run these statements in the same SQL editor session:
     ```sql
     SET app.seed_environment = 'development';
     SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';
     ```
   - Use `local`, `development`, `dev`, `test`, `testing`, or `ci` for `app.seed_environment`.

3. **Copy Script**
   - Open `/workspace/TalentSphere-Unified/seed-data.sql`
   - Copy entire contents (Ctrl+A, Ctrl+C)

4. **Execute**
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - Wait for completion (~5-10 seconds)

5. **Verify**
   - You should see output:
     ```
     NOTICE: ========================================
     NOTICE: SEEDING COMPLETE
     NOTICE: Users: 5, Jobs: 6, Courses: 3, Challenges: 2, XP transactions: 4
     NOTICE: ========================================
     ```

### Option 2: Via Supabase CLI

```bash
# Connect to a reviewed non-production project
supabase link --project-ref <non-production-project-ref>

# Run the seed script with explicit non-production scope and destructive confirmation
psql "$NON_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -c "SET app.seed_environment = 'development'; SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';" \
  -f seed-data.sql
```

### Option 3: Local Python Seed Runner

The legacy Python seed runner (`scripts/seed_data.py`) targets the legacy
per-service databases (`user_db`, `job_db`, `application_db`), not the unified
Supabase schema. It is destructive and refuses to run until environment scope
and confirmation are present. Prefer `seed-data.sql` for unified-schema
environments.

```bash
TALENTSPHERE_SEED_ENV=development \
ALLOW_DESTRUCTIVE_SEED_DATA=I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA \
TALENTSPHERE_SEED_DB_HOST=localhost \
TALENTSPHERE_SEED_DB_USER=postgres \
TALENTSPHERE_SEED_DB_PASSWORD=postgres \
python scripts/seed_data.py
```

Remote development or test databases require an additional `ALLOW_REMOTE_DEV_SEED=I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA` override. Do not use that override for production.

---

## ⚠️ Important Notes

### 1. **User Creation Limitation**
The script attempts to create users in `auth.users` directly, but this may fail due to Supabase security restrictions. If you see:
```
NOTICE: Could not insert into auth.users directly
```

**Solution:** Manually create the 5 test users first:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add User** → **Create new user**
3. Create these users:
   - `alice.dev@talentsphere.test` / `password123`
   - `bob.recruiter@talentsphere.test` / `password123`
   - `carol.student@talentsphere.test` / `password123`
   - `david.power@talentsphere.test` / `password123`
   - `eve.admin@talentsphere.test` / `password123`
4. Mark them as **Email Confirmed**
5. Re-run the seed script (it will now find the users and populate profiles)

### 2. **Idempotency and Environment Scope**
The script includes `TRUNCATE ... CASCADE` at the beginning, which **deletes all existing data**. 

- Safe to run multiple times only in reviewed local, development, test, or CI databases.
- **DO NOT run in production**.
- `seed-data.sql` refuses to proceed unless the current SQL session defines `app.seed_environment` and `app.allow_destructive_seed_data`.
- `scripts/seed_data.py` refuses to proceed unless `TALENTSPHERE_SEED_ENV` is local/dev/test/CI and `ALLOW_DESTRUCTIVE_SEED_DATA` matches the confirmation phrase.

### 3. **RLS Policies**
The script runs as `postgres` (superuser), bypassing Row Level Security. This is necessary for seeding. RLS remains enabled for normal app users.

### 4. **Safety Validation**

Run the seed safety validator after changing seed scripts, this guide, CI, or the manifest:

```bash
npm run validate:seed-data-safety
```

The validator fails when destructive truncation is not guarded, when Python seeding lacks environment confirmation, or when this guide reintroduces production-unsafe copy-paste instructions.

---

## 🧪 Testing Scenarios Covered

### Empty States
- New users with no profile data (create a 6th user manually to test)
- Jobs with zero applications

### Boundary Values
- Salary ranges: $20/hr (intern) to $200k/year (senior)
- Course prices: Free ($0) to Premium ($99.99)
- Progress: 0%, 10%, 45%, 100%

### Edge Cases
- **Expired jobs**: `Intern (Summer 2023)` with past deadline
- **Rejected applications**: David's application with rejection reason
- **Pending connections**: Carol's request to Alice (not yet accepted)
- **Unread messages**: Latest message in Alice-David conversation
- **Future deadlines**: Challenges ending in 5-10 days
- **Expected graduation**: Carol's education ending in 2026

### Failure Scenarios to Test
1. Apply to already-closed job → Should show error
2. Accept already-accepted connection → Should handle gracefully
3. Enroll in course twice → Should prevent duplicate
4. Submit challenge after deadline → Should reject
5. View another user's private notifications → Should be blocked by RLS

### Performance Testing
- Large dataset simulation: Run script 10x to create 50 users, 60 jobs, etc.
- Test pagination on jobs list
- Test leaderboard/LMS/challenges with many records

---

## 🔍 Verification Queries

After seeding, verify data integrity:

```sql
-- Count records per table
SELECT 
  (SELECT count(*) FROM profiles) as users,
  (SELECT count(*) FROM jobs) as jobs,
  (SELECT count(*) FROM companies) as companies,
  (SELECT count(*) FROM connections) as connections,
  (SELECT count(*) FROM courses) as courses,
  (SELECT count(*) FROM lessons) as lessons,
  (SELECT count(*) FROM challenges) as challenges;

-- Check user profiles completeness (profile rows live in user_profiles)
SELECT 
  up.user_id,
  p.full_name,
  p.role,
  (SELECT count(*) FROM skills s WHERE s.profile_id = up.id) as skills,
  (SELECT count(*) FROM experiences ex WHERE ex.profile_id = up.id) as experiences,
  (SELECT count(*) FROM educations ed WHERE ed.profile_id = up.id) as educations
FROM user_profiles up
JOIN profiles p ON p.id = up.user_id;

-- Check job application funnel
SELECT 
  j.title,
  j.status,
  count(a.id) as applications,
  count(CASE WHEN a.status = 'PENDING' THEN 1 END) as pending,
  count(CASE WHEN a.status = 'INTERVIEW' THEN 1 END) as interview,
  count(CASE WHEN a.status = 'REJECTED' THEN 1 END) as rejected
FROM jobs j
LEFT JOIN job_applications a ON j.id = a.job_id
GROUP BY j.id, j.title, j.status;

-- Check leaderboard
SELECT 
  p.full_name,
  l.total_xp,
  l.rank
FROM leaderboard l
JOIN profiles p ON l.user_id = p.id
ORDER BY l.rank;
```

---

## 🗑️ Cleanup

To remove all seeded data:

```sql
-- Quick cleanup (same as script header)
TRUNCATE TABLE 
  audit_log, system_settings,
  payments, subscriptions, subscription_plans,
  notification_digest_items, notifications, notification_settings,
  content_reports,
  xp_transactions, user_badges, badges, leaderboard,
  challenge_submissions, challenges,
  lesson_progress, enrollments, lessons, courses,
  messages, conversation_participants, conversations,
  networking_suggestion_preferences, connections,
  product_analytics_events,
  automation_suggestion_audit_events, automation_suggestions, ai_sessions,
  hidden_explore_jobs, saved_job_searches,
  candidate_scorecards, candidate_notes,
  resume_artifacts, resume_export_events,
  application_draft_versions, application_drafts, application_status_events,
  job_applications, job_post_templates, job_post_draft_versions, jobs, companies,
  projects, languages, certifications, educations, experiences, skills,
  user_profiles, profiles
CASCADE;
```

To also delete the test auth users (requires admin):
```sql
-- WARNING: This deletes users permanently
DELETE FROM auth.users WHERE email LIKE '%@talentsphere.test';
```

---

## 📊 Expected Data Summary

After successful seeding:

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 5 | All roles covered |
| Companies | 3 | Tech, Fintech, Energy |
| Jobs | 6 | 5 published, 1 closed/expired |
| Applications | 3 | Mixed statuses |
| Connections | 3 | 2 accepted, 1 pending |
| Messages | 4 | Across 2 conversations |
| Content Reports | 2 | Moderation workflow (pending + under_review) |
| Courses | 3 | Different levels |
| Lessons | 9 | 3 per course |
| Challenges | 2 | Easy & Medium |
| Badges | 6 | Various criteria |
| XP Transactions | 4 | Reference-type aware (app-compatible keys) |
| Subscriptions | 1 | Pro plan active |

---

## 🎯 Next Steps

1. ✅ Run the seed script
2. ✅ Verify data counts
3. ✅ Test each feature in the UI
4. ✅ Document any missing scenarios
5. ✅ Extend seed data for new features

---

**Version**: 8.0.0  
**Last Updated**: 2026  
**Compatibility**: Supabase PostgreSQL (unified schema per `infra/db/migrations/0001_initial_baseline.sql`)
