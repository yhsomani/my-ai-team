-- TalentSphere Supabase Database Schema
-- Complete PostgreSQL schema for Supabase migration
-- Execute this in your Supabase SQL Editor

-- =============================================================================
-- ENABLE UUID EXTENSION
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'RECRUITER');
CREATE TYPE proficiency_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE profile_rank AS ENUM ('NOVICE', 'COMPETENT', 'PROFICIENT', 'EXPERT', 'MASTER');
CREATE TYPE job_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP');
CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE application_status AS ENUM ('PENDING', 'REVIEWED', 'INTERVIEW', 'OFFER', 'REJECTED');
CREATE TYPE connection_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
CREATE TYPE challenge_difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE challenge_category AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'DATABASE', 'DEVOPS', 'MOBILE', 'DATA_SCIENCE');
CREATE TYPE enrollment_status AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED');
CREATE TYPE message_status AS ENUM ('SENT', 'DELIVERED', 'READ');
CREATE TYPE notification_type AS ENUM ('JOB_APPLICATION', 'JOB_ALERT', 'MESSAGE', 'CONNECTION', 'COURSE_UPDATE', 'CHALLENGE', 'ACHIEVEMENT', 'SYSTEM');

-- =============================================================================
-- USERS & AUTH (Supabase auth.users is primary, this extends with app data)
-- =============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    avatar_url TEXT,
    role user_role DEFAULT 'USER',
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- =============================================================================
-- USER PROFILES (Extended profile data)
-- =============================================================================
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    headline VARCHAR(200),
    summary TEXT,
    current_role VARCHAR(100),
    bio TEXT,
    location VARCHAR(200),
    phone VARCHAR(20),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    rank profile_rank DEFAULT 'NOVICE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_xp ON public.user_profiles(xp DESC);

-- =============================================================================
-- SKILLS
-- =============================================================================
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    proficiency proficiency_level DEFAULT 'INTERMEDIATE',
    years_of_experience INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_skills_profile_id ON public.skills(profile_id);
CREATE INDEX idx_skills_name ON public.skills(name);

-- =============================================================================
-- WORK EXPERIENCE
-- =============================================================================
CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    company VARCHAR(200) NOT NULL,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE,
    current BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_experiences_profile_id ON public.experiences(profile_id);

-- =============================================================================
-- EDUCATION
-- =============================================================================
CREATE TABLE public.educations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    institution VARCHAR(200) NOT NULL,
    degree VARCHAR(200),
    field_of_study VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE,
    gpa DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_educations_profile_id ON public.educations(profile_id);

-- =============================================================================
-- CERTIFICATIONS
-- =============================================================================
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    issuing_organization VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,
    credential_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_certifications_profile_id ON public.certifications(profile_id);

-- =============================================================================
-- LANGUAGES
-- =============================================================================
CREATE TABLE public.languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    proficiency proficiency_level DEFAULT 'INTERMEDIATE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_languages_profile_id ON public.languages(profile_id);

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    url VARCHAR(255),
    github_url VARCHAR(255),
    technologies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_profile_id ON public.projects(profile_id);

-- =============================================================================
-- COMPANIES
-- =============================================================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    location VARCHAR(200),
    logo_url TEXT,
    industry VARCHAR(100),
    employee_count INTEGER,
    owner_user_id UUID REFERENCES public.profiles(id),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_industry ON public.companies(industry);
CREATE INDEX idx_companies_owner ON public.companies(owner_user_id);

-- =============================================================================
-- JOBS
-- =============================================================================
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    location VARCHAR(200) NOT NULL,
    job_type job_type NOT NULL DEFAULT 'FULL_TIME',
    salary_min INTEGER,
    salary_max INTEGER,
    requirements TEXT[],
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status job_status DEFAULT 'DRAFT',
    posted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_posted_at ON public.jobs(posted_at DESC);
CREATE INDEX idx_jobs_location ON public.jobs(location);
CREATE INDEX idx_jobs_title ON public.jobs(title);

