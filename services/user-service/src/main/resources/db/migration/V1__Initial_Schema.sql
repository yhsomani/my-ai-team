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
