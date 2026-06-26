CREATE TABLE candidate_scorecards (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    recruiter_id VARCHAR(255) NOT NULL,
    ratings TEXT NOT NULL,
    evidence TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_candidate_scorecard_application_recruiter UNIQUE (application_id, recruiter_id)
);

CREATE INDEX idx_candidate_scorecard_application ON candidate_scorecards(application_id);
CREATE INDEX idx_candidate_scorecard_recruiter ON candidate_scorecards(recruiter_id);
CREATE INDEX idx_candidate_scorecard_updated ON candidate_scorecards(updated_at);
