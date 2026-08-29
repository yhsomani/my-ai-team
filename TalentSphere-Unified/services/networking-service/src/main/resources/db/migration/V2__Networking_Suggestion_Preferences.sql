CREATE TABLE IF NOT EXISTS networking_suggestion_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    suggested_user_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'dismissed',
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_networking_suggestion_preference UNIQUE (user_id, suggested_user_id),
    CONSTRAINT chk_networking_suggestion_preference_status CHECK (status IN ('dismissed'))
);

CREATE INDEX idx_networking_suggestion_preference_user ON networking_suggestion_preferences(user_id);
CREATE INDEX idx_networking_suggestion_preference_suggested_user ON networking_suggestion_preferences(suggested_user_id);
CREATE INDEX idx_networking_suggestion_preference_updated ON networking_suggestion_preferences(updated_at);
