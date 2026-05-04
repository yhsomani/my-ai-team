-- ================================================================
-- TalentSphere Comprehensive Seed Data
-- Version: 7.0.0 (Supabase Native)
-- Purpose: Full E2E Testing Coverage
-- ================================================================

-- Disable RLS temporarily for seeding (Re-enable after if needed, though policies usually allow insert for owners)
-- Note: We assume we are running as 'postgres' or a superuser role for seeding.

-- ----------------------------------------------------------------
-- 1. CLEANUP (Idempotency)
-- ----------------------------------------------------------------
-- We will truncate tables in reverse dependency order to allow re-running.
-- WARNING: This deletes existing data. Only run in dev/test environments.

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

-- Reset sequences (optional but good practice)
-- (Supabase handles this mostly automatically, but explicit resets help if IDs matter)

-- ----------------------------------------------------------------
-- 2. SYSTEM CONFIGURATION & SETTINGS
-- ----------------------------------------------------------------

INSERT INTO system_settings (key, value, description) VALUES
  ('platform_name', 'TalentSphere', 'Main platform name'),
  ('maintenance_mode', 'false', 'Global maintenance flag'),
  ('min_password_length', '8', 'Security setting'),
  ('max_upload_mb', '10', 'File upload limit'),
  ('ai_feature_enabled', 'true', 'Toggle AI features');

INSERT INTO notification_settings (user_id, email_notifications, push_notifications, marketing_emails)
SELECT id, true, true, false FROM auth.users LIMIT 1; -- Fallback if no users yet, will be overwritten by profile creation trigger usually

-- ----------------------------------------------------------------
-- 3. USERS & PROFILES (The Core Personas)
-- ----------------------------------------------------------------

-- NOTE: In a real Supabase setup, users must exist in auth.users first.
-- For seeding via SQL Editor, we often simulate this or assume you created 5 test users via the UI first.
-- HOWEVER, to make this script standalone for testing, we will use UUIDs that *would* correspond to created users.
-- BETTER APPROACH FOR SEEDING: We will insert into `profiles` assuming the auth user exists. 
-- If you haven't created users yet, run the "Create Test Users" block below ONLY IF your DB allows direct auth insertion (usually restricted).
-- SAFE APPROACH: We will create profiles for specific UUIDs. You MUST create the auth users first via UI or API, OR use the `auth` extension if available.