-- =============================================================================
-- JOB POST DRAFT VERSIONS
-- =============================================================================
CREATE TABLE public.job_post_draft_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    draft_key TEXT NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    job_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    salary_min TEXT,
    salary_max TEXT,
    requirements TEXT NOT NULL DEFAULT '',
    salary_range TEXT,
    category TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name TEXT,
    company_attached BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(30) NOT NULL DEFAULT 'autosave' CHECK (reason IN ('autosave', 'template_applied', 'reviewed', 'saved', 'restored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_post_draft_versions_recruiter_key ON public.job_post_draft_versions(recruiter_id, draft_key, updated_at DESC);
CREATE INDEX idx_job_post_draft_versions_job ON public.job_post_draft_versions(job_id, updated_at DESC);
CREATE INDEX idx_job_post_draft_versions_updated_at ON public.job_post_draft_versions(updated_at DESC);

-- =============================================================================
-- JOB POST TEMPLATES
-- =============================================================================
CREATE TABLE public.job_post_templates (
    id TEXT PRIMARY KEY,
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location VARCHAR(200) NOT NULL DEFAULT '',
    job_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    salary_min TEXT,
    salary_max TEXT,
    requirements TEXT NOT NULL DEFAULT '',
    salary_range TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_post_templates_recruiter_updated_at ON public.job_post_templates(recruiter_id, updated_at DESC);
CREATE INDEX idx_job_post_templates_updated_at ON public.job_post_templates(updated_at DESC);

-- =============================================================================
-- JOB APPLICATIONS
-- =============================================================================
CREATE TABLE public.job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status application_status DEFAULT 'PENDING',
    resume_url TEXT,
    cover_letter TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);

-- =============================================================================
-- APPLICATION STATUS EVENTS
-- =============================================================================
CREATE TABLE public.application_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    previous_status application_status,
    status application_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_application_status_events_application_id ON public.application_status_events(application_id);
CREATE INDEX idx_application_status_events_created_at ON public.application_status_events(created_at);

-- =============================================================================
-- APPLICATION DRAFTS
-- =============================================================================
CREATE TABLE public.application_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    resume_url TEXT,
    cover_letter TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'profile', 'ai')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

CREATE INDEX idx_application_drafts_user_id ON public.application_drafts(user_id);
CREATE INDEX idx_application_drafts_job_id ON public.application_drafts(job_id);
CREATE INDEX idx_application_drafts_updated_at ON public.application_drafts(updated_at DESC);

CREATE TABLE public.application_draft_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    resume_url TEXT,
    cover_letter TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'profile', 'ai')),
    reason VARCHAR(30) NOT NULL DEFAULT 'autosave' CHECK (reason IN ('autosave', 'profile_applied', 'restored', 'cleared')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_application_draft_versions_user_job ON public.application_draft_versions(user_id, job_id, updated_at DESC);
CREATE INDEX idx_application_draft_versions_updated_at ON public.application_draft_versions(updated_at DESC);

-- =============================================================================
-- RESUME EXPORT EVENTS
-- =============================================================================
CREATE TABLE public.resume_export_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ready', 'blocked')),
    method VARCHAR(30) NOT NULL CHECK (method IN ('browser-print', 'html-download', 'native-pdf', 'provider-pdf')),
    file_name TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resume_export_events_user_created ON public.resume_export_events(user_id, created_at DESC);
CREATE INDEX idx_resume_export_events_created ON public.resume_export_events(created_at DESC);

-- =============================================================================
-- RESUME ARTIFACTS
-- =============================================================================
CREATE TABLE public.resume_artifacts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resume_artifacts_user_uploaded ON public.resume_artifacts(user_id, uploaded_at DESC);
CREATE INDEX idx_resume_artifacts_user_status_uploaded ON public.resume_artifacts(user_id, status, uploaded_at DESC);

-- =============================================================================
-- CANDIDATE NOTES
-- =============================================================================
CREATE TABLE public.candidate_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(application_id, recruiter_id)
);

