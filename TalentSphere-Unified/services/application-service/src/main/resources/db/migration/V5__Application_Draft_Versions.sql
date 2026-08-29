CREATE TABLE application_draft_versions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    resume_url VARCHAR(255),
    cover_letter TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    reason VARCHAR(30) NOT NULL DEFAULT 'autosave',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_application_draft_version_source CHECK (source IN ('manual', 'profile', 'ai')),
    CONSTRAINT chk_application_draft_version_reason CHECK (reason IN ('autosave', 'profile_applied', 'restored', 'cleared'))
);

CREATE INDEX idx_application_draft_version_user_job ON application_draft_versions(user_id, job_id, updated_at);
CREATE INDEX idx_application_draft_version_updated ON application_draft_versions(updated_at);
