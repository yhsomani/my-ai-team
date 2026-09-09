# TalentSphere — Extracted Frontend, Design System, UX & Operational Facts

> **Source Documents**: `DESIGN_SYSTEM.md`, `UX_AUDIT_CHECKLIST.md`, `USER_WORKFLOW_AUTOMATION_GUIDE.md`, `FEATURES_AND_DASHBOARDS.md`, `FRONTEND_ARCHITECTURE.md`, `DATA_OWNERSHIP.md`, `FEATURE_FLAG_SYSTEM.md`, `OPERATIONAL_RUNBOOK.md`, `INCIDENT_RUNBOOKS.md`, `SECURITY_AND_DEVOPS_SPECIFICATION.md`, `MASTER_TRUTH_MATRIX.md`, `MODULE_MANIFEST.md`, `DECISION.md`.  
> **Extraction Standard**: Faithful transcription of hard facts with zero invented values. Stale or contradictory claims are explicitly attributed. Absent details are marked `[RECONSTRUCT: <what>]`.

---

## 1. Design System & Component Primitives (Aura)

### 1.1 Architecture & Token Foundations

The TalentSphere UI is governed by the **Aura Design System**, built on top of **Tailwind CSS 4.2** utility variables and native CSS Custom Properties.

* **Theme Storage & Switching**: 
  * Storage Key: `aura-theme` (in `localStorage`).
  * Supported Modes: `light`, `dark`, and system auto-detect (`prefers-color-scheme`).
  * DOM Application: Injected as `data-theme="dark"` or `data-theme="light"` on the root document element `<html>`.
* **Base Typography**:
  * Primary Font Family: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
  * Monospace Font Family (Code/Terminal): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
  * Hierarchy: 
    * Display / H1: `2.25rem` (36px) / Line-height `2.5rem`, Font-Weight 700 / 800.
    * Heading / H2: `1.875rem` (30px) / Line-height `2.25rem`, Font-Weight 700.
    * Subheading / H3: `1.5rem` (24px) / Line-height `2rem`, Font-Weight 600.
    * Section Title / H4: `1.25rem` (20px) / Line-height `1.75rem`, Font-Weight 600.
    * Body Regular: `0.875rem` (14px) / Line-height `1.25rem`, Font-Weight 400.
    * Body Medium: `0.875rem` (14px) / Line-height `1.25rem`, Font-Weight 500.
    * Small / Caption: `0.75rem` (12px) / Line-height `1rem`, Font-Weight 400 / 500.
* **Spacing Scale (4px Base Grid)**:
  * `0`: `0px`
  * `1`: `0.25rem` (4px)
  * `2`: `0.5rem` (8px)
  * `3`: `0.75rem` (12px)
  * `4`: `1rem` (16px)
  * `5`: `1.25rem` (20px)
  * `6`: `1.5rem` (24px)
  * `8`: `2rem` (32px)
  * `10`: `2.5rem` (40px)
  * `12`: `3rem` (48px)
  * `16`: `4rem` (64px)
* **Border Radius Tokens**:
  * `--radius-sm`: `0.25rem` (4px)
  * `--radius-md`: `0.375rem` (6px)
  * `--radius-lg`: `0.5rem` (8px)
  * `--radius-xl`: `0.75rem` (12px)
  * `--radius-2xl`: `1rem` (16px)
  * `--radius-full`: `9999px`
* **Shadow Elevation Tokens**:
  * `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  * `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
  * `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
  * `--shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
  * `--shadow-2xl`: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`
  * `--shadow-inner`: `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)`

### 1.2 Aura Color Token Palette

| Token Family | Light Theme Value | Dark Theme Value | Purpose / Usage |
|---|---|---|---|
| `--bg-base` | `#ffffff` | `#0f172a` (Slate-900) | Root application canvas |
| `--bg-surface` | `#f8fafc` (Slate-50) | `#1e293b` (Slate-800) | Cards, panels, modal dialogs |
| `--bg-surface-raised` | `#ffffff` | `#334155` (Slate-700) | Elevated cards, popovers, dropdowns |
| `--bg-muted` | `#f1f5f9` (Slate-100) | `#1e293b` | Form inputs, inactive pill tabs |
| `--text-primary` | `#0f172a` (Slate-900) | `#f8fafc` (Slate-50) | Primary headers and body copy |
| `--text-secondary` | `#475569` (Slate-600) | `#94a3b8` (Slate-400) | Subtitles, helper text, labels |
| `--text-muted` | `#64748b` (Slate-500) | `#64748b` (Slate-500) | Placeholder text, timestamps |
| `--text-inverse` | `#ffffff` | `#0f172a` | Text on high-contrast backgrounds |
| `--border-subtle` | `#e2e8f0` (Slate-200) | `#334155` (Slate-700) | Card borders, dividers |
| `--border-strong` | `#cbd5e1` (Slate-300) | `#475569` (Slate-600) | Active input borders, focus outlines |
| `--accent-primary` | `#2563eb` (Blue-600) | `#3b82f6` (Blue-500) | Primary buttons, active indicators |
| `--accent-primary-hover`| `#1d4ed8` (Blue-700) | `#2563eb` (Blue-600) | Primary button hover state |
| `--accent-subtle` | `#eff6ff` (Blue-50) | `#1e3a8a` (Blue-900/40) | Active menu item background |
| `--success` | `#16a34a` (Green-600) | `#22c55e` (Green-500) | Verified status, success toasts |
| `--success-subtle` | `#f0fdf4` (Green-50) | `#14532d` (Green-900/40)| Success badges, progress fills |
| `--warning` | `#d97706` (Amber-600) | `#f59e0b` (Amber-500) | Pending state, warning alerts |
| `--warning-subtle` | `#fffbeb` (Amber-50) | `#78350f` (Amber-900/40)| Warning badges, caution chips |
| `--destructive` | `#dc2626` (Red-600) | `#ef4444` (Red-500) | Delete actions, error banners |
| `--destructive-subtle`| `#fef2f2` (Red-50) | `#7f1d1d` (Red-900/40) | Danger alerts, error pills |