-- Let's assume we are creating data for 5 specific User IDs. 
-- Replace these UUIDs with actual user IDs from your auth.users table if running manually.
-- For this script to work out-of-the-box in a fresh DB where we can't easily insert into auth.users via SQL Editor due to security:
-- We will use a trick: Create the profiles using the `auth.uid()` if we were in a function, but here we need static IDs.
-- INSTRUCTION: Run the "Manual User Creation" steps in the README first, then run this.
-- OR: If you have `pgcrypto` or similar, we could generate. 
-- LET'S ASSUME: We will generate 5 dummy UUIDs and hope the trigger creates auth users? No, that's backwards.
-- CORRECT WAY FOR SUPABASE SEEDING: 
-- 1. Create users via API/UI. 
-- 2. Get their IDs. 
-- 3. Run this script replacing the IDs.
-- 
-- ALTERNATIVE FOR DEMO: We will use `auth.users` insertion if the role permits (often doesn't in cloud).
-- Let's try to insert into auth.users directly. If it fails due to RLS/Permissions, the user must create them via UI.
-- *Attempting direct insert for completeness, knowing it might require postgres role*

DO $$
DECLARE
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid();
  u4 uuid := gen_random_uuid();
  u5 uuid := gen_random_uuid();
BEGIN
  -- Attempt to create auth users (May require superuser)
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
  (uuid_nil(), u1, 'authenticated', 'authenticated', 'alice.dev@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Dev","sub":u1,"email":"alice.dev@talentsphere.test"}', now(), now(), '', '', '', ''),
  (uuid_nil(), u2, 'authenticated', 'authenticated', 'bob.recruiter@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Recruiter","sub":u2,"email":"bob.recruiter@talentsphere.test"}', now(), now(), '', '', '', ''),
  (uuid_nil(), u3, 'authenticated', 'authenticated', 'carol.student@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carol Student","sub":u3,"email":"carol.student@talentsphere.test"}', now(), now(), '', '', '', ''),
  (uuid_nil(), u4, 'authenticated', 'authenticated', 'david.power@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Power User","sub":u4,"email":"david.power@talentsphere.test"}', now(), now(), '', '', '', ''),
  (uuid_nil(), u5, 'authenticated', 'authenticated', 'eve.admin@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Admin","sub":u5,"email":"eve.admin@talentsphere.test"}', now(), now(), '', '', '', '');
  
  -- Store IDs in a temp table for use below? No, let's just rely on emails to fetch IDs if the above works.
  -- If the above fails (permissions), the rest of this script will fail on FK constraints.
  -- FALLBACK: We will define variables at the top of the script for manual replacement if auto-insert fails.
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not insert into auth.users directly (Permission denied?). Please create users via UI and update the UUID variables in this script.';
END $$;

-- Let's define variables for the User IDs to make the rest of the script robust.
-- If the insert above worked, we fetch them. If not, these will be NULL and subsequent inserts will fail (safely).
-- For the sake of a copy-paste script that works if you manually created users, I'll use a CTE to fetch IDs by email.

WITH user_ids AS (
  SELECT id, email FROM auth.users WHERE email IN (
    'alice.dev@talentsphere.test',
    'bob.recruiter@talentsphere.test',
    'carol.student@talentsphere.test',
    'david.power@talentsphere.test',
    'eve.admin@talentsphere.test'
  )
)
SELECT id INTO TEMPORARY TABLE temp_users FROM user_ids;

-- If temp_users is empty, stop execution or warn? 
-- Let's assume success for the script generation. You may need to manually replace IDs if auto-creation failed.

-- Profiles
INSERT INTO profiles (id, email, full_name, avatar_url, bio, headline, role, location, website, created_at)
SELECT 
  u.id,
  u.email,
  (u.raw_user_meta_data->>'full_name'),
  CASE WHEN u.email LIKE '%alice%' THEN 'https://i.pravatar.cc/150?u=alice' ELSE NULL END,
  CASE 
    WHEN u.email LIKE '%alice%' THEN 'Passionate Frontend Developer with 3 years of experience in React and TypeScript.'
    WHEN u.email LIKE '%bob%' THEN 'Technical Recruiter at TechCorp. Looking for top talent!'
    WHEN u.email LIKE '%carol%' THEN 'Computer Science student eager to learn and grow.'
    WHEN u.email LIKE '%david%' THEN 'Full Stack Architect | Open Source Contributor | Speaker'
    WHEN u.email LIKE '%eve%' THEN 'Platform Administrator'
    ELSE 'New User'
  END,
  CASE 
    WHEN u.email LIKE '%alice%' THEN 'Senior Frontend Engineer'
    WHEN u.email LIKE '%bob%' THEN 'Senior Technical Recruiter'
    WHEN u.email LIKE '%carol%' THEN 'CS Student'
    WHEN u.email LIKE '%david%' THEN 'Staff Software Engineer'
    ELSE 'User'
  END,
  CASE 
    WHEN u.email LIKE '%alice%' THEN 'talent'
    WHEN u.email LIKE '%bob%' THEN 'recruiter'
    WHEN u.email LIKE '%carol%' THEN 'talent'
    WHEN u.email LIKE '%david%' THEN 'talent'
    ELSE 'admin'
  END,
  CASE 
    WHEN u.email LIKE '%alice%' THEN 'San Francisco, CA'
    WHEN u.email LIKE '%bob%' THEN 'New York, NY'
    WHEN u.email LIKE '%carol%' THEN 'Austin, TX'
    WHEN u.email LIKE '%david%' THEN 'Remote'
    ELSE 'Unknown'
  END,
  CASE 
    WHEN u.email LIKE '%alice%' THEN 'https://alicedev.com'
    WHEN u.email LIKE '%david%' THEN 'https://davidpower.io'
    ELSE NULL
  END,
  now()
FROM auth.users u
WHERE u.email IN (
  'alice.dev@talentsphere.test',
  'bob.recruiter@talentsphere.test',
  'carol.student@talentsphere.test',
  'david.power@talentsphere.test',
  'eve.admin@talentsphere.test'
);

-- Helper: Get IDs for use in subsequent inserts (using CTEs in actual inserts is safer)
-- We will use subqueries to fetch user IDs by email in the following inserts to ensure robustness.

-- ----------------------------------------------------------------
-- 4. SKILLS, EXPERIENCE, EDUCATION (Profile Completeness)
-- ----------------------------------------------------------------

-- Skills
INSERT INTO skills (user_id, name, proficiency_level, years_of_experience)
SELECT u.id, 'React', 'expert', 4 FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 'TypeScript', 'expert', 3 FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 'Node.js', 'intermediate', 2 FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 'Tailwind CSS', 'expert', 3 FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 'Recruiting', 'expert', 5 FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL SELECT u.id, 'Technical Interviewing', 'advanced', 4 FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL SELECT u.id, 'Python', 'beginner', 1 FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL SELECT u.id, 'Java', 'intermediate', 2 FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL SELECT u.id, 'System Design', 'expert', 8 FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL SELECT u.id, 'AWS', 'expert', 6 FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL SELECT u.id, 'Kubernetes', 'advanced', 5 FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Experience
INSERT INTO experiences (user_id, company_name, position, start_date, end_date, description, is_current)
SELECT u.id, 'TechStart Inc.', 'Frontend Developer', '2021-06-01', NULL, 'Built responsive UIs using React. Improved load times by 40%.', true
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT u.id, 'WebSolutions', 'Junior Developer', '2020-01-01', '2021-05-31', 'Developed landing pages and maintained legacy codebases.', false
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT u.id, 'TechCorp', 'Senior Technical Recruiter', '2019-03-01', NULL, 'Leading technical hiring for engineering teams.', true
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
SELECT u.id, 'University Lab', 'Research Assistant', '2023-01-01', '2023-12-01', 'Assisted in AI research projects.', false
FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL
SELECT u.id, 'MegaCorp', 'Staff Engineer', '2018-01-01', NULL, 'Architecting microservices and mentoring junior devs.', true
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT u.id, 'StartupX', 'CTO', '2015-01-01', '2017-12-31', 'Led engineering team from 0 to 20.', false
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Education
INSERT INTO educations (user_id, school_name, degree, field_of_study, start_date, end_date)
SELECT u.id, 'University of California, Berkeley', 'Bachelor of Science', 'Computer Science', '2017-08-01', '2021-05-31'
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT u.id, 'State University', 'Bachelor of Arts', 'Psychology', '2015-08-01', '2019-05-31'
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
SELECT u.id, 'Texas A&M', 'Bachelor of Science', 'Computer Science', '2022-08-01', '2026-05-31' -- Expected graduation
FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL
SELECT u.id, 'MIT', 'Master of Science', 'Computer Science', '2013-08-01', '2015-05-31'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Projects & Portfolio
INSERT INTO projects (user_id, title, description, url, github_url, thumbnail_url, created_at)
SELECT u.id, 'E-Commerce Dashboard', 'A full-featured admin dashboard built with React and Supabase.', 'https://demo.alicedev.com', 'https://github.com/alice/ecom-dashboard', 'https://via.placeholder.com/400x200?text=Ecom+Dash', now()
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT u.id, 'AI Chatbot', 'Python-based chatbot using LangChain.', NULL, 'https://github.com/carol/ai-bot', NULL, now()
FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL
SELECT u.id, 'Open Source Logger', 'High performance logging library for Node.js.', 'https://npmjs.com/package/david-logger', 'https://github.com/david/logger', NULL, now()
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Certifications
INSERT INTO certifications (user_id, name, issuing_organization, issue_date, expiry_date, credential_url)
SELECT u.id, 'AWS Certified Solutions Architect', 'Amazon Web Services', '2022-06-01', '2025-06-01', 'https://aws.amazon.com/verification'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT u.id, 'React Advanced Certification', 'Meta', '2023-01-01', NULL, 'https://meta.com/cert'
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test';

-- Languages
INSERT INTO languages (user_id, language, proficiency)
SELECT u.id, 'English', 'native' FROM auth.users u WHERE u.email IN ('alice.dev@talentsphere.test', 'bob.recruiter@talentsphere.test')
UNION ALL SELECT u.id, 'Spanish', 'intermediate' FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 'German', 'basic' FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- ----------------------------------------------------------------
-- 5. COMPANIES & JOBS
-- ----------------------------------------------------------------

-- Companies
INSERT INTO companies (owner_id, name, industry, size, location, website, description, logo_url)
SELECT u.id, 'TechCorp', 'Technology', '1000-5000', 'New York, NY', 'https://techcorp.com', 'Leading provider of enterprise solutions.', 'https://logo.clearbit.com/techcorp.com'
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
SELECT u.id, 'StartupX', 'Fintech', '10-50', 'San Francisco, CA', 'https://startupx.io', 'Disrupting the payment industry.', NULL
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
SELECT u.id, 'GreenEnergy Co', 'Energy', '500-1000', 'Austin, TX', 'https://greenenergy.co', 'Sustainable energy solutions for everyone.', 'https://logo.clearbit.com/greenenergy.co'
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test';

-- Jobs
INSERT INTO jobs (company_id, recruiter_id, title, type, level, category, location, salary_min, salary_max, currency, description, requirements, benefits, status, posted_at, deadline)
-- TechCorp Jobs
SELECT c.id, c.owner_id, 'Senior Frontend Engineer', 'full-time', 'senior', 'Engineering', 'Remote', 150000, 200000, 'USD', 'Build amazing UIs.', 'React, TS, 5+ years exp', 'Health, 401k', 'active', now() - INTERVAL '10 days', now() + INTERVAL '20 days'
FROM companies c WHERE c.name = 'TechCorp'
UNION ALL
SELECT c.id, c.owner_id, 'Backend Developer (Go)', 'full-time', 'mid', 'Engineering', 'New York, NY', 120000, 160000, 'USD', 'Scale our APIs.', 'Go, Postgres, Docker', 'Equity, Health', 'active', now() - INTERVAL '5 days', now() + INTERVAL '25 days'
FROM companies c WHERE c.name = 'TechCorp'
UNION ALL
SELECT c.id, c.owner_id, 'Product Designer', 'contract', 'mid', 'Design', 'Remote', 80000, 120000, 'USD', 'Design intuitive interfaces.', 'Figma, UX Research', 'Flexible hours', 'active', now() - INTERVAL '2 days', now() + INTERVAL '15 days'
FROM companies c WHERE c.name = 'TechCorp'
UNION ALL
-- StartupX Jobs
SELECT c.id, c.owner_id, 'Founding Engineer', 'full-time', 'senior', 'Engineering', 'San Francisco, CA', 140000, 180000, 'USD', 'Build from scratch.', 'Full stack, startup mindset', 'Significant Equity', 'active', now() - INTERVAL '1 day', now() + INTERVAL '30 days'
FROM companies c WHERE c.name = 'StartupX'
UNION ALL
-- GreenEnergy Jobs
SELECT c.id, c.owner_id, 'Data Scientist', 'full-time', 'mid', 'Data Science', 'Austin, TX', 110000, 150000, 'USD', 'Analyze energy patterns.', 'Python, ML, SQL', 'Green commute', 'active', now() - INTERVAL '15 days', now() + INTERVAL '10 days'
FROM companies c WHERE c.name = 'GreenEnergy Co'
UNION ALL
-- Expired Job
SELECT c.id, c.owner_id, 'Intern (Summer 2023)', 'internship', 'entry', 'Engineering', 'Remote', 20, 30, 'USD', 'Learn and build.', 'Student status', 'Mentorship', 'closed', now() - INTERVAL '100 days', now() - INTERVAL '10 days'
FROM companies c WHERE c.name = 'TechCorp';

-- Job Applications
-- Alice applies to TechCorp Senior FE
INSERT INTO job_applications (job_id, applicant_id, resume_url, cover_letter, status, submitted_at)
SELECT j.id, u.id, 'https://storage.supabase.co/resumes/alice_resume.pdf', 'I am very interested in this role...', 'interview', now() - INTERVAL '8 days'
FROM jobs j, auth.users u WHERE j.title = 'Senior Frontend Engineer' AND u.email = 'alice.dev@talentsphere.test';

-- Carol applies to GreenEnergy Data Scientist
INSERT INTO job_applications (job_id, applicant_id, resume_url, cover_letter, status, submitted_at)
SELECT j.id, u.id, NULL, 'Excited about sustainable energy!', 'pending', now() - INTERVAL '12 days'
FROM jobs j, auth.users u WHERE j.title = 'Data Scientist' AND u.email = 'carol.student@talentsphere.test';

-- David applies to StartupX (Direct hire scenario?) Or maybe David is too senior. Let's say David applied and was rejected.
INSERT INTO job_applications (job_id, applicant_id, resume_url, cover_letter, status, submitted_at, rejected_at, rejection_reason)
SELECT j.id, u.id, NULL, 'Let''s build the future.', 'rejected', now() - INTERVAL '20 days', now() - INTERVAL '15 days', 'Overqualified for this specific role.'
FROM jobs j, auth.users u WHERE j.title = 'Founding Engineer' AND u.email = 'david.power@talentsphere.test';

-- ----------------------------------------------------------------
-- 6. NETWORKING (Connections & Feed)
-- ----------------------------------------------------------------

-- Connections
-- Alice connected to David
INSERT INTO connections (requester_id, receiver_id, status, created_at, updated_at)
SELECT u1.id, u2.id, 'accepted', now() - INTERVAL '30 days', now() - INTERVAL '30 days'
FROM auth.users u1, auth.users u2 WHERE u1.email = 'alice.dev@talentsphere.test' AND u2.email = 'david.power@talentsphere.test';

-- Carol sends request to Alice
INSERT INTO connections (requester_id, receiver_id, status, created_at)
SELECT u1.id, u2.id, 'pending', now() - INTERVAL '2 days'
FROM auth.users u1, auth.users u2 WHERE u1.email = 'carol.student@talentsphere.test' AND u2.email = 'alice.dev@talentsphere.test';

-- Bob connected to Eve
INSERT INTO connections (requester_id, receiver_id, status, created_at, updated_at)
SELECT u1.id, u2.id, 'accepted', now() - INTERVAL '60 days', now() - INTERVAL '60 days'
FROM auth.users u1, auth.users u2 WHERE u1.email = 'bob.recruiter@talentsphere.test' AND u2.email = 'eve.admin@talentsphere.test';

-- Feed Posts
INSERT INTO feed_posts (author_id, content, image_url, visibility, created_at)
SELECT u.id, 'Just landed a new role at TechStart! Excited to start this new chapter. #newjob #frontend', NULL, 'public', now() - INTERVAL '5 days'
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT u.id, 'We are hiring! Check out our new openings for Senior Engineers. DM me for referrals. #hiring #techjobs', 'https://via.placeholder.com/600x400?text=We+Are+Hiring', 'public', now() - INTERVAL '1 day'
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
SELECT u.id, 'Finally finished my AI Chatbot project. Check out the repo! Link in comments.', NULL, 'public', now() - INTERVAL '3 days'
FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test'
UNION ALL
SELECT u.id, 'Thoughts on the new React compiler? Game changer or overhyped?', NULL, 'connections', now() - INTERVAL '10 hours'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Post Likes
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT p.id, u.id, now()
FROM feed_posts p, auth.users u 
WHERE p.content LIKE '%landed a new role%' AND u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT p.id, u.id, now()
FROM feed_posts p, auth.users u 
WHERE p.content LIKE '%landed a new role%' AND u.email = 'carol.student@talentsphere.test'
UNION ALL
SELECT p.id, u.id, now()
FROM feed_posts p, auth.users u 
WHERE p.content LIKE '%hiring%' AND u.email = 'alice.dev@talentsphere.test';

-- Post Comments
INSERT INTO post_comments (post_id, author_id, content, created_at)
SELECT p.id, u.id, 'Congratulations Alice! Well deserved!', now()
FROM feed_posts p, auth.users u WHERE p.content LIKE '%landed a new role%' AND u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT p.id, u.id, 'Thanks for sharing! I''ll check it out.', now()
FROM feed_posts p, auth.users u WHERE p.content LIKE '%AI Chatbot%' AND u.email = 'alice.dev@talentsphere.test';

-- ----------------------------------------------------------------
-- 7. MESSAGING
-- ----------------------------------------------------------------

-- Conversations
-- Alice and David talking
INSERT INTO conversations (created_at, updated_at) VALUES (now() - INTERVAL '25 days', now() - INTERVAL '1 hour');
-- Get ID of this conversation (assuming single row inserted or use RETURNING in real script)
-- We'll use a CTE approach for the next insert to link properly.

WITH conv AS (
  INSERT INTO conversations (created_at, updated_at) VALUES (now() - INTERVAL '25 days', now() - INTERVAL '1 hour') RETURNING id
)
INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, joined_at)
SELECT conv.id, u.id, now(), now()
FROM conv, auth.users u WHERE u.email IN ('alice.dev@talentsphere.test', 'david.power@talentsphere.test');

