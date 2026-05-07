# TalentSphere Comprehensive Seed Data Guide

## Overview

This guide explains how to use the `seed-data.sql` script to populate your Supabase database with realistic test data covering all user types, workflows, edge cases, and failure scenarios.

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

#### 1. **Profile Data**
- ✅ Skills (varying proficiency levels)
- ✅ Work Experience (current & past)
- ✅ Education (completed & in-progress)
- ✅ Projects & Portfolio items
- ✅ Certifications (with expiry dates)
- ✅ Languages

#### 2. **Jobs & Applications**
- ✅ 6 Jobs (active, closed, expired)
- ✅ 3 Applications (pending, interview, rejected)
- ✅ 3 Companies with full details
- ✅ Salary ranges, benefits, requirements

#### 3. **Networking**
- ✅ Connections (accepted, pending)
- ✅ Feed Posts (public, connections-only)
- ✅ Likes & Comments
- ✅ Real-time messaging conversations

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

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open SQL Editor**
   - Go to: https://app.supabase.com/project/tvulrziizvakwzxfvdwv/sql/new

2. **Copy Script**
   - Open `/workspace/TalentSphere-Unified/seed-data.sql`
   - Copy entire contents (Ctrl+A, Ctrl+C)

3. **Execute**
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - Wait for completion (~5-10 seconds)

4. **Verify**
   - You should see output:
     ```
     NOTICE: ========================================
     NOTICE: SEEDING COMPLETE
     NOTICE: Users: 5, Jobs: 6, Posts: 4
     NOTICE: ========================================
     ```

### Option 2: Via Supabase CLI

```bash
# Connect to your project
supabase link --project-ref tvulrziizvakwzxfvdwv

# Run the seed script
psql "postgresql://postgres:[TalentSphere-Unified]@db.tvulrziizvakwzxfvdwv.supabase.co:5432/postgres" -f seed-data.sql
```

### Option 3: Programmatically (Node.js)

Create a file `seed-runner.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://tvulrziizvakwzxfvdwv.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // Note: Use service role for seeding
);

async function runSeed() {
  const sql = fs.readFileSync('./seed-data.sql', 'utf-8');
  
  // Split by semicolons and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    if (!stmt.includes('--')) { // Skip comments
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) console.error('Error:', error);
    }
  }
  
  console.log('Seeding complete!');
}

runSeed();
```

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

### 2. **Idempotency**
The script includes `TRUNCATE ... CASCADE` at the beginning, which **deletes all existing data**. 

- ✅ Safe to run multiple times in dev/test
- ❌ **DO NOT run in production**

### 3. **RLS Policies**
The script runs as `postgres` (superuser), bypassing Row Level Security. This is necessary for seeding. RLS remains enabled for normal app users.

---

## 🧪 Testing Scenarios Covered

### Empty States
- New users with no profile data (create a 6th user manually to test)
- Jobs with zero applications
- Feed with no posts (temporarily truncate `feed_posts`)

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
- Test feed scrolling with many posts

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
  (SELECT count(*) FROM feed_posts) as posts,
  (SELECT count(*) FROM courses) as courses,
  (SELECT count(*) FROM challenges) as challenges;

-- Check user profiles completeness
SELECT 
  p.full_name,
  p.role,
  count(DISTINCT s.id) as skills,
  count(DISTINCT e.id) as experiences,
  count(DISTINCT ed.id) as educations
FROM profiles p
LEFT JOIN skills s ON p.id = s.user_id
LEFT JOIN experiences e ON p.id = e.user_id
LEFT JOIN educations ed ON p.id = ed.user_id
GROUP BY p.id, p.full_name, p.role;

-- Check job application funnel
SELECT 
  j.title,
  j.status,
  count(a.id) as applications,
  count(CASE WHEN a.status = 'pending' THEN 1 END) as pending,
  count(CASE WHEN a.status = 'interview' THEN 1 END) as interview,
  count(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected
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
  xp_transactions, user_badges, badges, leaderboard,
  lesson_progress, enrollments, lessons, courses,
  challenge_submissions, challenges,
  post_comments, post_likes, feed_posts,
  messages, conversation_participants, conversations,
  connections,
  job_applications, jobs, companies,
  certifications, languages, projects, portfolio_items, educations, experiences, skills,
  user_profiles, profiles,
  payments, subscriptions, subscription_plans,
  notifications, notification_settings,
  audit_log, system_settings
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
| Jobs | 6 | 5 active, 1 closed/expired |
| Applications | 3 | Mixed statuses |
| Connections | 3 | 2 accepted, 1 pending |
| Feed Posts | 4 | Public & connections-only |
| Messages | 3+ | Across 2 conversations |
| Courses | 3 | Different levels |
| Lessons | 9 | 3 per course |
| Challenges | 2 | Easy & Medium |
| Badges | 6 | Various criteria |
| Subscriptions | 1 | Pro plan active |

---

## 🎯 Next Steps

1. ✅ Run the seed script
2. ✅ Verify data counts
3. ✅ Test each feature in the UI
4. ✅ Document any missing scenarios
5. ✅ Extend seed data for new features

---

**Version**: 7.0.0  
**Last Updated**: May 2025  
**Compatibility**: Supabase PostgreSQL
