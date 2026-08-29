CREATE TABLE IF NOT EXISTS automation_suggestion_audit_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    suggestion_id VARCHAR(255) NOT NULL REFERENCES automation_suggestions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    previous_review_status VARCHAR(20),
    next_review_status VARCHAR(20),
    source VARCHAR(120) NOT NULL,
    metadata TEXT,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_automation_suggestion_audit_event_type CHECK (event_type IN ('created', 'review_status_changed', 'workflow_handoff_opened', 'workflow_prefill_used', 'workflow_prefill_rejected')),
    CONSTRAINT chk_automation_suggestion_audit_previous_status CHECK (previous_review_status IS NULL OR previous_review_status IN ('draft', 'saved', 'dismissed')),
    CONSTRAINT chk_automation_suggestion_audit_next_status CHECK (next_review_status IS NULL OR next_review_status IN ('draft', 'saved', 'dismissed'))
);

CREATE INDEX idx_automation_suggestion_audit_user ON automation_suggestion_audit_events(user_id);
CREATE INDEX idx_automation_suggestion_audit_suggestion ON automation_suggestion_audit_events(suggestion_id);
CREATE INDEX idx_automation_suggestion_audit_occurred ON automation_suggestion_audit_events(occurred_at);
