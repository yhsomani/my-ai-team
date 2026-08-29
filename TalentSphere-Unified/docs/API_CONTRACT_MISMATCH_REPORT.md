# API Contract Mismatch Report

> Documentation status: Generated current report. Regenerate with `npm run report:api-contracts`; do not hand-edit route inventory tables.

Generated: 2026-06-26T20:43:36.343Z

Source: `npm run report:api-contracts` scans frontend `apiClient` calls, Spring controller mappings, API Gateway path predicates, security matcher strings, direct Supabase table access, and `module-manifest.json` backend module classification.

This is a static analysis report. It is intentionally conservative: dynamic routes, service-to-service calls, Supabase direct access, runtime service discovery, and runtime serialization still need manual review or integration coverage. Request/response payload shapes are covered by the source-derived `docs/API_OPENAPI_CONTRACT.json` companion contract.

The `Generated` value is preserved between runs unless `API_CONTRACT_REPORT_GENERATED_AT` is set, so CI can verify report drift deterministically.

## Summary

| Metric | Count |
| --- | --- |
| Frontend API client calls | 19 |
| Active backend controller routes | 0 |
| Non-active backend controller routes | 0 |
| Total backend controller routes scanned | 0 |
| Gateway route prefixes | 19 |
| Security matcher paths | 19 |
| Direct Supabase tables used by frontend | 45 |
| Frontend calls without matching active controller | 19 |
| Active controller routes without gateway prefix | 0 |
| Legacy `/api/*` security matcher paths | 0 |

## Frontend Calls Without Matching Controller

| Method | Path | Status | Frontend location | Contract evidence |
| --- | --- | --- | --- | --- |
| POST | /api/v1/files/upload | Gateway route only | apps/frontend/src/services/fileUploadService.ts:46 | /api/v1/files/** (services/api-gateway/src/main/resources/application.yml:153) |
| DELETE | /api/v1/files | Gateway route only | apps/frontend/src/services/fileUploadService.ts:69 | /api/v1/files/** (services/api-gateway/src/main/resources/application.yml:153) |
| GET | /api/v1/jobs | Gateway route only | apps/frontend/src/services/jobService.ts:363 | /api/v1/jobs/** (services/api-gateway/src/main/resources/application.yml:57) |
| GET | /api/v1/jobs/{id} | Gateway route only | apps/frontend/src/services/jobService.ts:707 | /api/v1/jobs/** (services/api-gateway/src/main/resources/application.yml:57) |
| GET | /api/v1/lms/enrollments/{userId} | Gateway route only | apps/frontend/src/services/lmsService.ts:312 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/courses | Gateway route only | apps/frontend/src/services/lmsService.ts:346 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/courses/{courseId} | Gateway route only | apps/frontend/src/services/lmsService.ts:407 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/courses/{courseId}/lessons | Gateway route only | apps/frontend/src/services/lmsService.ts:413 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/courses/slug/{slug} | Gateway route only | apps/frontend/src/services/lmsService.ts:445 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| POST | /api/v1/lms/courses/{courseId}/enroll | Gateway route only | apps/frontend/src/services/lmsService.ts:451 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/enrollments/{userId} | Gateway route only | apps/frontend/src/services/lmsService.ts:469 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| POST | /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete | Gateway route only | apps/frontend/src/services/lmsService.ts:485 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/lms/courses/{courseId}/enrollment | Gateway route only | apps/frontend/src/services/lmsService.ts:886 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| POST | /api/v1/lms/courses | Gateway route only | apps/frontend/src/services/lmsService.ts:1047 | /api/v1/lms/** (services/api-gateway/src/main/resources/application.yml:63) |
| GET | /api/v1/networking/suggestions/{encodeURIComponent(userId)} | Gateway route only | apps/frontend/src/services/networkingService.ts:259 | /api/v1/networking/** (services/api-gateway/src/main/resources/application.yml:129) |
| GET | /api/v1/networking/feed | Gateway route only | apps/frontend/src/services/networkingService.ts:434 | /api/v1/networking/** (services/api-gateway/src/main/resources/application.yml:129) |
| GET | /api/v1/networking/feed | Gateway route only | apps/frontend/src/services/networkingService.ts:507 | /api/v1/networking/** (services/api-gateway/src/main/resources/application.yml:129) |
| GET | /api/v1/networking/connections/{param} | Gateway route only | apps/frontend/src/services/networkingService.ts:692 | /api/v1/networking/** (services/api-gateway/src/main/resources/application.yml:129) |
| GET | /api/v1/notifications/user/{userId} | Gateway route only | apps/frontend/src/services/notificationService.ts:390 | /api/v1/notifications/** (services/api-gateway/src/main/resources/application.yml:93) |

## Matched Frontend Calls

No matched frontend API client calls were found.

## Controller Routes Without Gateway Prefix

Every scanned controller route is covered by an API Gateway path prefix.

## Non-Active Backend Controller Routes

No orphaned or unclassified backend controller routes were found.

## Controller Routes Not Used By Frontend API Client

Every scanned controller route is referenced by the frontend API client.

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
| challenges | apps/frontend/src/pages/LandingPage.tsx, apps/frontend/src/services/challengeService.ts, apps/frontend/src/services/dashboardService.ts |
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
| profiles | apps/frontend/src/pages/LandingPage.tsx, apps/frontend/src/services/adminService.ts, apps/frontend/src/services/aiService.ts, apps/frontend/src/services/messagingService.ts, apps/frontend/src/services/networkingService.ts, apps/frontend/src/services/profileService.ts, apps/frontend/src/services/recruiterService.ts, apps/frontend/src/services/settingsService.ts |
| resume_artifacts | apps/frontend/src/services/profileService.ts |
| resume_export_events | apps/frontend/src/services/profileService.ts |
| saved_job_searches | apps/frontend/src/services/jobService.ts |
| skills | apps/frontend/src/services/profileService.ts |
| subscription_plans | apps/frontend/src/services/paymentService.ts |
| subscriptions | apps/frontend/src/services/paymentService.ts, apps/frontend/src/services/settingsService.ts |
| system_settings | apps/frontend/src/services/adminService.ts |
| user_badges | apps/frontend/src/services/gamificationService.ts |
| user_profiles | apps/frontend/src/services/dashboardService.ts, apps/frontend/src/services/jobService.ts, apps/frontend/src/services/networkingService.ts, apps/frontend/src/services/profileService.ts, apps/frontend/src/services/settingsService.ts |
| xp_transactions | apps/frontend/src/services/gamificationService.ts |

## Follow-Up Priorities

1. Fix or remove frontend API calls listed under unmatched controller coverage before relying on API Gateway fallback paths.
2. Keep controller route gateway coverage at 100% as services add new `/api/v1/*` controllers.
3. Keep legacy `/api/*` security matcher paths at zero.
4. Keep orphaned or unclassified backend controller routes at zero.
5. Decide which direct Supabase data paths should remain client-owned and which should move behind audited service APIs.
6. Use `docs/API_OPENAPI_CONTRACT.json` as input to typed API-client generation and add runtime Springdoc/OpenAPI smoke tests when backend execution is available.

