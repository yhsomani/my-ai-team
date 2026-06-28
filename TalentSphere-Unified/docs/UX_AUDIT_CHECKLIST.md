# TalentSphere UX Audit Checklist

> Documentation status: Current UX audit checklist for route, dashboard, navigation, and screen redesign work.

This checklist turns the UI redesign objective into repeatable review criteria. It must be used before removing, merging, or relocating any feature. Functional behavior stays unchanged unless a separate validated product decision approves the behavior change.

## Audit Rules

- Keep every feature in one primary location, with secondary links only when they reduce task effort.
- Do not remove a page, dashboard, tab, action, field, fallback, or workflow until source usage, route ownership, role access, and tests prove the removal is safe.
- Prefer presentation consolidation before behavior consolidation. A duplicated widget can become a link, summary, or shortcut without deleting the underlying workflow.
- Review each screen for purpose, role fit, primary action, loading state, empty state, error/retry state, degraded/source label, keyboard path, and mobile layout.
- Treat dashboards as launchpads and status surfaces. Detailed work belongs in the owning domain screen.

## Feature Ownership Guardrail

- `apps/frontend/src/navigation/featureOwnership.ts` is the source-backed IA contract for major feature placement.
- Every protected route in `routeRegistry.ts` must have exactly one primary feature owner in the ownership registry.
- Public routes, shell navigation, and extension surfaces are classified separately so they do not compete with authenticated route ownership.
- Secondary feature appearances must be documented as summaries, links, search destinations, preference snapshots, or reviewed handoffs. They must not become duplicate owners.
- Candidate merge decisions, such as Career Path into AI Assistant, must stay explicit and preserve behavior until route analytics and workflow validation support the change.
- `npm run test:ia` validates route ownership, public route ownership, secondary entry-point references, role alignment, and duplicate-owner prevention.

## Screen Inventory And Decisions

| Screen | Primary purpose | Necessity | Merge or restructure decision | UX action |
| --- | --- | --- | --- | --- |
| Landing | Public product entry and auth handoff | Necessary | Keep separate from authenticated app shell | Tighten first-screen value, reduce marketing clutter, preserve login/register links |
| Login / Register | Session and role bootstrap | Necessary | Keep as focused auth flow | Use one form pattern, clear errors, visible role/company handoff |
| Dashboard | Role-specific overview and recovery launchpad | Necessary | Keep, but only show summaries and next actions | Remove detailed duplicates; link to Jobs, Learning, Candidates, Messaging, Profile, and Admin owners |
| Admin Console | Operational state, audit, scheduler, analytics | Necessary for admins | Keep separate from user dashboard because audience and risk differ | Use severity/source hierarchy and avoid presenting inferred data as healthy |
| Jobs | Job discovery, saved searches, applications | Necessary | Single owner for job search, saved searches, application drafts, and application status | Keep dashboard links summary-only; avoid duplicating application management elsewhere |
| Post Job | Recruiter job creation and publish review | Necessary for recruiters | Keep as job-domain command route | Structure as stepwise job setup, company readiness, review, publish |
| Candidates | Recruiter application review, notes, scorecards | Necessary for recruiters | Single owner for candidate pipeline and status decisions | Keep dashboard metrics only; do not duplicate candidate actions in Dashboard |
| Profile | Public profile, identity details, skills, avatar | Necessary | Profile owns durable user profile data | Resume-specific artifacts link out to Resume instead of duplicating editors |
| Resume | Resume builder, imports, export artifacts | Necessary | Keep as focused document tool linked from Profile | Use tabs/tool surfaces; do not duplicate profile CRUD beyond reviewed imports |
| Learning | Courses, enrollment, progress | Necessary for talent users | Single owner for LMS workflows | Dashboard shows continue/recovery shortcuts only |
| Challenges | Coding challenge browsing and submissions | Necessary for talent users | Keep separate from Learning because assessment behavior differs | Use clear locked/loading/submission status and stable coding workspace layout |
| AI Assistant | Draft generation and review queue | Necessary | Keep as assistant/review hub | Handoffs should deep-link to owning screens; never mutate destination records automatically |
| Career Path | Generated career guidance | Candidate for AI merge | Keep route until validated; present as AI-driven guidance pattern | Consider future merge into AI as a tab after route analytics and user-flow validation |
| Networking | Suggestions, connections, follow-up reminders | Necessary | Single owner for connections and reminder workflows | Avoid duplicating messaging; link to Messages for conversations |
| Messaging | Conversations, realtime updates, attachments | Necessary | Single owner for direct conversation work | Header/dashboard can surface unread summaries only |
| Billing | Plans, demo/provider state, transaction history | Necessary | Keep full billing page; Settings may show a billing snapshot/link | Avoid plan-management duplication in Settings |
| Settings | Account, notification, security preferences | Necessary | Owns preferences and account actions with safe notification/billing load and action recovery | Link to Billing/Profile for detailed domain workflows |
| Not Found | Recovery from invalid routes | Necessary | Keep as wildcard recovery, not a dashboard duplicate | Offer public auth recovery or role-valid app destinations |
| Extension Popup/Options | Local job companion workflows | Necessary outside web shell | Keep separate local-first IA | Align tokens where possible; preserve local-only behavior |

## Public Landing Implementation Notes

