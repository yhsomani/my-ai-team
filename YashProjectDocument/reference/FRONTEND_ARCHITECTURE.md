# TalentSphere Frontend Architecture Specification

> Documentation status: Canonical frontend architecture baseline. Reconciled with codebase on 2026-09-08.

## 1. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React | 19.2.5 | UI component model |
| Build Tool | Vite | 7.0.0 | Development server, bundling |
| Language | TypeScript | 5.7.x | Type safety, developer experience |
| Styling | Tailwind CSS | 4.2.x | Utility-first CSS framework |
| State Management | Redux Toolkit | 2.11.x | Global state, slices, thunks |
| Routing | react-router-dom | 7.14.x | Client-side routing |
| Animation | Framer Motion | 11.x | Declarative animations |
| Icons | Lucide React | 0.460.x | Icon library |
| Testing (Unit) | Vitest | 1.x | 136 test files, 824 unit tests |
| Testing (E2E) | Playwright | 1.x | 28 E2E spec files (~235 scenarios) |
| HTTP Client | Supabase JS Client | 2.x | Direct PostgREST queries |

## 2. Application Structure

```
apps/frontend/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── auth/            # Authentication components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── gamification/    # XP badge, leaderboard modal
│   │   ├── jobs/            # Job cards, filters
│   │   ├── layout/          # Header, Sidebar, Footer
│   │   ├── messaging/       # Chat interface
│   │   ├── networking/      # Connection cards
│   │   ├── trust/           # Content reporting, moderation queue
│   │   └── ui/              # Reusable primitives (Button, Modal, etc.)
│   ├── pages/               # 22 lazy-loaded route pages
│   │   ├── admin/           # AdminDashboard, Analytics
│   │   ├── ai/              # AIAssistant, AICareerPath
│   │   ├── auth/            # LoginPage, RegisterPage, ResetPasswordPage
│   │   ├── dashboard/       # DashboardPage
│   │   ├── jobs/            # JobsPage, JobDetailPage, PostJobPage
│   │   ├── lms/             # LMSPage
│   │   ├── challenges/      # ChallengesPage
│   │   ├── networking/      # NetworkingPage
│   │   ├── messaging/       # MessagingPage
│   │   ├── notifications/   # NotificationsPage
│   │   ├── profile/         # ProfilePage, ResumeBuilder
│   │   ├── settings/        # SettingsPage
│   │   └── billing/         # BillingPage
│   ├── lib/                 # Utility functions, analytics
│   ├── services/            # API service adapters
│   ├── store/               # Redux Toolkit slices
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── navigation/          # Route registry, guards
```

## 3. Route Registry & RBAC

### 3.1 Route Configuration (`src/navigation/routeRegistry.ts`)

```typescript
interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<any>;
  roles: string[];           // RBAC roles allowed
  requiresAuth: boolean;
  layout?: string;           // 'default' | 'minimal' | 'admin'
}
```

### 3.2 Route Inventory

#### Public Routes (3)
| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |

#### Protected Routes (19)
| Route | Component | Allowed Roles |
|-------|-----------|---------------|
| `/dashboard` | DashboardPage | ROLE_USER, ROLE_RECRUITER |
| `/jobs` | JobsPage | All authenticated |
| `/jobs/:id` | JobDetailPage | All authenticated |
| `/post-job` | PostJobPage | ROLE_RECRUITER |
| `/candidates` | CandidatesPage | ROLE_RECRUITER |
| `/lms` | LMSPage | All authenticated |
| `/challenges` | ChallengesPage | All authenticated |
| `/networking` | NetworkingPage | All authenticated |
| `/messaging` | MessagingPage | All authenticated |
| `/ai-assistant` | AIAssistant | All authenticated |
| `/ai-career-path` | AICareerPath | All authenticated |
| `/profile` | ProfilePage | All authenticated |
| `/resume` | ResumePage | All authenticated |
| `/portfolio` | PortfolioPage | All authenticated |
| `/notifications` | NotificationsPage | All authenticated |
| `/settings` | SettingsPage | All authenticated |
| `/billing` | BillingPage | ROLE_RECRUITER |
| `/admin` | AdminPage | ROLE_ADMIN |
| `/admin/analytics` | AdminAnalyticsPage | ROLE_ADMIN |
| `/admin/trust-safety` | TrustAndSafetyPage | ROLE_ADMIN |

### 3.3 Route Guard Implementation

```typescript
// ProtectedRoute component pattern
const ProtectedRoute = ({ children, requiredRoles }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};
```

## 4. State Management (Redux Toolkit)

### 4.1 Store Structure

