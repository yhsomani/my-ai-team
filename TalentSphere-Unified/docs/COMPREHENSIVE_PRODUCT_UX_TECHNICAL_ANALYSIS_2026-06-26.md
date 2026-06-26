# TalentSphere Comprehensive Product, UX, Workflow, Automation, And Technical Analysis

Date: 2026-06-26
Source reviewed: root docs, `docs/*`, task files, schema files, frontend routes/pages/services/store, Chrome extension code, backend controllers/services/entities/repositories, Docker/Kubernetes/infra manifests, and current uncommitted workspace state.

## Executive Summary

TalentSphere is a broad career and hiring platform spanning a React/Vite web app, Supabase-backed product data, Spring Boot service modules, infrastructure manifests, and a Chrome extension companion. The product already covers the core loops for talent users, recruiters, and admins: onboarding, profile/resume work, jobs, applications, candidate review, learning, challenges, networking, messaging, billing, settings, AI guidance, and ops visibility.

The strongest UX pattern in the current app is user-controlled automation. Several workflows already generate drafts or suggestions, but they do not mutate important records until the user reviews and confirms. That pattern should remain the standard for AI, resume import, application drafts, candidate scoring, recommendations, and extension sync.

The main product gaps are trust, operational rollout, and cross-workflow continuity. Several helpful features remain fallback-only or disconnected from backend audit records. The main technical gaps are mixed data access paths, outdated/contradictory docs, some backend/frontend endpoint drift, limited list pagination, incomplete telemetry, and a few role/mobile navigation issues.

## 1. Current State Analysis

### 1.1 Modules And Features

| Area | Current features | Primary users | Data/integration source | Current automation | Main gaps |
|---|---|---|---|---|---|
| Public entry | Landing page, role CTAs, public stats | Visitors | Supabase counts with fallback | Role-preselected register links | Persona proof, signed-in redirect logic |
| Auth | Login, register, Supabase session, dev mock user | All | Supabase Auth | Recruiter role mapping from account type, role-specific next-step disclosure, recruiter company-setup handoff, and append-only registration onboarding analytics | Full persisted first-run wizard remains missing |
| Shell/navigation | Sidebar, mobile drawer, bottom nav, header search, reminders and query-paginated account notifications | Auth users | Redux auth state, notifications table/local fallback | Role-aware destination filtering, saved-search notification feed, due-aware scheduled reminder display, user-owned digest/quiet-hour preferences that can defer immediate saved-search alerts, and scheduler-backed reminder/digest promotion | Kubernetes pod health, scheduler image/secret health verification, backend-owned scheduler status contracts, and richer command actions remain incomplete |
| Talent dashboard | Stats, jobs, challenges, actions, freshness status, activation checklist, operational analytics | Talent | Dashboard service querying Supabase | Parallel/partial fetch handling, signal-driven next steps, and append-only dashboard handoff/recovery analytics | Deeper personalization and checklist ranking |
| Recruiter dashboard | Jobs/applicants/offers, recent applications, setup checklist, operational analytics | Recruiters | Recruiter service querying Supabase | Independent section loading, signal-driven setup prompts, and append-only dashboard handoff/recovery analytics | No funnel drilldown or job-template next-best action |
| Admin dashboard | Stats, scheduled automation rollout/run-history status, service health, fallback labels, investigation links, product analytics insights, audit pagination, operational analytics | Admins | Supabase counts, frontend-safe scheduler rollout catalog with optional provider run-history API, known health/status routes, product analytics events/local fallback, mock fallback | Timeout to degraded fallback, scheduled automation status/run-history review, direct health/status/log-query handoffs, aggregate product insight generation, and append-only admin refresh/scheduler/investigation/audit analytics | Kubernetes pod health, scheduler image/secret health verification, backend-owned scheduler status contracts, incident timeline, alert subscriptions, and provider-configured logs/metrics URLs still incomplete |
| Jobs | Search/filter, cursor-backed Explore results, local profile/job fit reasons, account-synced/local-fallback hide/restore controls, saved searches with reviewed deletion, apply review with reviewed profile-draft replacement and reviewed draft clearing, application details, full recruiter draft workflow, account-synced/local-fallback post templates with reviewed deletion, draft-save review, restorable recruiter draft versions, advisory duplicate warning, company-aware draft attachment, inline company setup/completion, recruiter My Posts, edit draft, edit-change summary, publish checklist, publish analytics, publish readiness policy | Talent, recruiters | Supabase jobs/applications/companies, `hidden_explore_jobs`, `job_post_draft_versions`, `job_post_templates`, API fallback, local storage | Server-backed saved searches with local fallback, opt-in in-app new-match notifications that respect Job Alerts and daily/weekly digest preferences before immediate delivery, reviewed saved-search deletion, queued saved-search digest items with dry-run-by-default discovery/delivery runners and Kubernetes CronJobs, append-only saved-search analytics, server-backed editable application drafts and restorable application draft versions with local fallback, reviewed profile-draft replacement, reviewed application draft clearing, append-only application workflow analytics, local advisory fit reasons from visible job data and profile skills/location, account-synced/local-fallback hide/restore preferences for irrelevant Explore cards, append-only hidden preference analytics, explicit current-view hidden-preference refinements, single recruiter posting entry path, recruiter registration company-setup handoff, append-only company setup onboarding analytics, account-synced/local-fallback recruiter job-post templates with explicit delete confirmation, account-synced/local-fallback recruiter job-post draft versions, recruiter draft review, duplicate-post warning, company attachment, inline company creation/completion with explicit attach/save, status events, explicit draft updates with reviewed change summary, explicit publish review, backend-owned publish readiness enforcement, and append-only publish review/outcome analytics | Backend-owned cursor contract, backend-owned ranking, backend-wide preference learning, and multi-company defaults remain missing |
| Candidate pipeline | Application list, advisory signals, current-page review focus filters, analytics-driven focus actions, first-candidate review queue action, details previous/next queue navigation, unsaved private review guard, reviewed private-review reset, current-page scorecard analytics, details modal, notes, interview planning, private scorecards, reviewed bulk Interview/Offer/Reject moves, interview/offer/reject, candidate workflow analytics | Recruiters | Supabase jobs/applications/notes/scorecards | Explainable advisory review signals, current-page review focus filters, analytics-driven review actions, first-candidate review queue entry, previous/next details navigation, unsaved private review protection, reviewed private-review reset, current-page advisory sorting, current-page scorecard coverage analytics, append-only workflow analytics, draft-only interview planning, server-backed private structured scorecards with local fallback, reviewed selected-candidate bulk decisions, and server-backed private notes with local fallback | No provider-backed scheduling, backend-owned scoring, or longitudinal scorecard trend dashboards |
| Profile | Profile view/edit, reviewed avatar crop/upload/removal, skills, experience, education, suggestions, profile workflow analytics | Talent, recruiters | Supabase profile tables, file-service, and product analytics | Local profile suggestions, AI review-queue profile drafts, profile photo crop/preview/confirmation/removal, and resume-import skill/row suggestions prefill or save only after visible review; append-only profile load/edit/suggestion/completion/delete/photo analytics observe friction | Backend-owned profile approval logs missing |
| Resume | Controlled editor, text/DOCX/searchable-PDF import, AI draft handoff, field review, resume-skill and profile-row detection, native PDF/HTML/print export, explicit provider PDF upload, account-synced/local-fallback uploaded-PDF artifact library, accessible delete confirmation, local delete receipts, export activity, resume workflow analytics | Talent | Profile service, file-service, `resume_export_events`, `resume_artifacts`, product analytics, and local browser fallback | Text import, DOCX text extraction, searchable PDF text extraction, and structured AI handoffs extract supported draft fields; resume imports detect selectable profile skills, dated work experience, and education rows; native PDF and HTML files are generated locally after explicit clicks; reviewed PDF artifacts can be uploaded through file-service after a separate explicit click; recent uploaded artifact links remain visible with explicit open/copy/delete controls and account metadata sync when available; provider delete uses an in-app reviewed modal before cleanup; confirmed provider deletes leave recent local URL-free receipts; export activity syncs to the account when available; append-only resume analytics observes import, AI draft, skill-save, row-save, save, export, export-history, artifact lifecycle, artifact delete review/cancel, and artifact sync friction | No scanned-PDF OCR or formal provider retention/revocation policy |
| LMS | Cursor-backed course catalog, AI reviewed catalog-search handoff, progress, lesson player, complete lesson, LMS workflow analytics | Talent | API Gateway -> Supabase fallback | Continue Learning, Recommended Next, reviewed AI course-search prefill, and append-only catalog/enrollment/lesson analytics | Learning paths not profile/goal-aware |
| Challenges | Filters, workspace, starter code, reviewed starter-code reset, local sample check, retry history, submissions, challenge workflow analytics | Talent | Supabase challenges/submissions and product analytics | Local JS/TS sample run before submit plus reviewed reset analytics and append-only category/workspace/language/local-check/retry/submission analytics | No deep link, backend execution feedback limited |
| AI | Chat, server-backed/local-fallback history, reviewed chat clear, draft disclosure, review queue, workflow handoffs, profile/resume/application/learning draft handoffs, save/dismiss, destination prefill decision audit, career path | All | Supabase Edge Functions/RPC | Draft prompts plus reviewed chat clearing, server-backed session/review records, queue-level approval controls, explicit non-mutating handoff links with local fallback, Profile Headline/Location/Bio draft review, Resume Headline/Phone/Location/Website/Summary draft review, Application Resume URL/Cover Letter draft review, Learning Course Search/Skill/Certification catalog-search review, and destination prefill used/rejected audit events | Deeper cross-workflow rejected-suggestion reuse and admin review tooling remain limited |
| Networking | Suggestions, requests, connections, reminders, networking workflow analytics | All | Networking service graph suggestions plus Supabase connections/profiles/preferences/notifications and product analytics | API-first backend graph-ranked suggestions with Supabase profile hydration fallback, profile-aware recommendation reasons/scores, privacy-preserving mutual-connection counts, reversible account-synced suggestion hiding with local fallback, inline profile preview, explicit connect actions, selectable-timing notification-backed sent-request reminders with local fallback and opportunistic account-notification backfill, dry-run-by-default scheduler promotion for due synced reminders, Admin scheduled-automation rollout/run-history visibility, and append-only networking analytics for suggestion, request, reminder, preference, and preview friction | Full profile-service-backed recommendation contract, reminder frequency controls, and backend-owned scheduler status contracts remain incomplete |
| Messaging | Conversations, participant profile names, unread badges, realtime visible-row freshness, draft-only suggested replies, optimistic sends, retry, explicit visible-message read receipts, reviewed link/file attachments with hidden-draft prevention, messaging workflow analytics | All | Supabase conversations/messages/profiles plus file-service upload/download | Draft-only local reply suggestions, optimistic local send/retry, user-triggered read marking, bounded visible-conversation realtime updates, visible participant profile enrichment, explicit reviewed link attachments, explicit file upload/download handoff with server-side size/folder/blocked-extension guardrails, append-only workflow analytics, and hidden attachment-draft prevention | Backend-owned unread counters, live presence, group context, backend-owned chat contracts, virus scanning, and provider storage hardening incomplete |
| Billing | Plans, subscription, confirmation, portal handoff, history, billing workflow analytics | All | Supabase tables/functions and product analytics | Confirmation before checkout/provider actions plus append-only load/retry/checkout/portal analytics | Provider status details and 2FA provider setup missing |
| Settings | Profile, notification toggles, digest frequency, quiet hours, password reset review/cancel, account deactivation confirmation, billing handoff, settings workflow analytics | All | Supabase settings/profile | First-time notification defaults, job-alert preference used by saved-search notifications, explicit delivery preference controls, clearer soft-deactivation wording, and append-only workflow analytics for tab/save/preference/security/billing handoff decisions | Provider-backed 2FA plus backend-owned scheduler status and secret/image health monitoring missing |
| Product analytics and automation audit | Event taxonomy, ingestion helper, product analytics insight summarizer, dashboard/admin operational analytics helper, LMS workflow analytics helper, challenge workflow analytics helper, billing workflow analytics helper, profile workflow analytics helper, resume workflow analytics helper, networking workflow analytics helper, onboarding analytics helper, saved-search analytics helper, application workflow analytics helper, candidate workflow analytics helper, messaging workflow analytics helper, settings workflow analytics helper, automation suggestion audit helper, extension operational analytics helper | Product/ops/support | Supabase `product_analytics_events`, `automation_suggestion_audit_events`, local fallback, admin analytics RLS, and extension local diagnostics storage | AI recommendation generation, save/dismiss decisions, failures, workflow handoffs, Dashboard activation/retry/degraded/handoff decisions, Admin refresh/service-investigation/audit-pagination/product-analytics-insight decisions, LMS catalog/filter/pagination/AI-search/enrollment/lesson decisions, Challenges category/workspace/language/reset-review/local-check/retry/submission decisions, Billing load/retry/plan-review/checkout/payment-method portal decisions, Profile load/tab/edit/suggestion/completion/delete/photo-upload/photo-removal decisions, Resume load/tab/import/AI-draft/skill-save/save/export/export-history decisions, Networking suggestions/tab/preview/connect/accept/decline/withdraw/reminder/suggestion-preference decisions, destination prefill used/rejected decisions, Jobs application review/submission decisions, recruiter candidate review/status/bulk/draft-aid/private-review-reset decisions, Messaging selection/send/read/retry/draft-aid decisions, Settings profile/notification/security/billing and reviewed security cancellation decisions, Jobs recommendation preference updates/refinements, Jobs saved-search review/delete decisions, registration onboarding decisions, recruiter company setup decisions, recruiter publish review/outcome decisions, explicit review status changes, and companion extension operational decisions are tracked without blocking workflows; Admin Console surfaces privacy-bounded aggregate analytics counts/rates/friction signals, and extension users can review/export diagnostics and explicitly review before clearing console logs or local analytics | Expand first analytics dashboards into alerting, workflow-level improvement metrics, and prioritized product experiments |
| Chrome extension | Local tracker dashboard with local-record wording, local tracker with reviewed tracked-job removal, page scan draft with reviewed discard, local keyword-overlap Resume Match Preview, interview prep with reviewed clearing, Local Settings with prep-card reset analytics, explicit local-only sync status, local interview reminder preference, local operational analytics, diagnostics reviewed console-log clearing, local diagnostic test-event logging, diagnostics analytics export/reviewed-clear controls | Talent | Chrome APIs/local storage | Active-tab scrape into editable draft plus local Store Local Usage Diagnostics events for scan/tracker/resume-match-preview/planner/settings/diagnostics decisions; dashboard labels distinguish local tracker records from web-app applications or catalog data; settings show local-only storage with sync-plan review instead of a false sync toggle, clarify diagnostics are stored locally rather than shared telemetry, label interview reminders as a local preference until browser notifications exist, name prep-card reset decisions as prep-card reset analytics instead of diagnostics reset analytics, and present resume matching as a local keyword-overlap preview instead of AI-backed optimization; diagnostics panel surfaces reviewed console-log clearing, local diagnostic test-event logging, local analytics count/latest event, and explicit analytics export plus reviewed analytics clear controls | No authenticated web sync or external AI call for extension resume matching; future sync should require explicit approve-before-import/export |
| Backend services | Domain REST APIs for auth, user, profile, jobs, applications, LMS, etc. | Platform | Spring Boot services, DB migrations, RabbitMQ configs | Outbox, resilience patterns in places | Frontend often bypasses services via Supabase direct access |

### 1.2 User Roles And Permissions

| Role | Current access | Observed issues |
|---|---|---|
| Public visitor | Landing, login, register | Good entry path, but limited public proof and no signed-in routing on landing |
| Talent user `ROLE_USER` | Dashboard, jobs, LMS, challenges, networking, AI, messaging, billing, settings, profile, resume | Dashboard checklist helps activation; deeper cross-feature recommendations still needed |
| Recruiter `ROLE_RECRUITER` | Recruiter dashboard, jobs, post job, candidates, networking, AI, messaging, billing, settings, profile | Needs multi-company defaults, provider-backed interview scheduling, and backend-owned candidate scoring |
| Admin `ROLE_ADMIN` | Admin console and dev mock all-role access | Admin telemetry is partly inferred/mock; needs production observability |
| Dev mock user | All major roles in local dev | Useful for testing but can hide role-specific routing gaps |

### 1.3 Primary User Journeys

| Journey | Current path | Friction and risk |
|---|---|---|
| Talent onboarding | Register -> dashboard checklist -> profile/resume -> jobs/LMS/challenges | Dashboard now surfaces role-specific next steps; signup-time onboarding and deeper personalization still missing |
| Talent profile completion | Profile -> completion card or AI review-queue profile draft -> modal -> save | Improved direct actions, first AI profile draft review, and append-only profile workflow analytics; no resume-to-profile bulk review |
| Resume import/export | Resume -> Import Text or AI resume handoff -> paste/upload TXT/MD/DOCX/searchable PDF -> review fields -> optional Save Skills/Save Rows -> Apply Selected -> Save/Export/Upload PDF -> optional open/copy/delete uploaded artifact -> modal-confirm delete -> review recent delete receipts after confirmed deletion | Good control model, reviewed resume-skill and profile-row import, DOCX and searchable-PDF text import, explicit native PDF/HTML/print export, opt-in file-service PDF upload with returned links, account-synced/local-fallback uploaded-artifact copy/delete controls, accessible delete confirmation, local delete receipts, account/local export activity visibility, and append-only resume workflow analytics; lacks scanned-PDF OCR and formal provider retention/revocation policy |
| Job discovery | Jobs -> filters/search -> query-paginated cards with local fit reasons -> optional hide irrelevant cards -> optional apply visible hidden-preference refinements -> saved searches -> optional reviewed delete -> apply | Good basic filtering, page-size controls, query-level limit/offset loading, local profile/job fit explanations, account-synced/local-fallback hide/restore controls, append-only hide/restore preference analytics, explicit current-view hidden-preference refinements, backend-synced saved searches with local fallback, reviewed saved-search deletion, append-only saved-search analytics, opt-in in-app new-match notifications that defer immediate delivery under daily/weekly digest settings, server-side saved-search digest discovery, queued digest delivery, and Kubernetes CronJobs for scheduled execution; backend-owned ranking remains missing |
| Apply to job | Jobs -> optional AI application draft handoff -> Apply -> review restored/profile/manual/AI draft -> optional reviewed profile replacement, restore recent draft version, or reviewed clear -> submit -> Applied/details | Strong review-before-submit, account-synced draft continuity with local fallback, restorable draft versions, reviewed profile-draft replacement, reviewed draft clearing, AI draft review, append-only application workflow analytics, local fit reasons, account-synced/local-fallback hide controls, and event-backed timeline fallback; backend-owned job ranking still missing |
| Recruiter job posting | Register as Recruiter -> company setup handoff or Dashboard/Jobs -> Post Job -> full draft workflow -> optional account/local template -> optional reviewed template delete -> optional restore recent draft version -> optional company attachment or inline Create & Attach Company -> complete company profile details -> Review Draft with duplicate warning -> Save Draft -> Jobs My Posts -> Edit Draft or Review Publish -> Review Changes with change summary -> Save Changes or Publish Job, or Edit Draft when checklist blockers remain | One posting path preserves account-synced/local-fallback templates, reviewed template deletion, restorable account/local draft versions, company attachment, signup-time company setup handoff, inline company setup/completion, draft review, duplicate warnings, draft visibility, edit-existing-draft, reviewed update diffs, explicit publish control, backend-owned publish readiness enforcement, append-only onboarding analytics, and append-only publish review/outcome analytics; multi-company defaults are still missing |
| Candidate review | Candidates -> search/focus/sort by advisory signal -> review current-page scorecard analytics -> optional analytics focus action -> optional Review first visible/in focus -> details -> previous/next in current queue -> advisory factors -> optional interview-plan note draft -> private scorecard -> unsaved edit guard -> save or reviewed reset of private note/scorecard drafts -> confirm interview/offer/reject, or optional select visible candidates -> Review Interview/Offer/Rejection -> Confirm -> profile | Single and selected status changes require confirmation; private scorecards, advisory signals, focus filters, analytics actions, queue actions, details navigation, unsaved edit guards, reviewed private-review reset, and append-only workflow analytics stay advisory; notes and scorecards sync to server with local fallback; provider-backed scheduling, backend-owned scoring, and longitudinal scorecard trend dashboards are still missing |
| Learning | LMS -> optional AI learning search handoff -> review/apply catalog search -> Continue/Recommended -> course modal -> enroll/complete lesson | AI search handoff reduces copying from chat, and LMS workflow analytics now exposes catalog/progress friction; recommendations are still not deeply skill-gap/path based |
| Challenge solving | Challenges -> Solve -> edit solution -> optional reviewed starter-code reset -> local check -> submit -> retry history | Good local precheck, reviewed reset control, and append-only challenge workflow analytics; no deep link or richer backend judging feedback |
| AI help | AI -> draft prompt -> send -> review queue -> save/dismiss or open workflow handoff; optional reviewed clear starts a fresh chat | AI is safely non-mutating, review state can persist across account devices when backend tables are available, profile/resume/application/learning suggestions can become reviewed drafts or reviewed workflow prefill, and chat clearing is now explicitly reviewed |
| Networking | Network -> suggested person -> review reasons -> optional note -> send -> sent/incoming actions or explicit timed reminder | Good explicit actions, API-first backend graph suggestions, profile-aware recommendation reasons, mutual-connection counts, account-synced hidden suggestions, selectable-timing notification-backed follow-up reminders, local reminder backfill into account notifications, scheduler-backed due-reminder promotion, Admin scheduler rollout visibility, and append-only networking workflow analytics; full profile-service-backed recommendations, frequency controls, and provider-backed run history are still missing |
| Messaging | Messages -> review unread badges -> select conversation -> optionally insert a suggested reply draft -> edit/send/retry, attach reviewed link, or explicitly upload a file before send -> optionally mark visible incoming messages read | Mobile flow, read triage, draft-only suggested replies, explicit read marking, hidden attachment-draft prevention, append-only workflow analytics, link attachment sharing, provider-backed upload/download handoff, and server-side upload guardrails improved; virus scanning, storage hardening, and backend-owned chat contracts remain incomplete |
| Billing/settings | Billing/Settings -> confirm high-impact changes or open Billing from Settings summary | Good critical-action confirmation, explicit notification delivery controls, clarified account deactivation wording, append-only settings workflow analytics, Billing handoff tracking, and Billing page workflow analytics; provider/2FA setup and scheduler rollout status need clearer backend integration |
| Admin ops | Admin -> service health/scheduled automations/product analytics insights -> refresh/audit pagination/investigation links | Fallbacks are labeled, scheduled automation rollout/run-history gaps are visible, product analytics friction summaries are visible, and operational decisions are analytics-backed; real incident timeline, alert subscriptions, backend-owned scheduler status contracts, provider-configured observability, and analytics alerting remain incomplete |
| Extension tracking | Extension -> scan page -> edit draft -> save local tracker | Good confirmation flow; no cloud sync or web handoff despite settings copy |

### 1.4 Data Flow Between Modules

| Flow | Current state | Improvement needed |
|---|---|---|
| Auth -> shell/routes | Supabase session becomes Redux user; roles gate routes/nav | Central role constants and role normalization |
| Profile -> jobs/applications | Profile fields generate editable application drafts that can be saved before submission with account sync, local fallback, and restorable recent versions | Cross-workflow rejected-suggestion reuse and admin review tooling |
| Profile -> resume | Resume editor reads/writes supported profile fields, imports reviewed draft fields/skills, generates local native PDF/HTML artifacts after explicit clicks, optionally uploads reviewed PDFs through file-service, keeps an account-synced/local-fallback uploaded-artifact library with explicit copy/delete controls, confirms provider deletion in an accessible in-app modal, shows recent local delete receipts after confirmed provider deletion, records export activity with account sync/local fallback, and emits append-only resume workflow analytics | Dedicated resume/profile import review records and formal provider retention/revocation policy |
| Jobs -> applications -> candidates | Job applications power talent Applied tab and recruiter candidate views; status events, recruiter notes, private scorecards, and frontend advisory signals now have schema/service/frontend support | Provider scheduling, backend-owned scoring, and backend-owned candidate search |
| LMS/challenges -> dashboard/gamification | Progress/challenge data exists; XP shown via leaderboard | Consistent automatic XP events and visible rewards |
| Messaging -> dashboard | Unread count is inferred through conversations/messages | Persist read receipts and unread counters |
| AI -> product workflows | AI can produce drafts, queue them for review, hand users to likely workflows without mutating records, prefill reviewed Profile Headline/Location/Bio drafts, prefill reviewed Resume Headline/Phone/Location/Website/Summary drafts, carry reviewed Application Resume URL/Cover Letter drafts into Jobs with visible current/proposed diffs, carry reviewed Learning Course Search/Skill/Certification suggestions into LMS catalog search, record chat-clear review decisions, and record destination prefill used/rejected decisions | Add cross-workflow rejected-suggestion reuse and admin/product review tooling |
| Dashboard/Admin -> product analytics | Dashboard load/degraded/retry/refresh/checklist/stat/quick-action handoffs and Admin console refresh/load/degraded/service-investigation/audit pagination/retry outcomes emit append-only events | Expand the same privacy-bounded pattern to remaining operational modules |
| LMS -> product analytics | Catalog load/failure, tab/search/page-size/page navigation, AI learning-plan review/apply/dismiss, course open, enrollment, lesson select, and lesson completion outcomes emit append-only events | Expand the same privacy-bounded pattern to remaining learning recommendation and certification workflows |
| Challenges -> product analytics | Category selection, workspace open, language changes, starter-code reset review/cancel/confirm, local sample-check lifecycle, retry-history load/retry, and submission outcomes emit append-only events | Add challenge detail analytics when `/challenges/:id` exists |
| Billing -> product analytics | Billing load/failure, retry, plan review/cancel, checkout handoff/popup-blocked/submitted/failure, payment-method review/cancel, and billing-portal handoff/popup-blocked/submitted/failure outcomes emit append-only events | Add billing-provider diagnostics when provider status APIs exist |
| Profile -> product analytics | Profile load/failure, tab selection, basic edit/save/cancel, AI draft review/discard/failure, local suggestion prefill, completion task open/cancel/validation/save/failure, row delete review/cancel/complete/failure, and photo upload/removal review/cancel/validation/success/failure outcomes emit append-only events | Add backend-owned profile approval and import analytics when those workflows exist |
| Resume -> product analytics | Resume load/failure, tab selection, import open/cancel/file/analyze/apply, AI draft review/discard/failure, detected-skill save, detected-row save, profile-field save, native PDF/HTML/print export, provider PDF upload, export-history, artifact library/copy/delete-review/delete-cancel/delete, and artifact account-sync outcomes emit append-only events | Add provider retention/revocation audit events when artifact retention policy is formalized |
| Networking -> product analytics | Suggestions load/failure, tab selection, preview/full-profile handoff, connect/accept/decline/withdraw outcomes, reminder set/clear/sync/backfill states, and suggestion hide/restore/sync outcomes emit append-only events | Add scheduler rollout and provider notification diagnostics when operational status APIs exist |
| Product analytics -> Admin insights | Admin Console reads recent `product_analytics_events` under admin RLS, falls back to local analytics events when the server query fails, and displays aggregate counts, rates, top areas, and friction signals without raw user IDs, object IDs, metadata, issue text, or errors | Add threshold-based alerts and workflow drilldowns |
| Extension -> local operational analytics | Store Local Usage Diagnostics-gated events capture popup/options opens, tab changes, page-scan lifecycle, scanned-draft save/reviewed-discard, tracker mutations, diagnostics actions including reviewed console-log clearing, local analytics clearing, and local diagnostic test-event logging, local resume-match preview runs, reviewed prep-card actions, settings changes including cloud-sync plan review and local reminder preference changes, and background scan/message outcomes in this browser without raw URLs, names, resume text, job descriptions, extracted keywords, page content, topics, notes, or raw errors; the Diagnostics tab now shows count/latest event and offers explicit local JSON export or reviewed queue clear | Authenticated sync remains future work and should require explicit approve-before-import/export |
| Extension -> web app | Extension stores local jobs/drafts | Authenticated sync draft, explicit approve-before-import |
| Admin -> operations | Supabase counts and mock fallback rows | Real health, logs, traces, alert events |

### 1.5 Manual Vs Automated Processes

| Process | Current balance | Recommended target |
|---|---|---|
| Profile creation | Manual with local suggestions, AI draft prefill for basic fields, reviewed resume-skill/row import, and append-only profile workflow analytics | Backend-owned suggestions as reviewed diffs |
| Application writing | Profile-generated editable draft | AI-tailored draft with source disclosure and explicit approval |
| Job search | Manual filters and backend-synced saved searches with opt-in in-app new-match tracking, digest-aware immediate alert suppression, server-side digest discovery, queued digest delivery, and Kubernetes scheduler manifests | Explainable recommendations |
| Candidate triage | Manual review with explainable advisory signals, user-controlled current-page focus filters, analytics-driven focus actions, first-candidate review queue entry, previous/next details navigation, unsaved private review guards, current-page scorecard analytics, append-only workflow analytics, server-backed/local-fallback private structured scorecards, persisted private notes with local fallback, and reviewed bulk Interview/Offer/Reject moves | Backend-owned ranking, interview scheduling, shortlist suggestions, and longitudinal scorecard trend dashboards |
| Job posting | Manual form with account-synced/local-fallback templates, reviewed template deletion, signup-time company setup handoff, company context, inline company setup/completion, draft review, restorable account/local draft versions, advisory duplicate warning, recruiter My Posts, edit-existing-draft with reviewed change summary, explicit onboarding analytics, explicit publish checklist, and backend-owned publish readiness guard | Multi-company defaults |
| Learning/challenge choice | Progress/catalog based with reviewed AI catalog-search handoff | Skill-gap recommendations tied to target roles |
| Messaging | Manual send/retry with local draft-only reply suggestions, reviewed link/file attachments, server-side upload guardrails, hidden attachment-draft prevention, and append-only workflow analytics | Context-aware reply drafts backed by richer candidate/job/conversation context, virus scanning, and provider storage hardening |
| Billing | Manual plan choice | Plan recommendations with checkout approval |
| Admin monitoring | Manual inspection | Alert cards, anomaly summaries, links to logs/traces |
| Extension tracking | Local manual tracker plus page scan | Explicit cloud sync draft and conflict review |

### 1.6 Dependencies And Integrations

- Frontend: React 19, TypeScript, Vite, Tailwind, Redux Toolkit, Supabase JS, Axios, Framer Motion, Lucide icons, Vitest, Playwright.
- Data: Supabase Auth/PostgreSQL/Realtime/Storage/functions/RPC, plus Spring Boot service APIs.
- Backend: Java/Spring Boot services for auth, user, profile, jobs, applications, company, LMS, challenges, gamification, networking, messaging/chat, notifications, search, payments, files, video, AI.
- Infra: Docker Compose, Nginx, Kubernetes manifests, Redis, RabbitMQ, Elasticsearch, PostgreSQL, MongoDB.
- Extension: Chrome Manifest V3 APIs, active tab scraping, local storage fallback.

### 1.7 Documentation And Code Alignment

| Finding | Evidence | Risk |
|---|---|---|
| Docs disagree on architecture status | `docs/ARCHITECTURE_STATUS_INDEX.md` now reconciles `SSOT.md`, `ARCHITECTURE_AUDIT.md`, `SERVICE_MIGRATION.md`, `ARCHITECTURE_MIGRATION.md`, `ARCHITECTURE_PROPOSAL.md`, and `unified-rebuild-roadmap.md` against current repo evidence | Keep the status index reviewed when architecture or migration work changes |
| Route docs partially stale | Older SSOT snippets reference `/messages` and `/ai/assistant`; live app uses `/messaging` and `/ai` | QA and acceptance tests can target wrong URLs |
| Service migration is inconsistent | Some docs say all service decoupling is complete; migration doc still lists many pending services | Build/deployment strategy ambiguity |
| Frontend uses two backend paths | Many features use direct Supabase first, some use API Gateway first | Harder to enforce security, caching, auditing, and observability consistently |
| Backend security matcher drift fixed in current pass | `docs/API_CONTRACT_MISMATCH_REPORT.md` now finds 0 legacy `/api/*` security matcher paths | Keep the generated report in CI or release checks so route drift does not return |
| Gateway route coverage fixed in current pass | `docs/API_CONTRACT_MISMATCH_REPORT.md` now finds 0 controller routes without an API Gateway prefix after adding `/api/v1/video/**` | Future controllers need matching gateway prefixes before release |

## 2. UX And Product Audit

| Feature | Current behavior | UX/accessibility/performance concerns | Recommended improvement |
|---|---|---|---|
| Landing | Role CTAs and fallback/live stats | Stats fallback can read like production proof; signed-in users still see generic marketing | Add signed-in CTAs, persona proof, clear fallback labels |
| Auth | Account type selector maps Talent/Recruiter roles, shows role-specific next steps, and records append-only onboarding events | No persisted first-run wizard; password requirements are basic | Add persisted role-specific first-run progress |
| Shell | Sidebar, drawer, bottom nav, header search/reminders | Header notification rows are cursor-backed, future scheduled reminders stay visible without inflating urgent unread indicators, Settings exposes digest/quiet-hour controls, and scheduled digest/reminder delivery runners exist | Add scheduler rollout status, richer command actions, and service-owned notification contracts |
| Dashboard | Role dashboards with status strip, role-specific checklist, and append-only operational analytics | Deeper personalization and checklist ranking missing | Add dismiss controls and next-best-action ranking |
| Jobs | Search/filter/cursor-backed Explore results/local fit reasons/account-synced hide-restore controls/saved searches/reviewed saved-search deletion/apply review/reviewed profile-draft replacement/reviewed application draft clearing/account-synced post templates/company context/draft review/restorable recruiter draft versions/duplicate warning/My Posts/edit draft/change summary/publish checklist/publish readiness guard | Explore requests bounded pages, preserves total metadata when available, can advance with stable cursor tokens, shows local advisory match reasons from profile skills/location and visible job details, lets users hide irrelevant Explore cards and restore the last/all hidden jobs with account sync and local fallback, records append-only preference analytics for Hide/Restore and preference-refinement decisions, offers explicit current-view refinements when hidden job types repeat, saved-search immediate alerts respect Job Alerts and daily/weekly digest settings, saved-search deletion uses a reviewed modal and leaves current Explore filters, applications, hidden-job preferences, and job records unchanged, profile-draft replacement uses an inline review panel when existing application draft content would be overwritten, application draft clearing uses an inline review panel and preserves before-clear history, deferred matches can be discovered server-side and queued for grouped digest delivery through Kubernetes CronJobs, account-synced/local-fallback templates reduce recruiter posting repetition across devices, template deletion now uses a reviewed modal and leaves form fields unchanged, company context reduces missing attribution, duplicate warnings reduce accidental repeated drafts, My Posts makes saved drafts visible before publish, Edit Draft updates owned drafts without creating duplicates, reviewed change summaries reduce rereading effort, publish readiness is backend-enforced before status changes, application draft history reduces lost talent-user work, and recruiter draft history reduces lost posting work; backend-owned cursor contracts and backend ranking are still missing | Add backend cursor contracts and backend-owned recommendation ranking |
| Applications | Review modal, account-synced draft persistence, AI draft handoff, restorable draft versions, append-only review/submission analytics, and status timeline | Timeline can use status events but falls back to inferred status for older data; job-fit explanation analytics still limited | Backfill historical events and expand approval analytics |
| Candidates | Cursor-backed application list with query-level candidate/job search, explainable advisory signals, current-page review focus filters, analytics-driven focus actions, first-candidate review queue entry, previous/next details navigation, unsaved private review guards, reviewed private-review reset, current-page advisory sorting, current-page scorecard analytics, details modal, draft-only interview plans, server-backed/local-fallback private structured scorecards, persisted private notes, confirmed interview/offer/reject, reviewed bulk Interview/Offer/Reject moves | No provider-backed interview scheduling, backend-owned advisory score, longitudinal scorecard analytics, or indexed service-owned search endpoint | Add provider-backed interview scheduler, backend-owned advisory score, longitudinal scorecard analytics, and backend-owned candidate search |
| Profile | Edit/add/edit/remove rows, local suggestions, AI profile draft review, reviewed resume-skill/row import, reviewed avatar crop/upload/removal, append-only workflow analytics | Backend-owned approval logs still limited | Add profile approval/audit records |
| Resume | Text/DOCX/searchable-PDF import, AI draft handoff, selected fields, detected skills and profile rows, native PDF/HTML/print export, opt-in file-service PDF upload, account-synced/local-fallback uploaded-artifact open/copy/delete controls, accessible provider-delete confirmation, local uploaded-artifact delete receipts, account-synced/local-fallback export activity, append-only workflow analytics | No scanned-PDF OCR or formal provider retention/revocation policy | Add scanned-PDF OCR review and artifact retention controls |
| LMS | Cursor-backed, query-searchable, and enrollment-filtered course list, reviewed AI catalog-search handoff, lesson player, progress | Course content can be placeholder; recommendations are shallow, and formal backend-owned cursor contracts are still missing | Add backend unavailable state, backend-owned course cursor contracts, and profile-based learning paths |
| Challenges | Workspace, reviewed starter-code reset, local JS/TS checks, submit, retry history, append-only workflow analytics | No deep link; local runner is limited; backend judging feedback sparse | Add `/challenges/:id`, richer results, diff attempts |
| AI | Chat drafts, disclosure, reviewed chat clearing, server-backed save/dismiss with local fallback, review queue, workflow handoff links, Profile/Resume/Application/Learning draft review, and destination prefill decision audit | Rejected-suggestion reuse and admin/product review tooling are still limited | Add rejected-suggestion reuse, admin review filters, and broader destination coverage as new AI handoffs are added |
| Networking | API-first graph-ranked suggestions with profile hydration fallback, profile-aware reasons, privacy-preserving mutual counts, account-synced hide/restore controls, inline profile preview, requests, selectable-timing notification-backed reminders with local fallback/backfill, scheduler-backed due reminder promotion, Admin rollout/run-history visibility, and append-only workflow analytics | Full profile-service-backed recommendation generation, reminder frequency controls, and backend-owned scheduler status contracts are still missing | Add profile-service-backed suggestion payloads, frequency controls, and production scheduler health checks |
| Messaging | Cursor-backed conversation list with participant profiles, unread badges, realtime visible-row preview/badge updates, realtime stream, cursor-backed active thread history, draft-only suggested replies, optimistic sends, retry, explicit visible-message read marking, reviewed link attachments, explicit file upload/download handoff with server-side guardrails | Formal backend-owned chat cursor contracts, backend-owned unread counters, live presence, virus scanning/provider storage hardening, and richer group participant context are still incomplete | Add backend chat cursor contracts, durable unread counters, presence/group context, virus scanning, and provider storage hardening |
| Billing | Plans, confirmation, provider handoff, append-only workflow analytics | Provider failure details limited | Add provider health/config diagnostics for admins and clearer user recovery |
| Settings | Profile, notifications, delivery controls, security, billing summary | 2FA unavailable; account deactivation is now clearer but still backend-soft-delete only; scheduler rollout/run-history status is visible in Admin when configured, but not backed by a backend-owned Kubernetes health contract | Add provider-backed 2FA setup, backend-owned scheduler status checks, and settings schema migration checks |
| Admin | Stats/health/fallback, scheduled automation rollout/run-history status, health/status links, log queries | Fallback is labeled and actionable, but provider-backed logs/metrics URLs, Kubernetes pod/image/secret health, incident timeline, and alert subscriptions are still incomplete | Add service details, audit filters, incidents, alert subscriptions, Kubernetes scheduler health, and configured logs/metrics providers |
| Extension | Tracker, scan-to-draft, local resume-match preview, local-only settings, diagnostics | Authenticated web sync and provider-backed resume optimization are not implemented | Add explicit approve-before-import/export sync handoff when backend contracts exist |

