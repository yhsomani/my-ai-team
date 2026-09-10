# TalentSphere Product Requirements Document (PRD v3.0)

> Documentation status: Canonical product baseline. Reconciled with codebase on 2026-09-08.

## 1. Product Vision

TalentSphere is a unified career platform integrating professional networking, job marketplace, learning management, and technical challenges into a single cohesive experience. The platform serves job seekers, recruiters, and administrators through role-based access control and AI-powered assistance.

## 2. User Personas

| Persona | Role | Primary Goals | Key Features |
|---------|------|---------------|--------------|
| **P-A: Aisha** | Job Seeker (ROLE_USER) | Find jobs, build profile, learn skills | Jobs, Profile, LMS, Challenges, Messaging |
| **P-B: Rohan** | Recruiter (ROLE_RECRUITER) | Post jobs, review candidates, track pipeline | PostJob, Candidates, Analytics, Billing |
| **P-C: Priya** | Admin (ROLE_ADMIN) | Monitor platform, enforce policies, manage users | AdminConsole, Analytics, Trust&Safety |
| **P-D: Dev** | Developer/Technical Candidate | Solve challenges, showcase skills | Challenges, ResumeBuilder, Portfolio |

## 3. User Roles & Access Control

```typescript
USER_ROLES = {
  user: 'ROLE_USER',
  recruiter: 'ROLE_RECRUITER',
  admin: 'ROLE_ADMIN'
};
```

## 4. Feature Catalog

### 4.1 Fully Implemented Features (22)

| ID | Feature | Component | Evidence |
|----|---------|-----------|----------|
| F-01 | Authentication & Session Management | LoginPage, RegisterPage, ResetPasswordPage | authService.ts |
| F-02 | Public Landing Page | LandingPage with live stats | Hero, features, metrics |
| F-03 | Dashboard (Candidate/Recruiter) | DashboardPage | Role-based widgets |
| F-04 | Job Marketplace | JobsPage | jobService.ts (935 lines) |
| F-05 | Post Job Studio | PostJobPage | Company context, templates, drafts |
| F-06 | Candidate Review Pipeline | CandidatesPage | Pagination, search, bulk actions |
| F-07 | Learning Management System | LMSPage | Hybrid API Gateway → Supabase |
| F-08 | Challenges Arena | ChallengesPage | Category filtering, submissions |
| F-09 | Professional Networking | NetworkingPage | Suggestions, connect/accept/decline |
| F-10 | Direct Messaging | MessagingPage | Attachments, mark-read, history |
| F-11 | AI Career Assistant | AIAssistant, AICareerPath | Rule-based heuristics |
| F-12 | Profile Management | ProfilePage | AI suggestions, skill/experience |
| F-13 | Resume Builder | ResumePage | Import/export/PDF generation |
| F-14 | Notifications | NotificationBell | Real-time, unread count, dropdown |
| F-15 | Settings | SettingsPage | Profile, keyboard, digest, quiet hours |
| F-17 | Admin Console | AdminPage | Scheduler status, audit logs, analytics |
| F-18 | Chrome Extension | MV3 extension | Local job tracking, resume matching |
| F-19 | Product Analytics | AnalyticsPage | product_analytics_events |
| F-20 | Command Search | CommandSearch | Role-filtered routes, keyboard nav |
| F-21 | Error Recovery | ErrorBoundary | Safe failure copy, retry workflows |
| F-23 | Gamification System | GamificationHeaderBadge, LeaderboardModal | XP ledger, badges, leaderboard |
| F-24 | Trust & Safety | ReportContentModal, ModerationQueue | content_reports, triage lifecycle |

### 4.2 Partially Implemented Features (1)

| ID | Feature | Status | Missing | Decision |
|----|---------|--------|---------|----------|
| F-16 | Billing & Payments | Demo mode | Live Stripe integration, webhooks | ADR-005: demo until provider verified |

### 4.3 Newly Introduced Features (2)

| ID | Feature | Description |
|----|---------|-------------|
| F-25 | Job Detail View | Detailed job posting page with apply workflow |
| F-26 | Portfolio Showcase | Public portfolio display for candidates |

## 5. Screen Specifications

### 5.1 Public Routes (3)

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |

### 5.2 Protected Routes (19)

