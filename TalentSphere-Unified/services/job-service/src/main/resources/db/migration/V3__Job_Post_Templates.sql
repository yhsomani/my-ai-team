CREATE TABLE job_post_templates (
    id VARCHAR(255) PRIMARY KEY,
    recruiter_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    salary_min VARCHAR(50),
    salary_max VARCHAR(50),
    requirements TEXT NOT NULL,
    salary_range VARCHAR(255),
    category VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_job_post_templates_recruiter_updated_at ON job_post_templates(recruiter_id, updated_at);
CREATE INDEX idx_job_post_templates_updated_at ON job_post_templates(updated_at);
