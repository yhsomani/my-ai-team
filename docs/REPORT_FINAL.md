# TalentSphere Codebase Complete Feature Inventory # TalentSphere Codebase Complete Feature Inventory & Analysis Report Analysis Report

> Documentation status: Current architecture report reference.


## 1. Executive Summary
This report provides a comprehensive, evidence-based analysis of the TalentSphere-Unified repository. The system is a hybrid B2B/B2C career platform. It consists of a React/Vite frontend, a 19-service Java backend, a Supabase PostgreSQL database, and a Chrome extension.
**Crucial Finding:** The architecture is currently in a state of severe "split-brain" divergence. The frontend operates primarily as a thick client connecting directly to Supabase via PostgREST, leaving the vast majority of the 123 active Java microservice endpoints redundant or bypassed.

## 2. Technology Stack
*   **Frontend (Web App):** React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Router DOM, Playwright, Vitest.
*   **Frontend (Chrome Extension):** Manifest V3, TypeScript.
*   **Backend (Microservices):** Java 21, Spring Boot 3.4.0+, Spring Security (OAuth2 Resource Server), Spring Data JPA, Micrometer, Maven.
*   **Database & Auth:** Supabase (PostgreSQL 15+), Supabase Auth (JWT), PostgREST, Row Level Security (RLS).
*   **Infrastructure:** Docker, Docker Compose.

## 3. Repository Structure
*   `apps/frontend/`: The React web application.
*   `chrome-extension-project/`: The browser companion.
*   `services/`: The Java backend ecosystem.
    *   `bom/`, `service-parent/`, `shared-*`: Shared libraries and configuration.
    *   `api-gateway`: Entry point for the service layer.
    *   18 Domain Services: `ai`, `application`, `auth`, `challenge`, `chat`, `company`, `file`, `gamification`, `job`, `lms`, `messaging`, `networking`, `notification`, `payment`, `profile`, `search`, `user`, `video`.
*   `docs/`: Extensive architectural documentation (ADRs, manifests).
*   `infra/`: Infrastructure definitions.
*   `supabase-schema.sql`: Authoritative schema definition.

## 4. Architecture Overview
The platform employs a **Hybrid Architecture** with conflicting data access patterns:
1.  **Identity:** Supabase Auth is the absolute authority.
2.  **Path A: Direct Supabase Access (Primary):** The frontend relies heavily on the `@supabase/supabase-js` client to query and mutate data directly via PostgREST. Security is handled via PostgreSQL Row Level Security (RLS) policies. `docs/DATA_OWNERSHIP.md` confirms 45 tables are accessed this way.
3.  **Path B: API Gateway -> Microservices (Secondary):** The frontend uses Axios to send requests (with JWTs) to the Java microservices for specific, complex operations (e.g., file uploads).

## 5. Complete Feature Inventory & Analysis

### 5.1 Authentication & Onboarding
*   **Feature:** Registration & Login (`/register`, `/login`)
*   **Purpose:** Identity provisioning and session management.
*   **Implementation:** React components dispatch to Redux `authSlice`.
*   **Data Flow:** Calls Supabase Auth. Triggers likely populate the `profiles` table.
*   **State:** Fully implemented (replaced legacy internal auth).