| Route | Component | Roles |
|-------|-----------|-------|
| `/dashboard` | DashboardPage | ROLE_USER, ROLE_RECRUITER |
| `/jobs` | JobsPage | All |
| `/jobs/:id` | JobDetailPage | All |
| `/post-job` | PostJobPage | ROLE_RECRUITER |
| `/candidates` | CandidatesPage | ROLE_RECRUITER |
| `/lms` | LMSPage | All |
| `/challenges` | ChallengesPage | All |
| `/networking` | NetworkingPage | All |
| `/messaging` | MessagingPage | All |
| `/ai-assistant` | AIAssistant | All |
| `/ai-career-path` | AICareerPath | All |
| `/profile` | ProfilePage | All |
| `/resume` | ResumePage | All |
| `/portfolio` | PortfolioPage | All |
| `/notifications` | NotificationsPage | All |
| `/settings` | SettingsPage | All |
| `/billing` | BillingPage | ROLE_RECRUITER |
| `/admin` | AdminPage | ROLE_ADMIN |
| `/admin/analytics` | AdminAnalyticsPage | ROLE_ADMIN |
| `/admin/trust-safety` | TrustAndSafetyPage | ROLE_ADMIN |

## 6. User Journeys

### J-1: New User Registration & Onboarding
1. User visits `/` (LandingPage)
2. Clicks "Get Started" → `/register`
3. Completes registration form
4. Receives email verification (Supabase Auth)
5. Logs in → redirected to `/dashboard`
6. Completes profile setup (F-12)

### J-2: Job Seeker Application Flow
1. User searches jobs on `/jobs`
2. Views job details on `/jobs/:id`
3. Applies with resume/profile
4. Tracks application status on dashboard
5. Receives notifications (F-14)

### J-3: Recruiter Candidate Review
1. Recruiter posts job via `/post-job`
2. Reviews applications on `/candidates`
3. Uses scorecards and notes
4. Sends offer/rejection via messaging

### J-4: Learning & Certification
1. User browses catalog on `/lms`
2. Enrolls in course
3. Completes modules (video + quiz)
4. Earns XP and badges (F-23)
5. Receives certificate

### J-5: Challenge Participation
1. User visits `/challenges`
2. Selects category (Algorithms, Frontend, Backend, Database)
3. Solves challenge in browser IDE
4. Submits solution
5. Receives evaluation and XP

### J-6: Networking & Connections
1. User visits `/networking`
2. Reviews suggestions
3. Sends connection requests
4. Manages connections (accept/decline)
5. Views mutual connections

### J-7: Messaging Conversation
1. User opens `/messaging`
2. Starts new conversation or continues existing
3. Sends messages with attachments
4. Marks messages as read
5. Views message history

### J-8: AI Career Assistance
1. User visits `/ai-assistant` or `/ai-career-path`
2. Submits resume/career goals
3. Receives AI-generated suggestions
4. Reviews with `SourceStatusBadge` provenance
5. Saves or dismisses suggestions

### J-9: Admin Moderation
1. Admin visits `/admin/trust-safety`
2. Reviews pending content reports
3. Investigates reported content
4. Resolves or dismisses reports
5. Updates content status

### J-10: Gamification Engagement
1. User earns XP through activities
2. Views progress in `GamificationHeaderBadge`
3. Checks leaderboard in `LeaderboardModal`
4. Unlocks badges
5. Competes with other users

## 7. UX Requirements

### 7.1 Design System (Aura)
- **Colors**: Primary blue, secondary gray, success green, warning amber, error red
- **Typography**: System font stack, 14px base
- **Components**: Lucide React icons, Framer Motion animations
- **Layout**: Responsive, mobile-first, Tailwind CSS 4.2

### 7.2 Accessibility
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG 2.1 AA)

### 7.3 Performance
- Lazy-loaded routes (22 pages)
- Code splitting by feature
- Optimistic UI updates
- Real-time updates via Supabase Realtime

## 8. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Network failure | ErrorBoundary with retry workflows |
| Authentication expiry | Automatic redirect to login |
| Role escalation attempt | Route guard blocks access |
| AI service unavailable | Fallback to cached suggestions |
| Real-time connection lost | Queue updates, reconnect on restore |
| Gamification deduplication | Database constraint prevents duplicate XP |

## 9. Technical Constraints

| Constraint | Implementation |
|------------|----------------|
| React 19 SPA | Client-side routing, no SSR |
| Supabase-first data plane | Direct PostgREST queries |
| Spring Boot secondary | API Gateway for complex operations |
| TypeScript strict mode | Type safety across codebase |
| 136 test files | 824 unit tests (Vitest) |
| 28 E2E spec files (~235 scenarios) | Playwright testing |

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature completeness | 25/25 | PRD audit |
| Test coverage | >80% | Vitest reports |
| User satisfaction | >4.0/5.0 | Feedback surveys |
| Performance (LCP) | <2.5s | Lighthouse audits |
| Accessibility score | >90 | Lighthouse audits |
