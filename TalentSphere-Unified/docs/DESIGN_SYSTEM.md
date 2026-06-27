# TalentSphere Design System

> Documentation status: Current design-system implementation guide for frontend tokens, components, layouts, and interaction patterns.

This guide defines the visual and interaction system for the UI redesign. It is intentionally presentation-focused: business logic, data contracts, permissions, and feature behavior must remain owned by existing services, slices, and routes.

## Design Principles

- Quiet operational UI: dense enough for repeat work, with restrained styling and clear hierarchy.
- One route, one purpose: each page should have a defined workflow owner and avoid duplicating another page's core action.
- Token-first styling: colors, spacing, radii, shadows, focus rings, and surfaces come from shared tokens before page-specific classes.
- Accessible by default: every interactive primitive must provide focus visibility, readable contrast, keyboard reachability, and non-color status cues.
- Performance-aware presentation: skeletons reserve space, long lists paginate or scroll in bounded regions, and transitions are short.

## Tokens

Tokens live in `apps/frontend/src/index.css`.

| Token family | Usage |
| --- | --- |
| `--bg-*` | App canvas, muted page bands, elevated panels, inset fields, overlays |
| `--text-*` | Primary copy, supporting copy, muted metadata, inverse text |
| `--border-*` | Default dividers, subtle containers, stronger hover/active borders |
| `--accent-*` | Primary actions, selected navigation, focus highlights, key links |
| `--success`, `--warning`, `--destructive` | Status states with visible text/icon labels |
| `--radius-*` | Controls, cards, modals, pills; cards should normally stay at `--radius-lg` |
| `--shadow-*` | Floating menus and modal panels; avoid heavy shadows on page sections |
| spacing tokens | Use 4px increments; common page gaps are 16px, 20px, 24px, and 32px |

Tailwind color aliases are declared through `@theme` in `index.css` for `accent`, `success`, `warning`, and `destructive` families. Prefer these token-backed utility names over one-off hex values.

## Layout Rules

- Authenticated pages render inside `ResponsiveLayout`.
- Desktop shell uses a persistent sidebar and sticky header.
- Mobile shell uses a slide-over menu plus bottom navigation from the same route registry.
- Page content uses a constrained readable width by default and can opt into wide tool layouts only for grids, tables, boards, editors, or dashboards.
- Page sections are unframed layouts. Use cards for repeated records, dialogs, and genuinely framed tools.
- Avoid cards inside cards. If grouping is needed inside a card, use borders, dividers, or inset panels.
- Keep primary action groups near the `PageHeader`.

## Typography Rules

- Use Inter with system fallback.
- Do not scale type with viewport width.
- Do not use negative letter spacing in compact panels, cards, sidebars, tables, or controls.
- Page titles use `text-2xl` to `text-3xl`; card titles use `text-sm` to `text-base`.
- Supporting text uses `--text-secondary`; metadata uses `--text-muted`.
- Long words and user-generated text must wrap, clamp, or move into a scroll/disclosure surface.

## Component Usage

| Component | Use for | Rules |
| --- | --- | --- |
| `PageHeader` | Page purpose, supporting copy, primary actions | One per page; actions right aligned on desktop, stacked on mobile |
| `Button` | Commands and form actions | Use icons for tool commands when available; destructive actions need confirmation; loading buttons expose busy state and keep labels visible where space allows |
| `Card` / `GlassCard` | Repeated items, dialogs, framed tools | Avoid nesting; use consistent padding and hover only when interactive |
| `Tabs` | Switching views inside one workflow | Use for peer views, not navigation to unrelated routes; arrow keys, Home, and End move between tabs and keep focus on the selected tab |
| `EmptyState` | No data states | One clear explanation and one recovery action where useful |
| `Skeleton` | Loading states | Match final dimensions; avoid layout jumps |
| `Badge` | Status, source, and compact metadata | Do not rely on color alone |
| `Toast` | Transient confirmation, warning, and error notices | Use for short-lived feedback only; persistent degraded or failed content must also appear inline |
| `AuraModal` | Focused review/confirmation | Keep action order predictable, trap focus while open, close on Escape, and restore focus to the opener |

## Navigation Patterns

