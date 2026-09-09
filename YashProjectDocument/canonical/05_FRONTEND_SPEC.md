# TalentSphere — Frontend Specification (Canonical SSOT)

> **Document Version**: 3.1-canonical  
> **Status**: Production Baseline  
> **Reconciled Date**: 2026-09-08  
> **Authority**: `apps/frontend/` source tree; rebuild baselines 01, 03, 08; extraction files 03.  
> **Governing ADRs**: ADR-001 (Supabase Auth Client), ADR-004 (Realtime Messaging Channels), ADR-006 (Chrome Extension MV3 Local Privacy).  
> **Conflict Resolution**: `routeRegistry.ts` is SSOT for route definitions (19 protected routes; PRD's 20 paths archived as intent-history).

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.5 |
| Build Tool | Vite | 7.x |
| Language | TypeScript | 5.7 (strict mode) |
| Styling | Tailwind CSS | 4.2.2 |
| State Management | Redux Toolkit | 2.11.2 |
| Routing | react-router-dom | 7.14.0 |
| Icons | Lucide React | 1.8.0 |
| Animation | Framer Motion | 12.38.0 |
| Design System | Aura (custom primitives) | — |
| Unit Testing | Vitest | 4.1.5 |
| E2E Testing | Playwright | 1.59.1 |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React 19 SPA                          │
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │  Aura Design │  │  Feature Modules (22 pages)     │  │
│  │  System      │  │  ├── pages/                     │  │
│  │  (18 Shared) │  │  ├── components/ (34 total)     │  │
│  └──────────────┘  │  ├── services/ (21 services)    │  │
│                     │  ├── lib/ (~60 utilities)        │  │
│  ┌──────────────┐  │  └── navigation/ (routeRegistry) │  │
│  │ Redux Store  │  └─────────────────────────────────┘  │
│  │ (Slices)     │                                       │
│  └──────────────┘  ┌─────────────────────────────────┐  │
│                     │  Typed Supabase Client           │  │
│                     │  (46 tables, typed queries)      │  │
│                     └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                                        │
         │ Direct PostgREST (Primary)             │ Spring Cloud Gateway
         ▼                                        ▼ (Secondary)
  ┌─────────────┐                      ┌──────────────────┐
  │ Supabase    │                      │ :8080 /api/v1/*  │
  │ PostgreSQL  │                      │ (Heavy Compute)  │
  └─────────────┘                      └──────────────────┘
```

---

## 3. Module Federation

| Property | Value |
|---|---|
| Host Name | `talentsphere_host` |
| Exposed Module | `./AuthComponents` → `LoginPage.tsx` |
| Shared Singletons | `react`, `react-dom`, `react-router-dom`, `@reduxjs/toolkit` |

---

## 4. Aura Design System — 18 Shared Primitives

All primitives reside in `apps/frontend/src/components/shared/`:

| # | Component | Purpose |
|---|---|---|
| 1 | `AuraButton` | Standardized button with variants (primary, secondary, ghost, danger) |
| 2 | `AuraCard` | Content card with consistent padding and shadow |
| 3 | `AuraImage` | Image with loading states and fallback |
| 4 | `AuraInput` | Form input with label, validation, and error state |
| 5 | `AuraModal` | Overlay dialog with focus trap and backdrop |
| 6 | `AuraNavbar` | Top navigation bar with role-adaptive links |
| 7 | `AuraStatusBar` | Status indicator with color-coded states |
| 8 | `AuraThemeProvider` | Light/dark theme context provider |
| 9 | `Badge` | Status/tag badge with color variants |
| 10 | `EmptyState` | Placeholder view for empty lists/containers |
| 11 | `GlassCard` | Glassmorphism-styled card variant |
| 12 | `PageHeader` | Consistent page title + action bar |
| 13 | `ResponsiveLayout` | Mobile-first responsive container |
| 14 | `Skeleton` | Loading placeholder shimmer |
| 15 | `SourceStatusBadge` | AI provenance indicator (heuristic vs verified) |
| 16 | `Tabs` | Tabbed navigation with active state |
| 17 | `Toast` | Ephemeral notification popup |
| 18 | `Toggle` | On/off switch with label |

**Barrel export**: `index.ts` re-exports all 18 primitives.  
**Total shared UI components**: 18 primitives + barrel = 19 files.  
**Total components across app**: 34 (including feature-specific components).

---

## 5. Route Registry (22 Routes Total)

### SSOT: `apps/frontend/src/navigation/routeRegistry.ts`

```
┌────────────────────────────────────────────────────────────────────┐
│                    TALENTSPHERE ROUTE MAP                         │
├────────────────────────────────────────────────────────────────────┤
│ Public Routes (3)                                                  │
│   /              → LandingPage.tsx                                 │
│   /login         → LoginPage.tsx (Module Federation exposed)       │
│   /register      → RegisterPage.tsx (role picker)                 │
├────────────────────────────────────────────────────────────────────┤
│ Protected Routes (19) — require authenticated session             │
│   /dashboard         → DashboardPage.tsx        [USER, RECRUITER] │
│   /jobs              → JobsPage.tsx             [ALL]             │
│   /jobs/:id          → JobDetailPage.tsx        [ALL]             │
│   /jobs/post         → PostJobPage.tsx          [RECRUITER]       │
│   /candidates        → CandidatesPage.tsx       [RECRUITER]       │
│   /lms               → LMSPage.tsx              [ALL]             │
│   /challenges        → ChallengesPage.tsx       [ALL]             │
│   /networking        → NetworkingPage.tsx       [ALL]             │
│   /messaging         → MessagingPage.tsx        [ALL]             │
│   /ai                → AIAssistant.tsx           [ALL]             │
│   /career-path       → AICareerPath.tsx          [ALL]             │
│   /profile           → ProfilePage.tsx           [ALL]             │
│   /profile/:userId   → ProfilePage.tsx           [ALL]             │
│   /resume            → ResumePage.tsx            [ALL]             │
│   /portfolio         → PortfolioPage.tsx         [ALL]             │
│   /notifications     → NotificationsPage.tsx     [ALL]             │
│   /settings          → SettingsPage.tsx          [ALL]             │
│   /admin             → AdminDashboard.tsx        [ADMIN]           │
│   /billing           → BillingPage.tsx           [RECRUITER]       │
└────────────────────────────────────────────────────────────────────┘
```

### Route Access Matrix

| Route | Component | Roles | Layout |
|---|---|---|---|
| `/` | `LandingPage.tsx` | Public | Public Navbar + Footer |
| `/login` | `LoginPage.tsx` | Public | Centered Auth Card |
| `/register` | `RegisterPage.tsx` | Public | Centered Auth Card |
| `/dashboard` | `DashboardPage.tsx` | USER, RECRUITER | Main App Shell |
| `/jobs` | `JobsPage.tsx` | All Authenticated | Main App Shell |
| `/jobs/:id` | `JobDetailPage.tsx` | All Authenticated | Main App Shell |
| `/jobs/post` | `PostJobPage.tsx` | RECRUITER | Main App Shell |
| `/candidates` | `CandidatesPage.tsx` | RECRUITER | Main App Shell |
| `/lms` | `LMSPage.tsx` | All Authenticated | Main App Shell |
| `/challenges` | `ChallengesPage.tsx` | All Authenticated | Main App Shell |
| `/networking` | `NetworkingPage.tsx` | All Authenticated | Main App Shell |
| `/messaging` | `MessagingPage.tsx` | All Authenticated | Main App Shell |
| `/ai` | `AIAssistant.tsx` | All Authenticated | Main App Shell |
| `/career-path` | `AICareerPath.tsx` | All Authenticated | Main App Shell |
| `/profile` | `ProfilePage.tsx` | All Authenticated | Main App Shell |
| `/profile/:userId` | `ProfilePage.tsx` | All Authenticated | Main App Shell |
| `/resume` | `ResumePage.tsx` | All Authenticated | Main App Shell |
| `/portfolio` | `PortfolioPage.tsx` | All Authenticated | Main App Shell |
| `/notifications` | `NotificationsPage.tsx` | All Authenticated | Main App Shell |
| `/settings` | `SettingsPage.tsx` | All Authenticated | Main App Shell |
| `/admin` | `AdminDashboard.tsx` | ADMIN | Admin Shell |
| `/billing` | `BillingPage.tsx` | RECRUITER | Main App Shell |

### Conflict Resolution (CR-01)
Historical PRD listed 20 protected routes with legacy paths (`/post-job`, `/ai-assistant`, `/ai-career-path`, `/admin/analytics`, `/admin/trust-safety`). Per the hierarchy (`code > tests > config > schema > docs`), `routeRegistry.ts` is binding with 19 protected routes. Sub-admin surfaces are hosted as tabs within `/admin`.

---

## 6. Services Layer (21 Frontend Services)

Each service in `apps/frontend/src/services/` maps to a corresponding `*.test.ts` file.

| # | Service | File | Responsibility | API Surface |
|---|---|---|---|---|
| 1 | `adminService` | `adminService.ts` | Feature flags, platform stats | `/api/v1/admin/*` |
| 2 | `aiService` | `aiService.ts` | Career copilot, resume analysis | `/api/v1/ai/*` |
| 3 | `applicationService` | `applicationService.ts` | Job application CRUD | `/api/v1/applications/*` |
| 4 | `authService` | `authService.ts` | Supabase Auth wrapper | Supabase client |
| 5 | `challengeService` | `challengeService.ts` | Challenge CRUD, submissions | `/api/v1/challenges/*` |
| 6 | `companyService` | `companyService.ts` | Company CRUD | `/api/v1/companies/*` |
| 7 | `dashboardService` | `dashboardService.ts` | Dashboard aggregate data | PostgREST |
| 8 | `entitlementService` | `entitlementService.ts` | Subscription entitlement checks | PostgREST |
| 9 | `fileUploadService` | `fileUploadService.ts` | File upload/download | `/api/v1/files/*` |
| 10 | `gamificationService` | `gamificationService.ts` | XP, badges, leaderboard | `/api/v1/gamification/*` |
| 11 | `jobService` | `jobService.ts` | Job CRUD (935 lines) | PostgREST + `/api/v1/jobs/*` |
| 12 | `lmsService` | `lmsService.ts` | Courses, enrollments, lessons | `/api/v1/lms/*` |
| 13 | `messagingService` | `messagingService.ts` | Conversations, messages | `/api/v1/messages/*` + Realtime |
| 14 | `networkingService` | `networkingService.ts` | Connections, feed, suggestions | `/api/v1/networking/*` |
| 15 | `notificationDigestService` | `notificationDigestService.ts` | Digest item management | PostgREST |
| 16 | `notificationService` | `notificationService.ts` | Realtime notifications | `/api/v1/notifications/*` + Realtime |
| 17 | `paymentService` | `paymentService.ts` | Demo billing operations | `/api/v1/payments/*` |
| 18 | `profileService` | `profileService.ts` | Profile CRUD | `/api/v1/profile/*` + PostgREST |
| 19 | `recruiterService` | `recruiterService.ts` | Pipeline stats, recent apps | `/api/v1/recruiter/*` |
| 20 | `settingsService` | `settingsService.ts` | User settings, preferences | PostgREST |
| 21 | `trustAndSafetyService` | `trustAndSafetyService.ts` | Content reports, moderation | PostgREST |

---

## 7. Lib Layer (~60 Utility Files)

Key utilities in `apps/frontend/src/lib/`:

| Utility | Purpose |
|---|---|
| `typedSupabase.ts` | Generated typed Supabase client (46 tables) |
| `supabaseClient.ts` | Supabase client instance |
| `productAnalytics.ts` | Batched event tracking → `product_analytics_events` |
| `unifiedSearch.ts` | Cross-entity search (command palette + page search) |
| `xpLedger.ts` | Client-side XP transaction helpers |
| `dateUtils.ts` | Date formatting and relative time |
| `csvExport.ts` | Data export to CSV |
| `historyManager.ts` | Browser history helpers |
| `workflow-analytics/` | Recording hooks for workflow funnels |
| `ai/` | AI drafts, prefill, audit utilities |

---

## 8. State Management (Redux Toolkit)

### Store Structure
- **Slices per feature**: Each major feature domain has a Redux Toolkit slice
- **Supabase client**: Direct database queries supplement Redux for server state
- **Optimistic updates**: UI immediately reflects mutations, reconciles on server response

### Data Access Pattern
```
Component → Redux Slice (client state) → Selector → Render
         → Service Layer → Supabase PostgREST / Gateway → Redux Dispatch
```

---

## 9. Thematic & Accessibility Design

### AuraThemeProvider
- **Light mode**: `--bg-primary: #ffffff`, `--text-primary: #1a1a2e`
- **Dark mode**: `--bg-primary: #0f172a`, `--text-primary: #e2e8f0`
- Theme persisted in `localStorage`; system preference respected as default

### WCAG 2.1 AA Compliance
- **Contrast ratios**: > 4.5:1 (normal text), > 3:1 (large text)
- **Keyboard navigation**: All interactive controls operable via keyboard (`keyboard-navigation.spec.ts`)
- **Semantic HTML**: ARIA labels on all modals, drawers, form inputs
- **Screen reader**: Live regions for dynamic content updates

---

## 10. Performance Targets

| Metric | Target | Enforcement |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Vite code-splitting + dynamic route imports |
| Bundle Size | < 500KB gzipped | Tree-shaking + lazy loading |
| API p95 Response Time | < 200ms | Gateway caching + PostgREST query optimization |
| Lighthouse Accessibility | > 90 | Automated Playwright a11y tests |

---

## 11. Feature Ownership Mapping

| Feature ID | Primary Page Component(s) | Key Service(s) |
|---|---|---|
| F-01 | LoginPage, RegisterPage, ResetPasswordPage | authService |
| F-02 | LandingPage | — (static + PostgREST stats) |
| F-03 | DashboardPage | dashboardService |
| F-04 | JobsPage | jobService |
| F-05 | PostJobPage | jobService, companyService |
| F-06 | CandidatesPage | applicationService, recruiterService |
| F-07 | LMSPage | lmsService |
| F-08 | ChallengesPage | challengeService |
| F-09 | NetworkingPage | networkingService |
| F-10 | MessagingPage | messagingService |
| F-11 | AIAssistant, AICareerPath | aiService |
| F-12 | ProfilePage | profileService |
| F-13 | ResumePage, ResumeBuilder | profileService, fileUploadService |
| F-14 | NotificationsPage, NotificationBell | notificationService |
| F-15 | SettingsPage | settingsService |
| F-16 | BillingPage | paymentService |
| F-17 | AdminDashboard, AdminPage | adminService |
| F-18 | (Chrome Extension — separate codebase) | — |
| F-19 | AnalyticsPage | productAnalytics |
| F-20 | CommandSearch | unifiedSearch |
| F-21 | ErrorBoundary, NotFound | — (client error hooks) |
| F-22 | GamificationHeaderBadge | gamificationService |
| F-23 | LeaderboardModal | gamificationService |
| F-24 | ReportContentModal, ModerationQueue | trustAndSafetyService |
| F-25 | JobDetailPage | jobService |
| F-26 | PortfolioPage | profileService |
| F-35 | AdminPage (feature-flags tab) | adminService |
| F-36 | (Application draft auto-save) | applicationService |
| F-37 | (Job post template selector) | jobService |

---

## 12. Frontend Test Suite

| Metric | Count |
|---|---|
| Unit test files | **137** |
| Unit test cases | **846** |
| E2E spec files | **28** |
| E2E test declarations | **114** |
| E2E scenario count (approx) | **~235** |
| Framework | Vitest 4.1.5 (unit), Playwright 1.59.1 (E2E) |

### Key E2E Specs
- `accessibility-semantics.spec.ts` — Semantic HTML + ARIA compliance
- `color-contrast.spec.ts` — WCAG 2.1 AA contrast ratios
- `keyboard-navigation.spec.ts` — Full keyboard operation

### Test Commands
```bash
cd apps/frontend && npm run test:unit    # 846 Vitest tests
cd apps/frontend && npm run test:e2e     # 28 Playwright specs
npm run test:a11y                         # Accessibility semantics
npm run test:contrast                     # Color contrast
npm run test:keyboard                     # Keyboard navigation
```