---

### 1.3 Core Component Primitives Catalog (18+ Primitives)

All shared primitives reside in `apps/frontend/src/components/shared/` and are re-exported via `apps/frontend/src/components/shared/index.ts`.

| Primitive Name | Source File | Key Props | States & Variants | Accessible Roles & Slots | Key Architectural Responsibility |
|---|---|---|---|---|---|
| **ResponsiveLayout** | `components/layout/ResponsiveLayout.tsx` | `children`, `sidebarContent`, `showSidebar`, `userRole` | Desktop sidebar, mobile bottom bar, slide-over drawer | `<main id="main-content">`, `<nav aria-label="Main Navigation">` | Global responsive shell containing header, sidebar, mobile navigation, and main content view. |
| **PageTemplate** | `components/shared/PageTemplate.tsx` | `title`, `description`, `actions`, `children`, `className` | Default, wide, compact | Section landmark, breadcrumb slot | Standard page layout wrapper; ensures uniform header, title semantics, and action alignment. |
| **PageHeader** | `components/shared/PageHeader.tsx` | `title`, `description`, `badge`, `actions`, `backLink` | Standard, compact | `header`, `data-slot="page-header"`, `h1` | Renders page title, optional badge metadata, and caller-owned action button groups. |
| **AuraButton** / `Button` | `components/shared/AuraButton.tsx` | `variant`, `size`, `isLoading`, `loadingText`, `icon`, `disabled`, `onClick` | Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg` | `button`, `aria-busy`, `aria-disabled`, `data-slot="aura-button"` | Token-compliant button with loading spinner, icon containment, and keyboard accessibility. |
| **AuraInput** / `Input` | `components/shared/AuraInput.tsx` | `label`, `error`, `helperText`, `icon`, `disabled`, `required`, standard input props | Normal, focus, error, disabled | `aria-invalid`, `aria-describedby`, `data-slot="aura-input"` | Standard form input field bound to validation errors and accessible helper text. |
| **GlassCard** / `AuraCard` | `components/shared/GlassCard.tsx` | `children`, `className`, `hoverEffect`, `onClick`, `title`, `description`, `footer` | Standard, hoverable, clickable, bordered, glassmorphic | `article` or `section`, `data-slot="glass-card"` | Universal container surface with consistent border tokens, elevation, and optional glass styling. |
| **AuraImage** | `components/shared/AuraImage.tsx` | `src`, `alt`, `fallbackSrc`, `aspectRatio`, `loading` | Loading, loaded, failed fallback | `img`, `loading="lazy"`, `decoding="async"`, `data-slot="aura-image"` | Lazy-loaded image with automatic error fallback image and decorative hidden state when broken. |
| **Tabs** | `components/shared/Tabs.tsx` | `tabs: [{id, label, icon, badge}]`, `activeTab`, `onChange`, `ariaLabel` | Horizontal, pill, underline | `tablist`, `tab`, `tabpanel`, `aria-selected`, `roving-tabindex` | Roving-focus tab container handling keyboard arrow navigation (`Left`/`Right`/`Home`/`End`). |
| **StatusBarSurface** | `components/shared/StatusBarSurface.tsx` | `status: 'syncing'\|'healthy'\|'warning'\|'error'`, `message`, `lastUpdated`, `actions` | Synced, syncing, degraded, offline | `status`, `aria-live="polite"`, `data-slot="status-bar"` | Real-time system status indicator for syncing feeds, offline indicators, and worker connectivity. |
| **EmptyState** | `components/shared/EmptyState.tsx` | `icon`, `title`, `description`, `actionLabel`, `onAction` | Standard, compact | `region`, `data-slot="empty-state"` | Zero-data placeholder providing clear feedback and a direct call-to-action button. |
| **ErrorBoundary** | `components/shared/ErrorBoundary.tsx` | `children`, `fallbackMessage`, `onReset` | Safe state, error fallback | `alert`, `data-slot="error-boundary"` | React class error boundary preventing white-screens; suppresses raw stack traces in production. |
| **Skeleton** | `components/shared/Skeleton.tsx` | `variant: 'text'\|'circular'\|'rectangular'`, `width`, `height`, `count` | Shimmer animated pulse | `aria-hidden="true"`, `data-slot="skeleton"` | Content-loading skeleton placeholder matching exact component typography and layout dimensions. |
| **Badge** | `components/shared/Badge.tsx` | `variant: 'default'\|'primary'\|'success'\|'warning'\|'danger'\|'info'`, `size`, `children` | Solid, subtle, outline | `span`, `data-slot="badge"` | Status chip, tag, and counter indicator. |
| **Toggle** | `components/shared/Toggle.tsx` | `checked`, `onChange`, `label`, `disabled`, `size` | Checked, unchecked, disabled | `switch`, `aria-checked`, `data-slot="toggle"` | Accessible toggle switch for boolean settings and feature activation. |
| **Toast** | `components/shared/Toast.tsx` | `id`, `type: 'success'\|'error'\|'warning'\|'info'`, `message`, `onDismiss`, `duration` | Floating, auto-dismiss (5s) | `alert`, `aria-live="assertive"`, `data-slot="toast"` | Transient feedback banner with manual dismiss button and keyboard dismissibility. |
| **AuraModal** | `components/shared/AuraModal.tsx` | `isOpen`, `onClose`, `title`, `description`, `children`, `footer`, `size: 'sm'\|'md'\|'lg'\|'xl'` | Open dialog, closed | `dialog`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby` | Accessible modal dialog with focus trap, backdrop click, Escape key close, and scroll lock. |
| **Typography** | `components/shared/Typography.tsx` | `variant: 'h1'\|'h2'\|'h3'\|'h4'\|'body'\|'caption'`, `as`, `color`, `children` | Heading 1-4, Body, Caption | Semantic HTML (`h1`..`h4`, `p`, `span`) | Typographic building blocks enforcing token font sizes, line heights, and contrast rules. |
| **LegacyHelpers** | `components/molecules/LegacyHelpers.tsx` | Stat card metrics, post card surfaces, status bar mappings | Stat metrics, Post articles, System sync | Auditable slot metadata, decorative avatar initials | Backward-compatible molecule helpers mapped to shared `StatusBarSurface` and `GlassCard`. |

