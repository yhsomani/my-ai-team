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
| Settings | Account, notification, security preferences | Necessary | Owns preferences and account actions | Link to Billing/Profile for detailed domain workflows |
| Not Found | Recovery from invalid routes | Necessary | Keep minimal | Offer role-valid search/navigation recovery |
| Extension Popup/Options | Local job companion workflows | Necessary outside web shell | Keep separate local-first IA | Align tokens where possible; preserve local-only behavior |

## Public Landing Implementation Notes

- `/` remains necessary as the unauthenticated public entry and auth handoff route.
- Landing stays outside the authenticated app shell so returning authenticated users can still be redirected by Login/Register while public visitors see clear role entry points.
- The route now uses token-backed navigation, hero, product-preview, feature, IA, stats, and footer sections with normal letter spacing, 8px surfaces, clear source labels, and mobile-safe wrapping.
- Public stat loading, typed Supabase profile/job count calls, fallback stats, timestamp/source labeling, `/login`, `/register`, `/register?role=talent`, and `/register?role=recruiter` links were preserved.
- No public route, auth redirect, Supabase count query, fallback behavior, CTA destination, or role-selection handoff was removed in this landing UI pass.

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
- Legacy dashboard widget components under `pages/dashboard/components` have been normalized to token-backed surfaces and plain product language so they do not reintroduce the older neon/fictional visual system if reused.
- No dashboard route, role gate, service call, analytics event name, destination route, or data mutation behavior was removed in this dashboard UI pass.

## Admin Implementation Notes

- `/admin` remains necessary as the admin-only operational console for metrics, service health, audit logs, scheduled automation rollout state, and product analytics insights.
- Admin stays separate from user and recruiter dashboards because the audience, source-state semantics, and operational risk are different.
- The Admin route now presents loading, fallback/degraded, analytics, scheduler, service-health, and audit-log sections with token-backed surfaces, visible source badges, mobile-safe wrapping, and a horizontally bounded service table.
- Product analytics and scheduler subsections use plain section headings, wrapped long labels, and compact status badges so live, fallback, degraded, and configured states remain visible without implying unverified production health.
- Browser-level Admin coverage in `tests/admin-operations.spec.ts` verifies the operational sections and expected scheduler jobs across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Admin route, service call, scheduler-status read, audit pagination behavior, observability link behavior, refresh action, source label, admin analytics event, or role gate was removed in this UI pass.

## Jobs Implementation Notes

- `/jobs` remains necessary as the single owner for job discovery, saved searches, hidden Explore preferences, applications, application drafts, application status, and recruiter job posting lists.
- `Post Job` remains a separate job-domain command route because it is a multi-step creation/review workflow, but it is discovered from Jobs and recruiter dashboard actions.
- Dashboard job cards remain summary handoffs only; detailed search, filtering, applying, saved-search management, hidden-job restore, and posting checklist review stay in Jobs.
- The Jobs route now presents tabs, route search, Explore filters, saved searches, hidden preference controls, and status summaries as one framed workspace tool instead of disconnected blocks.
- Job, application, and recruiter posting cards now share stable dimensions and token-backed card styling so result grids scan consistently across tabs.
- Application review and application-detail modals use token-backed text color and inset surfaces for light/dark readability.
- Browser-level Jobs coverage in `tests/job-application.spec.ts` verifies the core apply workflow, saved-search create/apply/review-cancel/delete paths, and hidden Explore hide/restore paths across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- Browser-level recruiter publish coverage in `tests/recruiter-publish.spec.ts` verifies My Posts publish review, complete-draft checklist, publish update payload, success receipt, published badge, and View Checklist state across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Jobs tab, service call, route parameter, saved-search behavior, hidden preference behavior, application draft behavior, application submission behavior, recruiter publish review behavior, or analytics call was removed in this Jobs UI pass.

## Post Job Implementation Notes

