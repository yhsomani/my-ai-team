CREATE TABLE jobs (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    salary_range VARCHAR(255),
    type VARCHAR(50), -- FULL_TIME, PART_TIME, CONTRACT
    status VARCHAR(50), -- OPEN, CLOSED
    posted_at TIMESTAMP NOT NULL,
    requirements TEXT[]
);