---

## 2. Page & Route Catalog

### 2.1 Route Registry Configuration (`src/navigation/routeRegistry.ts`)

The application router is defined declaratively with strict RBAC gating:

```typescript
interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<any>;
  roles: string[];           // 'ROLE_USER' | 'ROLE_RECRUITER' | 'ROLE_ADMIN' | 'PUBLIC'
  requiresAuth: boolean;
  layout?: 'default' | 'minimal' | 'admin';
  title?: string;
  id: string;
}
```

### 2.2 Complete Route Inventory

#### Public Routes (3)
| Route Path | Component | Auth Required | Allowed Roles | Layout | Primary Purpose |
|---|---|---|---|---|---|
| `/` | `LandingPage` | No | Public (All) | `minimal` | Marketing homepage, value proposition, feature preview, CTAs to login/register. |
| `/login` | `LoginPage` | No | Public (All) | `minimal` | Supabase auth authentication form (email/password, OAuth provider, reset link). |
| `/register`| `RegisterPage` | No | Public (All) | `minimal` | User onboarding form, role selection (`ROLE_USER` vs `ROLE_RECRUITER`), email verification. |

#### Protected Routes (19 Canonical Routes)
| Route Path | Component | Auth Required | Allowed Roles | Layout | Primary Purpose & Features |
|---|---|---|---|---|---|
| `/dashboard` | `DashboardPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER` | `default` | User / Recruiter central home: application progress, job alerts, recent messages, gamification XP. |
| `/jobs` | `JobsPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | Job search directory: keyword filtering, faceted search, salary sliders, remote tags. |
| `/jobs/:id` | `JobDetailPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | Detailed job posting: company profile, requirements, 1-click apply, match score breakdown. |
| `/post-job` | `PostJobPage` | Yes | `ROLE_RECRUITER` | `default` | Recruiter job creator: title, skills, description, compensation range, screening questions. |
| `/candidates` | `CandidatesPage` | Yes | `ROLE_RECRUITER` | `default` | Recruiter talent sourcing pool: candidate search, filters, skill matching, pipeline management. |
| `/lms` | `LMSPage` | Yes | `ROLE_USER`, `ROLE_ADMIN` | `default` | Learning Management System: enrolled courses, video modules, quizzes, certificates. |
| `/challenges` | `ChallengesPage` | Yes | `ROLE_USER`, `ROLE_ADMIN` | `default` | Coding challenges & skill assessments: interactive code editor, test execution, XP reward. |
| `/networking` | `NetworkingPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | Professional network: connection requests, suggested peers, scheduled reminder follow-ups. |
| `/messaging` | `MessagingPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | Direct & group chat: real-time conversation threads, typing indicators, attachments. |
| `/ai` / `/ai-assistant` | `AIAssistantPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | AI Chatbot & Resume Reviewer: interactive prompt interface, provenance disclosures. |
| `/ai-career-path` | `AICareerPathPage` | Yes | `ROLE_USER` | `default` | AI Career Pathway Generator: skill gap analysis, milestone roadmap, course suggestions. |
| `/profile` | `ProfilePage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | User public & private profile: work experience, education, portfolio links, skill badges. |
| `/resume` | `ResumePage` | Yes | `ROLE_USER` | `default` | Interactive Resume Builder: section management, PDF export, ATS keyword optimization. |
| `/portfolio` | `PortfolioPage` | Yes | `ROLE_USER` | `default` | Visual project showcase: media uploads, live URL links, project description modals. |
| `/notifications` | `NotificationsPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | Notification center: system notices, job alerts, connection requests, mark-all-read. |
| `/settings` | `SettingsPage` | Yes | `ROLE_USER`, `ROLE_RECRUITER`, `ROLE_ADMIN` | `default` | User account preferences: password update, notification toggles, theme selector, privacy. |
| `/billing` | `BillingPage` | Yes | `ROLE_RECRUITER` | `default` | Subscription management: plan tiers (Free, Pro, Enterprise), payment history (Demo Mode). |
| `/admin` | `AdminPage` | Yes | `ROLE_ADMIN` | `admin` | Admin dashboard: platform stats, user table, role assignment, active worker status. |
| `/admin/analytics` | `AdminAnalyticsPage`| Yes | `ROLE_ADMIN` | `admin` | Admin deep analytics: user retention, application velocity, API gateway latency graphs. |
| `/admin/trust-safety` | `TrustAndSafetyPage`| Yes | `ROLE_ADMIN` | `admin` | Moderation queue: reported content triage, review actions (approve, delete, suspend user). |

#### Utility & Error Routes
| Route Path | Component | Auth Required | Allowed Roles | Layout | Purpose |
|---|---|---|---|---|---|
| `*` | `NotFoundPage` | No | Public (All) | `minimal` | 404 handler with role-aware recovery links (Home / Dashboard). |

---

### 2.3 Navigation Hierarchy & Mobile Priority

1. **Desktop Sidebar Navigation**:
   * **Candidate (`ROLE_USER`)**: Dashboard, Jobs, LMS, Challenges, Network, AI Assistant, Messages, Profile, Settings.
   * **Recruiter (`ROLE_RECRUITER`)**: Dashboard, Candidates, Jobs, Post Job, Network, Messages, Billing, Settings.
   * **Admin (`ROLE_ADMIN`)**: Admin Console, Moderation Queue, Analytics, Platform Jobs, Network, Settings.
2. **Mobile Bottom Navigation (Top 5 Priority Items)**:
   * **Candidate**: Dashboard (`/dashboard`), Jobs (`/jobs`), Challenges (`/challenges`), Messages (`/messaging`), Profile (`/profile`).
   * **Recruiter**: Dashboard (`/dashboard`), Candidates (`/candidates`), Post Job (`/post-job`), Messages (`/messaging`), Settings (`/settings`).
   * **Admin**: Admin (`/admin`), Moderation (`/admin/trust-safety`), Analytics (`/admin/analytics`), Messages (`/messaging`), Settings (`/settings`).
3. **Mobile Slide-Over Navigation (`Expanded mobile navigation`)**:
   * Contains all secondary items not fitting on the 5-slot bottom bar (e.g., Settings, Billing, AI Assistant, LMS, Portfolio).
   * Labeled with distinct accessibility landmark `aria-label="Expanded mobile navigation"`.

---

## 3. State Management & Data Flow

### 3.1 Redux Store Architecture (`apps/frontend/src/store/`)

State is managed globally using **Redux Toolkit 2.11** configured in `apps/frontend/src/store/index.ts`.

```
apps/frontend/src/store/
├── index.ts                     # configureStore, RootState, AppDispatch
└── slices/
    ├── authSlice.ts             # Auth session, JWT token, user roles, profile summary
    ├── jobsSlice.ts             # Job listings, filters, selected job, application state
    ├── profileSlice.ts          # Extended candidate profile, skills, work history
    ├── messagesSlice.ts         # Chat threads, active conversation, message stream
    ├── notificationsSlice.ts    # Unread notifications, scheduled reminders, alerts
    ├── gamificationSlice.ts     # Total XP, current level, badges array, leaderboard
    ├── lmsSlice.ts              # Courses, active module, quiz progress, enrollments
    ├── challengesSlice.ts       # Assessment challenges, code submissions, test outputs
    ├── networkingSlice.ts       # Peer connections, pending invites, suggested matches
    ├── adminSlice.ts            # Audit logs, reported flags, system analytics metrics
    └── uiSlice.ts               # Aura theme mode, sidebar collapse, active modals
