CREATE TABLE hidden_explore_jobs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    hidden_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_hidden_explore_jobs_user_job UNIQUE (user_id, job_id)
);

CREATE INDEX idx_hidden_explore_jobs_user_hidden_at ON hidden_explore_jobs(user_id, hidden_at);
CREATE INDEX idx_hidden_explore_jobs_job_id ON hidden_explore_jobs(job_id);