CREATE INDEX idx_candidate_notes_application_id ON public.candidate_notes(application_id);
CREATE INDEX idx_candidate_notes_recruiter_id ON public.candidate_notes(recruiter_id);
CREATE INDEX idx_candidate_notes_updated_at ON public.candidate_notes(updated_at DESC);

-- =============================================================================
-- CANDIDATE SCORECARDS
-- =============================================================================
CREATE TABLE public.candidate_scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ratings JSONB NOT NULL DEFAULT '{}'::JSONB,
    evidence TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(application_id, recruiter_id)
);

CREATE INDEX idx_candidate_scorecards_application_id ON public.candidate_scorecards(application_id);
CREATE INDEX idx_candidate_scorecards_recruiter_id ON public.candidate_scorecards(recruiter_id);
CREATE INDEX idx_candidate_scorecards_updated_at ON public.candidate_scorecards(updated_at DESC);

-- =============================================================================
-- SAVED JOB SEARCHES
-- =============================================================================
CREATE TABLE public.saved_job_searches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    search_term TEXT DEFAULT '',
    filters JSONB NOT NULL DEFAULT '{}'::JSONB,
    alert_enabled BOOLEAN DEFAULT FALSE,
    last_match_count INTEGER,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, id)
);

CREATE INDEX idx_saved_job_searches_user_id ON public.saved_job_searches(user_id);
CREATE INDEX idx_saved_job_searches_updated_at ON public.saved_job_searches(updated_at DESC);

-- =============================================================================
-- HIDDEN EXPLORE JOBS
-- =============================================================================
CREATE TABLE public.hidden_explore_jobs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company_name TEXT,
    job_type TEXT,
    location TEXT,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

CREATE INDEX idx_hidden_explore_jobs_user_hidden_at ON public.hidden_explore_jobs(user_id, hidden_at DESC);
CREATE INDEX idx_hidden_explore_jobs_job_id ON public.hidden_explore_jobs(job_id);

-- =============================================================================
-- AI SESSIONS AND REVIEWABLE SUGGESTIONS
-- =============================================================================
CREATE TABLE public.ai_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT 'AI Assistant',
    messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_sessions_user_id ON public.ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_updated_at ON public.ai_sessions(updated_at DESC);

CREATE TABLE public.automation_suggestions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL DEFAULT 'chat_response',
    source_label VARCHAR(200),
    source_detail TEXT,
    prompt TEXT,
    content TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'saved', 'dismissed')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_suggestions_user_id ON public.automation_suggestions(user_id);
CREATE INDEX idx_automation_suggestions_session_id ON public.automation_suggestions(session_id);
CREATE INDEX idx_automation_suggestions_review_status ON public.automation_suggestions(review_status);
CREATE INDEX idx_automation_suggestions_updated_at ON public.automation_suggestions(updated_at DESC);

CREATE TABLE public.automation_suggestion_audit_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    suggestion_id TEXT NOT NULL REFERENCES public.automation_suggestions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'review_status_changed', 'workflow_handoff_opened', 'workflow_prefill_used', 'workflow_prefill_rejected')),
    previous_review_status VARCHAR(20) CHECK (previous_review_status IN ('draft', 'saved', 'dismissed')),
    next_review_status VARCHAR(20) CHECK (next_review_status IN ('draft', 'saved', 'dismissed')),
    source VARCHAR(120) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_suggestion_audit_user ON public.automation_suggestion_audit_events(user_id);
CREATE INDEX idx_automation_suggestion_audit_suggestion ON public.automation_suggestion_audit_events(suggestion_id);
CREATE INDEX idx_automation_suggestion_audit_occurred ON public.automation_suggestion_audit_events(occurred_at DESC);

-- =============================================================================
-- PRODUCT ANALYTICS EVENTS
-- =============================================================================
CREATE TABLE public.product_analytics_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    area VARCHAR(50) NOT NULL,
    event_name VARCHAR(80) NOT NULL,
    source VARCHAR(120) NOT NULL,
    object_type VARCHAR(80),
    object_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_analytics_events_user_id ON public.product_analytics_events(user_id);