```

### 3.2 Detailed Redux Slices Inventory

| Slice File | State Shape | Key Synchronous Reducers | Key Async Thunks |
|---|---|---|---|
| **authSlice.ts** | `user: User\|null`, `session: Session\|null`, `role: Role`, `isAuthenticated: boolean`, `loading: boolean`, `error: string\|null` | `setUser`, `setSession`, `setRole`, `logout`, `clearError` | `fetchUserProfile`, `updateSessionRole`, `signOutUser` |
| **jobsSlice.ts** | `jobs: Job[]`, `selectedJob: Job\|null`, `filters: JobFilters`, `pagination: PaginationState`, `loading: boolean`, `applyStatus: string` | `setFilters`, `clearFilters`, `setSelectedJob`, `setPage` | `fetchJobs`, `fetchJobById`, `applyToJob`, `saveJobBookmark` |
| **profileSlice.ts**| `profile: Profile\|null`, `skills: Skill[]`, `experience: Experience[]`, `education: Education[]`, `saving: boolean` | `updateLocalProfile`, `addSkill`, `removeSkill` | `fetchProfile`, `saveProfileChanges`, `uploadResumeFile` |
| **messagesSlice.ts**| `conversations: Conversation[]`, `activeThreadId: string\|null`, `messages: Message[]`, `isSending: boolean` | `setActiveThread`, `appendMessage`, `markThreadRead` | `fetchConversations`, `fetchMessagesForThread`, `sendMessage` |
| **notificationsSlice.ts**| `notifications: Notification[]`, `unreadCount: number`, `scheduledReminders: Reminder[]`, `syncStatus: string` | `setNotifications`, `markAllAsReadLocal`, `rollbackReadState` | `fetchNotifications`, `markAllNotificationsRead`, `dismissAlert` |
| **gamificationSlice.ts**| `xp: number`, `level: number`, `badges: Badge[]`, `leaderboard: LeaderboardEntry[]`, `recentAwards: XPAward[]` | `setUserXP`, `addBadge`, `setLeaderboard` | `fetchUserGamification`, `fetchLeaderboard`, `claimDailyReward` |
| **lmsSlice.ts** | `courses: Course[]`, `activeCourse: CourseDetail\|null`, `enrollments: Enrollment[]`, `currentLessonId: string` | `setActiveLesson`, `updateModuleProgress` | `fetchCourses`, `enrollInCourse`, `submitQuizAnswers` |
| **challengesSlice.ts**| `challenges: Challenge[]`, `activeChallenge: ChallengeDetail\|null`, `code: string`, `testResults: TestResult[]` | `updateEditorCode`, `resetEditor`, `clearTestResults`| `fetchChallenges`, `submitChallengeCode`, `runTestsLocally` |
| **networkingSlice.ts**| `connections: User[]`, `pendingRequests: Request[]`, `suggestions: User[]`, `reminders: Reminder[]` | `removeSuggestion`, `optimisticAcceptRequest` | `fetchConnections`, `sendConnectionInvite`, `acceptInvite` |
| **adminSlice.ts** | `analytics: PlatformStats`, `auditLogs: AuditLog[]`, `moderationQueue: ModerationItem[]`, `loading: boolean` | `setModerationFilter`, `removeModeratedItem` | `fetchAdminStats`, `fetchModerationQueue`, `resolveModerationItem` |
| **uiSlice.ts** | `theme: 'light'\|'dark'`, `sidebarCollapsed: boolean`, `mobileNavOpen: boolean`, `commandSearchOpen: boolean` | `setTheme`, `toggleSidebar`, `setMobileNav`, `toggleCommandSearch` | N/A (local UI state only) |

---

### 3.3 Data Access Layer & Supabase PostgREST Integration

* **Primary Client**: `apps/frontend/src/lib/supabaseClient.ts` instantiates `@supabase/supabase-js` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* **Data Access Pattern**: Direct PostgREST queries over HTTPS using Supabase JS client.
* **RLS Enforcement**: Every query automatically sends the user's Supabase JWT in the `Authorization: Bearer <token>` header, evaluated by PostgreSQL Row-Level Security.
* **Realtime Subscriptions**:
  * Live messaging threads: `supabase.channel('messages:thread_id')`.
  * Live notifications: `supabase.channel('user_notifications:user_id')`.
  * Fallback mechanism: Polling service and local storage fallback if WebSocket disconnected.

---

## 4. UX Workflows & Interaction Specifications

### 4.1 Global Shell Workflows

1. **Command Search Palette (`Cmd/Ctrl+K`)**:
   * Shortcut: `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) opens `CommandSearch`.
   * Ranking Algorithm: Searches destinations by label, description, and keywords; exact label matches rank strictly before keyword-only matches.
   * RBAC Filtering: Only destinations permitted for the current user's role are rendered.
   * Accessibility: Search landmark (`role="search"`), described listbox (`role="listbox"`), options with `role="option"`, and accessible zero-result announcement.