Accessibility priorities:

- Continue replacing any remaining browser `confirm()` flows with accessible app modals; the shared modal shell now has dialog semantics, Escape handling, focus containment, and focus restoration, and uploaded-PDF deletion uses it.
- Ensure icon-only row actions have visible labels or robust `aria-label` plus tooltips.
- Add keyboard navigation for search result lists and command palette results.
- Use `role="status"` for non-critical async updates and `role="alert"` only for blocking/degraded states.
- Verify mobile conversation focus after selecting/backing out of chats.

Performance priorities:

- Continue pagination rollout for backend-owned APIs; Jobs Explore, Candidates, Messaging conversation lists, Messaging active threads, header notifications, LMS course catalog, and Admin audit logs are cursor-backed; remaining work is formal backend-owned cursor contracts for chat/notification/LMS APIs.
- Consider a dedicated latest-message projection/materialized field for conversation previews as chat volume grows.
- Cache dashboard widgets independently with stale timestamps.
- Do not make guaranteed-dead fallback API calls.
- Add list virtualization once result counts are high.

## 3. Automation Opportunities

| Automation | Business value | User benefit | Implementation approach | Risks and safeguards |
|---|---|---|---|---|
| Resume-to-profile import | Higher profile completeness and match quality | Less manual typing | Parse uploaded/pasted resume into field diffs | Review screen, field checkboxes, undo, no auto-save |
| AI application tailoring | Higher application completion | Faster, better applications | Generate cover letter/resume URL suggestions from job+profile | Draft-only, source disclosure, explicit submit |
| Saved-search alerts | More return visits and applications | No repeated searches | Use persisted saved searches as the alert source and notify on new matches | User controls frequency and can disable |
| Recommended jobs | Better marketplace matching | Faster discovery | Score by skills, location, salary, history | Local fit reasons, account-synced/local-fallback hide/restore controls, preference analytics, and explicit current-view preference refinements are visible; add backend ranking |
| Candidate ranking | Faster recruiter triage | Less repetitive review | Advisory score from requirements/profile/application | Never auto-reject; show score factors |
| Recruiter job templates and publish review | Faster posting with fewer accidental duplicate or incomplete listings | Less duplicate typing and clearer draft-to-publish handoff | Save previous jobs/templates, prefill form, list owned drafts, and run a publish checklist | Checklist is advisory and visible; recruiter must explicitly publish or override |
| Interview scheduling suggestions | Shorter hiring cycle | Fewer coordination messages | Suggest available slots and message drafts | Recruiter confirms before sending |
| Skill-gap learning path | Better learning engagement | Clear next step | Map target role gaps to courses/challenges | User chooses path; allow "not relevant" |
| Message quick replies | Faster communication | Less repetitive typing | Draft replies from thread/candidate context | Draft-only, no auto-send |
| Notification digest | Better retention with less noise | Prioritized updates | Save user frequency/quiet-hour controls now; add backend jobs to group jobs/messages/applications/learning reminders | User frequency controls and no immediate digest trigger |
| Admin anomaly summary | Faster incident response | Less manual scanning | Analyze service health, latency, errors | Threshold controls and human acknowledgement |
| Extension cloud sync | Better cross-surface continuity | Capture jobs from external sites | Sync extension drafts to web app after login | Explicit review, conflict detection, delete control |

## 4. User Experience Improvements

- Extend the new role-specific dashboard onboarding surface with signup-time handoff telemetry, dismissals, and server-backed progress where appropriate.
- Convert complex forms into staged workflows with a final review step: job post, application, profile import, billing, account deactivation.
- Add "why this is shown" explanations wherever recommendations appear.
- Continue moving local-only useful state into backend-backed, user-scoped records where users expect cross-device continuity: generated file artifacts that still intentionally remain browser-local.
- Use progressive disclosure: show simple controls first, reveal details like advanced filters, scoring factors, or audit history on demand.
- Add status/freshness to every fallback-prone surface, not just dashboards.
- Make mobile navigation role-aware and keep full drawer access for secondary routes.
- Add explicit recovery paths: retry, refresh, edit draft, undo, contact support, or open logs depending on context.
- Add analytics for every high-value workflow start, completion, abandonment, failure, automation accept, and automation reject.

## 5. Prioritized Improvement Roadmap

### Quick Wins (1-3 days)

| Item | Priority | Impact | Effort | Dependencies | Business value |
|---|---:|---|---|---|---|
| Role-prioritized mobile bottom nav | P1 | Faster mobile task access | Low | Current role/nav config | Improves completion on small screens |
| Remove dead networking fallback path | P1 | Fewer failed requests and cleaner recovery | Low | Backend route map | Reduces noise and confusion |
| Add app modal for profile row deletes | P1 | Better accessibility and trust | Low | Existing modal/button components | Safer profile management |
| Add widget retry actions on dashboards | P1 | Better degraded-state recovery | Medium | Dashboard service metadata | Improves trust in data |
| Document code/doc architecture mismatches | P1 | Better planning accuracy | Low | Current audit docs | Reduces delivery risk |

### Short-Term Improvements (1-2 weeks)

| Item | Priority | Impact | Effort | Dependencies | Business value |
|---|---:|---|---|---|---|
| Persist recruiter notes | P1 | Cross-device hiring continuity | Medium | Candidate notes table/API | Recruiter productivity |
| Saved-search in-app notification delivery | P1 | More job engagement | Medium | Saved searches table, notification prefs | Implemented in this pass |
| Application status history | P1 | Candidate/talent transparency | Medium | Status event table/API | Trust and support reduction |
| Profile-service-backed networking suggestion payloads | P2 | Richer recommendations | Medium | Networking suggestion endpoint, profile-service join/query contract | Network growth |
| Role onboarding checklist | P1 | Faster activation | Medium | Profile/jobs/application signals | Implemented in this pass |
| Replace stale docs with reviewed architecture index | P2 | Lower team confusion | Medium | Doc ownership decision | Delivery reliability |

### Medium-Term Enhancements (2-6 weeks)

| Item | Priority | Impact | Effort | Dependencies | Business value |
|---|---:|---|---|---|---|
| Resume import review for PDF | P1 | Major onboarding effort reduction | High | Parser service, file upload | Higher profile completeness |
| Native PDF resume export | P2 | Better resume workflow | Medium | PDF renderer | Talent satisfaction |
| Cross-workflow AI suggestion handoff and approval logs | P1 | Safe automation across profile, resume, and application workflows | High | AI sessions/suggestions records, workflow-specific review screens | Scalable AI value |
| Candidate ranking and interview scheduling | P1 | Faster hiring | High | Profile/job/application joins, video service | Recruiter retention |
| Pagination and list query refactor | P1 | Performance scalability | Medium | API/schema indexes | Production readiness |
| Real admin observability console | P2 | Faster operations | High | Metrics/logs/traces | Reliability |

### Long-Term Strategic Improvements

| Item | Priority | Impact | Effort | Dependencies | Business value |
|---|---:|---|---|---|---|
| Unified recommendation engine | P1 | Personalized platform | High | Profile, jobs, LMS, challenges, interactions | Marketplace quality |
| Backend-owned product API layer | P1 | Security, audit, observability | High | Supabase/API strategy decision | Enterprise readiness |
| Extension-web authenticated sync | P2 | Cross-surface capture | High | Auth handoff, sync API | Increased engagement |
| Event-driven analytics warehouse | P1 | Product learning loop | High | Tracking plan, event ingestion | Data-informed roadmap |
| Architecture consolidation or true service independence | P1 | Lower delivery risk | High | Leadership architecture decision | Scalability and maintainability |

## 6. Implementation Plan

### 6.1 Technical Architecture

- Choose and document one product data strategy: direct Supabase as backend, Spring services as backend, or explicit hybrid with ownership rules.
- Keep the generated route/API contract inventory current with `npm run report:api-contracts`.
- Centralize role/status constants across frontend and backend.
- Move local-only state that users expect to keep into backend tables and APIs.
- Keep AI/automation non-mutating by default; model automation outputs as suggestion records with statuses.

### 6.2 Frontend

- Extract repeated review-modal patterns into reusable accessible components.
- Extend role onboarding checklist with analytics, dismissals, and server-backed progress where appropriate.
- Add pagination state to remaining list-heavy pages; Jobs Explore, Candidates, Messaging, Header notifications, and the LMS catalog now have query-level page controls or bounded loading.
- Add feature-level status banners using consistent live/cached/fallback/degraded labels.
- Add a command palette with actions beyond navigation once backend actions are ready.

### 6.3 Backend

- Add or formalize APIs for scheduled saved-search notification delivery, AI suggestions, networking recommendations, and notification digests.
- Add product analytics ingestion coverage to service-owned workflows as they move off direct Supabase paths.
- Normalize controllers to `/api/v1/*` and align security matchers.
- Add health/detail endpoints for admin service table.
- Add idempotency keys for critical actions: apply, checkout, status change, sync import.
- Add structured error responses consistently.

### 6.4 Database

- Add or finish migrations for `extension_sync_drafts`; `saved_job_searches`, `notification_digest_items`, `application_drafts`, `application_status_events`, `candidate_notes`, `candidate_scorecards`, `ai_sessions`, `automation_suggestions`, `automation_suggestion_audit_events`, `product_analytics_events`, and `notification_settings` now have schema coverage.
- Add indexes for `jobs(status, job_type, location, posted_at)`, `job_applications(user_id, status, created_at)`, `job_applications(job_id, status, created_at)`, `messages(conversation_id, created_at)`, and `notifications(user_id, is_read, created_at)`.
- Add audit rows for critical workflow actions beyond the initial AI suggestion analytics events.

### 6.5 API Enhancements

- `GET /api/v1/networking/suggestions?userId=...` with reason metadata.
- `POST /api/v1/applications/{id}/events` or event generation inside status updates.
- `GET/PUT /api/v1/recruiter/applications/{id}/notes`.
- `POST /api/v1/automation/suggestions` and `PATCH /api/v1/automation/suggestions/{id}` for accept/reject/dismiss.
- `POST /api/v1/resume/import` returning reviewable field diffs.
- `GET /api/v1/admin/services` returning real health, uptime, source, links.

### 6.6 State Management

- Normalize messages by ID and conversation ID.
- Add explicit stale/fresh/error metadata per async section.
- Track optimistic mutations with stable local IDs and retry metadata.
- Store automation review state in server-backed records, with local optimistic mirrors only where useful.

### 6.7 Performance

- Replace full nested conversation message fetch with latest-message projection.
- Extend the cursor-backed list pattern into formal backend-owned chat/notification/LMS API contracts and any new high-scale list surfaces.
- Cache stable reference data such as job types, categories, subscription plans, and role navigation.
- Limit fallback retries and avoid calling known-missing endpoints.

### 6.8 Analytics And Tracking

Track events for:

- Registration role selected and completed.
- Onboarding checklist item viewed/started/completed.
- Job search filters, saved search create/apply/delete, alert enabled.
- Application draft generated/edited/submitted/abandoned.
- Candidate detail opened, note saved, status changed, interview scheduled.
- AI suggestion generated, saved, dismissed, accepted, rejected.
- LMS course opened, lesson completed, recommended path accepted.
- Challenge local check run, result, submit, retry.
- Message send/retry/failure/read.
- Billing load, retry, plan review, checkout started/opened/blocked/submitted/failed, payment-method portal opened/blocked/submitted/failed.
- Fallback/degraded section shown and retry clicked.

## 7. Detailed Improvement Backlog

| ID | Area | Improvement | Priority | Status |
|---|---|---|---:|---|
| UX-050 | Mobile nav | Role-prioritize bottom nav items | P1 | Implemented in this pass |
| UX-051 | Networking | Correct `/networking/feed` fallback and remove dead suggestions fallback | P1 | Implemented in this pass |
| UX-052 | Profile | Replace native/immediate profile row deletes with an in-app confirmation modal | P1 | Implemented in this pass |
| UX-053 | Dashboard | Widget-level retry and issue-specific recovery | P1 | Implemented in this pass |
| UX-054 | Jobs | Backend-persist saved searches with local fallback | P1 | Implemented in this pass |
| UX-064 | Jobs | Add saved-search in-app notification delivery | P1 | Implemented in this pass |
| UX-069 | Jobs/Notifications | Add scheduled saved-search backend digest delivery jobs | P1 | Implemented in this pass: queued digest items, discovery runner, delivery runner, and Kubernetes CronJobs |
| UX-105 | Jobs/Notifications | Respect digest preference before immediate saved-search alert delivery | P1 | Implemented in this pass |
| UX-106 | Jobs/Notifications | Add queued saved-search digest items and delivery runner | P1 | Implemented in this pass |
| UX-107 | Jobs/Notifications | Add server-side saved-search digest discovery runner | P1 | Implemented in this pass |
| UX-108 | Ops/Notifications | Add Kubernetes CronJobs for saved-search digest discovery and delivery | P1 | Implemented in this pass |
| UX-109 | Networking/Notifications | Add scheduled delivery runner and CronJob for due networking follow-up reminders | P1 | Implemented in this pass |
| UX-055 | Applications | Add persisted status event timeline | P1 | Implemented in this pass |
| UX-056 | Candidates | Persist recruiter notes and add note audit metadata | P1 | Implemented in this pass |
| UX-061 | Candidates | Confirm recruiter offer/reject status changes before updating | P1 | Implemented in this pass |
| UX-062 | Jobs | Add opt-in in-app new-match tracking to saved searches | P1 | Implemented in this pass |
| UX-063 | Applications | Backend-sync reviewed application drafts per job with local fallback | P1 | Implemented in this pass |
| UX-110 | Applications | Add restorable application draft version history with account sync and local fallback | P1 | Implemented in this pass |
| UX-111 | Resume | Account-sync resume export activity with local fallback | P1 | Implemented in this pass |
| UX-112 | Jobs | Add restorable recruiter job-post draft version history with account sync and local fallback | P1 | Implemented in this pass |
| UX-113 | Networking/Notifications | Backfill local follow-up reminders into account notifications when sync is available | P1 | Implemented in this pass |
| UX-114 | AI/Profile | Add AI profile draft handoff with visible current/proposed review before save | P1 | Implemented in this pass |
| UX-115 | AI/Resume | Add AI resume draft handoff through selectable current/proposed import review | P1 | Implemented in this pass |
| UX-116 | AI/Applications | Add AI application draft handoff through reviewed Jobs application draft modal | P1 | Implemented in this pass |
| UX-117 | AI/Learning | Add AI learning catalog-search handoff with explicit apply/dismiss review | P1 | Implemented in this pass |
| UX-118 | AI/Audit | Record destination-level AI prefill used/rejected decisions | P1 | Implemented in this pass |
| UX-119 | Jobs | Sync recruiter job-post templates to recruiter accounts with local fallback | P1 | Implemented in this pass |
| UX-120 | Resume/Profile | Detect resume-import skills and save selected skills through explicit profile review | P1 | Implemented in this pass |
| UX-121 | Jobs/Analytics | Record recruiter publish review and outcome analytics | P1 | Implemented in this pass |
| UX-122 | Jobs/Policy | Enforce backend-owned recruiter publish readiness and route blockers to draft editing | P1 | Implemented in this pass |
| UX-123 | Jobs/Companies | Add recruiter company profile completion and update inside Post Job | P1 | Implemented in this pass |
| UX-124 | Jobs/Discovery | Add local profile-based job fit reasons to Explore cards | P1 | Implemented in this pass |
| UX-125 | Jobs/Discovery | Add reversible local hide/restore controls for Explore recommendations | P1 | Implemented in this pass |
| UX-126 | Jobs/Discovery | Sync hidden Explore recommendation preferences to user accounts with local fallback | P1 | Implemented in this pass |
| UX-127 | Jobs/Analytics | Record hidden Explore recommendation preference decisions | P1 | Implemented in this pass |
| UX-128 | Jobs/Discovery | Add explicit hidden-preference Explore refinement actions | P1 | Implemented in this pass |
| UX-129 | Auth/Jobs/Companies | Route recruiter registration into explicit company setup handoff | P1 | Implemented in this pass |
| UX-130 | Auth/Jobs/Analytics | Record registration and company setup onboarding decisions | P1 | Implemented in this pass |
| UX-131 | Jobs/Analytics | Record saved-search save/apply/delete/alert decisions | P1 | Implemented in this pass |
| UX-132 | Applications/Analytics | Record application review, draft, submit, and failure decisions | P1 | Implemented in this pass |
| UX-133 | Candidates/Analytics | Record candidate review focus, detail, draft-aid, scorecard, status, and bulk decisions | P1 | Implemented in this pass |
| UX-134 | Messaging/Analytics | Record conversation selection, load/retry, read, draft-aid, attachment, send, and retry decisions | P1 | Implemented in this pass |
| UX-135 | Settings/Analytics | Record tab, profile, notification, billing handoff, password reset, and delete-account decisions | P1 | Implemented in this pass |
| UX-136 | Dashboard/Admin Analytics | Record dashboard recovery/handoff and admin operational decisions | P1 | Implemented in this pass |
| UX-137 | LMS/Analytics | Record catalog, AI learning search, enrollment, and lesson completion decisions | P1 | Implemented in this pass |
| UX-138 | Challenges/Analytics | Record category, workspace, local check, retry history, language, reset, and submission decisions | P1 | Implemented in this pass |
| UX-139 | Billing/Analytics | Record billing load, retry, plan review, checkout handoff, payment-method portal, popup-blocked, submitted, and failure decisions | P1 | Implemented in this pass |
| UX-140 | Profile/Analytics | Record profile load, tab, edit, local suggestion, AI draft, completion task, row delete, and photo-upload decisions | P1 | Implemented in this pass |
| UX-141 | Resume/Analytics | Record resume load, tab, import, AI draft, skill-save, save, export, and export-history decisions | P1 | Implemented in this pass |
| UX-142 | Networking/Analytics | Record suggestions, tab, preview, connect, accept, decline, withdraw, reminder, and suggestion-preference decisions | P1 | Implemented in this pass |
| UX-143 | Extension/Analytics | Record popup, options, page-scan, tracker, resume matcher, interview planner, settings, diagnostics, and background operational decisions | P1 | Implemented in this pass |
| UX-144 | Extension/Diagnostics | Add local analytics review, export, and clear controls to the popup diagnostics panel | P1 | Implemented in this pass |
| UX-145 | Admin/Product Analytics | Add privacy-bounded product analytics insight summaries to Admin Console with server and local fallback | P1 | Implemented in this pass |
| UX-146 | Admin/Product Analytics | Turn aggregate analytics summaries into prioritized improvement opportunities | P1 | Implemented in this pass |
| UX-147 | Messaging/Files | Add explicit provider-backed message attachment upload and file download route | P1 | Implemented in this pass |
| UX-148 | Files/Security | Add server-side upload folder, size, and blocked-extension guardrails | P1 | Implemented in this pass |
| UX-149 | Admin/Scheduler | Surface scheduled automation rollout visibility in Admin Console | P1 | Implemented in this pass |
| UX-150 | Admin/Scheduler | Add optional provider-backed scheduler run-history visibility with safe catalog fallback | P1 | Implemented in this pass |
| UX-151 | Resume/Export | Add explicit native PDF resume download with export history and analytics | P1 | Implemented in this pass |
| UX-152 | Resume/Files | Add explicit provider-backed PDF artifact upload with visible returned link | P1 | Implemented in this pass |
| UX-153 | Resume/Files | Add local uploaded-PDF artifact library and explicit provider delete control | P1 | Implemented in this pass |
| UX-154 | Resume/Files | Add one-click uploaded-PDF link copy with privacy-bounded analytics | P2 | Implemented in this pass |
| UX-155 | Resume/Files | Sync uploaded-PDF artifact metadata and delete status to user accounts with local fallback | P1 | Implemented in this pass |
| UX-156 | Resume/Import | Add reviewed DOCX resume text import without saving fields automatically | P1 | Implemented in this pass |
| UX-157 | Resume/Profile | Add reviewed experience and education row suggestions from resume imports | P1 | Implemented in this pass |
| UX-158 | Profile/Files | Add reviewed provider-backed profile photo upload with avatar persistence | P1 | Implemented in this pass |
| UX-159 | Profile/Files | Add explicit profile photo removal with avatar persistence cleanup | P2 | Implemented in this pass |
| UX-161 | Profile/Files | Add reviewed profile photo crop controls before avatar upload | P2 | Implemented in this pass |
| UX-162 | Resume/Files | Add visible uploaded-PDF delete receipts for provider revocation visibility | P2 | Implemented in this pass |
| UX-163 | Resume/Accessibility | Replace uploaded-PDF delete browser confirmation with an accessible reviewed modal | P2 | Implemented in this pass |
| UX-164 | Jobs/Accessibility | Add reviewed confirmation before recruiter job-post template deletion | P2 | Implemented in this pass |
| UX-165 | Jobs/Accessibility | Add reviewed confirmation before saved-search deletion | P2 | Implemented in this pass |
| UX-166 | Applications/Accessibility | Add inline reviewed confirmation before clearing application drafts | P2 | Implemented in this pass |
| UX-167 | Applications/Accessibility | Add inline reviewed confirmation before profile-draft replacement | P2 | Implemented in this pass |
| UX-168 | Challenges/Accessibility | Add inline reviewed confirmation before starter-code reset | P2 | Implemented in this pass |
| UX-169 | Candidates/Accessibility | Add inline reviewed confirmation before resetting private review drafts | P2 | Implemented in this pass |
| UX-170 | AI/Accessibility | Add inline reviewed confirmation before clearing AI chat history | P2 | Implemented in this pass |
| UX-171 | Settings/Accessibility | Clarify account deactivation confirmation and record security review cancellations | P2 | Implemented in this pass |
| UX-172 | Extension/Diagnostics | Add inline review before clearing local extension analytics queue | P2 | Implemented in this pass |
| UX-173 | Extension/Options | Add reviewed confirmation before clearing interview prep cards | P2 | Implemented in this pass |
| UX-174 | Extension/Tracker | Add inline reviewed confirmation before removing tracked jobs | P2 | Implemented in this pass |
| UX-175 | Extension/Tracker | Add inline reviewed confirmation before discarding scanned job drafts | P2 | Implemented in this pass |
| UX-176 | Extension/Diagnostics | Add inline reviewed confirmation before clearing popup console logs | P2 | Implemented in this pass |
| UX-177 | Extension/Settings | Replace misleading cloud-sync toggle with explicit local-only sync-plan review | P2 | Implemented in this pass |
| UX-178 | Extension/Settings | Clarify Usage Diagnostics as local-only storage instead of telemetry sharing | P2 | Implemented in this pass |
| UX-179 | Extension/Settings | Clarify interview reminder preference as local-only until browser notifications exist | P2 | Implemented in this pass |
| UX-180 | Extension/Diagnostics | Replace misleading diagnostics sync simulation with a truthful local test-event action | P2 | Implemented in this pass |
| UX-181 | Extension/Resume Match | Replace fixed AI-matcher mock with transparent local keyword-overlap preview | P2 | Implemented in this pass |
| UX-182 | Extension/Dashboard | Clarify popup dashboard counts and page scan as local tracker/draft workflow | P2 | Implemented in this pass |
| UX-183 | Extension/Settings | Align Settings wording, prep-card reset events, and bounded diagnostics metadata with actual local behavior | P2 | Implemented in this pass |
| UX-184 | Extension/Tracker | Align local tracked-job logs and reset-scope copy with actual browser-local tracker behavior | P2 | Implemented in this pass |
| UX-185 | Extension/Tracker | Remove sample first-run tracker records and make web-preview scan fallback explicit | P2 | Implemented in this pass |
| UX-186 | Extension/Options | Remove sample prep cards and suppress placeholder resume-match score while comparison is pending | P2 | Implemented in this pass |
| UX-187 | AI/Career Path | Remove hard-coded career-path defaults and add retryable generated-guidance state | P2 | Implemented in this pass |
| UX-188 | AI/Assistant | Show AI chat persistence target in saved-status badge | P2 | Implemented in this pass |
| UX-189 | Jobs/Applications | Stop simulating successful application submission when persistence fails | P1 | Implemented in this pass |
| UX-190 | Jobs/Applications | Show retryable Applied-tab load failure instead of empty applications | P1 | Implemented in this pass |
| UX-191 | LMS/Progress | Stop silently completing lessons when progress persistence is unavailable | P1 | Implemented in this pass |
| UX-057 | Networking | Add profile-aware recommendation reasons and scores | P1 | Implemented in this pass |
| UX-065 | Networking | Add account-scoped suggestion dismissals with local fallback | P1 | Implemented in this pass |
| UX-070 | Networking | Add privacy-preserving mutual-connection scoring | P1 | Implemented in this pass |
| UX-071 | Networking | Add backend-owned suggestions endpoint | P1 | Implemented in this pass |
| UX-072 | Messaging | Add explicit visible-message read marking and correct unread dashboard counts | P1 | Implemented in this pass |
| UX-073 | Messaging | Add conversation unread badges for visible conversation pages | P1 | Implemented in this pass |
| UX-074 | Messaging | Keep active conversation row fresh from realtime inserts | P1 | Implemented in this pass |
| UX-075 | Messaging | Keep non-active visible conversation rows fresh from realtime inserts | P1 | Implemented in this pass |
| UX-076 | Messaging | Enrich visible conversation rows with participant profile names and avatars | P1 | Implemented in this pass |
| UX-077 | Messaging | Add explicit reviewed link attachment workflow | P1 | Implemented in this pass |
| UX-078 | Networking | Add notification-backed sent-request follow-up reminders | P1 | Implemented in this pass |
| UX-079 | Networking | Add selectable timing to sent-request follow-up reminders | P1 | Implemented in this pass |
| UX-080 | Global Shell/Notifications | Keep future scheduled reminders visible but out of urgent unread counts | P1 | Implemented in this pass |
| UX-081 | Networking | Add inline profile preview before full-profile navigation | P1 | Implemented in this pass |
| UX-082 | Messaging | Add draft-only suggested replies for latest incoming messages | P1 | Implemented in this pass |
| UX-083 | Candidates | Add draft-only interview planning and confirmed Interview status action | P1 | Implemented in this pass |
| UX-084 | Jobs | Add local recruiter job-post templates for editable posting drafts | P1 | Implemented in this pass |
| UX-085 | Jobs | Add explicit job-draft review before recruiter draft save | P1 | Implemented in this pass |
| UX-086 | Jobs | Add advisory duplicate warning before recruiter draft save | P1 | Implemented in this pass |
| UX-087 | Jobs | Attach recruiter company context to job drafts with explicit opt-out | P1 | Implemented in this pass |
| UX-088 | Jobs | Route recruiter posting CTAs through the full reviewed draft workflow | P1 | Implemented in this pass |
| UX-089 | Jobs | Add recruiter My Posts draft visibility and explicit publish checklist | P1 | Implemented in this pass |
| UX-090 | Jobs | Add owned-draft edit flow from recruiter My Posts | P1 | Implemented in this pass |
| UX-091 | Jobs | Add reviewed change summary before saved draft updates | P1 | Implemented in this pass |
| UX-092 | Jobs | Add inline recruiter company setup during job drafting | P1 | Implemented in this pass |
| UX-093 | Candidates | Add reviewed bulk move-to-Interview action for selected candidates | P1 | Implemented in this pass |
| UX-094 | Settings/Notifications | Add explicit digest frequency and quiet-hour delivery controls | P1 | Implemented in this pass |
| UX-095 | Candidates | Add reviewed bulk Offer/Reject actions for selected candidates | P1 | Implemented in this pass |
| UX-096 | Candidates | Add private structured candidate scorecards with note handoff | P1 | Implemented in this pass |
| UX-097 | Candidates | Sync structured candidate scorecards with local fallback | P1 | Implemented in this pass |
| UX-098 | Candidates | Add explainable advisory candidate signals and current-page sorting | P1 | Implemented in this pass |
| UX-099 | Candidates | Add current-page scorecard coverage analytics | P1 | Implemented in this pass |
| UX-100 | Candidates | Add current-page review focus filters | P1 | Implemented in this pass |
| UX-101 | Candidates | Turn current-page analytics into direct review-focus actions | P1 | Implemented in this pass |
| UX-102 | Candidates | Add first-candidate review queue entry point | P1 | Implemented in this pass |
| UX-103 | Candidates | Add previous/next candidate navigation in details | P1 | Implemented in this pass |
| UX-104 | Candidates | Guard unsaved private review edits during details navigation | P1 | Implemented in this pass |
| UX-066 | Networking | Add reversible local hide/restore controls for suggestions | P2 | Implemented in this pass |
| UX-067 | Dashboard | Add role-specific activation checklist from product signals | P1 | Implemented in this pass |
| UX-058 | AI | Add backend session and suggestion review records | P1 | Implemented in this pass |
| UX-068 | AI | Add cross-workflow AI suggestion handoff and approval queue | P1 | Implemented in this pass |
| UX-059 | Resume | Add scanned-PDF/OCR import review plus provider retention/revocation controls | P2 | Backlog |
| UX-160 | Resume/Import | Add local searchable-PDF resume import without saving fields automatically | P1 | Implemented in this pass |
| UX-060 | Admin | Add real service health/log links | P2 | Implemented in this pass |
| TECH-001 | API contracts | Generate frontend/backend endpoint mismatch report | P1 | Implemented in this pass |
| TECH-002 | Security | Align `/api/v1` security matchers across services | P1 | Implemented in this pass |
| TECH-003 | Performance | Add Jobs Explore pagination controls | P1 | Implemented in this pass |
| TECH-004 | Docs | Reconcile SSOT/architecture/service migration status | P1 | Implemented in this pass |
| TECH-005 | Performance | Add Jobs Explore query-level pagination metadata | P1 | Implemented in this pass |
| TECH-006 | Performance | Add Candidates query-level pagination metadata | P1 | Implemented in this pass |
| TECH-007 | Performance | Add Messaging active-thread query-level pagination metadata | P1 | Implemented in this pass |
| TECH-008 | Performance | Add Messaging conversation-list query-level pagination metadata | P1 | Implemented in this pass |
| TECH-009 | Performance | Add Header notifications query-level pagination metadata | P1 | Implemented in this pass |
| TECH-010 | Performance | Add LMS course catalog query-level pagination metadata | P1 | Implemented in this pass |
| TECH-011 | Performance | Add LMS course catalog query-level search | P1 | Implemented in this pass |
| TECH-012 | Performance | Add Admin audit-log query-level pagination metadata | P1 | Implemented in this pass |
| TECH-013 | Performance | Add Candidates query-level search metadata | P1 | Implemented in this pass |
| TECH-014 | Performance | Add LMS enrollment-aware progress filters | P1 | Implemented in this pass |
| TECH-015 | Performance | Add Admin audit-log cursor pagination | P1 | Implemented in this pass |
| TECH-016 | Performance | Add Header notification cursor pagination | P1 | Implemented in this pass |
| TECH-017 | Performance | Add cursor pagination to remaining heavy list surfaces | P1 | In progress: Jobs Explore, Candidates, Messaging conversation lists, Messaging active threads, Header notifications, LMS course catalog/progress tabs, and Admin audit logs implemented |
| TECH-018 | Performance | Add Jobs Explore cursor pagination | P1 | Implemented in this pass |
| TECH-019 | Performance | Add Candidate pipeline cursor pagination | P1 | Implemented in this pass |
| TECH-020 | Performance | Add Messaging active-thread cursor pagination | P1 | Implemented in this pass |
| DATA-001 | Audit | Add automation suggestion/audit tables | P1 | Implemented in this pass |
| DATA-002 | Analytics | Add product analytics event taxonomy and ingestion | P1 | Implemented in this pass |

## 8. Implementation Completed In This Pass

### 8.1 Networking Fallback Cleanup

Changed:

- Updated networking feed API fallback from `/api/v1/network/feed` to the backend-supported `/api/v1/networking/feed`.
- Removed the guaranteed-dead `/api/v1/network/suggestions` fallback call because no backend controller exposes it.

Why it improves UX:

- When Supabase feed loading is unavailable, the app now retries the correct backend namespace.
- When suggestions fail, the app avoids making a known-bad request and settles cleanly.

How user effort was reduced:

- Users are less likely to hit delayed empty states caused by unnecessary 404 fallback calls.

How user control was preserved:

- No connection requests, reminders, or profile actions are automated. The change only affects read fallback behavior.

### 8.2 Role-Prioritized Mobile Navigation

Changed:

- Mobile bottom nav now selects the top five destinations by role instead of blindly showing the first five desktop nav entries.
- Recruiters get Dashboard, Jobs, Candidates, Messages, Network.
- Admins get Dashboard, Admin Console, Messages, Profile, Settings.
- Talent users get Dashboard, Jobs, Learning, Challenges, Messages.
- The full mobile drawer still exposes all allowed destinations.

Why it improves UX:

- High-frequency workflows are reachable in one tap on mobile for each role.
- Recruiters no longer lose Messages/Network from the bottom nav simply because Learning/Challenges appear earlier in desktop nav order.

How user effort was reduced:

- Fewer mobile drawer opens for common recruiter/admin/talent workflows.

How user control was preserved:

- No routes are removed, hidden from the drawer, or activated automatically. This only changes shortcut priority.

### 8.3 Profile Row Removal Confirmation

Changed:

- Replaced native browser confirmation for experience and education removal with a shared in-app profile removal modal.
- Added the same review-before-delete step for skill removal, which previously removed skills immediately after clicking the icon.
- Kept per-row loading state so duplicate deletion is blocked while the delete request is in progress.

Why it improves UX:

