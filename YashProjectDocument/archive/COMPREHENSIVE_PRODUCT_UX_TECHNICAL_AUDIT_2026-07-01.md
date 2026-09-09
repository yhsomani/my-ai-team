# Comprehensive Product, UX, Technical, Architecture, and Cleanup Audit

> Documentation status: Source-backed audit generated from the current workspace on 2026-07-01. This report evaluates the product against user expectations, business objectives, UX standards, accessibility, scalability, and production readiness. It should be read with `PLAN.md`, `docs/ARCHITECTURE_STATUS_INDEX.md`, `docs/FEATURES_AND_DASHBOARDS.md`, and the accepted ADRs.

## 1. Executive Summary

TalentSphere is a broad career platform combining job search, recruiting, profile/resume management, learning, coding challenges, messaging, networking, AI-assisted workflow suggestions, billing, admin operations, and a browser companion extension.

The product direction is valuable: it tries to reduce the fragmentation that job seekers and recruiters face across LinkedIn, Coursera, HackerRank, ATS tooling, messaging, resume tools, and job boards. The current web app has many strong UX affordances: role-based routes, command search, route ownership metadata, accessible labels, explicit retry states, draft review flows, local fallback warnings, and extensive unit/contract tests.

The main product risk is not lack of surface area. It is that the product presents a polished, production-like experience while several underlying capabilities are still hybrid, demo, local-only, or not runtime-verified:

- Frontend product workflows directly access 45 Supabase tables while only 19 frontend `apiClient` calls go through the API Gateway, per `docs/API_CONTRACT_MISMATCH_REPORT.md`.
- Billing is explicitly demo mode in `apps/frontend/src/services/paymentService.ts`; live provider checkout, webhook-owned state, and Stripe runtime evidence are not present.
- AI responses are currently heuristic/static in backend `services/ai-service/src/main/java/com/talentsphere/ai/service/AiService.java`, while the UI suggests a more capable assistant.
- `services/chat-service` remains orphaned and non-deployable by ADR-004 and `module-manifest.json`.
- `apps/backend` is a non-runnable modular-monolith target shell, not an implemented backend.
- Runtime backend verification is blocked in this workspace because `mvn` is unavailable and no executable `mvnw` exists.

Overall assessment: strong frontend/product scaffolding and source-level governance, medium production readiness, high UX ambition, and high architecture debt around data ownership, backend topology, runtime verification, and cleanup.

## 2. Verification Performed

Passed locally:

- `npm run validate:module-manifest`: 26 Maven reactor modules, 1 orphaned Maven module, 36 docs, 21 dev artifacts, 7 generated/external paths classified.
- `npm run validate:infrastructure-manifest`: 2 compose files, 18 active deployable modules.
- `npm run validate:docs-lifecycle`: 36 Markdown docs classified.
- `npm run validate:ui-design-system`: 291 source files scanned.
- `npm run validate:backend-topology-adr`: chat-service remains orphaned.
- `npm run validate:messaging-boundary-adr`: 3 orphaned chat routes and 3 non-active OpenAPI chat operations.
- `npm run validate:payment-mode-adr`: demo billing explicit, no active payment webhook route.
- `npm run validate:data-ownership`: 59 tables, 45 direct frontend tables, 59 SQL-defined tables.
- `npm run validate:api-openapi-contract`: 123 operations, 56 schemas, 90 schema refs.
- `npm run validate:security-contract`: source coverage for runtime secrets, error handling, file upload policy, scheduler audit, CI security scans.
- `npm run validate:auth-contract`: Supabase primary auth, Gateway verifier config, route matching, role forwarding, rate limits.
- `npm run validate:typed-supabase-boundary`: 188 typed table call sites, 1 generated RPC call site, 0 production compatibility client imports.
- `npm run validate:schema-migrations`: 49 baseline tables, 38 RLS-enabled tables, 46 indexed tables.
- `npm run test:ia`: 2 files, 19 tests.
- Extension tests: messaging, portal fixtures, options UX, popup UX, contract, and storage migrations.
- `npm run lint`: passed.
- `npm run build`: passed. Largest emitted chunks include Supabase client, React Router, main index, AuraModal, Jobs, ResumeBuilder, Profile, Admin, Candidates.
- `npm run test:unit`: 112 files and 626 tests passed.
- `git diff --check`: passed.

Not run:

- Backend Maven tests and Java package validation, because `mvn` is not available and `TalentSphere-Unified/mvnw` is not executable/present.
- Extension live runtime smoke, because it launches a browser runtime and is outside this audit's non-GUI validation scope.
- Live Supabase, RLS, provider billing, deployed scheduler, Docker, Kubernetes, Redis rate limit, observability dashboard, or browser cross-engine runtime validation.

## 3. Product Assessment

Business goal: become a career operating system for talent and recruiters, with workflow guidance, skill development, application tracking, and hiring collaboration in one platform.

User goals:

- Talent users want fewer tabs, less repeated profile/resume work, better job-fit guidance, learning recommendations, application tracking, and interview prep.
- Recruiters want faster job posting, company context, candidate queue review, private notes, scorecards, status decisions, and pipeline visibility.
- Admin users want service health, audit logs, scheduler status, and product analytics.
- Extension users want local job capture, resume matching, interview prep, diagnostics, and safe browser-local operation.

Current product strengths:

- Clear route inventory in `apps/frontend/src/navigation/routeRegistry.ts`.
- Feature ownership registry in `apps/frontend/src/navigation/featureOwnership.ts` reduces duplicate workflow ownership.
- Major routes have dedicated tests and accessibility semantics.
- Many risky actions are review-first: publishing jobs, clearing drafts, deleting artifacts, changing candidate status, clearing chat, deleting saved searches.
- Local fallback behavior is visible in many workflows instead of silently claiming success.

Product weaknesses:

- The platform promise exceeds runtime proof. AI, billing, backend service independence, realtime messaging, and provider integrations are partial or demo-backed.
- Role onboarding is still mostly route-level and form-level. Users need a guided setup-to-value journey across profile, resume, job preferences, learning, and messaging.
- Data ownership is hard for users to reason about. Some workflows sync to account tables; others can be local-only or provider-fallback.
- Recruiter company setup exists inside Post Job, but employer branding and company profile management are not a first-class workspace.
- Search is fragmented across command search, job search, LMS search, candidate search, networking search, and backend search service.

## 4. UX Assessment

Strengths:

- Most complex pages expose named `role`, `aria-label`, `role="status"`, `role="alert"`, list, tab, dialog, and progress semantics.
- Retry states exist for dashboard, jobs, candidates, billing, career path, learning, messaging, networking, profile, and resume.
- The app increasingly uses compact operational UI rather than marketing-style pages inside the authenticated product.
- Command search and role-filtered navigation help discover routes.

Weaknesses:

