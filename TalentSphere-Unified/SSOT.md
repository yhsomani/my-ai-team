# TalentSphere — Single Source of Truth (SSOT)

> **Status:** Current architectural baseline and Single Source of Truth for the product rebuild.
> **Version:** 7.0.0 (Architecture Baseline & Discovery Complete)
> **Last Updated:** Current

## 1. Product Overview
TalentSphere is a distributed, cloud-native career intelligence platform unifying professional networking, learning management, and skill assessment into a single ecosystem.
Target Users: Talent (Job Seekers/Learners), Recruiters (Employers), and Admins.

## 2. Current Architecture (Hybrid Microservices)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Redux Toolkit. Communicates directly with Supabase and backend APIs.
- **Backend:** 19 separate Spring Boot Java microservices (`services/*`) communicating via RabbitMQ.
- **Data Layer:** PostgreSQL (Supabase) + MongoDB legacy clusters.
- **Flaws:** High coupling via direct DB frontend access, inconsistent messaging (Outbox missing in places), duplicate boundaries (`chat-service` vs `messaging-service`).

## 3. Target Architecture (Modular Monolith)
As defined in `ADR-002`, the backend will be rebuilt as a Modular Monolith.
- Independent domain modules (`auth`, `profile`, `jobs`, `applications`, `learning`, `assessment`, `networking`, `messaging`, `billing`) communicating via application ports and an Outbox event mesh.
- Extractable service boundaries remain intact for future scaling.

## 4. Module Contracts & Data Ownership
- **Data Authority (ADR-003):** Supabase/PostgreSQL is the strict canonical schema driven by backend migrations. Direct frontend Supabase access is marked as migration debt.
- **Messaging Boundary (ADR-004):** `messaging-service` owns all conversation and realtime delivery. `chat-service` is orphaned.
- **Authentication (ADR-001):** Supabase Auth validates JWTs at the gateway, passing roles to downstream resources.

## 5. Implementation Roadmap
1. Complete architecture baseline (Done).
2. Identity and API Contracts migration.
3. Data Ownership and schema extraction.
4. Core Marketplace Workflow (Jobs & Applications).
5. Secondary Domains (Learning, Messaging).
6. Operational Hardening (Billing, Observability).

*(See FEATURES.md for feature catalog, ARCHITECTURE.md for topology details, and DECISIONS.md for the decision log.)*
