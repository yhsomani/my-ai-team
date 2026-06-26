CREATE TABLE application_status_events (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_app_status_event_application ON application_status_events(application_id);
CREATE INDEX idx_app_status_event_created ON application_status_events(created_at);