-- Messages in that conversation
WITH conv_id AS (SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1) -- Hacky way to get last created
INSERT INTO messages (conversation_id, sender_id, content, message_type, is_read, sent_at)
SELECT c.id, u.id, 'Hey David, thanks for the congrats!', 'text', true, now() - INTERVAL '24 days'
FROM conv_id c, auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT c.id, u.id, 'No problem! How is the new job?', 'text', true, now() - INTERVAL '23 days'
FROM conv_id c, auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT c.id, u.id, 'It''s great! Lots to learn.', 'text', false, now() - INTERVAL '1 hour' -- Unread
FROM conv_id c, auth.users u WHERE u.email = 'alice.dev@talentsphere.test';

-- Another conversation: Bob recruiting Alice
WITH conv2 AS (
  INSERT INTO conversations (created_at, updated_at) VALUES (now() - INTERVAL '2 days', now() - INTERVAL '2 days') RETURNING id
)
INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, joined_at)
SELECT conv2.id, u.id, now(), now()
FROM conv2, auth.users u WHERE u.email IN ('bob.recruiter@talentsphere.test', 'alice.dev@talentsphere.test');

-- ----------------------------------------------------------------
-- 8. LMS (Courses, Lessons, Enrollments)
-- ----------------------------------------------------------------

