# TalentSphere Backend Architecture Specification

> Documentation status: Canonical backend architecture baseline. Reconciled with codebase on 2026-09-08.

## 1. Architecture Overview

TalentSphere backend operates as a **hybrid architecture** combining:
1. **Supabase Data Plane**: Direct PostgreSQL access via PostgREST for 46 application tables
2. **Spring Boot Microservices Layer**: 27 Maven reactor modules providing complex business logic, integrations, and background processing

---

## 2. Spring Boot Microservices Topology

### 2.1 Maven Reactor Modules (27 Total)

| Category | Count | Description |
|----------|-------|-------------|
| Parent POM | 1 | Root dependency management |
| Shared Libraries | 7 | Common utilities, models, security |
| Application Services | 19 | Domain-specific business services |

### 2.2 Service Registry (Eureka)

| Service | Port | Domain | Key Responsibilities |
|---------|------|--------|----------------------|
| `talentsphere-gateway` | 8080 | API Gateway | Routing, auth, rate limiting |
| `talentsphere-auth-service` | 8081 | Authentication | JWT validation, session management |
| `talentsphere-user-service` | 8082 | User Management | Profile CRUD, preferences |
| `talentsphere-job-service` | 8083 | Jobs | Job posting, applications |
| `talentsphere-recruiter-service` | 8084 | Recruiting | Candidate pipeline, scorecards |
| `talentsphere-lms-service` | 8085 | Learning | Courses, enrollments, progress |
| `talentsphere-challenge-service` | 8086 | Challenges | Coding challenges, evaluation |
| `talentsphere-messaging-service` | 8087 | Messaging | Conversations, notifications |
| `talentsphere-networking-service` | 8088 | Networking | Connections, suggestions |
| `talentsphere-gamification-service` | 8089 | Gamification | XP, badges, leaderboard |
| `talentsphere-analytics-service` | 8090 | Analytics | Product analytics, reports |
| `talentsphere-billing-service` | 8091 | Billing | Payments, subscriptions |
| `talentsphere-ai-service` | 8092 | AI | Career assistance, matching |
| `talentsphere-trust-service` | 8093 | Trust & Safety | Content moderation |
| `talentsphere-notification-service` | 8094 | Notifications | Push, email, in-app |
| `talentsphere-search-service` | 8095 | Search | Full-text search, indexing |
| `talentsphere-media-service` | 8096 | Media | File uploads, resume storage |
| `talentsphere-scheduler-service` | 8097 | Scheduling | Background jobs, digests |
| `talentsphere-config-service` | 8098 | Configuration | Dynamic config, feature flags |

### 2.3 Shared Libraries

| Library | Purpose |
|---------|---------|
| `talentsphere-common` | Shared DTOs, utilities, constants |
| `talentsphere-security` | JWT validation, RBAC helpers |
| `talentsphere-persistence` | JPA entities, repositories |
| `talentsphere-messaging` | RabbitMQ producers/consumers |
| `talentsphere-cache` | Redis caching abstractions |
| `talentsphere-client` | OpenFeign client interfaces |
| `talentsphere-contract` | API contracts, OpenAPI specs |

---

## 3. Spring Cloud Gateway

