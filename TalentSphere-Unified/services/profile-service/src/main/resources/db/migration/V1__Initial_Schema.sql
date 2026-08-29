CREATE TABLE profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    current_title VARCHAR(255),
    summary TEXT,
    xp_level INTEGER DEFAULT 0,
    rank VARCHAR(50)
);

CREATE TABLE experiences (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT
);

CREATE TABLE educations (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE TABLE skills (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) REFERENCES profiles(id),
    name VARCHAR(255) NOT NULL,
    proficiency VARCHAR(50)
);
