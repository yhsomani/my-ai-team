package com.talentsphere.shared.config;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public enum Feature {
    // =============================================================================
    // CORE FEATURES - Always Enabled (foundation of the platform)
    // =============================================================================
    enable_auth(true, "Authentication and authorization"),
    enable_user_management(true, "User account management"),
    enable_profile_management(true, "User profile CRUD operations"),

    // =============================================================================
    // JOB & APPLICATION FEATURES
    // =============================================================================
    enable_job_listings(true, "Job posting and listing"),
    enable_job_search(true, "Job search functionality"),
    enable_job_recommendations(false, "AI-powered job recommendations"),
    enable_job_applications(true, "Job application system"),
    enable_application_tracking(false, "Application pipeline tracking"),

    // =============================================================================
    // COMPANY FEATURES
    // =============================================================================
    enable_company_profiles(true, "Company profile pages"),
    enable_company_verification(false, "Company verification system"),
    enable_company_search(true, "Search companies"),

    // =============================================================================
    // LMS & LEARNING FEATURES
    // =============================================================================
    enable_courses(true, "Course management"),
    enable_course_enrollment(true, "Course enrollment"),
    enable_course_progress(true, "Progress tracking"),
    enable_learning_paths(false, "Learning path recommendations"),
    enable_course_certificates(false, "Course completion certificates"),

    // =============================================================================
    // CHALLENGE & GAMIFICATION FEATURES
    // =============================================================================
    enable_coding_challenges(false, "Coding challenge system"),
    enable_leaderboards(false, "Gamification leaderboards"),
    enable_achievements(false, "User achievements and badges"),
    enable_xp_system(false, "Experience points system"),

    // =============================================================================
    // AI FEATURES
    // =============================================================================
    enable_ai_resume_analysis(false, "AI resume analysis"),
    enable_ai_job_matching(false, "AI job matching"),
    enable_ai_interview_prep(false, "AI interview preparation"),

    // =============================================================================
    // NOTIFICATION FEATURES
    // =============================================================================
    enable_notifications(true, "In-app notifications"),
    enable_email_notifications(false, "Email notifications"),
    enable_push_notifications(false, "Push notifications"),

    // =============================================================================
    // MESSAGING & NETWORKING FEATURES
    // =============================================================================
    enable_messaging(true, "Direct messaging"),
    enable_chat(false, "Real-time chat"),
    enable_connections(true, "Professional networking"),
    enable_posts(false, "Social posts and feed"),

    // =============================================================================
    // SEARCH FEATURES
    // =============================================================================
    enable_global_search(true, "Global search across platform"),
    enable_elasticsearch(true, "Elasticsearch-powered search"),

    // =============================================================================
    // PAYMENT FEATURES
    // =============================================================================
    enable_payments(false, "Payment processing"),
    enable_subscriptions(false, "Premium subscriptions"),
    enable_premium_features(false, "Premium feature access"),

    // =============================================================================
    // VIDEO & MEDIA FEATURES
    // =============================================================================
    enable_video_content(false, "Video course content"),
    enable_video_interviews(false, "Video interview system"),

    // =============================================================================
    // ANALYTICS FEATURES
    // =============================================================================
    enable_analytics(false, "Platform analytics"),
    enable_user_analytics(false, "User activity analytics"),
    enable_employer_analytics(false, "Employer dashboard analytics");

    private final boolean defaultEnabled;
    private final String description;

    Feature(boolean defaultEnabled, String description) {
        this.defaultEnabled = defaultEnabled;
        this.description = description;
    }

    public boolean isDefaultEnabled() {
        return defaultEnabled;
    }

    public String getDescription() {
        return description;
    }

    public String getFlagName() {
        return "enable_" + this.name().toLowerCase();
    }

    public static Optional<Feature> fromFlagName(String flagName) {
        return Arrays.stream(values())
                .filter(f -> f.getFlagName().equalsIgnoreCase(flagName))
                .findFirst();
    }

    public static List<Feature> getCoreFeatures() {
        return Arrays.asList(enable_auth, enable_user_management, enable_profile_management);
    }

    public static List<Feature> getEnabledByDefault() {
        return Arrays.stream(values())
                .filter(Feature::isDefaultEnabled)
                .toList();
    }

    public static List<Feature> getDisabledByDefault() {
        return Arrays.stream(values())
                .filter(f -> !f.isDefaultEnabled())
                .toList();
    }
}
