CREATE TABLE job_post_draft_versions (
    id VARCHAR(255) PRIMARY KEY,
    recruiter_id VARCHAR(255) NOT NULL,
    draft_key VARCHAR(255) NOT NULL,
    job_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    salary_min VARCHAR(50),
    salary_max VARCHAR(50),
    requirements TEXT NOT NULL,
    salary_range VARCHAR(255),
    category VARCHAR(255),
    company_id VARCHAR(255),
    company_name VARCHAR(255),
    company_attached BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(30) NOT NULL DEFAULT 'autosave',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_job_post_draft_version_reason CHECK (reason IN ('autosave', 'template_applied', 'reviewed', 'saved', 'restored'))
);

CREATE INDEX idx_job_post_draft_versions_recruiter_key ON job_post_draft_versions(recruiter_id, draft_key, updated_at);
CREATE INDEX idx_job_post_draft_versions_job ON job_post_draft_versions(job_id, updated_at);
CREATE INDEX idx_job_post_draft_versions_updated_at ON job_post_draft_versions(updated_at);
