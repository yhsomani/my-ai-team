# TalentSphere User Workflow And Automation Guide

> Documentation status: Current user workflow and automation guide. Keep synchronized with `../README.md`, `docs/FEATURES_AND_DASHBOARDS.md`, `docs/PRODUCT_UX_AUTOMATION_AUDIT.md`, and `../../PLAN.md`.

Last reviewed from source: 2026-06-30

This guide teaches users, recruiters, admins, operators, and contributors how to set up TalentSphere, use each major workflow, and streamline repeated work with built-in automation. It is source-backed documentation for the current repository state. If runtime provider behavior, hosted deployment state, or production scheduler state is not proven locally, this guide says so explicitly.

Use this guide in order for a first setup. For daily use, jump to the role workflow, automation, validation, or troubleshooting section that matches the task. Each workflow names the owning screen so users do not have to hunt across duplicated dashboards.

## Quick Navigation

| If you need to... | Start here | Then use |
| --- | --- | --- |
| Understand what the product contains | Section 1 | Section 9 for the feature/use-case matrix |
| Set up a local review environment | Section 2 | Section 8.5 for validation commands |
| Learn the web app as a talent user | Sections 3 and 4 | Section 12 for the talent learning path |
| Learn the web app as a recruiter | Sections 3 and 5 | Section 8.8 for recruiter workflow recipes |
| Operate scheduler automation | Sections 8.3, 8.4, and 8.6 | Section 10 for failure recovery |
| Use the Chrome extension companion | Section 7 | Section 8.8 for extension streamlining |
| Troubleshoot setup or workflow blockers | Section 10 | Section 11 for reliability and safety rules |
| Prepare release or QA evidence | Sections 8.5, 8.9, and 13 | `PLAN.md` for remaining production-readiness work |
| Decide where a feature belongs | Sections 1.2 and 9 | Section 8.7 for streamlining patterns |
| Build a repeatable personal or team workflow | Sections 2.10, 8.11, and 8.12 | Section 10 for failure handling |
| Follow complete setup-to-automation examples | Section 15 | Section 10 for recovery and Section 13 for production gaps |
| Pick the exact automation path for a goal | Section 8.12 | Sections 8.9 and 10 for validation and recovery |
| Confirm a workflow is ready for another user | Self-Service Completion Checklist | Sections 8.9, 10, and 13 |

## How To Use This Manual

For a complete first pass, follow this sequence:

1. Read Section 1 to understand the product surfaces, roles, and operating paths.
2. Complete the smallest setup mode in Section 2 that proves the workflow you need.
3. Use Section 3 to learn the authenticated shell, command search, notifications, and dashboard boundaries.
4. Follow the role-specific workflow in Sections 4, 5, 6, or 7.
5. Use Section 8 to streamline repeated work with command search, reviewed AI drafts, saved searches, scheduler scripts, extension diagnostics, validation commands, repeatable automation blueprints, and goal-specific runbooks.
6. Confirm the feature belongs in the expected location with Section 9 before assuming a dashboard, tab, or shortcut owns the detailed workflow.
7. When something fails, use Section 10 to connect the symptom to a root cause, recovery path, and preventive practice.
8. Use Section 15 when you need a complete example that connects setup, execution, automation, validation, and recovery.
9. Before release, use Sections 11, 12, and 13 to separate proven local behavior from unverified live-provider, deployment, scheduler, and manual accessibility evidence.

For daily use, start from the Quick Navigation table and use the examples under each workflow. For automation, always run the documented dry-run path before a mutating command, and keep service-role credentials out of frontend `.env` files and browser contexts.

## Self-Service Completion Checklist

Use this checklist before telling a new user, recruiter, operator, or teammate that a workflow is ready to run without hand-holding.

| Question | Ready answer | Where to verify |
| --- | --- | --- |
| Which setup mode am I using? | The mode is one of frontend-only, Supabase-backed, extension-only, scheduler dry-run, scheduler commit, documentation-only, or release validation | Section 2.2 |
| Where does the detailed action belong? | Exactly one owning route, extension surface, or scheduler script owns the detailed workflow | Sections 1.2 and 9 |
| What are the exact execution steps? | The user can follow a role workflow, daily playbook, execution-ready recipe, or goal-specific runbook from setup through confirmation | Sections 3 through 8, especially Section 8.12 |
| Which variations are supported? | Supported feature modes, role differences, local-only behavior, provider-backed behavior, and dry-run/commit behavior are listed | Sections 8.6, 8.10, and 9 |
| Where is the review point? | A modal, inline review, source label, local draft review, or dry-run output appears before writes, deletes, publishes, billing handoffs, status changes, or scheduler commits | Sections 8.10 and 8.11 |
| What can fail and why? | Known blockers have a root cause, workaround, and preventive measure; unknown blockers use the issue investigation template | Section 10 |
| What evidence proves the workflow? | The selected validation command matches the claim being made and does not overstate local-only or fallback-only evidence | Section 8.9 |
| What remains unverified? | Hosted provider, deployment, production scheduler, manual accessibility, or live backend evidence is recorded separately when it has not been tested | Section 13 and `../../PLAN.md` |

If any answer is unclear, stop at the safest read-only, local-review, or dry-run step. Do not mutate data, publish jobs, change billing, clear local storage, run a scheduler commit, or remove a feature until the owner, review point, and evidence level are clear.

## 1. What TalentSphere Is

TalentSphere is a career and hiring platform with four major surfaces:

| Surface | Path or location | Primary audience | Main purpose |
| --- | --- | --- | --- |
| Web app | `apps/frontend` | Talent users, recruiters, admins | Career, hiring, messaging, billing, settings, and admin workflows |
| Backend service modules | `services/*` | Operators and developers | Domain APIs, Gateway contracts, scheduled jobs, source validation |
| Supabase/Postgres data layer | Supabase project or local Postgres | Product users through the app, operators through scripts | Auth sessions, profile data, jobs, applications, analytics, notifications, and scheduler data |
| Chrome extension companion | `chrome-extension-project` | Users working from job portals | Local job tracking, page scanning, resume-match preview, interview planning, diagnostics |

The product is role-aware:

| Role | Typical starting point | Main workflows |
| --- | --- | --- |
| Public visitor | `/` | Learn the product, sign in, create a talent account, create a recruiter account |
| Talent user, `ROLE_USER` | `/dashboard` | Profile, resume, jobs, applications, learning, challenges, networking, messaging, AI, billing, settings |
| Recruiter, `ROLE_RECRUITER` | `/dashboard` | Company setup, post jobs, manage postings, review candidates, networking, messaging, AI, billing, settings |
| Admin, `ROLE_ADMIN` | `/admin` | Platform metrics, service health, scheduler rollout state, product analytics insights, audit log review |

### 1.1 Choose the right operating path

Use this decision map before starting setup or automation:

| You are... | Use this path | Do not use this path for |
| --- | --- | --- |
| A new evaluator | Frontend-only setup, dev mock user, dashboard and route walkthrough | Production auth, provider persistence, or role-claim evidence |
| A product user testing real data | Supabase-backed web app with reviewed schema and seed state | Backend Gateway/service runtime proof unless those services are separately started |
| A recruiter validating hiring flow | Recruiter account, company setup, Post Job, Candidates, Messaging | Talent-only LMS/challenge behavior |
| An admin/operator | Admin Console, scheduler dry-runs, source labels, runbooks | Treating fallback-only or dry-run output as production evidence |
| An extension user | Built unpacked MV3 extension in Chromium | Cloud sync or web account integration |
| A contributor changing docs or UI | Feature ownership tests, UI design-system validation, docs lifecycle validation | Removing or relocating features without source and test validation |

### 1.2 Feature ownership and dashboard boundaries

TalentSphere is organized around one owning screen for each detailed workflow. Summary surfaces may show status, counts, or handoff links, but the detailed action belongs in the owner listed here.

| Surface | What it is for | What it must not duplicate | Owner for detailed action |
| --- | --- | --- | --- |
| Dashboard | Role-aware summary, priorities, and launch points | Editing profiles, submitting applications, sending messages, changing billing, or making candidate decisions | Profile, Resume, Jobs, Candidates, Messaging, Billing, Settings |
| Header command search | Fast route discovery and navigation | Hidden workflow state, mutation, or bypassing role checks | Route registry destination |
| Notifications | Account-level alerts, reminders, and retry handoffs | Full conversation, application, billing, or networking workflows | Owning route named by the notification |
| Admin Console | Operational visibility, source labels, scheduler status, and investigation links | User-facing product workflow execution | Service runbooks, source commands, and owning product routes |
| Chrome extension popup/options | Local job capture, local resume/job comparison, local interview planning, and diagnostics | Cloud sync, web account mutation, provider AI, or job application submission | Web app Jobs, Resume, Messaging, and account workflows |

When in doubt, use this rule: dashboards and utilities can help users find or understand work; they should not become a second place to complete the same work.

## 2. Setup From Scratch

### 2.1 Prerequisites

Install these locally:

1. Node.js 18 or newer.
2. npm.
3. A Supabase project for real auth/data workflows, or local development with the app's dev mock user.
4. A Chromium-compatible browser for the extension and Playwright checks.
5. Maven and Docker only if you are validating backend packaging or container/runtime behavior. They are not required for the frontend-only setup path.

### 2.2 Choose a setup mode

Pick the smallest setup that proves the workflow you need. Do not treat a narrower setup as evidence for a broader environment.