CREATE INDEX idx_product_analytics_events_area_name ON public.product_analytics_events(area, event_name);
CREATE INDEX idx_product_analytics_events_occurred_at ON public.product_analytics_events(occurred_at DESC);

-- =============================================================================
-- NETWORKING - CONNECTIONS
-- =============================================================================
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status connection_status DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_receiver ON public.connections(receiver_id);
CREATE INDEX idx_connections_status ON public.connections(status);

CREATE TABLE public.networking_suggestion_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    suggested_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'dismissed' CHECK (status IN ('dismissed')),
    reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, suggested_user_id)
);

CREATE INDEX idx_networking_suggestion_preferences_user ON public.networking_suggestion_preferences(user_id);
CREATE INDEX idx_networking_suggestion_preferences_suggested_user ON public.networking_suggestion_preferences(suggested_user_id);
CREATE INDEX idx_networking_suggestion_preferences_updated ON public.networking_suggestion_preferences(updated_at DESC);

-- =============================================================================
-- MESSAGING - CONVERSATIONS
-- =============================================================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200),
    is_group BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);

-- =============================================================================
-- MESSAGING - MESSAGES
-- =============================================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT',
    attachment_url TEXT,
    status message_status DEFAULT 'SENT',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- =============================================================================
-- LMS - COURSES
-- =============================================================================
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    description TEXT,
    instructor_id UUID REFERENCES public.profiles(id),
    category VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0,
    thumbnail_url TEXT,
    duration_hours INTEGER,
    level VARCHAR(50),
    xp_reward INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_courses_published ON public.courses(is_published);
CREATE INDEX idx_courses_slug ON public.courses(slug);

-- =============================================================================
-- LMS - LESSONS
-- =============================================================================
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    video_url TEXT,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER,
    duration_seconds INTEGER,
    is_free_preview BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order ON public.lessons(course_id, order_index);

-- =============================================================================
-- LMS - ENROLLMENTS
-- =============================================================================
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status enrollment_status DEFAULT 'ENROLLED',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    UNIQUE(course_id, user_id)
);

CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);

-- =============================================================================
-- LMS - LESSON PROGRESS
-- =============================================================================
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    watched_seconds INTEGER DEFAULT 0,
    UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);

-- =============================================================================
-- CHALLENGES
-- =============================================================================
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category challenge_category NOT NULL,
    difficulty challenge_difficulty NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    starter_code TEXT,
    test_cases JSONB,
    solution_template TEXT,
    time_limit_minutes INTEGER,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_category ON public.challenges(category);
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_published ON public.challenges(is_published);

-- =============================================================================
-- CHALLENGE SUBMISSIONS
-- =============================================================================
CREATE TABLE public.challenge_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_submitted TEXT NOT NULL,
    language VARCHAR(50),
    passed_tests BOOLEAN DEFAULT FALSE,
    score INTEGER,
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_user ON public.challenge_submissions(user_id);

-- =============================================================================
-- GAMIFICATION - LEADERBOARD
-- =============================================================================
CREATE TABLE public.leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    monthly_xp INTEGER DEFAULT 0,
    badges_earned TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_leaderboard_total_xp ON public.leaderboard(total_xp DESC);
CREATE INDEX idx_leaderboard_rank ON public.leaderboard(rank);

-- =============================================================================
-- GAMIFICATION - ACHIEVEMENTS/BADGES
-- =============================================================================
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    xp_value INTEGER DEFAULT 0,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

-- =============================================================================
-- GAMIFICATION - XP TRANSACTIONS
-- =============================================================================
CREATE TABLE public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(200) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON public.xp_transactions(created_at DESC);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE public.notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    job_alerts BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    newsletter BOOLEAN DEFAULT FALSE,
    digest_frequency TEXT DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'daily', 'weekly', 'off')),
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '18:00',
    quiet_hours_end TIME DEFAULT '09:00',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_metadata ON public.notifications USING GIN(metadata);