- Users now see consistent context before removing skills, work history, or education.
- The modal explains that matching, resume previews, and profile viewers may stop using the item after removal.

How user effort was reduced:

- Users do not have to interpret inconsistent browser prompts or recover from accidental skill deletion.

How user control was preserved:

- No profile row is deleted until the user presses the destructive Remove action in the modal.
- Cancel and backdrop close remain available until the delete request is actively running.

### 8.4 Dashboard Issue Retry

Changed:

- Added a dashboard refresh action to the status strip for live, partial, and error states.
- Added issue-level retry controls for the first visible degraded dashboard sections.
- Refactored dashboard loading so initial page load can show skeletons while manual retry keeps existing dashboard content visible.
- Added a refresh-in-progress state and disabled duplicate retry clicks while a retry is running.

Why it improves UX:

- Users can recover from partial dashboard failures without reloading the whole page or navigating away.
- Degraded sections now expose a direct recovery action beside the issue text.

How user effort was reduced:

- One click retries affected dashboard data instead of requiring a full browser refresh.
- Existing dashboard content remains visible during retry, reducing context loss.

How user control was preserved:

- Retry only refetches dashboard data. It does not apply, message, update profiles, change candidate state, or perform any critical action automatically.
- Users explicitly trigger retry and can see loading state while it runs.

### 8.5 Candidate Status Confirmation

Changed:

- Offer and Reject actions in the candidate list now open a confirmation modal instead of changing status immediately.
- Candidate detail footer actions use the same confirmation flow.
- The confirmation modal shows candidate name, role, current status, and target status before the recruiter commits the change.
- Failed status updates keep the confirmation open and show an inline error message instead of silently closing.

Why it improves UX:

- Recruiters can verify the candidate and target status before making a high-impact hiring decision.
- The action result is clearer because loading and failure states are tied to the confirmation step.

How user effort was reduced:

- Recruiters no longer have to recover from accidental one-click offer/reject actions.
- The confirmation centralizes the decision context, reducing the need to reopen candidate details before acting.

How user control was preserved:

- No application status changes until the recruiter presses Confirm Offer or Confirm Rejection.
- Cancel and backdrop close remain available before the update starts, and failed updates do not mutate local UI state.

### 8.6 Saved Search New-Match Tracking

Changed:

- Saved job searches can now opt in to in-app new-match tracking.
- Saved-search records store tracking metadata: enabled state, last checked time, and last reviewed match count.
- The saved-search list shows a new-match badge when a tracked search has more matching jobs than the last reviewed baseline.
- Applying a tracked saved search marks the current match count as reviewed.
- Users can enable or disable tracking from each saved-search chip.

Why it improves UX:

- Talent users can return to useful searches without repeatedly re-entering filters or manually checking whether a search has grown.
- The alert state stays next to the saved search instead of requiring a separate notification settings workflow.

How user effort was reduced:

- Repetitive search checks are collapsed into a visible new-match badge.
- Reapplying a search also clears the badge by updating the reviewed baseline.

How user control was preserved:

- Tracking is opt-in per saved search.
- The system does not apply, save, delete, or submit anything automatically; it only computes and displays local match deltas.
- Users can disable tracking at any time from the saved-search chip.

### 8.7 Application Draft Persistence

Changed:

- Added an `application_drafts` table to the Supabase schema with user-scoped RLS policies, per-user/per-job uniqueness, and updated-at tracking, plus an application-service Flyway migration for the same draft model.
- Reviewed application drafts are stored locally per user and job after the user edits a field or explicitly applies the profile-generated draft.
- Drafts sync to the account in the background when the table is available, with local fallback when sync is unavailable.
- Reopening the same job restores the local draft immediately, then replaces it with a newer account draft when available.
- Newer browser-local drafts are backfilled to the account automatically.
- The application review panel shows when the draft was saved.
- Clearing the draft removes the local copy and attempts to delete the account copy; successful submission removes the saved draft for that job.

Why it improves UX:

- Users can pause an application and return without losing edits.
- Profile-generated drafts remain reviewable and reusable without forcing users to regenerate or rewrite them.
- Account sync reduces cross-device rework after the schema is deployed.

How user effort was reduced:

- Repeated typing and copy/paste recovery are reduced when the modal closes, the user navigates away, or they return later.
- The saved timestamp makes the background persistence visible without adding a separate save workflow.
- Users do not need to manually import local drafts into their account; local-only drafts are backfilled opportunistically.

How user control was preserved:

- Draft persistence never submits an application.
- Users must still press Submit Application, can edit every saved field, can replace the draft with the profile draft, and can clear the stored draft.
- Saved drafts are removed after successful submission to avoid stale future reuse.
- Failed account sync falls back to local storage instead of blocking edits or submission.

### 8.8 Application Status Event Timeline

Changed:

- Added an `application_status_events` table to the Supabase schema with RLS policies for applicants and job posters.
- Added a Spring application-service status event entity, repository, migration, status event write path, and `GET /api/v1/applications/{id}/events`.
- Application submission and recruiter status updates now attempt to append status events without blocking the primary action if event recording is unavailable.
- The Applied application details modal now loads status events and renders an event-backed timeline when available.
- Older deployments or older applications fall back to the previous inferred timeline with a clear fallback message.

Why it improves UX:

- Talent users can see when an application actually changed state instead of only seeing an inferred stepper.
- Recruiter decisions now have an audit trail that can support support workflows, trust, and future notification automation.

How user effort was reduced:

- Users no longer need to infer whether a status was actually updated or just represented by the current state.
- Support and operations can rely on a status history model rather than reconstructing changes from application rows.

How user control was preserved:

- Status events are append-only audit records. They do not change application status by themselves.
- Recruiter Offer/Reject still requires explicit confirmation before the status update and event write are attempted.
- Event write failure does not silently mutate additional records; the core status update path remains visible and controlled.

### 8.9 Recruiter Notes Persistence

Changed:

- Added a `candidate_notes` table to the Supabase schema with recruiter-scoped RLS policies and updated-at metadata.
- Recruiter notes now load from the server when available and merge with the existing local browser cache.
- Saving a note writes to local cache immediately, then attempts server sync.
- Clearing a note deletes the server record when available and removes the local cache entry.
- If the server table is unavailable, notes remain saved locally and the recruiter sees a fallback toast.

Why it improves UX:

- Recruiters can keep screening context attached to the application instead of relying on separate notes outside the product.
- Notes are positioned to work across devices once the schema is deployed, while preserving existing local behavior during rollout.

How user effort was reduced:

- Recruiters no longer need to re-enter or manually transfer screening notes when reviewing the same candidate later.
- The note remains in the candidate detail view, directly beside submitted materials and status actions.

How user control was preserved:

- Notes are private recruiter-authored records and are only saved when the recruiter presses Save Note.
- Emptying the note is the explicit delete path.
- Note save/delete does not change application status or notify the candidate.

### 8.10 Backend-Synced Saved Searches

Changed:

- Added a `saved_job_searches` table to the Supabase schema with user-scoped RLS policies, indexes, alert metadata, and updated-at tracking.
- Added frontend saved-search service methods for loading, upserting, and deleting saved searches from Supabase.
- Jobs now hydrate saved searches from local storage first, then merge server records when available.
- Existing browser-local saved searches are backfilled to the server in the background.
- Saving, applying, toggling alerts, and deleting saved searches now update local state immediately and attempt server sync.
- If server sync is unavailable, the previous local saved-search behavior remains available and the user sees a fallback toast.

Why it improves UX:

- Saved searches are positioned for cross-device continuity once the database migration is deployed.
- Users keep fast local feedback while server sync catches up in the background.
- The saved-search model supports in-app notification delivery without requiring users to recreate searches.

How user effort was reduced:

- Users no longer need to manually recreate saved searches after switching devices or browsers when server persistence is available.
- Local-only saved searches are migrated opportunistically instead of requiring a manual import step.

How user control was preserved:

- Searches are only created, applied, deleted, or alert-enabled after explicit user actions.
- Sync does not submit applications, change profiles, or send notifications by itself; in-app job-alert notifications are only created for searches where the user explicitly enables tracking.
- Failed server sync falls back to local storage instead of blocking the user's current workflow.

### 8.11 Profile-Aware Networking Recommendations

Changed:

- Networking suggestions now include profile-aware recommendation metadata from Supabase-backed profile signals.
- The recommendation service compares current-role/headline, location, current companies, and skills where available.
- Suggested profiles now carry a recommendation score, recommendation reasons, shared skills, and shared companies.
- Discovery cards show the recommendation score, explicit "Why suggested" reasons, avatar image when available, and shared/profile skill chips.
- Networking search now matches names, roles, locations, skills, and recommendation reasons.
- Users can hide irrelevant suggestions with account sync when available, retain local fallback when sync fails, and restore hidden suggestions from Discover.

Why it improves UX:

- Users can understand why a person is being recommended before deciding whether to connect.
- Better reason metadata reduces blind browsing and makes discovery feel more relevant.
- Skill chips and profile images improve scanability without adding a new workflow step.

How user effort was reduced:

- Users spend less time opening profiles just to determine whether a suggested person is relevant.
- Search can now find recommendations by location, skill, or reason text, not only name/role.
- Irrelevant suggestions can be removed from the current browsing flow immediately, then synced to the account in the background.

How user control was preserved:

- Recommendations never send connection requests automatically.
- Users still choose whether to add a note, open the profile, connect, or ignore the suggestion.
- Hidden suggestions are reversible through Show hidden and remain local-only when account preference sync is unavailable.
- The scoring is presented as context only; no existing connection, reminder, or request state is mutated by recommendation generation.

### 8.12 Account-Scoped Networking Suggestion Preferences

Changed:

- Added `networking_suggestion_preferences` schema coverage, RLS policies, indexes, and a networking-service migration.
- Added networking service helpers for loading, saving, deleting, and clearing dismissed suggestion preferences.
- Networking Discover now loads local hidden suggestion IDs first, merges account-scoped dismissed suggestions when available, and backfills local hidden IDs to the account.
- Hide suggestion still updates the UI immediately, then syncs the dismissal to the account in the background.
- Show hidden clears local hidden IDs immediately and clears account-scoped dismissals when available.

Why it improves UX:

- Irrelevant people stay hidden across browsers and devices once account sync is available.
- Users keep instant feedback and can continue using Discover when the preference table is unavailable.
- The page now explains whether hidden suggestions are synced or local-only, reducing uncertainty.

How user effort was reduced:

- Users no longer have to re-hide the same irrelevant people on another browser.
- Local-only preferences are backfilled automatically instead of requiring manual setup.

How user control was preserved:

- Hiding a suggestion only changes recommendation visibility for that user.
- Restoring hidden suggestions is explicit and reversible.
- No connection request, message, profile change, reminder, or notification is created by hiding or restoring a suggestion.

### 8.13 Role-Specific Dashboard Onboarding

Changed:

- Added dashboard onboarding signals for talent users: profile basics, skill count, application count, saved-search count, course enrollment count, and challenge submission count.
- Added recruiter onboarding signals for company setup, active jobs, applications, and recent candidate pipeline activity.
- Added a shared dashboard checklist card with completion count, progress bar, completed/incomplete state, and direct next-action buttons.
- Talent users now see guided steps for profile setup, saved search, first application, learning, and challenge practice.
- Recruiters now see guided steps for company context, first role, candidate review, and outreach preparation.

Why it improves UX:

- New and returning users no longer have to infer the best next action from disconnected dashboard widgets.
- Recruiters and talent users see different activation paths that match their role and business workflow.
- The checklist turns broad platform capability into a small sequence of concrete tasks.

How user effort was reduced:

- High-value workflows are reachable directly from the dashboard checklist.
- Completed work is detected from existing product signals instead of asking users to manually mark tasks done.
- Users can recover incomplete setup from one place rather than scanning Profile, Jobs, LMS, Challenges, Candidates, and Messaging.

How user control was preserved:

- Checklist actions only navigate to the relevant workflow.
- The system does not auto-save profile data, apply to jobs, enroll in courses, submit challenges, post jobs, or message candidates.
- Completion state is informational and derived from current data; users keep full control over every underlying action.

### 8.14 Server-Backed AI Sessions And Review Records

Changed:

- Added `ai_sessions` and `automation_suggestions` schema, RLS policies, indexes, and update triggers to the Supabase schema, plus a matching AI service Flyway migration.
- Added AI service helpers for loading the latest account session, saving sessions, deleting sessions, and saving suggestion review records.
- Updated the AI assistant to restore local history first, hydrate from the latest account session when available, backfill local sessions to the server, and debounce ongoing session sync.
- Assistant draft responses now create automation suggestion records when possible; Save and Dismiss upsert the review status so the user decision can survive browser changes.
- Clearing chat starts a new local session and deletes the current server-backed session when available.

Why it improves UX:

- AI conversations and review decisions are no longer limited to a single browser once the backend tables are deployed.
- Users get continuity without extra setup, while local fallback still keeps the assistant usable during schema or network outages.
- The product now has a safer foundation for future AI handoffs because generated suggestions and user review decisions can be audited before any product workflow is changed.

How user effort was reduced:

- Users do not need to re-review the same AI draft after switching browsers or returning later on an account session.
- Save and Dismiss remain one-click actions; persistence happens in the background with visible fallback warnings only when sync fails.
- Existing local history is backfilled automatically for signed-in users when no server session exists.

How user control was preserved:

- AI still does not mutate profile, resume, applications, jobs, settings, or messages.
- Save and Dismiss only record the review state for an AI suggestion.
- Clear Chat only clears the current AI session and associated suggestion records.
- If server sync fails, the UI keeps the local state and tells the user account sync is unavailable.

### 8.15 Saved-Search In-App Notification Delivery

Changed:

- Added a frontend notification service that reads account notifications from Supabase, falls back to the notification service API, and preserves local notification fallback if both server paths are unavailable.
- Added saved-search alert notification upsert logic keyed by saved-search metadata so repeated checks update the same unread alert instead of spamming the user.
- Updated the header notification popover to show account notification rows, unread indicators, mark-read controls, and existing role-aware reminders without showing the unread dot for static reminders.
- Jobs now deliver an in-app notification when an opted-in saved search has more current matches than its reviewed baseline.
- Daily or weekly digest preferences now defer immediate saved-search notification creation, update the saved-search reviewed baseline, and show a visible immediate-alert paused status toast without claiming that a backend digest was sent.
- Deferred daily/weekly saved-search matches now queue a `notification_digest_items` record so a backend runner can group them into a later digest notification.
- Added `notification_settings` schema coverage plus `JOB_ALERT` notification type, notification insert/delete RLS policies, and notification query indexes.

Why it improves UX:

- Users no longer need to manually revisit every tracked saved search to know when new matching jobs exist.
- The global header becomes a real notification surface instead of a static reminder list.
- Notification state remains visible and recoverable: unread alerts can be opened, marked read, or all marked read.

How user effort was reduced:

- Repetitive saved-search checking is replaced by automatic in-app alert creation.
- Users who prefer daily or weekly digests avoid immediate lower-priority alert interruption while still keeping saved-search match tracking current.
- Queued digest items let users receive one grouped notification later instead of individual immediate alerts when a scheduler runs the delivery worker.
- The notification opens Jobs directly, where the user can apply the saved search and review results.
- If the server notification table is unavailable, local fallback still surfaces the alert.

How user control was preserved:

- Saved-search notifications only exist for searches where the user explicitly enables new-match tracking.
- Global Job Alerts settings can suppress notification delivery while still allowing local saved-search badges.
- Daily and weekly digest settings defer immediate alerts only; users can change the digest preference or disable per-search tracking at any time.
- The digest runner re-checks current Job Alerts and digest-frequency preferences before creating a digest notification.
- Notifications never submit applications, change profiles, message recruiters, or apply filters until the user opens and applies the saved search.

### 8.16 Privacy-Preserving Mutual Networking Context

Changed:

- Added a Supabase RPC that returns mutual-connection counts for requested suggestion candidates without exposing the underlying connection rows.
- Guarded the RPC so it only returns counts for the authenticated user's own `p_current_user_id`.
- Networking recommendations now fetch mutual counts when available, add them to recommendation reasons, include them in score weighting, and display them on Discover cards.
- If the RPC is unavailable, suggestions continue using the existing profile-aware ranking path.

Why it improves UX:

- Users can spot warmer networking paths before opening a profile or writing a connection note.
- Mutual context makes recommendation ranking easier to understand without adding a new workflow step.

How user effort was reduced:

- Users spend less time manually checking profiles to infer whether they share a network path.
- Higher-context suggestions appear earlier when mutual counts are available.

How user control was preserved:

- Mutual context is read-only and aggregate-only.
- The app still never sends connection requests, messages, reminders, or profile changes automatically.
- Users can ignore, hide, restore, open, or connect with suggestions explicitly.

### 8.17 Generated API Contract Drift Report

Changed:

- Added `npm run report:api-contracts` at the repo root.
- Added `scripts/generate-api-contract-report.mjs`, a dependency-free scanner for frontend `apiClient` calls, Spring controller mappings, API Gateway path predicates, security matcher strings, and direct frontend Supabase table access.
- Generated `docs/API_CONTRACT_MISMATCH_REPORT.md` from the current codebase.
- The first report found 0 frontend API client calls without matching controllers, 5 video controller routes without an API Gateway prefix, 8 legacy `/api/*` security matcher paths, and 35 direct frontend Supabase table access paths.

Why it improves UX:

- API drift is now visible before users encounter broken fallback paths, unreachable provider flows, or inconsistent authorization behavior.
- Teams can prioritize fixes from current evidence instead of stale route documentation.

How user effort was reduced:

- Engineers and QA can refresh one report instead of manually comparing service clients, controllers, gateway routes, and security configs.
- Product planning can separate "missing controller" issues from "gateway/security/direct data path" issues.

How user control was preserved:

- This is analysis automation only. It does not change product data, auth rules, user notifications, messages, applications, or profile state.
- The report flags risks and follow-ups; it does not automatically rewrite routes or security policies.

### 8.18 API Gateway And Security Matcher Alignment

Changed:

- Updated API Gateway open-route validation from legacy `/api/auth/*` entries to the current `/api/v1/auth/*` endpoints exposed by the auth service.
- Added a `/api/v1/video/**` API Gateway route to the video service with the same `AuthenticationFilter` pattern used by other protected services.
- Updated application, challenge, company, gamification, and LMS service security matchers from legacy `/api/*` paths to their current `/api/v1/*` controller prefixes.
- Regenerated `docs/API_CONTRACT_MISMATCH_REPORT.md`; it now reports 0 frontend API calls without matching controllers, 0 controller routes without gateway prefixes, and 0 legacy `/api/*` security matcher paths.

Why it improves UX:

- Gateway-routed video interview APIs are now discoverable through the same `/api/v1` edge path as the rest of the platform.
- Users are less likely to hit unavailable or inconsistent provider flows caused by route drift rather than missing product capability.

How user effort was reduced:

- Engineers and QA no longer need to manually reconcile the first set of security/gateway drift findings before testing video or service fallback paths.
- Future route reviews can start from a clean generated report.

How user control was preserved:

- This changes routing and security configuration only.
- No profile, application, notification, message, billing, AI, networking, or video session action is triggered automatically.
- User-facing critical actions still require explicit UI or API calls.

### 8.19 Jobs Explore Pagination Controls

Changed:

- Added page-size state and previous/next pagination controls to the Jobs Explore results list.
- Added a visible result range, such as "Showing 1-12 of 42 matching jobs", with polite status semantics for assistive technology.
- Reset the Jobs Explore page to the first page when search terms or filters change, and clamp the current page when result counts shrink.
- Preserved the existing job query, saved-search, application-draft, and apply review flows.

Why it improves UX:

- Users no longer have to scan or scroll through every matching job at once.
- The page communicates where the user is in the result set, reducing uncertainty after filtering.
- The Apply and View Application actions remain on normal cards, so the workflow stays familiar.

How user effort was reduced:

- Users can scan a smaller chunk of results, change density, and move through results without re-entering filters.
- Filter changes automatically return to the first page, avoiding empty-looking out-of-range result pages.

How user control was preserved:

- Pagination only changes which matching cards are visible.
- It does not save searches, submit applications, alter drafts, contact recruiters, or change job records.
- Users choose the page size and page navigation explicitly.

Follow-up:

- Add service-owned cursor and total-count metadata for production-scale backend APIs. Messaging and LMS still need formal backend-owned cursor contracts; candidate search still needs an indexed backend-owned endpoint.

### 8.20 Architecture Status Documentation Reconciliation

Changed:

- Added `docs/ARCHITECTURE_STATUS_INDEX.md` as the current architecture planning entry point.
- Reconciled the status of `SSOT.md`, `docs/ARCHITECTURE_AUDIT.md`, `docs/SERVICE_MIGRATION.md`, `docs/ARCHITECTURE_MIGRATION.md`, `docs/ARCHITECTURE_PROPOSAL.md`, and `docs/unified-rebuild-roadmap.md`.
- Added current-status notices to those older architecture documents so historical claims are not mistaken for verified current state.
- Updated `README.md` to route new readers to the architecture status index, comprehensive audit, feature inventory, API contract report, and UX automation audit before historical docs.
- Captured current repo evidence: active frontend source tree, direct Supabase plus Spring service hybrid data access, service-module backend topology, incomplete single-backend target, partial BOM/contracts migration with remaining `ts-shared` dependencies, and current Java test-runner limitation.

Why it improves UX:

- Product, engineering, QA, and operations planning now start from one evidence-based architecture status page.
- Teams are less likely to test the wrong routes, assume a completed backend topology, or plan against stale "all phases complete" claims.

How user effort was reduced:

- Readers no longer have to manually compare multiple architecture docs to determine which one is current.
- Onboarding and release planning can link directly to the status index and generated API contract report.

How user control was preserved:

- This is documentation-only. It does not change auth, routing, data persistence, applications, messages, notifications, AI sessions, billing, profile data, or service behavior.
- The index makes uncertainty explicit and keeps historical documents available for review instead of silently deleting planning context.

Follow-up:

- Keep the status index reviewed whenever service dependency migration, backend topology, API ownership, or documentation authority changes.

### 8.21 Jobs Explore Query-Level Pagination Metadata

Changed:

- Added `jobService.getJobsPage`, returning `jobs`, `total`, `limit`, `offset`, `hasNext`, and later `nextCursor` while preserving the existing `jobService.getJobs` array return shape for saved-search alerts and other callers.
- Updated the Jobs RTK Query slice with `useGetJobsPageQuery`.
- Updated Jobs Explore to request one bounded result page at a time instead of fetching all matching jobs and slicing locally.
- Updated pagination status text to use exact total counts when Supabase returns them, and safe next-page fallback behavior when an API fallback lacks totals.
- Added unit coverage for paginated metadata and backward-compatible `getJobs` array results.

Why it improves UX:

- Large job searches do not need to load every matching job before the user can scan the first page.
- Users still see a clear result range and page controls, with exact totals when the data source supports counts.
- Existing saved-search alerts and application review behavior continue to work with the older array query path.

How user effort was reduced:

- Job discovery starts from the current page of useful results rather than requiring the browser to handle the full matching set.
- Users keep their filters, page size, and next/previous controls without learning a new workflow.

How user control was preserved:

- Query-level pagination only changes read volume and result visibility.
- It does not save searches, submit applications, change drafts, contact recruiters, or mutate job records.
- Page size and page navigation remain explicit user choices.

Follow-up:

- Add stable total-count and cursor contracts for API Gateway responses.
- Apply cursor contracts to messaging, LMS course lists, and backend-owned APIs.

### 8.22 Candidate Pipeline Query-Level Pagination Metadata

Changed:

- Added `recruiterService.getApplicationsPage`, returning `applications`, `total`, `limit`, `offset`, `hasNext`, and later `nextCursor` while preserving the existing `recruiterService.getAllApplications` array return shape.
- Updated the Candidates page to request one limited/offset application page at a time for the default recruiter pipeline.
- Added candidate page-size, result range, previous-page, and next-page controls.
- Preserved existing details, notes, profile-opening, and status-confirmation behavior while later query-level candidate search work was added.
- Added unit coverage for paginated application metadata and backward-compatible `getAllApplications` array results.

Why it improves UX:

- Recruiters can scan a manageable application page instead of loading every application into the review pipeline up front.
- The result range and page controls make review progress visible.
- Existing candidate details, notes, profile opening, and Offer/Reject confirmation behavior remain unchanged.

How user effort was reduced:

- Recruiters get a faster first page for large application pools and can choose page density.
- Notes load only for the currently visible application page during normal browsing.

How user control was preserved:

- Pagination only changes read volume and visible rows.
- It does not save notes, update candidate status, send messages, create offers, reject candidates, or mutate applications automatically.
- Offer and Reject still require explicit confirmation.

Follow-up:

- Add service-owned indexed candidate search and pagination contracts for backend-owned APIs.
- Add interview scheduling, bulk review, and advisory ranking to reduce recruiter triage effort.

### 8.23 Messaging Active-Thread Query-Level Pagination Metadata

Changed:

- Added `messagingService.getMessagesPage`, returning `messages`, `total`, `limit`, `offset`, `hasNext`, and later `nextCursor` while preserving the existing `messagingService.getMessages` array return shape.
- Updated the messaging Redux slice with message-history loading state, total metadata, `hasOlderMessages`, `messageNextCursor`, and a `loadOlderMessages` thunk that prepends older pages by stable message ID.
- Updated the Messaging page to load the latest bounded page automatically, show loaded/total message context, expose an explicit Load older messages action, and provide retry feedback when history loading fails.
- Added unit coverage for paginated message metadata and the backward-compatible `getMessages` array result.

Why it improves UX:

- Large conversations no longer require loading every historical message before the user can read or reply to the latest thread.
- The header tells users how much history is loaded, and older history is available on demand.
- Failure and retry states are visible inside the conversation instead of producing a silent empty history.

How user effort was reduced:

- Users can start from the latest relevant messages and only fetch older context when needed.
- The app avoids extra upfront network and rendering work for long conversations.

How user control was preserved:

- Pagination only changes read volume and visible history.
- It does not send messages, mark messages read, notify participants, modify conversations, or hide history automatically.
- Loading older messages is an explicit user action.

Follow-up:

- Extend the same cursor contract to backend-owned chat APIs and formal LMS gateway-owned course paging.

### 8.24 Messaging Conversation-List Query-Level Pagination Metadata

Changed:

- Added `messagingService.getConversationsPage`, returning `conversations`, `total`, `limit`, `offset`, and `hasNext` while preserving the existing `messagingService.getConversations` array return shape.
- Switched the conversation list query to `conversation_participants` with embedded `conversations!inner`, exact counts, `updated_at` ordering, left-conversation filtering, one latest nested message preview, and range-based page loading.
- Updated the messaging Redux slice with conversation-list pagination metadata and a `loadMoreConversations` thunk that appends older conversation pages.
- Updated the Messaging page to show loaded/total conversation context, an explicit Load more conversations action, and visible retry feedback for failed conversation list loads.
- Added unit coverage for paginated conversation metadata and the backward-compatible `getConversations` array result.

Why it improves UX:

- Accounts with many conversations can open Messaging from the most recent thread page instead of forcing the app to render every conversation at once.
- Users can see how many conversations are currently loaded and request older threads only when needed.
- Conversation-list failures now expose a retry path rather than collapsing into an ambiguous empty list.

How user effort was reduced:

- The first Messaging view focuses on current conversations and avoids upfront loading of older threads.
- Users do not need to wait for older conversations before reading or replying to recent messages.

How user control was preserved:

- Conversation pagination only changes read volume and visible thread rows.
- It does not send messages, mark messages read, notify participants, create conversations, archive conversations, or hide threads automatically.
- Loading more conversations is an explicit user action.

Follow-up:

- Add cursor tokens for stable conversation paging across concurrent message updates.
- Extend query-level/cursor pagination to audit logs and backend-owned messaging/chat APIs; add true cursor tokens for LMS course paging.

### 8.25 Header Notifications Query-Level Pagination Metadata

Changed:

- Added `notificationService.getNotificationsPage`, returning `notifications`, `total`, `limit`, `offset`, `hasNext`, and later `nextCursor` while preserving the existing `notificationService.getNotifications` array return shape.
- Updated the Supabase notification query to request exact counts and limited/offset ranges ordered by `created_at`.
- Added API fallback limit/offset params and local fallback pagination when both server paths are unavailable.
- Updated the global Header notification popover to show loaded/total notification context, explicit Load more notifications, and retry feedback for failed later-page loads.
- Added unit coverage for paginated notification metadata, compatibility behavior, and local fallback pagination.

Why it improves UX:

- Users can inspect older account notifications without leaving the header or opening a separate page.
- The popover keeps the first load small while exposing older notifications on demand.
- Failure feedback makes notification loading problems visible instead of silently hiding older activity.

How user effort was reduced:

- Recent notifications load quickly, and older notifications are available through a single in-context action.
- Users no longer lose access to older notification rows just because the header previously capped the list.

How user control was preserved:

- Pagination only changes read volume and visible notification rows.
- It does not mark notifications read, navigate, trigger jobs, send messages, contact anyone, or change preferences automatically.
- Mark read, Mark all read, and notification navigation remain explicit user actions.

Follow-up:

- Add service-owned notification APIs with first-class cursor/total response contracts.
- Add true cursor tokens for LMS course paging.

### 8.26 LMS Course Catalog Query-Level Pagination Metadata

Changed:

- Added `lmsService.getCoursesPage`, returning `courses`, `total`, `limit`, `offset`, and `hasNext` while preserving the existing `lmsService.getCourses` array return shape.
- Updated API Gateway course catalog requests to include `category`, `published`, `limit`, and `offset` params and to normalize list/`content`/`courses`/`items` response shapes.
- Updated Supabase fallback course loading to request exact counts, apply `range(offset, offset + limit - 1)`, and fetch lesson metadata only for the visible course page.
- Updated the LMS Redux slice and LMS page with course pagination metadata, page-size selection, result range text, and explicit previous/next page controls.
- Added unit coverage for paginated gateway metadata, compatibility behavior, and legacy full-array gateway slicing.

Why it improves UX:

- Learners can scan a bounded course page instead of forcing the browser to load the entire catalog before the page is useful.
- Result range and page controls make catalog browsing state visible.
- Existing enrollment, lesson selection, progress, Continue Learning, and Recommended Next behavior remain unchanged.

How user effort was reduced:

- The course catalog loads and renders the current page first.
- Learners can choose catalog density and move through pages without re-entering search text or tab choices.

How user control was preserved:

- Pagination only changes read volume and visible course rows.
- It does not enroll users, complete lessons, change progress, accept recommendations, or mutate course records automatically.
- Enrollment, lesson completion, and modal navigation remain explicit user actions.

Follow-up:

- Add true cursor tokens for stable LMS paging across concurrent course publishes.
- Continue cursor pagination work for audit logs and backend-owned APIs.

### 8.27 LMS Course Catalog Query-Level Search

Changed:

- Added `search` to `CourseQueryParams`.
- Updated API Gateway course catalog requests to send normalized `search` alongside `category`, `published`, `limit`, and `offset`.
- Added compatibility filtering for legacy gateway full-array responses so the frontend filters matching courses before applying local page slicing.
- Updated Supabase fallback course loading to apply search across title, description, and category before count/range pagination.
- Updated the LMS page to send the normalized search term with course queries, reset paging directly from search/tab handlers, and show search result ranges as matching courses.
- Added unit coverage for search params and legacy full-array search pagination.

Why it improves UX:

- Course search now works against the queried catalog result set instead of only filtering the courses that happened to be loaded on the current page.
- Learners can search from any page and return to the first matching result page automatically.
- Search status text now communicates matching course ranges when total metadata is available.

How user effort was reduced:

- Learners do not have to page through the catalog hoping a course appears on the current page before search can find it.
- Search and page-size controls now work together with less surprising empty-page behavior.

How user control was preserved:

- Search only changes read queries and visible course rows.
- It does not enroll users, complete lessons, change progress, accept recommendations, or mutate course records automatically.
- Course opening, enrollment, lesson selection, and completion remain explicit actions.

Follow-up:

- Add formal Spring LMS search/filter support if the API Gateway becomes the authoritative LMS catalog source.
- Add true cursor tokens for stable LMS paging across concurrent course publishes.

### 8.28 Admin Audit Log Query-Level Pagination Metadata

Changed:

- Added `adminService.getAuditLogsPage`, returning `logs`, `total`, `limit`, `offset`, `hasNext`, and later `nextCursor` while preserving the existing `adminService.getAuditLogs(limit)` array return shape.
- Fixed audit log ordering to use the schema-backed `created_at` column instead of the non-schema `timestamp` field.
- Updated Admin Dashboard to load a bounded audit-log page, show loaded/total context, retry audit-log failures independently, and explicitly load more audit events.
- Added unit coverage for paginated audit metadata and the compatibility audit-log array API.

Why it improves UX:

- Admins can inspect recent audit activity directly in the console without loading the full audit table.
- The panel separates audit-log failures from service-health loading, so operational data is not hidden by one failed query.
- Loaded/total context and explicit Load more behavior make audit history scope visible.

How user effort was reduced:

- Admins no longer need a database console to inspect the latest audit events.
- The page starts with recent activity and only fetches older rows when the admin asks for them.

How user control was preserved:

- Audit-log pagination is read-only.
- It does not change user roles, service health, settings, applications, messages, courses, notifications, or audit records.
- Loading more audit events is an explicit admin action.

Follow-up:

- Add detail views and filters for actor, entity, and action.

### 8.29 Candidates Query-Level Search

Changed:

- Added normalized `search` support to `recruiterService.getApplicationsPage` and preserved the `getAllApplications` compatibility path.
- Candidate search now resolves matching profile IDs by full name/email, matches recruiter-owned job titles, and applies `user_id`/`job_id` filters before range pagination.
- Updated the Candidates page to send search text with bounded `limit`/`offset` requests instead of loading the full recruiter application list.
- Kept candidate result range, page-size, previous-page, and next-page controls visible while searching.
- Expanded defensive display filtering to include candidate email along with candidate name and job title.
- Added unit coverage for search filters being applied before application pagination.

Why it improves UX:

- Recruiters can search large candidate pools without forcing the browser to fetch every application first.
- Search results keep the same explicit page controls and result-range feedback as default browsing.
- Existing Details, notes, profile opening, and Offer/Reject confirmation behavior remain unchanged.

How user effort was reduced:

- Recruiters can search by candidate name, candidate email, or job title from the first bounded result page.
- Page size and next/previous controls continue to work during search, so users do not need to clear search to inspect more matches.

How user control was preserved:

- Search only changes read queries and visible candidate rows.
- It does not save notes, update candidate status, send offers, reject candidates, message applicants, or mutate application records automatically.
- Offer and Reject still require explicit confirmation.

Follow-up:

- Add an indexed service-owned candidate search endpoint for very large tenant datasets.
- Add provider-backed interview scheduling, backend-owned scoring, and large-tenant shortlist suggestions.

### 8.30 LMS Enrollment-Aware Progress Filters

Changed:

- Added `userId` and `progress` to `CourseQueryParams` for `in-progress` and `completed` course filtering.
- LMS course queries now resolve the user's enrollments before filtering progress tabs, then apply bounded course pagination to the matching course set.
- Supabase fallback applies enrollment-matched course IDs before course `range` pagination so progress tabs are not limited to the currently loaded catalog page.
- Gateway compatibility sends future-friendly `userId`/`progress` params and filters legacy full-array course responses before local slicing.
- LMS page now requests progress-filtered pages from the active tab and shows result ranges/totals for in-progress and completed tabs.
- Added unit coverage for enrollment progress filtering before gateway compatibility pagination.

Why it improves UX:

- Learners can open In Progress or Completed and see the correct matching course set instead of only matches from the currently loaded All Courses page.
- Search, page size, previous/next, and progress tabs now work together with consistent result-range feedback.
- Continue Learning, course opening, enrollment, lesson selection, and lesson completion flows remain unchanged.

How user effort was reduced:

- Learners do not have to page through the full catalog to find courses they already started or completed.
- Completing a lesson refreshes the active filtered page so courses move naturally between progress states.

How user control was preserved:

- Progress filtering only changes read queries and visible course rows.
- It does not enroll users, complete lessons, alter progress, accept recommendations, or mutate course records automatically.
- Enrollment and lesson completion remain explicit user actions.

Follow-up:

- Add formal Spring LMS course search/progress pagination support if the API Gateway becomes the authoritative LMS catalog source.
- Add true cursor tokens for stable LMS paging across concurrent course publishes and enrollment progress updates.

