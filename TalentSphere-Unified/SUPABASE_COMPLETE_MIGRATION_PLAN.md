# TalentSphere — Complete Supabase Migration Plan

## Executive Summary

This document outlines the complete migration of TalentSphere from a hybrid architecture (Spring Boot microservices + Supabase frontend) to a **Supabase-only backend architecture**.

## Current State Analysis

### ✅ Already Completed
- Frontend services migrated to Supabase (`/apps/frontend/src/services/`)
- Supabase schema defined (`supabase-schema.sql` - 714 lines, 30+ tables)
- Supabase client configured (`/apps/frontend/src/lib/supabaseClient.ts`)
- Auth service using Supabase Auth

### ❌ Remaining Work
- 19 Spring Boot microservices still active with separate PostgreSQL databases
- Docker Compose configured for local PostgreSQL containers
- Backend services duplicate functionality already in Supabase

## Migration Strategy

### Phase 1: Audit & Decommission Backend Services
1. Document all endpoints from Spring Boot services
2. Verify equivalent Supabase operations exist in frontend services
3. Mark backend services as deprecated
4. Remove backend service dependencies from docker-compose.yml

### Phase 2: Supabase Schema Enhancement
1. Review existing `supabase-schema.sql` for completeness
2. Add any missing tables/constraints from backend services
3. Implement Row Level Security (RLS) policies
4. Create database functions and triggers

### Phase 3: Frontend Service Completion
1. Ensure all CRUD operations covered
2. Add real-time subscriptions where needed
3. Implement proper error handling
4. Add loading/success/error states

### Phase 4: Configuration & Environment
1. Create `.env.example` for Supabase credentials
2. Update documentation
3. Remove backend-specific environment variables

### Phase 5: Testing & Validation
1. End-to-end testing of all user flows
2. Verify data integrity
3. Performance testing
4. Security audit

## Service Mapping

| Spring Boot Service | Supabase Table(s) | Frontend Service | Status |
|---------------------|-------------------|------------------|--------|
| auth-service | auth.users, profiles | authService.ts | ✅ Migrated |
| user-service | profiles, user_profiles | profileService.ts | ✅ Migrated |
| profile-service | user_profiles, skills, experiences, educations | profileService.ts | ✅ Migrated |
| job-service | jobs, companies | jobService.ts | ✅ Migrated |
| company-service | companies | companyService.ts | ✅ Migrated |
| application-service | job_applications | applicationService.ts | ✅ Migrated |
| messaging-service | conversations, messages | messagingService.ts | ✅ Migrated |
| networking-service | connections, feed_posts | networkingService.ts | ✅ Migrated |
| notification-service | notifications | settingsService.ts | ✅ Migrated |
| lms-service | courses, lessons, enrollments | lmsService.ts | ✅ Migrated |
| challenge-service | challenges, challenge_submissions | challengeService.ts | ✅ Migrated |
| gamification-service | leaderboard, badges, xp_transactions | gamificationService.ts | ✅ Migrated |
| payment-service | payments, subscriptions | paymentService.ts | ✅ Migrated |
| video-service | (to be added) | - | ⏳ Pending |
| search-service | (Supabase full-text) | - | ⏳ Pending |
| file-service | Supabase Storage | - | ⏳ Pending |
| ai-service | (external API) | aiService.ts | ✅ Migrated |
| chat-service | conversations, messages | messagingService.ts | ✅ Merged |
| api-gateway | N/A | N/A | 🔄 Replace with Supabase Edge Functions |

## Implementation Checklist

### Infrastructure
- [ ] Remove PostgreSQL containers from docker-compose.yml
- [ ] Remove RabbitMQ, Redis, Elasticsearch dependencies
- [ ] Keep only frontend + Supabase configuration
- [ ] Update CI/CD pipelines

### Database
- [ ] Execute supabase-schema.sql in Supabase project
- [ ] Configure RLS policies for all tables
- [ ] Set up storage buckets (avatars, resumes, logos)
- [ ] Create database indexes for performance
- [ ] Implement soft delete patterns where needed

### Security
- [ ] Enable Supabase Auth providers (Email, Google, GitHub)
- [ ] Configure email templates
- [ ] Set up password reset flows
- [ ] Implement role-based access control via RLS
- [ ] Enable rate limiting

### Frontend
- [ ] Create .env file with Supabase credentials
- [ ] Verify all service imports
- [ ] Add real-time subscriptions for messaging/notifications
- [ ] Implement optimistic updates
- [ ] Add offline support considerations

### Documentation
- [ ] Update SSOT.md with Supabase-only architecture
- [ ] Create Supabase setup guide
- [ ] Document RLS policies
- [ ] Update API documentation (now Supabase queries)
- [ ] Create migration runbook

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Audit | 1 day | None |
| Phase 2: Schema | 2 days | Phase 1 |
| Phase 3: Services | 2 days | Phase 2 |
| Phase 4: Config | 1 day | Phase 3 |
| Phase 5: Testing | 2 days | Phase 4 |
| **Total** | **8 days** | |

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Backup existing data, test in staging first |
| RLS policy gaps | High | Comprehensive security audit, penetration testing |
| Performance degradation | Medium | Add proper indexes, implement caching layer if needed |
| Missing functionality | Medium | Feature parity checklist, user acceptance testing |

## Success Criteria

- ✅ Zero Spring Boot services running
- ✅ All data operations through Supabase
- ✅ All user flows functional (login, profile, jobs, messaging, etc.)
- ✅ RLS policies enforced for all tables
- ✅ No hardcoded credentials
- ✅ Documentation complete
- ✅ Tests passing

## Next Steps

1. Execute this migration plan
2. Test thoroughly in development
3. Deploy to staging environment
4. User acceptance testing
5. Production deployment