CREATE TABLE public.notification_digest_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('saved_search')),
    source_id TEXT NOT NULL,
    delivery_key TEXT NOT NULL UNIQUE,
    digest_frequency TEXT NOT NULL CHECK (digest_frequency IN ('daily', 'weekly')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'skipped')),
    deliver_after TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    skip_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_digest_items_user_status ON public.notification_digest_items(user_id, status, deliver_after);
CREATE INDEX idx_notification_digest_items_due ON public.notification_digest_items(status, deliver_after);
CREATE INDEX idx_notification_digest_items_metadata ON public.notification_digest_items USING GIN(metadata);

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    interval VARCHAR(20) NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
    features JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(features) = 'array'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    provider_price_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_active_price ON public.subscription_plans(is_active, price);

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE')),
    payment_method VARCHAR(100),
    provider_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX idx_subscriptions_provider ON public.subscriptions(provider_subscription_id);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_method VARCHAR(50),
    stripe_session_id VARCHAR(255),
    transaction_id VARCHAR(255),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX idx_payments_stripe_session ON public.payments(stripe_session_id);

-- =============================================================================
-- ADMIN - SYSTEM SETTINGS
-- =============================================================================
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ADMIN - AUDIT LOG
-- =============================================================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_post_draft_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_draft_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_export_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_explore_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_suggestion_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_suggestion_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_digest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view all profiles but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Profiles: Users can view all but only update their own
CREATE POLICY "User profiles viewable by everyone" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Skills: View all, update own
CREATE POLICY "Skills viewable by everyone" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Users can manage own skills" ON public.skills FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Jobs: Everyone can view published jobs, recruiters can create/update
CREATE POLICY "Published jobs viewable by everyone" ON public.jobs FOR SELECT USING (status = 'PUBLISHED' OR auth.uid() IN (SELECT posted_by FROM public.jobs WHERE id = jobs.id));
CREATE POLICY "Recruiters can create jobs" ON public.jobs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'RECRUITER')
);
CREATE POLICY "Job posters can update their jobs" ON public.jobs FOR UPDATE USING (auth.uid() = posted_by);

-- Job Post Draft Versions: recruiter-owned checkpoints that never publish jobs by themselves
CREATE POLICY "Recruiters can view own job post draft versions" ON public.job_post_draft_versions FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can create own job post draft versions" ON public.job_post_draft_versions FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can update own job post draft versions" ON public.job_post_draft_versions FOR UPDATE USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can delete own job post draft versions" ON public.job_post_draft_versions FOR DELETE USING (auth.uid() = recruiter_id);

-- Job Post Templates: recruiter-owned editable drafts that never publish jobs by themselves
CREATE POLICY "Recruiters can view own job post templates" ON public.job_post_templates FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can create own job post templates" ON public.job_post_templates FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can update own job post templates" ON public.job_post_templates FOR UPDATE USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can delete own job post templates" ON public.job_post_templates FOR DELETE USING (auth.uid() = recruiter_id);

-- Job Applications: Users can view/create their own applications
CREATE POLICY "Users can view own applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.job_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Job posters can view applications" ON public.job_applications FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.jobs job
        WHERE job.id = job_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can update application status" ON public.job_applications FOR UPDATE USING (
    EXISTS (
        SELECT 1
        FROM public.jobs job
        WHERE job.id = job_id
          AND job.posted_by = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.jobs job
        WHERE job.id = job_id
          AND job.posted_by = auth.uid()
    )
);

-- Application Status Events: talent and job posters can view status history; actors can append events for owned applications/jobs
CREATE POLICY "Users and recruiters can view application status events" ON public.application_status_events FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND (app.user_id = auth.uid() OR job.posted_by = auth.uid())
    )
);
CREATE POLICY "Users and recruiters can create application status events" ON public.application_status_events FOR INSERT WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND (app.user_id = auth.uid() OR job.posted_by = auth.uid())
    )
);