- Large route components create dense screens and inconsistent mental models. Jobs, Candidates, Profile, Resume, Post Job, Networking, LMS, and Messaging all own heavy state and workflow logic directly.
- Local fallback status appears often but may not be understandable to first-time users. A user may not know whether data is account-synced, local-only, or provider-backed.
- AI suggestions can draft and hand off, but the review queue can feel abstract unless each suggestion shows confidence, scope, editable fields, and exact destination impact.
- Billing mode is demo, but any billing UI must keep sandbox/live state visible near every payment action.
- Disabled messaging call/video/more actions are discoverable, but they can frustrate users unless the roadmap or alternative action is clear.

## 5. Feature-by-Feature Analysis

### Public Entry, Login, Registration, and Recovery

- Purpose: convert unauthenticated visitors and recover invalid routes.
- Business goal: reduce activation friction and route users into talent or recruiter intent.
- User goal: understand the product, sign in, register, and recover from bad links.
- Ideal experience: role-aware entry, clear login/register states, magic link/OAuth if configured, safe errors, password reset, account verification, and post-auth continuation.
- Current implementation: `App.tsx` maps `/`, `/login`, `/register`, and `*`; Login/Register are lazy-loaded; `ProtectedRoute` redirects unauthenticated users to login and unauthorized roles to dashboard.
- Evidence: `apps/frontend/src/App.tsx:240`, `apps/frontend/src/App.tsx:242`, `apps/frontend/src/App.tsx:247`, `apps/frontend/src/App.tsx:268`, `apps/frontend/src/components/auth/ProtectedRoute.tsx:36`, `apps/frontend/src/components/auth/ProtectedRoute.tsx:39`.
- Expectation gap: local dev auto-auth can hide real auth failure modes; production onboarding still depends on Supabase configuration and role metadata correctness.
- Missing functionality: first-run checklist, email verification status, account recovery flow, organization invite acceptance, explicit OAuth provider availability.
- UX issues: landing page and auth are separate from the authenticated setup journey; role intent should carry through to dashboard onboarding.
- Accessibility: route recovery and auth tests exist; continue testing screen-reader flow for login errors and redirects.
- Suggested redesign: one onboarding state machine from public role CTA to registration, profile/company setup, first recommended action, and persistent checklist.
- Priority: P1.

### Authenticated Shell, Sidebar, Header, Command Search, Notifications

- Purpose: provide global navigation, route discovery, notifications, theme/account actions.
- Business goal: reduce support burden and route confusion in a broad product.
- User goal: find features quickly, switch tasks, monitor unread/queued work.
- Ideal experience: role-aware navigation, keyboard-first command palette, reliable notification center, source labels for live/fallback data, no hidden role restrictions.
- Current implementation: route registry controls navigation and search metadata; layout/sidebar/header consume roles; command search is route-destination oriented.
- Evidence: `apps/frontend/src/navigation/routeRegistry.ts:49`, `apps/frontend/src/navigation/routeRegistry.ts:239`, `apps/frontend/src/components/layout/CommandSearch.tsx:52`, `apps/frontend/src/components/layout/Header.tsx:265`, `apps/frontend/src/components/layout/Sidebar.tsx:29`.
- Expectation gap: command search only finds routes, not objects such as jobs, courses, candidates, messages, or settings fields.
- Missing functionality: universal object search, notification filtering, bulk notification triage, keyboard shortcut customization, cross-device notification state proof.
- UX issues: broad route count can overwhelm; utility routes not in nav need strong command/search discoverability.
- Suggested redesign: evolve command search into a true command palette with routes, recent objects, saved searches, candidate queues, and actions.
- Priority: P1.

### Dashboard Launchpad

- Purpose: role-specific daily overview and shortcut surface.
- Business goal: increase retention and route users to valuable workflows.
- User goal: see what changed, what needs action, and where to resume.
- Ideal workflow: load live dashboard, show synced state, identify next best action, route with context, explain partial data.
- Current implementation: separate talent/recruiter branches, metrics, onboarding checklist, quick action panels, status strip, retry actions, analytics.
- Evidence: `apps/frontend/src/pages/dashboard/DashboardPage.tsx:369`, `apps/frontend/src/pages/dashboard/DashboardPage.tsx:441`, `apps/frontend/src/pages/dashboard/DashboardPage.tsx:489`, `apps/frontend/src/pages/dashboard/DashboardPage.tsx:715`, `apps/frontend/src/pages/dashboard/DashboardPage.tsx:832`.
- Expectation gap: dashboard is good as a launchpad but not yet a true personalized command center with prioritized next best actions across all modules.
- Missing functionality: configurable dashboard, cross-feature reminders, stale-data indicators per card, admin/talent/recruiter goal selection.
- UX issues: role-specific content is helpful, but users need clearer "why this matters" for AI/learning/job recommendations.
- Suggested redesign: make dashboard a work queue grouped by "Today", "Waiting on others", "Drafts", "Recommendations", and "Needs sync".
- Priority: P1.

### Jobs Workspace

- Purpose: job discovery, saved searches, applications, hidden job preferences, recruiter postings.
- Business goal: central hiring marketplace activity.
- User goal: find roles, apply safely, track status, manage search automation, and manage recruiter postings.
- Ideal workflow: search and filter, save alert, inspect match reasons, draft application from profile/resume, submit, track status, receive updates.
- Current implementation: large page with tabs, job filters, saved searches, hidden Explore jobs, local/server application drafts, application history, status timeline, recruiter postings, publish review.
- Evidence: `apps/frontend/src/pages/jobs/JobsPage.tsx:510`, `apps/frontend/src/pages/jobs/JobsPage.tsx:519`, `apps/frontend/src/pages/jobs/JobsPage.tsx:669`, `apps/frontend/src/pages/jobs/JobsPage.tsx:926`, `apps/frontend/src/pages/jobs/JobsPage.tsx:1027`, `apps/frontend/src/pages/jobs/JobsPage.tsx:1769`, `apps/frontend/src/pages/jobs/JobsPage.tsx:2477`, `apps/frontend/src/pages/jobs/JobsPage.tsx:2881`.
- Expectation gap: users expect durable, cross-device saved searches and application drafts. The implementation has local fallback and sync attempts but can still degrade to browser-local state.
- Missing functionality: advanced compensation filters, remote/time-zone preferences, application package selection, employer research, job duplicate detection across sources, explainable recommendation controls.
- UX issues: too many concerns in one file and one route; the Explore/Application/Postings modes deserve clearer workspace sub-navigation.
- Accessibility: strong list/alert/status semantics and workflow tests.
- Suggested redesign: split into `jobs/explore`, `jobs/applications`, `jobs/saved-searches`, and `recruiting/postings` feature modules while keeping one Jobs top-level workspace.
- Priority: P0 for maintainability, P1 for UX.

### Job Posting