| Setup mode | Use when | Requires | What it proves | What it does not prove |
| --- | --- | --- | --- | --- |
| Frontend-only local review | Reviewing UI, IA, accessibility semantics, route behavior, or mock-data workflows | Node.js, npm | Vite app can run locally and dev mock user can exercise role-gated screens | Real Supabase auth, provider persistence, backend Gateway behavior, production roles |
| Supabase-backed web app | Testing real login, RLS, profile, jobs, messaging, billing/demo data, and account-synced fallbacks | Node.js, npm, Supabase URL and anon key, reviewed schema/seed state | Frontend can use real Supabase-backed data and auth sessions | Backend Gateway/service runtime unless separately started and routed |
| Extension-only review | Testing local tracker, page scan, options, resume match, interview planner, storage, and diagnostics | Node.js, npm, Chromium-compatible browser | Built MV3 extension behavior and local browser storage flows | Cloud sync, web account integration, provider AI |
| Scheduler dry-run | Reviewing saved-search digest or networking reminder candidates without writes | Node.js, npm, server-side Supabase URL and service-role key in a safe shell | Candidate counts and planned scheduler work | Notification creation, baseline updates, delivered reminders |
| Scheduler commit | Running reviewed automation from a trusted worker or operator shell | Same as dry-run, plus explicit `--commit` and audit review | Queued digest items, grouped notifications, or due reminders according to the script | Production CronJob health unless deployed image, secrets, pods, and run history are verified |
| Full release validation | Preparing production evidence | Frontend, extension, backend, Supabase, CI, browser matrix, deployment environment | Source contracts, build/test health, and selected runtime evidence | Manual assistive-technology evidence or provider state that was not actually tested |

Recommended first path for most contributors:

1. Run the frontend-only setup.
2. Validate the UI route and IA contracts.
3. Add Supabase-backed data only when testing persistence or role-specific auth.
4. Add extension runtime checks only when reviewing companion-extension workflows.
5. Add scheduler dry-runs before any committed automation run.

### 2.3 Install dependencies

```bash
cd TalentSphere-Unified
npm install
```

The root package manages the active frontend workspace at `apps/frontend`. The Chrome extension has its own package inside `chrome-extension-project`.

### 2.4 Configure the frontend environment

