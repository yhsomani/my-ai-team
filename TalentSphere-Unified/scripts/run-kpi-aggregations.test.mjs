import assert from 'node:assert/strict';
import {
  KPI_CATALOG,
  computeAllKpis,
  normalizeEventRow,
} from './run-kpi-aggregations.mjs';

const event = (overrides) => ({
  id: `evt-${Math.random().toString(36).slice(2)}`,
  user_id: 'user-1',
  area: 'ai',
  event_name: 'task_completed',
  source: 'test',
  object_type: null,
  object_id: null,
  metadata: {},
  occurred_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

// --- normalizeEventRow ------------------------------------------------------

assert.deepEqual(
  normalizeEventRow({ id: 'a', user_id: 'u1', event_name: 'x', metadata: { k: 1 } }),
  {
    id: 'a',
    userId: 'u1',
    area: 'unknown',
    eventName: 'x',
    source: 'unknown',
    objectType: null,
    objectId: null,
    metadata: { k: 1 },
    occurredAt: null,
  },
  'normalizeEventRow maps snake_case -> camelCase with defaults',
);

// --- KPI catalog integrity --------------------------------------------------

assert.equal(KPI_CATALOG.length, 18, 'catalog covers K-01…K-18');
assert.deepEqual(
  KPI_CATALOG.map((k) => k.id),
  Array.from({ length: 18 }, (_, i) => `K-${String(i + 1).padStart(2, '0')}`),
  'KPI ids are K-01 through K-18 in order',
);

const computable = KPI_CATALOG.filter((k) => k.sourceStatus === 'computable').map((k) => k.id);
assert.deepEqual(
  computable.sort(),
  ['K-11', 'K-12', 'K-15', 'K-16'].sort(),
  'only K-11, K-12, K-15, K-16 are marked computable from events',
);

// --- computable KPIs --------------------------------------------------------

// K-11: saved / generated
{
  const events = [
    event({ area: 'ai', event_name: 'automation_suggestion_generated' }),
    event({ area: 'ai', event_name: 'automation_suggestion_generated' }),
    event({ area: 'ai', event_name: 'automation_suggestion_saved' }),
    event({ area: 'ai', event_name: 'automation_suggestion_generated' }),
    event({ area: 'ai', event_name: 'automation_suggestion_saved' }),
  ];
  const results = computeAllKpis({ events });
  const k11 = results.find((r) => r.kpiId === 'K-11');
  assert.equal(k11.status, 'computed');
  assert.equal(k11.numerator, 2);
  assert.equal(k11.denominator, 3);
  assert.equal(k11.value, 2 / 3);
}

// K-12: used / (used + rejected)
{
  const events = [
    event({ area: 'ai', event_name: 'workflow_prefill_used' }),
    event({ area: 'ai', event_name: 'workflow_prefill_used' }),
    event({ area: 'ai', event_name: 'workflow_prefill_rejected' }),
  ];
  const k12 = computeAllKpis({ events }).find((r) => r.kpiId === 'K-12');
  assert.equal(k12.status, 'computed');
  assert.equal(k12.numerator, 2);
  assert.equal(k12.denominator, 3);
  assert.equal(k12.value, 2 / 3);
}

// K-15: degraded / distinct active users
{
  const events = [
    event({ user_id: 'u1', event_name: 'degraded_state_shown' }),
    event({ user_id: 'u1', event_name: 'degraded_state_shown' }),
    event({ user_id: 'u2', event_name: 'degraded_state_shown' }),
    event({ user_id: 'u2', event_name: 'task_completed' }),
    event({ user_id: 'u3', event_name: 'task_completed' }),
  ];
  const k15 = computeAllKpis({ events }).find((r) => r.kpiId === 'K-15');
  assert.equal(k15.status, 'computed');
  assert.equal(k15.numerator, 3);
  assert.equal(k15.denominator, 3, 'distinct active users (u1, u2, u3)');
  assert.equal(k15.value, 1);
}

// K-16: audit_log rows / sensitive (admin or admin_write) actions
{
  const events = [
    event({ area: 'admin', event_name: 'task_completed', metadata: { mutationScope: 'admin_write' } }),
    event({ area: 'admin', event_name: 'task_started' }),
    event({ area: 'ai', event_name: 'task_completed' }),
  ];
  const k16 = computeAllKpis({ events, auditLogCount: 6 }).find((r) => r.kpiId === 'K-16');
  assert.equal(k16.status, 'computed');
  assert.equal(k16.numerator, 6);
  assert.equal(k16.denominator, 2, 'admin + admin_write events');
  assert.equal(k16.value, 3);
}

// K-16 without audit-log context -> not computable, not a crash
{
  const events = [event({ area: 'admin', event_name: 'task_completed' })];
  const k16 = computeAllKpis({ events }).find((r) => r.kpiId === 'K-16');
  assert.equal(k16.status, 'not_computable');
  assert.equal(k16.reason, 'no_audit_log_context');
}

// --- not-computable KPIs report honest reasons ------------------------------

{
  const results = computeAllKpis({ events: [] });
  const byId = Object.fromEntries(results.map((r) => [r.kpiId, r]));

  assert.equal(byId['K-01'].status, 'not_computable');
  assert.equal(byId['K-01'].reason, 'planned_no_aggregation_job');
  assert.equal(byId['K-02'].status, 'not_computable');
  assert.equal(byId['K-13'].status, 'not_computable');
  assert.equal(byId['K-14'].status, 'not_computable');
  assert.equal(byId['K-17'].reason, 'local_only_sanitized_analytics');
  assert.equal(byId['K-18'].reason, 'gated_on_content_reports_provisioning');
}

// --- no-denominator computable KPIs return not_computable -------------------

{
  const results = computeAllKpis({ events: [] });
  const k11 = results.find((r) => r.kpiId === 'K-11');
  assert.equal(k11.status, 'not_computable');
  assert.equal(k11.reason, 'no_denominator_events_in_period');
}

// --- values are clamped to the unit interval --------------------------------

{
  // Impossible case guarded by clamp: if ever denominator < numerator.
  const results = computeAllKpis({ events: [event({ user_id: 'u1', event_name: 'degraded_state_shown' })] });
  const k15 = results.find((r) => r.kpiId === 'K-15');
  assert.equal(k15.status, 'computed');
  assert.ok(k15.value >= 0 && k15.value <= 1, 'K-15 value clamped to [0,1]');
}

console.log('run-kpi-aggregations.test.mjs: all assertions passed');