- Purpose: recruiter job draft creation, company context, templates, duplicate checks, review-before-save.
- Business goal: increase employer supply and reduce low-quality postings.
- User goal: create accurate jobs quickly without losing drafts.
- Ideal workflow: choose company, template, role type, compensation, requirements, review readiness, publish or save draft, monitor applicants.
- Current implementation: company setup, attach company, duplicate candidates, templates, draft history, review screen, local/server sync fallback.
- Evidence: `apps/frontend/src/pages/jobs/PostJobPage.tsx:190`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:296`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:385`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:639`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:964`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:1186`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:1264`, `apps/frontend/src/pages/jobs/PostJobPage.tsx:1406`.
- Expectation gap: recruiters expect company profiles, approval workflow, collaborative drafting, and job preview as candidates see it.
- Missing functionality: team collaboration, approval chain, brand templates, screening questions, automated JD quality scoring, compensation benchmarking, publish channels.
- UX issues: company profile management hidden inside posting flow; it should be a first-class recruiter setup feature.
- Suggested redesign: create a recruiter Company Workspace and turn Post Job into a focused wizard with autosave and explicit publish readiness.
- Priority: P1.

### Candidate Review

- Purpose: recruiter application queue, search, notes, scorecards, interview planning, status decisions, bulk review.
- Business goal: improve recruiter throughput and hiring quality.
- User goal: evaluate candidates consistently and safely.
- Ideal workflow: filter queue, open candidate, review resume/cover letter, add structured scorecard, schedule/interview, update status, trigger communications.
- Current implementation: paginated candidate queue, filters, review focus, private notes, scorecards, interview plan draft, status confirmations, bulk review.
- Evidence: `apps/frontend/src/pages/candidates/CandidatesPage.tsx:242`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:316`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:386`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:506`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:1073`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:1319`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:1732`, `apps/frontend/src/pages/candidates/CandidatesPage.tsx:1985`.
- Expectation gap: recruiters expect candidate communication, scheduling, team feedback, audit trail, and status emails. Current UI handles internal review but not full hiring operations.
- Missing functionality: collaborative scorecards, calendar scheduling, email/message templates, candidate comparison, pipeline stage configuration, compliance exports.
- UX issues: bulk status actions are powerful but need stronger safeguards and preview of downstream notifications.
- Suggested redesign: split queue, detail, scorecard, notes, and bulk action logic into `features/candidates`.
- Priority: P1.

### Profile

- Purpose: durable talent profile, skills, experience, education, achievements, avatar, AI draft review.
- Business goal: richer marketplace data and better recommendations.
- User goal: keep a profile up to date without repetitive editing.
- Ideal workflow: complete profile checklist, import from resume/LinkedIn, edit sections inline, preview public view, control visibility.
- Current implementation: profile load/save, completion metrics, suggestions, add/edit/delete skills/experience/education, avatar crop/upload/remove, read-only external profile handling.
- Evidence: `apps/frontend/src/pages/profile/ProfilePage.tsx:285`, `apps/frontend/src/pages/profile/ProfilePage.tsx:361`, `apps/frontend/src/pages/profile/ProfilePage.tsx:559`, `apps/frontend/src/pages/profile/ProfilePage.tsx:637`, `apps/frontend/src/pages/profile/ProfilePage.tsx:990`, `apps/frontend/src/pages/profile/ProfilePage.tsx:1333`, `apps/frontend/src/pages/profile/ProfilePage.tsx:1902`.
- Expectation gap: users expect privacy controls, profile preview by audience, verification of skills/credentials, and import from external profiles.
- Missing functionality: visibility/privacy per field, endorsements, credential verification, portfolio media, public profile share links.
- UX issues: completion checklist is useful but could become a guided setup wizard for first-time users.
- Suggested redesign: profile as structured sections with inline editing and visibility controls; shared data model with Resume.
- Priority: P1.

### Resume Builder

- Purpose: create, import, edit, export, upload, and track resume artifacts.
- Business goal: improve application quality and data completeness.
- User goal: tailor resumes quickly and keep artifacts organized.
- Ideal workflow: import resume, map fields to profile, generate tailored version for a job, export PDF, upload artifact, reuse in application.
- Current implementation: editor/preview tabs, import text/file, selective field/skill/row apply, PDF/HTML downloads, provider PDF upload, artifact history and delete receipts.
- Evidence: `apps/frontend/src/pages/profile/ResumeBuilder.tsx:356`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:417`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:920`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:1017`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:1365`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:1478`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:2039`, `apps/frontend/src/pages/profile/ResumeBuilder.tsx:2166`.
- Expectation gap: users expect true PDF generation, ATS scoring, version comparison, job-specific tailoring, and direct use in applications.
- Missing functionality: resume templates, job-specific versions, diff/compare, ATS keyword scoring, version naming, application linkage.
- UX issues: Resume and Profile duplicate some data ownership. Users need clear "save to profile" versus "resume-only" semantics.
- Suggested redesign: one career profile data model, with resume artifacts as generated views plus overrides.
- Priority: P1.

### Learning / LMS

- Purpose: course discovery, enrollment, progress, lesson completion, AI learning handoff.
- Business goal: close skill gaps and retain users.
- User goal: find relevant courses, continue progress, and complete lessons.
- Ideal workflow: skill gap -> recommended path -> enroll -> learn -> record credential -> update profile.
- Current implementation: Redux course catalog, API Gateway first then Supabase fallback in `lmsService`, enrollment, progress filtering, lesson completion, modal detail.
- Evidence: `apps/frontend/src/pages/lms/LMSPage.tsx:58`, `apps/frontend/src/pages/lms/LMSPage.tsx:123`, `apps/frontend/src/pages/lms/LMSPage.tsx:179`, `apps/frontend/src/pages/lms/LMSPage.tsx:288`, `apps/frontend/src/pages/lms/LMSPage.tsx:364`, `apps/frontend/src/pages/lms/LMSPage.tsx:601`, `apps/frontend/src/services/lmsService.ts:1`.
- Expectation gap: users expect real course content, certificates, assessments, due dates, recommendations based on profile/job goals.
- Missing functionality: course player depth, certificates, assignments, skill outcomes, provider integration, calendar/reminders.
- UX issues: course detail modal can become too dense for actual lesson consumption.
- Suggested redesign: separate catalog, course detail, lesson player, and learning plan routes.
- Priority: P2.

### Challenges

