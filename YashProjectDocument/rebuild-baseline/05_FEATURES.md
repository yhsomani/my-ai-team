# TalentSphere — Feature Inventory (Rebuild Baseline)

> Documentation status: Current rebuild baseline. Verified 2026-09-08.

> Complete feature inventory with 14 fine-grained statuses. Extracted 2026-09-08.
> Status legend: **FI**=FULLY IMPLEMENTED, **PI**=PARTIALLY IMPLEMENTED, **IB**=IMPLEMENTED BUT BROKEN, **II**=IMPLEMENTED BUT INCOMPLETE, **PH**=PLACEHOLDER, **EX**=EXPERIMENTAL, **DE**=DEPRECATED, **DI**=DISABLED, **UN**=UNUSED, **PL**=PLANNED, **DO**=DOCUMENTED ONLY, **CO**=CODE ONLY/UNDOCUMENTED, **IR**=IMPLIED REQUIREMENT, **UK**=UNKNOWN.

## Feature Status Register

| # | Feature | Status | Evidence | Notes |
|---|---------|--------|----------|-------|
| F-01 | Authentication & Session Mgmt | FI | authService.ts, Login/Register/ResetPassword | Supabase Auth SSOT |
| F-02 | Public Landing Page | FI | LandingPage with live stats | Hero, features, metrics |
| F-03 | Dashboard (Candidate/Recruiter) | FI | DashboardPage | Role-based widgets |
| F-04 | Job Marketplace | FI | jobService.ts (935 lines) | CRUD, search, featured, recommended |
| F-05 | Post Job Studio | FI | PostJobPage | Company context, templates, drafts |
| F-06 | Candidate Review Pipeline | FI | CandidatesPage | Pagination, search, bulk actions |
| F-07 | Learning Management System | FI | LMSPage | Hybrid API Gateway → Supabase |
| F-08 | Challenges Arena | FI | ChallengesPage | Category filtering, submissions |
| F-09 | Professional Networking | FI | NetworkingPage | Suggestions, connect/accept/decline |
| F-10 | Direct Messaging | FI | MessagingPage | Realtime, attachments, mark-read |
| F-11 | AI Career Assistant | FI | AIAssistant, AICareerPath | **Rule-based, not real LLM** |
| F-12 | Profile Management | FI | ProfilePage | AI suggestions, skills, experience |
| F-13 | Resume Builder | FI | ResumePage | Import/export/PDF |
| F-14 | Notifications | FI | NotificationBell | Real-time, unread, digest |
| F-15 | Settings | FI | SettingsPage | Profile, keyboard, digest, quiet hours |
| F-16 | Billing & Payments | PI | BillingPage, paymentService | **DEMO MODE only (ADR-005)** |
| F-17 | Admin Console | FI | AdminDashboard | Scheduler, audit logs, analytics |
| F-18 | Chrome Extension | FI | chrome-extension-project/ | MV3, local-first |
| F-19 | Product Analytics | FI | productAnalytics.ts | product_analytics_events |
| F-20 | Command Search | FI | unifiedSearch.ts | Role-filtered, keyboard nav |
| F-21 | Error Recovery | FI | ErrorBoundary | Safe failure copy, retry |
| F-22 | Gamification | FI | GamificationHeaderBadge, LeaderboardModal | XP, badges, leaderboard |
| F-23 | Trust & Safety | FI | ReportContentModal, ModerationQueue | content_reports, triage |
| F-24 | Job Detail View | FI | JobDetailPage | Apply workflow |
| F-25 | Portfolio Showcase | FI | PortfolioPage | Public portfolio |
| F-26 | Career Path | FI | AICareerPath | AI visualization |
| F-27 | Resume Matching (Extension) | FI | chrome-extension resumeMatchStatus | Local resume matching |
| F-28 | Page Scanning (Extension) | FI | chrome-extension pageScanDraft/Status | Local page scanning |
| F-29 | Notification Digests | FI | notification-digest cron | Scheduled email digests |
| F-30 | Networking Reminders | FI | run-networking-reminders scheduler | Scheduled reminders |
| F-31 | KPI Aggregations | FI | run-kpi-aggregations scheduler | Scheduled KPIs |
| F-32 | Saved Search Digests | FI | discover-saved-search-digests scheduler | Saved search digests |
| F-33 | Video Sessions | FI | video-service | Schedule, token, start/end |
| F-34 | Search (Unified) | FI | search-service, unifiedSearch | Jobs, profiles, skills |
| F-35 | Feature Flags | FI | admin/feature-flags endpoints | 40 stable flags |
| F-36 | Application Drafts | FI | application_drafts table | Save/restore draft applications |
| F-37 | Job Post Templates | FI | job_post_templates table | Reusable templates |
| F-38 | Chat Service | DE | chat-service (1 controller) | **Retired (ADR-004)** |
| F-39 | apps/backend stub | DE | apps/backend | **Retired, non-runnable shell** |

