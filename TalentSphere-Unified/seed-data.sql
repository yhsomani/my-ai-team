-- ================================================================
-- TalentSphere Comprehensive Seed Data
-- Version: 8.0.0 (Unified Supabase Schema)
-- Purpose: Full E2E Testing Coverage against the canonical schema
-- (infra/db/migrations/0001_initial_baseline.sql == supabase-schema.sql)
-- ================================================================

-- Safety contract:
-- This file truncates application data and must only be run against local,
-- development, test, or CI databases. Set these session variables before
-- executing the file:
--
--   SET app.seed_environment = 'development';
--   SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';
--
-- Do not commit those SET statements enabled inside this file; callers must
-- make the environment-specific decision at execution time.
DO $$
DECLARE
  seed_environment text := lower(coalesce(nullif(current_setting('app.seed_environment', true), ''), ''));
  destructive_confirmation text := coalesce(nullif(current_setting('app.allow_destructive_seed_data', true), ''), '');
BEGIN
  IF seed_environment NOT IN ('local', 'development', 'dev', 'test', 'testing', 'ci') THEN
    RAISE EXCEPTION 'Refusing destructive seed-data.sql outside local/dev/test/ci. Set app.seed_environment before running.';
  END IF;

  IF destructive_confirmation <> 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA' THEN
    RAISE EXCEPTION 'Refusing destructive seed-data.sql without app.allow_destructive_seed_data confirmation.';
  END IF;
END $$;

-- Note: This script assumes a privileged local/dev/test seed role. It bypasses
-- normal RLS during setup and restores no production state.

-- ----------------------------------------------------------------
-- 1. CLEANUP (Idempotency)
-- ----------------------------------------------------------------
-- Truncate all non-auth application tables in reverse dependency order.
-- WARNING: This deletes existing data. Only run in dev/test environments.

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

-- ----------------------------------------------------------------
-- 2. AUTH USERS (Deterministic fixed IDs)
-- ----------------------------------------------------------------
-- Attempt to create the 5 test users directly in auth.users. This requires a
-- privileged role (postgres / service_role). If it fails, create the users via
-- the Supabase Dashboard (Authentication -> Users) with emails below and
-- password `password123`, then re-run this script.