2. **Notification Bell & Due Reminders**:
   * Opens popover containing account notifications and role-aware reminders.
   * Scheduled networking follow-up reminders stay visible in the list without prematurely triggering the urgent red badge count until their due date arrives.
   * Source Indicator: Rows explicitly indicate provenance (`Account Sync`, `API Fallback`, or `Local Browser`).
   * Resilient Recovery: If `markAllAsRead` fails remotely, the unread count rolls back optimistically to prevent lost notifications.
3. **Modal Dialogs (`AuraModal`)**:
   * Behavior: Locks background page scroll (`document.body.style.overflow = 'hidden'`).
   * Trapping: Keeps keyboard focus cycled within the dialog.
   * Dismissal: Pressing `Escape` or clicking the backdrop triggers `onClose()`.
   * Restoration: Restores keyboard focus back to the triggering element on unmount.
4. **Toast Notifications Stack**:
   * Placement: Fixed bottom-right corner (`z-50`).
   * Timing: 5-second automatic auto-dismiss for informational/success toasts; errors stay until manually closed.
   * Accessibility: Rendered in an `aria-live="assertive"` alert region with accessible dismiss icon buttons.

---

### 4.2 Role-Specific User Journeys

#### Candidate / Talent Workflow
1. **Discovery & Onboarding**: Register account -> Select `ROLE_USER` -> Complete Profile (Skills, Experience, Bio).
2. **Job Search & Application**: Browse `/jobs` -> Apply faceted filters -> View `/jobs/:id` -> 1-Click Apply -> Submit application.
3. **Skills & Assessment**: Open `/challenges` -> Write code solution in editor -> Run test suite -> Pass tests -> Receive XP reward & badge.
4. **Learning Path**: Open `/lms` -> Enroll in course -> Complete video & quiz modules -> Certificate issued.
5. **AI Career Advisor**: Visit `/ai-career-path` -> Generate career progression roadmap -> Identify missing skills -> Pin recommended courses.
6. **Networking**: Visit `/networking` -> Send connection request to peers -> Schedule follow-up reminder.

#### Recruiter Workflow
1. **Job Creation**: Navigate to `/post-job` -> Fill job requirements, compensation, and screening criteria -> Publish listing.
2. **Candidate Sourcing**: Open `/candidates` -> Filter talent by skill match, location, and assessment XP -> View profile.
3. **Pipeline Management**: Open Job Applicant Kanban -> Move candidate through stages: `Applied` -> `Screening` -> `Interview` -> `Offered` -> `Hired`.
4. **Candidate Scorecard**: Submit interview evaluation notes and rating scores.
5. **Subscription & Billing**: Navigate to `/billing` -> Review plan limits (Demo Mode).