### 8.31 Admin Audit Log Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `adminService.getAuditLogsPage`.
- Cursor pages order by `created_at` and `id`, apply an older-than cursor filter, and fetch `limit + 1` rows to determine whether another page exists.
- Preserved `offset` pagination and `getAuditLogs(limit)` compatibility for existing callers.
- Updated Admin Dashboard Load more to use `nextCursor` instead of shifting offsets.
- Kept the first page's total count context while cursor-loaded older pages append unseen rows.
- Added unit coverage for cursor lookahead pagination.

Why it improves UX:

- Admins can keep loading older audit events more reliably while new audit rows are being written.
- The audit panel still starts with a bounded recent page and keeps explicit Load more behavior.
- Existing audit retry, service health visibility, and read-only operational behavior remain unchanged.

How user effort was reduced:

- Admins no longer risk skipped or duplicated rows caused by offset movement during concurrent audit writes.
- The cursor token is handled internally, so the user still has a single Load more action.

How user control was preserved:

- Cursor pagination is read-only and only changes how older audit rows are fetched.
- It does not mutate users, roles, settings, services, applications, messages, courses, notifications, or audit records.
- Loading older audit events remains an explicit admin action.

Follow-up:

- Add actor/entity/action filters and detail views for audit investigations.
- Add cursor contracts to messaging conversation lists, LMS course lists, and backend-owned APIs.

### 8.32 Header Notification Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `notificationService.getNotificationsPage`.
- Supabase notification cursor pages order by `created_at` and `id`, filter older rows, and use `limit + 1` lookahead.
- API fallback receives future-friendly `cursor` params and local fallback pagination can also advance by cursor.
- Cursor-based local fallback keeps totals unknown, preserving previously loaded server totals instead of replacing them with a partial browser-cache count.
- Preserved `offset` pagination and `notificationService.getNotifications(userId, limit)` compatibility for existing callers.
- Updated Header Load more to use `nextCursor` instead of loaded-count offsets.
- Added unit coverage for notification cursor lookahead pagination and cursor fallback totals.

Why it improves UX:

- Users can load older notifications more reliably while new notifications are being inserted.
- The popover still starts with a bounded latest page, loaded/total context, and explicit Load more behavior.
- Existing mark-read, mark-all-read, and notification navigation controls remain unchanged.

How user effort was reduced:

- Users avoid offset drift that can skip or duplicate notifications during active notification delivery.
- Cursor handling is internal, so the interface remains a single Load more action.

How user control was preserved:

- Cursor pagination only changes read queries and visible notification rows.
- It does not mark notifications read, navigate, trigger jobs, send messages, contact anyone, or change notification preferences automatically.
- Mark read, Mark all read, and notification navigation remain explicit user actions.

Follow-up:

- Add service-owned notification cursor contracts and digest delivery APIs.
- Add cursor contracts to messaging, LMS course lists, and backend-owned APIs.

### 8.33 Jobs Explore Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `jobService.getJobsPage`.
- Supabase Jobs cursor pages order by `posted_at` and `id`, filter older rows, and use `limit + 1` lookahead.
- API fallback receives cursor-compatible params while preserving offset compatibility for existing backends.
- Jobs Explore stores per-page cursors, uses them for next-page queries, and preserves the known total count when cursor pages return `total: null`.
- Preserved the existing previous/next controls, page-size selector, saved searches, application drafts, and `jobService.getJobs(params)` array API.
- Added unit coverage for Jobs cursor lookahead pagination.

Why it improves UX:

- Users can continue browsing older matching jobs with less risk of offset drift when new jobs are published.
- The page still shows familiar range and page controls rather than changing to an uncontrolled infinite scroll pattern.
- Exact total context remains visible after the first counted page when available.

How user effort was reduced:

- Users do not need to refresh or re-run filters to recover from skipped or duplicated result pages caused by concurrent job publishes.
- Cursor handling is internal; users still choose page size and previous/next navigation explicitly.

How user control was preserved:

- Cursor pagination only changes read queries and visible job cards.
- It does not save searches, submit applications, alter drafts, contact recruiters, post jobs, or change job records automatically.
- Apply, save-search, alert, draft, and post-job actions remain explicit user actions.

Follow-up:

- Add service-owned cursor and total-count contracts to the Spring/Gateway Jobs API.
- Add cursor contracts to messaging, LMS course lists, and backend-owned APIs.

### 8.34 Candidate Pipeline Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `recruiterService.getApplicationsPage`.
- Supabase candidate cursor pages order by `created_at` and `id`, filter older rows, and use `limit + 1` lookahead.
- Candidate search can advance by cursor while preserving the existing profile/job-title search filters.
- Candidates page stores per-page cursors and preserves the known total count when cursor pages return `total: null`.
- Preserved existing previous/next controls, page-size selection, in-page details, recruiter notes, profile opening, and confirmed Offer/Reject actions.
- Added unit coverage for candidate cursor lookahead pagination and search-plus-cursor filtering.

Why it improves UX:

- Recruiters can continue reviewing older matching applications with less risk of skipped or duplicated rows when new applications arrive.
- The candidate review workflow keeps familiar page controls and visible result-range context.
- Search, notes, details, and status confirmation remain in the same places.

How user effort was reduced:

- Recruiters do not need to refresh or re-run a candidate search to recover from offset drift.
- Cursor handling is internal, so navigation remains a clear previous/next action.

How user control was preserved:

- Cursor pagination only changes read queries and visible candidate rows.
- It does not save notes, update statuses, send offers, reject candidates, open profiles, message candidates, or mutate applications automatically.
- Offer and Reject still require explicit confirmation.

Follow-up:

- Add a service-owned indexed candidate search endpoint for very large tenant datasets.
- Add interview scheduling, advisory ranking, and bulk review with explicit confirmation.

### 8.35 Messaging Active-Thread Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `messagingService.getMessagesPage`.
- Supabase message cursor pages order by `created_at` and `id`, filter older rows, and use `limit + 1` lookahead.
- The messaging slice stores `messageNextCursor`, uses it for Load older messages, and preserves the known total when cursor pages return `total: null`.
- Messaging page sends the cursor for older-history requests while preserving realtime inserts, optimistic sends, failed-send retry, and the explicit Load older messages action.
- Added unit coverage for active-thread cursor lookahead pagination.

Why it improves UX:

- Users can load older chat history without offset drift when new realtime messages arrive during the session.
- The latest-message-first workflow and loaded/total context remain unchanged.
- Retry, optimistic send, and delivery-label behavior remain in place.

How user effort was reduced:

- Users do not need to reload the conversation to recover from skipped older messages after new inserts.
- Cursor handling is internal, so the workflow remains a single explicit Load older messages action.

How user control was preserved:

- Cursor pagination only changes read queries and visible message history.
- It does not send messages, mark messages read, notify participants, create conversations, hide messages, or modify conversations automatically.
- Sending, retrying failed sends, and loading older history remain explicit user actions.

Follow-up:

- Add service-owned cursor contracts for backend-owned chat APIs and formal LMS gateway-owned course paging.

### 8.36 LMS Course Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `lmsService.getCoursesPage`.
- Supabase course cursor pages order by `created_at` and `id`, filter older rows, and use `limit + 1` lookahead.
- The LMS slice stores `courseNextCursor`, and the LMS page stores page cursor checkpoints while preserving page-size, previous-page, and next-page controls.
- First pages keep exact totals when available; cursor pages preserve the last known total in the visible range label.
- Added unit coverage for LMS course cursor lookahead pagination.

Why it improves UX:

- Learners can keep browsing matching catalog or progress-filtered courses without offset drift when new courses are published.
- The page-number workflow, visible result range, search, tabs, and page-size controls remain unchanged.

How user effort was reduced:

- Users do not need to refresh or restart catalog browsing to recover from skipped or duplicated rows after catalog changes.
- Cursor handling is internal, so browsing still uses the existing explicit next-page action.

How user control was preserved:

- Cursor pagination only changes read queries and visible course cards.
- It does not enroll users, complete lessons, change progress, open courses, or mutate course records automatically.
- Enrollment and lesson completion remain explicit user actions.

Follow-up:

- Add a formal Spring LMS cursor/search/progress contract so the gateway-owned path has the same stable pagination semantics as Supabase fallback.
- Add profile-based learning paths, certificates, and richer lesson media.

### 8.37 Messaging Conversation-List Cursor Pagination

Changed:

- Added opaque `nextCursor` tokens to `messagingService.getConversationsPage`.
- Conversation cursor pages order by embedded `conversations.updated_at` and `conversations.id`, filter older conversation rows, and use `limit + 1` lookahead.
- The messaging slice stores `conversationNextCursor` and preserves known conversation totals when cursor pages return `total: null`.
- The Messaging page sends the stored cursor through the existing Load more conversations action while preserving mobile conversation picker/back flow.
- Added unit coverage for conversation-list cursor lookahead pagination.

Why it improves UX:

- Users can load older conversation threads without offset drift when active chats update during the session.
- The existing loaded/total context, search behavior, and explicit Load more conversations button remain unchanged.

How user effort was reduced:

- Users do not need to refresh Messaging to recover from skipped or duplicated older threads after new message activity changes conversation ordering.
- Cursor handling is internal, so the workflow remains one explicit older-thread loading action.

How user control was preserved:

- Cursor pagination only changes read queries and visible conversation rows.
- It does not send messages, mark messages read, notify participants, create conversations, hide conversations, or modify conversation records automatically.
- Selecting conversations, sending messages, retrying failed sends, and loading older threads remain explicit user actions.

Follow-up:

- Add formal backend-owned chat cursor contracts, read receipts, unread counts, attachment handling, and richer participant context.

### 8.38 Messaging Read Receipts And Unread Accuracy

Changed:

- Added `messagingService.markConversationMessagesAsRead` to mark incoming unread messages in the active conversation as read.
- Added a messaging thunk that updates visible incoming messages and the conversation preview after the explicit read action succeeds.
- Added a visible chat-header unread control that appears only when the active thread has incoming unread messages.
- Corrected dashboard unread-message counts to exclude messages sent by the current user.
- Added Supabase RLS policy support for participants marking incoming messages read.
- Added unit coverage for conversation-level read marking and dashboard unread counting.

Why it improves UX:

- Users can clear unread state from the thread they are actively reviewing without affecting unrelated conversations.
- Dashboard message counts now reflect messages needing the user's attention rather than including their own sent messages.

How user effort was reduced:

- Users no longer need to infer whether a dashboard message badge is caused by their own sent messages.
- The read action handles all visible incoming unread messages at once.

How user control was preserved:

- Messages are not marked read automatically when a conversation opens.
- Read marking requires an explicit user action and only affects incoming messages in the active conversation.
- The action does not send messages, create conversations, notify participants, hide messages, or modify outgoing messages.

Follow-up:

- Add backend-owned unread counters, attachments, and richer participant context.

### 8.39 Messaging Conversation Unread Badges

Changed:

- Added `unreadCount` to conversation records returned by the messaging service.
- Added a bounded unread-count query for visible conversation IDs, excluding messages sent by the current user.
- Rendered accessible unread badges in the conversation list and capped large counts at `99+`.
- Cleared the active conversation badge after the explicit visible-message read action succeeds.
- Added unit coverage for unread-count query shape and per-conversation count mapping.

Why it improves UX:

- Users can identify which conversations need attention without opening each thread.
- The conversation list now matches the dashboard unread model by focusing on incoming unread messages.

How user effort was reduced:

- Users can prioritize threads from the list instead of scanning every conversation manually.
- Clearing unread state remains a single explicit action after the user reviews visible incoming messages.

How user control was preserved:

- Badges are informational and do not mark anything read by themselves.
- The service only counts visible-page conversations and does not send messages, create conversations, hide content, notify participants, or mutate conversation records.

Follow-up:

- Add backend-owned unread counters, attachments, richer participant context, and production chat API cursor/read contracts.

### 8.40 Messaging Realtime Conversation-Row Freshness

Changed:

- Passed the current user ID into active conversation realtime message events.
- Updated `messageReceived` state handling to refresh the active conversation preview and activity timestamp from realtime inserts.
- Incremented the active conversation unread badge only for new incoming unread messages.
- Preserved current-user realtime echoes as preview updates without unread-count increases.
- Added duplicate protection so repeated realtime events do not increase unread counts.
- Added slice-level unit coverage for realtime preview, unread badge, duplicate, and current-user send behavior.

Why it improves UX:

- The conversation list stays aligned with the active thread while messages arrive.
- Users can trust the row preview and badge without refreshing the page or reopening the conversation.

How user effort was reduced:

- Users no longer need to manually refresh or infer list state from the open message log.
- Duplicate realtime events do not create extra unread-count cleanup work.

How user control was preserved:

- Realtime row updates only reflect observed message inserts.
- They do not mark messages read, send messages, notify participants, create conversations, hide content, or mutate unrelated conversations.

Follow-up:

- Add backend-owned unread counters, attachments, richer participant context, and production chat API cursor/read contracts.

### 8.41 Messaging Visible Conversation-List Realtime Freshness

Changed:

- Replaced the active-thread-only Realtime subscription with one bounded channel for loaded conversation IDs.
- Registered per-conversation Realtime insert filters for visible conversations instead of subscribing to all message rows.
- Updated `messageReceived` handling to refresh non-active visible conversation previews and activity timestamps.
- Incremented non-active visible conversation unread badges only for new incoming unread messages.
- Preserved active-thread isolation by not appending non-active conversation messages to the active message log.
- Added unit coverage for non-active visible row updates, unread increments, and duplicate protection.

Why it improves UX:

- Conversation rows stay current as new messages arrive, even when the user is reading a different thread.
- Users can triage visible conversations from the list without refreshing or opening every row.

How user effort was reduced:

- New messages in visible conversations update their previews and badges automatically.
- Duplicate realtime events do not create inflated unread counts that users would need to reconcile.

How user control was preserved:

- The subscription is bounded to already-loaded conversation IDs.
- Realtime list updates only reflect observed inserts and do not mark messages read, send messages, notify participants, create conversations, hide content, or mutate unrelated conversations.

Follow-up:

- Add backend-owned unread counters, attachments, richer participant context, and production chat API cursor/read contracts.

### 8.42 Messaging Participant Profile Enrichment

Changed:

- Added a bounded profile lookup for participant IDs present on the visible conversation page.
- Enriched direct conversation rows with the other participant's profile name and avatar.
- Added deterministic group labels based on visible non-current participants and a first-avatar fallback.
- Preserved existing participant ID arrays for compatibility and search/routing behavior.
- Added unit coverage for profile query shape, direct participant mapping, and group labels.

Why it improves UX:

- Users see recognizable conversation names instead of generic fallback labels.
- Conversation search and list scanning become more useful because rows carry real participant display names.

How user effort was reduced:

- Users no longer need to open a thread just to infer who the conversation is with.
- Group rows provide a stable participant-count label when a full group model is not available yet.

How user control was preserved:

- Profile enrichment is read-only and bounded to visible participant IDs.
- It does not send messages, mark messages read, create conversations, update profiles, notify participants, or change conversation membership.

Follow-up:

- Add live presence, richer group member previews, backend-owned unread counters, attachments, and production chat API cursor/read contracts.

### 8.43 Messaging Explicit Link Attachments

Changed:

- Added attachment helper utilities for URL validation, type inference, labels, image detection, and generated fallback captions.
- Added an explicit attachment-link composer control with removable draft state and validation feedback.
- Allowed users to send reviewed public `http` or `https` attachment links with optional captions.
- Rendered attachment previews in message bubbles, including inline image previews and external-link affordances.
- Preserved attachment metadata through optimistic sending and failed-send retry.
- Added unit coverage for attachment URL normalization, message-type inference, labels, image detection, and generated-caption hiding.

Why it improves UX:

- Users can share files or images by reviewed link without leaving the conversation.
- Attachment messages are scannable in the thread rather than appearing as unexplained plain text.

How user effort was reduced:

- Users no longer need to switch to a separate channel for simple file or image links.
- The composer infers attachment type and fallback captions automatically after the user supplies a valid link.

How user control was preserved:

- Attachments require an explicit user-provided URL and can be removed before sending.
- Invalid URLs block submission with visible feedback.
- The workflow does not upload local files, send automatically, mark messages read, create conversations, update profiles, or notify anyone beyond the normal explicit message send.

Follow-up:

- Add provider-backed file upload/storage, virus/type scanning, backend-owned unread counters, live presence, richer group context, and production chat API cursor/read contracts.

### 8.44 Networking Notification-Backed Follow-Up Reminders

Changed:

- Added notification-service builders, upsert logic, and clear logic for networking follow-up reminders.
- Synced explicit Remind Me actions for sent connection requests into account notifications when Supabase is available.
- Preserved the existing browser-local reminder state as a resilience fallback.
- Marked reminder notifications read when the user clears the reminder or withdraws the sent request.
- Added unit coverage for Supabase insert, local fallback, and clear/read behavior.

Why it improves UX:

- Sent-request follow-ups now appear in the same notification surface as other account reminders.
- Users keep a visible fallback reminder if notification sync is unavailable.

How user effort was reduced:

- Users no longer need to remember pending networking follow-ups outside the product or manually revisit every sent request.
- The notification row links back to Networking, keeping the recovery path short.

How user control was preserved:

- Reminders are created only after the user presses Remind Me.
- Clearing the reminder or withdrawing the request explicitly removes the active reminder signal.
- The workflow does not send messages, accept/decline connections, change connection status except for explicit withdrawal, contact recipients, or schedule hidden follow-ups.

Follow-up:

- Add reminder frequency controls and backend-owned scheduling/digest delivery for reminders that should fire only when due.

### 8.45 Networking Selectable Reminder Timing

Changed:

- Added explicit timing choices for sent-request reminders: Tomorrow, In 3 days, and In 1 week.
- Migrated browser reminder storage from a simple ID list to keyed reminder records while preserving existing array-shaped local reminder data.
- Stored the selected due timestamp in both local reminder state and account-notification metadata when sync is available.
- Displayed the due date on sent request cards after the user sets a reminder.
- Added notification-service unit coverage for reminder timing metadata.

Why it improves UX:

- Users can choose when a follow-up should matter instead of treating every reminder as immediate.
- The Sent tab now shows the due date in context, reducing uncertainty about what the reminder means.

How user effort was reduced:

- Users no longer need to remember or manually record the follow-up date for pending requests.
- The default "In 3 days" option gives a smart starting point while still allowing quick adjustment.

How user control was preserved:

- Timing is selected before the explicit Remind Me action.
- Users can clear the reminder from the same card.
- The workflow records visible reminder metadata only; it does not send messages, contact recipients, accept/decline connections, change connection status, or hide scheduled actions from the user.

Follow-up:

- Add reminder frequency controls and a backend scheduler that respects quiet-hour/digest preferences while surfacing reminders only when due.

### 8.46 Due-Aware Header Reminder Notifications

Changed:

- Added notification helper functions to derive reminder due dates, classify reminders as scheduled or due, and decide whether unread notifications should count as urgent.
- Updated the Header notification bell so future scheduled networking reminders stay visible but do not trigger the urgent unread indicator.
- Added a Scheduled label and due-date copy to future reminder rows.
- Kept due reminders in the urgent unread indicator once their selected due timestamp arrives.
- Added a lightweight minute refresh so scheduled reminder urgency updates while the app remains open.
- Added unit coverage for future scheduled reminders and due reminders.

Why it improves UX:

- Users can verify scheduled follow-ups without the notification bell implying immediate action is required.
- Due reminders still become prominent when the selected follow-up time arrives.

How user effort was reduced:

- Users do not need to mentally separate future reminders from urgent notifications.
- The notification center communicates both status and due date in the same row.

How user control was preserved:

- Future reminders remain visible instead of being silently hidden.
- Opening a notification, marking it read, marking all read, and navigating remain explicit user actions.
- The Header does not send messages, contact recipients, change connection state, create reminders, or mutate reminder timing.

Follow-up:

- Move due filtering into a backend delivery/scheduler contract that respects digest and quiet-hour preferences.

### 8.47 Networking Inline Profile Preview

Changed:

- Added a reusable networking profile-preview helper for display names, initials, fit labels, mutual-connection labels, reasons, skills, and full-profile routes.
- Replaced Networking Profile/Open Profile card actions with an inline preview modal.
- Displayed recommendation context, shared skills, fit, location, headline, and summary before full-profile navigation.
- Kept Full Profile as an explicit secondary action.
- Added unit coverage for preview field generation and sparse-profile fallbacks.

Why it improves UX:

- Users can review enough context to decide whether to connect, accept, decline, withdraw, or follow up without leaving the Network page.
- Full profile navigation remains available for deeper review when needed.

How user effort was reduced:

- Basic profile review no longer requires opening a new tab or losing the current Networking tab state.
- Suggestion reasons and shared skills are consolidated into one scan-friendly preview.

How user control was preserved:

- The preview is read-only.
- Full profile navigation is still explicit.
- The preview does not send connection requests, accept/decline requests, create reminders, hide suggestions, send messages, or update profile data.

Follow-up:

- Add backend-owned recommendation APIs and richer profile media/details when the service owns recommendation generation.

### 8.48 Messaging Draft Reply Suggestions

Changed:

- Added a reusable messaging reply-suggestion helper for latest incoming messages.
- Added local scheduling, review, question, acknowledgement, and fallback reply-draft suggestions with deduping and a three-suggestion cap.
- Added a compact suggested-replies row above the message composer.
- Inserted selected suggestions into the composer as editable drafts.
- Hid suggestions once users type their own message or start an attachment draft.
- Added unit coverage for suggestion generation, stale-response prevention, and timestamp ordering.

Why it improves UX:

- Users can respond to common recruiting, networking, and coordination messages faster without losing the current conversation context.
- Suggested replies appear only when the latest visible message is incoming, so stale quick replies do not remain after the user already responded.

How user effort was reduced:

- Common acknowledgement, scheduling, review, and question-response wording can be inserted with one click.
- Users still edit in the normal composer instead of switching to a separate assistant flow.

How user control was preserved:

- Suggestions are local drafts only.
- The normal Send button remains required.
- Inserted text is editable before sending.
- Suggestions do not mark messages read, send messages, attach files, create conversations, update participants, or modify backend records.

Follow-up:

- Add backend-supported, context-aware reply drafts that can use candidate/job/application context while preserving the same draft-only approval model.

### 8.49 Candidate Interview Planning

Changed:

- Added a reusable candidate interview-planning helper for business-day slot suggestions and private-note drafts.
- Added an Interview action to candidate cards and candidate details for pre-interview statuses.
- Routed Interview status updates through the same confirmation modal used by Offer/Reject.
- Added an Interview Plan panel that inserts an editable private-note draft only when selected.
- Added unit coverage for plan generation, weekend skipping, and status eligibility.

Why it improves UX:

- Recruiters get a concrete next step between review and final decision without leaving the candidate pipeline.
- Interview planning context sits next to submitted materials and recruiter notes, reducing context switching.

How user effort was reduced:

- Suggested slots and prep checklist text can be inserted into notes with one click instead of being typed repeatedly.
- The Interview status action is available directly from candidate cards and the detail modal.

How user control was preserved:

- Interview plans are editable drafts only.
- Notes still require explicit Save Note.
- Status changes still require confirmation.
- The feature does not send candidate messages, schedule video sessions, create notifications, or change application status automatically.

Follow-up:

- Connect the confirmed Interview stage to provider-backed scheduling, candidate-facing notifications, and backend-owned scoring.

### 8.50 Recruiter Job-Post Templates

Changed:

- Added reusable job-post template helpers for recruiter-scoped local storage, draft naming, sanitization, draft application, and requirement normalization.
- Added a Job Templates control band to the full Post Job page.
- Let recruiters save the current form as a local template, apply a selected template into editable fields, or delete a selected template.
- Added explicit status copy that templates are local editable drafts and do not post jobs.
- Added unit coverage for helper behavior.
- Associated full Post Job labels with their inputs.

Why it improves UX:

- Recruiters can reuse common role structures and requirements instead of starting every posting from a blank form.
- Template actions live in the posting context, so recruiters do not need a separate setup workflow before drafting a job.

How user effort was reduced:

- Common job title, description, location, job type, salary, and requirements can be restored with one click.
- Requirements are normalized from pasted bullet lists before posting.

How user control was preserved:

- Templates only prefill editable form fields.
- Saving and deleting templates affects only browser-local draft records.
- The Save Draft action is still required before any job record is created.
- Templates do not publish jobs, contact candidates, create notifications, or change recruiter job records automatically.

Follow-up:

- Recruiter templates now have account sync with local fallback, inline company profile completion, backend-owned publish readiness, signup-time company setup handoff, and onboarding analytics; add multi-company defaults and an explicit publish activation stage.

### 8.51 Recruiter Job-Draft Review

Changed:

- Added reusable job-post review helpers for required-field checks, salary range labels, normalized requirement previews, and compact description summaries.
- Added unit coverage for review summaries, missing-field detection, partial salary formatting, and long-description previews.
- Changed the full Post Job page from a single submit flow into Edit -> Review Draft -> Save Draft.
- Added a review state that summarizes title, job type, location, salary, description, and requirements before the `DRAFT` job is created.
- Replaced ambiguous final posting copy with Save Draft and kept the payload status explicit.
- Added Back to Edit recovery and responsive one-column mobile layout for the paired form fields.

Why it improves UX:

- Recruiters get a fast, scannable checkpoint before saving a job draft.
- The page now matches the actual business rule: this action saves a draft, it does not publish a job.

How user effort was reduced:

- Templated or manually entered job details can be reviewed in a compact summary instead of by scanning the full form again.
- Requirement bullet cleanup is visible in the review summary before the recruiter commits the draft.

How user control was preserved:

- Review is local and non-mutating.
- Back to Edit keeps all fields editable before save.
- Save Draft remains the only action that creates the job record, and it still creates a `DRAFT` job.

Follow-up:

- Recruiter templates now have account sync with local fallback, inline company profile completion, backend-owned publish readiness, signup-time company setup handoff, and onboarding analytics; add multi-company defaults and an explicit publish activation stage.

### 8.52 Recruiter Duplicate-Post Warning

Changed:

- Extended the job-post review helper with active duplicate detection against existing recruiter jobs.
- Added unit coverage for duplicate matches and for ignoring closed or meaningfully different jobs.
- Loaded the recruiter's existing jobs in the full Post Job page and surfaced duplicate-check failures as visible status copy.
- Added an advisory warning to the draft review state when an active draft or published job already matches title, location, and job type.
- Changed the final action label to Save Draft Anyway when duplicates are detected.

Why it improves UX:

- Recruiters get immediate duplicate awareness at the decision point instead of needing to manually search existing jobs.
- The warning is contextual and only appears after the draft has enough information to compare.

How user effort was reduced:

- The system performs the repetitive cross-check against existing recruiter jobs.
- Matching active jobs are summarized in-place, so the recruiter can decide whether to edit or intentionally proceed.

How user control was preserved:

- Duplicate detection is advisory and non-mutating.
- Back to Edit remains available.
- Save Draft Anyway preserves intentional overrides and still creates only a `DRAFT` job.

Follow-up:

- Move duplicate detection to a backend-owned endpoint with company-aware matching, fuzzy title matching, and audit analytics.

### 8.53 Recruiter Company Context

Changed:

- Extended the job-post review helper with company context summaries for attached, detached, and unavailable company states.
- Added unit coverage for company context summary behavior.
- Loaded the recruiter's company profile on the full Post Job page and showed visible company context status.
- Added an Attach Company checkbox that defaults on when a company profile is available and gives recruiters an explicit opt-out.
- Added company context to the draft review summary and sent `companyId` to `jobService.postJob` only when attachment stays enabled.

Why it improves UX:

- Recruiters can see which company profile will be attached before saving a draft.
- Existing company data is reused instead of silently creating unattributed job drafts.

How user effort was reduced:

- The company ID is applied automatically when a recruiter-owned company profile is available.
- Recruiters do not need to manually re-enter or remember company identity for each draft.

How user control was preserved:

- Company attachment is visible in edit and review states.
- Recruiters can uncheck Attach Company before saving.
- No job record is created until Save Draft is selected.

Follow-up:

- Add multi-company selection and backend-owned company defaults.

### 8.54 Recruiter Posting Entry-Path Consolidation

Changed:

- Removed the Jobs page quick-post modal that created jobs without the full draft review safeguards.
- Changed the recruiter Jobs page "Post a Job" action to navigate to `/jobs/post`.
- Kept saved-search, application review, and Explore behavior unchanged.

Why it improves UX:

- Recruiters now have one clear posting path instead of two surfaces with different behavior.
- The header CTA lands in the feature-complete draft workflow with templates, company context, duplicate warnings, review, and explicit Save Draft.

How user effort was reduced:

- Recruiters no longer need to decide whether to use the quick modal or full page.
- Posting starts directly in the richer workflow where reusable templates and company defaults are available.

How user control was preserved:

- No job is created from the Jobs page header action.
- The full draft page still requires Review Draft and Save Draft before mutation.

Follow-up:

- Add publish activation and recruiter job management controls for existing saved drafts.

### 8.55 Recruiter Posting Visibility And Publish Checklist

Changed:

- Added a recruiter-only My Posts tab on Jobs for owned draft and published roles.
- Routed saved job drafts back to `/jobs?tab=postings`.
- Added publish-readiness helpers and tests for title, description, location, company context, and requirements.
- Added a Review Publish modal with checklist issues, posting summary, and explicit Publish Job action when blockers are clear.

Why it improves UX:

- Recruiters can see where saved drafts live instead of returning to a public job-search view.
- Draft and published states are visible in one posting workspace, so the draft-to-public transition is easier to understand.
- Checklist issues are shown before publishing, reducing accidental incomplete listings.

How user effort was reduced:

- The app takes recruiters directly to their posting workspace after Save Draft.
- Recruiters no longer need to manually search for their draft or infer whether it is public.
- Publish readiness is summarized in one modal instead of requiring a field-by-field reread.

How user control was preserved:

- Saving a draft still creates only a `DRAFT` job.
- Publishing requires an explicit modal action, and checklist issues are advisory rather than hidden automation.
- Publishing makes the job visible in Explore but does not contact candidates automatically.

Follow-up:

- Add persisted first-run company setup state.

### 8.56 Recruiter Owned-Draft Editing

Changed:

- Added an Edit Draft action to recruiter My Posts draft cards.
- Added `/jobs/post?draftId=...` loading for recruiter-owned `DRAFT` jobs.
- Prefilled the full post form from the selected draft, including salary, requirements, and company context when available.
- Excluded the edited draft from duplicate warnings.
- Updated Save Changes to call `jobService.updateJob` rather than creating another draft.
- Added explicit company attachment update support to `jobService.updateJob`.

Why it improves UX:

- Recruiters can correct saved drafts from the same posting workspace where they review and publish them.
- Editing uses the existing full review form, so the workflow stays familiar and avoids a second draft-editing surface.
- Duplicate warnings now focus on other active jobs instead of warning about the draft being edited.

How user effort was reduced:

- Recruiters no longer recreate a draft just to fix title, location, salary, requirements, or company context.
- My Posts now supports the natural draft lifecycle: create, edit, review publish, publish.

How user control was preserved:

- Only recruiter-owned `DRAFT` jobs load into edit mode.
- Save Changes updates the draft only after Review Changes.
- Publishing remains a separate explicit action from My Posts and no candidate is contacted automatically.

Follow-up:

- Add persisted first-run company setup state.

### 8.57 Recruiter Draft Edit Change Summary

Changed:

- Added a reusable job-draft change summary helper for title, description, location, job type, salary, requirements, and company attachment.
- Added unit coverage for meaningful changes and normalized no-op edits.
- Added a Changes to Save panel in the edit-draft review state.

Why it improves UX:

- Recruiters can verify exactly what will update before saving an existing draft.
- Normalization avoids noisy change rows for whitespace, bullet markers, or company-name enrichment when the company ID is unchanged.

How user effort was reduced:

- Recruiters no longer need to reread every field after a small edit.
- No-op edits are called out, making it clearer when Save Changes will not alter draft content.

How user control was preserved:

- The summary is informational and non-mutating.
- Save Changes remains explicit, publishing remains separate, and no candidate communication is triggered.

Follow-up:

- Add server-side draft history and audit metadata for draft updates.

### 8.58 Recruiter Inline Company Setup

Changed:

- Added an inline Create & Attach Company form to the full Post Job workflow when the recruiter has no company profile.
- Created a minimal recruiter-owned company through the existing company service with name, optional industry, location, and website.
- Prefilled company location from the role location when it is non-remote and the recruiter has not already typed a company location.
- Attached the created company to the current draft without saving or publishing the job.
- Added unit coverage for the company registration payload and returned company mapping.

Why it improves UX:

- Recruiters no longer hit a dead end when a draft needs company context but no profile exists yet.
- The setup stays in the same form where the missing context is discovered.

How user effort was reduced:

- Recruiters can create the minimum company context without leaving the job draft and returning later.
- The role location can fill the company location when that value is likely useful, while remaining editable.

How user control was preserved:

- Company creation requires an explicit Create & Attach Company action.
- Draft review and Save Draft or Save Changes remain separate required actions.
- The flow does not publish jobs, contact candidates, or make hidden company changes after creation.

Follow-up:

- Add multi-company defaults and backend-owned company setup validation.

### 8.59 Candidate Bulk Interview Review

Changed:

- Added reusable bulk Interview eligibility summarization for selected candidate applications.
- Added page-scoped candidate selection controls to the Candidates page.
- Added a Review Bulk Interview Move modal showing selected, eligible, and skipped applications before mutation.
- Updated eligible applications to Interview sequentially after explicit confirmation, preserving skipped candidates.
- Kept failed updates selected and visible for retry or manual review.

Why it improves UX:

- Recruiters can move multiple reviewed candidates to Interview from one controlled review step.
- Skipped candidates are visible before confirmation, reducing accidental final-state changes.

How user effort was reduced:

- Repetitive one-by-one Interview confirmations are consolidated into one preview and confirmation.
- Selection is cleared on page/search changes so recruiters do not need to manually audit hidden selections.

How user control was preserved:

- No status changes happen until Review Interview Move and Confirm are both selected.
- Only eligible selected applications move to Interview.
- The flow does not send candidate messages, schedule video sessions, create notifications, or apply Offer/Reject decisions.

Follow-up:

- Add provider-backed interview scheduling and backend-owned candidate scoring with explainable factors.

### 8.60 Notification Delivery Preference Controls

- Added a small notification preference helper that normalizes digest frequency and quiet-hour time values before display or summary generation.
- Extended `NotificationSettings` and the Supabase schema with `digest_frequency`, `quiet_hours_enabled`, `quiet_hours_start`, and `quiet_hours_end`.
- Merged existing notification rows with current defaults when Settings loads so older rows still get explicit delivery defaults in the UI.
- Added Settings controls for digest frequency, quiet-hours toggle, start/end time fields, and a live delivery summary.
- Added unit coverage for digest frequency normalization, quiet-hour validation, and summary text.

Why it improves UX:

- Users can choose lower-noise notification delivery without waiting for backend digest automation.
- Quiet hours are visible next to the related digest preference instead of hidden in backend defaults or future scheduler behavior.

How user effort was reduced:

- Users can set digest and quiet-hour behavior once instead of repeatedly triaging every lower-priority notification.
- Existing rows receive visible defaults, so users do not need to recreate settings to access the new controls.

How user control was preserved:

- Saving preferences does not mark notifications read, navigate, send messages, submit applications, or trigger a digest immediately.
- Backend digest delivery remains a separate follow-up, so no automated delivery side effect is implied by changing the controls.

Follow-up:

- Add backend digest generation/delivery jobs that respect `notification_settings.digest_frequency` and quiet-hour windows.

### 8.61 Reviewed Candidate Bulk Offer And Rejection

- Generalized candidate bulk status summaries from Interview-only to Interview, Offer, and Rejected targets.
- Added bulk Offer and Reject actions to the Candidates selected-row toolbar.
- Added a single target-aware review modal that shows selected, eligible, and skipped applications before any bulk mutation.
- Added safeguards so bulk Offer only applies to Interview candidates, while bulk Reject skips existing Offer and Rejected rows.
- Added skip reasons in the review modal and unit coverage for Offer/Reject eligibility rules.

Why it improves UX:

- Recruiters can process repeated final decisions from a selected list without opening every candidate row.
- The review modal keeps high-impact status changes visible before they are saved.

How user effort was reduced:

- Repetitive one-by-one Offer or Reject confirmations are consolidated into one selected-candidate preview and confirmation.
- Skipped-candidate reasons reduce manual auditing of why a row will not change.

How user control was preserved:

- No Offer or Reject status changes happen until candidates are selected, the review modal is opened, and the target-specific confirmation is selected.
- Bulk Offer does not bypass the Interview stage, and bulk Reject does not rescind existing offers.
- The flow does not send candidate messages, schedule interviews, create notifications, or contact candidates automatically.

Follow-up:

