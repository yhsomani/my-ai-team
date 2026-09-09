# Next-Gen Transformation: Phase 1 - Foundation & DX

## Background
We are evolving TalentSphere into a production-grade, highly resilient platform. Phase 1 focuses on Developer Experience (DX) via Contract Testing and Testing & Reliability via Chaos Engineering.

## 1. Automated Microservice Contract Testing & Schema Registry
- [x] **System Architect**: Design integration pattern for Apicurio Schema Registry and Spring Cloud Contract.
- [x] **Refactor Engine**: Update `services/bom/pom.xml` and `ts-shared` to include contract testing dependencies.
- [x] **DevOps**: Setup Apicurio Registry in `docker-compose.yml`.
- [ ] **Feature Completion**: Implement base contracts for `auth-service` (UserRegistered) and `job-service` (JobCreated).
- [x] **DevOps**: Fix and enhance `.github/workflows/ci.yml` to run Maven builds and contract verification.

## 2. Chaos Engineering & Fault Injection Pipeline
- [ ] **System Architect**: Define Resilience SLOs for the Event Mesh.
- [ ] **DevOps**: Integrate `chaos-mesh` simulation scripts into the staging environment.
- [ ] **Debugger**: Implement automated resilience checks in CI to validate circuit breaker and DLQ performance under stress.

## 3. CI/CD Pipeline Rectification (High Priority)
- [x] **Lead**: Correct `ci.yml` to use Maven/JDK 21 for backend services instead of Node.js.
- [ ] **Lead**: Add all 19 services to the build matrix (Note: Optimized to global Maven build).

---
**Status**: IN_PROGRESS
**Milestone**: Safe release pipeline and resilience validation.
