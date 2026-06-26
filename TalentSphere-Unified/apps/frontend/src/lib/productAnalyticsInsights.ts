import type {
  ProductAnalyticsArea,
  ProductAnalyticsEventName,
  ProductAnalyticsEventRecord,
  ProductAnalyticsPersistedTo
} from './productAnalytics';

export type ProductAnalyticsInsightSource = ProductAnalyticsPersistedTo | 'empty';
export type ProductAnalyticsInsightSeverity = 'info' | 'warning' | 'critical';
export type ProductAnalyticsOpportunityPriority = 'P0' | 'P1' | 'P2';

export interface ProductAnalyticsAreaInsight {
  area: ProductAnalyticsArea | string;
  eventCount: number;
  failureCount: number;
  degradedCount: number;
  automationCount: number;
}

export interface ProductAnalyticsEventInsight {
  eventName: ProductAnalyticsEventName | string;
  eventCount: number;
}

export interface ProductAnalyticsFrictionSignal {
  label: string;
  value: string;
  severity: ProductAnalyticsInsightSeverity;
  description: string;
}

export interface ProductAnalyticsImprovementOpportunity {
  id: string;
  title: string;
  priority: ProductAnalyticsOpportunityPriority;
  area?: ProductAnalyticsArea | string;
  trigger: string;
  expectedImpact: string;
  suggestedAction: string;
  userControl: string;
}

export interface ProductAnalyticsInsightSummary {
  source: ProductAnalyticsInsightSource;
  eventCount: number;
  uniqueAreaCount: number;
  uniqueUserCount: number;
  latestOccurredAt?: string;
  failureCount: number;
  degradedCount: number;
  recoveryCount: number;
  automationGeneratedCount: number;
  automationAcceptedCount: number;
  automationDismissedCount: number;
  prefillUsedCount: number;
  prefillRejectedCount: number;
  handoffCount: number;
  acceptanceRate: number | null;
  rejectionRate: number | null;
  failureRate: number | null;
  topAreas: ProductAnalyticsAreaInsight[];
  topEvents: ProductAnalyticsEventInsight[];
  frictionSignals: ProductAnalyticsFrictionSignal[];
  improvementOpportunities: ProductAnalyticsImprovementOpportunity[];
}

const automationGeneratedEvents = new Set<ProductAnalyticsEventName>([
  'automation_suggestion_generated'
]);

const automationAcceptedEvents = new Set<ProductAnalyticsEventName>([
  'automation_suggestion_saved',
  'workflow_prefill_used'
]);

const automationDismissedEvents = new Set<ProductAnalyticsEventName>([
  'automation_suggestion_dismissed',
  'workflow_prefill_rejected'
]);

const automationWorkflowEvents = new Set<ProductAnalyticsEventName>([
  'automation_suggestion_generated',
  'automation_suggestion_saved',
  'automation_suggestion_dismissed',
  'automation_handoff_opened',
  'workflow_prefill_used',
  'workflow_prefill_rejected'
]);

const getRate = (numerator: number, denominator: number) => (
  denominator > 0 ? Math.round((numerator / denominator) * 100) : null
);

const increment = <Key extends string>(map: Map<Key, number>, key: Key, by = 1) => {
  map.set(key, (map.get(key) || 0) + by);
};

const isKnownEventName = (eventName: string): eventName is ProductAnalyticsEventName => (
  automationWorkflowEvents.has(eventName as ProductAnalyticsEventName)
  || eventName === 'task_started'
  || eventName === 'task_completed'
  || eventName === 'task_abandoned'
  || eventName === 'task_failed'
  || eventName === 'preference_updated'
  || eventName === 'bulk_action_reviewed'
  || eventName === 'bulk_action_confirmed'
  || eventName === 'error_recovery_clicked'
  || eventName === 'degraded_state_shown'
);

