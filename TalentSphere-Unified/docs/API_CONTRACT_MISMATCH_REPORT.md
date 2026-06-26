# API Contract Mismatch Report

Generated: 2026-06-26T19:04:09.369Z

Source: `npm run report:api-contracts` scans frontend `apiClient` calls, Spring controller mappings, API Gateway path predicates, security matcher strings, and direct Supabase table access.

This is a static analysis report. It is intentionally conservative: dynamic routes, service-to-service calls, Supabase direct access, and request/response payload shapes still need manual contract review or OpenAPI coverage.

## Summary

| Metric | Count |
| --- | --- |
| Frontend API client calls | 19 |
| Backend controller routes | 126 |
| Gateway route prefixes | 20 |
| Security matcher paths | 18 |
| Direct Supabase tables used by frontend | 45 |
| Frontend calls without matching controller | 0 |
| Controller routes without gateway prefix | 0 |
| Legacy `/api/*` security matcher paths | 0 |

## Frontend Calls Without Matching Controller

No unmatched frontend API client calls were found.

## Matched Frontend Calls

| Method | Frontend path | Controller path | Frontend location | Controller location |
| --- | --- | --- | --- | --- |
| POST | /api/v1/files/upload | POST /api/v1/files/upload | apps/frontend/src/services/fileUploadService.ts:46 | upload (services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java:22) |
| DELETE | /api/v1/files | DELETE /api/v1/files | apps/frontend/src/services/fileUploadService.ts:69 | delete (services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java:40) |
| GET | /api/v1/jobs | GET /api/v1/jobs | apps/frontend/src/services/jobService.ts:308 | getActiveJobs (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:18) |
| GET | /api/v1/jobs/{id} | GET /api/v1/jobs/{id} | apps/frontend/src/services/jobService.ts:644 | getJobById (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:52) |
| GET | /api/v1/lms/enrollments/{userId} | GET /api/v1/lms/enrollments/{userId} | apps/frontend/src/services/lmsService.ts:247 | getUserEnrollments (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:78) |
| GET | /api/v1/lms/courses | GET /api/v1/lms/courses | apps/frontend/src/services/lmsService.ts:281 | list (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:21) |
| GET | /api/v1/lms/courses/{courseId} | GET /api/v1/lms/courses/{courseId} | apps/frontend/src/services/lmsService.ts:342 | getById (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:32) |
| GET | /api/v1/lms/courses/{courseId}/lessons | GET /api/v1/lms/courses/{courseId}/lessons | apps/frontend/src/services/lmsService.ts:348 | getLessons (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:42) |
| GET | /api/v1/lms/courses/slug/{slug} | GET /api/v1/lms/courses/slug/{slug} | apps/frontend/src/services/lmsService.ts:380 | getBySlug (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:37) |
| POST | /api/v1/lms/courses/{courseId}/enroll | POST /api/v1/lms/courses/{courseId}/enroll | apps/frontend/src/services/lmsService.ts:386 | enroll (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:47) |
| GET | /api/v1/lms/enrollments/{userId} | GET /api/v1/lms/enrollments/{userId} | apps/frontend/src/services/lmsService.ts:404 | getUserEnrollments (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:78) |
| POST | /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete | POST /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete | apps/frontend/src/services/lmsService.ts:420 | completeLesson (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:63) |
| GET | /api/v1/lms/courses/{courseId}/enrollment | GET /api/v1/lms/courses/{courseId}/enrollment | apps/frontend/src/services/lmsService.ts:878 | getEnrollment (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:71) |
| POST | /api/v1/lms/courses | POST /api/v1/lms/courses | apps/frontend/src/services/lmsService.ts:1015 | create (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:26) |
| GET | /api/v1/networking/suggestions/{encodeURIComponent(userId)} | GET /api/v1/networking/suggestions/{userId} | apps/frontend/src/services/networkingService.ts:229 | getSuggestions (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:39) |
| GET | /api/v1/networking/feed | GET /api/v1/networking/feed | apps/frontend/src/services/networkingService.ts:404 | getFeed (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:51) |
| GET | /api/v1/networking/feed | GET /api/v1/networking/feed | apps/frontend/src/services/networkingService.ts:472 | getFeed (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:51) |
| GET | /api/v1/networking/connections/{param} | GET /api/v1/networking/connections/{userId} | apps/frontend/src/services/networkingService.ts:649 | getConnections (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:34) |
| GET | /api/v1/notifications/user/{userId} | GET /api/v1/notifications/user/{userId} | apps/frontend/src/services/notificationService.ts:357 | getNotifications (services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java:17) |

## Controller Routes Without Gateway Prefix

Every scanned controller route is covered by an API Gateway path prefix.

