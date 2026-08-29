# BRUTAL ARCHITECTURE AUDIT — TalentSphere

> Documentation status: Historical risk assessment. Use `../../PLAN.md` and `ARCHITECTURE_STATUS_INDEX.md` for current architecture status before using this audit for planning.

---

## 1. BRUTAL TRUTH (What's Broken)

### 1.1 Distributed Monolith (Not Microservices) ❌

**What's Wrong:**
- 20 Spring Boot services in SINGLE parent pom.xml
- Every service rebuilds when ANY changes
- `./mvnw package` = all modules compile
- No team autonomy

**Why It Fails:**
- Coordinated deployments impossible at scale
- Build times explode
- One bad commit locks pipeline

### 1.2 Frontend: Monolithic React App ❌

- 770KB single bundle
- Zero Module Federation
- No remote exposures
- All pages compile together

### 1.3 Shared Library Coupling ❌

- `ts-shared` library across ALL services
- `ApiResponse<T>` class forces rebuild
- Database changes cascade everywhere

### 1.4 Data Ownership Issues ✅ (Partial Fix)

- MongoDB per-service setup DONE
- Still depends on shared `ts-shared`

---

## 2. WHY IT FAILS AT SCALE

| Issue | Impact | Scale Threshold |
|-------|-------|---------------|
| Monorepo builds | 20+ min builds | 5 teams |
| Shared library | Cascade deploys | 2 services |
| Monolithic frontend | Full redeploy | Any page change |
| No circuit breakers | Cascading failures | 10x traffic |
| Synchronous REST | Chatty APIs | 100 RPS |
| No event-driven | Coupling | 3+ services |

---

## 3. TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL CLIENTS                        │
│  (Web/Mobile/3rd Party)                                   │
└─────────────────────────┬───────────────────────────────┬─────┘
                      │                         │
              ┌───────▼────────┐         ┌──────▼──────┐
              │  Web Gateway │         │  API Gateway│
              │  (Nginx)   │         │(Spring Cloud│
              │   Port 80  │         │  8080)    │
              └──────┬───────┘         └─────┬──────┘
                   │                  │
    ┌───────────────┬────────┬────────┼────────┬───┴──────────┐
    │             │        │        │        │              │
┌───▼────┐ ┌───▼──┐ ┌───▼──┐ ┌─▼───┐ ┌───▼───┐ ┌─▼────┐
│ Auth   │ │ User │ │ Job  │ │ LMS  │ │Chat  │ │  AI  │
│:8081  │ │:8082 │ │:8084│ │:8085│ │:8094│ │:8096 │
└───┬───┘ └───┬───┘ └───┬───┘ └──────┘ └───┬───┘ └───┬───┘
    │        │        │                  │        │
┌───▼────────▼────────▼──────┐  ┌────▼─────────────┐
│    Async Event Bus         │  │  Python ML     │
│    (RabbitMQ)           │  │  Workers     │
└────────────────────────┘  └───────────────┘

┌────────────────────────────────────────────────────────┐
│                   FRONTEND TIER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Auth MFE │  │Jobs MFE │  │LMS MFE  │  ...     │
│  │ :3001   │  │ :3002   │  │ :3003   │          │
│  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │                     │
│       └────────────┴────────────┘                 │
│                    │                           │
│              ┌─────▼──────┐                 │
│              │ Host App   │ (Shell)            │
│              │ :3000    │                  │
│              └──────────┘                  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    DATA TIER                       │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │MongoDB  │ │MongoDB │ │MongoDB │ │MongoDB │ │
│  │Auth DB  │ │User DB │ │Job DB  │ │LMS DB  │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 4. CORRECTED PROJECT STRUCTURE

```
talentsphere/
├── apps/
│   ├── web-host/              # Shell app (port 3000)
│   │   ├── src/
│   │   ├── vite.config.ts    # Module Federation
│   │   └── package.json
│   ├── remote-auth/        # Auth micro-frontend
│   ├── remote-jobs/      # Jobs micro-frontend
│   ├── remote-lms/      # LMS micro-frontend
│   ├── remote-chat/      # Chat micro-frontend
│   └── remote-ai/       # AI micro-frontend
│
├── services/                  # Polyrepo (Kubernetes)
│   ├── auth-service/      # Auth domain (8081)
│   │   ├── src/
│   │   └── pom.xml    # INDEPENDENT
│   ├── user-service/    # User domain (8082)
│   ├── job-service/    # Jobs domain (8084)
│   ├── lms-service/    # LMS domain (8085)
│   ├── chat-service/   # Chat domain (8094)
│   ├── ai-service/    # AI domain (8096)
│   ├── notification/
│   ├── search/
│   └── gateway/       # API Gateway
│
├── contracts/               # Minimal shared (versioned)
│   ├── api-common/       # ApiResponse<T> interface
│   └── events/        # Event schemas only
│
├── infra/                 # Terraform/K8s
│   ├── k8s/
│   ├── terraform/
│   └── docker/
│
└── scripts/               # CI/CD
```