- `/` remains necessary as the unauthenticated public entry and auth handoff route.
- Landing stays outside the authenticated app shell so returning authenticated users can still be redirected by Login/Register while public visitors see clear role entry points.
- The route now uses token-backed navigation, hero, product-preview, feature, IA, stats, and footer sections with normal letter spacing, 8px surfaces, clear source labels, and mobile-safe wrapping.
- Public stat loading, typed Supabase profile/job count calls, fallback stats, timestamp/source labeling, `/login`, `/register`, `/register?role=talent`, and `/register?role=recruiter` links were preserved.
- No public route, auth redirect, Supabase count query, fallback behavior, CTA destination, or role-selection handoff was removed in this landing UI pass.
- Login/Register share `AuthShell`; public login now exposes only configured email/password auth controls, while inactive social-login and public reset-password controls stay hidden until validated provider behavior is wired.
- Login/Register provider failures use safe public copy, hide raw provider errors and token-like values, and preserve invalid-credential plus weak-password guidance.
- `apps/frontend/tests/auth-entry-workflow.spec.ts` verifies configured email login, accessible invalid-credential errors, inactive provider-control removal, and registration role-intent selection across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/auth/AuthEntry.test.tsx` verifies safe Login/Register provider-failure copy, raw provider-error exclusion, invalid-credential copy, weak-password guidance, and registration role-intent context.

## Not Found Recovery Implementation Notes

- `*` remains necessary as the catch-all recovery surface for invalid, mistyped, or unavailable routes.
- Public visitors see focused recovery to Home, Sign in, Create talent account, and Create recruiter account without exposing authenticated app destinations.
- Authenticated users see Dashboard recovery plus role-filtered destination shortcuts from the same route registry/search metadata used by the shell.
- `apps/frontend/src/navigation/featureOwnership.ts` classifies wildcard recovery as its own public-route owner so it is not merged into Dashboard or Landing by accident.
- `apps/frontend/tests/not-found-recovery.spec.ts` verifies public auth recovery links and authenticated role-filtered app destinations across Chromium, Firefox, and WebKit.
- `apps/frontend/tests/visual-layout.spec.ts` and `apps/frontend/tests/accessibility-semantics.spec.ts` now include the public Not Found recovery route at desktop and mobile widths.
- No catch-all route, protected-route redirect behavior, auth route, role gate, app destination, or domain workflow behavior was removed in this Not Found recovery pass.

## Global Runtime Recovery Implementation Notes

- `ErrorBoundary` is necessary as the fatal route/shell recovery surface for unexpected render failures; it is separate from wildcard Not Found recovery and must not become a debugging screen.
- Public fallback copy must use safe product language, distinguish service/network failures from generic runtime failures, and keep raw exception messages in logs rather than visible UI.
- Recovery must provide a clear reload action while preserving the existing custom `fallback` slot for screens that already supply domain-specific fallback UI.
- `apps/frontend/src/components/error/ErrorBoundary.test.tsx` verifies safe copy, service-unavailable copy, custom fallback passthrough, and reload recovery without exposing raw exception messages.

## Dashboard Restructuring Checklist

- Dashboard has a single role-specific purpose statement.
- Dashboard cards answer "what changed?", "what needs attention?", and "where do I act?"
- Dashboard does not contain full domain CRUD controls when the domain page already owns them.
- Metrics are clickable only when they navigate to the owning domain screen.
- Degraded, stale, inferred, fallback, and mock-like data are visibly labeled.
- Admin operational dashboard remains role-gated and distinct from user/recruiter dashboard.

## Dashboard Implementation Notes

- `/dashboard` remains necessary as the authenticated launchpad for talent and recruiter users.
- Talent dashboard presentation is summary-only: activation checklist, freshness status, applications/messages/XP/level metrics, recent opportunities, quick actions, and active challenge summaries.
- Recruiter dashboard presentation is summary-only: recruiter setup checklist, freshness status, jobs/applicant/new/offer metrics, recent applications, and quick actions.
- Detailed job search, applications, candidate review, messaging, challenges, learning, profile editing, and admin operations remain owned by their domain routes.
- Dashboard metrics, quick actions, and panel headers now share local presentation helpers so talent and recruiter dashboards use the same visual structure without changing analytics events or destinations.
- Dashboard partial/error issue rows now show bounded section labels and safe retry copy rather than raw provider error strings; issue-specific retry still uses the existing dashboard refresh workflow.
- `apps/frontend/tests/dashboard-workflow.spec.ts` verifies talent summary metrics, partial-data status and retry intent, recruiter summary metrics, role-specific primary actions, stat-card handoffs, quick-action handoffs, and dashboard workflow analytics across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/dashboard/DashboardPage.test.tsx` verifies safe Dashboard status-strip issue copy, raw provider-error exclusion, and retry through the existing refresh workflow.
- Legacy dashboard widget components under `pages/dashboard/components` have been normalized to token-backed surfaces and plain product language so they do not reintroduce the older neon/fictional visual system if reused.
- No dashboard route, role gate, service call, analytics event name, destination route, or data mutation behavior was removed in this dashboard UI pass.

## Admin Implementation Notes

