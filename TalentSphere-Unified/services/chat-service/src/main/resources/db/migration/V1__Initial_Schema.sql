CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(50) NOT NULL,
    recipient_id VARCHAR(50),
    channel_id VARCHAR(50),
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'CHAT',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_channel_id ON chat_messages(channel_id);