const createFrictionSignals = ({
  eventCount,
  failureCount,
  degradedCount,
  recoveryCount,
  automationGeneratedCount,
  automationAcceptedCount,
  automationDismissedCount,
  prefillRejectedCount,
  failureRate,
  rejectionRate,
}: Pick<ProductAnalyticsInsightSummary,
  | 'eventCount'
  | 'failureCount'
  | 'degradedCount'
  | 'recoveryCount'
  | 'automationGeneratedCount'
  | 'automationAcceptedCount'
  | 'automationDismissedCount'
  | 'prefillRejectedCount'
  | 'failureRate'
  | 'rejectionRate'
>): ProductAnalyticsFrictionSignal[] => {
  const signals: ProductAnalyticsFrictionSignal[] = [];

  if (eventCount === 0) {
    return [{
      label: 'No Analytics Events',
      value: '0',
      severity: 'info',
      description: 'No product analytics events are available yet for this admin view.'
    }];
  }

  if ((failureRate || 0) >= 20) {
    signals.push({
      label: 'High Failure Share',
      value: `${failureRate}%`,
      severity: 'critical',
      description: 'Recent workflow events include a high share of task failures or degraded states.'
    });
  } else if (failureCount + degradedCount > 0) {
    signals.push({
      label: 'Recoverable Friction',
      value: `${failureCount + degradedCount}`,
      severity: 'warning',
      description: 'Users encountered failures or degraded states that may need workflow review.'
    });
  }

  if ((rejectionRate || 0) >= 50 && automationGeneratedCount > 0) {
    signals.push({
      label: 'Automation Rejection',
      value: `${rejectionRate}%`,
      severity: 'warning',
      description: 'Users are rejecting a large share of generated suggestions or workflow prefills.'
    });
  }

  if (automationGeneratedCount > 0 && automationAcceptedCount === 0 && automationDismissedCount === 0) {
    signals.push({
      label: 'Unreviewed Automation',
      value: `${automationGeneratedCount}`,
      severity: 'info',
      description: 'Generated suggestions are present, but accepted or dismissed outcomes are not visible yet.'
    });
  }

  if (prefillRejectedCount > 0) {
    signals.push({
      label: 'Prefill Rework',
      value: `${prefillRejectedCount}`,
      severity: 'warning',
      description: 'Users explicitly rejected workflow prefills, which may indicate poor defaults or missing context.'
    });
  }

  if (recoveryCount > 0) {
    signals.push({
      label: 'Recovery Actions',
      value: `${recoveryCount}`,
      severity: 'info',
      description: 'Users clicked explicit retry or recovery paths instead of being blocked.'
    });
  }

  if (signals.length === 0) {
    signals.push({
      label: 'No Major Friction',
      value: 'OK',
      severity: 'info',
      description: 'Recent analytics do not show high failure, rejection, or degraded-state concentration.'
    });
  }

  return signals.slice(0, 4);
};