- `/jobs/post` remains necessary as the recruiter job-domain command route for company context setup, reusable job templates, draft history, duplicate review, and reviewed save-to-draft behavior.
- Jobs remains the discovery/list owner for recruiter postings; Post Job owns draft creation/edit review and returns to Jobs postings after save.
- The Post Job route now uses token-backed form controls, framed template/history/company panels, compact review-state summaries, warning duplicate panels, and stable mobile footer actions.
- Company profile creation/update remains separate from job draft save and does not publish a role, contact candidates, send messages, or create notifications.
- Browser-level Post Job coverage in `tests/post-job-workflow.spec.ts` verifies company context create/attach payloads, template save/apply/delete review, draft-history restore, duplicate warning review, reviewed draft save payloads, and the return to Jobs postings across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Post Job route parameter, template local/account sync behavior, draft-history local/account sync behavior, company setup onboarding analytics, company create/update behavior, duplicate check behavior, review-before-save behavior, draft save/update behavior, navigation behavior, or service call was removed in this UI pass.

## Candidates Implementation Notes

- `/candidates` remains necessary as the recruiter-owned application review workspace for candidate search, cursor paging, review focus, private notes, scorecards, interview-plan drafts, queue navigation, status decisions, and bulk status reviews.
- Dashboard candidate metrics remain summary handoffs only; detailed candidate review, private note editing, scorecard editing, interview readiness, status confirmation, and bulk status decisions stay in Candidates.
- The Candidates route now presents search, focus, sort, and pagination as one framed workspace tool; review analytics, bulk actions, candidate rows, detail sections, and confirmation modals use token-backed surfaces and status colors.
- Candidate rows keep stable dimensions and preserve visible review metadata for notes, scorecards, advisory signal, resume access, and status actions without moving those actions to Dashboard or Jobs.
- Candidate detail and bulk-status review modals use inset panels for identity, materials, advisory signal, interview plans, scorecards, notes, eligible applications, skipped applications, and status-change consequences.
- `apps/frontend/tests/candidate-review.spec.ts` now verifies deterministic candidate rendering, Candidate Details review, scorecard save payloads, scorecard local fallback and retry, private note save/delete payloads, status confirmation, application status update payloads, failed status handling, status-event audit payloads, first-candidate queue handoff, Previous/Next queue navigation, keyboard pagination/search/details/queue navigation, Select visible, bulk Interview/Offer/Rejection eligibility and skipped reviews, bulk partial-failure handling, unsaved note guard, Keep Changes, Reset Drafts, no-save reset behavior, application pagination, profile-backed search, and review-focus filtering across Chromium, Firefox, and WebKit.
- No candidate route, service call, cursor state, review focus behavior, note persistence behavior, scorecard persistence behavior, interview-plan draft behavior, status update behavior, bulk review behavior, reset-review behavior, or analytics call was removed in this Candidates UI pass.

## Profile Implementation Notes

- `/profile` remains necessary as the durable identity workspace for headline, location, bio, avatar, skills, experience, education, achievements, local suggestions, and AI profile-draft review.
- Resume remains the owner for document import/export artifacts; Profile may link to or receive reviewed profile row imports, but it should not duplicate Resume Builder editing and export flows.
- The Profile route now has no remaining legacy letter-spacing classes, and the shared shell/header/app-page constraints were tightened so Profile tabs, header actions, avatar controls, and metrics do not create mobile horizontal overflow.
- Existing token-backed profile cards, modals, tabs, avatar crop/remove reviews, suggestion panels, completion tasks, and row edit/delete controls remain in place.
- `apps/frontend/tests/profile-workflow.spec.ts` now verifies deterministic AI profile draft save/discard, reviewed profile field saves, profile suggestion application, skill edit/delete, experience edit/delete, education add/edit/delete, tab switching, and avatar upload/crop/remove payloads across Chromium, Firefox, and WebKit.
- `profileAvatarCrop` now has unit coverage for the canvas `toBlob` path plus a data URL export fallback so reviewed avatar uploads do not hang when a browser never resolves `toBlob`.
- No Profile route parameter, profile load behavior, edit modal behavior, AI draft review/discard/save behavior, local suggestion prefill behavior, avatar upload/crop/remove behavior, skill/experience/education create/edit/delete behavior, tab behavior, toast behavior, or analytics call was removed in this UI pass.

## Resume Implementation Notes