## Controller Routes Not Used By Frontend API Client

| Method | Controller path | Controller location |
| --- | --- | --- |
| POST | /api/v1/ai/analyze-resume | analyzeResume (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:17) |
| POST | /api/v1/ai/match-job | matchJob (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:22) |
| POST | /api/v1/ai/save-results | saveResults (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:27) |
| GET | /api/v1/ai/results/{userId} | getUserResults (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:37) |
| POST | /api/v1/ai/chat | getChatResponse (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:42) |
| GET | /api/v1/ai/career-path/{userId} | getCareerPath (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:48) |
| GET | /api/v1/ai/insights | getInsights (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:53) |
| GET | /api/v1/ai/health | health (services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java:58) |
| GET | /api/v1/admin/feature-flags | getAllFlags (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:22) |
| GET | /api/v1/admin/feature-flags/{flagName} | getFlag (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:27) |
| POST | /api/v1/admin/feature-flags/{flagName}/enable | enableFlag (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:48) |
| POST | /api/v1/admin/feature-flags/{flagName}/disable | disableFlag (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:54) |
| POST | /api/v1/admin/feature-flags/{flagName}/reset | resetFlag (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:60) |
| POST | /api/v1/admin/feature-flags/reset-all | resetAllFlags (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:69) |
| GET | /api/v1/admin/feature-flags/enabled | getEnabledFeatures (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:75) |
| GET | /api/v1/admin/feature-flags/core | getCoreFeatures (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:80) |
| GET | /api/v1/admin/feature-flags/categories | getFeaturesByCategory (services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java:85) |
| POST | /api/v1/applications | apply (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:18) |
| GET | /api/v1/applications/count/{userId} | getApplicationCount (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:23) |
| GET | /api/v1/applications/user/{userId} | getApplicationsByUserId (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:29) |
| GET | /api/v1/applications/job/{jobId} | getApplicationsByJobId (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:34) |
| PATCH | /api/v1/applications/{id}/status | updateStatus (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:39) |
| GET | /api/v1/applications/{id}/events | getStatusEvents (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:52) |
| GET | /api/v1/applications/health | health (services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java:57) |
| GET | /api/v1/recruiter/stats | getStats (services/application-service/src/main/java/com/talentsphere/application/controller/RecruiterController.java:20) |
| GET | /api/v1/recruiter/applications/recent | getRecentApplications (services/application-service/src/main/java/com/talentsphere/application/controller/RecruiterController.java:35) |
| POST | /api/v1/auth/register | register (services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java:21) |
| POST | /api/v1/auth/login | login (services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java:27) |
| GET | /api/v1/auth/health | health (services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java:33) |
| GET | /api/v1/auth/.well-known/jwks.json | getJwks (services/auth-service/src/main/java/com/talentsphere/auth/controller/JwksController.java:18) |
| GET | /api/v1/challenges | getAllChallenges (services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java:18) |
| GET | /api/v1/challenges/trending | getTrendingChallenges (services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java:23) |
| POST | /api/v1/challenges/submit | submitCode (services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java:28) |
| GET | /api/v1/challenges/health | health (services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java:37) |
| GET | /api/v1/chat/channel/{channelId} | getChannelMessages (services/chat-service/src/main/java/com/talentsphere/chat/controller/ChatController.java:31) |
| GET | /api/v1/chat/user/{userId} | getUserConversations (services/chat-service/src/main/java/com/talentsphere/chat/controller/ChatController.java:36) |
| GET | /api/v1/chat/health | health (services/chat-service/src/main/java/com/talentsphere/chat/controller/ChatController.java:41) |
| POST | /api/v1/companies | register (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:16) |
| GET | /api/v1/companies | list (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:22) |
| GET | /api/v1/companies/search | search (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:27) |
| GET | /api/v1/companies/user/{userId} | getByUser (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:32) |
| GET | /api/v1/companies/{id} | get (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:37) |
| PUT | /api/v1/companies/{id} | update (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:42) |
| POST | /api/v1/companies/{id}/verify | verify (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:47) |
| GET | /api/v1/companies/health | health (services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java:53) |
| GET | /api/v1/files/download/{folder}/{fileName:.+} | download (services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java:28) |
| GET | /api/v1/files/health | health (services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java:45) |
| GET | /api/v1/gamification/stats/{userId} | getStats (services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java:16) |
| GET | /api/v1/gamification/leaderboard | leaderboard (services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java:21) |
| GET | /api/v1/gamification/achievements/{userId} | achievements (services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java:26) |
| POST | /api/v1/gamification/achievements | grant (services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java:31) |
| GET | /api/v1/gamification/health | health (services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java:36) |
| GET | /api/v1/jobs/featured | getFeaturedJobs (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:23) |
| POST | /api/v1/jobs | postJob (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:28) |
| GET | /api/v1/jobs/search | searchJobs (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:34) |
| GET | /api/v1/jobs/search/advanced | searchJobsAdvanced (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:39) |
| GET | /api/v1/jobs/recommended | getRecommendedJobs (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:46) |
| GET | /api/v1/jobs/health | health (services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java:57) |
| POST | /api/v1/lms/courses/{courseId}/enrollments/start | startCourse (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:53) |
| POST | /api/v1/lms/courses/{courseId}/enrollments/drop | dropCourse (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:58) |
| GET | /api/v1/lms/learning-paths | getAllLearningPaths (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:84) |
| GET | /api/v1/lms/courses/{courseId}/learning-paths | getLearningPaths (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:89) |
| GET | /api/v1/lms/health | health (services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java:94) |
| POST | /api/v1/messages/send | sendMessage (services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java:18) |
| GET | /api/v1/messages/conversation | getConversation (services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java:23) |
| GET | /api/v1/messages/unread/count/{userId} | getUnreadCount (services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java:28) |
| PATCH | /api/v1/messages/read | markAsRead (services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java:34) |
| GET | /api/v1/messages/health | health (services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java:40) |
| POST | /api/v1/networking/connect | requestConnection (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:21) |
| POST | /api/v1/networking/connections/accept/{id} | acceptConnection (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:28) |
| POST | /api/v1/networking/posts | createPost (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:46) |
| POST | /api/v1/networking/posts/like/{postId} | likePost (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:56) |
| GET | /api/v1/networking/health | health (services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java:61) |
| GET | /api/v1/notifications/user/{userId}/unread-count | getUnreadCount (services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java:22) |
| PATCH | /api/v1/notifications/{id}/read | markAsRead (services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java:27) |
| PATCH | /api/v1/notifications/user/{userId}/read-all | markAllAsRead (services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java:33) |
| GET | /api/v1/notifications/health | health (services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java:39) |
| POST | /api/v1/payments/checkout | createSession (services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java:24) |
| GET | /api/v1/payments/status/{sessionId} | getStatus (services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java:30) |
| GET | /api/v1/payments/history/{userId} | getHistory (services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java:35) |
| GET | /api/v1/payments/plans | getPlans (services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java:41) |
| GET | /api/v1/payments/health | health (services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java:46) |
| GET | /api/v1/profile/{userId} | getProfile (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:26) |
| PUT | /api/v1/profile/{userId} | updateProfile (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:33) |
| GET | /api/v1/profile/{userId}/skills | getSkills (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:42) |
| POST | /api/v1/profile/{userId}/skills | addSkill (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:49) |
| DELETE | /api/v1/profile/{userId}/skills/{skillId} | deleteSkill (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:58) |
| GET | /api/v1/profile/{userId}/experience | getExperience (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:68) |
| POST | /api/v1/profile/{userId}/experience | addExperience (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:75) |
| DELETE | /api/v1/profile/{userId}/experience/{experienceId} | deleteExperience (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:84) |
| GET | /api/v1/profile/{userId}/education | getEducation (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:94) |
| POST | /api/v1/profile/{userId}/education | addEducation (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:101) |
| GET | /api/v1/profile/health | health (services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java:110) |
| GET | /api/v1/search/jobs | searchJobs (services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java:23) |
| GET | /api/v1/search/profiles | searchProfiles (services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java:31) |
| GET | /api/v1/search/profiles/skills | searchProfilesBySkills (services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java:41) |
| GET | /api/v1/search/health | health (services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java:49) |
| GET | /api/v1/admin/stats | getStats (services/user-service/src/main/java/com/talentsphere/user/controller/AdminController.java:20) |
| GET | /api/v1/admin/public/stats | getPublicStats (services/user-service/src/main/java/com/talentsphere/user/controller/AdminController.java:48) |
| GET | /api/v1/users/{id} | getProfile (services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java:17) |
| GET | /api/v1/users | getAllUsers (services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java:24) |
| PUT | /api/v1/users/{id} | updateProfile (services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java:31) |
| DELETE | /api/v1/users/{id} | deleteProfile (services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java:42) |
| GET | /api/v1/users/health | health (services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java:50) |
| POST | /api/v1/video/schedule | scheduleInterview (services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java:19) |
| GET | /api/v1/video/session/{sessionId} | getSession (services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java:28) |
| POST | /api/v1/video/session/{sessionId}/start | startSession (services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java:33) |
| POST | /api/v1/video/session/{sessionId}/end | endSession (services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java:38) |
| GET | /api/v1/video/session/{sessionId}/token | getRoomToken (services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java:45) |