const createImprovementOpportunities = ({
  eventCount,
  failureCount,
  degradedCount,
  recoveryCount,
  automationGeneratedCount,
  automationAcceptedCount,
  automationDismissedCount,
  prefillUsedCount,
  prefillRejectedCount,
  handoffCount,
  failureRate,
  rejectionRate,
  topAreas,
}: Pick<ProductAnalyticsInsightSummary,
  | 'eventCount'
  | 'failureCount'
  | 'degradedCount'
  | 'recoveryCount'
  | 'automationGeneratedCount'
  | 'automationAcceptedCount'
  | 'automationDismissedCount'
  | 'prefillUsedCount'
  | 'prefillRejectedCount'
  | 'handoffCount'
  | 'failureRate'
  | 'rejectionRate'
  | 'topAreas'
>): ProductAnalyticsImprovementOpportunity[] => {
  const opportunities: ProductAnalyticsImprovementOpportunity[] = [];
  const added = new Set<string>();
  const failureSignalCount = failureCount + degradedCount;
  const reviewedAutomationCount = automationAcceptedCount + automationDismissedCount;
  const topFrictionArea = [...topAreas]
    .sort((left, right) => (
      (right.failureCount + right.degradedCount) - (left.failureCount + left.degradedCount)
      || right.eventCount - left.eventCount
      || left.area.localeCompare(right.area)
    ))
    .find(area => area.failureCount + area.degradedCount > 0);
  const topAutomationArea = [...topAreas]
    .sort((left, right) => (
      right.automationCount - left.automationCount
      || right.eventCount - left.eventCount
      || left.area.localeCompare(right.area)
    ))
    .find(area => area.automationCount > 0);

  const addOpportunity = (opportunity: ProductAnalyticsImprovementOpportunity) => {
    if (added.has(opportunity.id)) return;
    added.add(opportunity.id);
    opportunities.push(opportunity);
  };

  if (eventCount === 0) {
    return [{
      id: 'analytics-instrumentation-coverage',
      title: 'Verify analytics coverage',
      priority: 'P2',
      trigger: 'No recent product analytics events are available for this admin view.',
      expectedImpact: 'Creates a reliable baseline before product teams tune workflows or automation.',
      suggestedAction: 'Check ingestion, RLS access, and event coverage for high-volume workflows.',
      userControl: 'No workflow changes are made from this insight; admins decide what to instrument next.'
    }];
  }

  if ((failureRate || 0) >= 20) {
    addOpportunity({
      id: 'stabilize-high-friction-workflows',
      title: 'Stabilize high-friction workflows',
      priority: (failureRate || 0) >= 40 ? 'P0' : 'P1',
      area: topFrictionArea?.area,
      trigger: `${failureSignalCount} of ${eventCount} recent events show failures or degraded states (${failureRate}%).`,
      expectedImpact: 'Reduces blocked tasks, support escalations, and repeated retry behavior.',
      suggestedAction: topFrictionArea
        ? `Review validation, recovery, and service health for ${topFrictionArea.area}.`
        : 'Review validation, recovery, and service health for the affected workflows.',
      userControl: 'The insight does not retry, hide, submit, or modify user data.'
    });
  } else if (failureSignalCount > 0 && recoveryCount > 0) {
    addOpportunity({
      id: 'shorten-recovery-paths',
      title: 'Shorten recovery paths',
      priority: 'P2',
      area: topFrictionArea?.area,
      trigger: `${recoveryCount} explicit recovery action${recoveryCount === 1 ? '' : 's'} followed recent friction signals.`,
      expectedImpact: 'Helps users recover with fewer repeated clicks when transient issues occur.',
      suggestedAction: 'Tighten retry placement, partial-state messaging, and safe fallback copy around affected flows.',
      userControl: 'Recovery remains user-initiated; this insight only identifies where to improve the path.'
    });
  }

  if ((rejectionRate || 0) >= 50 && automationGeneratedCount > 0) {
    addOpportunity({
      id: 'tune-automation-suggestion-quality',
      title: 'Tune automation suggestion quality',
      priority: 'P1',
      area: topAutomationArea?.area,
      trigger: `${automationDismissedCount} of ${reviewedAutomationCount} reviewed automation outcomes were dismissed (${rejectionRate}%).`,
      expectedImpact: 'Improves suggestion usefulness and lowers manual rework for assisted workflows.',
      suggestedAction: topAutomationArea
        ? `Review defaults, source context, and handoff wording for ${topAutomationArea.area}.`
        : 'Review defaults, source context, and handoff wording for generated suggestions.',
      userControl: 'Suggestions stay optional and editable; users can keep dismissing or overriding them.'
    });
  }

  if (prefillRejectedCount > 0) {
    const reviewedPrefillCount = prefillUsedCount + prefillRejectedCount;
    addOpportunity({
      id: 'review-prefill-defaults',
      title: 'Review prefill defaults',
      priority: prefillRejectedCount >= prefillUsedCount ? 'P1' : 'P2',
      area: topAutomationArea?.area,
      trigger: `${prefillRejectedCount} of ${reviewedPrefillCount} reviewed workflow prefill${reviewedPrefillCount === 1 ? '' : 's'} were rejected.`,
      expectedImpact: 'Reduces cleanup effort before users save generated drafts or imported fields.',
      suggestedAction: 'Compare source fields against review-screen edits and tighten prefill confidence rules.',
      userControl: 'Prefills remain review-only and are never saved without explicit user approval.'
    });
  }

  if (automationGeneratedCount > 0 && reviewedAutomationCount === 0) {
    addOpportunity({
      id: 'capture-automation-review-outcomes',
      title: 'Capture automation review outcomes',
      priority: 'P2',
      area: topAutomationArea?.area,
      trigger: `${automationGeneratedCount} generated suggestion${automationGeneratedCount === 1 ? '' : 's'} have no accepted or dismissed outcome yet.`,
      expectedImpact: 'Makes automation quality measurable instead of relying on generation volume alone.',
      suggestedAction: 'Confirm every suggestion handoff records a saved, dismissed, or abandoned outcome.',
      userControl: 'Outcome tracking is passive and does not change the user decision flow.'
    });
  }

  if (handoffCount > 0 && reviewedAutomationCount > 0 && automationAcceptedCount === 0) {
    addOpportunity({
      id: 'reduce-automation-handoff-dropoff',
      title: 'Reduce automation handoff drop-off',
      priority: 'P2',
      area: topAutomationArea?.area,
      trigger: `${handoffCount} automation handoff${handoffCount === 1 ? '' : 's'} opened with no accepted automation outcomes.`,
      expectedImpact: 'Helps users convert generated assistance into reviewed, useful work faster.',
      suggestedAction: 'Check handoff placement, edit affordances, and completion feedback in assisted flows.',
      userControl: 'Users still choose whether to apply, edit, dismiss, or ignore every generated result.'
    });
  }

  if (opportunities.length === 0) {
    addOpportunity({
      id: 'monitor-healthy-analytics',
      title: 'Monitor healthy workflow trends',
      priority: 'P2',
      trigger: 'Recent events do not show concentrated failure, rejection, or degraded-state signals.',
      expectedImpact: 'Keeps the product-learning loop active while teams prioritize larger platform work.',
      suggestedAction: 'Compare these aggregates weekly and expand coverage to remaining high-volume workflows.',
      userControl: 'This is read-only monitoring and does not trigger automated workflow changes.'
    });
  }

  return opportunities.slice(0, 4);
};