- `/admin` remains necessary as the admin-only operational console for metrics, service health, audit logs, scheduled automation rollout state, and product analytics insights.
- Admin stays separate from user and recruiter dashboards because the audience, source-state semantics, and operational risk are different.
- The Admin route now presents loading, fallback/degraded, analytics, scheduler, service-health, and audit-log sections with token-backed surfaces, visible source badges, mobile-safe wrapping, and a horizontally bounded service table.
- Top-level Admin Console load failures keep the route heading visible, hide raw service error strings, and provide a Retry admin console action that reuses the existing refresh workflow for metrics, service health, scheduler status, analytics insights, and audit events.
- Product analytics and scheduler subsections use plain section headings, wrapped long labels, and compact status badges so live, fallback, degraded, and configured states remain visible without implying unverified production health.
- Browser-level Admin coverage in `tests/admin-operations.spec.ts` verifies operational sections, expected scheduler jobs, no provider-run-history claims when no provider is configured, audit pagination, isolated audit retry recovery, service investigation handoffs, scheduled automation status refresh, and sanitized Admin operational analytics across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/admin/AdminDashboard.test.tsx` verifies safe Admin Console failed-load copy, raw error-message exclusion, and retry through the existing refresh workflow.
- No Admin route, service call, scheduler-status read, audit pagination behavior, observability link behavior, refresh action, source label, admin analytics event, or role gate was removed in this UI pass.

## Jobs Implementation Notes

- `/jobs` remains necessary as the single owner for job discovery, saved searches, hidden Explore preferences, applications, application drafts, application status, and recruiter job posting lists.
- `Post Job` remains a separate job-domain command route because it is a multi-step creation/review workflow, but it is discovered from Jobs and recruiter dashboard actions.
- Dashboard job cards remain summary handoffs only; detailed search, filtering, applying, saved-search management, hidden-job restore, and posting checklist review stay in Jobs.
- The Jobs route now presents tabs, route search, Explore filters, saved searches, hidden preference controls, and status summaries as one framed workspace tool instead of disconnected blocks.
- Jobs Explore catalog failed-load recovery keeps the route heading and search/filter surface visible, uses fixed safe copy, hides raw provider errors, and exposes Retry jobs through the existing catalog refetch workflow.
- Jobs Applied-tab application history failed-load recovery keeps the route heading and application search surface visible, uses fixed safe copy, hides raw provider errors, and exposes Retry applications through the existing application history load workflow.
- Jobs My Posts recruiter postings failed-load recovery keeps the route heading and posting search surface visible, uses fixed safe copy, hides raw provider errors, and exposes Retry postings through the existing recruiter job load workflow.
- Jobs application-submit and recruiter publish failures stay inside their existing Review Application and publish checklist modals, use safe retry copy, hide raw provider errors, keep drafts/postings unchanged, and preserve retry through the existing action buttons.
- Jobs saved-search and hidden Explore preference sync failures keep local controls available, use fixed safe fallback copy, hide raw provider errors, and explain when all current Explore results are hidden by visibility preferences.
- Jobs saved-search and hidden Explore browser storage failures keep current-session saved/hidden controls available, use fixed safe local-storage copy, hide raw quota/provider errors, and keep hidden-job restore controls available.
- Jobs application draft browser-storage, draft-history storage, and account-sync failures stay inside the Review Application modal with safe inline copy, hide raw quota/provider errors, preserve editable draft fields, and keep Submit Application available.
- Job, application, and recruiter posting cards now share stable dimensions and token-backed card styling so result grids scan consistently across tabs.
- Application review and application-detail modals use token-backed text color and inset surfaces for light/dark readability.
- Browser-level Jobs coverage in `tests/job-application.spec.ts` verifies the core apply workflow, saved-search create/apply/review-cancel/delete paths, and hidden Explore hide/restore paths across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/jobs/JobsPage.test.tsx` verifies safe Explore catalog failed-load copy, raw provider-error exclusion, and retry through the existing jobs catalog refetch workflow.
- `apps/frontend/src/pages/jobs/JobsPage.test.tsx` also verifies safe Applied-tab application history failed-load copy, raw provider-error exclusion, and retry through the existing application history load workflow.
- `apps/frontend/src/pages/jobs/JobsPage.test.tsx` also verifies safe My Posts recruiter postings failed-load copy, raw provider-error exclusion, and retry through the existing recruiter job load workflow.
- `apps/frontend/src/pages/jobs/JobsPage.test.tsx` also verifies safe application-submit and recruiter publish failure copy, publish-readiness policy sanitization, raw provider-error exclusion, and retry through the existing Review Application and publish checklist workflows.
- `apps/frontend/src/pages/jobs/JobsPage.test.tsx` also verifies safe application draft browser-storage, draft-history storage, and account-sync failure copy, raw quota/provider-error exclusion, preserved editable draft state, and Submit Application availability in the existing Review Application workflow.
- Browser-level recruiter publish coverage in `tests/recruiter-publish.spec.ts` verifies My Posts publish review, complete-draft checklist, publish update payload, success receipt, published badge, and View Checklist state across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Jobs tab, service call, route parameter, saved-search behavior, hidden preference behavior, application draft behavior, application submission behavior, recruiter publish review behavior, or analytics call was removed in this Jobs UI pass.

## Post Job Implementation Notes

- `/jobs/post` remains necessary as the recruiter job-domain command route for company context setup, reusable job templates, draft history, duplicate review, and reviewed save-to-draft behavior.
- Jobs remains the discovery/list owner for recruiter postings; Post Job owns draft creation/edit review and returns to Jobs postings after save.
- The Post Job route now uses token-backed form controls, framed template/history/company panels, compact review-state summaries, warning duplicate panels, and stable mobile footer actions.
- Post Job edit-draft context failed-load recovery keeps the route heading, template controls, company context, and editable draft form visible, uses fixed safe copy, hides raw provider errors, and exposes Retry draft context through the existing recruiter jobs load workflow.
- Post Job company context failed-load recovery keeps the company panel and editable draft form visible, uses fixed safe copy, hides raw provider errors, and exposes Retry company context through the existing recruiter company lookup workflow.
- Post Job company create/update and draft save/update failures use fixed safe action copy, hide raw provider errors, preserve the owning company form or draft review state, and keep retry on Create & Attach Company, Save Company Profile, Save Draft, or Save Changes.
- Post Job template save/delete and draft-history browser storage failures use accurate safe copy when account sync also fails or account deletion succeeds while browser storage is unavailable, hide raw quota/provider details, and keep the current form or review state visible for the same workflow.
- Company profile creation/update remains separate from job draft save and does not publish a role, contact candidates, send messages, or create notifications.
- Browser-level Post Job coverage in `tests/post-job-workflow.spec.ts` verifies company context create/attach payloads, template save/apply/delete review, draft-history restore, duplicate warning review, reviewed draft save payloads, and the return to Jobs postings across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/jobs/PostJobPage.test.tsx` verifies safe edit-draft context failed-load copy, safe company context failed-load copy, safe company and draft action-failure copy, accurate template save/delete and draft-history browser-storage failure copy, raw provider/quota-error exclusion, and retry or preserved state through the existing recruiter jobs, company lookup, company action, draft save, template, and draft-history workflows.
- No Post Job route parameter, template local/account sync behavior, draft-history local/account sync behavior, company setup onboarding analytics, company create/update behavior, duplicate check behavior, review-before-save behavior, draft save/update behavior, navigation behavior, or service call was removed in this UI pass.

## Candidates Implementation Notes

- `/candidates` remains necessary as the recruiter-owned application review workspace for candidate search, cursor paging, review focus, private notes, scorecards, interview-plan drafts, queue navigation, status decisions, and bulk status reviews.
- Dashboard candidate metrics remain summary handoffs only; detailed candidate review, private note editing, scorecard editing, interview readiness, status confirmation, and bulk status decisions stay in Candidates.
- The Candidates route now presents search, focus, sort, and pagination as one framed workspace tool; review analytics, bulk actions, candidate rows, detail sections, and confirmation modals use token-backed surfaces and status colors.
- Candidate rows keep stable dimensions and preserve visible review metadata for notes, scorecards, advisory signal, resume access, and status actions without moving those actions to Dashboard or Jobs.
- Candidate detail and bulk-status review modals use inset panels for identity, materials, advisory signal, interview plans, scorecards, notes, eligible applications, skipped applications, and status-change consequences.
- Candidate application-list load failures keep the route heading and search/refresh context visible, use fixed safe copy, hide raw provider errors, and expose Retry candidates through the existing candidate application page load workflow.
- Candidate single-status failures stay inside the status confirmation modal with fixed safe retry copy; all-failed bulk status updates now say no status changes were saved instead of implying partial success, while preserving retry through the same bulk confirmation.
- `apps/frontend/tests/candidate-review.spec.ts` now verifies deterministic candidate rendering, Candidate Details review, scorecard save payloads, scorecard local fallback and retry, private note save/delete payloads, status confirmation, application status update payloads, failed status handling, status-event audit payloads, first-candidate queue handoff, Previous/Next queue navigation, keyboard pagination/search/details/queue navigation, Select visible, bulk Interview/Offer/Rejection eligibility and skipped reviews, bulk partial-failure handling, unsaved note guard, Keep Changes, Reset Drafts, no-save reset behavior, application pagination, profile-backed search, and review-focus filtering across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/candidates/CandidatesPage.test.tsx` verifies safe Candidates application-list failed-load copy, single-status failure copy, all-failed bulk status copy, raw provider-error exclusion, and retry through the existing candidate application page load and confirmation workflows.
- No candidate route, service call, cursor state, review focus behavior, note persistence behavior, scorecard persistence behavior, interview-plan draft behavior, status update behavior, bulk review behavior, reset-review behavior, or analytics call was removed in this Candidates UI pass.

