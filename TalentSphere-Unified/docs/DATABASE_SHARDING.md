# TalentSphere Database Sharding (Citus)

## Overview
TalentSphere uses **Citus** for horizontal scaling of PostgreSQL.

## Architecture

### Node Topology
- 1 Coordinator Node
- 3 Worker Nodes (expandable)

### Node Configuration
```
citus-coordinator: 5432 (primary)
citus-worker-0: 5433
citus-worker-1: 5434  
citus-worker-2: 5435
```

## Table Classification

### Reference Tables (Replicated)
Small tables replicated to ALL nodes:
- `skills` (~500 rows)
- `categories` (~100 rows)
- `countries` (~200 rows)
- `job_types` (~20 rows)

```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

SELECT create_reference_table('skills');
-- Now replicated to all workers
```

### Distributed Tables (Sharded)
Large tables sharded by tenant/user key:
- `users` (shard by user_id)
- `job_applications` (shard by applicant_id)
- `audit_logs` (shard by user_id)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

SELECT create_distributed_table('users', 'user_id');
-- Sharded across workers based on user_id
```

## Query Rules

### GOOD - Include Shard Key
```sql
-- Good: Uses shard key
SELECT * FROM users WHERE user_id = 'abc-123';

-- Good: Filter by job
SELECT * FROM job_applications WHERE applicant_id = 'user-456';
```

### BAD - Broadcast Query
```sql
-- BAD: Missing shard key - scans ALL nodes
SELECT * FROM users WHERE email = 'test@email.com';

-- BAD: JOIN without shard key
SELECT u.*, a.* FROM users u 
JOIN applications a ON u.id = a.user_id;
```

## Query Guidelines

### Always Include tenant_id/user_id
```java
// Always filter by user_id in queries
@Query("SELECT u FROM User u WHERE u.userId = :userId")
List<User> findByUserId(@Param("userId") String userId);

// Never do this:
@Query("SELECT u FROM User u WHERE u.email = :email")  // BROADCAST!
```

### Search with Elastic
For global search, use search service instead:
- Users: Search via Elasticseach (index: users)
- Jobs: Search via Elasticsearch (index: jobs)
- Never search PostgreSQL without shard key

## Maintenance

### Add New Worker
```sql
-- On coordinator
SELECT citus_add_node('citus-worker-3', 5433);

-- Rebalance shards
SELECT rebalance_table_shards('users');
```

### Monitor Distribution
```sql
-- Check shard placement
SELECT * FROM citus_shards;

-- Check node health
SELECT * FROM citus_get_worker_health();
```

## Performance

| Query Type | Latency |
|-----------|--------|
| By shard key | ~5ms |
| Reference table | ~10ms |
| Broadcast | ~200ms+ |

## Migration from Mono table

1. Identify shard key for each table
2. Create as distributed table
3. Test queries include shard key
4. Update ORMs to always use shard key
5. Monitor for broadcast queries in logs