-- Courses
INSERT INTO courses (instructor_id, title, slug, description, thumbnail_url, level, category, price, is_published, created_at)
SELECT u.id, 'Advanced React Patterns', 'adv-react-patterns', 'Master render props, hooks, and compound components.', 'https://via.placeholder.com/400x200?text=React', 'advanced', 'Development', 49.99, true, now() - INTERVAL '60 days'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT u.id, 'Python for Beginners', 'python-basics', 'Learn Python from scratch.', 'https://via.placeholder.com/400x200?text=Python', 'beginner', 'Development', 29.99, true, now() - INTERVAL '30 days'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT u.id, 'System Design Interview Prep', 'sys-design-prep', 'Ace your system design interviews.', 'https://via.placeholder.com/400x200?text=SysDesign', 'expert', 'Career', 99.99, true, now() - INTERVAL '10 days'
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Lessons
WITH course_id AS (SELECT id FROM courses WHERE slug = 'adv-react-patterns')
INSERT INTO lessons (course_id, title, content, video_url, duration_seconds, order_index, is_free_preview)
SELECT c.id, 'Introduction to Render Props', '# Render Props...', 'https://youtube.com/watch?v=...', 600, 1, true FROM course_id c
UNION ALL
SELECT c.id, 'Custom Hooks Deep Dive', '# Custom Hooks...', 'https://youtube.com/watch?v=...', 900, 2, false FROM course_id c
UNION ALL
SELECT c.id, 'Compound Components', '# Compound...', 'https://youtube.com/watch?v=...', 800, 3, false FROM course_id c;

