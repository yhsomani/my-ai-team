# TalentSphere Database Strategy

## Overview
This document clarifies the database architecture for TalentSphere v3.0.1.

## Current Architecture

### Per-Service Database Isolation (v3.0.1)
Each service owns its dedicated database to ensure strict isolation and horizontal scalability:

| Service | Database | Technology |
|---------|----------|------------|
| auth-service | auth_db | PostgreSQL |
| user-service | user_db | PostgreSQL |
| job-service | job_db | PostgreSQL |
| payment-service | payment_db | PostgreSQL |
| lms-service | lms_db | MongoDB |
| search-service | elasticsearch | Elasticsearch |
| ... | ... | ... |

### Supabase Integration (Optional)
- Supabase can be used as the PostgreSQL provider
- Supabase Auth can optionally replace custom JWT flows
- Row Level Security (RLS) policies available
- **Not required** - services can use any PostgreSQL provider

## Database Strategy Decision

### v3.0.1: Per-Service PostgreSQL/MongoDB
- **NOT** migrating to a single Supabase PostgreSQL
- Each service maintains its own database
- Supabase is one option for PostgreSQL hosting
- MongoDB used where appropriate (LMS, Documents)

## GDPR Compliance

### Audit Logs
All databases include `audit_logs` table:
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);
-- Retention: 7 years
```

### Idempotency Keys
```sql
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

## Configuration
See `services/bom/service-databases.yml` for per-service database configuration.