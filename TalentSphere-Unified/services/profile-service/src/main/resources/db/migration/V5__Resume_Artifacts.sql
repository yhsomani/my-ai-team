CREATE TABLE resume_artifacts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    uploaded_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_resume_artifact_status CHECK (status IN ('active', 'deleted'))
);

CREATE INDEX idx_resume_artifacts_user_uploaded ON resume_artifacts(user_id, uploaded_at);
CREATE INDEX idx_resume_artifacts_user_status_uploaded ON resume_artifacts(user_id, status, uploaded_at);
