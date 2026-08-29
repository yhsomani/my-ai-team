CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(50),
    result_json TEXT NOT NULL,
    score DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_analysis_user_id ON ai_analysis_results(user_id);
CREATE INDEX idx_ai_analysis_target_id ON ai_analysis_results(target_id);
CREATE TABLE job_applications (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, REVIEWING, INTERVIEWING, OFFERED, REJECTED
    applied_at TIMESTAMP NOT NULL,
    resume_url VARCHAR(255),
    cover_letter TEXT
);
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL,
    token_hash  VARCHAR(64) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE token_denylist (
    jti        VARCHAR(36) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at) WHERE revoked = false;
CREATE TABLE challenges (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- BACKEND, FRONTEND, DATA_SCIENCE
    difficulty VARCHAR(50), -- EASY, MEDIUM, HARD
    xp_reward INTEGER DEFAULT 0,
    starter_code TEXT
);

CREATE TABLE challenge_test_cases (
    challenge_id VARCHAR(255) REFERENCES challenges(id),
    test_case TEXT
);

CREATE TABLE submissions (
    id VARCHAR(255) PRIMARY KEY,
    challenge_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    language VARCHAR(50),
    code TEXT,
    status VARCHAR(50), -- PENDING, PASSED, FAILED
    score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    recipient_id VARCHAR(50),
    channel_id VARCHAR(50),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'CHAT',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_channel_id ON chat_messages(channel_id);
CREATE TABLE companies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(255),
    location VARCHAR(255),
    logo_url VARCHAR(255),
    industry VARCHAR(100),
    employee_count INTEGER DEFAULT 0
);
CREATE TABLE leaderboard (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    total_xp INTEGER DEFAULT 0,
    rank INTEGER
);

CREATE TABLE achievements (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    unlocked_at TIMESTAMP NOT NULL
);
CREATE TABLE jobs (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    salary_range VARCHAR(255),
    type VARCHAR(50), -- FULL_TIME, PART_TIME, CONTRACT
    status VARCHAR(50), -- OPEN, CLOSED
    posted_at TIMESTAMP NOT NULL,
    requirements TEXT[]
);
CREATE TABLE courses (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0.0
);

CREATE TABLE lessons (
    id VARCHAR(255) PRIMARY KEY,
    course_id VARCHAR(255) REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    order_number INTEGER NOT NULL,
    video_url VARCHAR(255)
);

CREATE TABLE enrollments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255) NOT NULL,
    enrolled_at TIMESTAMP NOT NULL,
    status VARCHAR(50), -- ENROLLED, COMPLETED
    progress INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_msg_sender_id ON messages(sender_id);
CREATE INDEX idx_msg_receiver_id ON messages(receiver_id);
CREATE INDEX idx_msg_timestamp ON messages(timestamp);
CREATE TABLE IF NOT EXISTS connections (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_connection UNIQUE (requester_id, receiver_id)
);

CREATE INDEX idx_connection_requester_id ON connections(requester_id);
CREATE INDEX idx_connection_receiver_id ON connections(receiver_id);
CREATE INDEX idx_connection_status ON connections(status);
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE TABLE profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    current_title VARCHAR(255),
    summary TEXT,
    xp_level INTEGER DEFAULT 0,
    rank VARCHAR(50)
);

CREATE TABLE experiences (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT
);

CREATE TABLE educations (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE TABLE skills (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    name VARCHAR(255) NOT NULL,
    proficiency VARCHAR(50)
);
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(50) NOT NULL DEFAULT 'USER',
    timezone      VARCHAR(50),
    language      VARCHAR(10) DEFAULT 'en',
    preferences   JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    name VARCHAR(50) PRIMARY KEY,
    description TEXT
);

INSERT INTO roles (name, description) VALUES 
('USER', 'Standard user'), 
('ADMIN', 'Administrator'), 
('RECRUITER', 'Recruiter or hiring manager');