Create `apps/frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use the anon key only in frontend environment files. Never place a Supabase service-role key in `apps/frontend/.env`.

### 2.5 Initialize data

For a Supabase-backed setup:

1. Open the SQL editor for a reviewed local, development, test, or CI project.
2. Apply `supabase-schema.sql`.
3. Optionally seed demo data with `seed-data.sql`.

The seed script is destructive and must only run against reviewed non-production targets. Before running it in the same SQL session, declare the scope and confirmation:

```sql
SET app.seed_environment = 'development';
SET app.allow_destructive_seed_data = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';
```

If Supabase blocks direct `auth.users` inserts, manually create these test users in Supabase Authentication first, mark them email-confirmed, and rerun the seed:

| Email | Password | Scenario |
| --- | --- | --- |
| `alice.dev@talentsphere.test` | `password123` | Talent user with active profile and job-seeking data |
| `bob.recruiter@talentsphere.test` | `password123` | Recruiter with posting and candidate review data |
| `carol.student@talentsphere.test` | `password123` | Talent learner and entry-level applicant |
| `david.power@talentsphere.test` | `password123` | Power user with stronger profile data |
| `eve.admin@talentsphere.test` | `password123` | Admin console scenario |

For full seed instructions, use `SEED_DATA_GUIDE.md`.

### 2.6 Start the web app

```bash
npm run dev
```

The frontend workspace starts Vite on port `3000`.

If Supabase auth is not configured or there is no session in development mode, the app can create a local mock user with talent, recruiter, and admin roles. This is useful for UI review, but it is not production auth evidence.

### 2.7 Build the web app

```bash
npm run build
```

This runs the frontend TypeScript build and Vite production build through the root workspace script.

### 2.8 Build the Chrome extension

```bash
cd chrome-extension-project
npm install
npm run build
```

To load the built extension in a Chromium browser:

1. Open the browser extensions page.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select `TalentSphere-Unified/chrome-extension-project/dist`.

The extension is local-first. It does not require web app authentication for its local tracker, local resume-match preview, local interview planner, local diagnostics, or local operational analytics.

### 2.9 Verify setup before workflow testing

Use the smallest verification set that proves the setup mode you selected.

| Setup mode | Verification steps | Expected signal |
| --- | --- | --- |
| Frontend-only local review | `npm run build`, `npm run test:ia --workspace talentsphere-web` | Production build completes; route ownership tests pass |
| Supabase-backed web app | Start the app, sign in with a known role account, open Dashboard, Jobs/Profile or Candidates, and verify source labels where shown | Auth session persists and role-owned routes load expected account-backed data |
| Extension-only review | `cd chrome-extension-project && npm run build`, then load `dist` unpacked | Popup/options open in a real extension runtime and local storage workflows work |
| Scheduler dry-run | Run the target scheduler command without `--commit` | Output shows candidate counts, skipped/invalid items, and no mutation claim |
| Scheduler commit | Run dry-run first, then rerun with `--commit` from a trusted operator shell | Output records committed work and Admin/source labels can be reviewed afterward |
| Documentation-only change | `npm run validate:docs-lifecycle`, `npm run validate:module-manifest`, `git diff --check` | Docs are classified, manifests are current, and Markdown has no whitespace issues |

Do not use dev mock users, local fallback storage, dry-run scheduler output, or extension-local data as proof of production provider behavior.

### 2.10 Setup-to-execution checklist

Use this checklist when onboarding a new user, QA reviewer, operator, or teammate from zero to a working workflow.

| Stage | What to do | Ready signal | Stop if |
| --- | --- | --- | --- |
| 1. Select scope | Choose frontend-only, Supabase-backed, extension-only, scheduler dry-run, scheduler commit, or release validation from Section 2.2 | Everyone agrees what evidence the setup can and cannot prove | The requested proof needs a broader setup than the selected mode |
| 2. Install | Run `npm install` from `TalentSphere-Unified` | Root workspace dependencies install without script or package errors | Node/npm versions are unsupported or install runs from the wrong directory |
| 3. Configure | Add frontend anon Supabase credentials only when testing real auth/data; keep service-role keys server-side only | Frontend `.env` contains only browser-safe values | A service-role key is about to be copied into frontend, browser, or extension config |
| 4. Seed or prepare data | Apply schema and optional seed data only to reviewed non-production projects | Test role accounts or known records exist for the workflow | The target database might be production or the destructive seed confirmation is missing |
| 5. Start or build | Run `npm run dev`, `npm run build`, extension build, or scheduler dry-run as needed | The chosen surface opens or the selected command completes | A failing build/test contradicts the workflow evidence being collected |
| 6. Sign in or open surface | Use the correct role account, dev mock user, admin account, recruiter account, or unpacked extension | The intended owner screen is reachable | The route appears only because the dev mock user has extra roles |
| 7. Execute one workflow | Complete the smallest representative scenario from Sections 4 through 8 | The workflow reaches its expected reviewed confirmation, source label, or local result | A dashboard or utility is being used as the detailed mutation owner |
| 8. Validate | Run the validation commands from Section 8.9 that match the claim | Validation scope matches the evidence being reported | A narrow command is being used to claim provider, deployment, or manual QA proof |
| 9. Document findings | Record blockers, source labels, dry-run counts, and unverified evidence separately | The next user can reproduce the setup and understand remaining limits | A fallback, local-only, dry-run, or inferred state is being written up as production evidence |

Example onboarding flow for a talent-user reviewer:

1. Choose frontend-only setup for UI review or Supabase-backed setup for real auth/data review.
2. Install dependencies from `TalentSphere-Unified`.
3. Configure `apps/frontend/.env` only if real Supabase data is required.
4. Start the app with `npm run dev`.
5. Sign in as a talent user, or use the development mock only for local UI review.
6. Open Jobs, apply to one seeded job through the review modal, and check the Applied tab.
7. Run `npm run build`, `npm run test:ia --workspace talentsphere-web`, and the specific workflow or accessibility command needed for the review.
8. Note any fallback source labels or unverified provider claims before closing the review.

## 3. First Run And Navigation

### 3.1 Public visitor path

1. Open `/`.
2. Review the product entry page and visible public stats.
3. Choose Sign in, Create talent account, or Create recruiter account.
4. If creating an account, select the role intent during registration.
5. After sign-in, the authenticated shell appears with role-filtered navigation.

Example: A new recruiter should choose the recruiter registration entry. The app preserves recruiter intent and shows recruiter-specific next-step copy, including the company setup handoff when available.

### 3.2 Authenticated shell

The authenticated shell includes:

- Sidebar navigation on desktop.
- Mobile slide-over navigation and role-prioritized bottom navigation.
- Header command search.
- Account notifications and due-aware reminders.
- Theme toggle.
- Sign out.
- Shared toast notifications.
- Safe route recovery for invalid URLs.

Use command search for fast navigation:

1. Focus command search in the header, or use the keyboard shortcut exposed by the app.
2. Type a destination such as `jobs`, `resume`, `candidates`, or `admin`.
3. Choose the result.

Results are role-filtered. A talent user should not see recruiter-only destinations such as Candidates, and a public visitor does not see authenticated app destinations from the Not Found recovery surface.

### 3.3 Daily execution playbooks

Use these short playbooks when the goal is task completion instead of screen-by-screen exploration.

| Goal | Path | Best shortcut | Review point before mutation |
| --- | --- | --- | --- |
| Apply to a job | Jobs -> Explore -> Review Application -> Submit | Command search `jobs` | Application review modal and editable draft |
| Reuse a job search | Jobs -> Saved Searches -> Apply search | Command search `jobs` | Saved-search criteria and alert preference |
| Improve profile from AI | AI -> recommendation queue -> Profile handoff | Command search `ai` | Profile current/proposed diff |
| Import a resume | Resume -> Import -> Apply selected fields | Command search `resume` | Detected fields, skills, work rows, and education rows |
| Publish a recruiter job | Post Job -> Review Draft -> Save Draft -> Review Publish | Command search `post job` | Draft review, duplicate warning, and publish checklist |
| Review candidates | Candidates -> focus/sort -> Details -> status decision | Command search `candidates` | Scorecard, private notes, status modal, and bulk skipped list |
| Follow up with a connection | Networking -> Sent -> reminder | Command search `network` | Reminder timing and account-notification source label |
| Send a message with an attachment | Messaging -> conversation -> attachment review -> Send | Command search `messages` | Link/file attachment preview and failed-send retry state |
| Change billing state | Billing -> plan/payment review -> provider handoff | Command search `billing` | Plan confirmation and provider/popup state |
| Investigate platform health | Admin -> source labels -> service row or scheduler panel | Command search `admin` | Live/fallback/degraded source labels |

The dashboard should remain a summary and launchpad. If a task needs edits, approvals, persistence, uploads, publishing, billing, or private notes, complete it in the owning workflow listed above.

## 4. Talent User Workflows

### 4.1 Dashboard

Purpose: Status overview and launchpad.

Steps:

1. Open `/dashboard`.
2. Review profile, application, challenge, learning, and message summaries.
3. Use summary cards or quick actions to move to the owning domain screen.
4. If a dashboard section is degraded, use the visible retry action.

Use the dashboard for orientation, not detailed work. Detailed job search belongs in Jobs, profile editing belongs in Profile, resume work belongs in Resume, and conversations belong in Messaging.

### 4.2 Profile

Purpose: Durable career identity and profile data.

Steps:

1. Open `/profile`.
2. Review profile summary, skills, experience, education, achievements, and completion tasks.
3. Edit headline, location, bio, skill rows, experience rows, and education rows from the owning controls.
4. Review AI profile draft handoffs before saving.
5. Upload or remove an own-profile photo only after the in-app review step.

Practical example: If AI suggests a new headline, open the profile draft review, compare current and proposed values, save only the fields you accept, and discard the rest.

### 4.3 Resume Builder

Purpose: Resume editing, import, export, and artifact review.

Steps:

1. Open `/resume`.
2. Edit supported resume fields or import resume text.
3. Import variations:
   - Paste resume text.
   - Upload readable text or markdown.
   - Upload readable DOCX.
   - Upload searchable PDF.
4. Review detected fields, skills, experience rows, and education rows.
5. Apply only selected detected changes.
6. Export as browser PDF or local HTML.
7. Optionally upload reviewed PDF artifacts through provider-backed file handling when configured.
8. Review, copy, open, or delete existing artifacts from the artifact library.

Practical example: To turn an old resume into profile rows, import the document, review detected skills and dated work/education rows, save only the rows you trust, then export a refreshed PDF.

Known limit: Scanned or image-only PDF OCR is not currently source-verified.

### 4.4 Jobs And Applications

Purpose: Job discovery, saved searches, application drafts, application submission, and application status.

Steps for job discovery:

1. Open `/jobs`.
2. Use Explore search and filters.
3. Review job cards and local fit reasons.
4. Hide irrelevant Explore results when needed.
5. Restore hidden jobs from the restore controls if preferences hide too much.

Steps for saved searches:

1. Set search/filter criteria.
2. Save the search.
3. Enable alerts if you want in-app updates.
4. Apply a saved search later to restore its criteria.
5. Delete a saved search only after the review confirmation.

Steps for applying:

1. Open a job.
2. Start the application review.
3. Choose or edit a profile/manual/AI draft.
4. Restore a recent draft version if needed.
5. Clear the draft only after confirmation.
6. Submit the application.
7. Track status in the Applied tab and Details timeline.

Practical example: If the AI Assistant creates a cover-letter draft, open the Jobs handoff, review the editable application draft, modify the cover letter, and submit only after the review modal reflects the final text.

### 4.5 Learning

Purpose: Course discovery, enrollment, lessons, and progress.

Steps:

1. Open `/lms`.
2. Search or filter the catalog.
3. Use an AI learning handoff only as a reviewed catalog search suggestion.
4. Open a course.
5. Enroll.
6. Select lessons.
7. Mark lessons complete.
8. Use retry actions if progress or enrollment persistence fails.

Practical example: Ask AI for "React interview prep", open the Learning handoff, review the suggested catalog search, apply it, enroll in a relevant course, and track progress from Continue Learning.

### 4.6 Challenges

Purpose: Coding challenge practice and submission.

Steps:

1. Open `/challenges`.
2. Filter the catalog by category. Category filters change only the visible challenge catalog and do not reset the open solving workspace.
3. Open a challenge workspace.
4. Edit solution code.
5. Run visible local JavaScript/TypeScript sample checks when available.
6. Review retry history.
7. Submit the solution.
8. Use the retry path if submission persistence fails.

Practical example: Before submitting, run local sample checks to catch simple output mismatches, then submit and compare the latest feedback with previous attempts.

### 4.7 AI Assistant And Career Path

Purpose: Draft guidance and reviewed handoffs to owning workflows.

Steps:

1. Open `/ai` for chat-style guidance or `/career-path` for career-path generation.
2. Choose a prompt suggestion or type a prompt.
3. Send the draft prompt.
4. Review assistant output as draft guidance.
5. Save, dismiss, or open a workflow handoff from the recommendation queue.
6. In the destination workflow, review the proposed changes before applying them.

Important rule: AI output must not mutate Profile, Resume, Jobs, or Learning records automatically. It creates draft recommendations and handoffs that users explicitly review.

### 4.8 Networking

Purpose: Suggestions, connections, incoming requests, sent requests, accepted connections, and reminders.

Steps:

1. Open `/networking`.
2. Review suggested people and why-suggested context.
3. Preview a profile or open full profile.
4. Send a connection request with an optional note.
5. Accept or decline incoming requests.
6. Withdraw sent requests when appropriate.
7. Set follow-up reminders for sent requests.
8. Hide suggestions that are not useful and restore them if needed.

Practical example: For a promising connection, preview the profile, send a short request note, set a follow-up reminder, and rely on account notifications when the reminder becomes due.

### 4.9 Messaging

Purpose: Direct conversations, message history, attachments, and read state.

Steps:

1. Open `/messaging`.
2. Choose a conversation.
3. Load older messages if needed.
4. Type a reply or use a draft-only suggested reply.
5. Add a reviewed link attachment or upload a file.
6. Send the message.
7. Retry failed sends from the visible failed-message control.
8. Mark visible incoming messages read when appropriate.

Practical example: If a file upload fails, keep the conversation open, use the inline recovery path, and retry without losing the message draft.

### 4.10 Billing And Settings

Billing steps:

1. Open `/billing`.
2. Compare plans.
3. Review a plan change.
4. Confirm checkout or open provider billing when configured.
5. Review payment history.

Settings steps:

1. Open `/settings`.
2. Update profile preferences.
3. Configure notification channels, digest frequency, and quiet hours.
4. Use Billing handoff for full plan/payment work.
5. Review password reset or account deactivation actions before confirming.

Known limit: Two-factor authentication is currently presented as unavailable until provider/service-backed setup is implemented and verified.

## 5. Recruiter Workflows

### 5.1 Recruiter Dashboard

Purpose: Hiring overview and launchpad.

Steps:

1. Open `/dashboard` as a recruiter.
2. Review posting, application, candidate, and onboarding summaries.
3. Use the dashboard to open Jobs, Post Job, Candidates, Messaging, or Settings.
4. Keep detailed candidate and posting decisions in the owning screens.

### 5.2 Company Setup

Purpose: Attach recruiter-owned company context to job drafts.

Steps:

1. Register as a recruiter or open Post Job.
2. Use company setup guidance when no company is attached.
3. Create and attach a minimal company profile.
4. Complete missing company details before publishing when checklist requirements need them.
5. Retry failed company create/update actions from the inline recovery controls.

Practical example: A new recruiter can start a job draft, create and attach a company from inside the draft flow, complete required company fields, then continue to draft review.

### 5.3 Post Job

Purpose: Controlled job draft creation, review, and publish.

Steps:

1. Open `/jobs/post`.
2. Fill the job form.
3. Reuse a saved template if helpful.
4. Save or delete templates only through the reviewed controls.
5. Restore a recent draft version if needed.
6. Attach company context or explicitly opt out where allowed.
7. Review duplicate-post warnings.
8. Review the draft.
9. Save as draft.
10. Use My Posts to edit existing drafts.
11. Review changes before saving updates.
12. Publish only when the publish checklist allows it.

Practical example: To streamline repeated hiring, save a template for a common role, reuse it for the next posting, update role-specific fields, review the duplicate warning, then save as draft before publishing.

### 5.4 Candidates

Purpose: Recruiter application review, scorecards, private notes, and status decisions.

Steps:

1. Open `/candidates`.
2. Search by candidate name, email, or job title.
3. Focus visible candidates by all, needs-scorecard, or high-signal.
4. Sort the current page by advisory signal.
5. Review scorecard coverage and evidence gaps.
6. Open candidate details.
7. Move previous/next through the current review queue.
8. Add private notes or structured scorecards.
9. Generate interview-plan note drafts when helpful.
10. Review unsaved private review reset prompts before discarding drafts.
11. Move candidates to Interview, Offer, or Rejected.
12. Use bulk Interview, Offer, or Reject only after reviewing skipped and eligible candidates.

Practical example: Start with Needs scorecard focus, open the first visible candidate, add evidence-backed scorecard ratings, then bulk-move only candidates that remain eligible after the review modal lists skipped items.

Known limit: Provider-backed interview scheduling and backend-owned candidate recommendation scoring are not fully source-verified.

## 6. Admin Workflows

Purpose: Operational visibility and investigation handoffs.

Steps:

1. Open `/admin` as an admin.
2. Review platform metrics.
3. Check source labels before treating data as live.
4. Review product analytics insight summaries.
5. Review scheduled automation rollout status.
6. Check service health rows and investigation links.
7. Page through audit logs.
8. Retry audit or admin console load failures from scoped retry controls.

Practical example: If scheduler status is degraded, verify whether the Admin page reports provider-backed run history or fallback-only state, then use the documented runbook and scheduler command dry-runs before committing work.

Known limit: Hosted Kubernetes pod health, scheduler image verification, deployed Prometheus/Grafana/Alertmanager behavior, and live production provider state remain environment-dependent unless separately verified.

## 7. Chrome Extension Workflows

### 7.1 Popup dashboard

Purpose: Local tracker, active-page scan, diagnostics, and local operational analytics.

Steps:

1. Open the extension popup.
2. Review local tracker status.
3. Add a tracked job manually, or scan the active supported job portal page.
4. Review the scanned page draft.
5. Save the draft to the local tracker or discard it.
6. Delete tracked jobs only after the reviewed delete prompt.
7. Open Diagnostics to test local runtime status, export local diagnostics, or clear reviewed local logs.

The popup does not submit job applications, sync records to cloud, or modify the web app account.

### 7.2 Options: Resume Match Preview

Purpose: Local keyword-overlap comparison between pasted resume text and pasted job text.

Steps:

1. Open extension options.
2. Open Resume Match.
3. Paste job text.
4. Paste resume text.
5. Run the local comparison.
6. Review keyword coverage and status messaging.

Variations and safeguards:

- Missing text shows safe validation copy.
- Very short text shows guidance.
- Large pasted text shows bounded guidance.
- The feature is local preview, not cloud AI.
- Raw pasted job/resume text is not sent to provider services by this workflow.

### 7.3 Options: Interview Planner

Purpose: Local prep-card planning.

Steps:

1. Open extension options.
2. Open Interview Planner.
3. Enter a prep topic.
4. Choose a category.
5. Add a plan card.
6. Toggle card completion state.
7. Clear all prep cards only after the reviewed confirmation.

### 7.4 Options: Settings And Diagnostics

Purpose: Local-only settings and local usage diagnostics.

Steps:

1. Open extension options.
2. Review local-only sync copy.
3. Toggle local usage diagnostics if you want local operational events.
4. Export or clear diagnostics only after reviewing the local diagnostics panel.
5. Reset prep/settings data only through reviewed controls.

Known limit: Extension cloud sync is intentionally disabled unless a future explicit consent, preview, and conflict-handling flow is added.

## 8. Automation And Workflow Streamlining

### 8.1 Use command search instead of manual navigation

Best for:

- Opening Jobs, Resume, Profile, Messages, Candidates, Admin, or Settings quickly.
- Avoiding sidebar scanning on dense workflows.
- Keeping role-based navigation predictable.

Example:

1. Open command search.
2. Type `resume`.
3. Select Resume.
4. Continue from the existing route state.

### 8.2 Use AI as a draft generator, not an automatic writer

Best for:

- Profile headline drafts.
- Resume summary/contact field drafts.
- Application cover-letter drafts.
- Learning catalog search suggestions.
- Career path brainstorming.

Safe workflow:

1. Ask AI for a draft.
2. Save or open the recommendation.
3. Review current vs proposed data in the destination workflow.
4. Apply only the accepted changes.
5. Dismiss stale suggestions.

### 8.3 Use saved searches and digest automation

Users create saved searches in Jobs. Operators can run scheduler scripts to discover new matches and deliver digests.

Dry-run discovery:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/discover-saved-search-digests.mjs --max-searches=200 --max-jobs=500
```

