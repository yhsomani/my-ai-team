# TalentSphere Master Remediation & Migration Task List

## Phase 1: Infrastructure Unification (Supabase)
- [x] Migrate all 22 Backend Microservices to Supabase PostgreSQL
- [x] Update `docker-compose.yml` for unified DB connectivity
- [x] Configure SSL and JWT environment variables for all services
- [x] Remove local PostgreSQL container dependency

## Phase 2: Authentication & Security Integration
- [x] Implement Supabase Auth (Login/Register) in Frontend
- [x] Integrate Redux `authSlice` with Supabase Session Listeners
- [x] Secure sensitive routes with `ProtectedRoute` component
- [x] Audit RBAC roles (Talent vs Employer) in Metadata

#- [ ] **Phase 3: The Great Rename (Design System Consistency)**
    - [ ] Rename all remaining `Aether*` components in `frontend/src/components/` to `Aura*`
    - [ ] Perform global regex replacement for all `Aether*` imports and component usages
    - [ ] Verify `npm run dev` starts without import errors
- [ ] **Phase 4: Full-Stack Orchestration (Supabase)**
    - [ ] Consolidate SQL schemas from 8 services into `master_schema.sql`
    - [ ] Initialize Supabase project via MCP
    - [ ] Implement Supabase Auth in `api-gateway`
- [ ] **Phase 5: Digital Aurora Polish**
    - [ ] Refactor `ResponsiveLayout.tsx` (Glass Sidebar)
    - [ ] Update `DashboardPage.tsx` with refined Aurora components
- [ ] **Verification & Walkthrough**
    - [ ] Record E2E login and Dashboard interaction
    - [ ] Create walkthrough artifact
- [x] Unified Full-Stack Platform
