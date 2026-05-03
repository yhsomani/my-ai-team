# TalentSphere â€” Single Source of Truth (SSOT)

> **Version**: 4.2.0 | **Last Updated**: April 13, 2026 (Full Architectural Synchronization)
> This document is the **authoritative production-grade reference** for the entire TalentSphere platform.

---

## 1. Platform Overview

**TalentSphere** is a distributed, cloud-native career intelligence platform.

| Property | Value |
|---|---|
| **Frontend** | React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 |
| **Backend** | 19Ã— Spring Boot 3.4 microservices (Java 21) |
| **Architecture** | Hexagonal Layering + Distributed Event Mesh |
| **Database** | PostgreSQL 16 (Relational) + MongoDB 7 (Document) |
| **Message Broker** | RabbitMQ 3.13 (Global Event Bus) |
| **Cache** | Redis 7 (Distributed Cache) |
| **Security** | Centralized OAuth2 Resource Server + JWT |

---

## 4. Microservice Registry (Final Port Map)

| Service | Port | Persistence | Status | Key Responsibility |
|---------|------|-------------|--------|--------------------|
| `api-gateway` | 8080 | N/A | âœ… | High-performance Nginx reverse proxy |
| `auth-service` | 8081 | PostgreSQL | âœ… | Identity synthesis, JWT orchestration |
| `user-service` | 8082 | MongoDB | âœ… | Core talent metadata management |
| `profile-service` | 8083 | PostgreSQL | âœ… | Extended portfolio & skill indexing |
| `job-service` | 8084 | MongoDB | âœ… | Opportunity node lifecycle |
| `lms-service` | 8085 | MongoDB | âœ… | Neural curriculum sync (Academy) |
| `application-service` | 8086 | PostgreSQL | âœ… | Connectivity protocol (Hiring) |
| `challenge-service` | 8087 | MongoDB | âœ… | Architectural trials (Arena) |
| `company-service` | 8088 | MongoDB | âœ… | Employer entity orchestration |
| `notification-service`| 8089 | MongoDB | âœ… | Real-time signal transmission |
| `search-service` | 8091 | Elasticsearch| âœ… | Asynchronous node discovery |
| `gamification-service`| 8092 | PostgreSQL | âœ… | Resonance tracking (XP/Badges) |
| `messaging-service` | 8094 | PostgreSQL | âœ… | Encrypted P2P transmission |
| `networking-service` | 8095 | PostgreSQL | âœ… | Social mesh & connection graph |
| `ai-service` | 8096 | PostgreSQL | âœ… | Cortex Engine (LLM orchestration) |
| `chat-service` | 8097 | PostgreSQL | âœ… | Signal Matrix (WebSocket/STOMP) |
| `payment-service` | 8098 | PostgreSQL | âœ… | Transactional buffer (Stripe-ready) |
| `file-service` | 8100 | S3/Local | âœ… | Permanent asset distribution |
| `mongo-express` | 8099 | N/A | âœ… | MongoDB administration UI |

---

## 18. Resolved Issues & Technical Debt

| Issue ID | Description | Resolution | Status |
|----------|-------------|------------|--------|
| TS-001 | Missing unit tests | Bootstrapped JUnit5/Mockito across core services | âœ… FIXED |
| TS-003 | No circuit breakers | Implemented Resilience4j fallbacks in AI/LMS/Job nodes | âœ… FIXED |
| TS-004 | Security inconsistency | Centralized via `SharedSecurityConfig` in `ts-shared` | âœ… FIXED |
| TS-008 | Port collisions | Relocated `mongo-express` to 8099; unified registry | âœ… FIXED |
| TS-011 | Notification wiring | RabbitListeners active for application/challenge events | âœ… FIXED |
| TS-012 | Search indexing | Async indexing wired for jobs/profiles via Event Mesh | âœ… FIXED |
| TS-014 | File Service isolation| Fully integrated into Gateway and Docker Compose | âœ… FIXED |

| TS-015 | WebSocket failure | Nginx proxy headers aligned for STOMP/SockJS | ✅ FIXED |
| TS-016 | Dashboard Fan-out | Potential latency from multi-service aggregation | ⚠️ OPEN |
| TS-017 | Resume Persistence| Edits in Resume Builder are session-only (no DB sync) | ⚠️ OPEN |
| TS-018 | LMS Media Gap | Video streaming player integration missing | ⚠️ OPEN |

| TS-019 | Admin Write-Support| Console lacks action triggers (Service Restart/User Ban)| ⚠️ OPEN |
| TS-020 | Challenge Sandbox | Missing code execution environment for Arena trials | ⚠️ OPEN |
| TS-021 | Social Graph UI | Lack of connection mesh visualization for Networking | ⚠️ OPEN |

---

**Document Version**: 4.2.0  
**Last Updated**: April 13, 2026