#### Admin Workflow
1. **Platform Health Inspection**: Visit `/admin` -> Review active user metrics, system status, and microservice health.
2. **User Governance**: Inspect user registry -> Modify user role (`ROLE_USER` <-> `ROLE_RECRUITER`) -> Suspend malicious accounts.
3. **Trust & Safety Moderation**: Navigate to `/admin/trust-safety` -> Inspect flagged user reports / job listings -> Approve, Remove, or Ban.
4. **Audit Logging**: Inspect immutable audit trail for sensitive administrative operations.

---

## 5. Feature Flag System

### 5.1 Architecture & Control Plane

TalentSphere utilizes a centralized feature flag architecture defined in the Java backend (`Feature.java` enum) and configured via `feature-flags.yml`.

* **Backend Annotation**: `@EnabledForFeature(Feature.FEATURE_NAME)` guards Spring REST controllers and service methods with AOP interception.
* **Admin REST Endpoints**:
  * `GET /api/v1/admin/feature-flags` — Lists all flags with current boolean status and target environment.
  * `POST /api/v1/admin/feature-flags/{flagKey}` — Toggles flag state dynamically (Admin only).
* **Validation Script**: `npm run validate:feature-flags` guarantees that all flags referenced in frontend code match the backend enum.

### 5.2 Canonical Feature Flags (40 Flags Catalog)

| Feature Flag Key | Category | Default State | Description / Protected Capability |
|---|---|---|---|
| `AUTH_MFA` | Core Platform | `false` | Multi-Factor Authentication via TOTP / SMS |
| `AUTH_OAUTH_GOOGLE` | Core Platform | `true` | Google OAuth single sign-on login provider |
| `AUTH_OAUTH_GITHUB` | Core Platform | `true` | GitHub OAuth single sign-on login provider |
| `USER_PROFILE_EXTENDED`| Core Platform | `true` | Extended candidate profile fields (portfolio, certifications) |
| `USER_SETTINGS_SECURITY`| Core Platform | `true` | Advanced security settings (active sessions, password change)|
| `JOB_SEARCH_FACETED` | Job Board | `true` | Multi-attribute faceted filter engine (salary, remote, skills)|
| `JOB_RECOMMENDATIONS` | Job Board | `true` | Algorithmic job recommendations on candidate dashboard |
| `JOB_ONE_CLICK_APPLY` | Job Board | `true` | 1-Click apply using pre-parsed profile resume data |
| `JOB_ALERTS_EMAIL` | Job Board | `false` | Daily/weekly email digests for matching saved searches |
| `JOB_SALARY_INSIGHTS` | Job Board | `true` | Market salary range visualization on job detail view |
| `RECRUITER_JOB_POSTING` | Recruiter Tools | `true` | Self-service job post creation and publishing |
| `RECRUITER_CANDIDATE_SEARCH`| Recruiter Tools| `true` | Advanced candidate sourcing database |
| `RECRUITER_PIPELINE_KANBAN`| Recruiter Tools| `true` | Drag-and-drop applicant pipeline management |
| `RECRUITER_SCORECARDS` | Recruiter Tools | `true` | Structured interview evaluation scorecards |
| `RECRUITER_BULK_ACTIONS`| Recruiter Tools | `false` | Bulk messaging and status updates for applicants |
| `LMS_COURSES` | Learning / LMS | `true` | Course directory, module viewer, and video lessons |
| `LMS_QUIZZES` | Learning / LMS | `true` | In-course interactive quizzes and knowledge checks |
| `LMS_CERTIFICATES` | Learning / LMS | `true` | Automated PDF certificate generation upon course completion|
| `LMS_COURSE_REVIEWS` | Learning / LMS | `false` | Student star ratings and written reviews on courses |
| `CHALLENGES_CODING` | Gamification | `true` | Interactive browser-based coding challenge editor |
| `CHALLENGES_LEADERBOARD`| Gamification | `true` | Global and monthly gamification XP leaderboards |
| `GAMIFICATION_XP_AWARDS`| Gamification | `true` | Real-time XP point awards for platform interactions |
| `GAMIFICATION_BADGES` | Gamification | `true` | Achievement badge unlocked popups and profile display |
| `GAMIFICATION_DAILY_STREAK`| Gamification | `true` | Daily login streak multiplier and XP rewards |
| `AI_RESUME_ANALYZER` | AI Services | `true` | ATS resume keyword optimization and bullet point critique |
| `AI_JOB_MATCHER` | AI Services | `true` | Semantic vector match scoring between candidate and job |
| `AI_CAREER_ROADMAP` | AI Services | `true` | Step-by-step career path milestone generator |
| `AI_ASSISTANT_CHAT` | AI Services | `true` | Interactive AI career assistant chatbot |
| `NETWORKING_CONNECTIONS`| Networking | `true` | Peer-to-peer connection requests and management |
| `NETWORKING_SUGGESTIONS`| Networking | `true` | Smart colleague and peer discovery suggestions |
| `NETWORKING_REMINDERS` | Networking | `true` | Scheduled follow-up reminders for professional contacts |
| `MESSAGING_DIRECT_CHAT` | Messaging | `true` | 1-on-1 direct messaging threads |
| `MESSAGING_ATTACHMENTS` | Messaging | `true` | Image and PDF document uploads in chat threads |
| `MESSAGING_TYPING_INDICATORS`| Messaging | `false` | Real-time typing indicators over WebSocket |
| `TRUST_SAFETY_REPORTING`| Trust & Safety | `true` | Content report modal on jobs, posts, and user profiles |
| `TRUST_SAFETY_MODERATION`| Trust & Safety | `true` | Admin moderation queue and resolution workflow |
| `BILLING_STRIPE_PAYMENTS`| Billing | `false` | Production Stripe billing gateway integration |
| `BILLING_DEMO_MODE` | Billing | `true` | Mock billing tier selector for recruiter testing |
| `ADMIN_DASHBOARD` | Admin & Ops | `true` | Central administrator platform health view |
| `ADMIN_AUDIT_LOGS` | Admin & Ops | `true` | Immutable security and governance audit trail |