-- Enrollments
-- Alice enrolled in Adv React
INSERT INTO enrollments (course_id, student_id, enrolled_at, progress_percentage, completed_at)
SELECT c.id, u.id, now() - INTERVAL '10 days', 45.0, NULL
FROM courses c, auth.users u WHERE c.slug = 'adv-react-patterns' AND u.email = 'alice.dev@talentsphere.test'
UNION ALL
-- Carol enrolled in Python
SELECT c.id, u.id, now() - INTERVAL '5 days', 10.0, NULL
FROM courses c, auth.users u WHERE c.slug = 'python-basics' AND u.email = 'carol.student@talentsphere.test'
UNION ALL
-- David completed his own course (testing)
SELECT c.id, u.id, now() - INTERVAL '50 days', 100.0, now() - INTERVAL '10 days'
FROM courses c, auth.users u WHERE c.slug = 'adv-react-patterns' AND u.email = 'david.power@talentsphere.test';

-- Lesson Progress
WITH enrollment_rec AS (SELECT id FROM enrollments WHERE progress_percentage = 45.0 LIMIT 1) -- Alice's enrollment
INSERT INTO lesson_progress (enrollment_id, lesson_id, viewed_at, completed, watched_seconds)
SELECT e.id, l.id, now() - INTERVAL '8 days', true, 600
FROM enrollment_rec e, lessons l WHERE l.order_index = 1
UNION ALL
SELECT e.id, l.id, now() - INTERVAL '7 days', false, 300
FROM enrollment_rec e, lessons l WHERE l.order_index = 2;

