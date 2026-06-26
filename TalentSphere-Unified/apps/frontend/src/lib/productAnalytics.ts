import { supabase } from './supabaseClient';

export type ProductAnalyticsArea =
  | 'auth'
  | 'dashboard'
  | 'jobs'
  | 'applications'
  | 'candidates'
  | 'profile'
  | 'resume'
  | 'lms'
  | 'challenges'
  | 'ai'
  | 'networking'
  | 'messaging'
  | 'billing'
  | 'settings'
  | 'admin'
  | 'extension';

export type ProductAnalyticsEventName =
  | 'task_started'
  | 'task_completed'
  | 'task_abandoned'
  | 'task_failed'
  | 'automation_suggestion_generated'
  | 'automation_suggestion_saved'
  | 'automation_suggestion_dismissed'
  | 'automation_handoff_opened'
  | 'workflow_prefill_used'
  | 'workflow_prefill_rejected'
  | 'preference_updated'
  | 'bulk_action_reviewed'
  | 'bulk_action_confirmed'
  | 'error_recovery_clicked'
  | 'degraded_state_shown';

export type ProductAnalyticsPersistedTo = 'server' | 'local';

export interface ProductAnalyticsEventInput {
  userId?: string | null;
  area: ProductAnalyticsArea;
  eventName: ProductAnalyticsEventName;
  source: string;
  objectType?: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface ProductAnalyticsEventRecord {
  id: string;
  userId?: string;
  area: ProductAnalyticsArea;
  eventName: ProductAnalyticsEventName;
  source: string;
  objectType?: string;
  objectId?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface ProductAnalyticsTrackResult {
  event: ProductAnalyticsEventRecord;
  persistedTo: ProductAnalyticsPersistedTo;
}

export const productAnalyticsEventTaxonomy: Record<ProductAnalyticsEventName, {
  label: string;
  description: string;
}> = {
  task_started: {
    label: 'Task Started',
    description: 'A user began a meaningful product workflow.',
  },
  task_completed: {
    label: 'Task Completed',
    description: 'A user completed a meaningful product workflow.',
  },
  task_abandoned: {
    label: 'Task Abandoned',
    description: 'A user left a workflow with unsaved or incomplete work.',
  },
  task_failed: {
    label: 'Task Failed',
    description: 'A user-facing workflow failed before completion.',
  },
  automation_suggestion_generated: {
    label: 'Automation Suggestion Generated',
    description: 'The product generated a recommendation, draft, or shortcut.',
  },
  automation_suggestion_saved: {
    label: 'Automation Suggestion Saved',
    description: 'A user accepted or saved a recommendation for later review.',
  },
  automation_suggestion_dismissed: {
    label: 'Automation Suggestion Dismissed',
    description: 'A user rejected or dismissed a recommendation.',
  },
  automation_handoff_opened: {
    label: 'Automation Handoff Opened',
    description: 'A user opened the destination workflow for a recommendation.',
  },
  workflow_prefill_used: {
    label: 'Workflow Prefill Used',
    description: 'A user inserted or applied a generated prefill into an editable workflow.',
  },
  workflow_prefill_rejected: {
    label: 'Workflow Prefill Rejected',
    description: 'A user explicitly rejected a generated prefill.',
  },
  preference_updated: {
    label: 'Preference Updated',
    description: 'A user changed a product preference or recommendation visibility setting.',
  },
  bulk_action_reviewed: {
    label: 'Bulk Action Reviewed',
    description: 'A user reviewed a multi-item action before confirmation.',
  },
  bulk_action_confirmed: {
    label: 'Bulk Action Confirmed',
    description: 'A user confirmed a reviewed multi-item action.',
  },
  error_recovery_clicked: {
    label: 'Error Recovery Clicked',
    description: 'A user selected an explicit retry or recovery path.',
  },
  degraded_state_shown: {
    label: 'Degraded State Shown',
    description: 'The product showed a fallback, local-only, or partial-data state.',
  },
};

const localAnalyticsKey = 'talentsphere.productAnalytics.events';

const compact = (value?: string | null) => (value || '').trim();

const createAnalyticsEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const safeMetadata = (metadata?: Record<string, unknown>): Record<string, unknown> => (
  metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {}
);

const readLocalAnalyticsEvents = (): ProductAnalyticsEventRecord[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(localAnalyticsKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((event): event is ProductAnalyticsEventRecord => (
      event &&
      typeof event.id === 'string' &&
      typeof event.area === 'string' &&
      typeof event.eventName === 'string' &&
      typeof event.source === 'string' &&
      typeof event.occurredAt === 'string'
    ));
  } catch (error) {
    console.warn('[Analytics] local analytics fallback unavailable.', error);
    return [];
  }
};

const writeLocalAnalyticsEvent = (event: ProductAnalyticsEventRecord) => {
  if (typeof window === 'undefined') return;

  try {
    const events = readLocalAnalyticsEvents();
    window.localStorage.setItem(localAnalyticsKey, JSON.stringify([
      event,
      ...events.filter(item => item.id !== event.id),
    ].slice(0, 100)));
  } catch (error) {
    console.warn('[Analytics] local analytics write unavailable.', error);
  }
};

export const buildProductAnalyticsEvent = ({
  userId,
  area,
  eventName,
  source,
  objectType,
  objectId,
  metadata,
  occurredAt,
}: ProductAnalyticsEventInput): ProductAnalyticsEventRecord => ({
  id: createAnalyticsEventId(),
  userId: compact(userId) || undefined,
  area,
  eventName,
  source: compact(source) || 'unknown',
  objectType: compact(objectType) || undefined,
  objectId: compact(objectId) || undefined,
  metadata: safeMetadata(metadata),
  occurredAt: occurredAt || new Date().toISOString(),
});

const mapAnalyticsResponse = (
  fallback: ProductAnalyticsEventRecord,
  data?: Record<string, any> | null
): ProductAnalyticsEventRecord => {
  if (!data) return fallback;

  return {
    id: data.id || fallback.id,
    userId: data.user_id || data.userId || fallback.userId,
    area: data.area || fallback.area,
    eventName: data.event_name || data.eventName || fallback.eventName,
    source: data.source || fallback.source,
    objectType: data.object_type || data.objectType || fallback.objectType,
    objectId: data.object_id || data.objectId || fallback.objectId,
    metadata: safeMetadata(data.metadata) || fallback.metadata,
    occurredAt: data.occurred_at || data.occurredAt || fallback.occurredAt,
  };
};

export const productAnalytics = {
  trackEvent: async (input: ProductAnalyticsEventInput): Promise<ProductAnalyticsTrackResult> => {
    const event = buildProductAnalyticsEvent(input);

    try {
      const { data, error } = await supabase
        .from('product_analytics_events')
        .insert({
          id: event.id,
          user_id: event.userId || null,
          area: event.area,
          event_name: event.eventName,
          source: event.source,
          object_type: event.objectType || null,
          object_id: event.objectId || null,
          metadata: event.metadata,
          occurred_at: event.occurredAt,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        event: mapAnalyticsResponse(event, data),
        persistedTo: 'server',
      };
    } catch (error) {
      console.warn('[Analytics] product analytics stored locally only.', error);
      writeLocalAnalyticsEvent(event);
      return {
        event,
        persistedTo: 'local',
      };
    }
  },

  getLocalFallbackEvents: (): ProductAnalyticsEventRecord[] => readLocalAnalyticsEvents(),
};