DO $$
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
  (    '00000000-0000-4000-8000-000000000000'::uuid, '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'alice.dev@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Dev","sub":"10000000-0000-4000-8000-000000000001","email":"alice.dev@talentsphere.test"}', now(), now(), '', '', '', ''),
  (    '00000000-0000-4000-8000-000000000000'::uuid, '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'bob.recruiter@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Recruiter","sub":"10000000-0000-4000-8000-000000000002","email":"bob.recruiter@talentsphere.test"}', now(), now(), '', '', '', ''),
  (    '00000000-0000-4000-8000-000000000000'::uuid, '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'carol.student@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carol Student","sub":"10000000-0000-4000-8000-000000000003","email":"carol.student@talentsphere.test"}', now(), now(), '', '', '', ''),
  (    '00000000-0000-4000-8000-000000000000'::uuid, '10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'david.power@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Power","sub":"10000000-0000-4000-8000-000000000004","email":"david.power@talentsphere.test"}', now(), now(), '', '', '', ''),
  (    '00000000-0000-4000-8000-000000000000'::uuid, '10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'eve.admin@talentsphere.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Admin","sub":"10000000-0000-4000-8000-000000000005","email":"eve.admin@talentsphere.test"}', now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN insufficient_privilege OR undefined_function OR foreign_key_violation THEN
  RAISE NOTICE 'Could not insert into auth.users directly (permission denied). Create the 5 test users via the Dashboard, then re-run seed-data.sql.';
END $$;

-- ----------------------------------------------------------------
-- 3. SYSTEM CONFIGURATION & SETTINGS
-- ----------------------------------------------------------------
-- value is JSONB in the unified schema.

INSERT INTO system_settings (key, value, description) VALUES
  ('platform_config', '{"maintenance_mode": false, "registration_enabled": true, "max_file_size_mb": 10}', 'Platform-wide configuration'),
  ('email_templates', '{"welcome": "Welcome to TalentSphere!", "job_applied": "Your application has been submitted."}', 'Email notification templates'),
  ('feature_flags', '{"version":1,"defaults":{"enable_auth":true,"enable_user_management":true,"enable_profile_management":true,"enable_job_listings":true,"enable_job_search":true,"enable_job_recommendations":false,"enable_job_applications":true,"enable_application_tracking":false,"enable_company_profiles":true,"enable_company_verification":false,"enable_company_search":true,"enable_courses":true,"enable_course_enrollment":true,"enable_course_progress":true,"enable_learning_paths":false,"enable_course_certificates":false,"enable_coding_challenges":false,"enable_leaderboards":false,"enable_achievements":false,"enable_xp_system":false,"enable_ai_resume_analysis":false,"enable_ai_job_matching":false,"enable_ai_interview_prep":false,"enable_notifications":true,"enable_email_notifications":false,"enable_push_notifications":false,"enable_messaging":true,"enable_chat":false,"enable_connections":true,"enable_posts":false,"enable_global_search":true,"enable_elasticsearch":true,"enable_payments":false,"enable_subscriptions":false,"enable_premium_features":false,"enable_video_content":false,"enable_video_interviews":false,"enable_analytics":false,"enable_user_analytics":false,"enable_employer_analytics":false},"overrides":{}}', 'Feature-flag governance store: canonical Feature.java defaults mirrored in "defaults", runtime overrides persisted in "overrides", audited via admin UI.'),
  ('feature_flag_descriptions', '{"enable_auth":"Authentication and authorization","enable_user_management":"User account management","enable_profile_management":"User profile CRUD operations","enable_job_listings":"Job posting and listing","enable_job_search":"Job search functionality","enable_job_recommendations":"AI-powered job recommendations","enable_job_applications":"Job application system","enable_application_tracking":"Application pipeline tracking","enable_company_profiles":"Company profile pages","enable_company_verification":"Company verification system","enable_company_search":"Search companies","enable_courses":"Course management","enable_course_enrollment":"Course enrollment","enable_course_progress":"Progress tracking","enable_learning_paths":"Learning path recommendations","enable_course_certificates":"Course completion certificates","enable_coding_challenges":"Coding challenge system","enable_leaderboards":"Gamification leaderboards","enable_achievements":"User achievements and badges","enable_xp_system":"Experience points system","enable_ai_resume_analysis":"AI resume analysis","enable_ai_job_matching":"AI job matching","enable_ai_interview_prep":"AI interview preparation","enable_notifications":"In-app notifications","enable_email_notifications":"Email notifications","enable_push_notifications":"Push notifications","enable_messaging":"Direct messaging","enable_chat":"Real-time chat","enable_connections":"Professional networking","enable_posts":"Social posts and feed","enable_global_search":"Global search across platform","enable_elasticsearch":"Elasticsearch-powered search","enable_payments":"Payment processing","enable_subscriptions":"Premium subscriptions","enable_premium_features":"Premium feature access","enable_video_content":"Video course content","enable_video_interviews":"Video interview system","enable_analytics":"Platform analytics","enable_user_analytics":"User activity analytics","enable_employer_analytics":"Employer dashboard analytics"}', 'Human-readable descriptions for each canonical feature flag (mirrors Feature.java).')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. USERS & PROFILES (The Core Personas)
-- ----------------------------------------------------------------

INSERT INTO profiles (id, email, full_name, avatar_url, role, timezone, language, is_active, created_at, updated_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'alice.dev@talentsphere.test', 'Alice Dev', 'https://i.pravatar.cc/150?u=alice', 'USER', 'America/Los_Angeles', 'en', true, now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'bob.recruiter@talentsphere.test', 'Bob Recruiter', 'https://i.pravatar.cc/150?u=bob', 'RECRUITER', 'America/New_York', 'en', true, now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'carol.student@talentsphere.test', 'Carol Student', 'https://i.pravatar.cc/150?u=carol', 'USER', 'America/Chicago', 'en', true, now(), now()),
  ('10000000-0000-4000-8000-000000000004', 'david.power@talentsphere.test', 'David Power', 'https://i.pravatar.cc/150?u=david', 'USER', 'UTC', 'en', true, now(), now()),
  ('10000000-0000-4000-8000-000000000005', 'eve.admin@talentsphere.test', 'Eve Admin', 'https://i.pravatar.cc/150?u=eve', 'ADMIN', 'UTC', 'en', true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_settings (user_id, email_notifications, push_notifications, sms_notifications, job_alerts, message_notifications, newsletter, digest_frequency, updated_at) VALUES
  ('10000000-0000-4000-8000-000000000001', true, true, false, true, true, false, 'immediate', now()),
  ('10000000-0000-4000-8000-000000000002', true, true, false, true, true, false, 'immediate', now()),
  ('10000000-0000-4000-8000-000000000003', true, true, false, true, true, false, 'immediate', now()),
  ('10000000-0000-4000-8000-000000000004', true, true, false, true, true, false, 'weekly', now()),
  ('10000000-0000-4000-8000-000000000005', true, true, false, true, true, false, 'immediate', now())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_profiles (id, user_id, headline, summary, current_role, bio, location, website, github_url, created_at, updated_at) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Senior Frontend Engineer', 'Passionate frontend developer with 3 years of experience in React and TypeScript.', 'Senior Frontend Engineer', 'Loves building accessible, performant web applications.', 'San Francisco, CA', 'https://alicedev.com', 'https://github.com/alice', now(), now()),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Senior Technical Recruiter', 'Technical recruiter at TechCorp. Looking for top talent!', 'Senior Technical Recruiter', 'Focused on technical hiring for engineering teams.', 'New York, NY', NULL, NULL, now(), now()),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'CS Student', 'Computer Science student eager to learn and grow.', 'CS Student', 'Learning Python, Java, and AI fundamentals.', 'Austin, TX', NULL, 'https://github.com/carol', now(), now()),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Staff Software Engineer', 'Full Stack Architect | Open Source Contributor | Speaker', 'Staff Software Engineer', 'Architecting microservices and mentoring junior devs.', 'Remote', 'https://davidpower.io', 'https://github.com/david', now(), now()),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Platform Administrator', 'System Administrator for TalentSphere.', 'Platform Administrator', 'Managing platform configuration and moderation.', 'Unknown', NULL, NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 5. SKILLS, EXPERIENCE, EDUCATION (Profile Completeness)
-- ----------------------------------------------------------------

INSERT INTO skills (profile_id, name, proficiency, years_of_experience) VALUES
  ('20000000-0000-4000-8000-000000000001', 'React', 'EXPERT', 4),
  ('20000000-0000-4000-8000-000000000001', 'TypeScript', 'EXPERT', 3),
  ('20000000-0000-4000-8000-000000000001', 'Node.js', 'INTERMEDIATE', 2),
  ('20000000-0000-4000-8000-000000000001', 'Tailwind CSS', 'EXPERT', 3),
  ('20000000-0000-4000-8000-000000000002', 'Recruiting', 'EXPERT', 5),
  ('20000000-0000-4000-8000-000000000002', 'Technical Interviewing', 'ADVANCED', 4),
  ('20000000-0000-4000-8000-000000000003', 'Python', 'BEGINNER', 1),
  ('20000000-0000-4000-8000-000000000003', 'Java', 'INTERMEDIATE', 2),
  ('20000000-0000-4000-8000-000000000004', 'System Design', 'EXPERT', 8),
  ('20000000-0000-4000-8000-000000000004', 'AWS', 'EXPERT', 6),
  ('20000000-0000-4000-8000-000000000004', 'Kubernetes', 'ADVANCED', 5);

INSERT INTO experiences (profile_id, company, title, location, start_date, end_date, current, description) VALUES
  ('20000000-0000-4000-8000-000000000001', 'TechStart Inc.', 'Frontend Developer', 'San Francisco, CA', '2021-06-01', NULL, true, 'Built responsive UIs using React. Improved load times by 40%.'),
  ('20000000-0000-4000-8000-000000000001', 'WebSolutions', 'Junior Developer', 'Remote', '2020-01-01', '2021-05-31', false, 'Developed landing pages and maintained legacy codebases.'),
  ('20000000-0000-4000-8000-000000000002', 'TechCorp', 'Senior Technical Recruiter', 'New York, NY', '2019-03-01', NULL, true, 'Leading technical hiring for engineering teams.'),
  ('20000000-0000-4000-8000-000000000003', 'University Lab', 'Research Assistant', 'Austin, TX', '2023-01-01', '2023-12-01', false, 'Assisted in AI research projects.'),
  ('20000000-0000-4000-8000-000000000004', 'MegaCorp', 'Staff Engineer', 'Remote', '2018-01-01', NULL, true, 'Architecting microservices and mentoring junior devs.'),
  ('20000000-0000-4000-8000-000000000004', 'StartupX', 'CTO', 'San Francisco, CA', '2015-01-01', '2017-12-31', false, 'Led engineering team from 0 to 20.');

INSERT INTO educations (profile_id, institution, degree, field_of_study, start_date, end_date, gpa) VALUES
  ('20000000-0000-4000-8000-000000000001', 'University of California, Berkeley', 'Bachelor of Science', 'Computer Science', '2017-08-01', '2021-05-31', 3.80),
  ('20000000-0000-4000-8000-000000000002', 'State University', 'Bachelor of Arts', 'Psychology', '2015-08-01', '2019-05-31', 3.40),
  ('20000000-0000-4000-8000-000000000003', 'Texas A&M', 'Bachelor of Science', 'Computer Science', '2022-08-01', '2026-05-31', NULL),
  ('20000000-0000-4000-8000-000000000004', 'MIT', 'Master of Science', 'Computer Science', '2013-08-01', '2015-05-31', 4.00);

INSERT INTO projects (profile_id, name, description, url, github_url, technologies) VALUES
  ('20000000-0000-4000-8000-000000000001', 'E-Commerce Dashboard', 'A full-featured admin dashboard built with React and Supabase.', 'https://demo.alicedev.com', 'https://github.com/alice/ecom-dashboard', ARRAY['React', 'Supabase', 'TypeScript']),
  ('20000000-0000-4000-8000-000000000003', 'AI Chatbot', 'Python-based chatbot using LangChain.', NULL, 'https://github.com/carol/ai-bot', ARRAY['Python', 'LangChain']),
  ('20000000-0000-4000-8000-000000000004', 'Open Source Logger', 'High performance logging library for Node.js.', 'https://npmjs.com/package/david-logger', 'https://github.com/david/logger', ARRAY['Node.js']);

INSERT INTO certifications (profile_id, name, issuing_organization, issue_date, expiry_date, credential_url) VALUES
  ('20000000-0000-4000-8000-000000000004', 'AWS Certified Solutions Architect', 'Amazon Web Services', '2022-06-01', '2025-06-01', 'https://aws.amazon.com/verification'),
  ('20000000-0000-4000-8000-000000000001', 'React Advanced Certification', 'Meta', '2023-01-01', NULL, 'https://meta.com/cert');

INSERT INTO languages (profile_id, language, proficiency) VALUES
  ('20000000-0000-4000-8000-000000000001', 'English', 'EXPERT'),
  ('20000000-0000-4000-8000-000000000001', 'Spanish', 'INTERMEDIATE'),
  ('20000000-0000-4000-8000-000000000002', 'English', 'EXPERT'),
  ('20000000-0000-4000-8000-000000000003', 'English', 'EXPERT'),
  ('20000000-0000-4000-8000-000000000004', 'English', 'EXPERT'),
  ('20000000-0000-4000-8000-000000000004', 'German', 'BEGINNER');

-- ----------------------------------------------------------------
-- 6. COMPANIES & JOBS
-- ----------------------------------------------------------------

INSERT INTO companies (id, owner_user_id, name, description, website, location, logo_url, industry, employee_count, verified, created_at, updated_at) VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TechCorp', 'Leading provider of enterprise solutions.', 'https://techcorp.com', 'New York, NY', 'https://logo.clearbit.com/techcorp.com', 'Technology', 2500, true, now(), now()),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'StartupX', 'Disrupting the payment industry.', 'https://startupx.io', 'San Francisco, CA', NULL, 'Fintech', 35, false, now(), now()),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'GreenEnergy Co', 'Sustainable energy solutions for everyone.', 'https://greenenergy.co', 'Austin, TX', 'https://logo.clearbit.com/greenenergy.co', 'Energy', 750, false, now(), now());

INSERT INTO jobs (id, company_id, posted_by, title, description, location, job_type, salary_min, salary_max, requirements, posted_at, expires_at, status, created_at, updated_at) VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Senior Frontend Engineer', 'Build amazing UIs.', 'Remote', 'FULL_TIME', 150000, 200000, ARRAY['React', 'TypeScript', '5+ years'], now() - INTERVAL '10 days', now() + INTERVAL '20 days', 'PUBLISHED', now(), now()),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Backend Developer', 'Scale our APIs.', 'New York, NY', 'FULL_TIME', 120000, 160000, ARRAY['Go', 'Postgres', 'Docker'], now() - INTERVAL '5 days', now() + INTERVAL '25 days', 'PUBLISHED', now(), now()),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Product Designer', 'Design intuitive interfaces.', 'Remote', 'CONTRACT', 80000, 120000, ARRAY['Figma', 'UX Research'], now() - INTERVAL '2 days', now() + INTERVAL '15 days', 'PUBLISHED', now(), now()),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Founding Engineer', 'Build from scratch.', 'San Francisco, CA', 'FULL_TIME', 140000, 180000, ARRAY['Full stack', 'Startup mindset'], now() - INTERVAL '1 day', now() + INTERVAL '30 days', 'PUBLISHED', now(), now()),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Data Scientist', 'Analyze energy patterns.', 'Austin, TX', 'FULL_TIME', 110000, 150000, ARRAY['Python', 'ML', 'SQL'], now() - INTERVAL '15 days', now() + INTERVAL '10 days', 'PUBLISHED', now(), now()),
  ('31000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Intern (Summer 2023)', 'Learn and build.', 'Remote', 'INTERNSHIP', 20, 30, ARRAY['Student status'], now() - INTERVAL '100 days', now() - INTERVAL '10 days', 'CLOSED', now(), now());

INSERT INTO job_applications (id, job_id, user_id, status, resume_url, cover_letter, applied_at, reviewed_at, notes, created_at, updated_at) VALUES
  ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'INTERVIEW', 'https://storage.supabase.co/resumes/alice_resume.pdf', 'I am very interested in this role...', now() - INTERVAL '8 days', now() - INTERVAL '4 days', 'Moved to interview after initial screen.', now(), now()),
  ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'PENDING', NULL, 'Excited about sustainable energy!', now() - INTERVAL '12 days', NULL, NULL, now(), now()),
  ('32000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'REJECTED', NULL, 'Let''s build the future.', now() - INTERVAL '20 days', now() - INTERVAL '15 days', 'Overqualified for this specific role.', now(), now());

-- ----------------------------------------------------------------
-- 7. NETWORKING (Connections, Conversations, Messages)
-- ----------------------------------------------------------------

INSERT INTO connections (id, requester_id, receiver_id, status, message, created_at, updated_at) VALUES
  ('33000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'ACCEPTED', 'Great to connect!', now() - INTERVAL '30 days', now() - INTERVAL '30 days'),
  ('33000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'PENDING', NULL, now() - INTERVAL '2 days', now() - INTERVAL '2 days'),
  ('33000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'ACCEPTED', NULL, now() - INTERVAL '60 days', now() - INTERVAL '60 days');

INSERT INTO conversations (id, name, is_group, created_by, created_at, updated_at) VALUES
  ('34000000-0000-4000-8000-000000000001', NULL, false, '10000000-0000-4000-8000-000000000004', now() - INTERVAL '25 days', now() - INTERVAL '1 hour'),
  ('34000000-0000-4000-8000-000000000002', NULL, false, '10000000-0000-4000-8000-000000000002', now() - INTERVAL '2 days', now() - INTERVAL '2 days');

INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at) VALUES
  ('34000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now(), now()),
  ('34000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', now(), now()),
  ('34000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', now(), now()),
  ('34000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', now(), now());

INSERT INTO messages (conversation_id, sender_id, content, message_type, status, sent_at, read_at, created_at) VALUES
  ('34000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Hey David, thanks for the congrats!', 'TEXT', 'READ', now() - INTERVAL '24 days', now() - INTERVAL '24 days', now() - INTERVAL '24 days'),
  ('34000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'No problem! How is the new job?', 'TEXT', 'READ', now() - INTERVAL '23 days', now() - INTERVAL '23 days', now() - INTERVAL '23 days'),
  ('34000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'It''s great! Lots to learn.', 'TEXT', 'SENT', now() - INTERVAL '1 hour', NULL, now() - INTERVAL '1 hour'),
  ('34000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Hi Alice! We have a new Senior Frontend role, would you be interested?', 'TEXT', 'SENT', now() - INTERVAL '2 days', NULL, now() - INTERVAL '2 days');

-- ----------------------------------------------------------------
-- 8. LMS (Courses, Lessons, Enrollments, Progress)
-- ----------------------------------------------------------------

INSERT INTO courses (id, instructor_id, title, slug, description, thumbnail_url, level, category, price, xp_reward, is_published, created_at, updated_at) VALUES
  ('40100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'Advanced React Patterns', 'adv-react-patterns', 'Master render props, hooks, and compound components.', 'https://via.placeholder.com/400x200?text=React', 'advanced', 'Development', 49.99, 250, true, now() - INTERVAL '60 days', now()),
  ('40100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'Python for Beginners', 'python-basics', 'Learn Python from scratch.', 'https://via.placeholder.com/400x200?text=Python', 'beginner', 'Development', 29.99, 100, true, now() - INTERVAL '30 days', now()),
  ('40100000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'System Design Interview Prep', 'sys-design-prep', 'Ace your system design interviews.', 'https://via.placeholder.com/400x200?text=SysDesign', 'expert', 'Career', 99.99, 500, true, now() - INTERVAL '10 days', now());

INSERT INTO lessons (id, course_id, title, content, video_url, order_index, duration_seconds, is_free_preview, created_at) VALUES
  ('40200000-0000-4000-8000-000000000001', '40100000-0000-4000-8000-000000000001', 'Introduction to Render Props', '# Render Props...', 'https://youtube.com/watch?v=rp1', 1, 600, true, now()),
  ('40200000-0000-4000-8000-000000000002', '40100000-0000-4000-8000-000000000001', 'Custom Hooks Deep Dive', '# Custom Hooks...', 'https://youtube.com/watch?v=rp2', 2, 900, false, now()),
  ('40200000-0000-4000-8000-000000000003', '40100000-0000-4000-8000-000000000001', 'Compound Components', '# Compound...', 'https://youtube.com/watch?v=rp3', 3, 800, false, now()),
  ('40200000-0000-4000-8000-000000000004', '40100000-0000-4000-8000-000000000002', 'Python Basics: Variables', '# Variables...', NULL, 1, 450, true, now()),
  ('40200000-0000-4000-8000-000000000005', '40100000-0000-4000-8000-000000000002', 'Control Flow', '# Control Flow...', NULL, 2, 600, false, now()),
  ('40200000-0000-4000-8000-000000000006', '40100000-0000-4000-8000-000000000002', 'Functions & Modules', '# Functions...', NULL, 3, 720, false, now()),
  ('40200000-0000-4000-8000-000000000007', '40100000-0000-4000-8000-000000000003', 'Load Balancing', '# Load Balancing...', NULL, 1, 900, true, now()),
  ('40200000-0000-4000-8000-000000000008', '40100000-0000-4000-8000-000000000003', 'Caching Strategies', '# Caching...', NULL, 2, 720, false, now()),
  ('40200000-0000-4000-8000-000000000009', '40100000-0000-4000-8000-000000000003', 'Database Sharding', '# Sharding...', NULL, 3, 960, false, now());

INSERT INTO enrollments (id, course_id, user_id, student_id, status, progress_percentage, enrolled_at, started_at, completed_at) VALUES
  ('40300000-0000-4000-8000-000000000001', '40100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'IN_PROGRESS', 45.0, now() - INTERVAL '10 days', now() - INTERVAL '9 days', NULL),
  ('40300000-0000-4000-8000-000000000002', '40100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'IN_PROGRESS', 10.0, now() - INTERVAL '5 days', now() - INTERVAL '4 days', NULL),
  ('40300000-0000-4000-8000-000000000003', '40100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'COMPLETED', 100.0, now() - INTERVAL '50 days', now() - INTERVAL '49 days', now() - INTERVAL '10 days');

INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at, viewed_at, watched_seconds) VALUES
  ('40300000-0000-4000-8000-000000000001', '40200000-0000-4000-8000-000000000001', true, now() - INTERVAL '8 days', now() - INTERVAL '8 days', 600),
  ('40300000-0000-4000-8000-000000000001', '40200000-0000-4000-8000-000000000002', false, NULL, now() - INTERVAL '7 days', 300);

-- ----------------------------------------------------------------
-- 9. CHALLENGES
-- ----------------------------------------------------------------

INSERT INTO challenges (id, title, description, category, difficulty, xp_reward, starter_code, test_cases, solution_template, time_limit_minutes, is_published, created_by, created_at, updated_at) VALUES
  ('40500000-0000-4000-8000-000000000001', 'Two Sum Optimization', 'Solve Two Sum in O(n) time.', 'BACKEND', 'EASY', 100, 'function twoSum(nums, target) {}', '[{"input": [[2,7,11,15], 9], "expected": [0,1]}]', NULL, 30, true, '10000000-0000-4000-8000-000000000004', now(), now()),
  ('40500000-0000-4000-8000-000000000002', 'Binary Tree Inversion', 'Invert a binary tree recursively.', 'FULLSTACK', 'MEDIUM', 250, 'class Solution { ... }', '[]', NULL, 45, true, '10000000-0000-4000-8000-000000000004', now(), now());

INSERT INTO challenge_submissions (id, challenge_id, user_id, code_submitted, language, passed_tests, score, execution_time_ms, memory_used_kb, feedback, submitted_at) VALUES
  ('40600000-0000-4000-8000-000000000001', '40500000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'function twoSum(nums, target) { const map = {}; ... }', 'javascript', true, 100, 45, 1024, 'All tests passed.', now() - INTERVAL '2 days'),
  ('40600000-0000-4000-8000-000000000002', '40500000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'for(let i=0; i<nums.length; i++) { for... }', 'javascript', false, 20, 120, 2048, 'Time limit exceeded on large inputs.', now() - INTERVAL '3 days');

-- ----------------------------------------------------------------
-- 10. GAMIFICATION
-- ----------------------------------------------------------------

INSERT INTO badges (id, name, description, icon_url, xp_value, criteria, created_at) VALUES
  ('40700000-0000-4000-8000-000000000001', 'Early Adopter', 'Joined in the first month', '/badges/early-adopter.png', 50, '{"type": "join_date", "threshold": "2024-01-31"}', now()),
  ('40700000-0000-4000-8000-000000000002', 'Profile Pro', 'Completed 100% profile', '/badges/profile-pro.png', 50, '{"type": "profile_completeness", "threshold": 100}', now()),
  ('40700000-0000-4000-8000-000000000003', 'First Application', 'Applied to your first job', '/badges/first-application.png', 100, '{"type": "applications_count", "threshold": 1}', now()),
  ('40700000-0000-4000-8000-000000000004', 'Networker', 'Reached 50 connections', '/badges/networker.png', 100, '{"type": "connections_count", "threshold": 50}', now()),
  ('40700000-0000-4000-8000-000000000005', 'Learner', 'Completed 5 courses', '/badges/learner.png', 150, '{"type": "courses_completed", "threshold": 5}', now()),
  ('40700000-0000-4000-8000-000000000006', 'Top Contributor', 'Posted 10 times', '/badges/top-contributor.png', 150, '{"type": "posts_count", "threshold": 10}', now());

INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
  ('10000000-0000-4000-8000-000000000001', '40700000-0000-4000-8000-000000000001', now()),
  ('10000000-0000-4000-8000-000000000001', '40700000-0000-4000-8000-000000000003', now()),
  ('10000000-0000-4000-8000-000000000004', '40700000-0000-4000-8000-000000000002', now() - INTERVAL '10 days'),
  ('10000000-0000-4000-8000-000000000004', '40700000-0000-4000-8000-000000000004', now() - INTERVAL '10 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

INSERT INTO xp_transactions (id, user_id, amount, reason, reference_type, reference_id, created_at) VALUES
  ('40900000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 50, 'Profile Completion', 'profile', '20000000-0000-4000-8000-000000000001', now() - INTERVAL '20 days'),
  ('40900000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 100, 'Completed challenge: Two Sum Optimization', 'challenge', '40500000-0000-4000-8000-000000000001', now() - INTERVAL '2 days'),
  ('40900000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 100, 'Completed course: Advanced React Patterns', 'course_completion', '40100000-0000-4000-8000-000000000001', now() - INTERVAL '10 days'),
  ('40900000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 25, 'Daily Login', 'login', NULL, now());

INSERT INTO leaderboard (user_id, total_xp, rank, weekly_xp, monthly_xp, badges_earned, last_updated) VALUES
  ('10000000-0000-4000-8000-000000000001', 150, 1, 0, 150, ARRAY['Early Adopter', 'First Application'], now()),
  ('10000000-0000-4000-8000-000000000004', 100, 2, 0, 100, ARRAY['Profile Pro', 'Networker'], now()),
  ('10000000-0000-4000-8000-000000000003', 25, 3, 25, 25, NULL, now()),
  ('10000000-0000-4000-8000-000000000002', 0, 4, 0, 0, NULL, now()),
  ('10000000-0000-4000-8000-000000000005', 0, 5, 0, 0, NULL, now())
ON CONFLICT (user_id) DO UPDATE SET total_xp = EXCLUDED.total_xp, rank = EXCLUDED.rank;

-- ----------------------------------------------------------------
-- 11. PAYMENTS & SUBSCRIPTIONS
-- ----------------------------------------------------------------

INSERT INTO subscription_plans (id, name, price, currency, interval, features, is_active, created_at, updated_at) VALUES
  ('41100000-0000-4000-8000-000000000001', 'Free', 0, 'USD', 'month', '["Basic access"]'::jsonb, true, now(), now()),
  ('41100000-0000-4000-8000-000000000002', 'Pro', 19.99, 'USD', 'month', '["Unlimited applications", "Analytics"]'::jsonb, true, now(), now()),
  ('41100000-0000-4000-8000-000000000003', 'Premium', 49.99, 'USD', 'month', '["Priority support", "Featured profile"]'::jsonb, true, now(), now());

INSERT INTO subscriptions (id, user_id, plan_id, status, payment_method, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES
  ('41200000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '41100000-0000-4000-8000-000000000002', 'ACTIVE', 'card', now() - INTERVAL '25 days', now() + INTERVAL '5 days', false, now(), now());

INSERT INTO payments (id, user_id, subscription_id, amount, currency, status, payment_method, transaction_id, description, created_at, updated_at) VALUES
  ('41300000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '41200000-0000-4000-8000-000000000001', 19.99, 'USD', 'COMPLETED', 'card', 'pi_123456', 'Pro plan - monthly', now() - INTERVAL '25 days', now());

-- ----------------------------------------------------------------
-- 12. TRUST & SAFETY (Content Reports)
-- ----------------------------------------------------------------

INSERT INTO content_reports (reporter_id, target_type, target_id, target_title, reason, details, status, created_at, updated_at) VALUES
  ('10000000-0000-4000-8000-000000000003', 'user_profile', '10000000-0000-4000-8000-000000000001', 'alice.dev@talentsphere.test', 'misleading', 'Profile claims experience that does not match public work history.', 'pending', now() - INTERVAL '1 day', now() - INTERVAL '1 day'),
  ('10000000-0000-4000-8000-000000000001', 'company', '30000000-0000-4000-8000-000000000002', 'StartupX', 'spam', 'Company profile appears to be duplicate content.', 'under_review', now(), now());

-- ----------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ----------------------------------------------------------------

INSERT INTO notifications (user_id, type, title, message, is_read, action_url, metadata, created_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'CONNECTION', 'New Connection Request', 'Carol Student wants to connect.', false, '/network', '{"requester_id": "10000000-0000-4000-8000-000000000003"}', now() - INTERVAL '2 days'),
  ('10000000-0000-4000-8000-000000000002', 'JOB_APPLICATION', 'New Application Received', 'Alice Dev applied for Senior Frontend Engineer.', true, '/jobs', '{"job_id": "31000000-0000-4000-8000-000000000001"}', now() - INTERVAL '8 days'),
  ('10000000-0000-4000-8000-000000000003', 'SYSTEM', 'Keep Learning!', 'You haven''t studied in 2 days.', false, '/lms', NULL, now() - INTERVAL '1 hour');

-- ----------------------------------------------------------------
-- FINAL VERIFICATION
-- ----------------------------------------------------------------
DO $$
DECLARE
  user_count int;
  job_count int;
  course_count int;
  challenge_count int;
  xp_count int;
BEGIN
  SELECT count(*) INTO user_count FROM profiles;
  SELECT count(*) INTO job_count FROM jobs;
  SELECT count(*) INTO course_count FROM courses;
  SELECT count(*) INTO challenge_count FROM challenges;
  SELECT count(*) INTO xp_count FROM xp_transactions;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEEDING COMPLETE';
  RAISE NOTICE 'Users: %, Jobs: %, Courses: %, Challenges: %, XP transactions: %',
    user_count, job_count, course_count, challenge_count, xp_count;
  RAISE NOTICE '========================================';
END $$;