## Profile Implementation Notes

- `/profile` remains necessary as the durable identity workspace for headline, location, bio, avatar, skills, experience, education, achievements, local suggestions, and AI profile-draft review.
- Resume remains the owner for document import/export artifacts; Profile may link to or receive reviewed profile row imports, but it should not duplicate Resume Builder editing and export flows.
- The Profile route now has no remaining legacy letter-spacing classes, and the shared shell/header/app-page constraints were tightened so Profile tabs, header actions, avatar controls, and metrics do not create mobile horizontal overflow.
- Profile failed-load recovery now keeps the route heading visible, uses fixed safe copy, hides raw provider errors, and exposes a Retry profile action through the existing profile load workflow.
- Profile basic-save, completion-row save, row-delete, avatar-upload, and avatar-removal failures now use fixed safe copy in the owning edit/review modal, hide raw provider errors, and keep retry on the existing Profile action buttons.
- Existing token-backed profile cards, modals, tabs, avatar crop/remove reviews, suggestion panels, completion tasks, and row edit/delete controls remain in place.
- `apps/frontend/tests/profile-workflow.spec.ts` now verifies deterministic AI profile draft save/discard, reviewed profile field saves, profile suggestion application, skill edit/delete, experience edit/delete, education add/edit/delete, tab switching, and avatar upload/crop/remove payloads across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/profile/ProfilePage.test.tsx` verifies safe Profile failed-load copy, safe basic-save/completion-row/row-delete/avatar action-failure copy, raw provider-error exclusion, and retry through the existing profile load and action workflows.
- `profileAvatarCrop` now has unit coverage for the canvas `toBlob` path plus a data URL export fallback so reviewed avatar uploads do not hang when a browser never resolves `toBlob`.
- No Profile route parameter, profile load behavior, edit modal behavior, AI draft review/discard/save behavior, local suggestion prefill behavior, avatar upload/crop/remove behavior, skill/experience/education create/edit/delete behavior, tab behavior, toast behavior, or analytics call was removed in this UI pass.

## Resume Implementation Notes

- `/resume` remains necessary as the focused document workspace for profile-backed editor fields, reviewed text/file import, AI resume draft review, PDF/HTML/print export commands, uploaded artifact links, delete receipts, and preview.
- Profile remains the owner for durable skills, experience, and education rows; Resume may save reviewed detected profile rows through existing Profile services, but it should not duplicate Profile row editing or deletion surfaces.
- Resume Builder profile-data load failures keep the route heading, editor/export surface, and retry path visible, use fixed safe copy, hide raw provider errors, and retry through the existing profile load workflow.
- Resume Builder action failures for Save Changes, Upload PDF, Delete PDF, Save Skills, and Save Rows now show safe inline copy at the owning page/review surface, hide raw provider errors, and retry through the existing Resume action buttons.
- `apps/frontend/tests/resume-workflow.spec.ts` now verifies deterministic import text review, selected field application, imported skill/experience/education save payloads, editor save payloads, Preview tab rendering, native PDF and HTML download file names, provider PDF upload payloads, export-event sync payloads, uploaded artifact metadata payloads, Copy Link clipboard behavior, reviewed uploaded-PDF delete cancel/confirm, provider delete payloads, deleted metadata payloads, AI resume draft apply/save, and AI resume draft discard across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/profile/ResumeBuilder.test.tsx` verifies safe Resume Builder profile-data failed-load copy, save/upload/delete/import-save action-failure copy, raw provider-error exclusion, and retry through the existing resume load and action workflows.
- No Resume route behavior, profile load/update behavior, import parser behavior, selected-field application behavior, imported skill/row save behavior, AI handoff review behavior, PDF/HTML export behavior, provider upload/delete behavior, artifact copy behavior, local/account sync fallback, toast behavior, or analytics call was removed in this UI pass.

## Settings Implementation Notes

