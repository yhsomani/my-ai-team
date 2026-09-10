ALTER TABLE automation_suggestion_audit_events
    DROP CONSTRAINT IF EXISTS chk_automation_suggestion_audit_event_type;

ALTER TABLE automation_suggestion_audit_events
    ADD CONSTRAINT chk_automation_suggestion_audit_event_type
    CHECK (event_type IN (
        'created',
        'review_status_changed',
        'workflow_handoff_opened',
        'workflow_prefill_used',
        'workflow_prefill_rejected'
    ));