-- ----------------------------------------------------------------
-- 9. CHALLENGES
-- ----------------------------------------------------------------

INSERT INTO challenges (creator_id, title, description, difficulty, category, starter_code, test_cases, points, deadline, is_published)
SELECT u.id, 'Two Sum Optimization', 'Solve Two Sum in O(n) time.', 'easy', 'Algorithms', 'function twoSum(nums, target) {}', '[{"input": [[2,7,11,15], 9], "expected": [0,1]}]', 100, now() + INTERVAL '5 days', true
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL
SELECT u.id, 'Binary Tree Inversion', 'Invert a binary tree recursively.', 'medium', 'Data Structures', 'class Solution { ... }', '[]', 250, now() + INTERVAL '10 days', true
FROM auth.users u WHERE u.email = 'david.power@talentsphere.test';

-- Submissions
WITH challenge_id AS (SELECT id FROM challenges WHERE title = 'Two Sum Optimization')
INSERT INTO challenge_submissions (challenge_id, submitter_id, code, language, status, execution_time_ms, memory_usage_kb, submitted_at)
SELECT c.id, u.id, 'function twoSum(nums, target) { const map = {}; ... }', 'javascript', 'accepted', 45, 1024, now() - INTERVAL '2 days'
FROM challenge_id c, auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
SELECT c.id, u.id, 'for(let i=0; i<nums.length; i++) { for... }', 'javascript', 'wrong_answer', 120, 2048, now() - INTERVAL '3 days'
FROM challenge_id c, auth.users u WHERE u.email = 'carol.student@talentsphere.test';

