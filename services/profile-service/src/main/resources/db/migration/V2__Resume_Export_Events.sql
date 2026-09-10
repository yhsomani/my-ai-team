CREATE TABLE resume_export_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    method VARCHAR(30) NOT NULL,
    file_name TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_resume_export_status CHECK (status IN ('ready', 'blocked')),
    CONSTRAINT chk_resume_export_method CHECK (method IN ('browser-print', 'html-download', 'native-pdf', 'provider-pdf'))
);

CREATE INDEX idx_resume_export_events_user_created ON resume_export_events(user_id, created_at);
CREATE INDEX idx_resume_export_events_created ON resume_export_events(created_at);