### 3.1 Gateway Configuration

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://talentsphere-user-service
          predicates:
            - Path=/api/v1/users/**
          filters:
            - StripPrefix=2
            
        - id: job-service
          uri: lb://talentsphere-job-service
          predicates:
            - Path=/api/v1/jobs/**
          filters:
            - StripPrefix=2
            
        - id: recruiter-service
          uri: lb://talentsphere-recruiter-service
          predicates:
            - Path=/api/v1/recruiter/**
          filters:
            - StripPrefix=2
```

### 3.2 Gateway Filter Chain

| Filter | Order | Purpose |
|--------|-------|---------|
| `CorsWebFilter` | 1 | CORS origin validation |
| `JwtAuthenticationFilter` | 2 | Supabase JWT verification |
| `RateLimiterFilter` | 3 | Redis token bucket rate limiting |
| `RequestLoggingFilter` | 4 | Access logging, metrics |
| `CircuitBreakerFilter` | 5 | Resilience4j circuit breaking |

### 3.3 Rate Limiting Configuration

```java
// Redis Rate Limiting Tiers
RateLimitTiers:
  - ANONYMOUS: 30 requests/minute
  - ROLE_USER: 60 requests/minute
  - ROLE_RECRUITER: 120 requests/minute
  - ROLE_ADMIN: 300 requests/minute
```

---

## 4. Service-to-Service Communication

### 4.1 Synchronous (OpenFeign)

```java
@FeignClient(name = "talentsphere-job-service")
public interface JobServiceClient {
    
    @GetMapping("/api/v1/jobs/{id}")
    JobDTO getJobById(@PathVariable("id") String id);
    
    @PostMapping("/api/v1/jobs")
    JobDTO createJob(@RequestBody CreateJobRequest request);
    
    @GetMapping("/api/v1/jobs/company/{companyId}")
    List<JobDTO> getJobsByCompany(@PathVariable("companyId") String companyId);
}
```

### 4.2 Asynchronous (RabbitMQ)

| Exchange | Queue | Event |
|----------|-------|-------|
| `talentsphere.events` | `job.created` | New job posted |
| `talentsphere.events` | `application.submitted` | Candidate applied |
| `talentsphere.events` | `challenge.submitted` | Challenge solution submitted |
| `talentsphere.events` | `xp.awarded` | XP transaction recorded |
| `talentsphere.events` | `content.reported` | Content reported for moderation |

---

## 5. Service Responsibilities Detail

### 5.1 Authentication Service (Port 8081)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/validate` | POST | Validate Supabase JWT |
| `/api/v1/auth/refresh` | POST | Refresh session token |
| `/api/v1/auth/logout` | POST | Invalidate session |

### 5.2 Challenge Service (Port 8086)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/challenges` | GET | List challenges |
| `/api/v1/challenges/{id}` | GET | Get challenge details |
| `/api/v1/challenges/{id}/submit` | POST | Submit solution |
| `/api/v1/challenges/{id}/evaluate` | POST | Evaluate submission |

**Sandbox Execution**:
- Docker containers with isolated CPU/memory limits
- Test case execution with timeout (30 seconds)
- Output comparison against expected results
- Resource cleanup after evaluation

### 5.3 Gamification Service (Port 8089)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/gamification/xp` | POST | Award XP |
| `/api/v1/gamification/leaderboard` | GET | Get leaderboard |
| `/api/v1/gamification/badges` | GET | Get user badges |
| `/api/v1/gamification/badges/{id}/award` | POST | Award badge |

### 5.4 Trust Service (Port 8093)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/moderation/reports` | GET | List pending reports |
| `/api/v1/moderation/reports/{id}` | PUT | Update report status |
| `/api/v1/moderation/reports/{id}/resolve` | POST | Resolve report |

---

## 6. Database Access Patterns

### 6.1 Supabase Direct Access (Primary)

```
Frontend → typedSupabase → PostgREST → PostgreSQL (RLS enforced)
```

- **46 tables** accessed directly via generated TypeScript client
- **119 RLS policies** enforce row-level security
- **Real-time subscriptions** for messages, notifications

### 6.2 Spring Boot JPA Access (Secondary)

```
Service → Spring Data JPA → JDBC → PostgreSQL
```

- **Complex queries** requiring joins across domains
- **Background jobs** for analytics aggregation
- **Batch operations** for bulk processing

### 6.3 Hybrid Access Pattern

| Operation | Access Method | Reason |
|-----------|---------------|--------|
| CRUD (simple) | Supabase PostgREST | Fast, RLS-enforced |
| Complex joins | Spring JPA | Multi-table aggregation |
| Real-time | Supabase Realtime | WebSocket streaming |
| Background jobs | Spring Scheduler | Batch processing |
| Search indexing | Spring Search Service | Full-text search |

---

## 7. Deployment Topology

### 7.1 Docker Compose (Development)

```yaml
services:
  gateway:
    image: talentsphere-gateway:latest
    ports:
      - "8080:8080"
    depends_on:
      - eureka
      - redis
      
  eureka:
    image: talentsphere-eureka:latest
    ports:
      - "8761:8761"
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"
```

### 7.2 Kubernetes Production

| Component | Replicas | Resources |
|-----------|----------|-----------|
| Gateway | 3 | 512Mi / 0.5 CPU |
| Eureka | 2 | 256Mi / 0.25 CPU |
| Domain Services | 2-5 each | 512Mi-1Gi / 0.5-1 CPU |
| Redis | 3 (Sentinel) | 1Gi / 1 CPU |
| RabbitMQ | 3 (Cluster) | 1Gi / 1 CPU |

---

## 8. Resilience Patterns

| Pattern | Implementation | Configuration |
|---------|----------------|---------------|
| Circuit Breaker | Resilience4j | 50% failure rate → open, 30s timeout |
| Retry | Spring Retry | 3 attempts, exponential backoff |
| Bulkhead | Resilience4j | Thread pool isolation per service |
| Rate Limiting | Redis Token Bucket | Per-user/IP tiered limits |
| Fallback | @CircuitBreaker | Return cached/default response |

---

## 9. Observability

### 9.1 Metrics (Prometheus)

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | method, path, status |
| `http_request_duration_seconds` | Histogram | method, path |
| `service_health_status` | Gauge | service, status |
| `circuit_breaker_state` | Gauge | service, state |

### 9.2 Logging (ELK Stack)

| Level | Usage |
|-------|-------|
| ERROR | Service failures, exceptions |
| WARN | Circuit breaker open, retry attempts |
| INFO | Request/response, business events |
| DEBUG | Detailed flow tracing (dev only) |

### 9.3 Distributed Tracing (Jaeger)

- Trace ID propagation across services
- Span creation for database queries
- External API call tracking
