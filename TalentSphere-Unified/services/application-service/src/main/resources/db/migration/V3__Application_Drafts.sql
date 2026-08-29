CREATE TABLE application_drafts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    resume_url VARCHAR(255),
    cover_letter TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_application_draft_source CHECK (source IN ('manual', 'profile', 'ai')),
    CONSTRAINT uk_application_draft_user_job UNIQUE (user_id, job_id)
);

CREATE INDEX idx_application_draft_user ON application_drafts(user_id);
CREATE INDEX idx_application_draft_job ON application_drafts(job_id);
CREATE INDEX idx_application_draft_updated ON application_drafts(updated_at);
