# TalentSphere Architectural Evolution Proposal (Phase 1)

> Current status note, 2026-06-26: this file is a future-state proposal. Use `docs/ARCHITECTURE_STATUS_INDEX.md` for current architecture status and document precedence before using this proposal for implementation planning.

## Strategic Vision: Production-Grade Resilience
The current architecture follows a "Distributed Monolith" pattern with basic event-driven capabilities. To reach production-grade standards, we must shift toward a **Resilient Event-Mesh** architecture that guarantees data consistency and handles failure gracefully.

## Proposed Enhancements

### 1. Reliable Messaging: Transactional Outbox
**Current State**: Synchronous event publishing via `RabbitTemplate` in business logic.
**Target State**: All domain-event producing services (`auth`, `job`, `application`, `challenge`) will implement an Outbox pattern.
- **Implementation**: 
  - Add `OutboxEntity` to shared contracts or local services.
  - Refactor `@Service` methods to save events to the Outbox table.
  - Implement a `MessageRelay` (Scheduled Task or CDC) to drain the Outbox to RabbitMQ.

### 2. Resilience Engineering: DLQ & Circuit Breaker Optimization
**Current State**: Circuit breakers exist, but lack uniform configuration and DLQ support.
**Target State**:
- **DLQ**: Standardize RabbitMQ bindings to include `x-dead-letter-exchange` for all queues.
- **Resilience4j**: Centralize circuit breaker settings in `services/shared` to enforce consistent timeouts and error thresholds.

### 3. Data Integrity: Schema Registry & Versioning
**Current State**: Untyped `Map<String, Object>` messages.
**Target State**: 
- Introduce `talentsphere-schemas` module or use **Spring Cloud Stream Schema Registry**.
- All events must be Avro or JSON-schema validated POJOs with `v1`, `v2` namespaces.

### 4. Performance: Scalable Persistence
**Current State**: Monolithic MongoDB documents with embedded arrays.
**Target State**:
- **LMS Service**: Decouple `Course` and `Lesson`. Use reference IDs or bucketing for lessons.
- **Distributed Caching**: Expand Redis usage to `profile-service` and `lms-service` for high-read aggregates.

### 5. Observability: Distributed Tracing
**Target State**: Integrate **Spring Cloud Sleuth / OpenTelemetry**.
- Ensure Trace IDs are propagated from React → Gateway → Services → RabbitMQ → Consumers.

## Summary of Impact
| Improvement | Reliability | Performance | Maintainability |
| :--- | :---: | :---: | :---: |
| Transactional Outbox | +++ | 0 | ++ |
| DLQ Configuration | +++ | 0 | + |
| Schema Registry | + | 0 | +++ |
| MongoDB Refactor | 0 | +++ | ++ |
| Distributed Tracing | 0 | 0 | +++ |

---
**Next Step (Phase 2)**: Triage the `CODE_ANALYZER_REPORT.json` and begin foundational fixes for the high-severity items (Outbox and DLQs).