-- ----------------------------------------------------------------
-- 10. GAMIFICATION
-- ----------------------------------------------------------------

-- Badges (Seed data)
INSERT INTO badges (name, description, icon_url, criteria_type, criteria_value) VALUES
  ('Early Adopter', 'Joined in the first month', '🚀', 'join_date', '2024-01-31'),
  ('Profile Pro', 'Completed 100% profile', '✅', 'profile_completeness', 100),
  ('First Application', 'Applied to your first job', '📝', 'applications_count', 1),
  ('Networker', 'Reached 50 connections', '🤝', 'connections_count', 50),
  ('Learner', 'Completed 5 courses', '🎓', 'courses_completed', 5),
  ('Top Contributor', 'Posted 10 times', '💬', 'posts_count', 10);

-- User Badges
-- Alice gets Early Adopter and First Application
INSERT INTO user_badges (user_id, badge_id, awarded_at)
SELECT u.id, b.id, now()
FROM auth.users u, badges b 
WHERE u.email = 'alice.dev@talentsphere.test' AND b.name IN ('Early Adopter', 'First Application');

-- David gets Profile Pro and Networker
INSERT INTO user_badges (user_id, badge_id, awarded_at)
SELECT u.id, b.id, now() - INTERVAL '10 days'
FROM auth.users u, badges b 
WHERE u.email = 'david.power@talentsphere.test' AND b.name IN ('Profile Pro', 'Networker');

