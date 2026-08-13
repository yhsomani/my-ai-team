# Problem Register

| ID | Problem | Affected Module | Severity | Impact | Solution | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PRB-001 | Direct Supabase Write Access | Frontend / All Domains | CRITICAL | Bypasses backend business logic and security. | Migrate all DB writes to Java backend controllers. | Open |
| PRB-002 | Microservice Sprawl | Services / Infra | HIGH | Deployment complexity and integration testing overhead. | Refactor into a Modular Monolith (ADR-002). | Open |
| PRB-003 | Messaging Service Duplication | Chat / Messaging | MEDIUM | Duplicate code and ambiguous domain boundaries. | Orphan `chat-service` and utilize `messaging-service`. | Mitigated (ADR-004) |
| PRB-004 | Incomplete Transactional Outbox | Events / All Domains | HIGH | Data inconsistency if message broker fails. | Implement Outbox Relay in all event-producing services. | Partial |
| PRB-005 | Demo Billing | Payment Service | LOW | Cannot process real payments. | Keep in demo mode until webhooks are implemented. | Mitigated (ADR-005) |