-- Application Drafts: user-owned pre-submit drafts that never create applications by themselves
CREATE POLICY "Users can view own application drafts" ON public.application_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own application drafts" ON public.application_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own application drafts" ON public.application_drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own application drafts" ON public.application_drafts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own application draft versions" ON public.application_draft_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own application draft versions" ON public.application_draft_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own application draft versions" ON public.application_draft_versions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own application draft versions" ON public.application_draft_versions FOR DELETE USING (auth.uid() = user_id);

-- Resume Export Events: user-owned export activity for transparency and cross-device continuity
CREATE POLICY "Users can view own resume export events" ON public.resume_export_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resume export events" ON public.resume_export_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resume export events" ON public.resume_export_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own resume export events" ON public.resume_export_events FOR DELETE USING (auth.uid() = user_id);

-- Resume Artifacts: user-owned uploaded artifact metadata for cross-device continuity and revocation audit
CREATE POLICY "Users can view own resume artifacts" ON public.resume_artifacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resume artifacts" ON public.resume_artifacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resume artifacts" ON public.resume_artifacts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own resume artifacts" ON public.resume_artifacts FOR DELETE USING (auth.uid() = user_id);

-- Candidate Notes: private recruiter notes scoped to applications on jobs they posted
CREATE POLICY "Job posters can view own candidate notes" ON public.candidate_notes FOR SELECT USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can create own candidate notes" ON public.candidate_notes FOR INSERT WITH CHECK (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can update own candidate notes" ON public.candidate_notes FOR UPDATE USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
) WITH CHECK (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can delete own candidate notes" ON public.candidate_notes FOR DELETE USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);

-- Candidate Scorecards: private recruiter scorecards scoped to applications on jobs they posted
CREATE POLICY "Job posters can view own candidate scorecards" ON public.candidate_scorecards FOR SELECT USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can create own candidate scorecards" ON public.candidate_scorecards FOR INSERT WITH CHECK (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can update own candidate scorecards" ON public.candidate_scorecards FOR UPDATE USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
) WITH CHECK (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);
CREATE POLICY "Job posters can delete own candidate scorecards" ON public.candidate_scorecards FOR DELETE USING (
    recruiter_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.job_applications app
        JOIN public.jobs job ON job.id = app.job_id
        WHERE app.id = application_id
          AND job.posted_by = auth.uid()
    )
);

-- Saved Job Searches: account-scoped search presets and alert settings
CREATE POLICY "Users can view own saved job searches" ON public.saved_job_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own saved job searches" ON public.saved_job_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved job searches" ON public.saved_job_searches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved job searches" ON public.saved_job_searches FOR DELETE USING (auth.uid() = user_id);

-- Hidden Explore Jobs: account-scoped recommendation visibility preferences
CREATE POLICY "Users can view own hidden Explore jobs" ON public.hidden_explore_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own hidden Explore jobs" ON public.hidden_explore_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hidden Explore jobs" ON public.hidden_explore_jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own hidden Explore jobs" ON public.hidden_explore_jobs FOR DELETE USING (auth.uid() = user_id);

