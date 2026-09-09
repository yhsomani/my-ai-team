# TalentSphere Frontend Documentation

> Documentation status: Historical/stale extracted reference. Use frontend source, `../FEATURES_AND_DASHBOARDS.md`, and `../../../PLAN.md` for current behavior.

## Overview

This documentation is auto-generated using **TypeDoc** for the React/TypeScript frontend.

## Extracted Documentation

### Components
- **`ResponsiveLayout`** - Main layout with sidebar/topbar
- **`AuraButton`** - Custom button with glow effect
- **`AuraCard`** - Legacy compatibility export for shared `Card` / `GlassCard` primitives
- **`AuraInput`** - Custom input with validation
- **`ProtectedRoute`** - Auth-protected route wrapper
- **`ErrorBoundary`** - Global error handler

### Pages
- **`LoginPage`** - User authentication
- **`RegisterPage`** - User registration
- **`DashboardPage`** - Main dashboard
- **`JobsPage`** - Job listings
- **`ProfilePage`** - User profile
- **`LMSPage`** - Learning management
- **`ChallengesPage`** - Coding challenges
- **`NetworkingPage`** - Professional networking
- **`MessagingPage`** - Direct messaging
- **`SettingsPage`** - User settings
- **`BillingPage`** - Subscription/billing

### Services
- **`authService`** - Authentication API calls
- **`jobService`** - Job CRUD operations
- **`profileService`** - Profile management
- **`notificationService`** - Real-time notifications

### State Management (Redux)
- **`authSlice`** - Authentication state
- **`jobsSlice`** - Jobs state
- **`profileSlice`** - Profile state

### Routing
- Uses `react-router-dom` v6.23.0
- Routes defined in `App.tsx`

## Usage

```bash
# Generate documentation
npm run docs

# Serve documentation locally
npm run docs:serve

# Generate and verify
npm run generate-docs
```

## Module Federation Exposed Remotes

The following components are exposed for micro-frontend architecture:

- `./Layout` → `ResponsiveLayout`
- `./Dashboard` → `DashboardPage`
- `./Login` → `LoginPage`
- `./Register` → `RegisterPage`
- `./Jobs` → `JobsPage`
- `./LMS` → `LMSPage`
- `./Profile` → `ProfilePage`
- `./Challenges` → `ChallengesPage`
- `./Networking` → `NetworkingPage`
- `./Messaging` → `MessagingPage`
- `./Settings` → `SettingsPage`
- `./Billing` → `BillingPage`

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI Framework |
| react-router-dom | ^6.23.0 | Routing |
| @reduxjs/toolkit | ^2.11.2 | State Management |
| axios | ^1.6.8 | HTTP Client |
| lucide-react | ^0.378.0 | Icons |
| framer-motion | ^11.18.2 | Animations |

## Build Output

After running `npm run build`:
- Main bundle is code-split
- Vendor chunks for react, ui, redux, api, supabase
- Module Federation remotes available
