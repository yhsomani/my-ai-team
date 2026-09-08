import { createClient } from '@supabase/supabase-js';
import { runWithSchedulerAudit } from './scheduler-audit.mjs';

/**
 * KPI aggregation job scaffold — BRD §16 (K-01…K-18).
 *
 * Reads raw `product_analytics_events` (and optional audit-log context) and
 * computes every KPI that the BRD marks as "computable now", reporting the
 * remaining KPIs honestly as `not_computable` with the reason it cannot yet be
 * derived from current instrumentation. This matches the documented framework:
 *   - K-11, K-12, K-15, K-16, K-17 -> computable from existing events [VC]
 *   - K-18                        -> gated on `content_reports` provisioning (Q-14)
 *   - K-01…K-10, K-13, K-14       -> planned (no aggregation/cohort yet) [PLN]
 *
 * Pure computation is isolated and unit-tested (see run-kpi-aggregations.test.mjs);
 * the DB/CLI layer is a thin wrapper mirroring run-notification-digests.mjs.
 */

const KPI_SOURCE_STATUS = {
  COMPUTABLE: 'computable',
  PLANNED: 'planned',
  EXTERNAL: 'external',
  GATED: 'gated',
};

/**
 * Canonical KPI catalog mirroring BRD §16. `definition` is the measured ratio;
 * `sourceStatus` matches the BRD "Instrumentation status" column.
 */