---

## 6. Data Ownership & Direct Database Access

### 6.1 Database Architecture Summary
* **Total Tables**: 60 (50 Canonical Tables + 10 Legacy/Migrated Tables).
* **Direct Frontend Supabase Tables**: 46 tables accessed directly via PostgREST queries with RLS.
* **Row-Level Security (RLS)**: Enabled and enforced on 40 personal/privileged data tables with 119 active SQL policies.
* **Data Ownership Domains**: 15 distinct functional domains.

### 6.2 Domain-to-Table Mapping & Direct Frontend Access

| Domain | Table Name | Direct Frontend Access | RLS Enabled | Primary Key | Key Foreign Keys / Relations |
|---|---|---|---|---|---|
| **Identity & Auth** | `users` | Read / Update | Yes | `id` (UUID) | Matches `auth.users.id` |
| | `user_roles` | Read | Yes | `id` | `user_id` -> `users.id` |
| | `user_sessions` | Read / Delete | Yes | `id` | `user_id` -> `users.id` |
| **Profile & Portfolio** | `profiles` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| | `skills` | Read | No | `id` | Independent dictionary |
| | `user_skills` | Read / Write | Yes | `id` | `user_id`, `skill_id` |
| | `experiences` | Read / Write | Yes | `id` | `profile_id` -> `profiles.id` |
| | `educations` | Read / Write | Yes | `id` | `profile_id` -> `profiles.id` |
| | `portfolio_items` | Read / Write | Yes | `id` | `profile_id` -> `profiles.id` |
| | `resumes` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| **Jobs & Listings** | `jobs` | Read / Write | Yes | `id` | `recruiter_id` -> `users.id` |
| | `job_skills` | Read / Write | Yes | `id` | `job_id`, `skill_id` |
| | `saved_jobs` | Read / Write | Yes | `id` | `user_id`, `job_id` |
| | `job_categories` | Read | No | `id` | Independent classification |
| **Applications** | `applications` | Read / Write | Yes | `id` | `job_id`, `candidate_id` |
| | `application_stages` | Read / Write | Yes | `id` | `application_id` |
| | `scorecards` | Read / Write | Yes | `id` | `application_id`, `recruiter_id` |
| **Recruiting & Org** | `companies` | Read / Write | Yes | `id` | `owner_id` -> `users.id` |
| | `company_members`| Read / Write | Yes | `id` | `company_id`, `user_id` |
| **Learning / LMS** | `courses` | Read | Yes | `id` | `instructor_id` -> `users.id` |
| | `course_modules` | Read | Yes | `id` | `course_id` -> `courses.id` |
| | `lessons` | Read | Yes | `id` | `module_id` -> `course_modules.id`|
| | `enrollments` | Read / Write | Yes | `id` | `user_id`, `course_id` |
| | `lesson_progress`| Read / Write | Yes | `id` | `enrollment_id`, `lesson_id` |
| | `certificates` | Read / Write | Yes | `id` | `user_id`, `course_id` |
| **Challenges** | `challenges` | Read | Yes | `id` | `author_id` -> `users.id` |
| | `challenge_tests`| Read | Yes | `id` | `challenge_id` -> `challenges.id` |
| | `submissions` | Read / Write | Yes | `id` | `user_id`, `challenge_id` |
| **Gamification** | `user_gamification`| Read / Write | Yes | `id` | `user_id` -> `users.id` |
| | `badges` | Read | No | `id` | Independent definition |
| | `user_badges` | Read / Write | Yes | `id` | `user_id`, `badge_id` |
| | `xp_transactions`| Read / Write | Yes | `id` | `user_id` -> `users.id` |
| **Networking** | `connections` | Read / Write | Yes | `id` | `requester_id`, `receiver_id` |
| | `network_reminders`| Read / Write| Yes | `id` | `user_id`, `target_user_id` |
| **Messaging** | `conversations` | Read / Write | Yes | `id` | Group / Direct chat ID |
| | `conversation_participants`| Read/Write| Yes| `id` | `conversation_id`, `user_id` |
| | `messages` | Read / Write | Yes | `id` | `conversation_id`, `sender_id` |
| **Notifications** | `notifications` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| | `user_notification_preferences`| Read/Write| Yes| `id` | `user_id` -> `users.id` |
| **AI Services** | `ai_analyses` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| | `career_paths` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| | `career_path_milestones`| Read/Write| Yes| `id` | `career_path_id` |
| **Trust & Safety** | `content_reports`| Read / Write | Yes | `id` | `reporter_id` -> `users.id` |
| | `moderation_actions`| Read / Write (Admin)| Yes | `id` | `moderator_id`, `report_id` |
| **Billing** | `subscription_plans`| Read | No | `id` | Catalog |
| | `subscriptions` | Read / Write | Yes | `id` | `user_id` -> `users.id` |
| **System & Admin** | `audit_logs` | Read (Admin) | Yes | `id` | `actor_id` -> `users.id` |

---

## 7. Accessibility & WCAG Compliance

### 7.1 Compliance Standard & Contrast Ratios
* **Standard**: **WCAG 2.1 Level AA** compliance across all viewports.
* **Contrast Requirements**:
  * Normal text (< 18pt or < 14pt bold): Minimum **4.5:1** contrast against background.
  * Large text (>= 18pt or >= 14pt bold): Minimum **3.0:1** contrast against background.
  * UI Components & Graphic Boundaries (Inputs, borders, active icons): Minimum **3.0:1** contrast.