Commit discovery from a reviewed scheduler/worker:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/discover-saved-search-digests.mjs --commit --max-searches=200 --max-jobs=500
```

Deliver digest notifications in dry-run mode:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/run-notification-digests.mjs --max-items=200
```

Commit digest notification delivery:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/run-notification-digests.mjs --commit --max-items=200
```

Never expose service-role keys in frontend code, browser storage, screenshots, or public logs.

### 8.4 Use networking reminder automation

Users set follow-up reminders in Networking. Operators can promote due reminders into notifications.

Dry-run:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/run-networking-reminders.mjs --max-items=200
```

Commit from a reviewed scheduler/worker:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/run-networking-reminders.mjs --commit --max-items=200
```

### 8.5 Use validation commands before relying on a workflow

Common local validation:

```bash
npm run lint
npm run build
npm run test:unit
npm run test:e2e:chromium
npm run test:ia
npm run test:a11y
npm run test:contrast
npm run validate:ui-design-system
npm run validate:docs-lifecycle
npm run validate:module-manifest
```

Extension validation:

```bash
npm run test:extension-popup-ux
npm run test:extension-options-ux
npm run test:extension-runtime-smoke
cd chrome-extension-project && npm run build
```

Scheduler validation:

```bash
npm run test:scheduler-audit
npm run test:saved-search-digest-discovery
npm run test:notification-digests
npm run test:networking-reminders
```

### 8.6 Advanced automation run modes

All current server-side automation is explicit and reviewable. The scripts are safe to inspect in dry-run mode and mutating only when `--commit` is supplied from a trusted server-side context.

| Automation | Dry-run behavior | Commit behavior | Required review |
| --- | --- | --- | --- |
| Saved-search discovery | Reads alert-enabled saved searches and matching jobs, reports candidate digest items | Queues digest items and updates saved-search baselines | Confirm project, search/job limits, preference behavior, and scheduler audit output |
| Notification digest delivery | Reads queued digest items and reports grouped delivery candidates | Creates grouped `JOB_ALERT` notifications and marks eligible items delivered or skipped | Confirm digest frequency, notification settings, item counts, and sanitized audit output |
| Networking reminders | Reads unread reminder notifications and reports due/future/invalid counts | Promotes due unread reminders into visible account notifications | Confirm reminder timing, invalid metadata counts, and scheduler audit output |
| Extension diagnostics | Reviews local diagnostic state and local operational events when enabled | Exports or clears local diagnostic data after inline review | Confirm no raw resume, job, URL, prep topic, or provider error data is included |

Operator checklist before using `--commit`:

1. Confirm you are in `TalentSphere-Unified`.
2. Confirm the Supabase project is a reviewed target.
3. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only in a server/operator shell or secret store.
4. Run the same command without `--commit`.
5. Review counts, skipped items, invalid items, and source labels.
6. Run the relevant scheduler tests.
7. Add `--commit` only when the dry-run output is expected.
8. Review audit output after the committed run.
9. Check the Admin Console source labels before calling the run production evidence.

### 8.7 Workflow streamlining patterns

Use these patterns to speed up work while preserving the product's review-first safety model.

| Pattern | Where to use it | How it helps | Boundary to preserve |
| --- | --- | --- | --- |
| Command-first navigation | Header command search | Reduces repeated sidebar scanning and click depth | Keep role filtering and source-backed route ownership unchanged |
| Draft, then approve | AI, application review, resume import, profile suggestions, interview-plan note drafts | Reduces manual typing without silent mutation | Never auto-save AI or imported data without user review |
| Save reusable inputs | Job searches, job-post templates, draft versions | Reduces repeated setup work | Keep delete, clear, restore, and publish actions reviewed |
| Use source labels | Dashboard, Admin, notifications, local fallbacks | Prevents confusing fallback/demo/local data with live data | Do not claim production evidence from fallback-only states |
| Use scoped retries | Jobs, Messaging, Billing, Admin, Learning, Challenges, Profile, Resume | Recovers failed sub-workflows without refreshing the whole app | Keep raw provider errors hidden from users |
| Run local checks before provider calls | Challenge sample checks, extension Resume Match, scheduler dry-runs | Catches obvious issues before persistence or provider handoff | Treat local checks as advisory unless the owning workflow persists state |

### 8.8 Execution-ready workflow recipes

Use these recipes when the goal is to complete a multi-step workflow with the fewest context switches while keeping every mutation reviewed.

| Scenario | Step-by-step recipe | Confirmation points |
| --- | --- | --- |
| Talent applies to a role using AI help | 1. Open AI Assistant. 2. Ask for application guidance. 3. Save or open the draft recommendation. 4. Open Jobs from the handoff or command search. 5. Start Review Application. 6. Edit the draft cover letter or resume URL. 7. Submit. 8. Check the Applied tab timeline. | AI draft is non-mutating; application modal shows final text before submit; Applied tab shows submitted status. |
| Talent turns an old resume into profile data | 1. Open Resume. 2. Import pasted text, readable DOCX, text/markdown, or searchable PDF. 3. Review detected fields, skills, experience, and education. 4. Save only accepted fields or rows. 5. Export PDF or HTML. 6. Open Profile to review durable profile state. | Import review lists exactly what will change; scanned/image-only PDFs may need manual text; export does not prove provider artifact upload. |
| Recruiter publishes a reusable job post | 1. Register or sign in as recruiter. 2. Confirm company setup. 3. Open Post Job. 4. Fill job fields. 5. Save a template for repeated roles. 6. Review duplicate warning. 7. Save draft. 8. Open My Posts. 9. Review publish checklist. 10. Publish only when blockers are clear. | Company context is attached or explicitly handled; duplicate warning is advisory; publish readiness remains backend-owned. |
| Recruiter reviews candidates quickly | 1. Open Candidates. 2. Search or focus Needs scorecard. 3. Sort by advisory signal. 4. Open first visible candidate. 5. Add scorecard/private note. 6. Use previous/next in the queue. 7. Review status modal. 8. Confirm Interview, Offer, or Reject. | Unsaved review reset is guarded; private notes remain private; bulk decisions show skipped and eligible candidates. |
| Operator runs saved-search automation safely | 1. Confirm target Supabase project. 2. Set service-role env vars only in a server/operator shell. 3. Run saved-search discovery without `--commit`. 4. Review counts and skipped items. 5. Run scheduler tests. 6. Rerun discovery with `--commit` if expected. 7. Run notification digest dry-run. 8. Commit digest delivery only after review. 9. Check Admin source labels. | Dry-run output is not production delivery; service-role key never enters frontend env or logs; Admin labels must prove source state before evidence claims. |
| Extension user captures and prepares from a job portal | 1. Build and load the extension. 2. Open a supported job portal page. 3. Open popup. 4. Scan active page. 5. Review scanned draft. 6. Save locally. 7. Open Resume Match in options. 8. Paste job and resume text. 9. Create Interview Planner prep cards. 10. Export diagnostics only after review. | Data is local-first; scan draft can be discarded; Resume Match is keyword-overlap preview, not cloud AI. |
| Contributor verifies a UI/documentation-only change | 1. Run focused unit or route tests for touched surfaces. 2. Run `npm run test:ia`. 3. Run `npm run test:a11y`. 4. Run `npm run validate:ui-design-system`. 5. Run `npm run validate:docs-lifecycle`. 6. Run `npm run validate:module-manifest`. 7. Run `git diff --check`. | Documentation status banners and manifest classification remain current; UI changes preserve route ownership and existing behavior. |

### 8.9 Validation command matrix

Choose validation based on the evidence you need. Passing a narrower command does not prove the broader environment.

| Evidence needed | Commands | Proves | Still not proven |
| --- | --- | --- | --- |
| Frontend source compiles | `npm run build` | TypeScript and Vite production build for the frontend workspace | Hosted CDN/runtime provider behavior |
| General frontend regressions | `npm run lint`, `npm run test:unit` | Static lint and Vitest unit/component contracts | Browser layout, deployed env, live Supabase |
| Information architecture | `npm run test:ia` | Route registry and feature ownership consistency | Manual user comprehension |
| Accessibility semantics | `npm run test:a11y`, `npm run test:keyboard`, `npm run test:contrast` | Automated route semantics, keyboard flows, and Chromium contrast checks | Manual screen-reader walkthroughs |
| Cross-browser contrast | `npm run test:contrast:all` | Major-route rendered contrast across configured browser projects | Non-text image/canvas contrast and deployed CSS artifacts |
| Visual layout guardrails | `npm run test:e2e:chromium --workspace talentsphere-web -- tests/visual-layout.spec.ts --project=chromium --reporter=line` | Major-route overflow, clipped visible control text, icon-only target size, and focus-style guardrails in Chromium | Full all-browser layout matrix |
| Documentation lifecycle | `npm run validate:docs-lifecycle`, `npm run validate:module-manifest` | Required docs are classified and status-bannered; manifest paths still exist | Accuracy of claims not backed by reviewed source |
| UI design system | `npm run validate:ui-design-system` | Token usage, raw color guardrails, typography rules, and documented design-system references | Subjective visual polish or manual brand approval |
| Extension UX | `npm run test:extension-popup-ux`, `npm run test:extension-options-ux`, `npm run test:extension-runtime-smoke` | Popup/options contracts and built MV3 runtime smoke behavior | Public job-portal drift and store-distributed extension behavior |
| Scheduler scripts | `npm run test:scheduler-audit`, `npm run test:saved-search-digest-discovery`, `npm run test:notification-digests`, `npm run test:networking-reminders` | Source-level scheduler logic and dry-run/commit contract behavior | Production CronJob image, secret, pod, and run history |
| Backend/API contracts | `npm run report:api-openapi`, `npm run validate:api-openapi-contract`, `npm run validate:auth-contract`, `npm run validate:security-contract` | Source-derived API/auth/security contract consistency | Live Gateway/service integration and provider identity tokens |

### 8.10 Automation trigger and data-safety reference

Use this reference before trying to streamline repeated work.

| Automation type | Triggered by | Writes data? | Safe default | Review before proceeding |
| --- | --- | --- | --- | --- |
| Command search | User typing in the app header | No | Navigate only | Confirm the destination is visible for the current role |
| AI draft recommendations | User prompt or career-path request | No direct owner-record mutation | Save/open as draft only | Compare current and proposed data in Profile, Resume, Jobs, or Learning |
| Resume import | User paste/upload in Resume | Only after selected fields/rows are applied | Review detected values first | Reject low-confidence or scanned/unreadable content |
| Job saved searches | User saves search criteria | Yes, preference/search state | Save only reviewed criteria | Confirm alert preference and restore/delete behavior |
| Scheduler discovery/delivery | Operator or scheduler script | Dry-run writes nothing; `--commit` mutates queued items or notifications | Run without `--commit` | Confirm project, service-role secret scope, counts, skipped items, and tests |
| Networking reminders | User reminder setting plus operator scheduler run | User action stores reminder; scheduler commit creates due notifications | Dry-run scheduler first | Confirm due dates, invalid metadata, notification preferences, and Admin labels |
| Extension tracker/planner | Extension popup/options actions | Local browser storage only | Review local draft before saving | Confirm data is local-only and export diagnostics only after review |
| Validation commands | Contributor or CI | No product data mutation | Focused command first, then broader suites | Match command scope to the evidence you need |

### 8.11 Build a repeatable workflow automation blueprint

Use this blueprint when a user, recruiter, operator, or team wants to streamline repeated work without changing product behavior.

| Step | Decision | Recommended pattern | Example |
| --- | --- | --- | --- |
| 1. Name the outcome | Define the user-visible result, not the tool command | "Find matching jobs and notify me" instead of "run a script" | Saved-search digest |
| 2. Pick the owner | Use the single owning route or script from Sections 1.2 and 9 | Keep dashboards as launchpads only | Jobs owns saved searches; scheduler owns delivery |
| 3. Separate draft from mutation | Decide which steps can prepare data and which steps write data | Use AI/import/local checks as draft sources | AI drafts a cover letter; Jobs review modal submits it |
| 4. Add a review point | Put confirmation before any write, deletion, publish, billing, status change, or scheduler commit | Use existing modals, source labels, or dry-run output | Recruiter reviews skipped candidates before bulk status update |
| 5. Choose evidence | Match validation commands to the claim being made | Use Section 8.9 before declaring a workflow reliable | `test:ia` proves route ownership, not live Supabase |
| 6. Define failure handling | Map each likely blocker to Section 10 | Prefer scoped retry over broad refresh | Failed message send uses inline retry without losing draft text |
| 7. Record limits | State what remains local-only, fallback-only, dry-run-only, or unverified | Do not promote local proof to production proof | Extension diagnostics are local-only until future sync exists |

Blueprint examples:

| Workflow | Automate or streamline with | Human review stays at | Validation before relying on it |
| --- | --- | --- | --- |
| Daily job search | Saved searches, alert preferences, scheduler digest dry-run/commit | Saved-search criteria, alert setting, digest run output | `npm run test:saved-search-digest-discovery`, `npm run test:notification-digests`, Admin source labels |
| Application preparation | AI draft recommendation, Resume import, Jobs application draft versions | Destination review modal before submit | Jobs workflow tests, `npm run test:ia`, source labels for account-backed state |
| Recruiter high-volume screening | Candidate focus/sort, scorecards, interview-plan note drafts, bulk status review | Candidate detail panel and bulk confirmation modal | Candidates workflow tests and feature ownership validation |
| Extension-based job tracking | Page scan draft, local tracker, Resume Match, Interview Planner, diagnostics export | Scan draft review, local diagnostics review, delete/reset confirmations | `npm run test:extension-popup-ux`, `npm run test:extension-options-ux`, `npm run test:extension-runtime-smoke` |
| Operator scheduler run | Dry-run commands, commit flag, scheduler audit rows, Admin source labels | Dry-run counts, skipped/invalid rows, service-role environment review | Scheduler tests plus source-label review in Admin |
| Documentation or UI review | Command search, route registry, design-system validator, docs lifecycle validator | Feature ownership and dashboard placement review | `npm run test:ia`, `npm run validate:ui-design-system`, `npm run validate:docs-lifecycle`, `npm run validate:module-manifest` |

Do not add a new dashboard, shortcut, script, or automation entry point until this blueprint shows the existing owner cannot serve the workflow clearly. If a new surface is required, document the ownership decision in `docs/FEATURES_AND_DASHBOARDS.md`, update this guide, and keep the old feature location as a summary or handoff only.

### 8.12 Workflow automation catalog and runbooks

Use this catalog when a user knows the outcome but not the exact screen, setup mode, script, or validation command. Each row preserves the existing feature owner and points to the first failure check to run before escalating.

| Outcome | Setup mode | Owner | Execution runbook | Streamline or automate with | First failure check |
| --- | --- | --- | --- | --- | --- |
| New user can start safely | Frontend-only or Supabase-backed web app | Landing, Register, Login | 1. Pick setup mode. 2. Install dependencies. 3. Configure Supabase only if provider data is needed. 4. Open `/`. 5. Register or sign in. 6. Confirm role-visible Dashboard. | Role-intent registration, authenticated redirects, command search after sign-in | Route redirects or missing role metadata in Section 10 |
| Talent completes profile and resume | Frontend-only for UI, Supabase-backed for persistence | Profile and Resume | 1. Open Profile. 2. Save durable profile fields. 3. Open Resume. 4. Import or edit resume. 5. Review detected fields. 6. Export or review artifacts. 7. Return to Profile for durable state. | Profile completion checklist, AI draft handoffs, Resume import review, local export | Resume import/file upload rows in Section 10 |
| Talent finds and applies to jobs | Supabase-backed web app for durable evidence | Jobs | 1. Open Jobs. 2. Search/filter Explore. 3. Save useful criteria. 4. Review a job. 5. Open Review Application. 6. Edit draft. 7. Submit. 8. Check Applied timeline. | Saved searches, hidden-job preferences, AI draft recommendation, application draft history | Saved-search, AI draft, and provider fallback rows in Section 10 |
| Recruiter publishes a role | Supabase-backed web app with recruiter role | Post Job and Jobs My Posts | 1. Confirm recruiter account. 2. Create or attach company context. 3. Open Post Job. 4. Fill form. 5. Save template if repeated. 6. Review duplicate warnings. 7. Save draft. 8. Publish from My Posts after checklist review. | Job templates, draft history, duplicate warning, publish checklist | Recruiter role, company setup, and provider action-failure rows in Section 10 |
| Recruiter processes candidates | Supabase-backed web app with recruiter role | Candidates | 1. Open Candidates. 2. Search or use Needs scorecard focus. 3. Sort queue. 4. Open details. 5. Add scorecard/private note. 6. Use queue navigation. 7. Review status modal or bulk status modal. 8. Confirm eligible changes. | Focus filters, advisory sort, interview-plan drafts, bulk status review | Bulk skipped rows, local fallback, and status failure rows in Section 10 |
| User follows up with people | Supabase-backed web app for account reminders | Networking and Messaging | 1. Open Networking. 2. Preview person. 3. Send/accept/decline/withdraw as needed. 4. Set reminder. 5. Use Messaging for conversation. 6. Retry failed sends inline. | Reminder setting, due-aware notifications, suggested reply drafts, attachment review | Local fallback, reminder due-state, and failed-send rows in Section 10 |
| User learns or practices skills | Frontend-only for UI, Supabase-backed for progress | Learning and Challenges | 1. Open Learning or Challenges. 2. Search/filter catalog. 3. Use AI handoff only as a reviewed suggestion. 4. Enroll or open workspace. 5. Complete lessons or local sample checks. 6. Persist progress or submit solution. | Reviewed AI learning handoff, progress retries, challenge sample checks, retry history | Enrollment/progress and submission failure rows in Section 10 |
| Operator sends job alerts | Scheduler dry-run, then scheduler commit | Saved-search discovery and notification digest scripts | 1. Confirm reviewed Supabase target. 2. Set service-role env vars in server/operator shell. 3. Run discovery without `--commit`. 4. Review counts. 5. Run scheduler tests. 6. Commit discovery. 7. Dry-run digest delivery. 8. Commit delivery. 9. Check Admin source labels. | Dry-run output, `--commit`, scheduler audit tests, Admin labels | Scheduler dry-run/no-items/env-var rows in Section 10 |
| Operator promotes networking reminders | Scheduler dry-run, then scheduler commit | Networking reminder script and Admin Console | 1. Confirm due reminders exist. 2. Set server-side service-role env vars. 3. Run reminder script without `--commit`. 4. Review due/future/invalid counts. 5. Run scheduler tests. 6. Commit only if output is expected. 7. Confirm notifications and Admin labels. | Dry-run output, due-aware reminders, source labels | Scheduler and notification preference rows in Section 10 |
| Extension user captures local job context | Extension-only review | Extension popup/options | 1. Build extension. 2. Load `dist` unpacked. 3. Open supported job portal page. 4. Scan active page. 5. Review draft. 6. Save locally. 7. Use Resume Match and Interview Planner. 8. Export or clear diagnostics only after review. | Local page-scan draft, local tracker, Resume Match, prep cards, local diagnostics | Extension runtime/storage and Resume Match rows in Section 10 |
| Contributor validates a UI/doc change | Documentation-only or release-validation setup | Source tests, docs validators, `PLAN.md` | 1. Identify touched owners. 2. Run focused tests. 3. Run IA/design/docs/module validators. 4. Run build when source changed. 5. Run diff hygiene. 6. Update `PLAN.md` and related docs. | Feature ownership tests, design-system validator, docs lifecycle validator, module manifest | Documentation validation, Playwright, and docs drift rows in Section 10 |

Runbook rules:

1. Start with the setup mode in the table; do not use a narrower setup as broader evidence.
2. Use the owner column as the only detailed workflow location. Dashboard, notifications, command search, and Admin source labels can guide the user, but they do not become duplicate owners.
3. Keep every write, deletion, publish, billing handoff, status change, import apply, local data clear, or scheduler commit behind the review point named in Sections 8.10 and 8.11.
4. Use Section 8.9 to choose the validation command that matches the evidence claim.
5. Use the first failure check before broad debugging. If the problem is not listed, capture it with the Section 10.1 issue investigation template and update this guide when the root cause recurs.

## 9. Feature And Use Case Matrix

| Need | Use this feature | Role | Notes |
| --- | --- | --- | --- |
| Create an account | Register | Public | Select talent or recruiter intent |
| Sign in | Login | Public | Redirects authenticated users away from public auth pages |
| See today's priorities | Dashboard | Talent, recruiter | Summary and handoff surface only |
| Edit career identity | Profile | Talent, recruiter | Durable profile fields and profile photo |
| Build or export a resume | Resume | Authenticated | Reviewed imports, local PDF/HTML export, artifact review |
| Find jobs | Jobs Explore | Talent | Search, filter, saved searches, hidden-job preferences |
| Apply to jobs | Jobs application review | Talent | Draft review before submit |
| Track applications | Jobs Applied tab | Talent | Status timeline and details |
| Create job posts | Post Job | Recruiter | Templates, drafts, company context, review, publish checklist |
| Manage candidate pipeline | Candidates | Recruiter | Search, focus, scorecards, notes, status decisions |
| Learn skills | Learning | Talent | Catalog search, enrollment, lessons, progress |
| Practice coding | Challenges | Talent | Workspace, local sample checks, submissions, retry history |
| Get draft guidance | AI Assistant | Authenticated | Drafts and reviewed handoffs |
| Generate career path | Career Path | Authenticated | AI-driven guidance route |
| Build network | Networking | Authenticated | Suggestions, requests, reminders |
| Message people | Messaging | Authenticated | Conversations, attachments, failed-send retry |
| Manage subscription | Billing | Authenticated | Demo/provider-aware plan and payment flows |
| Configure preferences | Settings | Authenticated | Notifications, security, account, billing handoff |
| Review platform health | Admin Console | Admin | Metrics, service health, scheduler, audit |
| Track job pages locally | Extension popup | Extension user | Local tracker and page scan draft |
| Compare resume/job text locally | Extension Resume Match | Extension user | Local keyword-overlap preview |
| Plan interviews locally | Extension Interview Planner | Extension user | Local prep cards |
| Export local diagnostics | Extension Diagnostics | Extension user | Local diagnostics only |

Use this companion matrix when choosing between feature variations, setup modes, and examples. It keeps "what can I do here?" in one place without turning dashboards or utility surfaces into duplicate workflow owners.

| Feature area | Supported variations | Example use cases | Streamline or automate with |
| --- | --- | --- | --- |
| Account entry | Public landing, login, talent registration, recruiter registration, invalid-route recovery | Start as a new talent user, create a recruiter account, recover from a mistyped URL | Role-intent registration copy, authenticated redirects, route registry tests |
| Dashboard | Talent summary, recruiter summary, degraded-source retry, quick-action handoffs | Check priorities, resume an application, open recruiter postings, inspect status summaries | Summary cards, source labels, role-specific launch points |
| Profile | Basic profile, skills, experience, education, achievements, photo, AI draft handoffs | Maintain a career profile, accept only trusted AI suggestions, update profile completion items | Reviewed AI drafts, completion checklist, scoped save retries |
| Resume | Manual editing, pasted import, text/markdown import, DOCX import, searchable-PDF import, PDF export, HTML export, artifact review | Convert an old resume into structured rows, export a local copy, review uploaded artifacts | Import review, selected-field apply, export history, artifact library |
| Jobs Explore | Search, filters, saved searches, alert preference, hidden-job preferences, local fit reasons | Reuse a job search, hide irrelevant roles, restore hidden results, review match explanations | Saved search apply/delete review, digest automation, source-labeled fallback recovery |
| Applications | Profile draft, manual draft, AI draft, draft history restore, clear-draft review, submit, Applied timeline | Prepare an application with AI help, recover a draft, verify submission status | Review Application modal, application draft history, status timeline |
| Post Job | Company setup, templates, draft save, duplicate warning, edit draft, publish checklist | Create repeatable job posts, attach company context, safely publish when ready | Job-post templates, draft history, publish readiness review |
| Candidates | Search, focus mode, advisory sort, detail queue, scorecards, notes, interview-plan drafts, bulk status decisions | Screen a candidate queue, add private evidence, move eligible applicants to Interview or Offer | Focus filters, previous/next queue, reviewed status confirmations |
| Learning | Search, category filter, AI search handoff, enrollment, lesson selection, progress update | Find a course from an AI suggestion, enroll, continue lessons, recover failed progress save | Reviewed catalog handoff, progress retries, Continue Learning summaries |
| Challenges | Category filter, workspace, local sample checks, reset review, retry history, submission | Practice coding, run local checks, compare attempts, retry after failed persistence | Local checks before submit, reviewed reset, retry-history refresh |
| AI Assistant | Prompt suggestions, chat, recommendation queue, profile/resume/jobs/learning handoffs, clear-chat review | Draft a headline, generate a cover-letter starting point, get learning search ideas | Draft-only recommendations, explicit destination review, audit events |
| Career Path | Career-path generation, malformed-data recovery, retry, Learning handoff, AI Assistant handoff | Build a learning roadmap and open recommended next steps | Provider retry, reviewed handoffs, generated-path structure |
| Networking | Suggestions, profile preview, full-profile handoff, connect, accept, decline, withdraw, reminder, hide/restore | Build a follow-up list, manage requests, create due reminders | Person-specific controls, local/account reminder backfill, reminder scheduler |
| Messaging | Conversation list, message history, suggested reply draft, link attachment, file upload, failed-send retry, read state | Reply to a recruiter, send a reviewed link, retry a failed message without losing context | Suggested replies, attachment review, scoped failed-send recovery |
| Billing | Plan comparison, current plan, review plan change, checkout handoff, provider portal, payment history, demo mode | Compare subscriptions, start checkout, recover from popup/provider failure | Plan review, provider-aware copy, billing workflow analytics |
| Settings | Profile preferences, notification channels, digest frequency, quiet hours, billing handoff, password reset review, account deactivation review | Tune notification delivery, request password reset, review account-risk actions | Section tabs, reviewed destructive actions, safe settings retries |
| Admin | Metrics, service health, source labels, scheduler status, run-history fallback, product analytics, audit pagination | Investigate platform health, verify automation rollout, review audit trails | Source labels, runbooks, scheduler dry-runs, admin operational analytics |
| Chrome extension | Popup tracker, active-page scan, Resume Match, Interview Planner, local settings, diagnostics export/reset | Capture a job portal page locally, compare resume keywords, plan interviews | Local draft review, local-only diagnostics, runtime smoke tests |
| Scheduler scripts | Saved-search discovery, notification digest delivery, networking reminder promotion, dry-run, commit | Deliver job alerts, promote due reminders, prove automation candidates before writes | Dry-run first, `--commit` only after review, scheduler tests and Admin labels |
| Validation and release evidence | Unit, build, IA, accessibility, contrast, extension, scheduler, docs, module manifest, API/security contracts | Prove the exact workflow claim before release or handoff | Command matrix selection, docs lifecycle, `PLAN.md` evidence rows |

## 10. Common Issues, Root Causes, Solutions, And Prevention

Use this sequence before changing data or configuration:

1. Identify the exact surface: web app, Supabase-backed data, backend service, scheduler script, Chrome extension, or documentation validator.
2. Confirm the setup mode from Section 2.2; do not debug production-provider assumptions from a frontend-only setup.
3. Read visible source labels, fallback copy, or dry-run output before retrying.
4. Use the scoped retry or review control on the owning screen.
5. Run the smallest validation command that matches the failing workflow.
6. Record any unverified provider, deployment, scheduler, or manual accessibility evidence separately from local source validation.

| Issue | Likely root cause | Solution or workaround | Preventive measure |
| --- | --- | --- | --- |
| `npm install` fails | Unsupported Node/npm version or stale install cache | Use Node 18+, remove broken local install artifacts only when reviewed, rerun `npm install` | Pin team Node versions and run installs from `TalentSphere-Unified` |
| Command fails with missing script or package | Command was run from the repository root instead of `TalentSphere-Unified`, or from the frontend workspace when the root script is expected | `cd TalentSphere-Unified` for root npm scripts; use `--workspace talentsphere-web` only for frontend-specific scripts | Keep command examples anchored to their working directory |
| Frontend starts but auth/data is empty | Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` | Create `apps/frontend/.env` with reviewed Supabase anon credentials | Keep `.env.example` style setup notes current and never commit secrets |
| Frontend route redirects to login | No active auth session, expired session, or protected route access without the required role | Sign in again, use the correct role account, or verify role metadata in Supabase | Keep route guards and role claims covered by auth and route-access tests |
| Seed script refuses to run | Missing seed environment or destructive confirmation | Set `app.seed_environment` and `app.allow_destructive_seed_data` before `seed-data.sql` | Use `SEED_DATA_GUIDE.md` and never seed production |
| Seeded login users do not work | Supabase blocked direct `auth.users` insertion | Manually create and confirm seed users, then rerun seed data | Verify auth users before app testing |
| User sees too many routes in local dev | Dev mock user has multiple roles | Test with real Supabase role metadata for role-specific evidence | Do not use dev mock behavior as production authorization proof |
| Recruiter cannot access Candidates | Account lacks `ROLE_RECRUITER` | Confirm auth metadata and route role restrictions | Keep registration role mapping and auth metadata migration reviewed |
| Admin cannot access Admin Console | Account lacks `ROLE_ADMIN` | Use an admin test account or fix auth metadata | Validate role claims through the auth contract before release |
| Command search does not show a route | The route is not visible for the current role or the query does not match route labels/keywords | Use a role that owns the destination, or navigate through the visible owning workflow | Keep command destinations tied to the route registry and feature ownership tests |
| Dashboard card does not allow detailed editing | Dashboards are intentionally summary and handoff surfaces | Open the owning route, such as Jobs, Profile, Resume, Candidates, Messaging, Billing, or Settings | Keep detailed mutations in one owner to avoid duplicate feature placement |
| Saved search or hidden-job preference is local only | Account sync failed or browser storage fallback was used | Continue current session, retry account sync when available | Watch visible source labels and do not assume fallback data is durable |
| Local fallback data disappears | Browser profile, local storage, extension storage, or fallback queue was cleared | Recreate the local data or restore from provider-backed/account-synced source when available | Treat local fallback as convenience state; export diagnostics or artifacts before clearing storage |
| AI suggestion changed nothing | AI output is intentionally draft-only | Open the destination handoff and explicitly apply accepted fields | Keep review-first behavior for all AI handoffs |
| AI or Career Path returns provider-unavailable copy | Provider request failed, provider config is missing, or fallback data cannot satisfy the request | Use visible retry or continue with local/manual workflow drafting | Keep provider errors sanitized and preserve non-mutating draft boundaries |
| Resume import misses content | File is scanned/image-only, unreadable, or outside supported text/DOCX/searchable-PDF paths | Paste readable text, upload a supported readable file, or edit fields manually | Add OCR/provider parse only with explicit review and confidence disclosure |
| File upload or artifact deletion fails | File-service/provider/storage policy failed or browser/provider state is unavailable | Use inline retry, local export, or artifact review controls | Keep upload size/type/security policy and provider retention rules documented |
| Candidate bulk action skips rows | Selected candidates are ineligible for the requested status transition | Review skipped and eligible rows in the confirmation modal before confirming | Keep bulk status decisions advisory and reviewed, not silent |
| Scheduler script changes nothing | Script ran in dry-run mode | Add `--commit` only from a reviewed scheduler/worker | Keep dry-run as default and inspect output before committing |
| Scheduler dry-run finds no items | No alert-enabled saved searches, no due reminders, notification preferences suppress immediate delivery, or the query limits exclude matching rows | Confirm test data, saved-search alert state, digest preferences, reminder due dates, and script limits | Seed or create representative data before using scheduler output as evidence |
| Scheduler script fails immediately | Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` | Set reviewed server-side environment variables | Store service-role keys only in server/scheduler secret stores |
| Documentation validation fails after editing docs | A Markdown file is missing lifecycle classification or a status banner | Update `module-manifest.json` and add a top-level `Documentation status:` banner | Run `npm run validate:docs-lifecycle` before finishing doc changes |
| Guide and app behavior disagree | Documentation drifted from route registry, feature ownership, tests, or current source | Check `docs/FEATURES_AND_DASHBOARDS.md`, source tests, and `PLAN.md`, then update the stale documentation | Update this guide in the same change that moves routes, scripts, setup modes, or workflow ownership |
| Playwright cannot bind local server | Sandbox, port, or local networking restriction | Rerun in an environment allowed to bind localhost, or free the port | Reserve test ports and document CI browser requirements |
| Extension scan says runtime unavailable | Running the popup/options preview outside a real extension runtime | Load the built extension as unpacked in Chromium | Test real scan behavior through built MV3 runtime smoke |
| Extension cannot save tracker or prep data | Browser storage unavailable or quota pressure | Use visible safe storage warning, reduce local data, retry | Keep local storage keys versioned and run storage migration tests |
| Resume Match shows missing or short text guidance | One or both pasted inputs are absent or too short | Paste sufficient job and resume text | Validate text length before comparing |
| Billing checkout fails or provider unavailable | Payment provider not configured or popup blocked | Review Billing retry/provider-unavailable state and allow popup when intended | Keep demo/provider mode explicit and verify provider configuration before release |
| 2FA setup is unavailable | Provider-backed setup is not implemented and verified | Use existing password reset/account security controls | Do not expose incomplete security controls as available |
| Admin health appears degraded | Provider status, scheduler status, or service data is fallback/inferred | Check source labels and investigate through runbooks | Keep live/fallback/degraded source labels visible |
| Screen reader or visual QA evidence is missing | Automated route checks do not replace manual assistive-technology review | Run manual walkthroughs before production release | Track manual QA evidence separately from automated tests |
| Deployed behavior differs from local validation | CDN, environment variables, provider state, or build artifact differs | Compare deployed env, build version, provider credentials, and route behavior | Validate deployed web/extension artifacts before production release |
| Challenge category filter changes the catalog but the open workspace stays the same | Category filters are intentionally catalog-only controls so users do not lose edited solution code or retry-history context | Close the current workspace or choose a different challenge from the filtered catalog when ready to switch | Keep category filters described as catalog-only and preserve the reviewed reset/submission workflow |

### 10.1 Issue investigation template

Use this template when a user reports a problem that is not already covered by the table.

| Field | What to capture | Why it matters |
| --- | --- | --- |
| User goal | The task the user was trying to complete, such as apply, publish, message, run digest, or load extension scan | Prevents debugging a technical symptom while missing the user workflow |
| Surface and owner | The exact route, extension screen, scheduler script, or documentation validator involved | Confirms the issue is handled in the owning workflow instead of a duplicate dashboard or shortcut |
| Setup mode | Frontend-only, Supabase-backed, extension-only, scheduler dry-run, scheduler commit, documentation-only, or release validation | Separates local/fallback evidence from provider or production evidence |
| Last safe step | The last step that worked before a write, delete, publish, checkout, status change, export, or scheduler commit | Identifies where the review-first flow stopped protecting the user |
| Visible signal | Status label, fallback label, error copy, dry-run count, validation failure, or missing route/control | Keeps troubleshooting grounded in user-visible evidence |
| Likely root cause | Configuration, role metadata, provider outage, unsupported file/text, storage quota, dry-run mode, route ownership, docs drift, or deployment mismatch | Turns the symptom into a fixable cause |
| Workaround | Safe retry, reviewed manual path, local export, dry-run repeat, role correction, supported file/input, or owner-route handoff | Gives the user a path forward without inventing behavior |
| Prevention | Test, validator, docs update, source-label improvement, setup checklist update, or release evidence requirement | Reduces repeat confusion for future users |

After resolving the issue, update this guide when the root cause is recurring or when the workaround changes the user's setup, execution, validation, or automation path.

## 11. Reliability And Safety Rules

- Keep dashboards as summaries and handoff points.
- Keep each detailed workflow in one owning route.
- Treat AI output as draft guidance until reviewed.
- Treat extension data as local-only unless future explicit sync is implemented.
- Treat scheduler scripts as dry-run until `--commit` is intentionally supplied.
- Keep service-role keys out of frontend code and browser contexts.
- Read source labels before trusting operational data as live.
- Use safe retry controls instead of refreshing blindly when a screen provides scoped recovery.
- Validate docs and manifests when adding or moving documentation.
- Do not remove a feature, route, tab, action, field, fallback, or workflow without source usage validation and tests.

## 12. Recommended Learning Paths

### New talent user

1. Register as talent.
2. Complete Profile.
3. Build Resume.
4. Search Jobs.
5. Save useful searches.
6. Apply through reviewed drafts.
7. Use Learning and Challenges to close skill gaps.
8. Use Networking reminders for follow-up.
9. Use AI for draft suggestions, then review before applying.

### New recruiter

1. Register as recruiter.
2. Create or attach company context.
3. Build a reusable job-post template.
4. Save a draft.
5. Review checklist and publish.
6. Review Candidates.
7. Use scorecards and notes.
8. Move candidates through statuses with reviewed controls.
9. Use Messaging for candidate follow-up.

### Admin or operator

1. Open Admin Console.
2. Confirm source labels.
3. Review scheduled automation state.
4. Dry-run saved-search discovery.
5. Dry-run digest delivery.
6. Dry-run networking reminders.
7. Commit scheduler runs only from reviewed server-side jobs.
8. Validate source contracts before release.

### Extension user

1. Build and load the unpacked extension.
2. Scan a supported job portal page.
3. Review and save the local scanned draft.
4. Compare resume and job text locally.
5. Create interview prep cards.
6. Export diagnostics only after reviewing local data.

## 13. Production Readiness Notes

Local source validation has strong coverage for frontend behavior, IA ownership, accessibility semantics, rendered route contrast in Chromium, extension popup/options behavior, extension runtime smoke paths, module classification, docs lifecycle, and multiple backend/source contracts.

The following still require separate environment evidence before a production release:

- Hosted CI completion.
- Live Supabase provider validation.
- Live backend Gateway/service integration validation.
- All-browser aggregate reruns after every major change.
- Manual assistive-technology walkthroughs.
- Deployed CDN route and asset verification.
- Deployed Chrome extension update and migration validation.
- Production scheduler image, secret, pod, and run-history verification.
- Production observability dashboard and alert delivery verification.

Use this guide as the operating manual for current source-backed behavior, and use `PLAN.md` as the single source of truth for remaining production-readiness work.

## 14. Maintaining And Extending This Guide

Update this guide in the same change that modifies any user-visible setup step, route, workflow owner, automation script, validation command, extension workflow, provider mode, or troubleshooting rule.

Maintenance checklist:

1. Confirm the changed behavior in source, tests, or scripts before editing the guide.
2. Update the owning workflow section, not only the troubleshooting table.
3. Update Section 9 if a feature's owning route, role, or use case changes.
4. Update Section 8 when automation flags, dry-run behavior, commit behavior, required secrets, or evidence limits change.
5. Update Section 10 with root cause, workaround, and prevention if a recurring failure mode is found.
6. Keep setup instructions scoped by evidence level: frontend-only, Supabase-backed, extension-only, scheduler dry-run, scheduler commit, or release validation.
7. Keep service-role credentials, provider secrets, raw uploaded content, raw resume/job text, and raw provider errors out of examples.
8. Run `npm run validate:docs-lifecycle`, `npm run validate:module-manifest`, and `git diff --check` after documentation changes.
9. Update `PLAN.md` when the guide materially changes, because `PLAN.md` remains the repository SSOT.

## 15. End-To-End Automation Examples

Use these examples when a user needs the whole path, not just a route description. Each example starts with the smallest safe setup mode, names the owner, lists the exact execution steps, names the automation or streamlining lever, and gives the first recovery check if something blocks the workflow.

### 15.1 Talent job-search digest workflow

Best for: A talent user who wants recurring job discovery without manually rebuilding the same search every day.

Setup:

1. Use Supabase-backed web app setup if you need durable saved searches and notifications.
2. Install dependencies from `TalentSphere-Unified`.
3. Configure `apps/frontend/.env` with only the Supabase anon key values.
4. Apply schema and reviewed non-production seed data if you need test accounts.
5. Start the app with `npm run dev`.
6. Sign in as a talent user.

Execution:

1. Open Jobs.
2. Search and filter Explore until the result set matches the user's goal.
3. Save the search and enable alerts only after reviewing the criteria.
4. Apply the saved search once to confirm it restores the intended filters.
5. Open a job from the results.
6. Start Review Application.
7. Use a manual, profile, or AI draft only as editable application text.
8. Submit after the review modal shows the final content.
9. Check the Applied tab timeline.

Automation:

1. From a trusted operator shell, run saved-search discovery without `--commit`.
2. Review candidate counts, skipped searches, and limits.
3. Run `npm run test:saved-search-digest-discovery` and `npm run test:notification-digests`.
4. Rerun discovery with `--commit` only when dry-run output is expected.
5. Run notification digest delivery without `--commit`.
6. Commit delivery only after reviewing grouped delivery candidates.
7. Use Admin source labels before calling the result production evidence.

First recovery checks:

| Symptom | Check first | Why |
| --- | --- | --- |
| Saved search does not restore filters | Confirm the saved-search criteria and current account source label | The search may be local fallback state or saved under another account |
| Digest dry-run finds no jobs | Confirm alerts are enabled, matching jobs exist, and script limits are high enough | The scheduler may be working correctly but have no eligible candidates |
| User receives no notification after commit | Check notification settings, digest frequency, and Admin source labels | Preferences or source state can suppress visible delivery |

### 15.2 Recruiter repeatable hiring pipeline

Best for: A recruiter who posts similar roles and reviews candidates with fewer repeated steps.

Setup:

1. Use Supabase-backed web app setup with a recruiter account.
2. Confirm `ROLE_RECRUITER` metadata before using recruiter-only routes.
3. Open `/dashboard` and verify recruiter summaries appear.

Execution:

1. Open Post Job.
2. Create or attach company context when prompted.
3. Fill the job form.
4. Save a reusable template for repeated roles.
5. Review duplicate warnings before saving the draft.
6. Save as draft.
7. Open My Posts and review the publish checklist.
8. Publish only when blockers are clear.
9. Open Candidates.
10. Use search, focus mode, or advisory sort to build the review queue.
11. Open candidate details and add scorecards or private notes.
12. Use previous/next through the current queue.
13. Review status or bulk-status modals before moving candidates.

Streamlining:

| Repeated work | Use | Review point |
| --- | --- | --- |
| Similar job descriptions | Job-post templates | Template content before draft save |
| Similar candidate triage | Candidates focus mode and advisory sort | Candidate detail panel before status change |
| Interview prep notes | Interview-plan draft generation | Private note text before saving |
| Multiple status updates | Bulk status review | Eligible and skipped rows before confirmation |

First recovery checks:

| Symptom | Check first | Why |
| --- | --- | --- |
| Candidates route is missing | Confirm recruiter role metadata | Route visibility is role-filtered |
| Publish is blocked | Review company context and publish checklist | Publishing is intentionally gated by readiness checks |
| Bulk status skips rows | Review skipped reasons in the modal | Some candidates may be ineligible for the requested transition |

### 15.3 Extension-assisted application preparation

Best for: A user who researches jobs on external portals and wants local job context before applying in the web app.

Setup:

1. Build the extension from `chrome-extension-project`.
2. Load `dist` as an unpacked extension in a Chromium-compatible browser.
3. Keep the web app setup separate; extension local storage is not account sync.

Execution:

1. Open a supported job portal page.
2. Open the extension popup.
3. Scan the active page.
4. Review the scanned draft.
5. Save the draft to the local tracker or discard it.
6. Open extension options.
7. Paste job text and resume text into Resume Match.
8. Run the local comparison and review keyword coverage.
9. Add Interview Planner cards for preparation tasks.
10. Open the web app Jobs or Resume owner when you are ready to apply or edit durable records.

Streamlining:

| Need | Use | Boundary |
| --- | --- | --- |
| Capture a portal role | Popup page scan | Local draft review before save |
| Compare text quickly | Resume Match | Local keyword preview, not cloud AI |
| Prepare talking points | Interview Planner | Local prep cards only |
| Share support details | Diagnostics export | Review local diagnostics before export |

First recovery checks:

| Symptom | Check first | Why |
| --- | --- | --- |
| Popup scan is unavailable | Confirm the built extension is loaded in a real extension runtime | Browser previews do not provide the full MV3 runtime |
| Resume Match shows short-text guidance | Paste enough readable job and resume text | The comparison needs sufficient local text |
| Data is missing after browser reset | Check extension local storage state | Extension workflows are local-first and not web-account synced |

### 15.4 Contributor documentation or UI review workflow

Best for: A teammate who changes presentation, documentation, or route organization without changing feature behavior.

Setup:

1. Work from `TalentSphere-Unified`.
2. Identify the owning route, shared primitive, script, or documentation file before editing.
3. Check `docs/FEATURES_AND_DASHBOARDS.md` and `PLAN.md` when feature placement or dashboard ownership is involved.

Execution:

1. Make the smallest scoped change.
2. Keep dashboards as summaries and handoffs.
3. Keep detailed mutations in the existing owner.
4. Add or update focused tests when the source behavior or accessibility contract changes.
5. Update this guide when setup, workflow ownership, automation, validation, or failure recovery changes.
6. Update `module-manifest.json` and `docs/MODULE_MANIFEST.md` when documentation lifecycle or source ownership changes.
7. Update `PLAN.md` with progress, evidence, remaining gaps, and next actions.

Validation:

1. Run the focused unit, route, extension, scheduler, or validator command for the touched surface.
2. Run `npm run test:ia --workspace talentsphere-web` after route, dashboard, navigation, or feature ownership changes.
3. Run `npm run validate:ui-design-system` after UI presentation changes.
4. Run `npm run validate:docs-lifecycle` and `npm run validate:module-manifest` after documentation changes.
5. Run `npm run build --workspace talentsphere-web` after frontend source changes.
6. Run `git diff --check` on changed files.

First recovery checks:

| Symptom | Check first | Why |
| --- | --- | --- |
| Docs lifecycle validation fails | Confirm every Markdown doc has a status banner and manifest entry | New docs must be lifecycle-classified |
| IA tests fail | Confirm every detailed workflow still has one primary owner | Duplicate feature placement creates user confusion |
| Design-system validation fails | Check token, color, typography, radius, shadow, and marker rules | Presentation must stay reusable and accessible |

Do not use these examples to bypass review-first behavior. They are operating recipes for the current product, not permission to add silent writes, duplicate dashboards, unreviewed AI actions, frontend service-role keys, or unverified production claims.