- Add provider-backed interview scheduling, backend-owned candidate scoring, and longitudinal scorecard analytics.

### 8.62 Private Candidate Scorecards

- Added candidate scorecard helpers for rating normalization, default rubric values, average score calculation, advisory labels, and note-draft generation.
- Added a Candidate Scorecard panel to candidate details with Role Fit, Technical Depth, Communication, and Execution ratings.
- Added local private scorecard save/load per recruiter and application.
- Added a Use in Notes action that inserts the advisory scorecard summary into editable private recruiter notes.
- Added unit coverage for scorecard rating normalization and advisory note generation.

Why it improves UX:

- Recruiters get a repeatable review structure before making Interview, Offer, or Reject decisions.
- The scorecard keeps evidence and ratings near the submitted materials and private notes.

How user effort was reduced:

- Recruiters no longer need to recreate the same evaluation rubric in freeform notes for every candidate.
- Saved scorecard indicators help recruiters resume review without reopening every detail section.

How user control was preserved:

- Scorecards are private local aids and remain advisory.
- The Use in Notes output is editable before Save Note.
- The scorecard does not change application status, send messages, schedule interviews, create notifications, or contact candidates automatically.

Follow-up:

- Add provider-backed interview scheduling, backend-owned advisory candidate scoring, and longitudinal scorecard analytics.

### 8.63 Server-Backed Candidate Scorecards

- Added `candidate_scorecards` schema coverage with recruiter/application uniqueness, indexes, updated-at metadata, and recruiter-scoped RLS policies.
- Added recruiter service load/save methods that normalize rubric ratings and upsert scorecards by application and recruiter.
- Updated Candidate Scorecard save to write local state first, attempt server sync when signed in, and expose synced/local state in the detail modal.
- Added service tests for scorecard loading and upsert persistence.

Why it improves UX:

- Recruiters can resume structured candidate evaluation across sessions and devices when server sync is available.
- Visible synced/local state tells recruiters whether the scorecard is account-backed or browser-local.

How user effort was reduced:

- Recruiters no longer need to recreate scorecards after switching devices or refreshing server-backed sessions.
- Local fallback keeps review work moving when the table or network is unavailable.

How user control was preserved:

- Saving remains an explicit recruiter action.
- Scorecards remain private recruiter aids and do not change status, send messages, schedule interviews, create notifications, or contact candidates automatically.

### 8.64 Candidate Advisory Signals

- Added candidate advisory signal helpers that combine saved scorecard averages, submitted-material availability, recruiter-note presence, and current status into a bounded review-priority score.
- Added current-page advisory sorting and high-signal counts to the Candidates page.
- Added advisory badges to candidate cards and a detail panel with factors, suggested review action, and safeguards.
- Added unit coverage for high-signal, missing-evidence, and final-state advisory behavior.

Why it improves UX:

- Recruiters can scan and prioritize a candidate page without opening every detail modal.
- The detail panel explains why a candidate was prioritized, so the signal stays auditable instead of opaque.

How user effort was reduced:

- Recruiters can sort the current page by review priority and focus first on candidates with stronger evidence.
- Missing scorecard or resume evidence is surfaced directly, reducing repeated manual checks.

How user control was preserved:

- Advisory sorting only changes display order.
- Signals never select candidates, update statuses, send messages, schedule interviews, create notifications, or contact candidates automatically.
- Interview, Offer, Reject, and bulk status changes still require explicit review and confirmation.

### 8.65 Current-Page Scorecard Analytics

- Added duplicate-safe scorecard analytics helpers for current-page coverage, average score, strong-signal count, evidence gaps, and synced/local split.
- Added a current-page Candidates analytics panel for scorecard coverage, average rubric, evidence gaps, and scorecard sync state.
- Fixed missing scorecard-average normalization so empty values remain unscored rather than becoming low scores.
- Added unit coverage for populated and empty analytics.

Why it improves UX:

- Recruiters can see review coverage before opening individual candidate details.
- Evidence gaps are visible at page level, so incomplete reviews are easier to finish.

How user effort was reduced:

- Recruiters no longer need to open each candidate detail modal just to know which applications still need scorecards.
- Synced/local counts expose whether review records are account-backed or browser-local.

How user control was preserved:

- Analytics are read-only and page-scoped.
- The panel never creates scorecards, selects candidates, changes statuses, sends messages, schedules interviews, creates notifications, or contacts candidates automatically.

### 8.66 Current-Page Review Focus Filters

- Added duplicate-safe candidate review focus helpers for all visible, needs-scorecard, and high-signal modes.
- Added a Candidates Focus control beside Sort and page-size controls.
- Applied focus after search and before advisory sorting so recruiters can narrow only the current loaded page.
- Kept the Focus control available when the selected focus returns no rows, giving recruiters an immediate recovery path.
- Added unit coverage for duplicate handling and non-mutating filter behavior.

Why it improves UX:

- Recruiters can quickly move from a broad page of applications to the rows that need review attention.
- Missing scorecards and high-signal candidates are reachable without scanning every visible card.

How user effort was reduced:

- Recruiters can focus on scorecard gaps or high-signal candidates in one control change.
- Focus works with existing search, advisory sorting, analytics, and page controls rather than requiring a separate workflow.

How user control was preserved:

- Review focus is display-only and page-scoped.
- Focus changes clear selected candidates and never create scorecards, select candidates, change statuses, send messages, schedule interviews, create notifications, or contact candidates automatically.

### 8.67 Analytics-Driven Candidate Review Actions

- Added reusable current-page review focus action helpers for Review gaps, Review high signal, and Show all.
- Added unit coverage for enabled actions, disabled scoped-focus transitions, and explicit recovery.
- Added Review gaps and Review high signal buttons to the Candidates analytics cards.
- Added Show all recovery in focused analytics and the empty focused state.
- Kept focus actions separate from candidate selection and status mutation.

Why it improves UX:

- Page-level analytics now lead directly to the matching review mode.
- Recruiters no longer need to translate a coverage or high-signal count into a separate Focus menu change.

How user effort was reduced:

- Review gaps and high-signal triage take one explicit action from the analytics cards.
- Empty focused states include an immediate Show all recovery action.

How user control was preserved:

- Analytics actions only change display focus.
- The actions never select candidates, create scorecards, change statuses, send messages, schedule interviews, create notifications, or contact candidates automatically.

### 8.68 First-Candidate Review Queue Entry

- Added a duplicate-safe candidate review queue action helper for the current visible/focused list.
- Added unit coverage for first-target selection, duplicate handling, and empty queue behavior.
- Added a Review first visible/in focus action to the Candidates review strip.
- The action opens the current first candidate details modal based on active search, focus, and sort state.

Why it improves UX:

- Recruiters can start reviewing the current queue without manually finding and clicking the first card.
- The action works after search, high-signal sorting, and focus filters, so it supports the existing prioritization workflow.

How user effort was reduced:

- Opening the top current candidate becomes one explicit action from the review strip.
- Recruiters can move from analytics or focus state directly into detailed review.

How user control was preserved:

- The queue action only opens the details modal.
- It never selects candidates, creates scorecards, saves notes, changes statuses, sends messages, schedules interviews, creates notifications, or contacts candidates automatically.

### 8.69 Candidate Details Queue Navigation

- Added duplicate-safe previous/next navigation helpers for the current visible/focused candidate queue.
- Added unit coverage for middle-of-queue, edge, duplicate, and missing-current behavior.
- Added a queue position strip to the Candidate Details modal.
- Added Previous and Next actions that move through the current filtered/sorted queue.

Why it improves UX:

- Recruiters can continue reviewing the current queue without closing the details modal.
- The navigation follows active search, focus, and sort order, so the modal stays aligned to the current review intent.

How user effort was reduced:

- Moving to the adjacent candidate takes one explicit click in the details modal.
- Recruiters avoid the repeated close, scan, and reopen cycle during candidate review.

How user control was preserved:

- Previous and Next only change which candidate is displayed in the modal.
- Navigation never selects candidates, creates scorecards, saves notes, changes statuses, sends messages, schedules interviews, creates notifications, or contacts candidates automatically.

### 8.70 Unsaved Private Review Guard

- Added candidate review draft-state helpers for notes, scorecard ratings, and scorecard evidence.
- Added unit coverage for clean, note-dirty, scorecard-dirty, and combined unsaved states.
- Added an unsaved review warning in Candidate Details with explicit Save Note, Save Scorecard, and Reset Changes actions.
- Blocked details close and previous/next queue navigation while private review edits are unsaved.

Why it improves UX:

- Recruiters are protected from accidentally losing private review work while moving through the candidate queue.
- The warning explains the issue and provides direct recovery actions in the same context.

How user effort was reduced:

- Users do not need to reconstruct lost notes or scorecard evidence after accidental navigation.
- Save and reset actions are surfaced exactly when unsaved review drafts exist.

How user control was preserved:

- The guard only blocks accidental close/navigation until the recruiter explicitly saves or resets.
- It never saves notes, creates scorecards, changes statuses, sends messages, schedules interviews, creates notifications, or contacts candidates automatically.

### 8.71 AI Suggestion Review Queue And Workflow Handoff

- Added reusable AI suggestion review queue helpers for workflow classification, duplicate-safe queue construction, draft-first ordering, and saved/dismissed summary counts.
- Added unit coverage for resume, career path, learning, jobs, profile, candidate, duplicate, empty, and fully reviewed queue behavior.
- Added an AI Review Queue to the AI Assistant page with draft/saved/dismissed counts, Save all, Dismiss all, per-suggestion Save/Dismiss, and explicit workflow handoff links.
- Updated AI review persistence to use the dedicated suggestion-status update path before falling back to suggestion upsert.

Why it improves UX:

- Users can review pending AI recommendations from one visible queue instead of scanning prior chat messages.
- Each recommendation is paired with a likely destination workflow, reducing ambiguity about where the user should act next.

How user effort was reduced:

- Save all and Dismiss all handle low-risk review bookkeeping in one action.
- Per-item workflow links reduce the path from recommendation to destination workflow.

How user control was preserved:

- The queue only records review state or navigates to another page.
- It never edits profiles, resumes, applications, learning records, candidate records, settings, messages, notifications, or billing state automatically.

### 8.72 Product Analytics Event Taxonomy And Ingestion

- Added a reusable product analytics taxonomy for task starts, completions, abandonment, failures, automation suggestions, workflow handoffs, generated prefill decisions, reviewed bulk actions, error recovery, and degraded states.
- Added frontend analytics ingestion with Supabase persistence to `product_analytics_events` and bounded browser-local fallback when storage is unavailable.
- Added schema support for append-only product analytics events, indexes by user/area/event/time, and RLS policies for user-owned inserts/selects.
- Wired AI Assistant recommendation generation, service failures, save/dismiss decisions, and workflow handoff opens into the analytics helper.
- Added unit coverage for taxonomy entries, normalized event construction, server persistence, local fallback, and local fallback bounds.

Why it improves UX:

- Teams can identify which automations users actually accept, dismiss, or hand off, reducing guesswork in future UX prioritization.
- Analytics failures do not block user workflows because ingestion falls back locally.

How user effort was reduced:

- The first tracked automation surface is the AI recommendation queue, making repeated review decisions measurable for future workflow simplification.
- Event taxonomy gives future teams one vocabulary for task, automation, error, and degraded-state tracking instead of adding one-off event names.

How user control was preserved:

- Analytics is append-only observation.
- It never changes profiles, resumes, applications, learning records, candidate records, settings, messages, notifications, billing state, or workflow outcomes automatically.

### 8.73 Validation

- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 19 test files, 144 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 0 unmatched frontend API client calls, 0 controller routes without gateway prefixes, and 0 legacy `/api/*` security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Stale `/api/v1/network/*` frontend references were removed.
- Native `window.confirm()` calls were removed from `ProfilePage`.
- Dashboard manual retry preserves displayed data while refreshing and exposes issue-level recovery controls.
- Dashboard onboarding checklists use product signals to suggest next actions without mutating profile, application, learning, challenge, job, candidate, or messaging records.
- Candidate Interview/Offer/Reject actions now require explicit confirmation before calling the status update service.
- Candidate interview plans insert editable private-note drafts only and do not send messages, schedule video sessions, or create notifications automatically.
- Recruiter job-post templates prefill editable local drafts only and do not create, publish, update, or notify about jobs automatically.
- Recruiter job-draft review is local and non-mutating until the recruiter explicitly selects Save Draft, which creates a `DRAFT` job only.
- Recruiter duplicate-post checks are advisory and can be explicitly overridden with Save Draft Anyway.
- Recruiter company context is attached only when the visible Attach Company option remains enabled.
- Recruiter posting CTAs route to the full reviewed draft workflow and do not create jobs directly.
- Recruiter publish activation requires explicit checklist review, keeps checklist warnings visible, and does not contact candidates automatically.
- Recruiter owned-draft edits require a valid loaded draft, update that draft after Review Changes, and keep publishing as a separate explicit action.
- Recruiter draft update reviews now show normalized field-level change summaries before Save Changes.
- Saved searches sync to `saved_job_searches` when available and retain browser-local fallback behavior when the table is unavailable.
- Messaging suggested replies are inserted as editable drafts only and never send or mark messages read automatically.
- Saved-search new-match notification delivery is opt-in, respects the Job Alerts and daily/weekly digest preferences when available, and does not submit applications or contact anyone automatically.
- Application drafts sync to `application_drafts` when available, restore only for the same user/job, and still require explicit Submit Application before any application is created.
- Networking recommendations now expose score/reason metadata, aggregate mutual-connection context, and reversible account-synced hide controls with local fallback while keeping connect actions explicit and user-triggered.
- AI sessions sync to `ai_sessions`, review records sync to `automation_suggestions` when available, the AI Review Queue provides explicit save/dismiss/workflow handoff controls, and product analytics events record suggestion generation/review/handoff behavior with local fallback and no automatic product mutations.
- Application status event timelines use persisted events when available and visibly fall back to inferred status for older data.
- Recruiter notes sync to `candidate_notes` when available and retain local fallback behavior when the table is unavailable.
- Jobs Explore pagination limits rendered matching cards, exposes page size and result range, and never performs job, saved-search, draft, or application mutations automatically.
- Architecture status documentation now has a current index and historical status notices so stale architecture claims are not treated as implementation evidence.
- Jobs Explore pagination now requests bounded pages with total metadata where available and cursor-backed next-page loading while preserving explicit user-driven page navigation.
- Candidate pipeline pagination now requests cursor-backed application pages and preserves explicit Offer/Reject confirmations.
- Candidate bulk Offer and Reject actions now require selected-row review, skip ineligible candidates with visible reasons, and do not send candidate communications automatically.
- Candidate scorecards sync to `candidate_scorecards` when available, retain local fallback behavior when the table is unavailable, and can insert editable note drafts without changing candidate status or sending communications.
- Candidate advisory signals rank current-page review priority with visible factors and safeguards without selecting candidates, changing statuses, or sending communications.
- Candidate scorecard analytics summarize current-page review coverage and sync state without creating scorecards, selecting candidates, changing statuses, or sending communications.
- Candidate review focus filters limit visible current-page candidates by missing scorecards or high advisory signal without selecting candidates, mutating statuses, or sending communications.
- Candidate analytics focus actions turn visible scorecard and high-signal summaries into explicit display-focus changes without selecting candidates, mutating statuses, or sending communications.
- Candidate review queue actions open the first current visible/focused candidate details modal without selecting candidates, mutating statuses, or sending communications.
- Candidate details previous/next navigation moves through the current queue without selecting candidates, mutating statuses, or sending communications.
- Candidate unsaved review guards block accidental details close/navigation until private note or scorecard edits are explicitly saved or reset.
- Settings notification delivery controls now save digest frequency and quiet-hour preferences without marking notifications read or triggering digest delivery immediately.
- Messaging active-thread history now requests cursor-backed message pages, exposes user-triggered older-history loading, and preserves explicit send/retry behavior.
- Messaging conversation lists now request cursor-backed conversation pages with one latest-message preview, expose user-triggered older-thread loading, and preserve explicit message send/retry behavior.
- Messaging now exposes an explicit Mark visible read action for incoming unread messages and dashboard unread counts exclude the current user's sent messages.
- Messaging conversation lists now show visible-page unread badges for incoming unread messages and clear the active badge only after explicit read marking succeeds.
- Messaging active conversation rows now refresh preview/activity state from realtime inserts and increment unread badges only for new incoming unread messages.
- Messaging visible conversation rows now refresh preview/activity state from bounded realtime inserts and increment unread badges only for new incoming unread messages.
- Messaging conversation rows now enrich visible direct chats with participant profile names and avatars while preserving read-only behavior.
- Messaging now supports explicit reviewed link attachments with URL validation, previews, optimistic send state, and retry preservation.
- Networking sent-request reminders now sync to account notifications when available, keep a browser-local fallback, and remain fully user-triggered.
- Networking sent-request reminders now preserve explicit user-selected timing in local state and notification metadata.
- Networking profile actions now open a read-only inline preview with explicit Full Profile handoff.
- Header notifications now keep future scheduled networking reminders visible while excluding them from urgent unread indicators until due.
- Header notifications now request cursor-backed older notification pages, expose user-triggered older-notification loading, and preserve explicit read/navigation behavior.
- LMS course catalog now requests cursor-backed course pages, exposes page-size and previous/next controls, and preserves explicit enroll/progress behavior.
- LMS course search now sends query-level search parameters and preserves explicit enroll/progress behavior.
- LMS progress tabs now send enrollment-aware query parameters and preserve explicit enroll/progress behavior.
- Admin audit logs now request cursor-backed older audit pages, expose user-triggered older-event loading, and preserve read-only operational behavior.
- Candidate search now applies query-level profile/job filters before pagination and preserves explicit Offer/Reject confirmations.
- `mvn -pl services/application-service test` could not run in this environment because `mvn` is not installed and the repo has no Maven wrapper.

### 8.74 Backend-Owned Networking Suggestions Endpoint

- Added a networking-service endpoint at `/api/v1/networking/suggestions/{userId}` with a bounded `limit` parameter.
- Added a backend graph query over accepted connections that suggests friends-of-friends, counts distinct mutual connections, excludes the current user, and excludes users with any existing relationship in either direction.
- Added a response DTO with `suggestedUserId`, `mutualConnections`, `recommendationScore`, `recommendationReasons`, and `source`.
- Updated frontend networking suggestions to call the backend endpoint first, hydrate returned IDs into existing profile cards, and fall back to the previous Supabase profile-aware ranking when the API is empty or unavailable.
- Added tests for backend scoring/limit/fallback/controller shape and frontend API hydration/fallback behavior.

Why it improves UX:

- Users see warmer, graph-ranked Discover recommendations without manually searching through second-degree contacts.
- The existing profile preview, optional note, hide/restore, and explicit Connect controls remain in place.

How user effort was reduced:

- Candidate ranking moves to a backend endpoint that can evolve independently of the page.
- Frontend fallback keeps Discover usable during API rollout or outages.

How user control was preserved:

- The endpoint only recommends people.
- It never sends connection requests, writes request notes, hides suggestions, creates reminders, marks notifications read, or opens profiles automatically.

### 8.75 Automation Suggestion Audit Events

- Added `automation_suggestion_audit_events` to Supabase with user-owned RLS, indexes by user/suggestion/time, explicit event types, previous/next review status fields, metadata, and timestamps.
- Added a matching AI-service Flyway migration.
- Added a frontend `automationSuggestionAudit` helper with Supabase persistence and bounded browser-local fallback when audit storage is unavailable.
- Wired AI Assistant Save, Dismiss, Save all, and Dismiss all actions to record append-only audit events with session, source, bulk-review, previous-status, and next-status metadata.
- Added unit coverage for event normalization, server persistence, local fallback, and local fallback bounds.

Why it improves UX:

- Review decisions become traceable for support and future workflow-specific apply-diff screens.
- Audit write failures do not block recommendation review because local fallback is bounded and non-blocking.

How user effort was reduced:

- Users and operators no longer have to reconstruct why an AI recommendation changed state from local chat history alone.
- Future automation can use explicit review history to avoid repeatedly surfacing dismissed recommendation patterns.

How user control was preserved:

- Audit records are append-only observations of explicit Save/Dismiss actions.
- They never change profiles, resumes, applications, learning records, candidate records, settings, messages, notifications, networking state, billing state, or workflow outcomes automatically.

### 8.76 Admin Service Health And Log Investigation Links

- Added a typed service observability model for health, provider status, metrics, and logs.
- Added known health/status routes for API Gateway, Supabase dependencies, and major backend services.
- Enriched service health rows with service IDs, log queries, and investigation links while keeping live/fallback source labels.
- Updated the Admin Service Health table with read-only Actions links and visible log queries when a logs provider URL is not configured.
- Added unit coverage for backend health-link generation and Supabase provider status-link generation.

Why it improves UX:

- Admins can move from a degraded service row to health/status investigation without manually searching service names or route files.
- Missing logs-provider configuration is explicit through visible log queries instead of hidden behind a broken link.

How user effort was reduced:

- Known service routes and log queries are prefilled from the service name.
- Operators can start health/log investigation from the table row they are already reviewing.

How user control was preserved:

- The Admin console only opens read-only links or displays queries.
- It never restarts services, changes settings, edits users, acknowledges incidents, or mutates audit records automatically.

### 8.77 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/networkingService.test.ts` passed: 1 test file, 2 tests.
- `npm run test:unit --workspace talentsphere-web -- src/lib/automationSuggestionAudit.test.ts` passed: 1 test file, 4 tests.
- `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts` passed: 1 test file, 5 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 21 test files, 152 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 38 direct Supabase tables, 0 unmatched frontend API client calls, and 0 legacy `/api/*` security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.

### 8.78 Saved-Search Digest Preference Respect For Immediate Alerts

- Added a reusable lower-priority notification delivery helper that turns digest frequency plus channel state into deliver-now, defer-to-digest, or suppressed behavior.
- Updated Jobs saved-search alert checks to load `digest_frequency` from notification settings alongside the existing Job Alerts channel flag.
- Preserved immediate in-app saved-search alert creation for immediate/no-digest delivery preferences.
- Deferred immediate alert creation when digest frequency is daily or weekly, updated the saved-search reviewed match baseline, and synced that baseline through the existing saved-search persistence path.
- Added visible immediate-alert paused toast and save-search modal copy so users know matches are still tracked even when immediate alerts are paused by digest preferences.

Why it improves UX:

- Users who choose daily or weekly digests get lower-interruption behavior that matches their Settings choice.
- Saved-search match tracking remains transparent instead of silently suppressing alerts.

How user effort was reduced:

- Users do not have to manually dismiss immediate lower-priority saved-search alerts after choosing digest delivery.
- Updating the reviewed baseline prevents the same deferred match increase from resurfacing repeatedly.

How user control was preserved:

- Users still explicitly enable tracking per saved search, can disable Job Alerts globally, and can change digest frequency in Settings.
- This change does not send a digest, apply filters, submit applications, contact recruiters, mark notifications read, or mutate unrelated records automatically.
- Kubernetes scheduler deployment is covered by the saved-search digest CronJob manifests.

### 8.79 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/notificationPreferences.test.ts` passed: 1 test file, 4 tests.
- `npm run lint` passed.
- `npm run test:unit` passed: 21 test files, 153 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.

### 8.80 Queued Saved-Search Digest Delivery Runner

- Added `notification_digest_items` to the Supabase schema with user-owned RLS, `delivery_key` idempotency, pending/delivered/skipped status tracking, delivery due-time indexes, metadata indexing, and updated-at triggers.
- Added a frontend `notificationDigestService` that builds deterministic saved-search digest item payloads, validates daily/weekly frequencies, computes delivery windows, and upserts pending digest items when immediate alerts are deferred.
- Updated Jobs saved-search deferral to queue digest items, continue syncing the reviewed match baseline, and show a warning if digest queuing is unavailable.
- Added `scripts/run-notification-digests.mjs`, a scheduler-friendly runner that is dry-run by default and only mutates data with `--commit`.
- The runner loads due pending digest items, re-checks current notification settings, groups deliverable items by user/frequency, creates one `JOB_ALERT` digest notification per group, and marks items delivered or skipped when preferences no longer allow delivery.
- Added `npm run test:notification-digests` for credential-free runner logic validation.

Why it improves UX:

- Users who choose daily or weekly delivery can receive grouped saved-search updates instead of immediate individual alerts.
- Preference changes are respected at delivery time, reducing stale or unwanted digest notifications.

How user effort was reduced:

- Multiple deferred saved-search updates can become one digest notification.
- Operators get a dry-run scheduler command instead of manually composing digest notifications from raw queue rows.

How user control was preserved:

- Users still opt into tracking per saved search and control Job Alerts plus digest frequency in Settings.
- The runner does not apply saved searches, submit applications, contact recruiters, mark notifications read, or send external email/push messages.
- The runner is dry-run by default and requires an explicit `--commit` to write notifications or mark digest items processed.
- Kubernetes scheduler deployment is covered by the saved-search digest CronJob manifests.

### 8.81 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/notificationDigestService.test.ts` passed: 1 test file, 5 tests.
- `npm run test:notification-digests` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 22 test files, 158 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.

### 8.82 Server-Side Saved-Search Digest Discovery

- Added `scripts/discover-saved-search-digests.mjs`, a scheduler-friendly saved-search discovery runner that is dry-run by default.
- The runner loads alert-enabled saved searches, published jobs, and notification settings from Supabase with bounded limits.
- Reused the Jobs saved-search matching semantics for search text across job title, description, and company name, plus job type, location, minimum salary, and maximum salary.
- Added baseline safeguards: searches without a previous match count initialize their baseline without queueing a digest, and no-new-match searches update their checked baseline without creating notifications.
- Queues deterministic `notification_digest_items` rows only for users whose current settings still allow daily or weekly job-alert digests.
- Added `npm run test:saved-search-digest-discovery` for credential-free matching and planning validation.

Why it improves UX:

- Saved-search digest discovery can now happen from persisted product data even if the user does not open Jobs.
- Users who choose digest delivery get background match detection without immediate interruption.

How user effort was reduced:

- Users no longer need to revisit each tracked saved search just to let the app detect new matches for digest delivery.
- Baseline initialization avoids a first-run flood of old matches.

How user control was preserved:

- Discovery only considers saved searches where the user explicitly enabled tracking.
- Job Alerts and daily/weekly digest settings are checked before queueing a digest item.
- The runner is dry-run by default and only queues digest items plus baseline updates with explicit `--commit`.
- It never applies saved searches, submits applications, messages recruiters, marks notifications read, sends external messages, or contacts candidates.
- Kubernetes scheduler deployment is covered by the saved-search digest CronJob manifests.

### 8.83 Validation Addendum

- `npm run test:saved-search-digest-discovery` passed.
- `npm run test:notification-digests` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 22 test files, 158 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.

### 8.84 Saved-Search Digest Kubernetes Scheduler

- Added `docker/Dockerfile.scheduler` for the Node-based saved-search digest discovery and delivery commands.
- Added `infra/k8s/base/notification-digest-cronjobs.yaml` with separate CronJobs for discovery and delivery.
- Discovery runs every 30 minutes and delivery runs hourly, while each runner still respects due windows, current Job Alerts, and current digest-frequency preferences.
- Set `concurrencyPolicy: Forbid`, bounded job history, `backoffLimit`, and resource requests/limits to reduce duplicate processing and operational noise.
- Added Supabase URL and service-role key placeholders to the shared Kubernetes config/secret resources.
- Included `infrastructure.yaml` and the CronJob file in the base Kustomization, and corrected the production overlay to compose the base resource graph.

Why it improves UX:

- Saved-search digest discovery and delivery can run automatically in production instead of depending on users or operators to trigger scripts manually.
- Digest updates become timely and consistent with the user's selected delivery cadence.

How user effort was reduced:

- Users do not need to open Jobs to trigger saved-search digest discovery.
- Operators get declarative CronJobs instead of ad hoc command execution.

How user control was preserved:

- The CronJobs call the same runners that check explicit saved-search tracking, Job Alerts, digest frequency, and due windows.
- The jobs never apply searches, submit applications, message recruiters, mark notifications read, send external messages, or contact candidates.
- Environment operators must still replace placeholder Supabase config and publish the scheduler image before real deployment.

### 8.85 Validation Addendum

- Ruby YAML parsing passed for `infra/k8s/base/kustomization.yaml`, `infra/k8s/base/infrastructure.yaml`, `infra/k8s/base/notification-digest-cronjobs.yaml`, and `infra/k8s/overlays/prod/kustomization.yaml`.
- Static Kustomize resource-reference checks passed for base and production overlays.
- `node --check scripts/discover-saved-search-digests.mjs` passed.
- `node --check scripts/run-notification-digests.mjs` passed.
- `npm run test:saved-search-digest-discovery` passed.
- `npm run test:notification-digests` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 22 test files, 158 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.86 Networking Reminder Delivery Scheduler

- Added `scripts/run-networking-reminders.mjs`, a scheduler-friendly networking reminder delivery runner that is dry-run by default.
- The runner loads unread notifications whose metadata marks them as `networking_follow_up_reminder`, classifies due/future/invalid/already-delivered reminders, and promotes only due reminders.
- Due reminder promotion updates the existing notification row with a due title/message, stamps `metadata.reminderDeliveredAt`, records `metadata.reminderDeliverySource`, and refreshes `created_at` so the reminder can resurface in the bounded header notification feed.
- Added `npm run run:networking-reminders` and `npm run test:networking-reminders`.
- Added a Kubernetes CronJob that runs the reminder delivery command every 15 minutes with `concurrencyPolicy: Forbid`, bounded job history, retry backoff, resource requests/limits, and explicit `--commit`.

Why it improves UX:

- Users who explicitly set a connection follow-up reminder no longer need to manually remember or scan old notifications when it becomes due.
- Due reminders re-enter the active notification feed while future reminders stay non-urgent until their scheduled time.

How user effort was reduced:

- The platform can promote due reminders automatically from synced notification data.
- Operators get a declarative CronJob instead of a manual reminder-delivery command.

How user control was preserved:

- Reminders are still created only by the user's explicit Remind Me action.
- Clearing Remind Me or withdrawing a request still marks the synced reminder read, which excludes it from scheduler promotion.
- The runner ignores read, future, invalid, and already-delivered reminder rows.
- It never sends connection requests, sends messages, submits applications, marks unrelated notifications read, or triggers external email/push delivery automatically.

### 8.87 Validation Addendum

- `npm run test:networking-reminders` passed.
- `node --check scripts/run-networking-reminders.mjs` passed.
- Ruby YAML parsing passed for `infra/k8s/base/kustomization.yaml`, `infra/k8s/base/infrastructure.yaml`, `infra/k8s/base/notification-digest-cronjobs.yaml`, and `infra/k8s/overlays/prod/kustomization.yaml`.
- Static Kustomize resource-reference checks passed for base and production overlays.
- `npm run test:notification-digests` passed.
- `npm run lint` passed.
- `npm run test:unit` passed: 22 test files, 158 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.88 Restorable Application Draft Version History

- Added an application draft history helper for recent checkpoint creation, de-duplication, autosave coalescing, capping, sanitization, and server/local merge behavior.
- Added `application_draft_versions` to the Supabase schema with user-owned RLS and to the application-service migration set.
- Extended `applicationService` with `getApplicationDraftHistory` and `saveApplicationDraftHistoryEntry`.
- Updated the Jobs application review modal to load recent local/account draft versions, show the latest checkpoints, and offer an explicit Restore action.
- Restore replaces only the editable draft fields and then autosaves the restored draft; it does not submit the application.

Why it improves UX:

- Users can recover recent resume-link and cover-letter work after replacing, clearing, or editing a draft.
- The application workflow becomes less brittle when profile-generated drafts and manual edits are mixed.

How user effort was reduced:

- Users no longer need to recreate recent application draft content from memory after accidental replacement.
- Coalesced autosaves keep the history useful instead of flooding it with every keystroke.

How user control was preserved:

- Draft snapshots are visible and restored only by explicit user action.
- Restored content remains editable.
- Submit Application is still required before any application is created.
- Restoring a draft does not message recruiters, contact candidates, mark notifications read, or submit anything automatically.

### 8.89 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/applicationDraftHistory.test.ts src/services/applicationService.test.ts` passed: 2 test files, 9 tests.
- `npm run lint` passed.
- Static SQL file presence checks passed for `supabase-schema.sql` and `services/application-service/src/main/resources/db/migration/V5__Application_Draft_Versions.sql`.
- `npm run test:unit` passed: 24 test files, 167 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.90 Account-Synced Resume Export Activity

- Added a resume export history helper for safe record creation, sanitization, de-duplication, recent-history capping, and server/local merge behavior.
- Added `resume_export_events` to the Supabase schema with user-owned RLS and to the profile-service migration set.
- Extended `profileService` with `getResumeExportHistory` and `saveResumeExportRecord`.
- Updated Resume Builder to load local export activity first, merge account-synced activity when available, and write new export attempts locally before trying account sync.
- Added visible Account synced and Local only labels to each export activity record.

Why it improves UX:

- Users can understand whether recent print/download attempts were preserved on the account or only stored locally.
- Export history becomes more useful across sessions without changing the user-triggered export workflow.

How user effort was reduced:

- Users no longer need to remember or manually verify recent successful/blocked resume export attempts on the same account.
- The UI still shows local fallback records immediately when sync is unavailable.

How user control was preserved:

- Print PDF and Download HTML remain explicit button actions.
- Account sync stores only the activity record, not a generated resume file.
- Local-only fallback is labeled instead of hidden.
- The feature does not auto-generate files without an explicit export click, upload generated files, submit applications, send messages, or contact candidates.

### 8.91 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumeExportHistory.test.ts src/services/profileService.test.ts` passed: 2 test files, 5 tests.
- `npm run lint` passed.
- Static SQL file presence checks passed for `supabase-schema.sql` and `services/profile-service/src/main/resources/db/migration/V2__Resume_Export_Events.sql`.
- `npm run test:unit` passed: 26 test files, 172 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.92 Restorable Recruiter Job-Post Draft Version History

- Added a job-post draft history helper for useful-content detection, safe checkpoint creation, sanitization, de-duplication, autosave coalescing, recent-history capping, and server/local merge behavior.
- Added `job_post_draft_versions` to the Supabase schema with recruiter-owned RLS and to the job-service migration set.
- Extended `jobService` with `getJobPostDraftHistory` and `saveJobPostDraftHistoryEntry`.
- Updated the full Post Job page to load local history first, merge account-synced history when available, autosave useful draft snapshots, and record template-applied, reviewed, saved, and restored checkpoints.
- Added a Recent draft versions panel with explicit Restore actions and Account synced/Local only labels.

Why it improves UX:

- Recruiters can recover recent job-post work after replacing fields with a template, navigating between review/edit states, or returning to an existing draft.
- The posting workflow becomes less brittle without changing the reviewed draft-save and publish checklist model.

How user effort was reduced:

- Recruiters no longer need to recreate title, description, location, salary, requirements, and company attachment choices from memory after accidental replacement or interruption.
- Rapid autosaves coalesce into useful checkpoints instead of flooding the history.

How user control was preserved:

- Draft snapshots are visible and restored only by explicit user action.
- Restored content remains editable.
- Saving still requires Review Draft/Save Draft or Review Changes/Save Changes.
- Publishing still requires the separate My Posts publish checklist.
- Restoring a job-post version does not publish a job, contact candidates, submit applications, send messages, create notifications, or change candidate/application status.

### 8.93 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/jobPostDraftHistory.test.ts src/services/jobService.test.ts` passed: 2 test files, 28 tests.
- `npm run lint` passed.
- Static SQL file presence checks passed for `supabase-schema.sql` and `services/job-service/src/main/resources/db/migration/V2__Job_Post_Draft_Versions.sql`.
- `npm run test:unit` passed: 27 test files, 181 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.94 Networking Reminder Local Fallback Backfill

- Added a shared networking reminder helper for local reminder normalization, due-date calculation, and account-notification backfill planning.
- Updated Networking to backfill valid local sent-request reminders into account notifications once the sent-request list and notification sync are available.
- Added a Sent-tab status banner that distinguishes synced, syncing, local, and unavailable reminder states.
- Kept malformed legacy reminders without due timestamps local instead of promoting them into urgent unscheduled notifications.

Why it improves UX:

- A temporary notification-sync outage no longer strands valid follow-up reminders permanently in one browser.
- Users get visibility into whether reminders are account-synced or still local.

How user effort was reduced:

- Users do not need to recreate local fallback reminders manually when notification sync becomes available later.
- Synced reminders can participate in the existing notification feed and scheduled due-reminder promotion.

How user control was preserved:

