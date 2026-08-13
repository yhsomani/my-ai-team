# TalentSphere Product Feature Catalog

> Documentation status: Current feature catalog. Derived from `docs/FEATURES_AND_DASHBOARDS.md` and repository discovery.

This file maps the complete product capabilities and their implementation status across the repository.

## 1. Feature Status Matrix

| Feature | Domain | Business Objective | Target User | Current State | Action |
| --- | --- | --- | --- | --- | --- |
| Landing Page | Marketing | Public entry and platform stats | Public | IMPLEMENTED | KEEP |
| Authentication | Auth | Secure user sign-in/registration | Public | IMPLEMENTED | REFACTOR (ADR-001) |
| Talent Dashboard | Core | Central hub for talent workflows | Talent | IMPLEMENTED | KEEP |
| Recruiter Dashboard | Core | Central hub for hiring workflows | Recruiter | IMPLEMENTED | KEEP |
| Admin Console | Ops | Platform health and service status | Admin | IMPLEMENTED | KEEP |
| Job Discovery | Jobs | Search and browse active jobs | Talent | IMPLEMENTED | REFACTOR |
| Job Applications | Applications | Apply to jobs and track status | Talent | IMPLEMENTED | REFACTOR |
| Job Posting | Jobs | Create and publish job listings | Recruiter | IMPLEMENTED | REFACTOR |
| Candidate Review | Applications | Review applicants and manage pipeline | Recruiter | IMPLEMENTED | REFACTOR |
| LMS Catalog | Learning | Course discovery and enrollment | Talent | IMPLEMENTED | REBUILD (Mongo -> Postgres) |
| LMS Progress | Learning | Track course/lesson completion | Talent | IMPLEMENTED | REBUILD |
| Challenges | Assessment | Coding challenges and workspaces | Talent | IMPLEMENTED | REFACTOR (Async judge) |
| Networking | Network | People suggestions and connection requests | Talent/Recruiter | IMPLEMENTED | REFACTOR |
| Messaging | Chat | Direct conversations and stream | Talent/Recruiter | IMPLEMENTED | KEEP (ADR-004) |
| Profile Builder | Profile | Manage skills, experience, education | Talent/Recruiter | IMPLEMENTED | REFACTOR |
| Resume Editor | Resume | Create and export resumes | Talent | IMPLEMENTED | REFACTOR |
| AI Assistant | AI | Chat-style career guidance | Talent/Recruiter | IMPLEMENTED | KEEP |
| Career Path | AI | Generated path guidance | Talent | IMPLEMENTED | KEEP |
| Billing & Payments | Billing | Manage subscription plans | Talent/Recruiter | IMPLEMENTED | KEEP (ADR-005) |
| Settings | Account | Notification, security, profile settings | All Authenticated | IMPLEMENTED | KEEP |

## 2. Feature Gaps and Missing Capabilities
- **Onboarding:** No guided onboarding or profile completeness wizard.
- **Job Recommendations:** Backend-owned recommendation ranking is missing.
- **Robust Real-time Chat:** STOMP/WebSocket behavior is currently unverified or orphaned (ADR-004).
- **Billing Live Mode:** Requires webhook implementations to be production ready.

## 3. Module Mapping
Features are mapped to backend services (e.g., `job-service`, `application-service`, `lms-service`, `auth-service`, `messaging-service`) and the unified frontend React/Vite app. Direct Supabase access is currently present but identified as migration debt (ADR-003).