- `routeRegistry.ts` is the source for sidebar, mobile nav, protected routes, and command search destinations.
- `featureOwnership.ts` is the source-backed IA contract for deciding which route or surface owns each major feature.
- Primary navigation should include domain owners only: Dashboard, Jobs, Candidates, Learning, Challenges, Network, AI, Messages, Admin.
- Account navigation should include Settings and Profile.
- Domain-specific utilities such as Resume, Career Path, Billing, and Post Job may remain routes, but primary discovery should come from their owning domain pages until a validated IA decision promotes them.
- Header search is route discovery, not product full-text search.
- Shell search uses a combobox/listbox pattern for route destinations. It must remain keyboard reachable and should not become a hidden full-text search without a new contract.
- Header notifications use a named popover region. Reminder, account notification, Mark read, and Load more actions must stay keyboard reachable, and Escape should close the popover while returning focus to the notification trigger.
- Secondary feature placements must be summaries, links, reviewed handoffs, preference snapshots, or search destinations. They must not duplicate the owner route's full workflow controls.

## Interaction Patterns

- Critical changes require explicit review, cancel, and confirm states.
- AI output is a draft until accepted in the destination workflow.
- Fallback, local-only, demo, degraded, inferred, stale, and not-configured states must be visible.
- Retry controls should be near the failed content and should not imply that data changed unless the underlying operation supports it.
- Toasts are for transient confirmation; persistent status belongs inline.
- Toast stacks avoid the mobile bottom navigation and stay in a bounded scroll region on narrow screens so repeated messages do not cover the main workflow.
- Composer attachment panels should move focus to the newly revealed input and keep hidden file inputs out of normal tab order when a visible Upload button owns file selection.

## Accessibility Rules

- Preserve visible focus rings with `:focus-visible`.
- Icon-only buttons require `aria-label` or adjacent visible text.
- Async updates use `role="status"` or `role="alert"` where appropriate.
- Dialogs must trap focus and restore control on close through `AuraModal`.
- Tabs use semantic tab roles and keyboard navigation. Keep each tab label stable and concise.
- Color-coded status must include text or an icon with accessible label.
- Every route-level screen must expose a main landmark and a visible page heading.
- Form controls need programmatic labels; placeholders are helper copy, not labels.
- Duplicate navigation landmarks need accessible names so screen-reader users can distinguish them.
- Command search, header notifications, mobile navigation, shared tabs, and auth form submission must stay operable without a pointer.

## Performance Rules

- Prefer CSS variables and shared classes over repeated inline style blocks.
- Keep skeletons and empty states lightweight.
- Use bounded scroll regions for menus, notifications, lists, and command search.
- Avoid adding heavy animation libraries for primitive transitions; use short CSS transitions and respect reduced motion.

## Source Guardrails

`npm run validate:ui-design-system` scans the web app and extension source for legacy visual-system regressions. The validator rejects old Aurora/neon/glass classes, decorative gradient utilities, oversized card/control radii, nonstandard letter-spacing utilities, and hard-coded black/white Tailwind foreground/background utilities in UI source. Use semantic app tokens or extension tokens instead.

`npm run test:ia` validates the route registry plus feature ownership registry so every protected route has exactly one primary feature owner, public routes are classified, route paths and role restrictions stay aligned, and candidate merge decisions remain explicit instead of removing behavior silently.

`npm run test:a11y` validates major-route accessibility semantics in Chromium. It checks visible main landmarks, page headings, named interactive controls, programmatically labeled form controls, distinguishable duplicate navigation landmarks, and visible image alt/decorative treatment across public, talent, recruiter, and admin desktop/mobile route states.

`npm run test:keyboard` validates high-risk keyboard navigation in Chromium. It checks command search focus, result arrow selection, submit behavior, notification reminder activation, account notification Mark read, account notification destination activation, notification Load more pagination, notification popover focus restoration, mobile bottom-navigation activation, shared `Tabs` Arrow/Home/End roving focus, shared `AuraModal` focus trap/restore behavior, and login form Enter submission.

`npx playwright test tests/visual-layout.spec.ts --project=chromium --reporter=line` is the route-level layout guardrail for major screens. It verifies public, talent, recruiter, and admin route states at desktop and mobile widths for accessible page headings, no visible `undefined` text, no browser page exceptions, and no horizontal document overflow. Use it after shell, navigation, page-header, card-grid, tab, table, modal, or responsive-layout changes.

## Current Implementation Scope

The redesign implementation now covers the shared shell/primitives, documentation, public landing/auth routes, authenticated dashboards, major web workspaces, a source-backed feature ownership registry, route-level desktop/mobile layout audit coverage, route-level accessibility semantics coverage, and focused keyboard navigation coverage. `LandingPage` keeps its typed Supabase public stat counts, fallback stats, auth links, and role-selection destinations while replacing the old neon/gradient presentation with token-backed navigation, first-viewport product preview, feature, IA, stats, and footer sections.

