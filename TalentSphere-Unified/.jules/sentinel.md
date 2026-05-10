## 2026-05-09 - [Spring Boot Database Configuration Security]
**Vulnerability:** Found `ddl-auto: update` configured in multiple production `application.yml` files across the microservices.
**Learning:** This is dangerous as it allows Hibernate to automatically drop, alter, or create tables/columns based on entity definitions, which can cause unexpected data loss or schema corruption in higher environments.
**Prevention:** Always use `ddl-auto: validate` or `none` for production application configuration files. Use Flyway, Liquibase, or manual migration scripts (like the existing `supabase-schema.sql`) for schema management.