- `/resume` remains necessary as the focused document workspace for profile-backed editor fields, reviewed text/file import, AI resume draft review, PDF/HTML/print export commands, uploaded artifact links, delete receipts, and preview.
- Profile remains the owner for durable skills, experience, and education rows; Resume may save reviewed detected profile rows through existing Profile services, but it should not duplicate Profile row editing or deletion surfaces.
- `apps/frontend/tests/resume-workflow.spec.ts` now verifies deterministic import text review, selected field application, imported skill/experience/education save payloads, editor save payloads, Preview tab rendering, native PDF and HTML download file names, provider PDF upload payloads, export-event sync payloads, uploaded artifact metadata payloads, Copy Link clipboard behavior, reviewed uploaded-PDF delete cancel/confirm, provider delete payloads, deleted metadata payloads, AI resume draft apply/save, and AI resume draft discard across Chromium, Firefox, and WebKit.
- No Resume route behavior, profile load/update behavior, import parser behavior, selected-field application behavior, imported skill/row save behavior, AI handoff review behavior, PDF/HTML export behavior, provider upload/delete behavior, artifact copy behavior, local/account sync fallback, toast behavior, or analytics call was removed in this UI pass.

## Settings Implementation Notes

- `/settings` remains necessary as the account preference workspace for profile settings, notification preferences, security reviews, account deactivation review, and billing handoff.
- Billing remains the owner for plan and payment management; Settings shows only a summary and deep-link action.
- Profile remains the durable public profile owner; Settings edits account/profile preference fields without duplicating the full Profile editing surface.
- The Settings route and its profile, notification, security, and billing subcomponents now use token-backed nav rows, panels, custom switches, delivery controls, summary tiles, and destructive review surfaces without legacy hard-coded color classes or oversized rounded controls.
- `apps/frontend/tests/settings-workflow.spec.ts` now verifies deterministic profile settings save payloads, keyboard-accessible notification switch changes, digest and quiet-hours delivery preference save payloads, Billing summary/handoff, password reset review cancel/send behavior, account deactivation review cancel/confirm behavior, notification save failure retention, retry success, and settings workflow analytics across Chromium, Firefox, and WebKit.
- No Settings tab behavior, profile settings save behavior, notification preference/delivery save behavior, password reset review behavior, account deactivation confirmation behavior, billing handoff behavior, toast behavior, or analytics call was removed in this UI pass.

## Learning Implementation Notes

- `/lms` remains necessary as the talent-owned learning workspace for course discovery, AI-assisted catalog search review, enrollment, active progress, lesson selection, and lesson completion.
- Dashboard learning widgets remain continue/recovery handoffs only; detailed catalog search, progress filtering, recommended courses, enrollment, curriculum review, and lesson-completion commands stay in Learning.
- The Learning route now presents tabs, catalog search, result counts, page-size selection, and pagination as one framed catalog workspace instead of disconnected controls.
- Continue Learning, Recommended Next, catalog cards, loading skeletons, progress warnings, and course-detail modal sections use token-backed surfaces, stable card dimensions, and shared progress-track styling.
- AI learning-plan suggestions remain review-only: applying a suggestion changes only catalog search, and enrollment/progress actions remain explicit Learning commands.
- Browser-level Learning coverage in `tests/lms-workflow.spec.ts` verifies the AI Assistant to Learning handoff, explicit AI catalog-search application, course search and pagination controls, enrollment payloads, failed enrollment recovery, lesson-completion payloads, failed progress-persistence recovery, keyboard lesson selection/completion, progress updates, and In Progress filtering across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No LMS route, Redux query state, cursor behavior, tab behavior, search behavior, enrollment behavior, lesson-completion behavior, AI suggestion review behavior, toast behavior, or analytics call was removed in this Learning UI pass. LMS progress persistence now treats Supabase fallback read/write errors as failed saves instead of presenting unsaved lesson progress as complete.

## Challenges Implementation Notes