Exported legacy helper components have been normalized so future reuse does not reintroduce the older themed UI. `Typography`, `PostCard`, `StatCard`, `SyncStatusBar`, `AuraStatusBar`, `AuraNavbar`, `MobileMenu`, `AuraImage`, `PageTemplate`, and the older toast context now use the shared token surface, typography, status, focus, and spacing rules while keeping their existing exports and public props.

`DashboardPage` uses shared local patterns for status, onboarding checklists, metrics, section headers, quick actions, and summary rows while preserving existing service calls, analytics events, routes, and role behavior.

Legacy dashboard widgets in `pages/dashboard/components` have also been normalized to token-backed surfaces and plain product terminology. They remain behavior-compatible with their existing props and do not introduce route deletion, dashboard removal, or feature consolidation.

`JobsPage` keeps Jobs as the domain owner for discovery, saved searches, hidden Explore preferences, applications, application drafts, application status, and recruiter postings. The current UI pass normalizes its search/filter tool surface, saved/hidden preference panels, result summary bar, result cards, and modal text/surfaces without changing handlers, query state, route parameters, tab behavior, or mutations.

`PostJobPage` keeps job posting as a reviewed recruiter command workflow for reusable templates, draft history, company context setup, duplicate warnings, and save-to-draft review. The current UI pass normalizes its form controls, template/history/company panels, review summary, duplicate warning state, and mobile action footer with token-backed surfaces and stable dimensions without changing template sync, draft-history sync, company creation/update, duplicate checks, route parameters, save behavior, or onboarding analytics.

`CandidatesPage` keeps Candidates as the recruiter-owned workspace for application review, notes, scorecards, interview-plan drafts, status decisions, and bulk status reviews. The current UI pass normalizes the search/focus/pagination tool surface, review analytics, bulk toolbar, candidate rows, detail sections, and confirmation modals with token-backed panels, inset surfaces, stable row dimensions, and shared success/warning/destructive colors without changing handlers, cursor state, persistence, route behavior, or mutations. Candidate workflow coverage verifies details review, queue navigation, bulk Offer review, unsaved review reset, application pagination, profile-backed search, and review-focus filtering across browser projects.

`ProfilePage` keeps Profile as the durable identity workspace for headline, location, bio, avatar, skills, experience, education, achievements, local suggestions, and AI profile-draft review. The current UI pass removes remaining legacy letter-spacing classes and tightens the shared `ResponsiveLayout`, `Header`, and `.app-page` width constraints so Profile header actions, tabs, avatar controls, and metrics stay inside mobile viewports without changing profile loading, edit modals, AI draft review, local suggestions, avatar upload/crop/remove flows, row mutations, tab behavior, or analytics events.

`ResumeBuilder` keeps Resume as the focused document workspace for profile-backed editor fields, file/text import review, AI draft review, PDF/HTML/print export commands, uploaded artifact links, delete receipts, and preview. The current UI pass normalizes loading, import review, editor rows, preview headings, long text wrapping, and shared `AuraModal`/`AuraButton` surfaces with token-backed styling and mobile-safe modal actions without changing profile-service calls, import parsing, AI handoff review, export commands, artifact copy/delete behavior, local/account sync fallback, toast behavior, or analytics events.

`SettingsPage` keeps Settings as the account preference workspace for profile settings, notification preferences, security reviews, account deactivation review, and Billing handoff. The current UI pass normalizes its side navigation, profile settings panel, notification switches and delivery controls, security review panels, and billing summary tiles with token-backed surfaces and shared status colors without changing save handlers, password reset review, account deactivation confirmation, billing navigation, toast behavior, or analytics events.

`BillingPage` keeps Billing as the money-handling workspace for plan comparison, payment method review, transaction history, provider unavailable state, and explicit demo/provider-backed source labeling. The current UI pass normalizes its plan grid, plan empty state, payment method panel, transaction rows, status badges, demo/degraded banners, loading state, and review modal actions with token-backed surfaces, mobile-safe wrapping, and visible non-provider-backed status without changing payment-service calls, checkout/session commands, billing portal commands, retry behavior, toast behavior, or analytics events.

`AIAssistant` keeps AI as the assistant and review hub for prompt entry, draft guidance, review queue state, save/dismiss decisions, workflow handoffs, local/account chat persistence, and provider-degraded responses. The current UI pass normalizes its review queue, clear-chat review, message bubbles, prompt draft panel, composer, and exported AI subcomponents with token-backed surfaces, bounded mobile message widths, and product-language draft/review copy without changing chat calls, suggestion persistence, review audits, workflow handoffs, local fallback behavior, toast behavior, or analytics events.