- `/settings` remains necessary as the account preference workspace for profile settings, notification preferences, security reviews, account deactivation review, and billing handoff.
- Billing remains the owner for plan and payment management; Settings shows only a summary and deep-link action.
- Profile remains the durable public profile owner; Settings edits account/profile preference fields without duplicating the full Profile editing surface.
- The Settings route and its profile, notification, security, and billing subcomponents now use token-backed nav rows, panels, custom switches, delivery controls, summary tiles, and destructive review surfaces without legacy hard-coded color classes or oversized rounded controls.
- Settings notification/billing failed-load recovery uses fixed safe copy, hides raw provider errors, keeps the account preference workspace usable, and exposes Retry settings through the existing settings data load workflow.
- Settings profile-save, password-reset, and account-deactivation failures use fixed safe copy in the owning panel or review modal, hide raw provider errors, and keep retry on the existing Settings action buttons.
- `apps/frontend/tests/settings-workflow.spec.ts` now verifies deterministic profile settings save payloads, keyboard-accessible notification switch changes, digest and quiet-hours delivery preference save payloads, Billing summary/handoff, password reset review cancel/send behavior, account deactivation review cancel/confirm behavior, notification save failure retention, retry success, and settings workflow analytics across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/settings/SettingsPage.test.tsx` verifies safe notification/billing failed-load copy, safe profile-save/password-reset/account-deactivation failure copy, raw provider-error exclusion, and retry through the existing settings load and action workflows.
- No Settings tab behavior, profile settings save behavior, notification preference/delivery save behavior, password reset review behavior, account deactivation confirmation behavior, billing handoff behavior, toast behavior, or analytics call was removed in this UI pass.

## Learning Implementation Notes

- `/lms` remains necessary as the talent-owned learning workspace for course discovery, AI-assisted catalog search review, enrollment, active progress, lesson selection, and lesson completion.
- Dashboard learning widgets remain continue/recovery handoffs only; detailed catalog search, progress filtering, recommended courses, enrollment, curriculum review, and lesson-completion commands stay in Learning.
- The Learning route now presents tabs, catalog search, result counts, page-size selection, and pagination as one framed catalog workspace instead of disconnected controls.
- Continue Learning, Recommended Next, catalog cards, loading skeletons, progress warnings, and course-detail modal sections use token-backed surfaces, stable card dimensions, and shared progress-track styling.
- Learning course-catalog failures now use fixed safe copy, hide raw provider errors, and expose a Retry Courses action through the existing catalog fetch workflow.
- Learning enrollment and lesson-completion persistence failures now use fixed safe toast copy, hide raw provider errors, keep course/progress state available, and preserve retry through the existing Enroll Now and Mark Complete actions.
- AI learning-plan suggestions remain review-only: applying a suggestion changes only catalog search, and enrollment/progress actions remain explicit Learning commands.
- Browser-level Learning coverage in `tests/lms-workflow.spec.ts` verifies the AI Assistant to Learning handoff, consumed route-state draft cleanup after search application, explicit AI catalog-search application, course search and pagination controls, enrollment payloads, failed enrollment recovery, lesson-completion payloads, failed progress-persistence recovery, keyboard lesson selection/completion, progress updates, and In Progress filtering across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/lms/LMSPage.test.tsx` verifies safe Learning course-catalog failed-load copy, raw provider-error exclusion, and retry through the existing course catalog fetch workflow.
- `apps/frontend/src/pages/lms/LMSPage.test.tsx` verifies safe enrolled-course progress failed-load copy, raw provider-error exclusion, and retry through the existing enrollment progress load workflow.
- `apps/frontend/src/pages/lms/LMSPage.test.tsx` verifies safe enrollment and lesson-completion action-failure copy, raw provider-error exclusion, unchanged progress state, and retry through the existing Enroll Now and Mark Complete workflows.
- No LMS route, Redux query state, cursor behavior, tab behavior, search behavior, enrollment behavior, lesson-completion behavior, AI suggestion review behavior, toast behavior, or analytics call was removed in this Learning UI pass. LMS progress persistence now treats Supabase fallback read/write errors as failed saves instead of presenting unsaved lesson progress as complete.

## Challenges Implementation Notes

- `/challenges` remains necessary as the talent-owned assessment workspace for challenge discovery, category filtering, prompt review, starter-code editing, local sample checks, submission, and retry history.
- Learning remains the owner for courses and lesson progress; Challenges stays separate because assessment behavior includes code editing, local execution safeguards, submission history, and judge/result state.
- Dashboard challenge widgets remain summary handoffs only; detailed category filtering, solving, reset review, sample checks, submissions, and retry history stay in Challenges.
- The Challenges route now presents category filters as one framed assessment workspace control; challenge cards, loading skeletons, prompt/editor panels, sample cases, local-check results, latest submission, retry history, and reset review use token-backed surfaces and stable dimensions.
- Top-level challenge catalog failures use safe product copy, hide raw service error strings, and provide a Retry challenges action that reuses the existing Redux fetch workflow.
- Challenge submission failures use safe toast copy, hide raw provider errors, keep the workspace and retry history available, and preserve retry through the existing Submit Solution action.
- Reset Code remains a reviewed confirmation that only restores the editor to starter code; it does not submit work or mutate retry history.
- Browser-level Challenges coverage in `tests/challenges-workflow.spec.ts` verifies category filtering, workspace open, local sample-check result handling, unsupported-language and hidden-sample no-submit safeguards, reviewed starter-code reset, submission payloads, failed-submission recovery, latest result rendering, and retry-history refresh across Chromium, Firefox, and WebKit with deterministic local data boundaries. WebKit currently verifies the graceful local-check timeout state because the Blob worker runner does not complete in that runtime.
- `apps/frontend/src/pages/challenges/ChallengesPage.test.tsx` verifies safe catalog failed-load copy, safe submission action-failure copy, raw provider-error exclusion, unchanged retry history after failed persistence, and retry through the existing fetch and Submit Solution workflows.
- No Challenges route, Redux fetch behavior, category analytics, workspace open behavior, language selection, starter-code reset review, local sample check behavior, hidden-sample messaging, submission behavior, submission failure behavior, retry-history behavior, toast behavior, or analytics call was removed in this Challenges UI pass.

## Networking Implementation Notes

