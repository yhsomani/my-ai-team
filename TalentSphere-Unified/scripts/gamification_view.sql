-- TalentSphere Gamification Summary View
-- Aggregates user gamification data across multiple tables

CREATE OR REPLACE VIEW user_gamification_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.name,
    
    -- Streaks
    COALESCE(streak.current_streak, 0) AS current_streak,
    COALESCE(streak.longest_streak, 0) AS longest_streak,
    streak.last_active_date,
    
    -- Points and Level
    COALESCE(points.total_points, 0) AS total_points,
    FLOOR(COALESCE(points.total_points, 0) / 1000) + 1 AS level,
    COALESCE(points.points_this_week, 0) AS points_this_week,
    
    -- Badges
    COUNT(DISTINCT ub.id) AS badge_count,
    COUNT(DISTINCT CASE WHEN ub.earned_at > NOW() - INTERVAL '30 days' THEN ub.id END) AS recent_badges,
    
    -- Achievements
    COUNT(DISTINCT ua.id) AS achievement_count,
    
    -- Learning Progress
    COALESCE(enrollment.courses_enrolled, 0) AS courses_enrolled,
    COALESCE(enrollment.courses_completed, 0) AS courses_completed,
    COALESCE(enrollment.total_lessons, 0) AS lessons_completed,
    
    -- Challenges
    COALESCE(challenge.submissions, 0) AS challenge_submissions,
    COALESCE(challenge.passed, 0) AS challenges_passed

FROM users u
LEFT JOIN (
    SELECT user_id, 
           current_streak,
           longest_streak,
           last_active_date
    FROM user_streaks
) streak ON u.id = streak.user_id
LEFT JOIN (
    SELECT user_id,
           SUM(points) AS total_points,
           SUM(CASE WHEN earned_at > NOW() - INTERVAL '7 days' THEN points ELSE 0 END) AS points_this_week
    FROM user_points
    GROUP BY user_id
) points ON u.id = points.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN (
    SELECT user_id,
           COUNT(*) AS courses_enrolled,
           COUNT(CASE WHEN completed THEN 1 END) AS courses_completed,
           COUNT(CASE WHEN completed THEN 1 END) * 10 AS total_lessons
    FROM enrollments
    GROUP BY user_id
) enrollment ON u.id = enrollment.user_id
LEFT JOIN (
    SELECT user_id,
           COUNT(*) AS submissions,
           COUNT(CASE WHEN passed THEN 1 END) AS passed
    FROM challenge_submissions
    GROUP BY user_id
) challenge ON u.id = challenge.user_id

GROUP BY 
    u.id, u.email, u.name,
    streak.current_streak, streak.longest_streak, streak.last_active_date,
    points.total_points, points.points_this_week,
    enrollment.courses_enrolled, enrollment.courses_completed, enrollment.total_lessons,
    challenge.submissions, challenge.passed;

-- Indexes for performance
CREATE INDEX idx_gamification_user ON user_gamification_summary(user_id);
CREATE INDEX idx_gamification_level ON user_gamification_summary(level);
CREATE INDEX idx_gamification_streak ON user_gamification_summary(current_streak DESC);