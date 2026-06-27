import { typedSupabase as supabase, type Database, type Json } from './supabaseClient';

type AutomationSuggestionAuditRow = Database['public']['Tables']['automation_suggestion_audit_events']['Row'];
type AutomationSuggestionAuditInsert = Database['public']['Tables']['automation_suggestion_audit_events']['Insert'];

export type AutomationSuggestionAuditEventType =
  | 'created'
  | 'review_status_changed'
  | 'workflow_handoff_opened'
  | 'workflow_prefill_used'
  | 'workflow_prefill_rejected';

export type AutomationSuggestionAuditReviewStatus = 'draft' | 'saved' | 'dismissed';

export type AutomationSuggestionAuditPersistedTo = 'server' | 'local';

export interface AutomationSuggestionAuditEventInput {
  userId?: string | null;
  suggestionId: string;
  eventType: AutomationSuggestionAuditEventType;
  previousReviewStatus?: AutomationSuggestionAuditReviewStatus;
  nextReviewStatus?: AutomationSuggestionAuditReviewStatus;
  source: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface AutomationSuggestionAuditEventRecord {
  id: string;
  userId?: string;
  suggestionId: string;
  eventType: AutomationSuggestionAuditEventType;
  previousReviewStatus?: AutomationSuggestionAuditReviewStatus;
  nextReviewStatus?: AutomationSuggestionAuditReviewStatus;
  source: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface AutomationSuggestionAuditResult {
  event: AutomationSuggestionAuditEventRecord;
  persistedTo: AutomationSuggestionAuditPersistedTo;
}

const localAuditKey = 'talentsphere.automationSuggestionAudit.events';

const compact = (value?: string | null) => (value || '').trim();

const createAuditEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `automation-audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const safeMetadata = (metadata?: unknown): Record<string, unknown> => (
  metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {}
);

const isReviewStatus = (value: unknown): value is AutomationSuggestionAuditReviewStatus => (
  value === 'draft' || value === 'saved' || value === 'dismissed'
);

const normalizeReviewStatus = (value?: AutomationSuggestionAuditReviewStatus): AutomationSuggestionAuditReviewStatus | undefined => (
  isReviewStatus(value) ? value : undefined
);

const isAuditEventType = (value: unknown): value is AutomationSuggestionAuditEventType => (
  value === 'created' ||
  value === 'review_status_changed' ||
  value === 'workflow_handoff_opened' ||
  value === 'workflow_prefill_used' ||
  value === 'workflow_prefill_rejected'
);

const readLocalAuditEvents = (): AutomationSuggestionAuditEventRecord[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(localAuditKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((event): event is AutomationSuggestionAuditEventRecord => (
      event &&
      typeof event.id === 'string' &&
      typeof event.suggestionId === 'string' &&
      isAuditEventType(event.eventType) &&
      typeof event.source === 'string' &&
      typeof event.occurredAt === 'string'
    ));
  } catch (error) {
    console.warn('[AI Audit] local audit fallback unavailable.', error);
    return [];
  }
};

const writeLocalAuditEvent = (event: AutomationSuggestionAuditEventRecord) => {
  if (typeof window === 'undefined') return;

  try {
    const events = readLocalAuditEvents();
    window.localStorage.setItem(localAuditKey, JSON.stringify([
      event,
      ...events.filter(item => item.id !== event.id),
    ].slice(0, 100)));
  } catch (error) {
    console.warn('[AI Audit] local audit write unavailable.', error);
  }
};

export const buildAutomationSuggestionAuditEvent = ({
  userId,
  suggestionId,
  eventType,
  previousReviewStatus,
  nextReviewStatus,
  source,
  metadata,
  occurredAt,
}: AutomationSuggestionAuditEventInput): AutomationSuggestionAuditEventRecord => ({
  id: createAuditEventId(),
  userId: compact(userId) || undefined,
  suggestionId: compact(suggestionId),
  eventType,
  previousReviewStatus: normalizeReviewStatus(previousReviewStatus),
  nextReviewStatus: normalizeReviewStatus(nextReviewStatus),
  source: compact(source) || 'unknown',
  metadata: safeMetadata(metadata),
  occurredAt: occurredAt || new Date().toISOString(),
});

const mapAuditResponse = (
  fallback: AutomationSuggestionAuditEventRecord,
  data?: AutomationSuggestionAuditRow | null
): AutomationSuggestionAuditEventRecord => {
  if (!data) return fallback;

  return {
    id: data.id || fallback.id,
    userId: data.user_id || fallback.userId,
    suggestionId: data.suggestion_id || fallback.suggestionId,
    eventType: isAuditEventType(data.event_type)
      ? data.event_type
      : fallback.eventType,
    previousReviewStatus: isReviewStatus(data.previous_review_status)
      ? data.previous_review_status
      : fallback.previousReviewStatus,
    nextReviewStatus: isReviewStatus(data.next_review_status)
      ? data.next_review_status
      : fallback.nextReviewStatus,
    source: data.source || fallback.source,
    metadata: safeMetadata(data.metadata),
    occurredAt: data.occurred_at || fallback.occurredAt,
  };
};

export const automationSuggestionAudit = {
  recordEvent: async (input: AutomationSuggestionAuditEventInput): Promise<AutomationSuggestionAuditResult> => {
    const event = buildAutomationSuggestionAuditEvent(input);

    if (!event.userId) {
      writeLocalAuditEvent(event);
      return {
        event,
        persistedTo: 'local',
      };
    }

    try {
      const payload: AutomationSuggestionAuditInsert = {
        id: event.id,
        user_id: event.userId,
        suggestion_id: event.suggestionId,
        event_type: event.eventType,
        previous_review_status: event.previousReviewStatus || null,
        next_review_status: event.nextReviewStatus || null,
        source: event.source,
        metadata: event.metadata as Json,
        occurred_at: event.occurredAt,
      };

      const { data, error } = await supabase
        .from('automation_suggestion_audit_events')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        event: mapAuditResponse(event, data),
        persistedTo: 'server',
      };
    } catch (error) {
      console.warn('[AI Audit] automation suggestion audit stored locally only.', error);
      writeLocalAuditEvent(event);
      return {
        event,
        persistedTo: 'local',
      };
    }
  },

  getLocalFallbackEvents: (): AutomationSuggestionAuditEventRecord[] => readLocalAuditEvents(),
};