- `/networking` remains necessary as the single owner for professional suggestions, connection requests, accepted connections, hidden-suggestion preferences, and follow-up reminder controls.
- Messaging remains the owner for direct conversations; Networking can identify people and manage relationship state, but it should not duplicate thread reading, sending, attachments, or message retry behavior.
- The Networking route now presents tabs, counts, search, hidden-suggestion restore, and reminder status as one framed workspace control; suggestion, incoming request, sent request, and accepted-connection cards use token-backed surfaces, stable dimensions, truncation, and shared empty/loading/error states.
- Top-level Networking suggestion-load failures keep the route heading visible, hide raw Redux/service error strings, and provide a Retry network action that reuses the existing suggestion fetch workflow.
- Networking Connect, incoming Accept, incoming Decline, and sent-request Withdraw failures now show safe inline copy in the owning card, hide raw provider strings, and keep retry on the same existing action button.
- Exported networking subcomponents under `pages/networking/components` have been normalized to product-language token surfaces so the older themed networking UI does not return if those components are reused.
- Browser-level Networking coverage in `tests/networking-workflow.spec.ts` verifies deterministic suggestion rendering, profile preview, hidden-suggestion hide/restore preference sync, reviewed connection request payloads, incoming accept/decline payloads, sent reminder set/clear status, withdraw payloads, accepted connection profile preview, keyboard preview activation, and full-profile popup route targets across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/networking/NetworkingPage.test.tsx` verifies safe Networking failed-load and action-failure copy, raw error-message exclusion, and retry through the existing fetch, Connect, Accept, Decline, and Withdraw workflows.
- No Networking route, Redux suggestion fetch behavior, connection-state load behavior, connect request behavior, incoming accept/decline behavior, sent withdraw behavior, local/account hidden-suggestion preference behavior, local/account reminder sync behavior, profile preview behavior, toast behavior, or analytics call was removed in this Networking UI pass.

## Messaging Implementation Notes

- `/messaging` remains necessary as the single owner for direct conversation work, message history, unread/read state, realtime updates, attachments, optimistic sends, retries, and suggested reply drafts.
- Header, dashboard, and Networking surfaces may summarize unread activity or link into Messages, but conversation reading, sending, attachment review, and retry behavior stay in Messaging.
- The Messaging route now presents the conversation list and active thread as one framed workspace with token-backed list rows, bounded message bubbles, attachment and suggested-reply composer panels, visible realtime subscription state, stable mobile panel switching, and normalized loading, empty, error, and retry states. Opening the attachment panel moves focus to the link field, and the hidden file input stays behind the visible Upload file button instead of becoming an extra tab stop.
- Conversation-list and selected message-history failed-load states now use fixed safe copy, hide raw provider errors, and expose explicit Retry conversations, Retry message history, or Retry older messages actions through the existing Redux load workflows.
- Message send, attachment upload, and visible mark-read failures now use fixed safe copy, hide raw provider errors, keep failed messages/unread state available, and preserve retry/status recovery through the existing Messaging action workflows.
- Exported messaging subcomponents under `pages/messaging/components` have been normalized to the same product-language token surfaces so the older themed messaging UI does not return if those components are reused.
- Browser-level Messaging coverage in `tests/messaging-workflow.spec.ts` verifies deterministic conversation rendering, active-thread selection, message-history rendering, text-send payloads, failed-send retry, keyboard attachment-link focus order, uploaded-file and linked attachment send payloads, keyboard visible mark-read update payload/feedback, keyboard older-history loading, sent feedback, and persisted sent-message/attachment display across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/messaging/MessagingPage.test.tsx` verifies safe conversation/message-history failed-load copy, send/upload/mark-read action-failure copy, raw provider-error exclusion, failed-message retry, and unread-state preservation through the existing Messaging workflows.
- No Messaging route, Redux fetch behavior, Supabase realtime subscription behavior, message-history pagination, unread mark-read behavior, optimistic send/retry behavior, attachment link/upload behavior, suggested-reply behavior, file upload service call, or analytics call was removed in this Messaging UI pass.

## Billing Implementation Notes

- `/billing` remains necessary as the owner for plan comparison, payment method handoff review, transaction history, provider unavailable state, and explicit demo/provider-backed source labeling.
- Settings may link to Billing or show a summary, but plan review, checkout handoff, payment-method review, retry behavior, and history inspection stay in Billing.
- The Billing route now presents plan comparison, payment method, and transaction history with token-backed sections, mobile-safe card grids, wrapped user/provider text, status badges, inline demo/degraded state, and stable modal action layouts.
- Billing provider-unavailable load failures now use fixed safe copy, hide raw provider errors, and expose an explicit Retry billing data action that reuses the existing billing data load workflow.
- Billing plan checkout and billing portal failures stay in the existing Review Plan and Update Payment Method modals, use fixed safe retry copy, hide raw provider errors, and keep subscription/payment state unchanged until the existing Continue or Open Billing Portal action succeeds.
- Demo billing mode remains explicit. Plan changes and billing portal actions are still requests or handoffs until provider-backed checkout and webhook-owned subscription/payment state are implemented.
- `apps/frontend/tests/billing-workflow.spec.ts` now verifies deterministic plan catalog/current-plan rendering, populated transaction history, plan review cancel/checkout handoff payloads, billing portal handoff payloads, provider checkout failure retention and retry, popup-blocked checkout warning, provider-unavailable load state, retry recovery, explicit demo-mode copy, and billing workflow analytics across Chromium, Firefox, and WebKit.
- `apps/frontend/src/pages/billing/BillingPage.test.tsx` verifies safe provider-unavailable and action-failure copy, raw provider-error exclusion, and retry through the existing billing data load, Review Plan, and Update Payment Method workflows.
- No Billing route, payment-service call, Supabase plan/history/subscription load, checkout/session command, billing portal command, review modal behavior, toast behavior, retry behavior, or analytics call was removed in this Billing UI pass.

## Resume Implementation Notes

