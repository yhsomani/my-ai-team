CREATE TABLE job_applications (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, REVIEWING, INTERVIEWING, OFFERED, REJECTED
    applied_at TIMESTAMP NOT NULL,
    resume_url VARCHAR(255),
    cover_letter TEXT
);