## Status Distribution

| Status | Count | Features |
|--------|-------|----------|
| FULLY IMPLEMENTED | 34 | F-01..15, F-17..35 (minus F-38/39) |
| PARTIALLY IMPLEMENTED | 1 | F-16 (Billing — demo mode) |
| DEPRECATED | 2 | F-38 (chat-service), F-39 (apps/backend stub) |
| IMPLEMENTED BUT BROKEN | 0 | — |
| IMPLEMENTED BUT INCOMPLETE | 0 | — |
| PLACEHOLDER | 0 | — |
| EXPERIMENTAL | 0 | — |
| DISABLED | 0 | — |
| UNUSED | 0 | — |
| PLANNED | 0 | — |
| DOCUMENTED ONLY | 0 | — |
| CODE ONLY/UNDOCUMENTED | 0 | — |
| IMPLIED REQUIREMENT | 0 | — |
| UNKNOWN | 0 | — |

**Total: 39 features cataloged.** The majority (34/39) are FULLY IMPLEMENTED. One is PARTIALLY IMPLEMENTED (billing, blocked by ADR-005). Two are DEPRECATED (chat-service, apps/backend stub).

## Feature → Page Mapping

| Page | Feature(s) |
|------|-----------|
| LoginPage | F-01 |
| RegisterPage | F-01 |
| ResetPasswordPage | F-01 |
| LandingPage | F-02 |
| DashboardPage | F-03 |
| JobsPage | F-04, F-24 |
| JobDetailPage | F-24 |
| PostJobPage | F-05 |
| CandidatesPage | F-06 |
| LMSPage | F-07 |
| ChallengesPage | F-08 |
| NetworkingPage | F-09 |
| MessagingPage | F-10 |
| AIAssistant | F-11 |
| AICareerPath | F-11, F-26 |
| ProfilePage | F-12 |
| ResumePage | F-13 |
| PortfolioPage | F-25 |
| NotificationsPage | F-14 |
| SettingsPage | F-15 |
| BillingPage | F-16 |
| AdminDashboard | F-17, F-35 |

## Partial/Deprecated Feature Detail

### F-16: Billing & Payments (PARTIALLY IMPLEMENTED)
- **What exists**: payment-service (1 controller), BillingPage, subscription_plans + subscriptions tables, checkout/history/plans/status endpoints
- **What's missing**: Live Stripe integration, webhooks, real payment processing
- **Decision**: ADR-005 mandates demo mode until Stripe provider verified
- **Current behavior**: `billingMode: 'demo'` — all flows simulated
- **Rebuild register**: DEFER live integration; keep demo-mode scaffold

### F-38: Chat Service (DEPRECATED)
- **What exists**: 1 controller, orphaned module outside Maven reactor
- **Why deprecated**: Supabase Realtime (ADR-004) supersedes; messaging domain consolidated into messaging-service
- **Decision**: DECISION-004 — retire chat-service or merge useful realtime adapter code into messaging-service
- **Rebuild register**: REMOVE FROM IMPLEMENTATION (or merge useful code)

### F-39: apps/backend stub (DEPRECATED)
- **What exists**: Non-runnable shell, historical artifact
- **Why deprecated**: Superseded by services/ Maven reactor (ADR-002)
- **Rebuild register**: REMOVE FROM IMPLEMENTATION (preserved as artifact)
