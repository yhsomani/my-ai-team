CREATE TABLE leaderboard (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    total_xp INTEGER DEFAULT 0,
    rank INTEGER
);

CREATE TABLE achievements (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    unlocked_at TIMESTAMP NOT NULL
);
