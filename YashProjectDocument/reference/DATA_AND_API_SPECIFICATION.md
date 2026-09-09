# TalentSphere Data & API Specification

> Documentation status: Canonical data and API baseline. Reconciled with codebase on 2026-09-08.

## 1. Database Schema Overview

### 1.1 Schema Statistics

| Metric | Count | Source |
|--------|-------|--------|
| Total Tables | 60 | data-ownership-manifest.json |
| Canonical Baseline Tables | 50 | 0001_initial_baseline.sql, supabase-schema.sql |
| Legacy Master Tables | 10 | infra/supabase_master.sql (legacy-master-only) |
| Direct Frontend Tables | 46 | typedSupabase imports |
| RLS-Enabled Tables | 40 | Baseline RLS policies |
| Database Enums | 15 | PostgreSQL enum types |
| Triggers | 29 | Automatic timestamps, validations |
| Database Functions | 5 | update_updated_at_column, etc. |

### 1.2 Schema Authority

Per ADR-003, the canonical schema authority chain is:
1. `supabase-schema.sql` (reviewed SQL baseline)
2. `infra/db/migrations/0001_initial_baseline.sql` (mirrored migration)
3. `infra/db/generated/database.types.ts` (generated TypeScript types)

---

## 2. Canonical Database Tables (50)

### 2.1 Identity & Authentication

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `profiles` | `id` (UUID) | email, full_name, role, is_active, deleted_at | Yes |
| `user_profiles` | `user_id` (UUID) | bio, avatar_url, location, headline | Yes |
| `user_settings` | `user_id` (UUID) | notification_prefs, privacy_settings | Yes |

### 2.2 Jobs & Applications

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `companies` | `id` (UUID) | name, industry, size, website | Yes |
| `jobs` | `id` (UUID) | title, company_id, location, salary_range, status | Yes |
| `job_applications` | `id` (UUID) | job_id, user_id, status, resume_url | Yes |
| `application_status_events` | `id` (UUID) | application_id, old_status, new_status, actor_id | Yes |
| `saved_jobs` | `id` (UUID) | user_id, job_id | Yes |
| `job_bookmarks` | `id` (UUID) | user_id, job_id | Yes |
| `recruiter_notes` | `id` (UUID) | recruiter_id, candidate_id, job_id, note | Yes |
| `scorecards` | `id` (UUID) | application_id, recruiter_id, scores JSON | Yes |

### 2.3 Learning Management System

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `courses` | `id` (UUID) | title, description, instructor_id, category | Yes |
| `modules` | `id` (UUID) | course_id, title, order_index, video_url | Yes |
| `enrollments` | `id` (UUID) | user_id, course_id, enrolled_at, completed_at | Yes |
| `module_progress` | `id` (UUID) | enrollment_id, module_id, status, score | Yes |
| `certificates` | `id` (UUID) | enrollment_id, user_id, issued_at, pdf_url | Yes |

### 2.4 Challenges & Coding

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `challenges` | `id` (UUID) | title, category, difficulty, description | Yes |
| `challenge_submissions` | `id` (UUID) | challenge_id, user_id, code, status, score | Yes |
| `test_cases` | `id` (UUID) | challenge_id, input, expected_output, hidden | Yes |
| `submission_results` | `id` (UUID) | submission_id, test_case_id, passed, runtime | Yes |

### 2.5 Networking & Connections

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `connections` | `id` (UUID) | requester_id, accepter_id, status, connected_at | Yes |
| `connection_suggestions` | `id` (UUID) | user_id, suggested_user_id, score | Yes |
| `suggestion_preferences` | `id` (UUID) | user_id, include_colleagues, include_alumni | Yes |
| `feed_activities` | `id` (UUID) | user_id, activity_type, metadata | Yes |

### 2.6 Messaging

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `conversations` | `id` (UUID) | created_at, updated_at | Yes |
| `conversation_participants` | `id` (UUID) | conversation_id, user_id, joined_at | Yes |
| `messages` | `id` (UUID) | conversation_id, sender_id, content, status | Yes |
| `message_attachments` | `id` (UUID) | message_id, file_url, file_name, file_size | Yes |

### 2.7 Notifications

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `notifications` | `id` (UUID) | user_id, type, title, message, read_at | Yes |
| `notification_settings` | `id` (UUID) | user_id, email_enabled, push_enabled | Yes |

### 2.8 Gamification

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `leaderboard` | `id` (UUID) | user_id, total_xp, level, updated_at | Yes |
| `xp_transactions` | `id` (UUID) | user_id, amount, reference_type, reference_id, created_at | Yes |
| `user_badges` | `id` (UUID) | user_id, badge_type, awarded_at | Yes |
| `achievements` | `id` (UUID) | name, description, xp_reward, icon | Yes |

### 2.9 Trust & Safety

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `content_reports` | `id` (UUID) | reporter_id, content_type, content_id, reason, status | Yes |
| `moderation_actions` | `id` (UUID) | report_id, moderator_id, action, notes | Yes |
| `blocked_users` | `id` (UUID) | blocker_id, blocked_id, created_at | Yes |