### 5.2 Application Shell & Dashboard
*   **Feature:** Role-Based Navigation & Dashboard (`/dashboard`)
*   **Purpose:** Provide context-aware navigation (`ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN`).
*   **Implementation:** `ResponsiveLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `DashboardPage.tsx`. Uses a centralized `routeRegistry.ts`.
*   **State:** Fully implemented.

### 5.3 Jobs & Applicant Tracking (ATS)
*   **Feature:** Job Discovery, Posting, & Application Review (`/jobs`, `/jobs/post`, `/candidates`)
*   **Purpose:** Two-sided marketplace for talent and recruiters.
*   **Implementation:** `JobsPage.tsx`, `PostJobPage.tsx`, `CandidatesPage.tsx`, `jobService.ts`.
*   **Data Flow:** Direct Supabase interaction (Tables: `jobs`, `job_applications`, `candidate_notes`).
*   **Note:** The `job-service` and `application-service` Java modules are largely bypassed.

### 5.4 Learning Management System (LMS)
*   **Feature:** Course Catalog & Progress Tracking (`/lms`)
*   **Purpose:** Host educational content.
*   **Implementation:** `LMSPage.tsx`, `lmsService.ts`.
*   **Data Flow:** Hybrid. `docs/API_CONTRACT_MISMATCH_REPORT.md` shows `GET /api/v1/lms/enrollments/{userId}` hitting the `lms-service` backend, alongside direct Supabase queries for courses.

### 5.5 Gamification (Challenges)
*   **Feature:** Coding Challenges Arena (`/challenges`)
*   **Purpose:** Interactive assessments and leaderboards.
*   **Implementation:** `ChallengesPage.tsx`.
*   **Data Flow:** Direct Supabase queries (`challenges`, `challenge_submissions`, `leaderboard`).

### 5.6 Networking & Messaging
*   **Feature:** Connections & Direct Messages (`/networking`, `/messaging`)
*   **Purpose:** Professional social graph and communication.
*   **Implementation:** `NetworkingPage.tsx`, `MessagingPage.tsx`.
*   **Data Flow:** Tables `connections`, `conversations`, `messages`. `networking-service` generates suggestions, but basic CRUD is likely direct-to-database.

### 5.7 AI Career Assistant
*   **Feature:** AI Guidance & Career Pathing (`/ai`, `/career-path`)
*   **Purpose:** Automated career advice.
*   **Implementation:** `AIAssistant.tsx`, `AICareerPath.tsx`.
*   **Data Flow:** Proxied through Supabase Edge Functions or backend RPC calls.

### 5.8 File Management
*   **Feature:** Resumes & Attachments Upload
*   **Implementation:** `fileUploadService.ts`.
*   **Data Flow:** Frontend -> API Gateway -> `file-service` (Java) -> AWS S3 (via AWS SDK v2).
*   **State:** Fully implemented (backend path confirmed active).

### 5.9 Chrome Extension Companion
*   **Feature:** External Job Tracker & Resume Matcher
*   **Purpose:** Extend platform functionality to other websites.
*   **Implementation:** Manifest V3 extension.
*   **Data Flow:** Primarily local browser storage; web sync is pending/unverified.

## 6. Feature Execution Flows (Example: Job Application)
1.  **Trigger:** User (ROLE_USER) clicks "Apply" on `/jobs`.
2.  **UI/Client:** `JobsPage.tsx` handles the event and calls `jobService.ts`.
3.  **Data Layer:** `jobService.ts` calls `supabase.from('job_applications').insert(...)`.
4.  **Security:** Supabase PostgREST evaluates RLS policies (ensuring user is authenticated and authorized).
5.  **Response:** Success updates local React/Redux state.

## 7. API Inventory
*   **Frontend API Client (Axios):** 19 explicit calls configured.
*   **Backend Active Routes:** 123 Spring MVC endpoints mapped across 19 services.
*   **Direct Database Access:** 45 distinct Supabase tables accessed directly by the frontend.

## 8. Database/Data Model Inventory
*   **Source of Truth:** `supabase-schema.sql`.
*   **Scope:** 59 Tables.
*   **Key Domains:** Identity (`profiles`), Core (`jobs`, `applications`), LMS (`courses`, `lessons`), Gamification (`challenges`), Social (`connections`, `messages`), Analytics (`product_analytics_events`).

## 9. Authentication & Authorization
*   **Auth Provider:** Supabase Auth (JWT).
*   **Frontend Guard:** `ProtectedRoute.tsx` enforces `USER_ROLES` defined in `routeRegistry.ts`.
*   **Backend Guard:** Spring Security `@PreAuthorize` evaluates JWT claims (via API Gateway).
*   **Database Guard:** Supabase RLS enforces data access rules at the row level.

## 10. External Integrations
*   **Supabase:** Primary datastore and auth.
*   **AWS:** Required by Java `file-service` for robust storage.

## 11. Configuration & Environment Behavior
*   **Backend Features:** `services/shared/src/main/java/com/talentsphere/shared/config/Feature.java` defines 40+ feature flags.
*   **Environment Setup:** `.env` for frontend; `application.yml` placeholders for backend services.

## 12. Background/Automatic Processes
*   Analytics ingestion (`product_analytics_events`).
*   Database seeding (`seed-data.sql`).

## 13. Testing & Quality Mechanisms
*   **Frontend:** Playwright (E2E), Vitest (Unit), strict ESLint.
*   **Backend:** Comprehensive JUnit testing across 19 services. Checkstyle/Spotless enforcement.

## 14. Feature Dependency Map
*   **Data Read/Write:** Component -> Supabase JS Client -> PostgreSQL (RLS).
*   **Complex Actions (e.g., Files):** Component -> Axios Client -> API Gateway -> Java Microservice -> External Storage.

## 15. Implemented vs Partial vs Missing
*   **Implemented:** Core UI shell, routing, auth, direct-DB CRUD operations (Jobs, LMS, Messaging).
*   **Implemented but Disconnected:** The vast majority of the 123 backend Java endpoints.
*   **Missing/Unverified:** External AI provider API keys/implementations. Extension web-sync.

## 16. Dead/Unused/Redundant Functionality
*   **The Microservice Fleet:** The repository contains a massive amount of redundant code. Because the frontend accesses 45 tables directly via Supabase, the corresponding Spring Data JPA repositories and REST controllers in the Java services are effectively dead code in the context of the primary web application.

## 17. Technical Risks & Architectural Issues
*   **Split-Brain Architecture:** Business logic and security rules are dangerously fractured between frontend components, Supabase RLS policies, and bypassed Java services.
*   **Operational Overhead:** Maintaining 19 Dockerized Java microservices that serve only a fraction of the application's actual traffic is highly inefficient.

## 18. Feature-to-Code Traceability Matrix
*   *Platform Shell:* `apps/frontend/src/App.tsx`, `routeRegistry.ts`
*   *Authentication:* `apps/frontend/src/pages/LoginPage.tsx` -> Redux `authSlice` -> Supabase
*   *Jobs:* `apps/frontend/src/pages/JobsPage.tsx` -> `jobService.ts` -> Supabase `jobs` table
*   *File Upload:* `fileUploadService.ts` -> API Gateway -> `file-service`

## 19. Unverified Areas / Evidence Gaps
*   The exact utilization of the 123 Java backend routes by secondary clients (if any exist outside the primary web app).
*   The specific mechanics of the AI integrations (prompts, provider endpoints) as they likely rely on external configuration not present in the repository.
