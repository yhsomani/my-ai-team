-- TalentSphere Realistic Dummy Data Set
-- Personas: Admin, Recruiter, Candidate (Junior), Candidate (Expert)

-- 1. CLEANUP (Optional, depends on if we want to reset)
-- TRUNCATE sessions, refresh_tokens, job_applications, enrollments, lessons, courses, jobs, companies, skills, educations, experiences, profiles, users CASCADE;

-- 2. USERS & ROLES (user-service)
INSERT INTO roles (name, description) VALUES 
('USER', 'Standard user'), 
('ADMIN', 'Administrator'), 
('RECRUITER', 'Recruiter or hiring manager')
ON CONFLICT (name) DO NOTHING;

-- Alice Admin (ADMIN)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, timezone, language) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'alice@talentsphere.admin', '$2a$10$dXJ3SWpueS53MzR6N090T.OCM8X9Z1uY6F6eZqG5W6Q2hO2vR3KzO', 'Alice', 'Admin', 'ADMIN', 'UTC', 'en');

-- Bob Recruiter (RECRUITER)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, timezone, language) 
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'bob@hiring.com', '$2a$10$dXJ3SWpueS53MzR6N090T.OCM8X9Z1uY6F6eZqG5W6Q2hO2vR3KzO', 'Bob', 'Recruiter', 'RECRUITER', 'EST', 'en');

-- Charlie Candidate (USER - Junior)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, timezone, language) 
VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'charlie@candidate.net', '$2a$10$dXJ3SWpueS53MzR6N090T.OCM8X9Z1uY6F6eZqG5W6Q2hO2vR3KzO', 'Charlie', 'Candidate', 'USER', 'PST', 'en');

-- Dave Developer (USER - Expert)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, timezone, language) 
VALUES ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'dave@dev-expert.io', '$2a$10$dXJ3SWpueS53MzR6N090T.OCM8X9Z1uY6F6eZqG5W6Q2hO2vR3KzO', 'Dave', 'Expert', 'USER', 'GMT', 'en');

-- 3. PROFILES, SKILLS, EXPERIENCES (profile-service)
-- IDs are strings in profile-service
INSERT INTO profiles (id, user_id, current_title, summary, xp_level, rank) VALUES
('p1', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Junior Developer', 'Enthusiastic junior developer looking for my first full-time role.', 100, 'NOVICE'),
('p2', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Senior Architect', '15+ years experience in building scalable microservices and distributed systems.', 5000, 'MASTER');

INSERT INTO skills (id, profile_id, name, proficiency) VALUES
('s1', 'p1', 'JavaScript', 'INTERMEDIATE'),
('s2', 'p1', 'React', 'BEGINNER'),
('s3', 'p2', 'Java', 'EXPERT'),
('s4', 'p2', 'Spring Boot', 'EXPERT'),
('s5', 'p2', 'Kubernetes', 'EXPERT');

INSERT INTO experiences (id, profile_id, company, title, start_date, end_date, description) VALUES
('ex1', 'p2', 'Tech Giants Inc', 'Senior Engineer', '2015-01-01', '2020-12-31', 'Led the migration to microservices.');

-- 4. COMPANIES & JOBS (company-service & job-service)
INSERT INTO companies (id, name, description, website, location, industry, employee_count) VALUES
('c1', 'Global Tech Solutions', 'Leading tech solutions provider.', 'https://globaltech.example.com', 'New York, NY', 'Technology', 5000),
('c2', 'CloudScale Startups', 'Scaling the cloud together.', 'https://cloudscale.example.io', 'Remote', 'Cloud Computing', 50);

-- 5. LMS COURSES (lms-service)
INSERT INTO courses (id, title, description, instructor_id, category, price) VALUES
('course1', 'Microservices with Spring Boot', 'Comprehensive guide to microservices.', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Development', 99.99),
('course2', 'UI/UX Fundamentals', 'Learn to build beautiful interfaces.', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Design', 49.99);

INSERT INTO lessons (id, course_id, title, content, order_number) VALUES
('l1', 'course1', 'Introduction to Microservices', 'In this lesson, we cover...', 1),
('l2', 'course1', 'Spring Cloud Basics', 'In this lesson, we cover...', 2);

-- 6. CHALLENGES & GAMIFICATION (challenge-service & gamification-service)
INSERT INTO challenges (id, title, description, category, difficulty, xp_reward) VALUES
('ch1', 'Two Sum', 'Given an array of integers...', 'BACKEND', 'EASY', 50),
('ch2', 'Reorganize String', 'Given a string S...', 'BACKEND', 'HARD', 200);

INSERT INTO leaderboard (id, user_id, user_name, total_xp, rank) VALUES
('lbd1', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Dave Expert', 5500, 1),
('lbd2', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Charlie Junior', 150, 100);

-- 7. NETWORKING (networking-service)
INSERT INTO connections (id, requester_id, receiver_id, status) VALUES
('conn1', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'ACCEPTED');
