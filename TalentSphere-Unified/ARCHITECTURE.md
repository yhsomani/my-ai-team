# TalentSphere Unified Architecture

## Overview

TalentSphere is a comprehensive talent management platform combining LinkedIn, Coursera, and HackerRank features into one unified system.

## Domain Structure

The platform is organized into **7 logical domains**, each containing related microservices:

### 1. Identity Domain (`identity/`)
**Purpose:** Authentication and User Management

| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 8081 | JWT authentication, MFA, brute-force protection |
| user-service | 8082 | User CRUD, profile synchronization |

### 2. Talent Domain (`talent/`)
**Purpose:** Job Board and Applications

| Service | Port | Purpose |
|---------|------|---------|
| job-service | 8084 | Job listings, search, filters |
| application-service | 8085 | Job applications, tracking |

### 3. Company Domain (`company/`)
**Purpose:** Company and Profile Management

| Service | Port | Purpose |
|---------|------|---------|
| company-service | 8086 | Company profiles, branding |
| profile-service | 8083 | User profiles, resume management |

### 4. Social Domain (`social/`)
**Purpose:** Communication and Networking

| Service | Port | Purpose |
|---------|------|---------|
| messaging-service | 8096 | Direct messages |
| chat-service | - | Real-time chat |
| networking-service | 8097 | Connection management |

### 5. Learn Domain (`learn/`)
**Purpose:** Learning Management

| Service | Port | Purpose |
|---------|------|---------|
| lms-service | 8092 | Courses, lessons |
| challenge-service | 8091 | Coding challenges |

### 6. Growth Domain (`growth/`)
**Purpose:** Gamification

| Service | Port | Purpose |
|---------|------|---------|
| gamification-service | 8090 | Achievements, points, leaderboards |

### 7. Operations Domain (`ops/`)
**Purpose:** Platform Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| api-gateway | 8080 | Single entry point |
| notification-service | 8087 | Email/push notifications |
| search-service | 8088 | Elasticsearch queries |
| file-service | 8094 | File storage |
| video-service | 8093 | Video processing |
| payment-service | 8098 | Payment processing |
| ai-service | - | AI features |

## Architecture Patterns

### Service Communication
- **REST APIs** via Spring MVC
- **Event-driven** via RabbitMQ (outbox pattern)
- **Internal calls** via service-to-service communication

### Security
- JWT tokens at API Gateway
- Role-based access control (RBAC)
- MFA support
- Brute-force protection

### Data
- PostgreSQL per service (isolated schemas)
- MongoDB for flexible documents
- Redis for caching
- Elasticsearch for search

### Resilience
- Circuit breakers (Resilience4j)
- Retries with backoff
- Health indicators for all services

## Build and Deployment

### Local Development
```bash
./mvnw package -DskipTests
docker-compose -f infra/docker/docker-compose.yml up
```

### Build Specific Service
```bash
./mvnw package -pl services/auth-service -am
```

## Service Dependencies

```
api-gateway
├── auth-service
├── user-service
├── profile-service
├── job-service
└── ...
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| JWT_SECRET | JWT signing key | Yes |
| DB_HOST | PostgreSQL host | Yes |
| REDIS_HOST | Redis host | Yes |
| RABBITMQ_HOST | RabbitMQ host | Yes |

## Ports

| Service | Port |
|---------|------|
| api-gateway | 8080 |
| auth-service | 8081 |
| user-service | 8082 |
| profile-service | 8083 |
| job-service | 8084 |
| application-service | 8085 |
| company-service | 8086 |
| notification-service | 8087 |
| search-service | 8088 |
| gamification-service | 8090 |
| challenge-service | 8091 |
| lms-service | 8092 |
| video-service | 8093 |
| file-service | 8094 |
| messaging-service | 8096 |
| networking-service | 8097 |
| payment-service | 8098 |

## Best Practices

1. **One service = one database** - Never share schemas
2. **All secrets via environment** - Never hardcode
3. **Use outbox pattern** - For event publishing
4. **Health endpoints** - All services implement `/actuator/health`
5. **Circuit breakers** - For external calls