- `/challenges` remains necessary as the talent-owned assessment workspace for challenge discovery, category filtering, prompt review, starter-code editing, local sample checks, submission, and retry history.
- Learning remains the owner for courses and lesson progress; Challenges stays separate because assessment behavior includes code editing, local execution safeguards, submission history, and judge/result state.
- Dashboard challenge widgets remain summary handoffs only; detailed category filtering, solving, reset review, sample checks, submissions, and retry history stay in Challenges.
- The Challenges route now presents category filters as one framed assessment workspace control; challenge cards, loading skeletons, prompt/editor panels, sample cases, local-check results, latest submission, retry history, and reset review use token-backed surfaces and stable dimensions.
- Reset Code remains a reviewed confirmation that only restores the editor to starter code; it does not submit work or mutate retry history.
- Browser-level Challenges coverage in `tests/challenges-workflow.spec.ts` verifies category filtering, workspace open, local sample-check result handling, unsupported-language and hidden-sample no-submit safeguards, reviewed starter-code reset, submission payloads, failed-submission recovery, latest result rendering, and retry-history refresh across Chromium, Firefox, and WebKit with deterministic local data boundaries. WebKit currently verifies the graceful local-check timeout state because the Blob worker runner does not complete in that runtime.
- No Challenges route, Redux fetch behavior, category analytics, workspace open behavior, language selection, starter-code reset review, local sample check behavior, hidden-sample messaging, submission behavior, submission failure behavior, retry-history behavior, toast behavior, or analytics call was removed in this Challenges UI pass.

## Networking Implementation Notes

- `/networking` remains necessary as the single owner for professional suggestions, connection requests, accepted connections, hidden-suggestion preferences, and follow-up reminder controls.
- Messaging remains the owner for direct conversations; Networking can identify people and manage relationship state, but it should not duplicate thread reading, sending, attachments, or message retry behavior.
- The Networking route now presents tabs, counts, search, hidden-suggestion restore, and reminder status as one framed workspace control; suggestion, incoming request, sent request, and accepted-connection cards use token-backed surfaces, stable dimensions, truncation, and shared empty/loading/error states.
- Exported networking subcomponents under `pages/networking/components` have been normalized to product-language token surfaces so the older themed networking UI does not return if those components are reused.
- Browser-level Networking coverage in `tests/networking-workflow.spec.ts` verifies deterministic suggestion rendering, profile preview, hidden-suggestion hide/restore preference sync, reviewed connection request payloads, incoming accept/decline payloads, sent reminder set/clear status, withdraw payloads, accepted connection profile preview, keyboard preview activation, and full-profile popup route targets across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Networking route, Redux suggestion fetch behavior, connection-state load behavior, connect request behavior, incoming accept/decline behavior, sent withdraw behavior, local/account hidden-suggestion preference behavior, local/account reminder sync behavior, profile preview behavior, toast behavior, or analytics call was removed in this Networking UI pass.

## Messaging Implementation Notes

- `/messaging` remains necessary as the single owner for direct conversation work, message history, unread/read state, realtime updates, attachments, optimistic sends, retries, and suggested reply drafts.
- Header, dashboard, and Networking surfaces may summarize unread activity or link into Messages, but conversation reading, sending, attachment review, and retry behavior stay in Messaging.
- The Messaging route now presents the conversation list and active thread as one framed workspace with token-backed list rows, bounded message bubbles, attachment and suggested-reply composer panels, visible realtime subscription state, stable mobile panel switching, and normalized loading, empty, error, and retry states. Opening the attachment panel moves focus to the link field, and the hidden file input stays behind the visible Upload file button instead of becoming an extra tab stop.
- Exported messaging subcomponents under `pages/messaging/components` have been normalized to the same product-language token surfaces so the older themed messaging UI does not return if those components are reused.
- Browser-level Messaging coverage in `tests/messaging-workflow.spec.ts` verifies deterministic conversation rendering, active-thread selection, message-history rendering, text-send payloads, failed-send retry, keyboard attachment-link focus order, uploaded-file and linked attachment send payloads, keyboard visible mark-read update payload/feedback, keyboard older-history loading, sent feedback, and persisted sent-message/attachment display across Chromium, Firefox, and WebKit with deterministic local data boundaries.
- No Messaging route, Redux fetch behavior, Supabase realtime subscription behavior, message-history pagination, unread mark-read behavior, optimistic send/retry behavior, attachment link/upload behavior, suggested-reply behavior, file upload service call, or analytics call was removed in this Messaging UI pass.

## Billing Implementation Notes