### 2.10 Billing & Payments

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `subscription_plans` | `id` (UUID) | name, price, interval, features | Yes |
| `subscriptions` | `id` (UUID) | user_id, plan_id, status, current_period_end | Yes |
| `payments` | `id` (UUID) | subscription_id, amount, status, stripe_session_id | Yes |

### 2.11 Analytics & Admin

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `product_analytics_events` | `id` (UUID) | user_id, event_name, properties, created_at | Yes |
| `audit_logs` | `id` (UUID) | user_id, action, entity_type, entity_id, metadata | Yes |
| `admin_settings` | `id` (UUID) | key, value, updated_by, updated_at | Yes |
| `feature_flags` | `id` (UUID) | name, enabled, rollout_percentage | Yes |

### 2.12 Resume & Portfolio

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `resumes` | `id` (UUID) | user_id, title, content, version | Yes |
| `resume_artifacts` | `id` (UUID) | user_id, file_url, file_type, parsed_data | Yes |
| `portfolio_items` | `id` (UUID) | user_id, title, description, url, type | Yes |

### 2.13 Skills & Experience

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `skills` | `id` (UUID) | name, category | Yes |
| `user_skills` | `id` (UUID) | user_id, skill_id, proficiency, years | Yes |
| `experiences` | `id` (UUID) | user_id, company, title, start_date, end_date | Yes |
| `education` | `id` (UUID) | user_id, institution, degree, field, start_date | Yes |

### 2.14 Search & Automation

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `saved_searches` | `id` (UUID) | user_id, name, filters JSON, created_at | Yes |
| `automation_suggestions` | `id` (UUID) | user_id, type, data JSON, status | Yes |
| `automation_suggestion_audit_events` | `id` (UUID) | suggestion_id, user_id, action | Yes |

### 2.15 Skills Assessment

| Table | Primary Key | Key Columns | RLS |
|-------|-------------|-------------|-----|
| `skill_assessments` | `id` (UUID) | user_id, skill_id, score, completed_at | Yes |

---

## 3. Database Enums (15)

| Enum | Values |
|------|--------|
| `user_role` | ROLE_USER, ROLE_RECRUITER, ROLE_ADMIN |
| `job_status` | draft, published, closed, archived |
| `application_status` | pending, reviewed, shortlisted, offered, rejected, hired |
| `connection_status` | pending, accepted, declined, blocked |
| `message_status` | sent, delivered, read |
| `notification_type` | job_alert, application_update, message, system |
| `challenge_category` | algorithms, frontend, backend, database |
| `challenge_difficulty` | easy, medium, hard |
| `submission_status` | pending, evaluating, passed, failed, error |
| `enrollment_status` | active, completed, dropped |
| `module_status` | not_started, in_progress, completed |
| `report_status` | pending, under_review, resolved, dismissed |
| `subscription_status` | active, canceled, past_due, trialing |
| `payment_status` | pending, succeeded, failed, refunded |
| `badge_type` | first_job, learner, coder, networker, top_performer |

---

## 4. Row-Level Security (RLS) Policies

### 4.1 Policy Statistics

| Metric | Count |
|--------|-------|
| Total RLS Policies | 119 |
| Tables with RLS | 40 |
| Policies per Table (avg) | 2.98 |
| Policy Types | SELECT, INSERT, UPDATE, DELETE |

### 4.2 Policy Pattern Examples

```sql
-- Profile read policy (users can read their own)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Profile update policy (users can update their own)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Job application policy (recruiters see their jobs' applications)
CREATE POLICY "applications_select_recruiter" ON job_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_applications.job_id
      AND jobs.recruiter_id = auth.uid()
    )
  );

-- Message policy (participants only)
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );
```

### 4.3 Policy Categories

| Category | Tables | Policies |
|----------|--------|----------|
| Owner-only access | profiles, user_profiles, resumes | 12 |
| Participant access | messages, conversations | 8 |
| Role-based access | admin settings, audit logs | 6 |
| Relationship-based | job applications, scorecards | 15 |
| Public read | jobs, courses, challenges | 4 |

---

## 5. Database Functions (5)

| Function | Purpose | Usage |
|----------|---------|-------|
| `update_updated_at_column()` | Auto-update timestamp trigger | 20+ tables |
| `enforce_job_publish_readiness()` | Validate job before publish | jobs table |
| `create_user_profile()` | Auto-create profile on signup | auth.users trigger |
| `update_leaderboard_xp()` | Update user XP and level | xp_transactions trigger |
| `get_mutual_connection_counts()` | Calculate mutual connections | networking queries |

---

## 6. Triggers (29)

| Trigger | Table | Event | Purpose |
|---------|-------|-------|---------|
| `update_profiles_updated_at` | profiles | BEFORE UPDATE | Set updated_at |
| `update_jobs_updated_at` | jobs | BEFORE UPDATE | Set updated_at |
| `update_messages_updated_at` | messages | BEFORE UPDATE | Set updated_at |
| `on_auth_user_created` | auth.users | AFTER INSERT | Create profile |
| `update_leaderboard_on_xp` | xp_transactions | AFTER INSERT | Update XP |
| ... | ... | ... | ... |