- `/resume` remains necessary as the focused document workspace for resume editor fields, import review, AI draft review, export commands, uploaded PDF artifact links, delete receipts, and preview.
- Profile remains the owner for durable profile rows. Resume may save reviewed profile fields, imported skills, and imported experience/education rows through existing profile-service commands, but it does not replace Profile as the full CRUD workspace.
- The Resume route now uses token-backed loading, import review, editor, preview, and artifact/delete-review surfaces with mobile-safe wrapping for long profile text, provider links, imported values, and preview contact lines.
- Resume profile-data load failure recovery uses token-backed safe copy, keeps the editor/export context visible, hides raw provider errors, and exposes Retry resume data through the existing profile load workflow.
- Resume action/provider failure recovery uses token-backed safe inline alerts for profile-field save, provider upload, uploaded-PDF delete, detected-skill save, and detected-profile-row save failures while preserving the existing retry buttons and command ownership.
- The shared `AuraModal` primitive now uses app surface tokens, 8px radius, bounded scroll, and stacked mobile footer actions so Resume import/delete reviews and other route modals no longer inherit the old Aurora modal shell.
- No Resume route, AI handoff, import parsing, selected-field application, profile row save, PDF export, HTML export, print export, uploaded artifact library, delete receipt, copy link, toast behavior, local/account sync fallback, or analytics call was removed in this Resume UI pass.

## Extension Popup Implementation Notes

- `chrome-extension-project/src/popup` remains necessary as the local-first companion popup for tracked jobs, scanned page drafts, local diagnostics, and operational analytics export.
- The popup stays separate from the web shell because it runs inside MV3, uses `chrome.storage.local` or localStorage fallback, and must preserve the local-only sync posture unless ADR-006 changes that decision.
- Popup shell, dashboard, tracker rows/forms, scanned draft review, job delete review, diagnostics panels, shared error boundary, and popup HTML wrapper now use extension-local tokens, 8px card/control radius, visible focus rings, wrapped long metadata, and responsive popup width.
- Page Scan now shows safe Dashboard live status copy for scanning, draft-ready, limited-draft, no-draft, and failed-scan states; limited-confidence scanned drafts show an inline Tracker review warning before Save to Tracker; visible popup logs avoid raw page-scan runtime errors.
- The popup still owns only local tracker/draft/diagnostic actions. Options remains the owner for resume match preview, interview planner, and local settings.
- No storage key, local fallback, content/background messaging action, scan draft mapping, tracked-job mutation, diagnostics export, clear-review behavior, runtime smoke contract, or operational analytics event was removed in this popup UI pass.

## Extension Options Implementation Notes

- `chrome-extension-project/src/options` remains necessary as the local-first console for resume match preview, interview planner cards, local reminder/diagnostics preferences, and sync-disabled review copy.
- Resume Match remains a local keyword-overlap preview, not AI or cloud sync. It does not store or transmit raw pasted job/resume text.
- Resume Match now shows safe inline status for missing text, short text, large pasted text, comparing, and ready states; target/resume textareas use real labels, invalid-state semantics, helper descriptions, character counts, live alert/status copy, and a named result region.
- Interview Planner now uses programmatic labels for topic/category controls, live empty-topic validation, list/listitem semantics for local prep cards, native stateful card toggle buttons, and Settings reset review relationships. Usage diagnostics still records only category/count/entry-point bands and never raw prep topics.
- Options storage failures now show safe live warnings for preparation cards and local settings when a load/save operation fails. The warnings do not expose quota exceptions, Chrome runtime errors, or storage keys, and successful persistence behavior is unchanged.
- Options shell, Resume Match panels/results, Interview Planner form/cards/clear review, Settings local-only sync review, toggles, prep reset review, and options HTML wrapper now use extension-local tokens, responsive layout, visible focus rings, 8px radius, and wrapped long text.
- Popup remains the quick companion surface for tracker/draft/diagnostics work; Options remains the owner for deeper local review and settings workflows.
- No local storage key, keyword extraction algorithm, delayed match result behavior, prep card add/toggle/clear behavior, notification/diagnostics setting behavior, cloud-sync disabled state, runtime smoke contract, or operational analytics event was removed in this options UI pass.

## AI Assistant Implementation Notes