- Reminders are still created only through explicit Remind Me actions.
- Clear Reminder and Withdraw still remove/mark matching reminders read when available.
- Backfill only creates/updates reminder notification metadata for already-user-created reminders.
- Backfill never sends messages, creates connection requests, accepts or declines requests, contacts recipients, submits applications, changes candidate/application status, or marks unrelated notifications read.

### 8.95 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/networkingReminders.test.ts src/services/notificationService.test.ts` passed: 2 test files, 16 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 28 test files, 186 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.96 AI Profile Draft Handoff

Implemented in this pass:

- Added `apps/frontend/src/lib/profileAiDrafts.ts` to convert structured AI profile recommendations into safe, reviewable Headline, Location, and Bio draft fields.
- Added `apps/frontend/src/lib/profileAiDrafts.test.ts` coverage for structured extraction, unchanged/generic recommendation rejection, quoted inline suggestions, and form-patch generation.
- Updated `AIAssistant` so Profile-classified AI Review Queue handoffs pass recommendation text and source metadata into `/profile`.
- Added an Improve my profile prompt chip that asks the assistant for parseable Headline, Location, and Bio output.
- Updated `ProfilePage` to consume the AI handoff, show a Review AI Profile Draft modal with current/proposed diffs, prefill editable fields, support Discard AI draft, and require Save Changes before mutation.
- Reset unsaved basic profile drafts on Cancel, Discard, and fresh manual Edit so stale suggestion values do not linger.

Why it improves UX:

- Users no longer need to manually copy profile recommendations from AI chat into the Profile edit form.
- The first destination-specific AI apply-review surface now follows the product's established draft-first pattern.
- Current/proposed comparison reduces ambiguity and helps users decide whether to accept, edit, or discard each suggestion.

Control and safeguards:

- The AI handoff only pre-fills editable draft fields.
- Profile updates still use the existing explicit `profileService.updateProfile` save path.
- Generic AI advice without structured Headline, Location, or Bio fields opens Profile without silently inventing values.
- Discard and Cancel reset unsaved fields to the current saved profile.
- The handoff never edits skills, experience, education, resumes, applications, jobs, learning records, messages, notifications, settings, or candidate state automatically.

### 8.97 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/profileAiDrafts.test.ts src/lib/aiSuggestionReviewQueue.test.ts` passed: 2 test files, 7 tests.
- `npm run lint` passed.
- `npm run test:unit` passed: 29 test files, 189 tests.
- `npm run build` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.98 AI Resume Draft Handoff

Implemented in this pass:

- Added `apps/frontend/src/lib/resumeAiDrafts.ts` to convert structured AI resume recommendations into safe, reviewable Headline, Phone, Location, Website, and Summary draft fields.
- Added `apps/frontend/src/lib/resumeAiDrafts.test.ts` coverage for structured extraction, unchanged/generic recommendation rejection, quoted inline suggestions, and form-patch generation.
- Updated `AIAssistant` so Resume-classified AI Review Queue handoffs pass recommendation text and source metadata into `/resume`.
- Updated the Review my resume prompt to request parseable resume fields only when the assistant suggests direct field edits.
- Updated `ResumeBuilder` to consume the AI handoff, open the existing import-review modal as Review AI Resume Draft, show current/proposed values, preselect detected fields, support field deselection, and require Apply Selected before any editor draft changes.
- Kept Save Changes as the only persistence action for profile-backed resume fields.

Why it improves UX:

- Users no longer need to copy structured resume recommendations from AI chat into Resume Builder fields.
- Resume handoffs reuse the existing import-review workflow, reducing new UI complexity and matching current user expectations.
- Current/proposed comparison and per-field checkboxes reduce accidental acceptance of unwanted AI edits.

Control and safeguards:

- The AI handoff only creates a selectable editor draft.
- Apply Selected updates only the local Resume Builder editor state.
- Profile-backed resume fields still persist only through the existing explicit Save Changes action.
- Generic AI advice without structured Headline, Phone, Location, Website, or Summary fields opens Resume Builder without inventing values.
- Cancel clears the AI resume draft and does not change the editor.
- The handoff never exports files, saves profile data, submits applications, edits jobs, changes learning records, sends messages, changes notifications, or mutates candidate state automatically.

### 8.99 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumeAiDrafts.test.ts src/lib/aiSuggestionReviewQueue.test.ts` passed: 2 test files, 7 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 30 test files, 192 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.100 AI Application Draft Handoff

Implemented in this pass:

- Added `apps/frontend/src/lib/applicationAiDrafts.ts` to convert structured AI job-application recommendations into safe, reviewable Resume URL and Cover Letter draft fields.
- Added `apps/frontend/src/lib/applicationAiDrafts.test.ts` coverage for explicit field extraction, unchanged/generic recommendation rejection, quoted inline suggestions, and form-patch generation.
- Updated application draft source and history handling to preserve `ai` attribution across local draft history, service mapping, schema checks, and the new `V6__Application_Draft_Ai_Source.sql` migration.
- Updated `AIAssistant` so Jobs-classified AI Review Queue handoffs pass recommendation text and source metadata into `/jobs`.
- Added a Draft application note prompt that asks for parseable Resume URL and Cover Letter fields without authorizing submission or recruiter contact.
- Updated `JobsPage` to keep AI application recommendations as pending drafts until the user selects a job and opens Review Application.
- Added a Review Application AI draft panel with current/proposed values, Apply AI Draft, and Dismiss controls.
- Kept Submit Application as the only action that submits the job application.

Why it improves UX:

- Users can carry structured AI application notes from AI Assistant into the exact Jobs workflow where they submit applications.
- Users no longer need to manually copy resume links or cover-letter text from chat into the application modal.
- The handoff remains contextual: AI suggestions are compared against the selected job's current editable draft before the user applies them.

Control and safeguards:

- The AI handoff does not choose a job, submit an application, contact recruiters, create notifications, or change application status.
- Apply AI Draft only copies selected structured values into the editable draft and records the `ai` source.
- The user can dismiss the AI draft before applying it.
- The user can edit or clear the copied values before submitting.
- Submit Application remains a separate explicit action.
- Generic or unstructured AI advice opens Jobs with a status toast but does not invent field values.

### 8.101 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/applicationAiDrafts.test.ts src/lib/applicationDraftHistory.test.ts src/services/applicationService.test.ts src/lib/aiSuggestionReviewQueue.test.ts` passed: 4 test files, 17 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 31 test files, 196 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.102 AI Learning Catalog-Search Handoff

Implemented in this pass:

- Added `apps/frontend/src/lib/learningAiDrafts.ts` to convert structured AI learning recommendations into safe, reviewable Course Search, Skill, Course, Certification, and Learning Goal catalog-search suggestions.
- Added `apps/frontend/src/lib/learningAiDrafts.test.ts` coverage for structured extraction, generic recommendation rejection, current-search skipping, deduplication, result limiting, and quoted inline search extraction.
- Updated AI Review Queue learning classification to label the destination action as Review learning plan.
- Updated `AIAssistant` so Learning-classified AI Review Queue handoffs pass recommendation text and source metadata into `/lms`.
- Updated the Recommend skills to learn prompt to request parseable Course Search, Skill, and Certification fields without enrollment or progress changes.
- Updated `LMSPage` to consume the AI handoff, clear route state, show a visible AI learning plan review panel, and support explicit Apply Search and Dismiss actions.

Why it improves UX:

- Users no longer need to copy learning terms from AI chat into the LMS catalog search.
- The handoff lands inside the course-discovery workflow and keeps course browsing, enrollment, and lesson progress visible.
- Applying a suggestion resets LMS to All Courses page 1 with the selected search, producing a predictable reviewed result set.

Control and safeguards:

- The AI handoff never enrolls in courses, marks lessons complete, changes progress, creates notifications, edits profile data, submits applications, sends messages, or contacts anyone.
- Apply Search changes only the local catalog search/filter state.
- Dismiss clears the AI learning plan without changing the catalog.
- Generic or unstructured AI advice opens LMS with a status toast but does not invent search terms.
- Enrollment and lesson completion remain separate explicit actions in the existing course modal.

### 8.103 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/learningAiDrafts.test.ts src/lib/aiSuggestionReviewQueue.test.ts` passed: 2 test files, 8 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 32 test files, 200 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.104 Destination-Level AI Prefill Decision Audit

Implemented in this pass:

- Extended automation suggestion audit event types to include `workflow_prefill_used` and `workflow_prefill_rejected`.
- Added `apps/frontend/src/lib/aiWorkflowPrefillAudit.ts` to record destination prefill decisions to both product analytics and automation suggestion audit events.
- Added `apps/frontend/src/lib/aiWorkflowPrefillAudit.test.ts` coverage for used decisions, rejected decisions, LMS analytics mapping, and the no-suggestion-ID analytics-only fallback.
- Added `services/ai-service/src/main/resources/db/migration/V4__Automation_Suggestion_Workflow_Prefill_Events.sql` and updated fresh schema constraints.
- Wired Profile AI draft Save Changes, Discard, and Cancel decisions into destination prefill audit events.
- Wired Resume AI draft Apply Selected and Cancel decisions into destination prefill audit events.
- Wired Jobs Application AI draft Apply AI Draft and Dismiss decisions into destination prefill audit events.
- Wired LMS AI learning Apply Search and Dismiss decisions into destination prefill audit events.

Why it improves UX and product operations:

- Product teams can distinguish AI suggestions that users open from suggestions they actually apply in the destination workflow.
- Support and future automation tuning can inspect rejected prefill decisions without asking users to reconstruct what happened.
- Destination-level decisions are tracked without introducing extra UI steps or blocking the user's workflow.

Control and safeguards:

- Prefill decision events are append-only observations.
- Analytics and audit failures use existing local fallback behavior and do not block Save Changes, Apply Selected, Apply AI Draft, Apply Search, Dismiss, or Cancel.
- Events never apply drafts, save profile fields, submit applications, enroll in courses, mark lessons complete, send messages, create notifications, or contact anyone.

### 8.105 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/aiWorkflowPrefillAudit.test.ts src/lib/automationSuggestionAudit.test.ts src/lib/productAnalytics.test.ts src/lib/learningAiDrafts.test.ts src/lib/applicationAiDrafts.test.ts src/lib/resumeAiDrafts.test.ts src/lib/profileAiDrafts.test.ts` passed: 7 test files, 25 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 33 test files, 203 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.106 Recruiter Job-Post Template Account Sync

Implemented in this pass:

- Extended job-post template records with recruiter ownership and visible `server`/`local` persistence state.
- Added safe account/local template merging so synced records replace matching fallback copies and the list remains bounded.
- Added `jobService.getJobPostTemplates`, `saveJobPostTemplate`, and `deleteJobPostTemplate`.
- Added `job_post_templates` schema support in Supabase and the job-service migration set.
- Updated Post Job to load local templates first, merge account-synced templates when available, and preserve local fallback writes when sync fails.
- Kept Save Current, Use Template, and Delete as explicit user-controlled actions that never create, update, or publish jobs by themselves.

Why it improves UX:

- Recruiters no longer lose reusable posting templates when they switch browsers or devices.
- The template selector shows whether each option is synced or local, reducing uncertainty during degraded sync states.
- Save/Delete remain immediate from the user's perspective, while account sync happens in the background.

Control and safeguards:

- Applying a template only copies values into editable draft fields.
- Saving or deleting a template never saves a job, publishes a job, sends messages, creates notifications, submits applications, or contacts candidates.
- When account sync is unavailable, the page keeps local fallback behavior and shows a visible status message.

### 8.107 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/jobPostTemplates.test.ts src/services/jobService.test.ts` passed: 2 test files, 29 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 33 test files, 207 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.108 Reviewed Resume-Skill Import

Implemented in this pass:

- Extracted resume import parsing into `apps/frontend/src/lib/resumeImportDrafts.ts`.
- Added parser tests for profile field extraction, skill-section parsing, duplicate filtering, known-skill inference, and supported file checks.
- Improved website extraction so email domains are not treated as websites.
- Updated Resume Builder to detect profile skills from pasted/uploaded resume text and show only skills not already on the profile.
- Added selectable detected-skill review and an explicit Save Skills action that creates selected Profile skills.
- Preserved the existing resume field control model: Apply Selected only updates the editor draft, and Save Changes remains required for profile-backed resume field updates.

Why it improves UX:

- Users can reuse skill data already present in a resume instead of retyping skills one at a time in Profile.
- Existing profile skills are filtered out, reducing duplicate review work.
- The import modal separates editor-field application from profile-skill persistence, reducing surprise.

Control and safeguards:

- Skills are visible and individually selectable before save.
- Saving detected skills is explicit and limited to Profile skill rows.
- Imported skills can still be edited or removed from Profile.
- The feature does not upload files, save resume field edits, submit applications, send messages, create notifications, or contact anyone automatically.

### 8.109 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeAiDrafts.test.ts src/lib/resumeExportHistory.test.ts src/services/profileService.test.ts` passed: 4 test files, 12 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 34 test files, 211 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.110 Recruiter Publish Review Analytics

Changed:

- Added a `recruiterPublishAnalytics` helper for append-only publish review and outcome events.
- Mapped publish review opens to `task_started`, successful publishes to `task_completed`, and failed publishes to `task_failed`.
- Captured checklist issue metadata, issue count, posting status, posting ID, and warning-override usage.
- Wired My Posts Review Publish and View Checklist actions into review-open analytics.
- Wired Publish Job outcomes into publish success/failure analytics.

Why it improves UX and operations:

- Product teams can now identify where recruiters hit checklist friction, override advisory warnings, or encounter publish failures.
- Future simplification work can be guided by observed publishing behavior rather than anecdotal reports.
- Recruiters do not get any new required step; the existing reviewed publish workflow remains unchanged.

Control and safeguards:

- Analytics writes are append-only and local-fallback tolerant through the existing product analytics helper.
- Analytics failures do not block publish review or publishing.
- No event publishes a job, blocks a warning override, edits posting content, creates notifications, sends messages, submits applications, or contacts candidates automatically.

### 8.111 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/recruiterPublishAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/jobPostReview.test.ts` passed: 3 test files, 23 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 35 test files, 215 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.112 Backend-Owned Recruiter Publish Readiness

Changed:

- Added a database trigger policy that rejects `PUBLISHED` jobs when title, description, location, company context, or at least one non-empty requirement is missing.
- Added the matching job-service migration so fresh Supabase schema and service-managed migrations enforce the same publish rule.
- Added a frontend helper that translates publish readiness constraint failures into a clear recovery message.
- Updated the recruiter publish modal so drafts with checklist blockers offer Edit Draft instead of a publish override.
- Kept Publish Job as the only status-changing action after blockers are cleared.

Why it improves UX and operations:

- Recruiters get a direct recovery path from the checklist to the draft editor.
- The platform no longer depends only on frontend state to protect public job quality.
- Product analytics can still observe publish failures, but the database remains the source of truth for required publish readiness.

Control and safeguards:

- The trigger prevents invalid status changes but does not alter job content.
- Edit Draft is explicit and returns to the existing full reviewed draft workflow.
- No policy path contacts candidates, sends messages, creates notifications, submits applications, or publishes a job automatically.

### 8.113 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/jobService.test.ts src/lib/jobPostReview.test.ts src/lib/recruiterPublishAnalytics.test.ts` passed: 3 test files, 45 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 35 test files, 218 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.114 Recruiter Company Profile Completion In Post Job

Changed:

- Added a reusable company profile completion helper covering name, industry, location, website, description, and employee count.
- Expanded the Post Job company context panel to show company profile completion percent and missing fields.
- Added description and employee count fields to Create & Attach Company.
- Added editable company profile details and Save Company Profile for existing recruiter-owned company context.
- Updated the recruiter dashboard company onboarding action to route to the Post Job company setup workflow.

Why it improves UX and operations:

- Recruiters can complete company context where they are already preparing job posts.
- The posting workflow no longer dead-ends after creating a minimal company record.
- Better company data improves public job context and candidate trust before publish.

Control and safeguards:

- Company profile changes require explicit Create & Attach Company or Save Company Profile actions.
- Company save is separate from job draft save and publish.
- The feature does not save a job draft, publish a job, contact candidates, send messages, create notifications, or submit applications automatically.

### 8.115 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/companyProfileCompletion.test.ts src/services/companyService.test.ts src/lib/jobPostReview.test.ts` passed: 3 test files, 19 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 36 test files, 222 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.116 Local Job Fit Reasons

Changed:

- Added a reusable `jobMatchExplanations` helper for profile-skill, location, and visible requirement reasons.
- Added focused tests for skill overlap, strong overlap labels, missing profile signals, and partial-word false positives.
- Loaded the current profile while Explore is active and kept job browsing functional if profile loading fails.
- Added compact advisory fit reasons to Explore job cards.

Why it improves UX:

- Talent users can understand why a role may be relevant before opening the application modal.
- Fit reasons expose the underlying signals instead of showing only an unexplained score.
- Missing profile signals nudge profile completion without changing job results.

Control and safeguards:

- Fit reasons are advisory and local to the UI.
- The feature does not rank, hide, filter, save searches, submit applications, edit profile data, message recruiters, create notifications, or contact anyone automatically.

### 8.117 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/jobMatchExplanations.test.ts src/lib/jobPostReview.test.ts src/services/jobService.test.ts` passed: 3 test files, 45 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 37 test files, 226 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.118 Reversible Local Explore Hide Controls

Changed:

- Added a reusable `hiddenExploreJobs` helper for user-scoped local storage, sanitization, duplicate-safe hiding, and restoring.
- Added focused tests for hidden-job storage keys, malformed data handling, deduplication, hiding, and restoring.
- Updated Jobs Explore to load and persist hidden-job preferences locally per user or guest.
- Excluded hidden job IDs from visible Explore cards while preserving search, filters, pagination, saved searches, application review, and job data.
- Added an explicit Hide action to Explore cards and Restore Last/Restore All controls in the Explore toolbar area.

Why it improves UX:

- Talent users can remove irrelevant roles from their visible Explore results without changing filters or losing saved searches.
- The restore strip keeps the preference visible and recoverable instead of making hidden jobs disappear silently.
- Local-only scope keeps the implementation low-risk while backend ranking and account-scoped preferences remain future work.

Control and safeguards:

- Hiding is explicit and reversible.
- The feature does not submit applications, save or delete saved searches, rank jobs, edit profile data, mutate job records, contact recruiters, send messages, create notifications, or sync hidden preferences across devices.

### 8.119 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/hiddenExploreJobs.test.ts src/lib/jobMatchExplanations.test.ts src/services/jobService.test.ts` passed: 3 test files, 35 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 38 test files, 230 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.120 Account-Synced Hidden Explore Preferences

Changed:

- Extended `hiddenExploreJobs` with recency-aware merge behavior for account and local hidden-job preference lists.
- Added job-service methods to load, save, delete one, and clear account hidden Explore jobs.
- Added `hidden_explore_jobs` schema and job-service migration coverage.
- Updated Jobs Explore to load local hidden jobs immediately, merge account records when available, backfill missing account records, and keep local-first hide/restore behavior if account sync fails.
- Added focused unit coverage for the helper merge behavior and the service query/mutation paths.

Why it improves UX:

- Signed-in users no longer need to hide the same irrelevant jobs separately on every browser when sync is available.
- The existing restore strip remains visible, so account-backed persistence does not make hidden cards disappear without recovery.
- Local fallback keeps the workflow usable when the table or network is unavailable.

Control and safeguards:

- Hide, Restore Last, and Restore All remain explicit user actions.
- Account sync only stores visibility preferences; it does not rank jobs, submit applications, save or delete saved searches, edit profile data, mutate job records, contact recruiters, send messages, create notifications, or hide jobs irreversibly.

### 8.121 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/hiddenExploreJobs.test.ts src/services/jobService.test.ts` passed: 2 test files, 36 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 38 test files, 235 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.122 Hidden Explore Preference Analytics

Changed:

- Added `preference_updated` to the product analytics taxonomy.
- Added a Jobs-specific recommendation preference analytics helper.
- Recorded Hide, Restore Last, and Restore All decisions from Jobs Explore after local preference state changes.
- Included job title, company name, match score, hidden counts before/after, restored count, and explicit-control metadata.
- Added focused tests for hide, restore-last, restore-all, and the updated taxonomy.

Why it improves UX:

- Product and search teams can learn which recommendation patterns users actively remove or restore.
- Future ranking improvements can be guided by observed preference behavior instead of relying only on clicks or applications.
- The user does not need to answer extra surveys or provide manual feedback beyond the existing Hide/Restore controls.

Control and safeguards:

- Analytics is append-only and local-fallback tolerant.
- Preference analytics never hides, restores, ranks, applies, saves searches, edits profiles, changes job records, contacts recruiters, sends messages, or creates notifications by itself.

### 8.123 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/jobRecommendationPreferenceAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/hiddenExploreJobs.test.ts` passed: 3 test files, 13 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 39 test files, 238 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.124 Hidden Preference Explore Refinements

Changed:

- Extended hidden Explore preference records with optional job type and location context.
- Added a tested hidden-preference insight builder for repeated hidden job-type patterns.
- Added explicit Jobs Explore refinement controls that can hide repeated job types from the current view.
- Added visible active preference chips with clear buttons.
- Cleared matching current-view preference refinements when Restore Last or Restore All would otherwise leave restored jobs filtered out.
- Recorded explicit apply/clear refinement decisions as preference analytics.
- Added a job-service migration and Supabase schema fields for hidden job type/location context.

Why it improves UX:

- Users can stop seeing repeated irrelevant job types with one explicit action after the pattern is visible.
- The experience turns hidden-card behavior into a transparent refinement loop without requiring surveys or a separate preferences page.
- Save Search remains compatible because current-view refinements are not silently stored as saved-search filters.

Control and safeguards:

- Preference refinements are never applied automatically.
- Refinements are scoped to the visible Explore view, displayed as chips, and clearable.
- Restore Last clears a matching job-type refinement and Restore All clears all current-view refinements.
- The feature does not submit applications, save or delete saved searches, edit profile data, mutate job records, contact recruiters, send messages, create notifications, or change backend ranking by itself.

### 8.125 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/hiddenExplorePreferenceInsights.test.ts src/lib/hiddenExploreJobs.test.ts src/lib/jobRecommendationPreferenceAnalytics.test.ts src/services/jobService.test.ts` passed: 4 test files, 44 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 40 test files, 243 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.126 Recruiter Registration Company Setup Handoff

Changed:

- Added a tested registration onboarding helper for role query normalization, auth role mapping, post-registration routing, and next-step copy.
- Updated Register to show the role-specific next step before submission.
- Routed recruiter registrations to `/jobs/post?companySetup=1`.
- Added a Post Job company-setup onboarding mode with onboarding-specific page title, status messaging, dashboard return, and continue-to-role-draft controls.
- Kept company setup separate from job draft save/publish.

Why it improves UX:

- Recruiters no longer need to infer that company context should be created from the posting form or dashboard checklist after signup.
- The first recruiter session starts with the setup data that later improves job posts and candidate context.
- The handoff removes navigation guesswork while preserving a skip path back to dashboard or into role drafting.

Control and safeguards:

- The next step is visible before account creation.
- Creating or updating company details remains an explicit button action.
- The handoff does not save a job draft, publish a role, contact candidates, send notifications, or force company creation.

### 8.127 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/registrationOnboarding.test.ts` passed: 1 test file, 4 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 41 test files, 247 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.128 Registration And Company Setup Onboarding Analytics

Changed:

- Added a reusable onboarding analytics helper for registration and recruiter company setup actions.
- Recorded account-type selection, registration submitted/completed/failed, company setup opened, dashboard exit, role-draft handoff, company creation, and company profile update events through the existing product analytics helper.
- Kept events append-only and local-fallback tolerant.
- Added unit coverage for registration event mapping, failure categorization, company setup event mapping, and company-id object attribution.

Why it improves UX and product learning:

- Product and support teams can see where onboarding friction occurs without adding more screens or asking users to manually report it.
- Recruiter setup exits and role-draft handoffs are now observable, which helps prioritize whether the handoff needs copy, layout, or workflow changes.

Control and safeguards:

- Analytics does not block registration, navigation, company creation, company updates, draft saves, publishing, candidate contact, messaging, or notifications.
- Registration analytics excludes email and password values.
- Every tracked event represents an explicit user step or visible workflow outcome; no automated action is triggered from analytics itself.

### 8.129 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/onboardingAnalytics.test.ts src/lib/registrationOnboarding.test.ts src/lib/productAnalytics.test.ts` passed: 3 test files, 14 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 42 test files, 252 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.130 Jobs Saved-Search Analytics

Changed:

- Added a reusable saved-search analytics helper for create, update, apply, delete, alert-enabled, and alert-disabled actions.
- Wired Jobs saved-search handlers to record events after local saved-search state changes.
- Recorded only non-sensitive search metadata: filter count, presence of a text query, selected job type, location/salary filter presence, alert state, match count, and saved-search counts.
- Added unit coverage for create, apply, and alert-toggle event mapping.

Why it improves UX and product learning:

- Product teams can see whether users actually save, reuse, and opt into alert tracking for searches without adding any additional prompts.
- The signal helps prioritize ranking, saved-search defaults, and notification improvements around real behavior.

Control and safeguards:

- Analytics never blocks save, apply, delete, alert toggle, account sync, digest queueing, or notification preference behavior.
- Raw search text and saved-search names are not recorded.
- Analytics does not apply searches, edit filters, save/delete records, enable alerts, queue notifications, submit applications, edit profile data, contact recruiters, send messages, or mutate jobs by itself.

### 8.131 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/savedSearchAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/jobRecommendationPreferenceAnalytics.test.ts` passed: 3 test files, 12 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 43 test files, 255 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.132 Application Workflow Analytics

Changed:

- Added a reusable application workflow analytics helper for review opened, profile draft used, draft restored, draft cleared, application submitted, and application submit failed actions.
- Wired the Jobs application review modal to record events after explicit user decisions and submission outcomes.
- Recorded only draft source, saved-draft presence, resume-link presence, cover-letter presence, field count, job ID, application ID, and error category.
- Added unit coverage for review-open, profile-draft, submit-success, and submit-failure event mapping.

Why it improves UX and product learning:

- Product teams can see whether users use profile drafts, restore draft history, clear drafts, or fail during submission without adding extra prompts inside the application flow.
- Submission failures become visible as workflow events while the user still receives the existing toast feedback.

Control and safeguards:

- Analytics never blocks opening review, applying profile drafts, restoring drafts, clearing drafts, submitting applications, or showing errors.
- Resume URLs and cover letter text are not recorded.
- Analytics does not open modals, edit draft fields, restore content, clear content, submit applications, change application statuses, contact recruiters, send messages, create notifications, or mutate jobs by itself.

### 8.133 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/applicationWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/aiWorkflowPrefillAudit.test.ts` passed: 3 test files, 12 tests.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 44 test files, 259 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.134 Candidate Workflow Analytics

Changed:

- Added a reusable candidate workflow analytics helper for review focus, detail/queue opens, status review, status success/failure, bulk review/confirmation/failure, interview-plan draft use, scorecard save, and scorecard-to-note draft use.
- Wired the Candidates page to record events after explicit recruiter review actions and visible status/scorecard outcomes.
- Recorded only workflow metadata: application ID, job ID, previous/target status, focus mode, entry point, selected/eligible/skipped/success/failure counts, scorecard presence/source, recruiter-note presence, advisory score band, and error category.
- Added unit coverage for detail open, single status outcome, bulk review/confirmation, draft-aid prefill, and failure event mapping.

Why it improves UX and product learning:

- Product teams can see whether recruiter review focus, queue navigation, draft-only review aids, private scorecards, status confirmation, and bulk review paths reduce candidate-screening effort without adding prompts inside the workflow.
- Status failures and partial bulk failures become visible while recruiters still receive the existing page feedback.

Control and safeguards:

- Analytics never blocks candidate review, queue navigation, scorecard saves, note drafts, status review, status updates, or bulk outcomes.
- Private notes, scorecard evidence, resume URLs, and cover letter text are not recorded.
- Analytics does not select candidates, create scorecards, edit private notes, change statuses, send messages, schedule interviews, contact candidates, create notifications, or mutate applications by itself.

### 8.135 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/candidateWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/candidateInterviewPlanner.test.ts` passed: 3 test files, 27 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 45 test files, 264 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.136 Messaging Workflow Analytics

Changed:

- Added a reusable messaging workflow analytics helper for conversation selection, load-more success/failure, retry clicks, older-history success/failure, visible-read success/failure, reply-suggestion insertion, attachment open/clear/validation, send success/failure, and failed-message retry.
- Wired the Messaging page to record events after explicit user actions and visible send/read/load outcomes.
- Cleared attachment URL drafts when users hide the attachment field through the paperclip control so hidden drafts cannot be sent accidentally.
- Recorded only conversation ID, message type, suggestion ID, text/attachment presence, unread count, visible/loaded counts, and error category.

Why it improves UX and product learning:

- Product teams can see where users rely on suggested replies, retry paths, read marking, attachment controls, and conversation loading without adding prompts to chat.
- Hidden attachment drafts are cleared when the field is hidden, reducing accidental sends from an invisible attachment state.

Control and safeguards:

- Analytics never blocks selecting conversations, loading messages, marking read, inserting reply drafts, editing text, clearing attachments, sending, retrying, or showing errors.
- Message text and attachment URLs are not recorded.
- Analytics does not select conversations, insert text, edit messages, send messages, retry messages, mark messages read, open attachments, create notifications, or contact other users by itself.

### 8.137 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/messagingWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/messagingAttachments.test.ts src/lib/messagingReplySuggestions.test.ts` passed: 4 test files, 18 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 46 test files, 269 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.138 Settings Workflow Analytics

Changed:

- Added a reusable settings workflow analytics helper for tab selection, profile save success/failure, notification preference edits, notification save success/failure, billing handoff, password reset review/cancel/success/failure, and account deactivation review/cancel/success/failure.
- Wired Settings page, Notification Settings, Security Settings, and Billing summary actions to record events after explicit user decisions or visible save/security outcomes.
- Recorded only tab ID, preference key, enabled flag, digest frequency, quiet-hours enabled flag, field count, enabled notification-channel count, billing-record presence, invoice count, and error category.
- Added unit coverage for tab selection, notification preference edits, profile save, billing handoff, and security failure event mapping.

Why it improves UX and product learning:

- Product teams can see where users change notification delivery, save profile settings, open Billing, or hit security failures without adding prompts to Settings.
- Settings friction becomes visible while keeping the existing confirmation flows for password reset and account deactivation.

Control and safeguards:

- Analytics never blocks tab navigation, profile saves, notification edits, notification saves, Billing navigation, password reset, or account deactivation.
- Profile field values, email addresses, quiet-hour exact times, and deactivation confirmation text are not recorded.
- Analytics does not edit profile values, change notification settings, send reset emails, deactivate accounts, open Billing, change plans, mark notifications read, send messages, create notifications, or mutate settings by itself.

### 8.139 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/settingsWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/notificationPreferences.test.ts` passed: 3 test files, 14 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 47 test files, 274 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.140 Dashboard And Admin Operational Analytics

Changed:

- Added a reusable dashboard/admin operational analytics helper for dashboard data loads, load failures, degraded states, refresh/retry actions, activation-checklist handoffs, stat-card handoffs, quick actions, panel handoffs, Admin console loads/failures/refreshes, service investigation links, and audit-log retry/load-more outcomes.
- Wired Talent and Recruiter dashboards to record explicit header, checklist, stat-card, quick-action, panel, retry, refresh, load, and degraded-state events without changing navigation behavior.
- Wired the Admin console to record read-only refresh, service investigation, audit retry, audit load-more, audit load completion, load failure, load success, and degraded-state events.
- Recorded only role, source status, issue count, internal route, entry point, task ID/completion counts, stat key, service ID/status, link type/external flag, service/degraded/security-alert counts, latency band, visible item count, audit count context, and error category.
- Added unit coverage for dashboard checklist handoffs, degraded dashboard observations, Admin investigation links, audit pagination, and Admin failure mapping.

Why it improves UX and product learning:

- Product teams can see whether dashboard activation paths, dashboard retry controls, Admin refreshes, Admin audit pagination, and service investigation links are working without adding surveys or extra prompts.
- Operational friction becomes visible while dashboards and Admin actions remain read-only, explicit, and reversible.

Control and safeguards:

- Analytics never blocks dashboard navigation, dashboard refresh/retry, Admin refresh, service investigation, audit retry, or audit pagination.
- Raw dashboard issue text, service URLs, log queries, audit actor IDs, audit IP addresses, raw error messages, and user emails are not recorded.
- Analytics does not navigate without a click, retry automatically, restart services, change settings, acknowledge incidents, edit users, mutate audit records, send messages, create notifications, or modify dashboard/admin data by itself.

### 8.141 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/dashboardOperationalAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/settingsWorkflowAnalytics.test.ts` passed: 3 test files, 15 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 48 test files, 279 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.142 LMS Workflow Analytics

Changed:

- Added a reusable LMS workflow analytics helper for catalog load/failure, tab selection, search submission, page navigation, page-size changes, AI learning-plan review/apply/dismiss, course opening, enrollment outcomes, lesson selection, and lesson completion outcomes.
- Wired the LMS page to record explicit catalog filter, pagination, course open, enrollment, lesson, and AI learning-plan decisions without changing search, enrollment, or progress behavior.
- Tightened LMS AI learning prefill audit metadata so Apply/Dismiss decisions store suggestion counts, labels, and selected indexes instead of raw search terms or suggestion lists.
- Recorded only tab ID, course ID, lesson ID, entry point, category, difficulty, progress band, lesson/page counts, total/next-page flags, search presence and length band, progress filter, suggestion count/label/index, enrollment flags, completion status, and error category.
- Added unit coverage for catalog load mapping, course open mapping, enrollment completion, lesson failure, and AI search apply privacy boundaries.

Why it improves UX and product learning:

- Product teams can see where learners search, filter, page, accept AI catalog help, enroll, and finish lessons without adding surveys or extra prompts.
- LMS friction becomes visible while preserving the existing explicit Apply Search, Enroll Now, and Mark Complete controls.

Control and safeguards:

- Analytics never blocks catalog loading, tab changes, search, pagination, AI learning-plan review, course opening, enrollment, lesson selection, or lesson completion.
- Raw search terms, course titles, lesson titles, provider names, recommendation text, suggestion text, and raw error messages are not recorded.
- Analytics does not change search without a click, enroll automatically, complete lessons automatically, change course progress, create notifications, send messages, or mutate LMS data by itself.

### 8.143 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/lmsWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/aiWorkflowPrefillAudit.test.ts src/lib/learningAiDrafts.test.ts` passed: 4 test files, 17 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 49 test files, 284 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.144 Challenges Workflow Analytics

Changed:

- Added a reusable Challenges workflow analytics helper for category selection, workspace open, language changes, starter-code reset, retry-history load/retry, local sample-check lifecycle, and submission outcomes.
- Wired the Challenges page to record explicit filter, workspace, language, reset, local check, retry-history refresh, and submission decisions without changing challenge filtering, code editing, local sample checks, retry-history loading, or submission behavior.
- Recorded only bounded challenge metadata: challenge ID, category, difficulty, language, entry point, visible/runnable sample-case counts, local-check result counts, submission status, score band, attempt count, prior-submission presence, solution length band, and error category.
- Added unit coverage for category selection, workspace-open privacy boundaries, local-check completion counts, submission outcome privacy boundaries, and failure error categorization.

Why it improves UX and product learning:

- Product teams can see where users filter challenges, open workspaces, switch languages, reset code, run local sample checks, refresh retry history, and submit solutions without adding surveys or extra prompts.
- Challenge friction becomes visible while preserving the existing explicit Solve Now, Run Local Check, Refresh, Reset, and Submit controls.

Control and safeguards:

- Analytics never blocks challenge filtering, workspace opening, code editing, local checks, retry-history loading, resets, or submissions.
- Solution code, sample input, expected output, actual output, challenge prompt/title/description, feedback text, and raw error messages are not recorded.
- Analytics does not change filters without a click, edit solution code, run checks automatically, refresh retry history automatically, submit solutions, change scores, create notifications, send messages, or mutate challenge data by itself.

### 8.145 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/challengeWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts` passed: 2 test files, 10 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 50 test files, 289 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.146 Billing Workflow Analytics

Changed:

- Added a reusable Billing workflow analytics helper for data load/failure, retry, plan review/cancel, checkout start/handoff/popup-blocked/submitted/failure, payment-method review/cancel, and billing-portal start/handoff/popup-blocked/submitted/failure outcomes.
- Wired the Billing page to record explicit retry, plan review, checkout, payment-method review, and provider handoff decisions without changing billing data loading, retry, checkout, payment method, or provider portal behavior.
- Recorded only bounded billing metadata: plan ID, current plan ID, interval, currency, price band, feature count, plan count, transaction count, subscription/payment-method presence, provider action, redirect availability, popup-opened outcome, entry point, and error category.
- Added unit coverage for billing load mapping, plan-review privacy boundaries, checkout handoff privacy boundaries, portal popup-blocked failures, and error categorization.

