# TalentSphere Business Requirements Document (BRD v3.0)

> Documentation status: Canonical business baseline. Reconciled with codebase on 2026-09-08.

## 1. Business Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| BO-1 | Build a unified career platform combining networking, jobs, learning, and challenges | 25 major features shipped (22 fully implemented, 1 partial, 2 new) |
| BO-2 | Achieve product-market fit with candidate and recruiter personas | Active user growth (LMS enrollment, job applications, networking connections) |
| BO-3 | Generate revenue via subscription billing | Stripe integration (currently demo mode per ADR-005) |
| BO-4 | Establish a gamification system to drive engagement | XP ledger, badges, leaderboard (F-23) |
| BO-5 | Ensure platform trust and safety | Content reporting, moderation queue (F-24) |
| BO-6 | Provide AI-powered career assistance | Rule-based heuristics with review-gated draft lifecycle |
| BO-7 | Maintain enterprise-grade security | 119 RLS policies, RBAC, CSP headers, rate limiting |
| BO-8 | Deliver a scalable, observable system | Prometheus metrics, Grafana dashboards, 12 alerts |

## 2. Stakeholder Personas

| Persona | Role | Primary Goals | Key Features |
|---------|------|---------------|--------------|
| **P-A: Aisha** | Job Seeker (ROLE_USER) | Find jobs, build profile, learn skills | Jobs, Profile, LMS, Challenges, Messaging |
| **P-B: Rohan** | Recruiter (ROLE_RECRUITER) | Post jobs, review candidates, track pipeline | PostJob, Candidates, Analytics, Billing |
| **P-C: Priya** | Admin (ROLE_ADMIN) | Monitor platform, enforce policies, manage users | AdminConsole, Analytics, Trust&Safety |
| **P-D: Dev** | Developer/Technical Candidate | Solve challenges, showcase skills | Challenges, ResumeBuilder, Portfolio |

## 3. Monetization Model

| Component | Status | Decision |
|-----------|--------|----------|
| Subscription Plans | Schema implemented | `subscription_plans`, `subscriptions`, `payments` tables |
| Stripe Integration | Scaffolded, demo mode | ADR-005: `billingMode = 'demo'`, provider charging inert |
| UI Labels | Enforced | All billing surfaces display "DEMO MODE" labels |
| Exit Criteria | Pending | Live Stripe credentials, webhook handlers, production verification |

## 4. Business Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| RU-01 | Authentication required for all private routes | 19 protected routes, 3 RBAC roles |
| RU-02 | Role-based access control enforced at router level | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` |
| RU-03 | AI outputs persist as draft; promotion requires explicit save | Review-gated `draft` -> `saved` | `dismissed` lifecycle |
| RU-04 | Billing surfaces always label demo; no live charge path callable | ADR-005, UI labels, feature flags |
| RU-05 | RLS governs every private table (119 policies) | PostgreSQL RLS, 40 tables with baseline RLS |
| RU-06 | Gamification XP awards deduplicated | `UNIQUE(user_id, reference_type, reference_id)` constraint |
| RU-07 | Daily XP award ceiling: 200 XP | Application-level check in XP award functions |
| RU-08 | Level calculation: `floor(total_xp / 100) + 1` | Database function `update_leaderboard_xp` |
| RU-09 | Content reports follow triage lifecycle | `pending` -> `under_review` -> `resolved` | `dismissed` |
| RU-10 | Soft deletes for user profiles | `profiles.deleted_at`, `profiles.is_active` flags |

## 5. KPI Metrics Framework

| ID | Metric | Target | Data Source |
|----|--------|--------|-------------|
| K-01 | Monthly Active Users | Growth trend | `product_analytics_events` |
| K-02 | Job Application Rate | >30% of job views | `applications` table |
| K-03 | LMS Course Completion | >40% enrollment | `module_progress` |
| K-04 | Challenge Submission Rate | >50% attempt rate | `challenge_submissions` |
| K-05 | Average Time to Hire | <14 days | Application status events |
| K-06 | Platform Uptime | >99.9% | Prometheus metrics |
| K-07 | API Response Time | <200ms (p95) | Gateway latency histograms |
| K-08 | Error Rate | <1% of requests | Error tracking logs |
| K-09 | User Retention (30-day) | >40% | Analytics cohort analysis |
| K-10 | Revenue (MRR) | Growth post-launch | Stripe (demo phase) |
| K-11 | Support Ticket Volume | <5% of MAU | External tracking |
| K-12 | Security Incident Rate | Zero critical | Audit logs |
| K-13 | Test Coverage | >80% (frontend) | 824 unit tests, 136 files |
| K-14 | Deployment Frequency | Weekly releases | CI/CD pipeline |
| K-15 | Mean Time to Recovery | <1 hour | Incident runbooks |
| K-16 | Gamification Engagement | >30% DAU participating | XP transactions |
| K-17 | Content Report Resolution | <24 hours | Moderation queue metrics |
| K-18 | AI Feature Usage | >20% of eligible users | Analytics events |

## 6. Compliance & Regulatory Constraints

| Area | Requirement | Implementation |
|------|-------------|----------------|
| Data Privacy | GDPR/CCPA compliance | Soft deletes, data export capabilities |
| Authentication | Secure session management | Supabase Auth, JWT validation |
| Authorization | Role-based access | RBAC with 3 roles, RLS policies |
| Content Moderation | User-generated content safety | Reporting system, admin queue |
| Financial | PCI DSS (for billing) | Stripe handling (demo mode) |
| Accessibility | WCAG 2.1 AA | Semantic HTML, keyboard navigation |

## 7. Business Process Flows

### 7.1 Job Application Flow
1. Candidate searches/views jobs (F-04)
2. Candidate applies with resume/profile (F-12, F-13)
3. Recruiter reviews application (F-06)
4. Recruiter sends offer/rejection (F-10)
5. Candidate receives notification (F-14)

### 7.2 Learning & Certification Flow
1. User browses course catalog (F-07)
2. User enrolls in course
3. User completes modules (video + quiz)
4. System awards XP (F-23)
5. User earns badge/certificate

### 7.3 Content Moderation Flow
1. User reports content (F-24)
2. Admin reviews in moderation queue
3. Admin resolves/dismisses report
4. System updates content status
5. Reporter receives notification

## 8. Exit Criteria for "Complete" Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| All 25 features implemented | 22/25 | F-16 (billing) partial, F-25/F-26 newly introduced |
| Test coverage >80% | Achieved | 824 unit tests, 136 files |
| Security baseline met | Achieved | 119 RLS policies, RBAC |
| Billing live integration | Pending | ADR-005 demo mode |
| Production deployment | Pending | Requires environment verification |
| Performance benchmarks | Pending | Requires load testing |
