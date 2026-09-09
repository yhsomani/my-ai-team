# TalentSphere Operational Runbooks

> Documentation status: Draft/historical runbook template. SLOs, backup schedules, cluster commands, and runtime cloud infrastructure require environment validation before production use. Canonical source-backed incident runbooks are codified in `docs/runbooks/INCIDENT_RUNBOOKS.md`.

## Disaster Recovery

### Recovery Targets
- **RTO**: 4 hours (Target SLO)
- **RPO**: 1 hour (Target SLO)
- **Success Rate**: 99.9% (Target SLO)

### Backup Schedule

> **Architecture Context (Unified PostgreSQL Authority per ADR-003):**
> In the canonical hybrid architecture, primary persistence is managed via the unified PostgreSQL / Supabase baseline (50 canonical tables defined in `infra/db/migrations/0001_initial_baseline.sql` / `supabase-schema.sql`). Historical per-service database names below represent logical microservice domain boundaries:

| Logical Database / Domain | Frequency | Retention | Notes |
|---|---|---|---|
| `auth` / Identity | Hourly WAL + Daily Snapshot | 7 days | Primary user accounts & sessions |
| `profiles` / User Data | Daily Snapshot | 30 days | Extended profiles, skills, experiences |
| `jobs` / Marketplace | Daily Snapshot | 30 days | Job postings, applications, recruiter notes |
| `billing` / Payments | Hourly WAL + Daily Snapshot | 30 days | Subscriptions, transaction logs |
| `platform` / Unified DB | Point-in-Time Recovery (PITR) | 30 days | Supabase / PostgreSQL primary cluster |

## Incident Playbooks

### 1. High CPU Usage

**Symptoms:**
- API response time > 500ms
- Pod / container CPU > 80%

**Diagnosis:**
```bash
kubectl top pods -n talentsphere
kubectl exec -it <pod> -- top
```

**Resolution:**
1. Check for infinite loops or unindexed queries in application logs
2. Scale deployment: `kubectl scale deployment <name> --replicas=3`
3. Restart pods: `kubectl rollout restart deployment/<name>`

### 2. Database Connection Pool Exhaustion

**Symptoms:**
- "Too many connections" errors
- Applications hanging on database queries

**Diagnosis:**
```bash
kubectl exec -it <postgres-pod> -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"
```

**Resolution:**
1. Reduce connection pool size in application config (or use Supavisor / PgBouncer connection pooling)
2. Terminate orphaned connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle'`
3. Scale database resources if sustained load exceeds capacity

### 3. Pod CrashLoopBackOff

**Symptoms:**
- Pod not starting, repeatedly crashing

**Diagnosis:**
```bash
kubectl describe pod <name>
kubectl logs <name> --previous
```

**Resolution:**
1. Check container image tag and availability
2. Verify required environment variables (DB URLs, JWT secrets, service secrets)
3. Check volume mounts and disk space
4. Rollback to previous known-good deployment: `kubectl rollout undo deployment/<name>`

### 4. Micro-Frontend / Bundle Load Failure

**Symptoms:**
- Blank screen on navigation or missing dynamic modules
- Browser console errors regarding script loading

**Diagnosis:**
```bash
curl -I http://<endpoint>/assets/index.js
# Check HTTP status, CORS headers, and Content-Type
```

**Resolution:**
1. Verify web bundle build completed cleanly (`npm run build`)
2. Check CORS and CDN cache invalidation headers
3. Verify asset hashes in deployment manifest
4. Restart frontend web server / ingress pod

### 5. Service Not Responding / Circuit Breaker Open

**Symptoms:**
- 504 Gateway Timeout
- Service health check failing

**Resolution:**
```bash
# Check service health endpoint
curl http://<service>/actuator/health

# Check circuit breaker status
curl http://<service>/actuator/circuitbreakers

# Reset circuit breaker if downstream has recovered
curl -X POST http://<service>/actuator/circuitbreakers/<name>/reset
```

## Scaling Commands

```bash
# Scale backend service deployment
kubectl scale deployment auth-service --replicas=5 -n talentsphere

# Horizontal Pod Autoscaler (HPA) configuration
kubectl autoscale deployment api-gateway --min=2 --max=10 --cpu-percent=70 -n talentsphere

# Drain node for maintenance
kubectl cordon <node>
kubectl drain <node> --ignore-daemonsets
```

## Emergency Escalation Channels

| Role | Escalation Path |
|---|---|
| On-Call SRE / DevOps | Internal paging rotation / designated primary on-call engineer |
| Backend & Database Lead | Lead maintainer / repository issue escalation |
| Security Response Team | Security advisory / confidential security disclosure channel |

> For code-verified operational validations and repository gate remediation, consult `docs/runbooks/INCIDENT_RUNBOOKS.md`.
