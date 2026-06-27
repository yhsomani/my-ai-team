import assert from 'node:assert/strict';
import {
  buildSchedulerAuditLogRow,
  runWithSchedulerAudit,
  sanitizeSchedulerAuditValue,
} from './scheduler-audit.mjs';

const runId = '11111111-1111-4111-8111-111111111111';
const startedAt = '2026-06-26T10:00:00.000Z';
const finishedAt = '2026-06-26T10:00:05.000Z';

const sanitized = sanitizeSchedulerAuditValue({
  processed: 5,
  serviceRoleKey: 'should-not-persist',
  message: 'SUPABASE_SERVICE_ROLE_KEY=secret-value kept out of audit',
});

assert.equal(sanitized.processed, 5);
assert.equal(sanitized.serviceRoleKey, '[redacted]');
assert.equal(
  sanitized.message,
  'SUPABASE_SERVICE_ROLE_KEY=[redacted] kept out of audit'
);

const row = buildSchedulerAuditLogRow({
  jobName: 'notification_digest_delivery',
  status: 'completed',
  dryRun: false,
  runId,
  startedAt,
  finishedAt,
  result: {
    notificationsCreated: 2,
    token: 'do-not-store',
  },
});

assert.equal(row.action, 'scheduler.notification_digest_delivery.completed');
assert.equal(row.entity_type, 'scheduler_run');
assert.equal(row.entity_id, runId);
assert.equal(row.new_value.kind, 'scheduler_run_audit');
assert.equal(row.new_value.durationMs, 5000);
assert.equal(row.new_value.result.notificationsCreated, 2);
assert.equal(row.new_value.result.token, '[redacted]');
assert.equal(row.user_agent, 'talentsphere-scheduler/notification_digest_delivery');

const createAuditClient = ({ failInsert = false } = {}) => {
  const calls = [];

  return {
    calls,
    from(table) {
      assert.equal(table, 'audit_log');

      return {
        insert(insertedRow) {
          calls.push(insertedRow);
          return Promise.resolve({
            error: failInsert ? { message: 'audit table unavailable' } : null,
          });
        },
      };
    },
  };
};

const dryRunClient = createAuditClient();
let dryRunExecuted = false;
const dryRunResult = await runWithSchedulerAudit(dryRunClient, {
  jobName: 'notification_digest_delivery',
  dryRun: true,
  runId,
  startedAt,
}, async () => {
  dryRunExecuted = true;
  return { dryRun: true };
});

assert.equal(dryRunExecuted, true);
assert.deepEqual(dryRunResult, { dryRun: true });
assert.equal(dryRunClient.calls.length, 0);

const commitClient = createAuditClient();
const commitResult = await runWithSchedulerAudit(commitClient, {
  jobName: 'notification_digest_delivery',
  dryRun: false,
  runId,
  startedAt,
}, async () => ({ dryRun: false, notificationsCreated: 1 }));

assert.equal(commitResult.notificationsCreated, 1);
assert.equal(commitClient.calls.length, 2);
assert.equal(commitClient.calls[0].action, 'scheduler.notification_digest_delivery.started');
assert.equal(commitClient.calls[1].action, 'scheduler.notification_digest_delivery.completed');
assert.equal(commitClient.calls[1].new_value.result.notificationsCreated, 1);

const failureClient = createAuditClient();
await assert.rejects(
  () => runWithSchedulerAudit(failureClient, {
    jobName: 'notification_digest_delivery',
    dryRun: false,
    runId,
    startedAt,
  }, async () => {
    throw new Error('provider SECRET_TOKEN=abc failed');
  }),
  /provider SECRET_TOKEN=abc failed/
);

assert.equal(failureClient.calls.length, 2);
assert.equal(failureClient.calls[1].action, 'scheduler.notification_digest_delivery.failed');
assert.equal(
  failureClient.calls[1].new_value.error.message,
  'provider SECRET_TOKEN=[redacted] failed'
);

const blockedClient = createAuditClient({ failInsert: true });
let blockedExecuted = false;
await assert.rejects(
  () => runWithSchedulerAudit(blockedClient, {
    jobName: 'notification_digest_delivery',
    dryRun: false,
    runId,
    startedAt,
  }, async () => {
    blockedExecuted = true;
  }),
  /Failed to record scheduler audit event/
);

assert.equal(blockedExecuted, false);

console.log('scheduler-audit tests passed');
