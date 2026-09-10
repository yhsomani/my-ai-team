# TalentSphere — Gemini Assistant Context

> Documentation status: Historical/stale agent context. Use `../PLAN.md`, `README.md`, and `docs/ARCHITECTURE_STATUS_INDEX.md` for current repository instructions and architecture status.

> **Project Type**: Distributed Microservices Platform (Talent Intelligence)
> **Core Stack**: React 19 + Spring Boot 3.4 + PostgreSQL/MongoDB + RabbitMQ + Redis
> **Architecture**: Microservices + Transitioning to Micro-frontends (Vite Module Federation)

---

## 1. Project Overview

**TalentSphere** is a cloud-native career intelligence platform designed to unify professional networking (LinkedIn), gamified learning (Coursera), and technical assessment (HackerRank). It leverages a distributed architecture of ~19 Spring Boot microservices and a React-based frontend.

### Key Technologies
- **Frontend**: React 19, Vite 8, TypeScript 6, TailwindCSS, Redux Toolkit, Framer Motion, Lucide Icons.
- **Backend**: Spring Boot 3.4.4 (Java 21), Spring Cloud Gateway, Spring Data JPA/MongoDB, Hibernate.
- **Data & Middleware**: MongoDB 7, PostgreSQL 16, Redis 7, RabbitMQ 3.13, Elasticsearch 8.15.
- **Infrastructure**: Docker & Docker Compose, Nginx (API Gateway), Prometheus, Grafana.
- **AI/Specialized**: Piston API (Code Execution).

---

## 2. System Architecture & Standards

### 2.1 The "Strict Middle-Layer" Rule (Non-Negotiable)
To maintain architectural integrity, all data flow must follow this path:
1. **Frontend**: UI Component → Service Layer (`services/*.ts`) → Axios Interceptor → Nginx/Gateway → Spring Boot.
2. **Backend**: `@RestController` → `@Service` (Business Logic) → `@Repository` → Database.

*Note: No `supabase.from()` or direct `axios` calls inside React components (except `App.tsx`).*

### 2.2 Microservice Registry (Core Ports)
| Service | Port | Database Owner |
|---------|------|----------------|
| `api-gateway` | 8080 | N/A |
| `auth-service` | 8081 | `auth_db` |
| `user-service` | 8082 | `user_db` |
| `profile-service` | 8083 | `profile_db` |
| `job-service` | 8084 | `job_db` |
| `lms-service` | 8085 | `lms_db` |
| `application-service` | 8086 | `application_db` |
| `challenge-service` | 8087 | `challenge_db` |
| `company-service` | 8088 | `company_db` |
| `notification-service` | 8089 | `notification_db` |
| `search-service` | 8091 | N/A (Elasticsearch) |
| `gamification-service` | 8092 | `gamification_db` |
| `messaging-service` | 8094 | `messaging_db` |
| `networking-service` | 8095 | `networking_db` |
| `ai-service` | 8096 | `ai_db` |
| `chat-service` | 8097 | `chat_db` |
| `payment-service` | 8098 | `payment_db` |
| `mongo-express` | 8099 | N/A (Web UI) |

---

## 3. Building and Running

### 3.1 Prerequisites
- **Node.js**: 18+
- **JDK**: 21 (LTS)
- **Docker**: Desktop with Compose v2
- **Maven**: Use the provided wrapper `./mvnw`

### 3.2 Key Commands
| Action | Command |
|--------|---------|
| **Infrastructure** | `docker-compose up -d ts-postgres redis rabbitmq elasticsearch gateway` |
| **Shared Library** | `cd services/shared && ./mvnw clean install -DskipTests` |
| **Backend Build** | `./mvnw package -DskipTests` (Run from root for all, or service dir) |
| **Frontend Dev** | `cd frontend && npm install && npm run dev` |
| **Linting** | `npm run lint` (Frontend) |

---

## 4. Development Conventions

### 4.1 Backend Patterns
- **Standard Envelope**: All API responses must use `ApiResponse<T>` or `PagedResponse<T>`.
- **Entity Identity**: Always use UUID primary keys, `@CreationTimestamp`, and `@UpdateTimestamp`.
- **Async Events**: Use RabbitMQ with the topic exchange `talentsphere.events` and routing key `{domain}.{entity}.{verb}`.
- **Health Checks**: Implement `GET /actuator/health` in every service.

### 4.2 Frontend Patterns
- **Design System**: "Neural Nebula" (Glassmorphism, Indigo/Purple gradients).
- **State Management**: Use Redux Toolkit for global auth and session state.
- **Type Safety**: Maintain strict TypeScript interfaces in `src/types/`.
- **Service Layer**: Centralize all API logic in `src/services/` to keep components UI-focused.

### 4.3 Agent & Ownership Protocol
- **Mailbox**: Inter-agent communication is handled via `agent-mailbox/`.
- **Task Tracking**: Update `agent-tasks/TASK_STATUS.md` immediately upon status changes.
- **Ownership**: Respect the boundaries defined in `AGENT_OWNERSHIP.md`.

---

## 5. Current Architectural State & Roadmap
The project is currently a **Distributed Monolith** undergoing a **Brutal Architecture Audit**.
- **Critical Goal**: Transition to independent polyrepo-style deployment.
- **Frontend Goal**: Decouple the monolithic SPA into **Micro-frontends** using Vite Module Federation.
- **Resilience**: Implementing Resilience4j circuit breakers and RabbitMQ DLQs.

---

## 6. Key Documentation Files
- `TalentSphere_SSOT.md`: The authoritative platform reference.
- `CLAUDE.md`: Shared context and rules for all AI agents.
- `docs/ARCHITECTURE_AUDIT.md`: Detailed critique and target architecture plan.
