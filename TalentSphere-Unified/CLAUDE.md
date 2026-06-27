# TalentSphere — Shared Agent Context (CLAUDE.md)

> Documentation status: Historical/stale agent context. Environment and Maven-wrapper assumptions are not current; use `../PLAN.md` and `docs/ARCHITECTURE_STATUS_INDEX.md`.

# This file is automatically loaded by EVERY agent in the team.
# Do NOT modify it during a work session unless the Architect agent explicitly instructs it.

---

## PROJECT IDENTITY

- **Name:** TalentSphere
- **Vision:** LinkedIn + Coursera + HackerRank combined in one platform
- **Owner:** Yash
- **Repo root:** `./` (the directory where you were spawned)
- **Platform:** Windows 10, Docker Desktop available
- **Build tool:** Maven wrapper (`./mvnw`) — NEVER use system Maven

---

## ABSOLUTE RULES (Every Agent Must Follow)

1. **Never break another agent's work.** Before editing any file, check `AGENT_OWNERSHIP.md` to see which agent owns it.
2. **Write to the mailbox first.** Before starting any task that touches shared infrastructure (docker-compose.yml, pom.xml, shared schemas), post to `agent-mailbox/` that you are about to edit it.
3. **Mark tasks done.** When you complete a task, update `agent-tasks/TASK_STATUS.md` immediately.
4. **No TODOs, no stubs.** Every file you produce must be complete and runnable. A file with `// TODO` is a failing file.
5. **Follow the stack exactly.** Do not introduce libraries not in the approved stack below.
6. **One service = one database.** Never let two services share a PostgreSQL database or schema.
7. **All secrets via environment variables.** Never hardcode passwords, keys, or tokens.
8. **Use `./mvnw` not `mvn`.** Always use the Maven wrapper.

---

## APPROVED TECH STACK

| Layer | Technology | Version |
|---|---|---|
| Backend language | Java | 21 (LTS) |
| Backend framework | Spring Boot | 3.2.5 |
| API Gateway | Spring Cloud Gateway | 2023.0.1 |
| ORM | Spring Data JPA + Hibernate | (managed by Spring Boot) |
| DB migrations | Flyway | (managed by Spring Boot) |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Message broker | RabbitMQ | 3.13 |
| Search | Elasticsearch | 8 |
| Code execution | Judge0 CE | 1.13 |
| Frontend framework | React | 19 |
| Frontend language | TypeScript | 6 |
| Frontend build | Vite | 8 |
| State management | Redux Toolkit | 2 |
| HTTP client | Axios | 1.15 |
| Code editor (in-app) | Monaco Editor | 0.50 |
| Container | Docker + Docker Compose | v2 |
| Orchestration | Kubernetes (k8s) | EKS-compatible |
| CI/CD | GitHub Actions | — |
| Metrics | Micrometer + Prometheus | — |
| Dashboards | Grafana | 11 |

**DO NOT** add any technology not in this list without posting a proposal to `agent-mailbox/` and getting acknowledgment from the Architect agent.

---

## SERVICE REGISTRY (Ports are fixed — no changes allowed)

| Service | Port | Owner Agent | Database |
|---|---|---|---|
| `api-gateway` | 8080 | Backend-Infra | none |
| `auth-service` | 8081 | Backend-Auth | `auth_db` |
| `user-service` | 8082 | Backend-Auth | `user_db` |
| `profile-service` | 8083 | Backend-Profile | `profile_db` |
| `job-service` | 8084 | Backend-Jobs | `job_db` |
| `application-service` | 8085 | Backend-Jobs | `application_db` |
| `company-service` | 8086 | Backend-Jobs | `company_db` |
| `notification-service` | 8087 | Backend-Infra | `notification_db` |
| `search-service` | 8088 | Backend-Infra | Elasticsearch |
| `analytics-service` | 8089 | Backend-Infra | `analytics_db` |
| `gamification-service` | 8090 | Backend-Platform | `gamification_db` |
| `challenge-service` | 8091 | Backend-Platform | `challenge_db` |
| `lms-service` | 8092 | Backend-Platform | `lms_db` |
| `video-service` | 8093 | Backend-Platform | `video_db` |
| `file-service` | 8094 | Backend-Infra | `file_db` |
| `email-service` | 8095 | Backend-Infra | `email_db` |
| `messaging-service` | 8096 | Backend-Platform | `messaging_db` |
| `networking-service` | 8097 | Backend-Platform | `networking_db` |
| `payment-service` | 8098 | Backend-Infra | `payment_db` |
| `frontend` | 3000 | Frontend | none |

