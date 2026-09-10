# TalentSphere System Architecture

> Documentation status: Historical/stale generated reference. Use `../../../PLAN.md` and `../ARCHITECTURE_STATUS_INDEX.md` for current architecture status.

## Overview

This documents the complete TalentSphere microservices architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL CLIENTS                        │
│  (Web/Mobile/3rd Party)                                   │
└─────────────────────────┬───────────────────────────────┬─────┘
                      │                         │
              ┌───────▼────────┐         ┌──────▼──────┐
              │  Web Gateway  │         │  API Gateway│
              │  (Nginx)     │         │(Spring Cloud│
              │   Port 80   │         │  8080)     │
              └──────┬───────┘         └────┬──────┘
                   │                  │
     ┌──────────────┼──────────────────┼──────────────┐
     │             │        │         │             │
┌────▼────┐ ┌────▼──┐ ┌────▼──┐ ┌────▼───┐ ┌──▼────┐
│  Auth   │ │ User  │ │ Job   │ │  LMS  │ │ Chat  │
│ :8081   │ │:8082  │ │:8084 │ │:8092  │ │:8096 │
└────┬────┘ └──┬────┘ └──┬────┘ └───────┘ └───┬────┘
     │          │        │                  │
     │    ┌────┴────────┴────────┐  ┌────┴──────┐
     │    │    MongoDB          │  │  RabbitMQ │
     │    │    (27017)         │  │  (5672)  │
     └────┴───────────────────┘  └──────────┘
```

## Service Communication

### REST (Synchronous)
- API Gateway → All Services (via HTTP)
- Services → Services (via Feign Client)

### Events (Asynchronous)
- All Services → RabbitMQ
- Event Exchange: `talentsphere.events`

### Cache
- Redis (6379) - Session, API Cache

## Data Flow

### User Registration Flow
```
1. User → Frontend (3000)
2. Frontend → API Gateway (8080)
3. Gateway → Auth Service (8081)
4. Auth → MongoDB (auth_db)
5. Auth → RabbitMQ (user.registered)
6. RabbitMQ → User Service, Notification Service
```

### Job Application Flow
```
1. User → JobsPage
2. Application → API Gateway
3. Gateway → Job Service (cache check)
4. Job Service → Application Service
5. Application → MongoDB (application_db)
6. RabbitMQ → Notification Service (push WebSocket)
```

## Module Dependencies

### Frontend (React + Module Federation)
```
web_host (port 3000)
├── ./Layout → ResponsiveLayout
├── ./Dashboard → DashboardPage
├── ./Login → LoginPage
├── ./Register → RegisterPage
├── ./Jobs → JobsPage
├── ./LMS → LMSPage
├── ./Profile → ProfilePage
├── ./Challenges → ChallengesPage
├── ./Networking → NetworkingPage
├── ./Messaging → MessagingPage
├── ./Settings → SettingsPage
└── ./Billing → BillingPage
```

### Backend Services
```
services/
├── contracts/     → ApiResponse only
├── shared/      → Feature flags
├── bom/        → Version management
│
├── auth-service/      → 5 deps (ts-contracts, ts-shared, web, security, redis)
├── user-service/       → 5 deps
├── profile-service/   → 6 deps
├── job-service/       → 8 deps (redis, rabbitmq)
├── application-service/→ 7 deps
├── api-gateway/      → 9 deps (gateway, security)
├── lms-service/     → 8 deps
├── gamification/     → 6 deps
├── challenge/       → 7 deps
├── messaging/       → 5 deps
├── networking/     → 5 deps
└── notification/    → 6 deps
```

## Feature Flags

### Core Features (Enabled)
- enable_auth
- enable_user_management
- enable_profile_management
- enable_job_listings
- enable_courses

### Optional Features
- enable_job_recommendations (AI)
- enable_application_tracking
- enable_coding_challenges
- enable_leaderboards
- enable_achievements
- enable_xp_system
- enable_ai_resume_analysis
- enable_ai_job_matching

### Configuration
- Location: `services/shared/src/main/java/com/talentsphere/shared/config/Feature.java`
- Runtime overrides via `FeatureFlagConfig`

## Database Schema

### MongoDB
Each service has its own database:
- `talentsphere_auth` - Users, Sessions
- `talentsphere_user` - Profiles
- `talentsphere_profile` - Skills, Experience
- `talentsphere_job` - Job listings
- `talentsphere_application` - Applications
- `talentsphere_company` - Company profiles
- `talentsphere_notification` - Notifications
- `talentsphere_lms` - Courses, Enrollments
- `talentsphere_gamification` - XP, Badges
- `talentsphere_challenge` - Challenges, Submissions
- `talentsphere_messaging` - Messages
- `talentsphere_networking` - Connections, Posts

## Security

### JWT Flow
1. Login → Auth Service (/api/auth/login)
2. Auth → Return JWT (1 day expiry)
3. Client → Include in header: `Authorization: Bearer {token}`
4. Gateway → Validate JWT, inject headers
5. Services → Trust X-User-Id, X-User-Email, X-User-Role

### Service-to-Service
- Internal routes blocked by gateway
- Use header: `X-Service-Secret: {secret}`

## Infrastructure

| Service | Port | Technology |
|---------|------|----------|
| API Gateway | 8080 | Spring Cloud Gateway |
| MongoDB | 27017 | MongoDB 7.0 |
| Redis | 6379 | Redis 7 |
| RabbitMQ | 5672 | RabbitMQ 3.13 |
| Elasticsearch | 9200 | ES 8.15 |
| Frontend | 3000 | Vite + React |

## Documentation Tools

### Frontend
- **TypeDoc** - Generates HTML from TypeScript JSDoc
- Command: `npm run docs`

### Backend
- **SpringDoc OpenAPI** - Generates Swagger UI
- Access: `http://localhost:{port}/swagger-ui.html`

### System
- Architecture diagrams auto-generated
- Service dependency graph available