-- AI Sessions and Suggestions: user-owned AI history and review records
CREATE POLICY "Users can view own AI sessions" ON public.ai_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI sessions" ON public.ai_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI sessions" ON public.ai_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI sessions" ON public.ai_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own automation suggestions" ON public.automation_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own automation suggestions" ON public.automation_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own automation suggestions" ON public.automation_suggestions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own automation suggestions" ON public.automation_suggestions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own automation suggestion audit events" ON public.automation_suggestion_audit_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own automation suggestion audit events" ON public.automation_suggestion_audit_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own product analytics events" ON public.product_analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all product analytics events" ON public.product_analytics_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Users can create product analytics events" ON public.product_analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Companies: Everyone can view, owners can update
CREATE POLICY "Companies viewable by everyone" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Company owners can update" ON public.companies FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "Users can create companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Connections: Users can view their own connections
CREATE POLICY "Users can view own connections" ON public.connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create connection requests" ON public.connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Connection participants can update" ON public.connections FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can view own networking suggestion preferences" ON public.networking_suggestion_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own networking suggestion preferences" ON public.networking_suggestion_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own networking suggestion preferences" ON public.networking_suggestion_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own networking suggestion preferences" ON public.networking_suggestion_preferences FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_mutual_connection_counts(
    p_current_user_id UUID,
    p_candidate_ids UUID[]
)
RETURNS TABLE(suggested_user_id UUID, mutual_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH requested_candidates AS (
        SELECT candidate_id AS suggested_user_id
        FROM unnest(COALESCE(p_candidate_ids, ARRAY[]::UUID[])) AS candidate(candidate_id)
        WHERE candidate_id <> p_current_user_id
    ),
    current_connections AS (
        SELECT CASE
            WHEN connection.requester_id = p_current_user_id THEN connection.receiver_id
            ELSE connection.requester_id
        END AS connected_user_id
        FROM public.connections connection
        WHERE connection.status = 'ACCEPTED'
            AND auth.uid() = p_current_user_id
            AND (
                connection.requester_id = p_current_user_id
                OR connection.receiver_id = p_current_user_id
            )
    ),
    candidate_connections AS (
        SELECT
            requested_candidates.suggested_user_id,
            CASE
                WHEN connection.requester_id = requested_candidates.suggested_user_id THEN connection.receiver_id
                ELSE connection.requester_id
            END AS connected_user_id
        FROM requested_candidates
        JOIN public.connections connection
            ON connection.status = 'ACCEPTED'
            AND (
                connection.requester_id = requested_candidates.suggested_user_id
                OR connection.receiver_id = requested_candidates.suggested_user_id
            )
    )
    SELECT
        candidate_connections.suggested_user_id,
        COUNT(*)::INTEGER AS mutual_count
    FROM candidate_connections
    JOIN current_connections
        ON current_connections.connected_user_id = candidate_connections.connected_user_id
    WHERE candidate_connections.connected_user_id <> p_current_user_id
    GROUP BY candidate_connections.suggested_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_mutual_connection_counts(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mutual_connection_counts(UUID, UUID[]) TO authenticated;

-- Messages: Participants can view their conversations and messages
CREATE POLICY "Conversation participants can view" ON public.conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Message participants can view" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp 
            JOIN public.conversations c ON cp.conversation_id = c.id 
            WHERE c.id = messages.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Participants can mark incoming messages read" ON public.messages FOR UPDATE USING (
    sender_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL)
) WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL)
);
CREATE POLICY "Participants can update own read marker" ON public.conversation_participants FOR UPDATE USING (
    user_id = auth.uid()
) WITH CHECK (
    user_id = auth.uid()
);

-- Courses: Everyone can view published courses
CREATE POLICY "Published courses viewable by everyone" ON public.courses FOR SELECT USING (is_published = true OR auth.uid() = instructor_id);
CREATE POLICY "Instructors can create courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update their courses" ON public.courses FOR UPDATE USING (auth.uid() = instructor_id);

-- Enrollments: Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll in courses" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.enrollments FOR UPDATE USING (auth.uid() = user_id);

-- Challenges: Everyone can view published challenges
CREATE POLICY "Published challenges viewable by everyone" ON public.challenges FOR SELECT USING (is_published = true);
CREATE POLICY "Users can submit challenges" ON public.challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own submissions" ON public.challenge_submissions FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard: Everyone can view
CREATE POLICY "Leaderboard viewable by everyone" ON public.leaderboard FOR SELECT USING (true);

-- Notifications: Users can only view their own notifications
CREATE POLICY "Users can view own notification settings" ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notification settings" ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification settings" ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notification digest items" ON public.notification_digest_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notification digest items" ON public.notification_digest_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification digest items" ON public.notification_digest_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notification digest items" ON public.notification_digest_items FOR DELETE USING (auth.uid() = user_id);