- `/ai` remains necessary as the assistant and review hub for prompt entry, draft guidance, review queue state, save/dismiss decisions, workflow handoffs, local/account chat persistence, and provider-degraded responses.
- AI output remains a draft. The assistant may deep-link to Profile, Resume, Jobs, or Learning with reviewed source state, but it must not mutate destination records without explicit review in the owning workflow.
- The AI route now uses token-backed review queue, clear-chat review, chat message, prompt draft, composer, and exported AI subcomponent surfaces with bounded mobile message bubbles and product-language status copy.
- Provider and account-sync degradation remains explicit through inline state, toasts, and local fallback behavior. Retry/send actions do not imply source-record mutation.
- AI Assistant chat provider failures use fixed safe draft copy, keep review queue/chat/composer context visible, hide raw provider errors, and retry through the existing chat response workflow.
- Browser-level AI coverage in `tests/ai-assistant-workflow.spec.ts` verifies long-running generation state, provider failure and retry, save/dismiss review sync, audit and analytics payloads, explicit clear-chat review/cancel/delete sync, and AI queue handoffs into Profile, Resume, Jobs, and Learning across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/ai/AIAssistant.test.tsx` verifies safe chat provider-failure copy, raw provider-error exclusion, and retry through the existing chat response workflow.
- No AI route, chat session load/save/delete, prompt suggestion, backend chat call, draft response creation, automation suggestion persistence, review status update, review audit, workflow handoff, local persistence fallback, toast behavior, or analytics call was removed in this AI UI pass.

## Career Path Implementation Notes

- `/career-path` remains a separate route until route analytics and user-flow validation support merging it into AI Assistant.
- The route owns generated career-path review, required-skill display, milestone review, generated/provider unavailable state, retry, and links into Learning or AI Assistant.
- The Career Path route now uses token-backed loading, generated guidance, degraded state, milestone, required-skill, and review-boundary surfaces with mobile-safe wrapping for long path names, skills, and milestones.
- Career Path provider-unavailable recovery uses fixed safe copy, hides raw AI/provider errors, keeps the generated-guidance workspace visible, and exposes Retry career path through the existing `aiService.generateCareerPath(user.id)` workflow.
- Career Path guidance remains review-only. It does not mutate profile, resume, applications, skills, or learning progress; actions deep-link to the owning workflow.
- Browser-level Career Path coverage in `tests/career-path-workflow.spec.ts` verifies generated guidance rendering, review boundaries, Learning handoff, AI Assistant handoff, malformed generated data as retryable, retry success, and provider-unavailable state across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `apps/frontend/src/pages/ai/AICareerPath.test.tsx` verifies safe provider-unavailable copy, raw AI/provider-error exclusion, and retry through the existing career-path generation workflow.
- No Career Path route, AI service generation call, normalization behavior, retry behavior, Learning navigation, AI Assistant navigation, provider-unavailable state, or source-labeling behavior was removed in this Career Path UI pass.

## Per-Screen Acceptance Checklist

- Primary action is visible without scanning unrelated cards.
- Secondary actions are grouped by workflow, not by implementation source.
- Loading skeletons preserve final layout dimensions.
- Empty states explain what is absent and provide one next action when useful.
- Errors provide retry or recovery when retry is supported by existing behavior.
- Fatal app errors provide safe recovery copy through `ErrorBoundary`; raw exception messages, stack details, tokens, URLs, and internal adapter details are not visible to users.
- Mobile layout keeps navigation and primary actions reachable without horizontal scrolling.
- Keyboard users can reach all controls in a predictable order.
- Icon-only actions have accessible labels or visible text.
- Text, badges, emails, file names, job titles, and company names wrap or truncate without overlap.
- Shared components are used before page-specific styling is introduced.

## Route Layout Audit Guardrail

- `apps/frontend/tests/visual-layout.spec.ts` is the broad browser guardrail for major-screen presentation regressions.
- The route visual audit includes the public Not Found recovery route so invalid-route recovery keeps a visible heading, no `undefined` copy, no page errors, and no horizontal overflow.
- The audit covers public entry/auth screens plus talent, recruiter, and admin route states at desktop and mobile sizes where the route is expected to support both.
- Each audited route must render its accessible page heading, avoid visible `undefined` placeholder text, produce no browser page exceptions, and avoid horizontal document overflow.
- The audit uses deterministic E2E auth and network fixtures so route layout evidence does not depend on live Supabase, live backend services, or provider data.
- Passing this audit does not approve feature removal or IA consolidation. It proves the current routes still render usable layouts while deeper workflow-level validation continues.

## Accessibility Semantics Guardrail

- `apps/frontend/tests/accessibility-semantics.spec.ts` is the broad browser guardrail for major-route accessibility semantics.
- The route semantics audit includes the public Not Found recovery route so invalid-route recovery keeps a main landmark, visible `h1`, and named recovery actions.
- The audit reuses the same deterministic route fixtures as the layout audit and covers desktop/mobile public, talent, recruiter, and admin route states.
- Each audited screen must expose a visible main landmark, visible page heading, named interactive controls, programmatically labeled form controls, named duplicate navigation landmarks, and alt/decorative treatment for visible images.
- Auth screens use semantic `main` landmarks, named home links, exact programmatic form labels, and distinct placeholders; route-level search controls use programmatic labels instead of relying on placeholder-only copy.
- Passing this audit does not replace a full WCAG audit, screen-reader testing, keyboard walkthroughs, or color-contrast tooling. It prevents common semantic regressions while the redesign continues.

## Keyboard Navigation Guardrail

- `apps/frontend/tests/keyboard-navigation.spec.ts` is the focused browser guardrail for high-risk keyboard workflows.
- The audit verifies command search focus, result arrow selection, submit behavior, notification popover reminder activation, account notification Mark read, account notification destination activation, notification Load more pagination, Escape focus restoration, mobile bottom-navigation keyboard activation, shared tab Arrow/Home/End roving focus, shared modal focus trap/restore behavior, and login form Enter submission.
- `apps/frontend/tests/command-search-workflow.spec.ts` verifies `CommandSearch` label-ranked route discovery, role-filtered utility destinations, no-result states, and recruiter command-route navigation across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- `CommandSearch` must stay a secondary route-discovery surface: route labels should outrank keyword-only matches, forbidden-role routes must not appear, no-result states must be visible, and utility route discovery must be documented in `featureOwnership.ts` rather than becoming a second workflow owner.
- Shared `Tabs` must keep keyboard-selected tab state and DOM focus aligned so the active tab remains the next tab stop after arrow navigation.
- Shell notification popovers must expose a named region, keep reminder/account-notification/retry/read/load-more actions keyboard reachable, support paginated loading without pointer input, label account-sync versus fallback notification sources, show degraded retry copy when provider paths fall back, preserve scheduled reminders without urgent unread dots until due, and restore focus to the notification trigger when Escape closes the popover.
- `apps/frontend/tests/notification-workflow.spec.ts` verifies account-sync labels, notification API fallback labels, degraded retry, due-aware unread counts, scheduled reminder visibility, explicit mark-all read payloads, and read-failure rollback across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- Header notification load and mark-all read failures use fixed safe popover copy, hide raw provider errors, roll back optimistic unread state after failed mark-all persistence, and preserve retry through Retry notifications and Mark read.
- `apps/frontend/src/components/layout/Header.test.tsx` verifies safe notification load/read failure copy, raw provider-error exclusion, unread-state rollback, and retry through existing shell notification actions.
- Shared `AuraModal` must keep focus inside open dialogs, support Escape close, and restore focus to the opener when the dialog closes.
- Passing this audit does not replace full manual keyboard QA for every route-specific modal workflow, menu, drag/drop surface, or rich editor. It prevents shell and shared-primitive regressions while workflow-specific coverage expands.

## Validation Evidence

For this redesign track evidence with:

- Source review of `apps/frontend/src/navigation/routeRegistry.ts`
- Source review of each page under `apps/frontend/src/pages`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:ia`
- `npm run validate:ui-design-system`
- `npm run test:a11y`
- `npm run test:keyboard`
- `npx playwright test tests/visual-layout.spec.ts --project=chromium --reporter=line` for major route heading, placeholder, page-error, and overflow coverage
- `npx playwright test --project=chromium --reporter=line` for route/access and shell navigation changes
- Responsive screenshot or browser smoke checks for shell-level changes
- Documentation lifecycle validation after adding or moving docs
