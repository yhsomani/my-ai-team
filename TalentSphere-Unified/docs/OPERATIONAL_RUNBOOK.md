# TalentSphere Operational Runbooks

> Documentation status: Draft/unverified runbook. SLOs, backup schedules, and cluster commands require environment validation before production use.

## Disaster Recovery

### Recovery Targets
- **RTO**: 4 hours
- **RPO**: 1 hour  
- **Success Rate**: 99.9%

### Backup Schedule
| Database | Frequency | Retention |
|----------|----------|----------|
| auth_db | Hourly | 7 days |
| user_db | Daily | 30 days |
| job_db | Daily | 30 days |
| payment_db | Hourly | 30 days |

## Incident Playbooks

### 1. High CPU Usage

**Symptoms:**
- API response time > 500ms
- Pod CPU > 80%

**Diagnosis:**
```bash
kubectl top pods -n talentsphere
kubectl exec -it <pod> -- top
```

**Resolution:**
1. Check for infinite loops in logs
2. Scale deployment: `kubectl scale deployment <name> --replicas=3`
3. Restart pods: `kubectl rollout restart deployment/<name>`

### 2. Database Connection Pool Exhaustion

**Symptoms:**
- "Too many connections" errors
- Applications hanging

**Diagnosis:**
```bash
kubectl exec -it <postgres-pod> -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"
```

**Resolution:**
1. Reduce connection pool in application config
2. Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle'`
3. Scale database if needed

### 3. Pod CrashLoopBackOff

**Symptoms:**
- Pod not starting, repeatedly crashing

**Diagnosis:**
```bash
kubectl describe pod <name>
kubectl logs <name> --previous
```

**Resolution:**
1. Check image exists and tag is correct
2. Verify environment variables
3. Check volume mounts
4. Rollback to previous version if needed

### 4. Micro-Frontend Load Failure

**Symptoms:**
- Blank screen on navigation
- Console errors about federated modules

**Diagnosis:**
```bash
curl http://<mfe-endpoint>/remoteEntry.js
# Check for 404 or errors
```

**Resolution:**
1. Verify remote module is built and deployed
2. Check CORS headers
3. Verify shared dependencies in vite.config
4. Restart MFE pod

### 5. Service Not Responding

**Symptoms:**
- 504 Gateway Timeout
- Service health check failing

**Resolution:**
```bash
# Check circuit breaker state
curl http://<service>/actuator/health

# Check circuit breaker dashboard
curl http://<service>/actuator/circuitbreakers

# If open, allow reset
curl -X POST http://<service>/actuator/circuitbreakers/<name>/reset
```

## Scaling Commands

```bash
# Scale service
kubectl scale deployment auth-service --replicas=5 -n talentsphere

# Scale HPA
kubectl autoscale deployment api-gateway --min=2 --max=10 --cpu-percent=70 -n talentsphere

# Drain node for maintenance
kubectl cordon <node>
kubectl drain <node> --ignore-daemonsets
```

## Emergency Contacts

| Role | Contact |
|------|--------|
| On-Call | PagerDuty: +1-555-TALENT |
| DevOps Lead | @devops@talentsphere.com |
| Security | security@talentsphere.com |