* **Automated Token Auditing**: Verified via `npm run validate:aura-tokens` and `npm run test:contrast`.

### 7.2 Keyboard Navigation & Focus Management

| Interaction Pattern | Key Trigger | Expected Behavior |
|---|---|---|
| **Global Traversal** | `Tab` / `Shift+Tab` | Sequential focus navigation through all interactive elements; visible focus ring (`--border-strong` / 2px outline). |
| **Command Palette** | `Cmd+K` / `Ctrl+K` | Opens `CommandSearch`; focuses search input instantly; `Escape` closes and restores prior focus. |
| **Tabs Navigation** | `Left` / `Right` / `Home` / `End` | Roving `tabindex` moves active selection through tabs; `Space` / `Enter` selects tab. |
| **Modal Management** | `Escape` | Closes active dialog; focus returns to the opener button that launched the modal. |
| **Dropdown Menus** | `Up` / `Down` / `Escape` | Navigates options; `Enter` activates option; `Escape` closes popup. |
| **Skip Navigation** | `Tab` (on page load) | First focusable item is "Skip to main content" linking directly to `<main id="main-content">`. |

### 7.3 Screen Reader Semantics & ARIA Landmarks

* **Landmarks**:
  * `<header>` / `role="banner"`: Top global application header.
  * `<nav aria-label="Main Navigation">`: Primary sidebar navigation.
  * `<nav aria-label="Mobile Navigation">`: Mobile bottom bar.
  * `<nav aria-label="Expanded mobile navigation">`: Slide-over drawer navigation.
  * `<main id="main-content">`: Primary page content container.
  * `<aside aria-label="Complementary">`: Auxiliary side panels (chat user list, filter sidebar).
  * `<footer role="contentinfo">`: Platform footer.
* **Dynamic Content Announcements**:
  * `StatusBarSurface`: Uses `aria-live="polite"` for non-disruptive sync updates.
  * `Toast` Alert Region: Uses `aria-live="assertive"` for critical error notices.
  * Form Validation Errors: Linked to inputs via `aria-describedby="field-error-id"` and marked with `aria-invalid="true"`.
* **Motion & Media Preferences**:
  * Respects `prefers-reduced-motion: reduce`: Disables non-essential Framer Motion animations and CSS transitions.
  * Non-text Content: Decorative icons carry `aria-hidden="true"`; all images require meaningful `alt` descriptions on `AuraImage`.

---

## 8. Frontend Test Infrastructure & Quality Gates

### 8.1 Unit & Integration Testing (Vitest)
* **Configuration**: `apps/frontend/vitest.config.ts` (Setup: `vitest.setup.ts`).
* **Test Suites**: 136-137 test files covering 824 to 951 unit tests.
* **Coverage Scope**:
  * Shared UI Primitives (`components/shared/*.test.tsx`)
  * Layout & Navigation Components (`components/layout/*.test.tsx`)
  * Redux State Slices (`store/slices/*.test.ts`)
  * API Service Adapters (`services/*.test.ts`)
  * Utility Libraries (`lib/*.test.ts`)

### 8.2 End-to-End Testing (Playwright)
* **Configuration**: `apps/frontend/playwright.config.ts`.
* **Test Suites**: 28 spec files covering ~235 end-to-end scenarios.
* **Target Browsers**: Chromium, Firefox, WebKit (Safari).
* **Key E2E Test Specs**:
  * `tests/route-access.spec.ts` — RBAC permissions, role gating, unauthenticated redirects.
  * `tests/command-search-workflow.spec.ts` — Command search palette ranking and navigation.
  * `tests/notification-workflow.spec.ts` — Notification lifecycle, fallback sources, retry, unread badge.
  * `tests/keyboard-navigation.spec.ts` — Full keyboard navigation, focus trapping, roving tabs.
  * `tests/job-application-flow.spec.ts` — Candidate job discovery, filtering, and 1-click apply flow.
  * `tests/recruiter-workflow.spec.ts` — Recruiter job posting and candidate pipeline Kanban actions.
  * `tests/auth-flow.spec.ts` — Login, registration, token refresh, and logout workflows.

### 8.3 Automated CI Validation Commands

| Command | Purpose | Verification Target |
|---|---|---|
| `npm run validate:data-ownership` | Validates data ownership manifest against DB schema | `data-ownership-manifest.json` |
| `npm run validate:schema-migrations` | Verifies SQL baseline migrations and RLS policies | `0001_initial_baseline.sql` |
| `npm run validate:typed-supabase-boundary` | Prohibits untyped Supabase imports in frontend | `apps/frontend/src/` |
| `npm run validate:rbac-guards` | Checks route registry against RBAC role definitions | `src/navigation/routeRegistry.ts` |
| `npm run validate:aura-tokens` | Enforces design system CSS token usage | Tailwind config & components |
| `npm run validate:feature-flags` | Enforces sync between frontend flags and backend enum| `Feature.java` vs frontend |
| `npm run test:a11y` | Automated axe-core accessibility compliance checks | All page components |
| `npm run test:contrast` | Enforces WCAG 2.1 AA 4.5:1 color contrast ratios | CSS token definitions |
| `npm run test:keyboard` | Validates focus management and keyboard traps | Interactive modals & menus |
| `npm run validate:test-coverage` | Enforces minimum code coverage thresholds (>80%) | Vitest coverage report |
