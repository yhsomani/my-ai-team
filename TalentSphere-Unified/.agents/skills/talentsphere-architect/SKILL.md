---
description: Custom skill for managing the 22+ TalentSphere microservices (building, running, and logs).
---
# TalentSphere Architect
A comprehensive management skill for the **TalentSphere** microservices infrastructure.

## Goals
- Simplify the coordination between the `ts-shared` library, the `gateway`, and individual services.
- Provide a unified command surface for building, running, and debugging service groups.

## Components
- **Backends**: Spring Boot services in `services/`.
- **Frontend**: React/TypeScript in `frontend/`.
- **Infrastructure**: Docker Compose in `docker/`.

## Steps
1. Before performing service-level operations (e.g., `mvn clean install` or `docker-compose up`), I will assess the dependency impact.
2. I will automatically use `start-backend.ps1` for PowerShell environments to spin up services in the correct sequence.
3. I will monitor specific logs (e.g., `gateway_error.log`, `shared_error.log`) to identify cross-service issues during initialization.

## Constraints
- Do not run more than 5 services simultaneously unless explicitly asked.
- Always check that the `gateway` is healthy before diagnosing issues in peripheral services.