---

## 5. SERVICE BOUNDARY REDESIGN (DDD)

| Service | Domain | Responsibility | Data Owner |
|---------|--------|-------------|----------|
| auth-service | Identity | Auth, JWT, tokens | Auth DB |
| user-service | User Profile | Profiles, settings | User DB |
| profile-service | Career | Skills, experience | Profile DB |
| job-service | Jobs | Listings, search | Job DB |
| application-service | Applications | Applications | App DB |
| company-service | Companies | Companies | Company DB |
| lms-service | Learning | Courses, progress | LMS DB |
| challenge-service | Challenges | Code challenges | Challenge DB |
| gamification-service | Game | XP, badges | Game DB |
| messaging-service | Messaging | Direct messages | Msg DB |
| chat-service | Chat | Real-time chat | Chat DB |
| networking-service | Network | Connections | Net DB |
| ai-service | AI | Analysis | AI DB |
| notification-service | Notifications | Events | Notif DB |
| search-service | Search | Elasticsearch | ES |
| payment-service | Payments | Stripe | Pay DB |

---

## 6. BACKEND SEPARATION

### Current (Broken):
```
Parent POM → All 20 services
```

### Target (Fixed):
```
auth-service/        →Independently deployable
├── pom.xml         → NO parent reference
├── src/
│   └── main/java/
└── Dockerfile

user-service/       →Independently deployable  
├── pom.xml
├── src/
└── Dockerfile
```

**Each service pom.xml:**
```xml
<parent>
  <groupId>com.talentsphere</groupId>
  <artifactId>talentsphere-bom</artifactId>
  <!-- Bill of Materials only -->
</parent>
```

---

## 7. MICRO-FRONTEND ARCHITECTURE

### Host App (Shell) - port 3000
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import mf from 'vite-plugin-webpack';

export default defineConfig({
  plugins: [
    mf({
      filename: 'remoteEntry.js',
      remotes: {
        auth: 'http://localhost:3001/remoteEntry.js',
        jobs: 'http://localhost:3002/remoteEntry.js',
        lms: 'http://localhost:3003/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
});
```

### Remote - Auth (port 3001)
```typescript
// expose LoginPage
<Link to="/login" target="auth/LoginPage">
```

### Remote - Jobs (port 3002)
```typescript
// expose JobsPage
<Link to="/jobs" target="jobs/JobsPage">
```

---

## 8. COMMUNICATION MODEL

| Scenario | Protocol | Why |
|----------|----------|-----|
| Client → API | REST/gRPC | Sync request/response |
| Service → Service | gRPC | Low latency |
| Async events | RabbitMQ | Decoupling |
| ML workloads | Python/async | CPU-bound |
| Search | Elasticsearch | Full-text |

### Event Types:
- `user.registered` → Notify notification-service
- `job.applied` → Update gamification-service
- `challenge.completed` → Award XP

---

## 9. MIGRATION PLAN (Step-by-Step)

### Phase 1: Fix Shared Library (Week 1)
1. Extract `ApiResponse` to separate `contracts/api-common` module
2. Version it semantically (1.0.0, 1.1.0)
3. Publish to Maven registry
4. Update each service to depend on specific version

### Phase 2: Frontend MF (Week 2-3)
1. Add Module Federation to build
2. Extract Auth pages → remote-auth
3. Extract Jobs pages → remote-jobs
4. Test integration
5. Extract LMS, Chat, AI remotes

### Phase 3: Service Independence (Week 4-6)
1. Remove parent POM references from each service
2. Create `talentsphere-bom` (Bill of Materials)
3. Each service has own Dockerfile
4. Independent CI/CD pipelines
5. Test isolated deployments

### Phase 4: Event-Driven (Week 7-8)
1. Add RabbitMQ event publishing
2. Decouple notifications
3. Add Circuit Breakers (Resilience4j)
4. Add Retry Logic

### Phase 5: Kubernetes (Week 9+)
1. Write K8s manifests per service
2. Horizontal Pod Autoscaling
3. Service mesh (Istio)
4. Distributed tracing

---

## 10. SUMMARY

| Issue | Current | Target |
|------|--------|--------|
| Build | Monorepo | Polyrepo |
| Deploy | Coordinated | Independent |
| Frontend | Monolith | MF (5+ remotes) |
| Communication | REST only | Events + gRPC |
| Data | Shared DB | Per-service DB |
| Shared code | ts-shared | contracts only |
| Failure | Cascading | Circuit breakers |

**End State:** Truly loose-coupled microservices with independently deployable micro-frontends.