- `/billing` remains necessary as the owner for plan comparison, payment method handoff review, transaction history, provider unavailable state, and explicit demo/provider-backed source labeling.
- Settings may link to Billing or show a summary, but plan review, checkout handoff, payment-method review, retry behavior, and history inspection stay in Billing.
- The Billing route now presents plan comparison, payment method, and transaction history with token-backed sections, mobile-safe card grids, wrapped user/provider text, status badges, inline demo/degraded state, and stable modal action layouts.
- Demo billing mode remains explicit. Plan changes and billing portal actions are still requests or handoffs until provider-backed checkout and webhook-owned subscription/payment state are implemented.
- `apps/frontend/tests/billing-workflow.spec.ts` now verifies deterministic plan catalog/current-plan rendering, populated transaction history, plan review cancel/checkout handoff payloads, billing portal handoff payloads, provider checkout failure retention and retry, popup-blocked checkout warning, provider-unavailable load state, retry recovery, explicit demo-mode copy, and billing workflow analytics across Chromium, Firefox, and WebKit.
- No Billing route, payment-service call, Supabase plan/history/subscription load, checkout/session command, billing portal command, review modal behavior, toast behavior, retry behavior, or analytics call was removed in this Billing UI pass.

## Resume Implementation Notes

- `/resume` remains necessary as the focused document workspace for resume editor fields, import review, AI draft review, export commands, uploaded PDF artifact links, delete receipts, and preview.
- Profile remains the owner for durable profile rows. Resume may save reviewed profile fields, imported skills, and imported experience/education rows through existing profile-service commands, but it does not replace Profile as the full CRUD workspace.
- The Resume route now uses token-backed loading, import review, editor, preview, and artifact/delete-review surfaces with mobile-safe wrapping for long profile text, provider links, imported values, and preview contact lines.
- The shared `AuraModal` primitive now uses app surface tokens, 8px radius, bounded scroll, and stacked mobile footer actions so Resume import/delete reviews and other route modals no longer inherit the old Aurora modal shell.
- No Resume route, AI handoff, import parsing, selected-field application, profile row save, PDF export, HTML export, print export, uploaded artifact library, delete receipt, copy link, toast behavior, local/account sync fallback, or analytics call was removed in this Resume UI pass.

## Extension Popup Implementation Notes

- `chrome-extension-project/src/popup` remains necessary as the local-first companion popup for tracked jobs, scanned page drafts, local diagnostics, and operational analytics export.
- The popup stays separate from the web shell because it runs inside MV3, uses `chrome.storage.local` or localStorage fallback, and must preserve the local-only sync posture unless ADR-006 changes that decision.
- Popup shell, dashboard, tracker rows/forms, scanned draft review, job delete review, diagnostics panels, shared error boundary, and popup HTML wrapper now use extension-local tokens, 8px card/control radius, visible focus rings, wrapped long metadata, and responsive popup width.
- The popup still owns only local tracker/draft/diagnostic actions. Options remains the owner for resume match preview, interview planner, and local settings.
- No storage key, local fallback, content/background messaging action, scan draft mapping, tracked-job mutation, diagnostics export, clear-review behavior, runtime smoke contract, or operational analytics event was removed in this popup UI pass.

## Extension Options Implementation Notes

- `chrome-extension-project/src/options` remains necessary as the local-first console for resume match preview, interview planner cards, local reminder/diagnostics preferences, and sync-disabled review copy.
- Resume Match remains a local keyword-overlap preview, not AI or cloud sync. It does not store or transmit raw pasted job/resume text.
- Options shell, Resume Match panels/results, Interview Planner form/cards/clear review, Settings local-only sync review, toggles, prep reset review, and options HTML wrapper now use extension-local tokens, responsive layout, visible focus rings, 8px radius, and wrapped long text.
- Popup remains the quick companion surface for tracker/draft/diagnostics work; Options remains the owner for deeper local review and settings workflows.
- No local storage key, keyword extraction algorithm, delayed match result behavior, prep card add/toggle/clear behavior, notification/diagnostics setting behavior, cloud-sync disabled state, runtime smoke contract, or operational analytics event was removed in this options UI pass.

## AI Assistant Implementation Notes

