# SSOT Candidate

> Reconciled and generated on: 2026-08-13T20:28:28.993689

## 1. Platform Overview
TalentSphere is a distributed cloud-native career intelligence platform. The architecture follows a Modular Monolith target (ADR-002) backed by a unified Supabase Postgres schema.

## 2. Microservices Architecture
The system currently consists of 27 active Spring Boot application modules. The `chat-service` is explicitly quarantined per ADR-004.

| Service Name | Path |
| --- | --- |
| ai-service | `./services/ai-service` |
| api-gateway | `./services/api-gateway` |
| application-service | `./services/application-service` |
| auth-service | `./services/auth-service` |
| bom | `./services/bom` |
| challenge-service | `./services/challenge-service` |
| chat-service | `./services/chat-service` |
| company-service | `./services/company-service` |
| contracts | `./services/contracts` |
| file-service | `./services/file-service` |
| gamification-service | `./services/gamification-service` |
| job-service | `./services/job-service` |
| lms-service | `./services/lms-service` |
| messaging-service | `./services/messaging-service` |
| networking-service | `./services/networking-service` |
| notification-service | `./services/notification-service` |
| payment-service | `./services/payment-service` |
| profile-service | `./services/profile-service` |
| schemas | `./services/schemas` |
| search-service | `./services/search-service` |
| service-parent | `./services/service-parent` |
| shared | `./services/shared` |
| shared-messaging | `./services/shared-messaging` |
| shared-resilience | `./services/shared-resilience` |
| shared-security | `./services/shared-security` |
| user-service | `./services/user-service` |
| video-service | `./services/video-service` |

## 3. Extracted Features
Total structured features found: 21