---

## 7. API Specifications

### 7.1 PostgREST API (Primary)

#### Authentication
```http
POST /rest/v1/rpc/authenticate
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "****"
}

Response: { "access_token": "eyJ...", "user": {...} }
```

#### CRUD Operations
```http
# List jobs with filters
GET /rest/v1/jobs?status=eq.published&location=eq.remote&order=created_at.desc&limit=20

# Create job application
POST /rest/v1/job_applications
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "job_id": "uuid",
  "user_id": "uuid",
  "resume_url": "https://..."
}

# Update application status
PATCH /rest/v1/job_applications?id=eq.<uuid>
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "status": "shortlisted"
}
```

#### Real-time Subscriptions
```javascript
// Subscribe to new messages
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

### 7.2 Spring Cloud Gateway API (Secondary)

#### Gateway Endpoints
```http
# User service
GET /api/v1/users/{id}
PUT /api/v1/users/{id}

# Job service
GET /api/v1/jobs
POST /api/v1/jobs
GET /api/v1/jobs/{id}

# Challenge service
POST /api/v1/challenges/{id}/submit
GET /api/v1/challenges/{id}/results/{submissionId}

# Gamification service
POST /api/v1/gamification/xp/award
GET /api/v1/gamification/leaderboard
```

### 7.3 OpenAPI Specifications

| Service | Operations | Path |
|---------|------------|------|
| Gateway | 123 | `/api/v1/**` |
| Auth Service | 8 | `/api/v1/auth/**` |
| Job Service | 15 | `/api/v1/jobs/**` |
| Challenge Service | 10 | `/api/v1/challenges/**` |
| Gamification Service | 8 | `/api/v1/gamification/**` |
| Trust Service | 6 | `/api/v1/moderation/**` |

---

## 8. Data Access Patterns

### 8.1 Supabase Direct (Frontend)

```typescript
// Example: typedSupabase usage
import { typedSupabase } from '@/lib/supabaseClient';

// Fetch jobs
const { data, error } = await typedSupabase
  .from('jobs')
  .select('*, companies(name, logo_url)')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(20);

// Insert XP transaction
const { error } = await typedSupabase
  .from('xp_transactions')
  .insert({
    user_id: userId,
    amount: 50,
    reference_type: 'challenge',
    reference_id: challengeId
  });
```

### 8.2 Spring JPA (Backend)

```java
// Example: Spring Data JPA repository
@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    
    @Query("SELECT j FROM Job j WHERE j.status = :status AND j.recruiterId = :recruiterId")
    List<Job> findByRecruiterAndStatus(@Param("recruiterId") UUID recruiterId, 
                                        @Param("status") JobStatus status);
    
    @Query("SELECT j FROM Job j WHERE j.location = :location AND j.status = 'PUBLISHED'")
    List<Job> findPublishedJobsByLocation(@Param("location") String location);
}
```

---

## 9. Schema Migrations

### 9.1 Migration Strategy

Per ADR-003, migrations follow this pattern:
1. Manual SQL review and approval
2. Add to `supabase-schema.sql`
3. Mirror to `0001_initial_baseline.sql`
4. Generate TypeScript types
5. Validate with `npm run validate:schema-migrations`

### 9.2 Migration Validators

| Validator | Purpose |
|-----------|---------|
| `validate:schema-migrations` | Verify 50-table baseline integrity |
| `validate:typed-supabase-boundary` | Ensure typed client usage |
| `validate:data-ownership` | Manifest consistency |
| `validate:seed-data-safety` | Destructive operation guards |
| `validate:legacy-schema-disposition` | Legacy table handling |

---

## 10. Indexing Strategy

### 10.1 Index Statistics

| Metric | Count |
|--------|-------|
| Total Indexes | 47 |
| Primary Key Indexes | 50 |
| Unique Indexes | 8 |
| Composite Indexes | 12 |
| Partial Indexes | 5 |

### 10.2 Key Indexes

```sql
-- Job search performance
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX idx_jobs_location ON jobs USING gin(to_tsvector('english', location));

-- Application lookups
CREATE INDEX idx_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_applications_status ON job_applications(status);

-- Message threading
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- XP deduplication
CREATE UNIQUE INDEX idx_xp_unique_reference ON xp_transactions(user_id, reference_type, reference_id);
```

---

## 11. Seed Data

### 11.1 Seed Data Strategy

| Environment | Data Scope | Safety Mechanism |
|-------------|------------|------------------|
| Development | Full seed (users, jobs, courses) | `app.seed_environment = 'development'` |
| Testing | Minimal seed (3 users, 5 jobs) | CI-only environment check |
| Production | No seed | Blocked by validator |

### 11.2 Seed Data Files

| File | Purpose |
|------|---------|
| `seed-data.sql` | PostgreSQL seed functions |
| `scripts/seed_data.py` | Python seed orchestrator |
| `SEED_DATA_GUIDE.md` | Usage documentation |