## Legacy Security Matcher Paths

No legacy `/api/*` security matcher paths were found.

## Direct Supabase Tables Used By Frontend

| Table | Frontend files |
| --- | --- |
| ai_sessions | apps/frontend/src/services/aiService.ts |
| application_draft_versions | apps/frontend/src/services/applicationService.ts |
| application_drafts | apps/frontend/src/services/applicationService.ts |
| application_status_events | apps/frontend/src/services/applicationService.ts, apps/frontend/src/services/recruiterService.ts |
| audit_log | apps/frontend/src/services/adminService.ts |
| automation_suggestion_audit_events | apps/frontend/src/lib/automationSuggestionAudit.ts |
| automation_suggestions | apps/frontend/src/services/aiService.ts |
| candidate_notes | apps/frontend/src/services/recruiterService.ts |
| candidate_scorecards | apps/frontend/src/services/recruiterService.ts |
| challenge_submissions | apps/frontend/src/services/challengeService.ts |
| challenges | apps/frontend/src/services/challengeService.ts, apps/frontend/src/services/dashboardService.ts |
| companies | apps/frontend/src/services/companyService.ts, apps/frontend/src/services/recruiterService.ts |
| connections | apps/frontend/src/services/networkingService.ts |
| conversation_participants | apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/messagingService.ts |
| conversations | apps/frontend/src/services/messagingService.ts |
| courses | apps/frontend/src/services/aiService.ts, apps/frontend/src/services/lmsService.ts |
| educations | apps/frontend/src/services/profileService.ts |
| enrollments | apps/frontend/src/services/lmsService.ts |
| experiences | apps/frontend/src/services/profileService.ts |
| hidden_explore_jobs | apps/frontend/src/services/jobService.ts |
| job_applications | apps/frontend/src/services/adminService.ts, apps/frontend/src/services/applicationService.ts, apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/jobService.ts, apps/frontend/src/services/recruiterService.ts |
| job_post_draft_versions | apps/frontend/src/services/jobService.ts |
| job_post_templates | apps/frontend/src/services/jobService.ts |
| jobs | apps/frontend/src/pages/LandingPage.tsx, apps/frontend/src/services/aiService.ts, apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/jobService.ts, apps/frontend/src/services/recruiterService.ts |
| leaderboard | apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/gamificationService.ts |
| lesson_progress | apps/frontend/src/services/lmsService.ts |
| lessons | apps/frontend/src/services/lmsService.ts |
| messages | apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/messagingService.ts |
| networking_suggestion_preferences | apps/frontend/src/services/networkingService.ts |
| notification_digest_items | apps/frontend/src/services/notificationDigestService.ts |
| notification_settings | apps/frontend/src/services/settingsService.ts |
| notifications | apps/frontend/src/services/notificationService.ts |
| payments | apps/frontend/src/services/paymentService.ts, apps/frontend/src/services/settingsService.ts |
| product_analytics_events | apps/frontend/src/lib/productAnalytics.ts, apps/frontend/src/services/adminService.ts |
| profiles | apps/frontend/src/pages/LandingPage.tsx, apps/frontend/src/services/adminService.ts, apps/frontend/src/services/aiService.ts, apps/frontend/src/services/gamificationService.ts, apps/frontend/src/services/messagingService.ts, apps/frontend/src/services/networkingService.ts, apps/frontend/src/services/profileService.ts, apps/frontend/src/services/recruiterService.ts, apps/frontend/src/services/settingsService.ts |
| resume_artifacts | apps/frontend/src/services/profileService.ts |
| resume_export_events | apps/frontend/src/services/profileService.ts |
| saved_job_searches | apps/frontend/src/services/jobService.ts |
| skills | apps/frontend/src/services/profileService.ts |
| subscription_plans | apps/frontend/src/services/paymentService.ts |
| subscriptions | apps/frontend/src/services/paymentService.ts, apps/frontend/src/services/settingsService.ts |
| system_settings | apps/frontend/src/services/adminService.ts |
| user_badges | apps/frontend/src/services/gamificationService.ts |
| user_profiles | apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/jobService.ts, apps/frontend/src/services/networkingService.ts, apps/frontend/src/services/profileService.ts |
| xp_transactions | apps/frontend/src/services/gamificationService.ts |

## Follow-Up Priorities

1. Keep unmatched frontend API client calls at zero as new gateway fallbacks are added.
2. Keep controller route gateway coverage at 100% as services add new `/api/v1/*` controllers.
3. Keep legacy `/api/*` security matcher paths at zero.
4. Decide which direct Supabase data paths should remain client-owned and which should move behind audited service APIs.
5. Use this report as input to OpenAPI generation or typed API-client generation so payload shapes can be validated, not just routes.