---

## DIRECTORY OWNERSHIP

Each agent ONLY writes to its owned directories. To write outside your zone, you must get acknowledgment from the owning agent via mailbox.

| Agent | Owns |
|---|---|
| Architect | `pom.xml` (root), `CLAUDE.md`, `AGENT_OWNERSHIP.md`, `agent-tasks/` |
| Backend-Auth | `services/auth-service/`, `services/user-service/` |
| Backend-Profile | `services/profile-service/` |
| Backend-Jobs | `services/job-service/`, `services/application-service/`, `services/company-service/` |
| Backend-Platform | `services/gamification-service/`, `services/challenge-service/`, `services/lms-service/`, `services/video-service/`, `services/messaging-service/`, `services/networking-service/` |
| Backend-Infra | `services/api-gateway/`, `services/notification-service/`, `services/search-service/`, `services/analytics-service/`, `services/file-service/`, `services/email-service/`, `services/payment-service/` |
| Frontend | `frontend/` |
| DevOps | `infra/`, `infra/k8s/`, `.github/`, `scripts/`, `infra/docker/docker-compose.yml` |
| Security | `infra/security/`, security annotations in ALL services (coordinate with Backend agents) |

---

## INTER-AGENT COMMUNICATION PROTOCOL

### Mailbox
All inter-agent messages go in files under `agent-mailbox/`:
- Format: `agent-mailbox/FROM_agent__TO_agent__TIMESTAMP.md`
- Example: `agent-mailbox/backend-auth__devops__20250101-1030.md`
- The receiving agent **checks its mailbox** before starting each new task.

### Task Status
All task status is in `agent-tasks/TASK_STATUS.md`.
- Format: `[STATUS] TASK_ID: description (Owner: AgentName)`
- Statuses: `PENDING`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `FAILED`

### Blocking Rule
If your task depends on another task that is not `DONE`, set your task to `BLOCKED` in `TASK_STATUS.md` and message the owning agent via mailbox. Do not attempt to invent a workaround.

---

## STANDARD PATTERNS (Every Backend Agent Must Use)

### Response Envelope
```java
// ALL endpoints return this — no exceptions
ApiResponse<T> { data: T, message: String, success: boolean, timestamp: LocalDateTime }
PagedResponse<T> { content: List<T>, page: int, size: int, totalElements: long, totalPages: int }
```

### Entity Pattern
```java
@Entity @Data @Builder @NoArgsConstructor @AllArgsConstructor
// Always: UUID primary key, @CreationTimestamp createdAt, @UpdateTimestamp updatedAt
```

### Security Pattern
- API Gateway validates JWT, injects `X-User-Id`, `X-User-Email`, `X-User-Role` headers
- Downstream services trust these headers — they never re-parse the JWT
- Internal service calls use `X-Service-Secret: ${INTERNAL_SERVICE_SECRET}` header
- Internal routes (`/internal/**`) are blocked by gateway from reaching the public internet

### RabbitMQ Exchange
- Exchange name: `talentsphere.events` (type: topic, durable: true)
- Routing key pattern: `{domain}.{entity}.{verb}` e.g. `auth.user.registered`

### Health Endpoint
Every service must implement `GET /actuator/health` that returns HTTP 200 when healthy.

---

## PROJECT FILE STRUCTURE OVERVIEW

```
talentsphere/
├── CLAUDE.md                    ← THIS FILE (read by all agents)
├── AGENT_OWNERSHIP.md           ← Created by Architect
├── agent-mailbox/               ← Inter-agent messages
├── agent-tasks/
│   └── TASK_STATUS.md           ← Live task tracking
├── pom.xml                      ← Parent POM (managed by Architect)
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   └── ... (all 19 services)
├── frontend/
├── infra/
│   ├── docker/
│   │   └── docker-compose.yml
│   ├── k8s/
│   └── terraform/
├── docs/
└── scripts/
```

---

## DEFINITION OF DONE (A task is DONE only when ALL apply)

- [ ] Code compiles without errors (`./mvnw package -DskipTests` passes for backend)
- [ ] No hardcoded secrets or passwords
- [ ] All API endpoints return the standard `ApiResponse<T>` envelope
- [ ] Flyway migration files created for any new database tables
- [ ] `GET /actuator/health` returns 200 for backend services
- [ ] Unit tests written for all Service-layer methods
- [ ] `TASK_STATUS.md` updated to `DONE`
- [ ] Any output files needed by another agent posted to mailbox
