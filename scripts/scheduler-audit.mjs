import { randomUUID } from 'node:crypto';

const schedulerActionPrefix = 'scheduler';
const schedulerEntityType = 'scheduler_run';
const maxStringLength = 300;
const maxArrayItems = 20;
const maxDepth = 4;
const secretPattern = /(secret|token|password|credential|service[_-]?role|api[_-]?key)/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const toIsoString = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
};

const sanitizeString = (value) => {
  const redacted = String(value).replace(
    /([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|SERVICE[_-]?ROLE|API[_-]?KEY)[A-Z0-9_]*)=([^,\s]+)/gi,
    '$1=[redacted]'
  );

  return redacted.length <= maxStringLength
    ? redacted
    : `${redacted.slice(0, maxStringLength - 3)}...`;
};

export const sanitizeSchedulerAuditValue = (value, depth = 0, key = '') => {
  if (value === null || value === undefined) return value;
  if (secretPattern.test(key)) return '[redacted]';
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return toIsoString(value);
  if (depth >= maxDepth) return '[truncated]';

  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayItems)
      .map((item) => sanitizeSchedulerAuditValue(item, depth + 1));
  }

  if (!isRecord(value)) return String(value);

  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [
    entryKey,
    sanitizeSchedulerAuditValue(entryValue, depth + 1, entryKey),
  ]));
};

const sanitizeError = (error) => ({
  name: sanitizeString(error?.name || 'Error'),
  message: sanitizeString(error?.message || 'Scheduler run failed'),
  code: error?.code ? sanitizeString(error.code) : undefined,
});

const getDurationMs = (startedAt, finishedAt) => {
  const start = new Date(startedAt).getTime();
  const finish = new Date(finishedAt).getTime();
  return Number.isFinite(start) && Number.isFinite(finish)
    ? Math.max(0, finish - start)
    : null;
};

export const buildSchedulerAuditLogRow = ({
  jobName,
  status,
  dryRun,
  runId = randomUUID(),
  startedAt,
  finishedAt,
  result,
  error,
}) => {
  const normalizedStartedAt = toIsoString(startedAt);
  const normalizedFinishedAt = finishedAt ? toIsoString(finishedAt) : normalizedStartedAt;
  const normalizedJobName = String(jobName || 'unknown_scheduler_job')
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, '_');
  const normalizedStatus = ['started', 'completed', 'failed'].includes(status) ? status : 'failed';

  return {
    user_id: null,
    action: `${schedulerActionPrefix}.${normalizedJobName}.${normalizedStatus}`,
    entity_type: schedulerEntityType,
    entity_id: uuidPattern.test(runId) ? runId : null,
    old_value: null,
    new_value: {
      kind: 'scheduler_run_audit',
      jobName: normalizedJobName,
      status: normalizedStatus,
      dryRun: Boolean(dryRun),
      runId,
      startedAt: normalizedStartedAt,
      finishedAt: normalizedFinishedAt,
      durationMs: getDurationMs(normalizedStartedAt, normalizedFinishedAt),
      result: result === undefined ? undefined : sanitizeSchedulerAuditValue(result),
      error: error ? sanitizeError(error) : undefined,
    },
    ip_address: null,
    user_agent: `talentsphere-scheduler/${normalizedJobName}`,
    created_at: normalizedFinishedAt,
  };
};

export const recordSchedulerAuditEvent = async (client, event) => {
  const row = buildSchedulerAuditLogRow(event);
  const { error } = await client.from('audit_log').insert(row);

  if (error) {
    throw new Error(`Failed to record scheduler audit event ${row.action}: ${error.message}`);
  }

  return row;
};

const shouldAudit = ({ dryRun, audit, auditDryRun }) => {
  if (dryRun) return audit === true || auditDryRun === true;
  return audit !== false;
};

export const runWithSchedulerAudit = async (client, options, execute) => {
  const dryRun = options?.dryRun !== false;
  const startedAt = toIsoString(options?.startedAt);
  const runId = options?.runId || randomUUID();
  const audit = shouldAudit({
    dryRun,
    audit: options?.audit,
    auditDryRun: options?.auditDryRun,
  });

  if (!audit) {
    return execute();
  }

  await recordSchedulerAuditEvent(client, {
    jobName: options.jobName,
    status: 'started',
    dryRun,
    runId,
    startedAt,
  });

  try {
    const result = await execute();
    await recordSchedulerAuditEvent(client, {
      jobName: options.jobName,
      status: 'completed',
      dryRun,
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
    });
    return result;
  } catch (error) {
    try {
      await recordSchedulerAuditEvent(client, {
        jobName: options.jobName,
        status: 'failed',
        dryRun,
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        error,
      });
    } catch (auditError) {
      error.schedulerAuditError = auditError.message;
    }
    throw error;
  }
};
