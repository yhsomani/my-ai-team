CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(50),
    result_json TEXT NOT NULL,
    score DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_analysis_user_id ON ai_analysis_results(user_id);
CREATE INDEX idx_ai_analysis_target_id ON ai_analysis_results(target_id);
