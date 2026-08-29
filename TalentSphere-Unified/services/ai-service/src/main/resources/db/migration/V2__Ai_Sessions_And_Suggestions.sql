CREATE TABLE IF NOT EXISTS ai_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(200) DEFAULT 'AI Assistant',
    messages TEXT NOT NULL,
    last_saved_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_session_user ON ai_sessions(user_id);
CREATE INDEX idx_ai_session_updated ON ai_sessions(updated_at);

CREATE TABLE IF NOT EXISTS automation_suggestions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) REFERENCES ai_sessions(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL DEFAULT 'chat_response',
    source_label VARCHAR(200),
    source_detail TEXT,
    prompt TEXT,
    content TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    reviewed_at TIMESTAMP,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_automation_suggestion_review_status CHECK (review_status IN ('draft', 'saved', 'dismissed'))
);

CREATE INDEX idx_automation_suggestion_user ON automation_suggestions(user_id);
CREATE INDEX idx_automation_suggestion_session ON automation_suggestions(session_id);
CREATE INDEX idx_automation_suggestion_status ON automation_suggestions(review_status);
CREATE INDEX idx_automation_suggestion_updated ON automation_suggestions(updated_at);
