CREATE TABLE courses (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0.0
);

CREATE TABLE lessons (
    id VARCHAR(255) PRIMARY KEY,
    course_id VARCHAR(255) REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    order_number INTEGER NOT NULL,
    video_url VARCHAR(255)
);

CREATE TABLE enrollments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255) NOT NULL,
    enrolled_at TIMESTAMP NOT NULL,
    status VARCHAR(50), -- ENROLLED, COMPLETED
    progress INTEGER DEFAULT 0
);