- Purpose: coding challenge catalog, local sample checks, submissions, retry history.
- Business goal: assess and prove skills.
- User goal: solve challenges, get accurate feedback, build credibility.
- Ideal workflow: choose challenge, run samples locally, submit remotely, see results, earn XP/badge, share proof.
- Current implementation: challenge catalog, filter, code editor textarea, local worker sample check for JS/TS, Piston-backed backend submission path, submission history.
- Evidence: `apps/frontend/src/pages/challenges/ChallengesPage.tsx:20`, `apps/frontend/src/pages/challenges/ChallengesPage.tsx:97`, `apps/frontend/src/pages/challenges/ChallengesPage.tsx:250`, `apps/frontend/src/pages/challenges/ChallengesPage.tsx:325`, `apps/frontend/src/pages/challenges/ChallengesPage.tsx:441`, `apps/frontend/src/pages/challenges/ChallengesPage.tsx:548`, `services/challenge-service/src/main/java/com/talentsphere/challenge/service/ChallengeService.java`.
- Expectation gap: developers expect a real editor, language runtimes, hidden test feedback, performance limits, plagiarism safeguards, and stable submission status.
- Missing functionality: Monaco editor, multi-language local runner, hidden tests, detailed judging, anti-cheat, challenge discussion.
- UX issues: textarea editor and limited local runner will feel basic for coding assessment users.
- Suggested redesign: use a proven code editor and judging abstraction; split challenge details, workspace, results, and history.
- Priority: P1 for developer credibility.

### Networking

- Purpose: discover professionals, request/accept/withdraw connections, set follow-up reminders, preview profiles.
- Business goal: engagement and hiring network effects.
- User goal: find relevant people and manage relationship actions.
- Ideal workflow: receive recommendations, preview context, connect with note, track sent requests, follow up, message accepted contacts.
- Current implementation: suggestions, incoming/sent/accepted tabs, hidden suggestions, reminders, profile preview, storage fallback.
- Evidence: `apps/frontend/src/pages/networking/NetworkingPage.tsx:148`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:212`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:337`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:548`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:737`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:983`, `apps/frontend/src/pages/networking/NetworkingPage.tsx:1385`.
- Expectation gap: users expect feed posts, profile visits, mutual connections, recommendations they can tune, and direct transition to messaging.
- Missing functionality: people search facets, mutual connections, invite templates, recommendation explanations, feed composer ownership.
- UX issues: hidden suggestions and reminders are helpful but local/synced status must be very clear.
- Suggested redesign: combine network graph, discovery filters, and relationship reminders in a dedicated domain module.
- Priority: P2.

### Messaging

- Purpose: direct conversations, unread state, attachments, local failed-message retry, realtime subscription.
- Business goal: keep hiring/network communication in product.
- User goal: message contacts reliably and see delivery/read state.
- Ideal workflow: open conversation, send text/file, see delivered/read status, search messages, start voice/video when available.
- Current implementation: conversation list, active thread, load more/older messages, mark visible read, attachment link/upload, reply suggestions, realtime status, disabled voice/video/more actions.
- Evidence: `apps/frontend/src/pages/messaging/MessagingPage.tsx:116`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:163`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:209`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:431`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:522`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:801`, `apps/frontend/src/pages/messaging/MessagingPage.tsx:1033`.
- Expectation gap: users expect strong realtime reliability, membership authorization, searchable history, group messages, typing indicators, delivery/read receipts, and calls if icons exist.
- Missing functionality: group management, conversation creation UX, typing indicators, voice/video, message search, attachment signed URLs, moderation/reporting.
- UX issues: disabled call/video icons should either be hidden, feature-flagged, or paired with an available alternative.
- Suggested redesign: make messaging a single backend-owned domain with realtime adapter, membership authorization, and frontend repository abstraction.
- Priority: P0 for data/security, P1 for UX.

### AI Assistant and Career Path

- Purpose: career guidance, automation suggestions, review-first handoffs to Profile, Resume, Jobs, Learning, and Career Path.
- Business goal: differentiated intelligence layer and workflow automation.
- User goal: get useful help without losing control of changes.
- Ideal workflow: ask question, receive sourced suggestion, review impacted fields, accept/dismiss, track saved suggestions, refine.
- Current implementation: local/server chat session sync, prompt suggestions, suggestion review queue, handoffs, AI Career Path generated guidance and boundaries.
- Evidence: `apps/frontend/src/pages/ai/AIAssistant.tsx:133`, `apps/frontend/src/pages/ai/AIAssistant.tsx:157`, `apps/frontend/src/pages/ai/AIAssistant.tsx:334`, `apps/frontend/src/pages/ai/AIAssistant.tsx:508`, `apps/frontend/src/pages/ai/AIAssistant.tsx:640`, `apps/frontend/src/pages/ai/AICareerPath.tsx:74`, `services/ai-service/src/main/java/com/talentsphere/ai/service/AiService.java`.
- Expectation gap: users expect contextual, high-quality AI. Backend code uses heuristics/static responses for resume analysis, matching, chat, career path, and market insights.
- Missing functionality: model provider configuration, retrieval/context, citations, confidence, guardrails, prompt history, user feedback loop.
- UX issues: AI suggestions should disclose source quality and whether generated by live model, heuristic, or fallback.
- Suggested redesign: AI domain should expose suggestion objects with provenance, confidence, editable field patches, and user approval records.
- Priority: P0 for product credibility.

### Billing

- Purpose: plan review, subscription/payment method handoff, transaction history.
- Business goal: monetize platform usage.
- User goal: understand plan, change plan safely, manage payment method.
- Ideal workflow: compare plans, start verified checkout, return, webhook updates state, see invoices and payment history.
- Current implementation: explicit demo billing mode, Supabase billing tables, repo-external Edge Function calls, backend synthetic payment sessions.
- Evidence: `apps/frontend/src/services/paymentService.ts:54`, `apps/frontend/src/pages/billing/BillingPage.tsx:83`, `apps/frontend/src/pages/billing/BillingPage.tsx:111`, `apps/frontend/src/pages/billing/BillingPage.tsx:381`, `services/payment-service/src/main/java/com/talentsphere/payment/service/PaymentService.java`.
- Expectation gap: users expect real provider-backed billing. Current mode is intentionally demo and must not be treated as live.
- Missing functionality: signed webhook endpoint, idempotency, provider-owned subscription state, invoices, refunds, tax, customer portal runtime tests.
- UX issues: demo/live mode must be visible on every payment action, not only as a page-level warning.
- Suggested redesign: keep billing read-only/demo until backend provider adapter and webhook state machine are implemented.
- Priority: P0 before production monetization.

### Settings

- Purpose: profile settings, notification preferences, security actions, billing summary.
- Business goal: reduce support tickets and let users control preferences.
- User goal: update personal settings, notifications, security, billing.
- Ideal workflow: change settings with clear save states, validation, privacy, account lifecycle, and source labels.
- Current implementation: tabbed settings page, profile save, notification settings, billing handoff, security settings components.
- Evidence: `apps/frontend/src/pages/settings/SettingsPage.tsx:81`, `apps/frontend/src/pages/settings/SettingsPage.tsx:114`, `apps/frontend/src/pages/settings/SettingsPage.tsx:216`, `apps/frontend/src/pages/settings/SettingsPage.tsx:312`, `apps/frontend/src/pages/settings/SettingsPage.tsx:360`, `apps/frontend/src/pages/settings/SettingsPage.tsx:378`.
- Expectation gap: users expect password reset, MFA, device/session management, data export, privacy, deletion, and notification delivery test.
- Missing functionality: live security device/session management, data export/delete request workflow, preference audit, test notification.
- UX issues: vertical tabs are clear on desktop; mobile settings ergonomics should remain validated.
- Suggested redesign: split account/security/privacy/notifications/billing into feature modules while keeping one Settings route.
- Priority: P2.