-- XP Transactions
INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id, created_at)
SELECT u.id, 50, 'Profile Completion', 'profile', u.id, now() - INTERVAL '20 days' FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 100, 'First Application', 'application', (SELECT id FROM job_applications LIMIT 1), now() - INTERVAL '8 days' FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL SELECT u.id, 200, 'Course Completed', 'enrollment', (SELECT id FROM enrollments WHERE completed_at IS NOT NULL LIMIT 1), now() - INTERVAL '10 days' FROM auth.users u WHERE u.email = 'david.power@talentsphere.test'
UNION ALL SELECT u.id, 25, 'Daily Login', 'login', NULL, now() FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test';

-- Leaderboard (Auto-updated by trigger usually, but let's seed if trigger missing)
-- Assuming a view or manual insert. If table is manual:
INSERT INTO leaderboard (user_id, total_xp, rank)
SELECT u.id, COALESCE(SUM(xt.amount), 0), ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(xt.amount), 0) DESC)
FROM auth.users u
LEFT JOIN xp_transactions xt ON u.id = xt.user_id
GROUP BY u.id
ON CONFLICT (user_id) DO UPDATE SET total_xp = EXCLUDED.total_xp, rank = EXCLUDED.rank;

-- ----------------------------------------------------------------
-- 11. PAYMENTS & SUBSCRIPTIONS
-- ----------------------------------------------------------------

-- Plans
INSERT INTO subscription_plans (name, price, currency, interval, features, is_active) VALUES
  ('Free', 0, 'USD', 'month', 'Basic access', true),
  ('Pro', 19.99, 'USD', 'month', 'Unlimited applications, Analytics', true),
  ('Premium', 49.99, 'USD', 'month', 'Priority support, Featured profile', true);

-- Subscriptions
-- David has Pro
INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
SELECT u.id, p.id, 'active', now() - INTERVAL '25 days', now() + INTERVAL '5 days', false
FROM auth.users u, subscription_plans p 
WHERE u.email = 'david.power@talentsphere.test' AND p.name = 'Pro';

-- Payments
INSERT INTO payments (user_id, subscription_id, amount, currency, status, payment_method, transaction_id, created_at)
SELECT s.user_id, s.id, 19.99, 'USD', 'succeeded', 'card', 'pi_123456', s.current_period_start
FROM subscriptions s JOIN auth.users u ON s.user_id = u.id WHERE u.email = 'david.power@talentsphere.test';

-- ----------------------------------------------------------------
-- 12. NOTIFICATIONS
-- ----------------------------------------------------------------

INSERT INTO notifications (recipient_id, type, title, message, reference_table, reference_id, is_read, created_at)
-- Alice: New connection request
SELECT u.id, 'connection_request', 'New Connection Request', 'Carol Student wants to connect.', 'connections', (SELECT id FROM connections WHERE status='pending' LIMIT 1), false, now() - INTERVAL '2 days'
FROM auth.users u WHERE u.email = 'alice.dev@talentsphere.test'
UNION ALL
-- Bob: New application
SELECT u.id, 'new_application', 'New Application Received', 'Alice Dev applied for Senior Frontend Engineer.', 'job_applications', (SELECT id FROM job_applications WHERE status='interview' LIMIT 1), true, now() - INTERVAL '8 days'
FROM auth.users u WHERE u.email = 'bob.recruiter@talentsphere.test'
UNION ALL
-- Carol: Course reminder
SELECT u.id, 'system', 'Keep Learning!', 'You haven''t studied in 2 days.', 'enrollments', (SELECT id FROM enrollments WHERE student_id = (SELECT id FROM auth.users WHERE email='carol.student@talentsphere.test') LIMIT 1), false, now() - INTERVAL '1 hour'
FROM auth.users u WHERE u.email = 'carol.student@talentsphere.test';

-- ----------------------------------------------------------------
-- FINAL VERIFICATION
-- ----------------------------------------------------------------
DO $$
DECLARE
  user_count int;
  job_count int;
  post_count int;
BEGIN
  SELECT count(*) INTO user_count FROM profiles;
  SELECT count(*) INTO job_count FROM jobs;
  SELECT count(*) INTO post_count FROM feed_posts;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEEDING COMPLETE';
  RAISE NOTICE 'Users: %, Jobs: %, Posts: %', user_count, job_count, post_count;
  RAISE NOTICE '========================================';
END $$;