export const KPI_CATALOG = [
  { id: 'K-01', name: 'Activation rate', definition: '% new signups completing ≥1 core action in 7d', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-02', name: 'WAU', definition: 'Weekly active users', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-03', name: 'Search→apply conversion', definition: 'applications / searches', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-04', name: 'Posting liquidity', definition: 'active postings per recruiter/mo', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-05', name: 'Application response rate', definition: 'status moves / applications', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-06', name: 'Course completion rate', definition: 'COMPLETED / enrollments', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-07', name: 'Challenge participation', definition: 'submissions/user/wk', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-08', name: 'First-pass success', definition: 'PASSED without retry / submissions', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-09', name: 'Connection acceptance rate', definition: 'ACCEPTED / sent', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-10', name: 'Message responsiveness', definition: 'median reply latency', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-11', name: 'AI suggestion acceptance', definition: 'saved / generated suggestions', sourceStatus: KPI_SOURCE_STATUS.COMPUTABLE },
  { id: 'K-12', name: 'Prefill utility', definition: 'prefill_used vs rejected', sourceStatus: KPI_SOURCE_STATUS.COMPUTABLE },
  { id: 'K-13', name: 'Digest engagement', definition: 'action_url clicks / delivered digests', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-14', name: 'D30 retention', definition: 'cohort survival', sourceStatus: KPI_SOURCE_STATUS.PLANNED },
  { id: 'K-15', name: 'Degraded-experience rate', definition: 'degraded_state_shown / sessions', sourceStatus: KPI_SOURCE_STATUS.COMPUTABLE },
  { id: 'K-16', name: 'Pipeline review rate (internal)', definition: 'audit_log rows / sensitive actions', sourceStatus: KPI_SOURCE_STATUS.COMPUTABLE },
  { id: 'K-17', name: 'Extension adoption', definition: 'installs→imports (sanitized, local consent)', sourceStatus: KPI_SOURCE_STATUS.EXTERNAL },
  { id: 'K-18', name: 'Moderation throughput', definition: 'resolved+dismissed / reports submitted (+ median triage latency)', sourceStatus: KPI_SOURCE_STATUS.GATED },
];

const byId = (id) => KPI_CATALOG.find((kpi) => kpi.id === id);

// Probability-type KPIs (acceptance / utility / experience rate) are clamped to
// [0,1]. K-16 is a review *throughput* ratio and may exceed 1, so it is not clamped.
const clampUnitInterval = (ratio) => {
  if (!Number.isFinite(ratio)) return null;
  return Math.min(1, Math.max(0, ratio));
};

const toRatio = (numerator, denominator) => {
  if (denominator <= 0) return null;
  return numerator / denominator;
};

const getEventName = (row) => row.eventName || row.event_name;

const countEvents = (events, predicate) => events.filter(predicate).length;

/**
 * Normalize a raw `product_analytics_events` row into the shape the pure
 * compute functions expect (tolerates snake_case rows from the DB and the
 * camelCase shape used in tests).
 */
export const normalizeEventRow = (row) => ({
  id: row.id,
  userId: row.user_id || row.userId || null,
  area: row.area || 'unknown',
  eventName: getEventName(row),
  source: row.source || 'unknown',
  objectType: row.object_type || row.objectType || null,
  objectId: row.object_id || row.objectId || null,
  metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  occurredAt: row.occurred_at || row.occurredAt || null,
});

const computeSuggestionAcceptance = (events) => {
  const generated = countEvents(
    events,
    (e) => e.area === 'ai' && e.eventName === 'automation_suggestion_generated',
  );
  const saved = countEvents(
    events,
    (e) => e.area === 'ai' && e.eventName === 'automation_suggestion_saved',
  );
  return {
    numerator: saved,
    denominator: generated,
    value: toRatio(saved, generated),
  };
};

const computePrefillUtility = (events) => {
  const used = countEvents(
    events,
    (e) => e.area === 'ai' && e.eventName === 'workflow_prefill_used',
  );
  const rejected = countEvents(
    events,
    (e) => e.area === 'ai' && e.eventName === 'workflow_prefill_rejected',
  );
  return {
    numerator: used,
    denominator: used + rejected,
    value: toRatio(used, used + rejected),
  };
};

const computeDegradedExperienceRate = (events) => {
  const degraded = countEvents(events, (e) => e.eventName === 'degraded_state_shown');
  const activeUsers = new Set(events.map((e) => e.userId).filter(Boolean)).size;
  // Sessions are not yet instrumented; distinct active users serve as the
  // denominator proxy (documented in the BRD as "events ready").
  return {
    numerator: degraded,
    denominator: activeUsers,
    value: toRatio(degraded, activeUsers),
  };
};

const computePipelineReviewRate = (events, auditLogCount) => {
  const sensitiveActions = countEvents(
    events,
    (e) => e.area === 'admin' || (e.metadata && e.metadata.mutationScope === 'admin_write'),
  );
  return {
    numerator: typeof auditLogCount === 'number' ? auditLogCount : null,
    denominator: sensitiveActions,
    value: typeof auditLogCount === 'number' ? toRatio(auditLogCount, sensitiveActions) : null,
  };
};

/**
 * Compute every KPI in the catalog against the supplied raw rows.
 *
 * @param {object} input
 * @param {Array}  input.events          normalized or raw product_analytics_events rows
 * @param {number} [input.auditLogCount] optional audit_log row count for K-16
 * @returns {Array<object>} one result per KPI (computed or not_computable)
 */
export const computeAllKpis = ({ events = [], auditLogCount } = {}) => {
  const normalized = events.map(normalizeEventRow);

  const k11 = computeSuggestionAcceptance(normalized);
  const k12 = computePrefillUtility(normalized);
  const k15 = computeDegradedExperienceRate(normalized);
  const k16 = computePipelineReviewRate(normalized, auditLogCount);

  const computedByKpi = {
    'K-11': k11,
    'K-12': k12,
    'K-15': k15,
    'K-16': k16,
  };

  const results = KPI_CATALOG.map((kpi) => {
    const base = {
      kpiId: kpi.id,
      name: kpi.name,
      definition: kpi.definition,
    };

    if (kpi.sourceStatus === KPI_SOURCE_STATUS.COMPUTABLE) {
      const { numerator, denominator, value } = computedByKpi[kpi.id];
      if (denominator === null || denominator === undefined || denominator <= 0) {
        return {
          ...base,
          status: 'not_computable',
          reason: 'no_denominator_events_in_period',
        };
      }
      if (value === null || value === undefined) {
        return {
          ...base,
          status: 'not_computable',
          reason: kpi.id === 'K-16' ? 'no_audit_log_context' : 'insufficient_event_data',
        };
      }
      return {
        ...base,
        status: 'computed',
        value: kpi.id === 'K-16' ? value : clampUnitInterval(value),
        unit: 'ratio',
        numerator,
        denominator,
      };
    }

    const reasons = {
      [KPI_SOURCE_STATUS.PLANNED]: 'planned_no_aggregation_job',
      [KPI_SOURCE_STATUS.EXTERNAL]: 'local_only_sanitized_analytics',
      [KPI_SOURCE_STATUS.GATED]: 'gated_on_content_reports_provisioning',
    };
    return {
      ...base,
      status: 'not_computable',
      reason: reasons[kpi.sourceStatus],
    };
  });

  return results;
};

const countEventsSummary = (results) => ({
  computed: results.filter((r) => r.status === 'computed').length,
  notComputable: results.filter((r) => r.status === 'not_computable').length,
});

const buildSummary = (results, { eventCount }) => ({
  kpiCount: results.length,
  eventCount,
  computedKpis: countEventsSummary(results).computed,
  notComputableKpis: countEventsSummary(results).notComputable,
});

const fetchEventsInRange = async (client, { periodStart, periodEnd, maxEvents }) => {
  let query = client
    .from('product_analytics_events')
    .select('*')
    .gte('occurred_at', periodStart)
    .lte('occurred_at', periodEnd)
    .order('occurred_at', { ascending: true })
    .limit(maxEvents);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load product analytics events: ${error.message}`);
  return data || [];
};

const countAuditLogRows = async (client, { periodStart, periodEnd }) => {
  const { count, error } = await client
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  if (error) throw new Error(`Failed to count audit log rows: ${error.message}`);
  return count ?? 0;
};

const runKpiAggregationsCore = async (client, options = {}) => {
  const periodStart = options.periodStart;
  const periodEnd = options.periodEnd || new Date().toISOString();
  const maxEvents = options.maxEvents || 5000;

  const events = await fetchEventsInRange(client, { periodStart, periodEnd, maxEvents });
  const auditLogCount = await countAuditLogRows(client, { periodStart, periodEnd });
  const results = computeAllKpis({ events, auditLogCount });

  return {
    periodStart,
    periodEnd,
    ...buildSummary(results, { eventCount: events.length }),
    results,
  };
};

export const runKpiAggregations = async (client, options = {}) => {
  const dryRun = options.dryRun !== false;

  return runWithSchedulerAudit(client, {
    jobName: 'kpi_aggregations',
    dryRun,
    audit: options.audit,
    auditDryRun: options.auditDryRun,
    runId: options.runId,
    startedAt: options.startedAt || options.nowIso,
  }, () => runKpiAggregationsCore(client, options));
};

const toIsoDaysAgo = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

const getArgValue = (args, name) => {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log([
      'Usage: node scripts/run-kpi-aggregations.mjs [--start=ISO] [--end=ISO] [--max-events=5000]',
      '',
      'Computes BRD §16 KPIs (K-01…K-18) from raw product_analytics_events.',
      '  --start        period start (default: 7 days ago)',
      '  --end          period end (default: now)',
      '  --max-events   cap on event rows scanned (default: 5000)',
      'Computation is read-only; results are printed as JSON. No schema writes occur.',
    ].join('\n'));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run KPI aggregations.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await runKpiAggregations(client, {
    dryRun: !args.includes('--commit'),
    periodStart: getArgValue(args, '--start') || toIsoDaysAgo(7),
    periodEnd: getArgValue(args, '--end'),
    maxEvents: getArgValue(args, '--max-events'),
  });

  console.log(JSON.stringify(result, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
