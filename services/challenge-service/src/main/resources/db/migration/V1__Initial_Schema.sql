CREATE TABLE challenges (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- BACKEND, FRONTEND, DATA_SCIENCE
    difficulty VARCHAR(50), -- EASY, MEDIUM, HARD
    xp_reward INTEGER DEFAULT 0,
    starter_code TEXT
);

CREATE TABLE challenge_test_cases (
    challenge_id VARCHAR(255) REFERENCES challenges(id),
    test_case TEXT
);

CREATE TABLE submissions (
    id VARCHAR(255) PRIMARY KEY,
    challenge_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    language VARCHAR(50),
    code TEXT,
    status VARCHAR(50), -- PENDING, PASSED, FAILED
    score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP NOT NULL
);