-- Payments: Users can only view their own payments
CREATE POLICY "Active subscription plans are viewable by everyone" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pending payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_job_publish_readiness()
RETURNS TRIGGER AS $$
DECLARE
    requirement_count INTEGER;
BEGIN
    IF NEW.status = 'PUBLISHED' THEN
        SELECT COUNT(*)
        INTO requirement_count
        FROM unnest(COALESCE(NEW.requirements, ARRAY[]::TEXT[])) AS requirement
        WHERE btrim(requirement) <> '';

        IF btrim(COALESCE(NEW.title, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a title'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF btrim(COALESCE(NEW.description, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a description'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF btrim(COALESCE(NEW.location, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a location'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF NEW.company_id IS NULL THEN
            RAISE EXCEPTION 'Cannot publish job without company context'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF requirement_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish job without at least one requirement'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER enforce_jobs_publish_readiness BEFORE INSERT OR UPDATE OF status, title, description, location, company_id, requirements ON public.jobs FOR EACH ROW EXECUTE FUNCTION enforce_job_publish_readiness();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_post_draft_versions_updated_at BEFORE UPDATE ON public.job_post_draft_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_post_templates_updated_at BEFORE UPDATE ON public.job_post_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_drafts_updated_at BEFORE UPDATE ON public.application_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_draft_versions_updated_at BEFORE UPDATE ON public.application_draft_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidate_notes_updated_at BEFORE UPDATE ON public.candidate_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidate_scorecards_updated_at BEFORE UPDATE ON public.candidate_scorecards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_job_searches_updated_at BEFORE UPDATE ON public.saved_job_searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hidden_explore_jobs_updated_at BEFORE UPDATE ON public.hidden_explore_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON public.ai_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_suggestions_updated_at BEFORE UPDATE ON public.automation_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_networking_suggestion_preferences_updated_at BEFORE UPDATE ON public.networking_suggestion_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_digest_items_updated_at BEFORE UPDATE ON public.notification_digest_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER: Auto-create user_profile on profile creation
-- =============================================================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_profile_trigger AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- =============================================================================
-- TRIGGER: Auto-update leaderboard on XP change
-- =============================================================================
CREATE OR REPLACE FUNCTION update_leaderboard_xp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.leaderboard 
    SET total_xp = (SELECT COALESCE(SUM(amount), 0) FROM public.xp_transactions WHERE user_id = NEW.user_id),
        last_updated = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leaderboard_on_xp_transaction AFTER INSERT ON public.xp_transactions FOR EACH ROW EXECUTE FUNCTION update_leaderboard_xp();

-- =============================================================================
-- INITIAL DATA SEED (Optional - for testing)
-- =============================================================================
-- Note: Insert actual user data through Supabase Auth signup, not directly here
-- This section is for reference only

-- Example: Insert system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('platform_config', '{"maintenance_mode": false, "registration_enabled": true, "max_file_size_mb": 10}', 'Platform-wide configuration'),
('email_templates', '{"welcome": "Welcome to TalentSphere!", "job_applied": "Your application has been submitted."}', 'Email notification templates')
ON CONFLICT (key) DO NOTHING;

-- Example: Insert default badges
INSERT INTO public.badges (name, description, icon_url, xp_value, criteria) VALUES
('First Steps', 'Complete your profile setup', '/badges/first-steps.png', 50, '{"type": "profile_completion", "threshold": 100}'),
('Job Seeker', 'Apply to your first job', '/badges/job-seeker.png', 100, '{"type": "job_application", "threshold": 1}'),
('Networker', 'Make your first connection', '/badges/networker.png', 75, '{"type": "connection", "threshold": 1}'),
('Learner', 'Complete your first course', '/badges/learner.png', 200, '{"type": "course_completion", "threshold": 1}'),
('Problem Solver', 'Solve your first challenge', '/badges/problem-solver.png', 150, '{"type": "challenge_completion", "threshold": 1}')
ON CONFLICT DO NOTHING;