export const summarizeProductAnalyticsEvents = (
  events: ProductAnalyticsEventRecord[],
  source: ProductAnalyticsInsightSource
): ProductAnalyticsInsightSummary => {
  const validEvents = events.filter(event => event && event.area && event.eventName);
  const areaCounts = new Map<string, ProductAnalyticsAreaInsight>();
  const eventCounts = new Map<string, number>();
  const userIds = new Set<string>();
  let latestOccurredAt: string | undefined;
  let failureCount = 0;
  let degradedCount = 0;
  let recoveryCount = 0;
  let automationGeneratedCount = 0;
  let automationAcceptedCount = 0;
  let automationDismissedCount = 0;
  let prefillUsedCount = 0;
  let prefillRejectedCount = 0;
  let handoffCount = 0;

  validEvents.forEach((event) => {
    const eventName = isKnownEventName(event.eventName) ? event.eventName : event.eventName;
    const area = event.area;

    if (event.userId) {
      userIds.add(event.userId);
    }

    if (!latestOccurredAt || event.occurredAt > latestOccurredAt) {
      latestOccurredAt = event.occurredAt;
    }

    increment(eventCounts, eventName);

    const existingArea = areaCounts.get(area) || {
      area,
      eventCount: 0,
      failureCount: 0,
      degradedCount: 0,
      automationCount: 0
    };

    existingArea.eventCount += 1;

    if (eventName === 'task_failed') {
      failureCount += 1;
      existingArea.failureCount += 1;
    }

    if (eventName === 'degraded_state_shown') {
      degradedCount += 1;
      existingArea.degradedCount += 1;
    }

    if (eventName === 'error_recovery_clicked') {
      recoveryCount += 1;
    }

    if (automationGeneratedEvents.has(eventName as ProductAnalyticsEventName)) {
      automationGeneratedCount += 1;
      existingArea.automationCount += 1;
    }

    if (automationAcceptedEvents.has(eventName as ProductAnalyticsEventName)) {
      automationAcceptedCount += 1;
      existingArea.automationCount += 1;
    }

    if (automationDismissedEvents.has(eventName as ProductAnalyticsEventName)) {
      automationDismissedCount += 1;
      existingArea.automationCount += 1;
    }

    if (eventName === 'workflow_prefill_used') {
      prefillUsedCount += 1;
    }

    if (eventName === 'workflow_prefill_rejected') {
      prefillRejectedCount += 1;
    }

    if (eventName === 'automation_handoff_opened') {
      handoffCount += 1;
      existingArea.automationCount += 1;
    }

    areaCounts.set(area, existingArea);
  });

  const reviewedAutomationCount = automationAcceptedCount + automationDismissedCount;
  const eventCount = validEvents.length;
  const failureSignalCount = failureCount + degradedCount;
  const acceptanceRate = getRate(automationAcceptedCount, reviewedAutomationCount);
  const rejectionRate = getRate(automationDismissedCount, reviewedAutomationCount);
  const failureRate = getRate(failureSignalCount, eventCount);

  const summaryBase = {
    source: eventCount > 0 ? source : 'empty',
    eventCount,
    uniqueAreaCount: areaCounts.size,
    uniqueUserCount: userIds.size,
    latestOccurredAt,
    failureCount,
    degradedCount,
    recoveryCount,
    automationGeneratedCount,
    automationAcceptedCount,
    automationDismissedCount,
    prefillUsedCount,
    prefillRejectedCount,
    handoffCount,
    acceptanceRate,
    rejectionRate,
    failureRate,
    topAreas: [...areaCounts.values()]
      .sort((left, right) => right.eventCount - left.eventCount || left.area.localeCompare(right.area))
      .slice(0, 5),
    topEvents: [...eventCounts.entries()]
      .map(([eventName, count]) => ({ eventName, eventCount: count }))
      .sort((left, right) => right.eventCount - left.eventCount || left.eventName.localeCompare(right.eventName))
      .slice(0, 5),
  } satisfies Omit<ProductAnalyticsInsightSummary, 'frictionSignals' | 'improvementOpportunities'>;

  return {
    ...summaryBase,
    frictionSignals: createFrictionSignals(summaryBase),
    improvementOpportunities: createImprovementOpportunities(summaryBase)
  };
};