### Admin Console

- Purpose: operational metrics, service health, product analytics, scheduler status, audit logs.
- Business goal: platform governance and incident response.
- User goal: see health, investigate issues, inspect audit events.
- Ideal workflow: live service health, drill into metrics/logs/traces, see recent incidents, runbooks, audit search/export.
- Current implementation: stats, product analytics insights, scheduled automations, service health table, audit log pagination, source labels and retry.
- Evidence: `apps/frontend/src/pages/admin/AdminDashboard.tsx:30`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:62`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:98`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:149`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:182`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:785`, `apps/frontend/src/pages/admin/AdminDashboard.tsx:870`.
- Expectation gap: admins expect live observability, alert links, RBAC/audit enforcement, queryable logs, and incident ownership. Source validators exist, but runtime dashboards are not verified.
- Missing functionality: audit search/export, incident timeline, service drilldowns, admin user management, feature flag UI integration.
- UX issues: admin dashboard can overstate reliability if fallback/mock service health is not prominent.
- Suggested redesign: treat Admin as operations cockpit with source/live labels, runbook links, environment selector, and evidence freshness.
- Priority: P1.

### Notifications and Digests

- Purpose: in-app notifications, unread counts, scheduled reminders, digest workflows.
- Business goal: re-engage users and reduce missed tasks.
- User goal: know what needs attention and control notification frequency.
- Current implementation: notification services, notification digest scripts, networking reminders, header notification workflow tests.
- Evidence: `apps/frontend/src/services/notificationService.ts`, `apps/frontend/src/services/notificationDigestService.ts`, `scripts/run-notification-digests.mjs`, `scripts/run-networking-reminders.mjs`, `infra/k8s/base/notification-digest-cronjobs.yaml`.
- Expectation gap: users expect reliable delivery across email/in-app/push and transparent digest scheduling.
- Missing functionality: delivery provider verification, notification preferences by feature, failed delivery recovery, notification search.
- Priority: P1.

### Gamification

- Purpose: XP, badges, leaderboard, challenge/course incentives.
- Business goal: engagement and proof of skill.
- User goal: track progress and credibility.
- Current implementation: backend `gamification-service`, frontend `gamificationService`, dashboard/profile display, challenge events.
- Evidence: `services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java`, `apps/frontend/src/services/gamificationService.ts`, `apps/frontend/src/pages/profile/ProfilePage.tsx:2137`.
- Expectation gap: users expect a dedicated achievements view, transparent XP rules, and credible badge verification.
- Missing functionality: achievement detail, proof links, anti-gaming rules, badge sharing.
- Priority: P2.

### Search

- Purpose: discover jobs, profiles, routes, candidates, courses, and content.
- Business goal: connect users to value quickly.
- Current implementation: route command search, domain-specific page search, backend `search-service`.
- Evidence: `services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java`, `apps/frontend/src/components/layout/CommandSearch.tsx`, `apps/frontend/src/pages/jobs/JobsPage.tsx:2503`.
- Expectation gap: users expect one global search across people, jobs, courses, messages, applications, candidates, and settings.
- Missing functionality: unified searchable index, object results, saved recent searches, permission-aware ranking.
- Priority: P1.

### File Uploads and Attachments

- Purpose: avatar uploads, resume PDFs, message attachments, file download/delete.
- Business goal: support rich profile/application/messaging workflows.
- Current implementation: frontend file upload service and backend content-type/signature/malware-hook validation.
- Evidence: `apps/frontend/src/services/fileUploadService.ts`, `services/file-service/src/main/java/com/talentsphere/file/service/FileService.java`.
- Expectation gap: users expect cloud storage, signed URLs, virus scanning, previews, retention controls. Current backend stores local files under `uploads`.
- Missing functionality: cloud provider storage, signed access, lifecycle policies, quota, scan provider integration.
- Priority: P1.

### Companion Browser Extension

- Purpose: browser-local job scan/tracker, resume match, interview prep, diagnostics.
- Business goal: capture off-platform job activity and keep TalentSphere present during external job search.
- User goal: save jobs from LinkedIn/Indeed/Glassdoor, review scan confidence, locally compare resume to job, prep for interviews.
- Current implementation: MV3 extension with popup, options, content script, background service worker, storage migrations, local analytics, source-level contract tests.
- Evidence: `chrome-extension-project/public/manifest.json`, `chrome-extension-project/src/popup/PopupApp.tsx`, `chrome-extension-project/src/options/OptionsApp.tsx`, `chrome-extension-project/src/content/index.ts`, `chrome-extension-project/src/lib/storageMigrations.ts`.
- Expectation gap: users will expect sync to the web app, but settings currently describe browser-local behavior. That is acceptable only if explicit.
- Missing functionality: authenticated sync, web-app import review, Web Store packaging, published update migration evidence, portal drift monitoring.
- UX issues: local-only data must keep export/import and backup options visible.
- Suggested redesign: authenticated sync should be opt-in with review, conflict handling, and clear data mapping to Jobs/Resume/Profile.
- Priority: P1 for platform continuity.

## 6. User Expectation Gap Analysis

First-time users expect:

- A guided setup path, not just a dashboard.
- Clear role separation between job seeker, recruiter, and admin.
- AI and billing labels that reflect actual provider readiness.
- Account-synced data unless explicitly told local-only.

Experienced users expect:

- Keyboard shortcuts, bulk actions, saved filters, reusable templates, object search, and fewer repeated form entries.
- Reliable status, retry, and history for high-value workflows.
- Cross-device continuity for drafts, saved searches, notes, reminders, and messages.

Business stakeholders expect:

- Monetization must be provider-backed before production revenue.
- Recruiter workflow must support company, job, candidate, communication, and audit loops.
- AI must provide defensible guidance with review, tracking, and quality controls.

Likely frustrations:

- Dense routes with many controls and local/server sync language.
- AI suggestions that are not obviously powered by a live model.
- Billing UI that can look real while the mode is demo.
- Disabled voice/video messaging actions.
- Missing global object search.
- No clear product-level setup wizard.

## 7. Workflow Analysis

| Workflow | Current journey | Ideal journey | Pain points | Recommended improvements | Effort reduction |
| --- | --- | --- | --- | --- | --- |
| Talent onboarding | Register -> dashboard -> profile/resume/jobs manually | Role intent -> setup wizard -> import resume -> profile completion -> job preferences -> first recommendations | Too much user discovery required | Add guided checklist with state and resume import first | 30-50% |
| Job application | Explore -> modal -> draft -> profile/AI draft -> submit -> details | Job -> match explanation -> choose resume -> one review -> submit -> track | Draft state is complex and local/server source can vary | Create application package model and reuse resume artifacts | 40% |
| Saved search automation | Configure filters -> save -> optional alert/digest | Save search -> preview new match logic -> choose digest -> see notification source | Alert semantics not obvious | Add saved-search management page and digest preview | 25% |
| Recruiter posting | Post Job route -> company context -> template -> review -> save/publish | Company setup -> template -> draft wizard -> preview -> publish -> applicants | Company management hidden in posting | Create Company Workspace and posting wizard | 35% |
| Candidate review | Candidates -> filters -> detail -> notes/scorecard -> status/bulk | Queue -> review checklist -> scorecard -> communication/schedule -> audited status | Communication and scheduling not first-class | Add candidate workflow timeline and message/schedule actions | 30% |
| Resume import/export | Resume route -> import modal -> select fields -> save -> export/upload | Import -> map to profile -> generate variants -> apply to jobs | Profile/resume ownership unclear | Shared career-data model and resume variants | 40% |
| Learning path | AI/Career path -> Learning search -> enroll -> lessons | Skill gap -> recommended path -> enroll -> course player -> credential/profile update | Learning and credential outcomes weak | Add learning plans, certificates, skill outcomes | 25% |
| Challenge solving | Catalog -> workspace -> local check -> submit -> history | Challenge -> real editor -> test results -> badge/proof | Textarea and limited local runner | Use code editor and judging abstraction | 35% |
| Messaging | Conversation -> send/attachment -> load older/read | Conversation -> realtime, attachments, search, typing, calls if available | Realtime/authZ runtime not proven; disabled actions | Backend-owned messaging API and feature-flag future actions | 30% |
| Billing | Billing -> plan/portal review -> external handoff attempt | Plan -> provider checkout -> webhook state -> invoices | Demo mode blocks production trust | Keep demo explicit, add live billing state machine | Risk reduction high |
| Extension job capture | Popup scan -> local draft -> local tracker | Scan -> review -> save locally or sync to web with conflict review | Sync is missing | Add authenticated optional sync and import review | 50% |

## 8. Missing Functionality Report

P0:

- Live billing provider adapter, signed webhook, idempotency, provider-owned subscription/payment state.
- AI provider integration with provenance, confidence, model/fallback state, and durable suggestion review.
- Backend-owned authorization for high-risk writes: messaging, billing, candidate decisions, application submission, file access.
- Runtime backend validation with Maven/CI, live API smoke tests, and deployed environment checks.

P1:

- Guided onboarding/setup journey.
- Global object search and command actions.
- Company Workspace for recruiters.
- Candidate communication and scheduling.
- Resume variants and application package selection.
- Backend-owned messaging realtime adapter and membership tests.
- Cloud file storage with signed URLs and provider malware scanning.
- Extension authenticated sync.

P2:

- Dedicated achievements/gamification page.
- Certificates and learning outcomes.
- Public profile share/privacy controls.
- Audit search/export.
- Course player depth and calendar reminders.
- Voice/video messaging if product keeps call controls.

## 9. Broken or Incomplete Feature Report

| Issue | Root cause | User impact | Business impact | Severity | Recommended fix | Files involved |
| --- | --- | --- | --- | --- | --- | --- |
| Billing is demo despite checkout-like UI | `billingMode.providerBacked` false; backend creates synthetic `sess_` sessions | Users may assume real billing | Payment trust/compliance risk | P0 | Keep demo labels near all actions; implement provider adapter and signed webhooks before production | `apps/frontend/src/services/paymentService.ts`, `services/payment-service` |
| AI is heuristic/static | Backend service builds fixed JSON/strings from keyword checks | Guidance quality lower than expected | Core differentiator risk | P0 | Integrate model provider, retrieval, provenance, review records | `services/ai-service/.../AiService.java`, `apps/frontend/src/pages/ai` |
| Single backend target is not implemented | `apps/backend` is shell only | Developers may choose wrong runtime | Architecture delivery risk | P1 | Define target package skeleton and migration sequence | `apps/backend`, `docs/adr/ADR-002...` |
| Chat service is orphaned | ADR-004 keeps one messaging boundary; chat is not in reactor/gateway | Future chat work can target wrong module | Duplicate messaging boundary risk | P1 | Retire or merge useful realtime adapter into messaging domain | `services/chat-service`, `services/messaging-service` |
| Local-only fallback can masquerade as durable account state | Many page workflows write browser localStorage on sync failure | Cross-device data loss/confusion | Trust and support burden | P1 | Standard source labels, sync status, retry queue, account-sync settings | Jobs, Resume, Candidates, Networking, AI, Extension |
| Generated docs and package locks are inconsistent | `apps/frontend/docs/*` and `apps/frontend/pnpm-lock.yaml` are tracked, while scripts output docs elsewhere and root uses npm | Onboarding confusion | Build/release ambiguity | P2 | Decide whether to remove or classify as generated/current; standardize package manager | `apps/frontend/package.json`, `apps/frontend/docs`, `apps/frontend/pnpm-lock.yaml` |

## 10. Technical Debt Report

| Debt | Description | Impact | Severity | Recommended fix |
| --- | --- | --- | --- | --- |
| Route components too large | Jobs 3608 lines, Candidates 2365, Resume 2353, Profile 2161, PostJob 1727 | Hard to maintain, test, and onboard | P0 | Move to feature modules with hooks, repositories, dialogs, panels |
| Hybrid data ownership | Frontend uses 45 Supabase tables directly while services/gateway also exist | Security, audit, caching, observability ambiguity | P0 | Define per-domain ownership, move high-risk writes behind backend APIs |
| Runtime verification gap | Static validators pass, but Maven/Docker/K8s/live Supabase not verified locally | Production readiness uncertain | P0 | Add CI/runtime smoke evidence and local wrapper/tooling |
| Shared backend dependency coupling | Many service POMs still depend on `ts-shared` | Service boundaries are not clean | P1 | Migrate to contracts/shared-security/shared-messaging/shared-resilience primitives |
| Fallback complexity | Many local/server fallback paths duplicate logic | Product source-of-truth confusion | P1 | Centralize sync queue and source-status model |
| Performance chunks | Jobs, Resume, Profile, Admin, Candidates, Supabase, router, modal chunks are large | Slower route load on low-end devices | P2 | Split route subpanels and defer heavy providers |

## 11. Architecture Review

Current architecture:

- Active frontend: `apps/frontend`, React/Vite, route registry, shared design system, Supabase typed client.
- Active companion app: `chrome-extension-project`, Manifest V3, browser-local storage.
- Current backend source: root Maven reactor with many Spring service modules and `api-gateway`.
- Target backend: modular monolith first with extractable boundaries, per ADR-002, but not implemented in `apps/backend`.
- Data authority: migration-first Supabase/Postgres with generated TypeScript types, per ADR-003.
- Messaging boundary: one messaging domain; `chat-service` orphaned, per ADR-004.
- Payment mode: explicit demo mode, per ADR-005.

What is good:

- Source-level governance is unusually strong: module manifest, ADR validators, API/OpenAPI contract validators, data ownership validator, security/auth validators, UI design-system validator.
- Routes and feature ownership are explicit.
- Accepted ADRs correctly reject overclaiming microservice independence or live billing.

What needs work:

- Decide and execute domain-by-domain migration from hybrid frontend/Supabase/service modules to a simpler backend-owned or explicitly client-owned model.
- Implement `apps/backend` target skeleton or stop surfacing it outside architecture planning.
- Move high-risk writes behind backend API boundaries first: billing, candidate decisions, messaging, file access, application submission.
- Add runtime smoke tests against actual backend, Supabase, gateway, auth, and scheduler environments.

## 12. Dead Code and Unused Resource Analysis

Verified candidates:

| Item | Purpose | Usage references | Dependency impact | Risk | Safe to remove? | Reason | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `services/chat-service` | Legacy/orphaned chat module | Manifest, ADR-004, validators, OpenAPI non-active operations | Not in root Maven reactor or gateway | Medium | Not yet | Could contain useful STOMP adapter/tests | Migrate useful realtime adapter code, then remove with validator update |
| `apps/backend` | Target modular-monolith shell | ADR-002, setup script, validators, docs | Not runnable app | Medium | No | Strategic target shell retained by ADR | Keep but add skeleton or mark more visibly as non-runtime |
| Root `TalentSphere-Unified/index.html` and `TalentSphere-Unified/vite.config.ts` | Stale root Vite app | Removed in dirty worktree; manifest `removedStalePaths`; historical docs | Duplicates active frontend | Low | Already deleted in worktree | Root scripts use workspace frontend | Commit deletion if intended after review |
| Legacy frontend components listed in `removedStalePaths` | Old AI/messaging/networking/dashboard widgets | Deleted in dirty worktree; manifest guards paths | Active pages own behavior | Low | Already deleted in worktree | Verified unreferenced by current manifest rationale | Commit deletion after review |
| Root helper scripts and cookie export | Local repair/dev artifacts | `PLAN.md`, `module-manifest.json`; no active source references | None for product | Medium for cookie | Yes after owner review | Classified dev-only; cookie export sensitive | Purge `notebooklm_cookies.txt`; archive or remove helper files |
| `apps/frontend/docs/*` | Generated TypeDoc HTML | Tracked files; package script outputs `../docs/frontend/html`, not this path | Low | Medium | Maybe | Could be stale generated artifact | Regenerate to intended path or remove/classify |
| `apps/frontend/pnpm-lock.yaml` | Alternate package-manager lock | Root uses npm workspace and package-lock | Medium | Medium | Maybe | Conflicts with npm guidance | Standardize on npm or explicitly document pnpm use |
| `apps/frontend/dist`, `chrome-extension-project/dist`, `apps/frontend/test-results` | Build/test outputs | Ignored by `.gitignore`; present in worktree | None if ignored | Low | Yes if untracked/ignored | Regenerated by build/test | Clean locally when not needed |
| `TalentSphere-Unified/node_modules`, extension `node_modules` | Dependencies | Ignored, local install | Required locally, not source | Low | No for local run, yes for repo artifact | Reinstallable | Keep untracked/ignored |

Never delete without final owner review:

- Historical docs. Many are classified stale, but they preserve decision history.
- `services/chat-service` until ADR-004 migration/retirement checklist is complete.
- `apps/backend` until ADR-002 migration direction is replaced or implemented.

## 13. Folder Structure Review

Current problems:

- Feature logic is split by technical type (`pages`, `services`, `lib`, `store`, `components`) rather than domain ownership.
- Route components own too much orchestration, persistence fallback, analytics, dialogs, and UI.
- Backend has active service modules plus a target backend shell, which is clear in ADRs but confusing in file layout.
- Generated/external artifacts and dev-only files are classified but some remain tracked or visible in product directories.
- Extension is isolated, which is good, but sync boundaries with web app are not yet modeled as shared contracts.

Proposed structure:

```text
TalentSphere-Unified/
  apps/
    web/
      src/
        app/
          router/
          shell/
          providers/
        features/
          auth/
          dashboard/
          jobs/
            explore/
            applications/
            saved-searches/
            posting/
          candidates/
          profile/
          resume/
          learning/
          challenges/
          networking/
          messaging/
          ai/
          billing/
          settings/
          admin/
        shared/
          ui/
          accessibility/
          analytics/
          data-access/
          sync/
          errors/
    extension/
      src/
        popup/
        options/
        content/
        background/
        shared/
    backend/
      src/main/java/com/talentsphere/
        identity/
        profile/
        jobs/
        applications/
        recruiting/
        learning/
        assessment/
        networking/
        messaging/
        billing/
        ai/
        notifications/
        files/
        admin/
        shared/
  services/
    legacy-current/
      ... current service modules until migrated ...
  infra/
  docs/
  scripts/
```

Migration plan:

1. Add `features/*` directories in frontend without moving routes yet.
2. Extract from the largest pages first: Jobs, Candidates, Resume, Profile, Post Job.
3. Move local/server sync utilities into `shared/sync`.
4. Move analytics wrappers into `shared/analytics` with domain adapters.
5. Create backend target skeleton under `apps/backend` only when Maven/build/run config is ready.
6. Migrate one backend domain at a time, preserving API/OpenAPI contracts.
7. Retire or merge `chat-service`.
8. Classify or remove stale generated docs and alternate lockfiles.

Risks:

- Large file moves can break tests and route lazy loading.
- Moving data access can change RLS/security behavior.
- Backend migration can duplicate service logic if not contract-driven.

Benefits:

- Clearer ownership, smaller files, better test locality, easier onboarding, simpler runtime story, safer production hardening.

## 14. Performance Review

Observed from production build:

- `supabaseClient` chunk: about 205 kB raw, 53 kB gzip.
- React Router shared chunk: about 198 kB raw, 65 kB gzip.
- Main index chunk: about 223 kB raw, 69 kB gzip.
- `AuraModal`: about 130 kB raw, 43 kB gzip.
- `JobsPage`: about 95 kB raw, 26 kB gzip.
- `ResumeBuilder`: about 82 kB raw, 22 kB gzip.
- `ProfilePage`, `AdminDashboard`, `CandidatesPage`: about 55-57 kB raw each.

Recommendations:

- Keep route-level lazy loading.
- Split heavy page internals into lazy subpanels and dialogs.
- Audit why shared modal chunk is large and whether federation/shared imports pull more than necessary.
- Defer Supabase-heavy services until authenticated routes need them.
- Add Lighthouse/Web Vitals checks for main user journeys.
- Add pagination/virtualization for candidate, message, notification, audit, and job lists at scale.

## 15. Security Review

Strengths:

- Auth contract validator passes for Supabase primary auth, Gateway verifier config, exact public-route matching, role normalization, rate limits, and disabled local credentials.
- Security contract validator passes for source-level secret wiring, safe public errors, file upload policy, scheduler audit, and CI scan wiring.
- File service validates size, extension, content type, content signature, active content, path safety, and malware scanner hook.
- Typed Supabase boundary validator reports 0 production compatibility-client imports.

Risks:

- Direct frontend access to 45 tables requires live RLS proof, not only source-level migration/schema checks.
- LocalStorage fallback can hold sensitive draft/profile/candidate/job context.
- Billing must not go live without signed webhooks and idempotency.
- Messaging needs membership authorization and signed attachment access.
- AI prompt/data handling needs provider privacy, retention, and audit policy before real model integration.

Recommendations:

- Add live RLS integration tests per high-risk table.
- Move high-risk writes behind backend APIs.
- Add security review for localStorage fields and extension storage data.
- Add signed URL and storage provider policy for resume/message attachments.
- Add AI data handling policy before provider launch.

## 16. Accessibility Review

Strengths:

- Many pages expose named regions, lists, tabpanels, status and alert states, progressbars, and dialog labels.
- UI design-system validation passed across 291 source files.
- Route-level tests cover keyboard/navigation semantics.

Risks:

- Very dense screens can still be cognitively difficult even when semantically labeled.
- Disabled icon-only controls, especially messaging call/video, need clear accessible alternatives.
- Runtime screen-reader walkthroughs are not verified.
- Color contrast test exists in the dirty worktree but was not run in this audit.

Recommendations:

- Run `npm run test:a11y`, `npm run test:keyboard`, and `npm run test:contrast:all` before release.
- Add screen-reader walkthrough scripts for Jobs application, Candidate review, Resume import, Messaging, Billing.
- Keep action labels specific and source-status labels visible.

## 17. Scalability Review

Product scalability:

- Jobs, candidates, messages, notifications, audit logs, and course catalog already have pagination concepts.
- Saved searches, digests, networking reminders, and scheduler scripts indicate workflow automation direction.

Technical scalability risks:

- Direct Supabase reads/writes from frontend make query-plan, RLS, and caching behavior hard to optimize centrally.
- Large route components slow feature velocity.
- Service-module topology is broad but production service independence is not proven.
- Search is fragmented and not a unified index.

Recommendations:

- Formalize cursor contracts for all high-scale lists.
- Introduce backend read models for dashboard, candidate queue, jobs search, and notifications.
- Add load tests for search, candidate queue, messaging, and dashboard.
- Keep modular monolith target until a domain proves independent scaling needs.

## 18. Refactoring Recommendations

P0:

- Extract Jobs, Candidates, Resume, Profile, and Post Job into feature modules.
- Centralize sync/fallback/source-status behavior.
- Define backend ownership for high-risk writes.
- Implement AI and billing truth-in-UI source labels.

P1:

- Build global object search.
- Create Company Workspace.
- Build onboarding state machine.
- Move messaging to a single backend-owned API/realtime contract.
- Add live RLS and provider integration tests.

P2:

- Clean package-manager/docs artifacts.
- Add generated docs lifecycle for TypeDoc.
- Add storybook or component documentation only if it supports design-system governance.

## 19. Cleanup Recommendations

Quick cleanup:

- Purge `notebooklm_cookies.txt` after owner approval.
- Decide whether `apps/frontend/pnpm-lock.yaml` remains. If npm is authoritative, remove it in a dedicated cleanup commit.
- Remove or classify `apps/frontend/docs/*`; current docs script outputs `apps/docs/frontend/html` relative to the frontend package, not `apps/frontend/docs`.
- Keep `dist`, `test-results`, and `node_modules` ignored and uncommitted.
- Commit already-deleted stale root Vite files and legacy components if the current dirty worktree changes are intended.

Do not remove yet:

- `services/chat-service` until ADR-004 migration/retirement is executed.
- `apps/backend` until ADR-002 target implementation decision is superseded or implemented.
- Historical docs until archived with document lifecycle updates.

## 20. Quick Wins

1. Add a visible "Data saved to account" versus "Saved locally only" source chip reused by Jobs, Candidates, Resume, AI, Networking, and Extension.
2. Hide or feature-flag disabled messaging call/video controls unless an alternative is available.
3. Add a first-run dashboard checklist that starts with profile/resume import and job preferences.
4. Add billing demo label directly inside plan-change and payment-method modals.
5. Add AI provenance labels: live model, heuristic, local draft, or fallback.
6. Add saved-search management and digest preview.
7. Document the package-manager decision and remove/confine alternate lockfiles.

## 21. High-Impact Improvements

1. Backend-owned high-risk workflow APIs: applications, candidate decisions, messaging, billing, files.
2. Real AI provider with source-aware suggestion review and confidence.
3. Live billing implementation with signed webhooks and idempotency.
4. Recruiter Company Workspace and candidate communication/scheduling loop.
5. Resume variants tied directly to job applications.
6. Unified global object search.
7. Extension authenticated sync with conflict review.

## 22. Long-Term Roadmap

Phase 1: Truth and cleanup

- Keep demo/local/fallback labels explicit.
- Remove or classify stale generated/dev artifacts.
- Complete runtime validation tooling for Maven, Docker, Supabase, and extension smoke.
- Extract largest frontend pages into feature modules.

Phase 2: Account-synced workflows

- Central sync queue and source-status model.
- Backend-owned writes for applications, candidates, messages, files, billing.
- Live RLS and API integration tests.
- Company Workspace and onboarding state machine.

Phase 3: Product intelligence

- Real AI provider integration with provenance, field patches, confidence, and user feedback.
- Unified search and recommendation engine.
- Learning skill-gap paths tied to jobs and profile.
- Resume variants and job-specific application packages.

Phase 4: Production readiness

- Provider-backed billing.
- Messaging realtime/member authorization.
- Observability dashboards deployed and linked from Admin.
- Load/performance/security/a11y CI gates.
- Extension sync and published update migration validation.

## 23. Final Priority Summary

P0:

- Billing live/demo truth and provider implementation before monetization.
- AI quality/provenance before positioning AI as a core differentiator.
- High-risk write ownership and live RLS/backend authorization.
- Jobs/Candidates/Resume/Profile route decomposition.

P1:

- Guided onboarding, global search, company workspace, messaging backend/realtime, file storage/signed access, extension sync.

P2:

- Cleanup generated artifacts, package-manager consistency, achievements page, learning certificates, audit export, voice/video if retained.