```
store/
├── index.ts              # configureStore
├── slices/
│   ├── authSlice.ts      # User session, JWT, role
│   ├── jobsSlice.ts      # Job listings, filters, pagination
│   ├── profileSlice.ts   # User profile data
│   ├── messagesSlice.ts  # Conversations, messages
│   ├── notificationsSlice.ts  # Real-time notifications
│   ├── gamificationSlice.ts   # XP, badges, leaderboard
│   ├── lmsSlice.ts       # Courses, enrollments, progress
│   ├── challengesSlice.ts # Coding challenges, submissions
│   ├── networkingSlice.ts # Connections, suggestions
│   ├── adminSlice.ts     # Admin analytics, audit logs
│   └── uiSlice.ts        # Theme, sidebar state, modals
```

### 4.2 Key Slice Patterns

```typescript
// Example: gamificationSlice.ts
const gamificationSlice = createSlice({
  name: 'gamification',
  initialState: {
    xp: 0,
    level: 1,
    badges: [],
    leaderboard: [],
    loading: false,
  },
  reducers: {
    setUserXP: (state, action) => {
      state.xp = action.payload.total_xp;
      state.level = Math.floor(action.payload.total_xp / 100) + 1;
    },
    addBadge: (state, action) => {
      state.badges.push(action.payload);
    },
  },
});
```

## 5. Design System (Aura)

### 5.1 Design Tokens

```css
/* Tailwind CSS 4.2 Configuration */
:root {
  /* Primary */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  
  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-900: #111827;
  
  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### 5.2 Component Library

| Component | File | Purpose |
|-----------|------|---------|
| Button | `components/ui/Button.tsx` | Primary, secondary, ghost variants |
| Modal | `components/ui/Modal.tsx` | Dialog, confirmation, form modals |
| Card | `components/ui/Card.tsx` | Content containers |
| Badge | `components/ui/Badge.tsx` | Status indicators, labels |
| Input | `components/ui/Input.tsx` | Form fields with validation |
| Table | `components/ui/Table.tsx` | Data grids with sorting |
| Tooltip | `components/ui/Tooltip.tsx` | Contextual help |
| Toast | `components/ui/Toast.tsx` | Success/error notifications |

## 6. Key Subsystem Integrations

### 6.1 Gamification System
- **GamificationHeaderBadge**: Displays user XP and level in header
- **LeaderboardModal**: Shows top users, ranking, XP history
- **XP Award Flow**: ChallengesPage/LMSPage → gamificationService → xp_transactions table

### 6.2 Trust & Safety
- **ReportContentModal**: User-initiated content reporting
- **TrustAndSafetyModerationQueue**: Admin moderation interface
- **Triage Workflow**: pending → under_review → resolved | dismissed

### 6.3 AI Career Assistant
- **SourceStatusBadge**: Provenance disclosure for AI suggestions
- **Draft Lifecycle**: draft → saved | dismissed
- **Heuristic Engine**: analyzeResume, getMatchScore, generateCareerPath

## 7. Test Infrastructure

### 7.1 Unit Testing (Vitest)

| Metric | Value |
|--------|-------|
| Test Files | 136 |
| Total Tests | 824 |
| Coverage Target | >80% |
| Setup File | `vitest.setup.ts` |
| Config | `vitest.config.ts` |

### 7.2 E2E Testing (Playwright)

| Metric | Value |
|--------|-------|
| Test Suites | 28 |
| Browsers | Chromium, Firefox, WebKit |
| Config | `playwright.config.ts` |

### 7.3 Test File Distribution

```
src/
├── components/**/*.test.tsx    # Component unit tests
├── pages/**/*.test.tsx         # Page-level tests
├── lib/**/*.test.ts            # Utility function tests
├── services/**/*.test.ts       # Service adapter tests
└── store/**/*.test.ts          # Redux slice tests
```

## 8. Performance Optimizations

| Technique | Implementation |
|-----------|----------------|
| Code Splitting | React.lazy() for 22 route pages |
| Memoization | React.memo, useMemo, useCallback |
| Virtual Scrolling | Large list rendering (candidates, jobs) |
| Image Optimization | Lazy loading, responsive sizes |
| Bundle Analysis | Vite bundle analyzer plugin |
| Caching | React Query for server state |

## 9. Accessibility Features

| Feature | Implementation |
|---------|----------------|
| Keyboard Navigation | Tab order, focus management |
| Screen Reader Labels | aria-label, aria-describedby |
| Color Contrast | WCAG 2.1 AA compliant tokens |
| Focus Indicators | Visible focus rings |
| Reduced Motion | prefers-reduced-motion support |
| Semantic HTML | Proper heading hierarchy, landmarks |