Why it improves UX and product learning:

- Product teams can see where billing users encounter provider load failures, retry, open or abandon reviews, reach checkout or billing portal, hit popup blockers, or hit provider failures without adding surveys or extra prompts.
- Billing friction becomes visible while preserving the existing explicit Review Plan, Continue, Update, Open Billing Portal, and Retry controls.

Control and safeguards:

- Analytics never blocks billing data loading, retry, plan review, checkout creation, payment-method review, billing portal creation, or provider handoffs.
- Card details, invoice descriptions, provider URLs, exact payment amounts, plan names, feature text, and raw error messages are not recorded.
- Analytics does not change plans, open provider URLs without a click, retry automatically, edit payment methods, create subscriptions, change invoices, send messages, create notifications, or mutate billing data by itself.

### 8.147 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/billingWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts` passed: 2 test files, 10 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 51 test files, 294 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.148 Profile Workflow Analytics

Changed:

- Added a reusable Profile workflow analytics helper for profile load/failure, tab selection, basic edit/save/cancel, AI draft review/failure/discard, local suggestion prefill, completion task open/cancel/validation/save/failure, row delete review/cancel/complete/failure, and photo upload outcomes.
- Wired the Profile page to record explicit profile decisions without changing profile loading, edit modal behavior, AI draft review, local suggestion prefill, skill/experience/education save flows, delete confirmation, tab navigation, or photo upload behavior.
- Recorded only bounded profile metadata: own/external profile scope, entry point, tab ID, row type, row mode, field keys, field/missing-field counts, skill/experience/education/achievement counts, completion band, suggestion type/source category, AI field count, and error category.
- Added unit coverage for profile load mapping, basic save privacy boundaries, suggestion prefill privacy boundaries, row save/delete privacy boundaries, and failure categorization.

Why it improves UX and product learning:

- Product teams can see where users abandon profile edits, use local suggestions, hit validation, save or fail completion tasks, discard AI drafts, remove rows, or abandon/fail photo upload without adding surveys or extra prompts.
- Profile friction becomes visible while preserving the existing explicit Edit Profile, Apply Draft, Save, Discard, Add/Edit row, Delete review, and tab controls.

Control and safeguards:

- Analytics never blocks profile loading, tab changes, edit/cancel/save, local suggestion prefill, AI draft review, completion task save, row delete, or photo upload feedback.
- Headline, bio, location, full name, skill names, company names, institution names, descriptions, row labels, and raw error messages are not recorded.
- Analytics does not edit profile fields, insert suggestions without a click, save AI drafts automatically, create profile rows, delete rows, upload photos, send messages, create notifications, or mutate profile data by itself.

### 8.149 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/profileWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/profileAiDrafts.test.ts` passed: 3 test files, 13 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 52 test files, 299 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.150 Resume Workflow Analytics

Changed:

- Added a reusable Resume workflow analytics helper for resume load/failure, tab selection, import open/cancel/file/analyze/apply, AI draft review/failure/discard, detected-skill save, detected-row save, profile-field save, export, and export-history load/sync outcomes.
- Wired Resume Builder to record explicit resume decisions without changing import review, AI draft handoff, detected-skill save, detected-row save, editor save, print export, HTML download, export-history sync, or tab behavior.
- Recorded only bounded resume metadata: entry point, tab ID, source type, reviewed field keys/counts, detected/selected/saved/failed skill counts, detected/selected/saved/failed experience and education counts, AI field count, profile skill/experience/education counts, export method/status, persistence target, input length band, normalized file type, and error category.
- Added unit coverage for resume load mapping, import-analysis privacy boundaries, AI draft application privacy boundaries, detected-skill and detected-row save privacy boundaries, and export privacy boundaries.

Why it improves UX and product learning:

- Product teams can see where users abandon imports, discard AI drafts, hit missing-text or no-selection states, save detected skills, save supported fields, export successfully, hit popup blockers, or fall back to local export-history sync without adding surveys or extra prompts.
- Resume friction becomes visible while preserving the existing explicit Import Text, Generate Draft, Apply Selected, Save Skills, Save Rows, Save Changes, Download HTML, Print PDF, Cancel, and tab controls.

Control and safeguards:

- Analytics never blocks resume loading, tab changes, import review, file loading, draft application, skill saving, field saving, export, export-history fallback, or AI draft discard.
- Resume text, contact details, file names, skill names, export artifacts, generated HTML, and raw error messages are not recorded.
- Analytics does not edit resume fields, apply imports, save skills, save AI drafts, open exports, retry sync, upload files, create applications, send messages, create notifications, or mutate resume/profile data by itself.

### 8.151 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumeWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/resumeAiDrafts.test.ts src/lib/resumeImportDrafts.test.ts src/lib/resumeExportHistory.test.ts` passed: 5 test files, 20 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 53 test files, 304 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.152 Networking Workflow Analytics

Changed:

- Added a reusable Networking workflow analytics helper for suggestions loaded/failures, connection-state loading, tab selection, profile preview/full-profile handoff, connect request, incoming accept/decline, sent withdraw, reminder set/clear/sync/backfill, hidden suggestion, restore hidden suggestions, and suggestion-preference sync outcomes.
- Wired the Networking page to record explicit networking decisions without changing suggestion loading, search, optional request notes, incoming/sent/connection tabs, profile previews, connection request actions, reminder controls, local fallbacks, account sync, or scheduler behavior.
- Recorded only bounded networking metadata: entry point, tab, request direction/status, visible/hidden suggestion counts, incoming/sent/connection/pending counts, search length band, request-note presence and length band, recommendation-score band, mutual-connection band, reason/shared-skill/profile-skill counts, reminder delay, sync status, and error category.
- Added unit coverage for suggestion-load mapping, connection-request privacy boundaries, suggestion-preference privacy boundaries, reminder sync privacy boundaries, and profile-preview privacy boundaries.

Why it improves UX and product learning:

- Product teams can see where users abandon networking suggestions, search and switch tabs, preview profiles before connecting, send or fail connection requests, accept/decline/withdraw requests, set or clear follow-up reminders, hit local-only reminder/preference sync, and hide or restore irrelevant suggestions without adding surveys or extra prompts.
- Networking friction becomes visible while preserving the existing explicit Connect, Accept, Decline, Withdraw, Remind Me, Clear Reminder, Hide, Show hidden, Preview, Full Profile, and tab controls.

Control and safeguards:

- Analytics never blocks suggestion loading, connection-state loading, tab changes, search, profile preview, full-profile handoff, connection request actions, reminder actions, local storage fallback, account sync, or scheduler behavior.
- Names, profile text, request notes, skill names, locations, exact reminder timestamps, recommendation reasons, and raw error messages are not recorded.
- Analytics does not send connection requests, accept or decline requests, open profiles, create reminders, hide suggestions, clear preferences, sync notifications, send messages, create notifications, or mutate networking state by itself.

### 8.153 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/networkingWorkflowAnalytics.test.ts src/lib/productAnalytics.test.ts src/lib/networkingReminders.test.ts src/lib/networkingProfilePreview.test.ts` passed: 4 test files, 18 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 54 test files, 309 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.154 Extension Operational Analytics

Changed:

- Added a reusable extension operational analytics helper that stores a bounded local queue in `ts_extension_operational_analytics` and respects the existing Usage Diagnostics toggle.
- Wired popup open/tab/options handoffs, tracker add/delete/status/draft/link actions, diagnostics clear/test-event/ping actions, options tab changes, resume matcher validation/request/completion, interview planner add/toggle/clear actions, settings changes/reset requests, and background page-scan/message outcomes.
- Recorded only bounded extension metadata: tabs, counts and count bands, statuses, confidence values, source categories, field-presence flags, input length bands, score bands, setting names, clear scopes, message actions, response statuses, and error categories.

Why it improves UX and product learning:

- Product teams can now see where extension users abandon scans, fail content-script scraping, save or review-discard scanned drafts, update local tracker records, run matcher analysis, manage prep cards, and use diagnostics without adding extra prompts.
- Extension automation friction becomes measurable while preserving the existing explicit Scan Webpage, Save to Tracker, reviewed Discard, Add Job, Preview Match, Add Plan Card, Clear, and settings-toggle controls.

Control and safeguards:

- Extension analytics is Usage Diagnostics-gated, local, append-only, and non-blocking.
- Raw URLs, company names, role names, resume text, job descriptions, notes, prep topics, page titles, page content, generated reports, and raw error messages are not recorded.
- Analytics does not scan pages, save drafts, change tracker statuses, run matcher analysis, create prep cards, toggle settings, open tabs, send messages, sync data, or mutate extension/web-app data by itself.

### 8.155 Validation Addendum

- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 54 test files, 309 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.156 Extension Diagnostics Transparency

Changed:

- Added a Local Analytics panel to the extension popup Diagnostics tab with loading, event count, latest event label, and latest event time.
- Added explicit Export and Clear controls for `ts_extension_operational_analytics`; export writes the sanitized local event queue to a JSON file, while clear now opens inline review before emptying the queue without recording a replacement clear event.
- Preserved existing logs, local test-event, and worker ping behavior.

Why it improves UX and product learning:

- Users can now inspect, share, or remove extension diagnostics without opening Chrome storage manually.
- Product and support teams can request a reviewed local JSON export when troubleshooting extension scan, tracker, matcher, planner, settings, or background-worker behavior.

Control and safeguards:

- Export requires an explicit user click; clear requires an explicit review and confirmation, and both are disabled when no local analytics events exist.
- Export includes only the already-sanitized bounded local events.
- Confirmed clear removes the local analytics queue and does not trigger page scans, tracker changes, sync, matcher runs, prep-card actions, settings changes, or retained replacement analytics mutations.

### 8.157 Validation Addendum

- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 54 test files, 309 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.158 Admin Product Analytics Insights

Changed:

- Added a product analytics insight summarizer for aggregate event counts, automation acceptance/rejection rates, failure share, top areas, top event names, and friction signals.
- Added an Admin service path that queries recent `product_analytics_events`, falls back to the local analytics queue on server failure, and returns summaries instead of raw event payloads.
- Added a Product Analytics Insights panel to the Admin Console with source badges, refresh/retry controls, aggregate cards, top areas, and friction signals.
- Added a Supabase RLS policy that lets `ADMIN` profiles read all product analytics events.

Why it improves UX and product learning:

- Admins can see where workflow failures, degraded states, automation acceptance, and automation rejection concentrate without running manual SQL or inspecting local storage.
- Product analytics moves from passive event capture toward a usable product/ops feedback loop.

Control and safeguards:

- The Admin panel is read-only and refresh/retry is explicit.
- Rendered insights exclude raw user IDs, object IDs, event metadata, raw issue text, raw errors, URLs, and private workflow content.
- The summarizer turns analytics into aggregate counts/rates/signals only; it does not mutate workflows, change recommendations, trigger alerts, contact users, or sync extension data.

### 8.159 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts src/lib/productAnalyticsInsights.test.ts src/lib/dashboardOperationalAnalytics.test.ts src/lib/productAnalytics.test.ts` passed: 4 test files, 20 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 55 test files, 314 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.160 Admin Analytics Improvement Opportunities

Changed:

- Extended the product analytics insight summarizer with prioritized improvement opportunities derived only from aggregate analytics signals.
- Added opportunities for analytics coverage gaps, high workflow failure/degraded share, automation rejection, prefill rejection, unreviewed automation outcomes, automation handoff drop-off, and recovery friction.
- Added an Improvement Opportunities column to the Admin Console Product Analytics Insights panel with priority badges, aggregate triggers, suggested actions, and user-control safeguards.

Why it improves UX and product learning:

- Admins get a first-pass product improvement backlog without manually interpreting raw rates, event tables, or local fallback queues.
- Product teams can move from passive analytics visibility to prioritized review while still keeping implementation and remediation decisions explicit.

Control and safeguards:

- Opportunities are read-only and do not trigger alerts, contact users, retry tasks, change recommendations, hide records, submit data, or mutate workflow state.
- Rendered opportunities use aggregate labels, counts, rates, and product areas only; they exclude raw event metadata, user IDs, object IDs, issue text, raw errors, URLs, and private workflow content.
- User-facing automation remains optional and review-based; rejected prefills and dismissed suggestions stay visible as signals rather than being overridden.

### 8.161 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts src/lib/productAnalyticsInsights.test.ts src/lib/dashboardOperationalAnalytics.test.ts src/lib/productAnalytics.test.ts` passed: 4 test files, 21 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 55 test files, 315 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 17 frontend API client calls, 125 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.162 Provider-Backed Messaging Attachment Uploads

Changed:

- Added a frontend file upload service for `POST /api/v1/files/upload` that accepts both backend response shapes currently present in code/contracts and returns only a normalized `http`/`https` attachment URL.
- Added an explicit file upload option inside the Messaging attachment panel with 10 MB file validation, upload progress feedback, removable uploaded draft state, optional caption review, and unchanged manual Send control.
- Added file attachment type/size categorization and upload workflow analytics for started/completed/failed/validation outcomes without storing filenames or URLs.
- Added a file-service `GET /api/v1/files/download/{folder}/{fileName}` route and path validation so uploaded files can be retrieved through the URLs generated by the service.

Why it improves UX and workflow efficiency:

- Users no longer need to leave the product, upload a file elsewhere, copy a public URL, return to the chat, and paste it before sending.
- The upload flow reuses the existing reviewed attachment model, so users can still inspect the uploaded draft, add or edit a caption, remove it, or send it explicitly.

Control and safeguards:

- Upload is user-initiated and does not send a message automatically.
- Empty files and files above 10 MB are blocked before upload.
- Analytics records only attachment source, bounded file category, bounded size band, counts, IDs, and error category; message text, attachment URLs, upload URLs, and filenames are excluded.
- Backend download path parts are validated before resolving local storage paths. Remaining production hardening includes virus/type scanning, S3/CDN provider configuration, retention policy, and backend-owned chat contracts.

### 8.163 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/messagingAttachments.test.ts src/services/fileUploadService.test.ts src/lib/messagingWorkflowAnalytics.test.ts` passed: 3 test files, 17 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 56 test files, 322 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.164 File Upload Safety Guardrails

Changed:

- Added server-side file-service validation for non-empty uploads, safe upload folder names, a 10 MB maximum size, and blocked executable/script-like extensions before files are written.
- Kept the existing upload/download URL behavior while making upload folder handling match the safe path-part checks already used for downloads.
- Added backend service tests for oversized files, unsafe folders, blocked extensions, and upload/download continuity.

Why it improves UX and security:

- Users get deterministic rejection of unsupported attachments instead of broken message drafts or unsafe stored files.
- The backend no longer relies only on frontend validation for the message upload flow.

Control and safeguards:

- Guardrails reject only unsafe, empty, or oversized inputs; valid uploads still require explicit file selection and manual message send.
- The implementation does not auto-send messages, open attachments, retry uploads, contact users, or mutate conversation state.
- Virus scanning, provider-backed object storage hardening, retention policy, and CDN configuration remain production follow-ups.

### 8.165 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/messagingAttachments.test.ts src/services/fileUploadService.test.ts src/lib/messagingWorkflowAnalytics.test.ts` passed: 3 test files, 17 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.166 Scheduled Automation Rollout Visibility

Changed:

- Added a frontend-safe scheduled automation catalog for saved-search digest discovery, notification digest delivery, and networking reminder delivery.
- Added an Admin Console Scheduled Automations panel with expected schedule, command, manifest path, purpose, configured/needs-verification/degraded summaries, optional provider status links, optional scheduler image/runbook context, and explicit refresh.
- Added Admin operational analytics for scheduler status load and refresh with only bounded configured/needs-verification/degraded counts.
- Updated the product audit and feature dashboard reference to document the rollout visibility model and remaining provider-backed scheduler gaps.

Why it improves UX and operations:

- Admins can see which scheduled automations are expected and whether rollout has been marked configured, degraded, or still needing verification without inspecting Kubernetes manifests or deployment notes manually.
- Digest and networking automation moves from hidden infrastructure behavior toward visible operational status inside the Admin Console.

Control and safeguards:

- The panel is read-only and does not trigger jobs, change schedules, mutate notifications, alter reminders, edit saved searches, or modify service configuration.
- Optional status/runbook links require explicit admin clicks.
- Analytics records only bounded status counts; scheduler status URLs, runbook URLs, secret values, raw operational output, and user data are not recorded.
- Optional provider run history is now available through the Admin scheduler status API path; Kubernetes pod health, secret health, image digest verification, and a backend-owned provider contract remain follow-up work.

### 8.167 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts src/lib/dashboardOperationalAnalytics.test.ts` passed: 2 test files, 16 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 56 test files, 326 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.168 Provider Scheduler Run-History Visibility

Changed:

- Added an optional `VITE_SCHEDULER_STATUS_API_URL` provider adapter for scheduler run-history status.
- Merged recognized provider fields into the expected scheduler catalog: latest-run status, last/next run timestamps, consecutive failure counts, provider status links, image context, and runbook context.
- Added latest-run badges and provider run-history summary counts to the Admin Scheduled Automations panel.
- Extended Admin operational analytics with bounded scheduler run-history counts only.

Why it improves UX and operations:

- Admins can review configured run-history status in the same Admin panel that already lists expected scheduled automations.
- Provider failures degrade visibly while preserving the catalog fallback, so operations context is available without making the console dependent on Kubernetes access.

Control and safeguards:

- The provider integration is read-only and never triggers jobs, changes schedules, modifies notifications, alters reminders, edits saved searches, or changes service configuration.
- Only `http`/`https` provider URLs are fetched.
- Raw provider errors, raw run output, provider URLs, status URLs, runbook URLs, secret values, and user data are excluded from analytics.
- Kubernetes pod health, secret health, image digest verification, and a backend-owned provider status contract remain follow-up work.

### 8.169 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/services/adminService.test.ts src/lib/dashboardOperationalAnalytics.test.ts` passed: 2 test files, 19 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 56 test files, 329 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.170 Native Resume PDF Export

Changed:

- Added a lightweight native PDF generator for reviewed Resume Builder data.
- Added an explicit Download PDF action alongside Download HTML and Print PDF.
- Added `native-pdf` export history support in local history, account-synced `resume_export_events`, the Supabase schema, and the profile-service migration set.
- Extended Resume workflow analytics so native PDF export completion/failure is tracked with bounded method/status metadata.

Why it improves UX:

- Users can download a PDF directly instead of opening the print dialog and manually choosing Save as PDF.
- Export Activity now reflects native PDF downloads in the same account/local history as HTML and print attempts.

Control and safeguards:

- PDF generation requires an explicit user click.
- Generated PDF files remain local to the browser download action and are not uploaded.
- The action uses the currently reviewed editor/profile data and does not save profile fields.
- Analytics and export history exclude resume content, generated file bytes, filenames from analytics, raw errors, and contact details.
- Scanned-PDF OCR and provider retention/revocation policy remain follow-up work; searchable-PDF import is addressed in UX-160.

### 8.171 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/profileService.test.ts` passed: 4 test files, 15 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 57 test files, 334 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.172 Provider-Backed Resume PDF Artifact Upload

Changed:

- Added an explicit Upload PDF action to Resume Builder that generates the same reviewed native PDF and uploads it through file-service only after the user clicks.
- Added an uploaded PDF panel with the returned provider link so users can verify or open the artifact from the Resume Builder session.
- Added `provider-pdf` export history and Resume workflow analytics method support without recording upload URLs, generated files, resume content, filenames, or raw provider errors in analytics.
- Added profile-service and Supabase schema support for `provider-pdf` export activity records.

Why it improves UX:

- Users can create and upload a shareable resume PDF from the same Resume Builder screen instead of manually downloading, locating, and uploading the file elsewhere.
- Upload status appears in the same Export Activity model as local PDF, HTML, and print actions, reducing ambiguity about what happened.

Control and safeguards:

- Provider upload is a separate explicit action from local download.
- The upload uses the currently reviewed editor/profile data and does not save profile fields.
- The returned provider link is shown visibly after upload so users can inspect the artifact.
- Analytics excludes the upload URL, generated file bytes, resume content, filenames, and raw provider errors.
- An account-synced/local-fallback artifact library plus explicit provider delete control are now available; recent local delete receipts are now available, while formal provider retention policy and backend revocation audit remain follow-up work.

### 8.173 Validation Addendum

- `npm run test:unit --workspace talentsphere-web -- src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/profileService.test.ts src/services/fileUploadService.test.ts` passed: 5 test files, 21 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 57 test files, 336 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 18 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.174 Uploaded Resume PDF Artifact Library And Delete Control

Changed:

- Added a small local current-user artifact library for uploaded Resume Builder PDFs with normalized provider URLs, display filename, timestamp, deduping, and a five-item cap.
- Replaced the single session-only uploaded PDF link with an Uploaded PDFs panel that supports opening each recent artifact and explicitly deleting it.
- Exposed `fileUploadService.deleteFile(url)` for the existing file-service delete endpoint and added frontend validation/error handling for invalid or failed delete requests.
- Tightened file-service delete validation so unknown provider URLs and unsafe download paths fail clearly instead of silently returning success.
- Added privacy-bounded resume artifact analytics for artifact library load, delete, and delete failure using only artifact counts, method/status labels, persistence target, and bounded error category.

Why it improves UX:

- Users can find recent uploaded resume PDFs after navigating within the same browser profile instead of losing the link after the upload toast disappears.
- Users can remove an uploaded PDF artifact from the provider-backed file service through the same Resume Builder surface instead of needing a separate manual cleanup path.

Control and safeguards:

- Upload and delete are separate explicit actions.
- Delete requires confirmation before the provider delete call.
- The artifact library stores only normalized URL, display filename, active/deleted status, upload timestamp, and optional deletion timestamp for the current user; analytics excludes artifact URLs, filenames, generated file bytes, resume content, and raw provider errors.
- The backend delete path only accepts URLs that resolve to the local `/api/v1/files/download/{folder}/{fileName}` shape with safe path parts.
- Account-synced artifact metadata and recent local delete receipts are now available with local fallback; formal provider retention policy, backend object revocation proof, and lifecycle audit remain follow-up work.

### 8.175 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeArtifactLibrary.test.ts src/services/fileUploadService.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts src/services/profileService.test.ts` passed: 6 test files, 29 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 344 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.176 Uploaded Resume PDF Copy-Link Control

Changed:

- Added a Copy Link action to each uploaded PDF artifact in Resume Builder.
- Added a normalized artifact-link clipboard helper that uses the Clipboard API when available and falls back to a temporary textarea copy path.
- Reused artifact URL normalization so unsafe or unsupported URLs are rejected before copying.
- Added privacy-bounded resume artifact analytics for copy success and copy failure using artifact counts, provider-PDF method label, persistence target, and bounded error category only.

Why it improves UX:

- Users can share a reviewed uploaded resume PDF with one click instead of opening the PDF in a new tab, selecting the browser address, and copying it manually.
- The copy action sits next to Open PDF and Delete, so artifact review, sharing, and cleanup remain in one workflow.

Control and safeguards:

- Copy is a separate explicit action and never sends, uploads, deletes, or mutates resume data.
- Invalid artifact URLs are blocked before clipboard access.
- Analytics excludes artifact URLs, filenames, generated file bytes, resume content, clipboard contents, and raw provider or browser errors.
- Users still retain Open PDF as a fallback if clipboard access is unavailable.

### 8.177 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeArtifactLibrary.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/fileUploadService.test.ts src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts src/services/profileService.test.ts` passed: 6 test files, 31 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 346 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.178 Account-Synced Resume Artifact Metadata

Changed:

- Added `resume_artifacts` schema support in Supabase with user-owned RLS and a profile-service migration with active/deleted status, upload timestamp, optional deletion timestamp, and user/status/uploaded indexes.
- Added profile-service methods to load active resume artifacts, upsert uploaded artifact metadata, and mark artifact metadata deleted after confirmed file-service deletion.
- Upgraded Resume Builder artifact records with stable IDs, account/local persistence labels, active/deleted status, and local tombstones.
- Updated Resume Builder to load local artifacts immediately, merge account-synced active artifacts when available, suppress locally deleted artifacts until account sync catches up, sync uploads, and sync delete metadata.
- Added privacy-bounded resume artifact analytics for account artifact load failure and sync failure using only artifact counts, provider-PDF label, persistence target, and bounded error category.

Why it improves UX:

- Uploaded resume PDF links can follow the user across devices when account storage is available instead of being limited to one browser's local storage.
- Users who delete an artifact get local cleanup immediately while account metadata catches up, reducing stale link confusion.

Control and safeguards:

- Upload, copy, open, and delete remain separate explicit actions.
- Delete metadata is marked only after the user confirms deletion and the file-service delete call succeeds.
- Local tombstones prevent stale account records from reappearing in the same browser after a local delete.
- Analytics excludes artifact URLs, filenames, generated file bytes, resume content, clipboard contents, and raw provider/browser errors.
- Recent local delete receipts are now available; formal provider retention policy, backend object revocation proof, and lifecycle audit remain follow-up work.

### 8.179 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeArtifactLibrary.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/profileService.test.ts src/services/fileUploadService.test.ts src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts` passed: 6 test files, 37 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 352 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 45 direct Supabase tables, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.180 Reviewed DOCX Resume Import

Changed:

- Added DOCX support to Resume Builder import using a lightweight local ZIP/OpenXML reader for `word/document.xml`.
- Added readable DOCX text extraction to the same reviewed import pipeline used for pasted text and text/markdown files.
- Updated the Import Text modal to accept `.docx` files while keeping PDF as an explicit unsupported format.
- Added bounded DOCX file-type analytics for import load/failure without recording filenames or document contents.

Why it improves UX:

- Users can import many common resume files directly instead of manually opening a DOCX elsewhere, selecting all text, copying it, and pasting it into Resume Builder.
- The existing review model stays intact: DOCX import only fills the import textarea and detected draft/profile-row review; it does not save profile fields, skills, work experience, or education automatically.

Control and safeguards:

- DOCX parsing happens locally in the browser from the document body text.
- Unsupported or unreadable files show explicit failure feedback.
- Apply Selected is still required before editor fields change, Save Skills and Save Rows are still separate, and Save Changes is still required before profile-backed fields persist.
- Analytics records only bounded file type, source type, input length band, counts, and error category; DOCX contents, filenames, contact details, detected values, and raw errors are excluded.
- Scanned-PDF OCR and backend-audited import recommendations remain follow-up work; searchable-PDF import is addressed in UX-160.

### 8.181 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/profileService.test.ts src/lib/resumeArtifactLibrary.test.ts src/lib/resumePdfExport.test.ts src/lib/resumeExportHistory.test.ts` passed: 6 test files, 38 tests.
- Focused post-fix validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeWorkflowAnalytics.test.ts` passed: 2 test files, 14 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 356 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 45 direct Supabase tables, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.182 Reviewed Resume Profile Row Import

Changed:

- Added conservative work-experience and education extraction to the same resume import parser used by pasted text, supported text files, readable DOCX files, and later searchable PDF files.
- Required usable date ranges before suggesting profile rows so saves can use the existing profile service contracts without placeholder dates.
- Filtered detected rows against existing profile work history and education to avoid duplicate suggestions.
- Added a reviewed profile-row section to the Resume Builder import modal with explicit checkboxes and a separate Save Rows action.
- Added partial-success handling and privacy-bounded analytics for detected, selected, saved, and failed experience/education counts.

Why it improves UX:

- Users can convert resume work-history and education content into profile rows without retyping each row in the Profile page.
- The import review now covers the most repetitive profile setup work beyond basic fields and skills.

Control and safeguards:

- Row suggestions are never saved automatically.
- Users can deselect each detected row before saving.
- Save Rows is separate from Apply Selected, Save Skills, and Save Changes, preserving the existing control model for editor fields and profile skills.
- Saved rows remain editable/removable from Profile.
- Analytics records only bounded row counts and excludes resume contents, row titles, company names, institution names, descriptions, filenames, contact details, and raw errors.
- Scanned-PDF OCR and backend-audited import recommendations remain follow-up work; searchable-PDF import is addressed in UX-160.

### 8.183 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeWorkflowAnalytics.test.ts` passed: 2 test files, 17 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 359 tests.
- `npm run build --workspace talentsphere-web` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.184 Reviewed Profile Photo Upload

Changed:

- Replaced the own-profile photo unavailable control with a real file picker and reviewed upload modal.
- Added image-only validation and a 2 MB client-side limit before any network upload.
- Uploaded approved avatars through file-service only after explicit preview confirmation.
- Persisted the uploaded image URL to `profiles.avatar_url` through `profileService.updateAvatar`.
- Updated Profile header rendering to read avatar URLs from both flat profile fields and nested `profiles.avatar_url`.
- Attempted file-service cleanup when avatar upload succeeds but profile persistence fails.
- Added privacy-bounded profile photo analytics for open, review, cancel, validation, success, and failure states.

Why it improves UX:

- Users can complete a visible profile identity task directly from the Profile header instead of hitting an unavailable camera action.
- Existing uploaded avatars now render consistently when they arrive in nested profile data.

Control and safeguards:

- Selecting a file does not upload it immediately.
- Users see a preview and must press Upload Photo before the profile changes.
- Unsupported and oversized images are blocked before network calls.
- Analytics excludes image URLs, file names, avatar contents, profile text, and raw provider errors.
- Provider retention/revocation proof remains follow-up work; explicit photo removal is covered in UX-159 and crop controls are covered in UX-161.

### 8.185 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/profileWorkflowAnalytics.test.ts src/services/profileService.test.ts` passed: 2 test files, 15 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 362 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.186 Explicit Profile Photo Removal

Changed:

- Added a visible Remove Profile Photo action on own-profile avatars.
- Added a confirmation modal that previews the current avatar and explains the initials fallback before clearing the photo.
- Extended `profileService.updateAvatar` to support `null` avatar persistence for `profiles.avatar_url`.
- Updated Profile local state after removal so the header immediately switches to initials.
- Added best-effort file-service cleanup after profile avatar clearing succeeds.
- Added privacy-bounded profile photo removal analytics for review, cancel, success, and failure states.

Why it improves UX:

- Users can remove an outdated or unwanted profile photo from the same header area where they manage uploads.
- Users no longer need to upload a replacement image or ask for manual data cleanup to restore initials.

Control and safeguards:

- Removal requires explicit confirmation in a modal.
- File-service deletion is attempted only after profile avatar persistence succeeds.
- The profile remains valid if provider cleanup fails; the user-facing avatar field is already cleared.
- Analytics excludes image URLs, file names, avatar contents, profile text, raw provider errors, and cleanup details.

### 8.187 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/profileWorkflowAnalytics.test.ts src/services/profileService.test.ts` passed: 2 test files, 17 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 364 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.188 Local Searchable-PDF Resume Import

Changed:

- Added `.pdf` as a supported Resume Builder import file type when the PDF contains readable text-layer content.
- Added a local PDF text-stream extractor that can read the app's own native resume PDFs and other simple searchable PDFs without a provider handoff.
- Routed extracted PDF text through the existing reviewed parser for resume fields, detected profile skills, work experience, and education suggestions.
- Updated file input acceptance, Import Text modal helper copy, and failure feedback for searchable versus scanned/image-only PDFs.
- Added privacy-bounded PDF import analytics coverage for normalized file type and input length band without file names or extracted text.

Why it improves UX:

- Users can import common searchable PDF resumes directly instead of opening a PDF elsewhere and manually copying text into Resume Builder.
- Users keep the existing review model for detected fields, skills, and profile rows instead of having imported content applied automatically.

Control and safeguards:

- PDF parsing happens locally in the browser.
- Scanned or unreadable PDFs fail with explicit guidance rather than uploading the file for OCR.
- Apply Selected is still required before editor fields change.
- Save Skills and Save Rows remain separate explicit actions.
- Save Changes is still required before profile-backed resume fields persist.
- Analytics excludes PDF contents, extracted text, file names, contact details, detected values, and raw errors.

### 8.189 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeWorkflowAnalytics.test.ts` passed: 2 test files, 21 tests.
- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumePdfExport.test.ts` passed: 1 test file, 3 tests.
- Focused post-fix validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeImportDrafts.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/lib/resumePdfExport.test.ts` passed: 3 test files, 24 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 58 test files, 368 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.190 Reviewed Profile Photo Crop Controls

Changed:

- Added reusable profile-avatar crop helpers for crop normalization, source-rectangle math, preview style mapping, and cropped image export.
- Added Zoom, Horizontal, Vertical, and Reset Crop controls to the own-profile photo review modal.
- Updated the circular preview so users see the selected framing before upload.
- Changed confirmed profile-photo upload to generate a local square cropped JPEG before sending the avatar to file-service.
- Added a bounded crop failure category without recording crop coordinates, file names, or image contents.

Why it improves UX:

- Users can correct avatar framing during the existing review step instead of editing the image outside the product and re-uploading.
- The uploaded image now matches the circular preview users approve.

Control and safeguards:

- Selecting a file still does not upload it immediately.
- Crop controls are manually adjusted and resettable.
- Upload Photo remains the only action that sends the cropped avatar to file-service.
- Crop generation happens locally in the browser.
- Failed crop/export attempts stop upload and show failure feedback.
- Analytics excludes image URLs, file names, avatar contents, crop coordinates, profile text, raw provider errors, and generated image bytes.

### 8.191 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/profileAvatarCrop.test.ts src/lib/profileWorkflowAnalytics.test.ts src/services/profileService.test.ts` passed: 3 test files, 21 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 372 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.192 Uploaded PDF Delete Receipts

Changed:

- Extended resume artifact tombstones with sanitized file labels, deletion timestamps, and local/server persistence targets.
- Loaded the latest local deletion receipts into Resume Builder with the active uploaded-PDF artifact library.
- Added a Deleted PDF Receipts section inside Export Activity after confirmed provider-backed PDF deletion.
- Kept the receipt UI URL-free while preserving existing explicit Open, Copy Link, and Delete controls for active artifacts.
- Added focused unit coverage for receipt sanitization, duplicate URL handling, unsafe URL rejection, and persistence target normalization.

Why it improves UX:

- Users can see that a recent uploaded resume PDF deletion completed even after the active link disappears.
- The receipt appears in the same export/artifact surface where users already manage uploaded PDFs, reducing cleanup ambiguity.

Control and safeguards:

- Receipts are written only after the user confirms deletion and the file-service provider delete call succeeds.
- Deleted artifact URLs are not displayed in the receipt UI.
- Receipts are local, recent, sanitized, and do not add a new automatic deletion path.
- Account metadata sync remains best effort and visible through existing local/server labels and sync warnings.
- Formal provider retention policy, backend object revocation proof, and lifecycle audit remain follow-up work.

### 8.193 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeArtifactLibrary.test.ts src/lib/resumeWorkflowAnalytics.test.ts src/services/profileService.test.ts` passed: 3 test files, 29 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 373 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.194 Accessible Uploaded PDF Delete Confirmation

Changed:

- Replaced the uploaded-PDF browser confirmation in Resume Builder with an in-app Delete Uploaded PDF review modal.
- Moved provider deletion behind a separate destructive Delete PDF confirmation button.
- Added privacy-bounded resume artifact analytics for delete review opened and delete review cancelled decisions.
- Improved the shared modal shell with dialog semantics, labeled title wiring, Escape handling, initial focus, Tab focus containment, and focus restoration.
- Preserved the existing provider delete, local artifact removal, local delete receipt, account metadata sync, and privacy-bounded analytics behavior.

Why it improves UX:

- Users get a consistent app-native confirmation instead of a browser prompt that is hard to style, explain, or audit.
- Keyboard users can enter, navigate, cancel, and leave the modal predictably.
- The modal explains that the active link disappears and a local receipt remains, reducing confusion before cleanup.

Control and safeguards:

- Clicking Delete on an artifact row only opens the review modal.
- The provider delete call runs only after the user clicks the destructive Delete PDF button.
- Cancel, backdrop, and Escape close the review when no delete is in progress without mutating artifacts.
- Analytics records only action labels, counts, persistence target, and provider-PDF method; it excludes artifact URLs, filenames, generated files, resume content, clipboard contents, and raw provider errors.
- Deleted artifact receipts remain URL-free.

### 8.195 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/resumeWorkflowAnalytics.test.ts src/lib/resumeArtifactLibrary.test.ts` passed: 2 test files, 19 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 373 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.196 Reviewed Recruiter Job-Post Template Deletion

Changed:

