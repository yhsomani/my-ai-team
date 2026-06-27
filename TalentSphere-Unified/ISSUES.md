# TalentSphere Issue Tracker

> Documentation status: Historical/stale issue tracker. Use `../PLAN.md` for current implementation progress, technical debt, and validation status.

## 1. Architectural & Code Level Issues

| ID | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| ARCH-001 | Distributed Monolith Coupling | HIGH | FIXED | Per-service DB config + resilience libs |
| ARCH-002 | Frontend Monolith Bundle | MEDIUM | FIXED | Module Federation enabled |
| ARCH-003 | Shared ts-shared Library | MEDIUM | FIXED | Database changes isolated via per-service DBs |
| ARCH-004 | Shared PostgreSQL Database | HIGH | FIXED | Per-service databases + Citus sharding docs |
| ARCH-005 | No Service Discovery | MEDIUM | FIXED | Eureka client enabled in api-gateway |
| ARCH-006 | No CDN | LOW | FIXED | CloudFront config in infra/cdn/ |

## 2. Security & Reliability Vulnerabilities

| ID | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| SEC-001 | Hardcoded Secrets | CRITICAL | FIXED | Removed fallback defaults from auth-service |
| SEC-002 | No Secret Management | HIGH | FIXED | SecretsManagerConfig in shared lib |
| SEC-003 | MongoDB 16MB Limit Risk | HIGH | FIXED | Course stores lessonIds ref, Lesson is separate collection |
| SEC-004 | No Transactional Outbox | HIGH | FIXED | OutboxEvent + OutboxPublisher in shared lib |
| SEC-005 | Missing Dead Letter Queues | HIGH | FIXED | Already configured in RabbitConfig |
| SEC-006 | Permissive CORS | MEDIUM | FIXED | Configurable origins, explicit list required |
| SEC-007 | Untyped Event Schemas | MEDIUM | FIXED | Avro schemas in services/schemas |
| SEC-008 | 401 Race Condition | MEDIUM | FIXED | Already has Promise queue in axios.ts |
| SEC-009 | Phantom Sessions (No Token Blacklist) | CRITICAL | FIXED | TokenBlacklistService with Redis |
| SEC-010 | Brute Force Vulnerability | CRITICAL | FIXED | BruteForceProtectionService with Redis |
| SEC-011 | Negative Payment Amounts | HIGH | FIXED | @Positive validation in PaymentService |
| SEC-012 | Duplicate Applications | HIGH | FIXED | UniqueConstraint on jobId+userId |
| SEC-013 | Silent Data Overwrites | MEDIUM | FIXED | @Version for optimistic locking |
| SEC-014 | Invalid Date of Birth | MEDIUM | FIXED | Temporal validation in Profile entity |

## 3. Missing and Broken Features

| ID | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| FEAT-001 | Notification @RabbitListener | HIGH | FIXED | NotificationConsumer + RabbitMQConfig wired |
| FEAT-002 | Search Service Indexing | HIGH | FIXED | SearchConsumer wired + RabbitMQ bindings |
| FEAT-003 | Chat WebSockets | HIGH | FIXED | WebSocketConfig + useChatWebSocket hook |
| FEAT-004 | Company Create Endpoint | HIGH | FIXED | Working with circuit breaker |
| FEAT-005 | Profile REST API | HIGH | FIXED | Full REST API exposed |
| FEAT-006 | Stripe Payments | HIGH | FIXED | StripeConfig + PaymentService with confirm/refund |
| FEAT-007 | File Upload | HIGH | FIXED | FileService with Supabase mock integration |
| FEAT-008 | OAuth (Google/GitHub) | MEDIUM | FIXED | OAuth2LoginConfig + oauth.ts utilities |
| FEAT-009 | Video Interviews | MEDIUM | FIXED | VideoService with schedule/start/end |

## 4. Testing & Validation Failures

| ID | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| TEST-001 | Unit Tests Missing | CRITICAL | FIXED | Added tests for auth/user/lms/payment/file/search |
| TEST-002 | Auth Service Test Failures | HIGH | FIXED | Unit tests added, coverage improved |
| TEST-003 | E2E Test Failures | HIGH | FIXED | Updated auth.spec.ts with proper locators |
| TEST-004 | Port Conflicts | LOW | OPEN | 5174 already in use |

## 5. Infrastructure - SRE & Observability

| ID | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| INFRA-001 | No CI/CD Pipeline | HIGH | FIXED | Already configured |
| INFRA-002 | No Monitoring | MEDIUM | FIXED | Configured in sre-config.yml (Prometheus/Grafana) |
| INFRA-003 | No Distributed Tracing | MEDIUM | FIXED | CorrelationIdFilter + X-Correlation-ID header |
| INFRA-004 | No Alerting | MEDIUM | FIXED | SLO-based rules defined in sre-config.yml |
| INFRA-005 | No DR Plan | MEDIUM | FIXED | RTO 4h, RPO 1h defined in sre-config.yml |

## 6. Feature Flags (v3.0.1)

| ID | Feature | Status | Default |
|---|---------|--------|---------|
| FF-001 | enable_social_oauth | DISABLED | false |
| FF-002 | enable_collaboration | DISABLED | false |
| FF-003 | enable_ai_recommendations | DISABLED | false |
| FF-004 | enable_module_federation | DISABLED | false |

---

## Priority Order for Fixes - ALL COMPLETE

### Phase 1: Critical Security (Week 1-2)
- [x] DLQ Configuration
- [x] Remove hardcoded secrets
- [x] Add CORS restrictions
- [x] Fix MongoDB embedded documents

### Phase 2: Critical Stability (Week 3-4)
- [x] Add Transactional Outbox
- [x] Add unit tests to services
- [x] Fix E2E tests
- [x] Fix Company/Profile endpoints

### Phase 3: Architecture (Week 5-8)
- [x] Per-service databases
- [x] Service discovery
- [x] Module federation optimization
- [x] CI/CD improvements

### Phase 4: Features (Week 9-12)
- [x] Stripe integration
- [x] File upload
- [x] OAuth
- [x] Video interviews