- `/ai` remains necessary as the assistant and review hub for prompt entry, draft guidance, review queue state, save/dismiss decisions, workflow handoffs, local/account chat persistence, and provider-degraded responses.
- AI output remains a draft. The assistant may deep-link to Profile, Resume, Jobs, or Learning with reviewed source state, but it must not mutate destination records without explicit review in the owning workflow.
- The AI route now uses token-backed review queue, clear-chat review, chat message, prompt draft, composer, and exported AI subcomponent surfaces with bounded mobile message bubbles and product-language status copy.
- Provider and account-sync degradation remains explicit through inline state, toasts, and local fallback behavior. Retry/send actions do not imply source-record mutation.
- No AI route, chat session load/save/delete, prompt suggestion, backend chat call, draft response creation, automation suggestion persistence, review status update, review audit, workflow handoff, local persistence fallback, toast behavior, or analytics call was removed in this AI UI pass.

## Career Path Implementation Notes

- `/career-path` remains a separate route until route analytics and user-flow validation support merging it into AI Assistant.
- The route owns generated career-path review, required-skill display, milestone review, generated/provider unavailable state, retry, and links into Learning or AI Assistant.
- The Career Path route now uses token-backed loading, generated guidance, degraded state, milestone, required-skill, and review-boundary surfaces with mobile-safe wrapping for long path names, skills, and milestones.
- Career Path guidance remains review-only. It does not mutate profile, resume, applications, skills, or learning progress; actions deep-link to the owning workflow.
- No Career Path route, AI service generation call, normalization behavior, retry behavior, Learning navigation, AI Assistant navigation, provider-unavailable state, or source-labeling behavior was removed in this Career Path UI pass.

## Per-Screen Acceptance Checklist

- Primary action is visible without scanning unrelated cards.
- Secondary actions are grouped by workflow, not by implementation source.
- Loading skeletons preserve final layout dimensions.
- Empty states explain what is absent and provide one next action when useful.
- Errors provide retry or recovery when retry is supported by existing behavior.
- Mobile layout keeps navigation and primary actions reachable without horizontal scrolling.
- Keyboard users can reach all controls in a predictable order.
- Icon-only actions have accessible labels or visible text.
- Text, badges, emails, file names, job titles, and company names wrap or truncate without overlap.
- Shared components are used before page-specific styling is introduced.

## Route Layout Audit Guardrail

- `apps/frontend/tests/visual-layout.spec.ts` is the broad browser guardrail for major-screen presentation regressions.
- The audit covers public entry/auth screens plus talent, recruiter, and admin route states at desktop and mobile sizes where the route is expected to support both.
- Each audited route must render its accessible page heading, avoid visible `undefined` placeholder text, produce no browser page exceptions, and avoid horizontal document overflow.
- The audit uses deterministic E2E auth and network fixtures so route layout evidence does not depend on live Supabase, live backend services, or provider data.
- Passing this audit does not approve feature removal or IA consolidation. It proves the current routes still render usable layouts while deeper workflow-level validation continues.

## Accessibility Semantics Guardrail

- `apps/frontend/tests/accessibility-semantics.spec.ts` is the broad browser guardrail for major-route accessibility semantics.
- The audit reuses the same deterministic route fixtures as the layout audit and covers desktop/mobile public, talent, recruiter, and admin route states.
- Each audited screen must expose a visible main landmark, visible page heading, named interactive controls, programmatically labeled form controls, named duplicate navigation landmarks, and alt/decorative treatment for visible images.
- Auth screens use semantic `main` landmarks and named home links; route-level search controls use programmatic labels instead of relying on placeholder-only copy.
- Passing this audit does not replace a full WCAG audit, screen-reader testing, keyboard walkthroughs, or color-contrast tooling. It prevents common semantic regressions while the redesign continues.

## Keyboard Navigation Guardrail

- `apps/frontend/tests/keyboard-navigation.spec.ts` is the focused browser guardrail for high-risk keyboard workflows.
- The audit verifies command search focus, result arrow selection, submit behavior, notification popover reminder activation, account notification Mark read, account notification destination activation, notification Load more pagination, Escape focus restoration, mobile bottom-navigation keyboard activation, shared tab Arrow/Home/End roving focus, shared modal focus trap/restore behavior, and login form Enter submission.
- Shared `Tabs` must keep keyboard-selected tab state and DOM focus aligned so the active tab remains the next tab stop after arrow navigation.
- Shell notification popovers must expose a named region, keep reminder and account-notification actions keyboard reachable, support paginated loading without pointer input, and restore focus to the notification trigger when Escape closes the popover.
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