`AICareerPath` keeps Career Path as a generated-guidance review route until route analytics and user-flow validation justify merging it into AI Assistant. The current UI pass normalizes loading, generated path, required skills, milestones, degraded state, retry actions, and review-boundary panels with token-backed surfaces and mobile-safe wrapping without changing the AI generation call, path normalization, retry behavior, Learning navigation, AI Assistant navigation, or review-only semantics.

`AdminDashboard` keeps Admin as the role-gated operational console for metrics, service health, audit logs, scheduler status, and product analytics insights. The current UI pass normalizes loading, fallback/degraded banners, analytics subsections, scheduler job rows, service-health table overflow, audit status, source badges, and long operational text wrapping with token-backed surfaces without changing admin service calls, scheduler config reads, audit pagination, observability links, refresh handlers, role behavior, or analytics events.

The Chrome extension popup keeps the companion workflow local-first for tracked jobs, scanned page drafts, local diagnostics, and operational analytics export. The current popup UI pass adds extension-local tokens in `chrome-extension-project/src/index.css` and normalizes `PopupApp`, dashboard/tracker/diagnostics views, shared extension error boundary, and popup/options HTML wrappers without changing storage keys, localStorage fallback, MV3 messaging, content-script scan draft mapping, tracked-job mutations, diagnostics export, runtime smoke contracts, or local-only sync posture.

The Chrome extension options console keeps deeper companion workflows local-first for resume match preview, interview planner cards, local reminder/diagnostics preferences, and sync-disabled review copy. The current options UI pass normalizes the options shell, Resume Match panels/results, Interview Planner form/cards/clear review, Settings sync review/toggles/reset review, and options HTML wrapper with extension-local tokens without changing keyword extraction, delayed match result behavior, prep-card storage, local settings storage, operational analytics, or ADR-006 sync-disabled posture.

`LMSPage` keeps Learning as the talent-owned workspace for course discovery, enrollment, progress, curriculum review, and lesson completion. The current UI pass normalizes the AI search review surface, progress-warning panel, continue/recommended course cards, catalog tab/search/pagination tool surface, catalog cards, skeleton cards, progress tracks, and course-detail modal panels without changing Redux query state, service calls, enrollment/progress mutations, route behavior, or analytics events.

`ChallengesPage` keeps Challenges as the talent-owned assessment workspace for challenge discovery, category filtering, prompt review, starter-code editing, local sample checks, submissions, and retry history. The current UI pass normalizes its category filter surface, challenge cards, skeletons, workspace metadata, prompt/editor panels, reset review, sample/local-check panels, latest-submission summary, and retry-history panels without changing Redux fetch behavior, local runner behavior, submission commands, reset confirmation behavior, route behavior, or analytics events.

`NetworkingPage` keeps Network as the relationship workspace for professional suggestions, incoming requests, sent requests, accepted connections, hidden-suggestion preferences, profile preview, and follow-up reminders. The current UI pass normalizes its tab/search/count tool surface, hidden preference and reminder status panels, suggestion/request/connection cards, preview modal, loading/empty/error states, and exported networking subcomponents with token-backed surfaces and stable dimensions without changing Redux state, service calls, local storage fallback behavior, reminder notification sync, request mutations, route behavior, or analytics events.

`MessagingPage` keeps Messages as the direct-conversation workspace for thread discovery, active conversation review, message history paging, unread/read state, realtime updates, attachments, optimistic sends, retries, and suggested reply drafts. The current UI pass normalizes its conversation list, active thread header, visible realtime state, message log, attachment panels, reply suggestions, composer, empty/error states, and exported messaging subcomponents with token-backed surfaces and bounded scroll regions without changing Redux state, Supabase realtime behavior, file upload calls, send/read/retry handlers, route behavior, or analytics events. Messaging keyboard workflow coverage verifies attachment-link focus order and payloads, explicit visible mark-read payload/feedback, and older-history loading.

Remaining page-by-page restructuring must follow the UX audit checklist and be validated one workflow at a time before any feature placement is merged, moved, or removed.

Route/access validation now includes `apps/frontend/tests/route-access.spec.ts`, which exercises unauthenticated protected-route redirects plus talent, recruiter, and admin desktop navigation, mobile bottom navigation, and direct-route behavior using an explicit E2E auth override. This browser coverage supplements the route-registry unit tests and passed locally across Chromium, Firefox, and WebKit; it does not prove live Supabase sessions, live backend data, hosted CI execution, or deployed CDN behavior.
