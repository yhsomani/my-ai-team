CREATE TABLE IF NOT EXISTS connections (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(50) NOT NULL,
    receiver_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_connection UNIQUE (requester_id, receiver_id)
);

CREATE INDEX idx_connection_requester_id ON connections(requester_id);
CREATE INDEX idx_connection_receiver_id ON connections(receiver_id);
CREATE INDEX idx_connection_status ON connections(status);
