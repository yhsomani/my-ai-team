# Architectural Decision Log

| Decision ID | Context | Chosen Option | Reason | Consequence |
| --- | --- | --- | --- | --- |
| ADR-001 | Identity and Auth Provider | Primary identity-provider via Supabase Auth. | Centralizes user management and token issuance. | Requires gateway and backend migration to standard token validation. |
| ADR-002 | Backend Topology | Modular Monolith first, with extractable service boundaries. | Simplifies local development, transaction consistency, and API contracts compared to 19+ microservices. | Active `services/*` modules will gradually be migrated into the monolith. |
| ADR-003 | Schema Authority | Migration-first Supabase/Postgres authority. | Standardizes DB schema changes through generated TypeScript types and backend validation. | Direct frontend Supabase access is classified as migration debt. |
| ADR-004 | Messaging Boundary | Centralize in `messaging-service`. | Resolves duplication between `chat-service` and `messaging-service`. | `chat-service` is explicitly orphaned and queued for retirement. |
| ADR-005 | Payment Mode | Demo mode for billing. | Payment integrations require robust webhook handling not currently verified. | Prevents unsafe production checkout flows until explicitly implemented. |