- Added a pending delete-review state for recruiter job-post templates on the full Post Job page.
- Changed the template Delete action to open a Delete Job Template confirmation modal instead of removing the selected template immediately.
- Moved local template removal, selected-template clearing, status copy, and best-effort account delete sync behind an explicit Delete Template confirmation button.
- Added modal copy that clarifies current form fields, draft history, saved jobs, published jobs, candidates, and notifications are unchanged.
- Reused the shared accessible modal shell for dialog semantics, Escape handling, focus containment, and focus restoration.

Why it improves UX:

- Recruiters can safely review a template deletion before losing a reusable posting draft.
- The modal reduces accidental clicks in a dense posting workspace and explains the exact mutation boundary.

Control and safeguards:

- Clicking Delete on the template toolbar only opens the review modal.
- Cancel closes the review without deleting or changing the selected template.
- Delete Template removes only the selected template record and leaves the active draft fields unchanged.
- Template account deletion remains best effort with visible fallback status when sync is unavailable.
- The flow does not save a job, publish a job, alter draft history, contact candidates, send messages, submit applications, or create notifications.

### 8.197 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/jobPostTemplates.test.ts src/lib/jobPostReview.test.ts src/lib/jobPostDraftHistory.test.ts` passed: 3 test files, 26 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 373 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.198 Reviewed Saved-Search Deletion

Changed:

- Added a pending saved-search delete-review state to Jobs.
- Changed the saved-search trash action to open a Delete Saved Search confirmation modal instead of deleting immediately.
- Moved local saved-search removal and best-effort account delete sync behind the modal's explicit Delete Search action.
- Added consequence copy explaining that saved filters and new-match tracking for the selected search will stop while current Explore filters, job cards, applications, and hidden-job preferences are unchanged.
- Extended saved-search analytics with delete-review-opened and delete-cancelled events that keep saved-search names and raw search text out of telemetry.

Why it improves UX:

- Users get a clear recovery point before losing a reusable search and its match-tracking baseline.
- The modal explains exactly what changes and what remains untouched, reducing cognitive load around a compact destructive icon.

Control and safeguards:

- Clicking the trash icon only opens review.
- Cancel closes review without changing saved-search state.
- Delete Search removes only the selected saved-search preference and then attempts account sync.
- Analytics is append-only and privacy-bounded.
- The flow does not apply filters, submit applications, edit hidden-job preferences, mutate job records, contact recruiters, send messages, or create notifications automatically.

### 8.199 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/savedSearchAnalytics.test.ts src/services/jobService.test.ts` passed: 2 test files, 35 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 374 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.200 Reviewed Application Draft Clearing

Changed:

- Added inline clear-review state inside the Jobs application review modal.
- Changed the Clear draft button to open an in-context confirmation panel before removing editable resume URL or cover letter fields.
- Added Keep Draft and Clear Draft controls while preserving the existing before-clear draft-history checkpoint when the user confirms.
- Closed pending clear review automatically when draft content changes through manual edit, profile draft, AI draft, restored history, modal close, or opening another application review.
- Extended application workflow analytics with clear-review-opened and clear-cancelled events that keep resume URLs and cover letter text out of telemetry.

Why it improves UX:

- Users get a clear recovery point before wiping application draft content.
- The confirmation stays in the application review context, so users do not need to parse another modal while they are already inside a submit-review flow.

Control and safeguards:

- Clear only opens review.
- Keep Draft closes the review without changing draft content.
- Clear Draft removes only the editable application draft fields and keeps a before-clear history version for recovery.
- Submit Application remains a separate explicit action.
- The flow does not submit applications, contact employers, apply filters, change saved searches, mutate job records, or create notifications automatically.

### 8.201 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/applicationWorkflowAnalytics.test.ts src/services/applicationService.test.ts src/services/jobService.test.ts` passed: 3 test files, 38 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 375 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.202 Reviewed Profile-Draft Replacement

Changed:

- Added inline profile-draft replace-review state inside the Jobs application review modal.
- Kept fast profile-draft application for blank or unchanged drafts.
- Changed Use Profile Draft to open a replacement review when the editable application draft already has resume URL or cover letter content that would be overwritten.
- Added current/profile draft field-presence summaries plus Keep Current and Replace Draft controls.
- Preserved the current draft as a recent checkpoint before confirmed replacement, then applied the generated profile draft into the editable form.
- Extended application workflow analytics with profile-draft review-opened and cancelled events that do not record resume URLs or cover letter text.

Why it improves UX:

- Users can safely use generated profile drafts without accidentally overwriting hand-written application content.
- Blank-draft application remains fast, while non-blank replacement gets a clear confirmation and recovery path.

Control and safeguards:

- Use Profile Draft only opens review when existing content would be replaced.
- Keep Current closes the review without changing draft content.
- Replace Draft updates only the editable application draft and keeps Submit Application as a separate explicit action.
- The flow does not submit applications, contact employers, apply filters, change saved searches, mutate job records, or create notifications automatically.

### 8.203 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/applicationWorkflowAnalytics.test.ts src/services/applicationService.test.ts src/services/jobService.test.ts` passed: 3 test files, 39 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 376 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.204 Reviewed Starter-Code Reset

Changed:

- Added inline starter-code reset review state inside the Challenges workspace.
- Kept unchanged-code reset fast when the editor already matches starter code.
- Changed Reset to open a review panel when edited solution code would be overwritten.
- Added Keep Code and Reset Code controls that make the consequence explicit before replacing editor contents.
- Cleared the pending reset review when users edit the solution, change language, open another challenge workspace, or close the workspace.
- Extended challenge workflow analytics with reset-review-opened and cancelled events that do not record solution code, starter code, prompt text, sample values, outputs, or feedback.

Why it improves UX:

- Users can safely inspect or use the reset control without accidentally losing edited solution code.
- Unchanged-code reset remains lightweight, while destructive reset now gets an inline confirmation and recovery path.

Control and safeguards:

- Reset only opens review when existing editor content differs from starter code.
- Keep Code closes the review without changing editor content.
- Reset Code updates only the editable solution field and keeps Run Local Check and Submit Solution as separate explicit actions.
- The flow does not submit solutions, run checks, refresh retry history, change scores, contact anyone, create notifications, or mutate challenge records automatically.

### 8.205 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/challengeWorkflowAnalytics.test.ts` passed: 1 test file, 6 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 377 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.206 Reviewed Candidate Private-Review Reset

Changed:

- Added inline reset-review state inside the Candidate Details unsaved private review warning.
- Changed Reset Changes to open a consequence review before restoring private note and scorecard drafts to the last saved state.
- Added Keep Changes and Reset Drafts controls beside the existing Save Note and Save Scorecard recovery actions.
- Cleared the pending reset review when recruiters edit notes, edit scorecard evidence, change scorecard ratings, save notes, save scorecards, insert draft aids, switch candidates, or close details.
- Extended candidate workflow analytics with reset-review-opened, cancelled, and confirmed events that do not record private note text, scorecard evidence, scorecard ratings, resume URLs, or cover letters.

Why it improves UX:

- Recruiters can use the existing unsaved-edit guard without accidentally discarding private screening work.
- The preferred recovery actions, Save Note and Save Scorecard, stay visible while reset now requires an explicit second action.

Control and safeguards:

- Reset Changes only opens review; it does not immediately discard private review drafts.
- Keep Changes closes the review without changing note or scorecard drafts.
- Reset Drafts restores only local editable private-review fields to their last saved state.
- The flow does not save notes, create scorecards, change candidate status, send messages, schedule interviews, create notifications, contact candidates, mutate applications, or change saved server records automatically.

### 8.207 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/candidateWorkflowAnalytics.test.ts` passed: 1 test file, 6 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 59 test files, 378 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.208 Reviewed AI Chat Clearing

Changed:

- Added an inline Clear Chat review panel to the AI Assistant page.
- Changed the Clear header action so it opens review before starting a fresh local chat and best-effort deleting the previous account session.
- Added Keep Chat and Clear Chat controls with explicit non-mutating consequence copy.
- Cleared the pending review when users type, cancel a draft prompt, send a prompt, select a prompt suggestion, switch chat storage context, or confirm clear.
- Added a tested AI assistant workflow analytics helper for chat-clear review, cancellation, and confirmation events that does not record message content, prompts, recommendation text, generated responses, resume text, job descriptions, or raw errors.

Why it improves UX:

- Users can safely inspect the Clear action without losing useful AI conversation context.
- Starting over remains fast after confirmation, but accidental one-click history loss is prevented.

Control and safeguards:

- Clear only opens review; it does not immediately reset the chat.
- Keep Chat closes the review without changing conversation history.
- Clear Chat starts a fresh local AI chat only after explicit confirmation.
- The flow does not change profile, resume, applications, learning progress, settings, saved review decisions, messages, notifications, or destination workflow data automatically.

### 8.209 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/aiAssistantWorkflowAnalytics.test.ts` passed: 1 test file, 2 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 380 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.210 Reviewed Settings Account Deactivation

Changed:

- Renamed the Settings security destructive action from Delete Account to Deactivate Account to match the existing profile soft-delete service.
- Changed the typed confirmation phrase from `DELETE` to `DEACTIVATE`, accepting harmless casing and surrounding whitespace.
- Added consequence copy explaining that deactivation marks the profile inactive and does not cancel billing or erase provider records.
- Added cancellation handlers for password reset and account deactivation review modals, including Cancel, close button, Escape, and backdrop close paths.
- Extended settings workflow analytics with password-reset and account-deactivation cancellation events that do not record email addresses or confirmation text.

Why it improves UX:

- Security actions now use language that matches the actual backend behavior, reducing user confusion before a critical account action.
- Users can leave either security review without creating ambiguous analytics or changing their account.
- The confirmation input is still deliberate, but no longer fails because of incidental casing or spacing.

Control and safeguards:

- Update Password still only sends a reset email after explicit confirmation.
- Deactivate Account still only calls the existing soft-delete path after explicit confirmation.
- Cancelled reviews do not send reset emails, deactivate accounts, change settings, cancel billing, erase provider records, or mutate profile data.
- Analytics is append-only and excludes email addresses, typed confirmation text, profile field values, billing details, provider identifiers, and raw errors.

### 8.211 Validation Addendum

- Focused validation passed: `npm run test:unit --workspace talentsphere-web -- src/lib/settingsWorkflowAnalytics.test.ts` passed: 1 test file, 6 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.212 Reviewed Extension Diagnostics Clearing

Changed:

- Changed the companion extension popup Diagnostics Local Analytics Clear action so it opens an inline review panel before emptying the local analytics queue.
- Added Keep and Clear Queue controls with event-count context and export-first guidance.
- Clarified that console logs, tracked jobs, scanned drafts, prep cards, and extension settings are not changed by clearing local analytics.
- Added Usage Diagnostics-gated operational events for clear-review opened and cancelled outcomes.
- Preserved the confirmed-clear behavior that leaves the analytics queue empty, so clearing does not create a new retained event.

Why it improves UX:

- Users can avoid accidental loss of their local troubleshooting trail.
- The export action remains discoverable next to the clear review, improving recovery before destructive local cleanup.

Control and safeguards:

- Clear only opens review; it does not immediately remove diagnostics.
- Keep closes the review without changing the queue.
- Clear Queue empties only the local analytics queue after explicit confirmation.
- The flow does not delete console logs, tracked jobs, scanned drafts, prep cards, settings, web-app data, provider records, or account data.
- Review-opened and cancelled analytics remain Usage Diagnostics-gated and bounded; confirmed clear leaves the queue empty.

### 8.213 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.214 Reviewed Extension Prep-Card Clearing

Changed:

- Changed the Options Interview Planner Clear All action so it opens an inline review panel before deleting local prep cards.
- Changed the Settings reset action from Clear Database to Clear Prep Cards with scope-specific copy.
- Added the same reviewed Keep Cards / Clear Cards decision from Settings.
- Added Usage Diagnostics-gated operational events for prep-card clear review, cancellation, confirmed clearing, and Settings reset review without recording prep topics or notes.
- Auto-closes the review if the prep-card list becomes empty before confirmation.

Why it improves UX:

- Users are less likely to lose local interview preparation work from a single click.
- Settings now accurately describes the operation scope instead of implying a full database reset.
- The reviewed confirmation keeps destructive local cleanup available without making it surprising.

Control and safeguards:

- Clear All and Clear Prep Cards only open review; they do not immediately clear data.
- Keep Cards closes the review without changing prep cards.
- Clear Cards removes only local interview planner cards after explicit confirmation.
- The flow does not clear tracked jobs, scanned drafts, diagnostics analytics, extension settings, web-app data, provider records, or account data.
- Analytics records only bounded counts, scope, and entry point; it does not record prep-card topics or notes.

### 8.215 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.216 Reviewed Extension Tracked-Job Removal

Changed:

- Changed the companion extension popup Tracker trash action so it opens an inline review before deleting a local tracked job.
- Added Keep Job and Remove Job controls with selected-row consequence copy.
- Kept confirmed deletion in the existing parent handler so `ts_jobs`, diagnostics logs, and the existing `job_deleted` operational event still update in one place.
- Added Usage Diagnostics-gated operational events for delete-review opened and cancelled outcomes.
- Auto-closes the delete review if the selected row disappears before confirmation.

Why it improves UX:

- Users can avoid accidental loss of a locally tracked job row.
- The row-level review makes the destructive scope clear while keeping removal fast after confirmation.

Control and safeguards:

- The trash icon only opens review; it does not immediately remove the tracker row.
- Keep Job closes review without changing the tracker.
- Remove Job deletes only the selected local tracker row after explicit confirmation.
- The flow does not clear scanned drafts, diagnostics analytics, prep cards, settings, web-app applications, provider records, or account data.
- Review-opened and cancelled analytics record only bounded status/count/source flags; they do not record company names, roles, notes, or URLs.

### 8.217 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.218 Reviewed Extension Scanned-Draft Discard

Changed:

- Changed the companion extension popup Tracker scanned-draft X action so it opens an inline review before clearing the local draft.
- Added Keep Draft and Discard Draft controls with draft-scope consequence copy.
- Kept confirmed discard in the existing parent handler so `ts_job_draft`, diagnostics logs, and the existing `scanned_draft_discarded` operational event still update in one place.
- Added Usage Diagnostics-gated operational events for discard-review opened and cancelled outcomes.
- Auto-closes the discard review when the scanned draft changes or the user edits the draft again.

Why it improves UX:

- Users can avoid accidental loss of an editable page-scan draft.
- The review makes the discard scope clear while preserving the fast cleanup path after confirmation.
- Resuming editing closes the review, which prevents a stale confirmation from hanging around after intent changes.

Control and safeguards:

- The X icon only opens review; it does not immediately clear the scanned draft.
- Keep Draft closes review without changing the draft.
- Discard Draft clears only the local scanned draft after explicit confirmation.
- The flow does not remove tracked jobs, diagnostics analytics, prep cards, settings, web-app applications, provider records, or account data.
- Review-opened and cancelled analytics record only bounded status/count/source flags; they do not record company names, roles, notes, URLs, or raw page content.

### 8.219 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.220 Reviewed Extension Console-Log Clearing

Changed:

- Changed the companion extension popup Diagnostics Clear Console action so it opens an inline review before clearing visible session logs.
- Added Keep Logs and Clear Logs controls with copy that separates console logs from local analytics, tracked jobs, scanned drafts, prep cards, and settings.
- Kept confirmed clearing in the existing parent handler so only the visible popup log stream is emptied and the existing `logs_cleared` operational event still fires from one place.
- Added Usage Diagnostics-gated operational events for console-log clear-review opened and cancelled outcomes.
- Auto-closes the clear review if the visible log stream becomes empty before confirmation.

Why it improves UX:

- Users can avoid accidental loss of a short troubleshooting trail during extension diagnostics.
- The reviewed confirmation makes the cleanup scope explicit while keeping the cleanup action quick after confirmation.
- The diagnostics panel now treats both local analytics clearing and visible console-log clearing consistently.

Control and safeguards:

- Clear Console only opens review; it does not immediately clear visible logs.
- Keep Logs closes review without changing the log stream.
- Clear Logs removes only visible popup-session logs after explicit confirmation.
- The flow does not clear local analytics, tracked jobs, scanned drafts, prep cards, settings, web-app data, provider records, or account data.
- Review-opened and cancelled analytics record only bounded counts and scope; they do not record log text, raw errors, company names, roles, notes, URLs, or raw page content.

### 8.221 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.222 Explicit Extension Local-Only Sync Status

Changed:

- Replaced the companion extension Settings cloud-sync toggle with an explicit Local only state because authenticated extension-to-web sync is not implemented.
- Added a Review Plan action that opens inline copy explaining which extension records remain browser-local.
- Changed the options footer from Database Sync: Connected to Local Storage: Active.
- Stopped reading or writing the legacy cloud-sync toggle during settings changes while keeping notification and Usage Diagnostics toggles available.
- Added Usage Diagnostics-gated operational events for cloud-sync plan review open/close without recording raw extension data.

Why it improves UX:

- Users no longer see a setting that implies unavailable backend sync.
- The local-only status sets correct expectations before users rely on the extension across browsers or devices.
- The sync-plan review keeps future automation visible without pretending the current product can move records automatically.

Control and safeguards:

- Review Plan is informational only; it does not import, export, sync, or modify records.
- Tracked jobs, scanned drafts, prep cards, diagnostics logs, local analytics, web-app applications, provider records, and account data remain unchanged.
- Notification and Usage Diagnostics settings continue to require explicit user toggles.
- Analytics records only bounded setting/context flags; it does not record tracked job details, draft content, prep topics, diagnostics log text, URLs, or raw page content.

### 8.223 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.224 Local Usage Diagnostics Wording

Changed:

- Renamed the companion extension Settings toggle from Share Usage Diagnostics to Store Local Usage Diagnostics.
- Replaced telemetry-sharing copy with local-only storage copy that explains the bounded diagnostics queue stays in this browser.
- Clarified that diagnostics export remains manual and raw content is not stored.
- Added accessible pressed-state semantics and labels to the interview-notification and local-diagnostics toggles.
- Preserved the existing Usage Diagnostics storage key and operational-event behavior.

Why it improves UX:

- Users can understand whether diagnostics are uploaded, shared, or stored locally without reading technical docs.
- The setting now matches the actual data path: bounded local events in `ts_extension_operational_analytics`.
- Clearer copy reduces privacy concern and prevents misplaced expectations about remote telemetry.

Control and safeguards:

- The toggle remains explicit and opt-in.
- Export remains a separate manual action from the Diagnostics tab.
- Enabling diagnostics does not scan pages, sync records, send extension data to the web app, modify tracker jobs, clear logs, create prep cards, submit applications, or contact external providers.
- Analytics records only bounded metadata; raw URLs, company names, roles, notes, resume text, job descriptions, prep topics, page content, generated reports, raw log text, and raw errors are not stored.

### 8.225 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.226 Local Interview Reminder Preference Wording

Changed:

- Renamed the companion extension Settings row from Interview Notifications to Interview Reminder Preference.
- Replaced notification-scheduling copy with local-preference copy that says browser notifications are not scheduled yet.
- Updated the toggle accessibility label to match the local preference scope.
- Preserved the existing local `ts_settings_notif` storage key and `setting_changed` operational event behavior.
- Documented that toggling the preference does not request notification permission, schedule reminders, or create browser notifications.

Why it improves UX:

- Users no longer expect the extension to schedule reminders that it cannot currently deliver.
- The setting remains useful as a future reminder preference while accurately describing current behavior.
- Trust improves because the extension does not overstate active background capabilities.

Control and safeguards:

- The toggle stores only a local preference.
- The manifest still does not request browser notification or alarm permissions.
- Toggling the preference does not create notifications, schedule alarms, request browser permissions, sync data, modify tracker jobs, change scanned drafts, clear logs, create prep cards, or mutate web-app records.
- Analytics records only bounded setting/context flags and does not record prep topics, tracked-job details, draft content, URLs, raw page content, or log text.

### 8.227 Validation Addendum

- Focused validation passed: `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.228 Local Diagnostics Test Event Wording

Changed:

- Renamed the companion extension popup Diagnostics button from Simulate Sync to Log Test Event.
- Replaced the parent handler and Usage Diagnostics-gated analytics event name with `local_diagnostic_test_event_logged`.
- Updated the local diagnostics log message so it describes a popup-session test event.
- Added icon-plus-label affordances and accessible labels to the Log Test Event and Ping Worker controls.
- Documented that Log Test Event is local-only and does not import, export, sync, or contact the web app.

Why it improves UX:

- Users no longer see a sync-related command in a product area where authenticated sync is explicitly not available.
- The action name now matches the actual outcome: a local diagnostics line and optional bounded local analytics event.
- The diagnostics controls are easier to scan because the two actions use recognizable tool icons plus concise labels.

Control and safeguards:

- Log Test Event does not call the background worker, web app, provider APIs, or sync services.
- It does not scan active pages, create or delete tracker jobs, modify scanned drafts, clear logs, create prep cards, change settings, export data, import data, or mutate provider records.
- The analytics event remains Store Local Usage Diagnostics-gated and stores only bounded metadata.

### 8.229 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.230 Local Resume Match Preview

Changed:

- Renamed the companion extension options tab and popup dashboard card from AI Resume Matcher/Optimizer to Resume Match Preview.
- Replaced fixed simulated scoring with a deterministic local keyword-overlap report derived from the pasted job description and resume text.
- Updated the result panel to show keyword coverage, matched job keywords, missing job keywords, and local editing suggestions.
- Replaced AI/embedding loading and action copy with local preview wording.
- Preserved the existing local-only workflow and kept Store Local Usage Diagnostics events bounded to length bands, keyword-count bands, and score bands.

Why it improves UX:

- Users now receive a first-pass comparison that reflects their pasted content instead of a static mock report.
- The feature name sets accurate expectations: it is a local preview, not a provider-backed AI optimizer.
- Matched and missing keyword lists reduce manual scanning effort while leaving resume edits under user control.

Control and safeguards:

- The preview does not save, rewrite, upload, or sync resume text or job descriptions.
- It does not call external AI, web-app APIs, provider APIs, or background sync services.
- Operational analytics does not store pasted text, extracted keywords, generated suggestions, URLs, company names, role names, or raw errors.

### 8.231 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.232 Local Tracker Dashboard Wording

Changed:

- Renamed the companion extension popup counter from Total Applications to Tracked Jobs.
- Replaced the counter helper text with "local tracker records".
- Renamed Active Tab Analyzer to Page Scan Draft.
- Replaced guaranteed scraping copy with editable local draft copy for the page-scan action.
- Preserved the existing scan, tracker, options handoff, storage, and diagnostics behavior.

Why it improves UX:

- Users can distinguish browser-local tracked jobs from account applications and web-app job catalog data.
- The page-scan control now describes the actual workflow: create an editable local draft before saving anything.
- The dashboard requires less interpretation because labels match the local-only extension data model.

Control and safeguards:

- The popup still only counts `ts_jobs` local tracker records.
- Page Scan Draft still runs only after the user presses Scan Webpage.
- Scanned content remains reviewable and editable before saving to the local tracker.
- The wording change does not sync data, create applications, change tracker rows, submit resumes, clear diagnostics, or contact provider APIs.

### 8.233 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.234 Local Settings And Prep Reset Analytics

Changed:

- Renamed the companion extension options navigation from System Settings to Local Settings.
- Replaced the Settings page eyebrow/header with Local Preferences and Companion Settings.
- Reworded the Settings intro around browser-local sync status, reminder preferences, diagnostics storage, and prep-card reset controls.
- Renamed Settings-origin prep-card clear operational events from `diagnostic_reset_*` to `prep_cards_reset_*`.
- Renamed the Settings prep-card reset button id from `reset-diagnostics-btn` to `reset-prep-cards-btn`.
- Safelisted only bounded local diagnostics metadata for `diagnostic_action`, `job_keyword_count_band`, `matched_keyword_count_band`, and `missing_keyword_count_band`.

Why it improves UX and product learning:

- Users no longer see a browser-local extension preferences page framed as system administration.
- Product and support analytics can distinguish prep-card reset review/cancel/confirm outcomes from diagnostics clearing.
- Resume Match Preview and Log Test Event diagnostics retain useful bounded context without storing pasted content or extracted keywords.

Control and safeguards:

- Prep-card reset still requires explicit review and confirmation.
- Confirming from Settings clears only local prep cards.
- The flow does not clear tracked jobs, scanned drafts, diagnostics logs, local analytics exports, settings, web-app data, or provider records.
- The added diagnostics fields are bounded categories/count bands only; raw resume text, job descriptions, extracted keywords, diagnostic logs, URLs, company names, role names, and raw errors remain excluded.

### 8.235 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.236 Local Tracker Terminology Consistency

Changed:

- Reworded the companion extension tracker add log from "Tracked new application" to "Tracked new job".
- Reworded the companion extension tracker delete log from "Removed application" to "Removed tracked job".
- Reworded the Settings prep-card clear review scope from tracked applications to tracked jobs.
- Preserved the existing local storage, reviewed removal, prep-card reset, diagnostics, scanned draft, settings, and notification behavior.

Why it improves UX:

- Users now see the same local tracked-job terminology across the popup dashboard, tracker logs, delete review, and Settings reset review.
- The extension no longer implies that adding or removing a browser-local tracker row is the same as submitting or withdrawing a web-app application.
- The reset review requires less interpretation because it names the local tracker data that remains untouched.

Control and safeguards:

- The update is copy-only and does not change add, delete, sync, analytics, or reset behavior.
- Adding tracked jobs still requires an explicit save action.
- Removing tracked jobs still uses the existing inline review before deleting the local tracker row.
- Clearing prep cards still requires explicit Settings review and confirmation.
- No web-app applications, provider records, diagnostics logs, scanned drafts, local analytics exports, settings, notification preferences, or external systems are changed by this wording update.

### 8.237 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.238 First-Run Tracker And Web Preview Trust

Changed:

- Removed seeded sample tracker rows from the companion extension popup default state.
- Added a No tracked jobs yet state with a direct Add Job action.
- Added a No matching tracked jobs state with a direct Clear Filter action.
- Added accessible label, controls, and expanded-state semantics to the Add Job form toggle.
- Changed web-preview messaging for `analyze_page` so it reports that the Chrome extension runtime is unavailable instead of returning a fake scanned draft.
- Changed diagnostics ping handling so unavailable web-preview runtime responses are logged as warnings rather than successful background-worker pings.

Why it improves UX:

- New users no longer see sample company records that could be mistaken for synced or real tracked jobs.
- Empty and filtered tracker states now explain what happened and provide a direct recovery action.
- Page Scan Draft no longer appears to work in a non-extension preview where no active tab can actually be inspected.
- Diagnostics feedback is more trustworthy because the preview runtime is labeled unavailable instead of active.

Control and safeguards:

- The tracker still creates rows only through explicit Add Job or Save to Tracker actions.
- The real Chrome extension runtime still scans only after the user clicks Scan Webpage.
- Web preview mode does not create drafts, tracked jobs, diagnostics success states, applications, sync jobs, provider requests, or external side effects.
- Existing local `ts_jobs`, `ts_job_draft`, settings, prep cards, diagnostics analytics, and web-app data are not migrated or cleared by this change.

### 8.239 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.240 First-Run Prep Cards And Pending Match Score

Changed:

- Removed seeded interview preparation cards from the options page default `ts_prep` state.
- Added a No preparation cards yet state that points users back to the browser-local prep-card form.
- Added `aria-controls`, `aria-expanded`, and scope-specific labeling to the Clear All prep-card control.
- Changed Resume Match Preview so keyword coverage shows `--` while comparison is running rather than displaying the previous default 65% score.
- Reset the initial score state to 0 so no stale placeholder score is available before a computed report exists.

Why it improves UX:

- First-run options users no longer see sample prep tasks that could be mistaken for previously saved local work.
- The prep planner has a clear empty state instead of a blank list.
- Resume Match Preview no longer mixes a computed local report with a mock-looking interim score.
- Screen reader users get clearer relationship and expanded-state information for the destructive Clear All review.

Control and safeguards:

- Prep cards are still created only after explicit Add Plan Card submission.
- Clear All still requires reviewed confirmation and clears only local prep cards.
- Resume Match Preview remains read-only and does not edit or save resume content.
- The change does not migrate, clear, sync, or create local prep cards, tracked jobs, scanned drafts, analytics, settings, web-app applications, provider records, or external requests automatically.

### 8.241 Validation Addendum

- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.242 Career Path Generated-Guidance Trust

Changed:

- Added a normalized Career Path response model for generated path title, optional timeline, required skills, and optional milestones.
- Removed the hard-coded Senior Software Engineer fallback path from the Career Path page.
- Removed the hard-coded 92% match badge and replaced it with a neutral Review first advisory badge.
- Added Generated Guidance and Needs data header badges depending on whether usable generated path data is available.
- Added a retryable unavailable/incomplete-data state when generation fails, the user ID is unavailable, or the returned response lacks a usable path title.
- Preserved the explicit Explore Path action to LMS without auto-enrollment or other product mutation.

Why it improves UX:

- Users no longer see a static fallback path presented as personalized AI guidance.
- The page no longer shows a fabricated confidence or match percentage that the service contract does not provide.
- Recovery is visible through Retry instead of a silent empty page or default recommendation.
- The page communicates that generated guidance should be reviewed before users take learning or profile actions.

Control and safeguards:

- Retry requires an explicit user click.
- Explore Path only navigates to LMS.
- Career Path does not enroll users, mark lessons complete, edit profiles, save resumes, submit applications, create notifications, sync provider data, or mutate learning progress automatically.
- Incomplete service responses are not converted into default recommendations.

### 8.243 Validation Addendum

- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.244 AI Chat Persistence Status

Changed:

- Added explicit AI Assistant chat persistence states for local, syncing, and account-synced history.
- Changed the saved-chat badge from time-only status to source-aware status.
- Shows Browser local for guest/unsigned chat history.
- Shows Syncing account, Account synced, or Saved locally for signed-in users based on account-sync progress or fallback.
- Keeps the compact persistence target visible on small screens and shows last-saved time on wider screens.
- Added polite status semantics for persistence-state changes.
- Preserved local-first storage, debounced account sync, account-session backfill, and existing warning-toast fallback behavior.

Why it improves UX:

- Users can see whether chat history is only in the current browser or available through their account.
- Signed-in users get immediate feedback while account sync is in progress instead of a generic saved timestamp.
- Mobile users retain visibility into the persistence target instead of losing the badge entirely.
- The page is more transparent without adding extra decisions or blocking chat use.

Control and safeguards:

- The badge is informational and does not trigger sync, clear, merge, recommendation-save, workflow handoff, or account mutation actions by itself.
- Local-first storage remains the primary reliability path.
- Account sync remains debounced and best-effort.
- Existing warning toasts still disclose account-sync failure.
- AI Assistant recommendations remain review-first and do not edit profile/resume data, submit applications, enroll users in learning, send messages, or change settings automatically.

### 8.245 Validation Addendum

- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 381 tests.
- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.246 Truthful Application Submission Failure Handling

Changed:

- Removed the mock pending application fallback from `applicationService.submitApplication`.
- Removed the mock pending application fallback from legacy `jobService.applyToJob`.
- Changed application status update failures to throw explicit errors instead of returning a fabricated status object.
- Changed application withdrawal failures to throw explicit errors instead of silently succeeding.
- Updated the Jobs review-modal failure toast to state that the application was not sent and that the editable draft remains available.
- Added regression coverage for failed submit, status update, withdraw, and legacy apply paths.
- Preserved explicit Submit Application confirmation, draft autosave/history, submit-success analytics, submit-failure analytics, and duplicate-awareness behavior.

Why it improves UX:

- Users no longer receive a false success state when application persistence fails.
- Failed submissions keep users in the review workflow with their draft intact, making the next corrective action clear.
- Recruiter and candidate views no longer risk showing local/mock application records as if they were real provider-backed applications.
- Operational support can trust submitted application records to represent successful persistence.

Control and safeguards:

- Applications are created only after successful persistence.
- Retry remains an explicit user action from the review modal.
- Draft fields remain editable and recoverable through existing draft history.
- Failed status update and withdraw operations no longer mutate UI state by pretending the backend accepted them.
- The failure path does not contact employers, create notifications, change application status, withdraw applications, update recruiter workflows, or clear drafts automatically.

### 8.247 Validation Addendum

- Focused validation passed: `npx vitest run src/services/applicationService.test.ts src/services/jobService.test.ts` in `apps/frontend` passed: 2 test files, 37 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 385 tests.
- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.248 Applied-Tab Load Failure Visibility

Changed:

- Changed `applicationService.getUserApplications` to throw an explicit load error instead of returning an empty list on failure.
- Added an `applicationsLoadError` state to Jobs.
- Added a retryable Applications unavailable state for the Applied tab.
- Kept previously loaded applications visible when a later refresh fails.
- Added regression coverage for failed application list loading.
- Preserved duplicate-awareness, Applied search, application details, and application submit failure behavior.

Why it improves UX:

- Users can distinguish "no submitted applications" from "applications could not be loaded."
- The recovery action is in the failing context instead of only in a transient toast.
- Previously loaded records are not removed from view by a failed refresh.
- Support and product analytics can treat empty Applied lists as a more reliable user state.

Control and safeguards:

- Retry Applications requires an explicit click.
- Failed loads do not create, delete, withdraw, or update application records.
- Existing application details, draft, and submission controls remain unchanged.
- The failure state does not contact employers, create notifications, change recruiter workflows, or mutate saved application data automatically.

### 8.249 Validation Addendum

- Focused validation passed: `npx vitest run src/services/applicationService.test.ts` in `apps/frontend` passed: 1 test file, 6 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 386 tests.
- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

### 8.250 LMS Lesson Progress Persistence

Changed:

- Changed `lmsService.markLessonComplete` to throw when no LMS mutation backend can persist progress.
- Updated LMS progress failure copy so users are told the lesson remains incomplete.
- Clarified the LMS service architecture comment to distinguish resilient catalog reads from persistence-required mutations.
- Reworded stale enrollment failure logging so it no longer implies a mock fallback.
- Added regression coverage for failed enrollment mutation paths.
- Added regression coverage for failed lesson-completion mutation paths.

Why it improves UX:

- Learners no longer see a successful lesson-completion toast when progress was not saved.
- The UI remains aligned with backend state after LMS mutation failures.
- Retry becomes the clear recovery path instead of requiring users to discover stale progress later.
- Product/support teams can trust completion analytics and progress state more because local success is tied to persisted mutation success.

Control and safeguards:

- Enrollment and lesson completion still require explicit user actions.
- Failed progress persistence does not update local enrollment state, lesson completion state, course completion state, certificates, notifications, profile data, or other workflows.
- Catalog reads still use the existing resilient fallback behavior.
- Mutation failure returns a visible error instead of fabricating progress or silently skipping backend writes.

### 8.251 Validation Addendum

- Focused validation passed: `npx vitest run src/services/lmsService.test.ts` in `apps/frontend` passed: 1 test file, 8 tests.
- `npm run lint --workspace talentsphere-web` passed.
- `npm run build --workspace talentsphere-web` passed.
- `npm run test:unit --workspace talentsphere-web` passed: 60 test files, 388 tests.
- Focused validation passed: `npx tsc --noEmit --pretty false` in `chrome-extension-project` passed.
- `npm run build` in `chrome-extension-project` passed (`tsc && vite build`).
- `npm run report:api-contracts` passed and generated `docs/API_CONTRACT_MISMATCH_REPORT.md` with 19 frontend API client calls, 126 backend controller routes, 0 unmatched frontend API client calls, and 0 legacy security matcher paths.
- `git diff --check` passed.
- `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` from the running Vite dev server.
- Backend Maven tests could not run because `mvn` is not installed and the repo has no Maven or Gradle wrapper.
- Docker image build and Kubernetes render/apply checks could not run because `docker`, `kubectl`, and `kustomize` are not installed in this environment.

## 9. Highest-Risk Issues To Address Next

1. Product-critical fallback-only or unaudited data: scheduler pod/image/secret health verification, backend-owned scheduler provider contracts, scanned-PDF resume OCR, provider retention/revocation controls, and remaining provider-backed upload/artifact workflows.
2. Architecture ambiguity: direct Supabase and Spring services both act as product data paths.
3. Documentation drift: an architecture status index now reduces completion-claim ambiguity, but older docs still require ongoing review when architecture changes.
4. Security/API drift: first report-backed fixes are complete; remaining risk is keeping the generated report clean as new routes, gateway predicates, and direct Supabase paths evolve.
5. Scalability: Jobs Explore, Candidates, Messaging conversation lists, Messaging active threads, Header notifications, LMS courses, and Admin audit logs are now cursor-backed; backend-owned APIs, indexed high-scale candidate search, and formal cursor contracts for remaining large lists still need query-level performance work.
