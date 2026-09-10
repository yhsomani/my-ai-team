import { extStorage } from './storage';

export const EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY = 'ts_extension_operational_analytics';
export const EXTENSION_USAGE_DIAGNOSTICS_KEY = 'ts_settings_analytics';

const MAX_LOCAL_EVENTS = 200;

const SAFE_METADATA_KEYS = new Set([
  'active_tab_available',
  'area',
  'clear_scope',
  'cloud_sync_enabled',
  'company_present',
  'content_scrape_available',
  'description_length_band',
  'details_present',
  'diagnostic_action',
  'draft_confidence',
  'draft_present',
  'draft_saved',
  'draft_status',
  'enabled',
  'entry_point',
  'error_category',
  'event_count',
  'field_count',
  'job_count',
  'job_count_band',
  'job_description_length_band',
  'job_keyword_count_band',
  'log_count',
  'matched_keyword_count_band',
  'metadata_confidence',
  'message_action',
  'missing_field_count',
  'missing_keyword_count_band',
  'next_completed',
  'next_status',
  'next_tab',
  'notifications_enabled',
  'object_count',
  'option_tab',
  'posting_url_present',
  'prep_category',
  'prep_count',
  'prep_count_band',
  'previous_completed',
  'previous_status',
  'previous_tab',
  'response_status',
  'resume_length_band',
  'retry_count',
  'role_present',
  'score_band',
  'scrape_available',
  'setting',
  'source_category',
  'source_type',
  'status',
  'status_applied',
  'status_interviewing',
  'status_offered',
  'status_rejected',
  'summary_present',
  'tab',
  'usage_diagnostics_enabled'
]);

export type ExtensionOperationalArea =
  | 'background'
  | 'diagnostics'
  | 'interview_planner'
  | 'options'
  | 'page_scan'
  | 'popup'
  | 'resume_matcher'
  | 'settings'
  | 'tracker';

export interface ExtensionOperationalEvent {
  id: string;
  occurredAt: string;
  source: 'talentsphere_companion';
  area: ExtensionOperationalArea;
  event: string;
  metadata: Record<string, string | number | boolean>;
}

interface RecordExtensionOperationalEventInput {
  area: ExtensionOperationalArea;
  event: string;
  metadata?: Record<string, unknown>;
  forceLocal?: boolean;
}

export const textLengthBand = (value?: string | null) => {
  const length = (value || '').trim().length;

  if (length === 0) {
    return 'empty';
  }

  if (length < 200) {
    return 'short';
  }

  if (length < 1000) {
    return 'medium';
  }

  return 'long';
};

export const countBand = (count: number) => {
  if (count <= 0) {
    return 'none';
  }

  if (count <= 3) {
    return 'few';
  }

  if (count <= 10) {
    return 'some';
  }

  return 'many';
};

export const scoreBand = (score: number) => {
  if (score < 50) {
    return 'low';
  }

  if (score < 80) {
    return 'medium';
  }

  return 'high';
};

export const sourceCategoryFromHost = (source?: string | null) => {
  const normalized = (source || '').toLowerCase();

  if (normalized.includes('linkedin')) {
    return 'linkedin';
  }

  if (normalized.includes('indeed')) {
    return 'indeed';
  }

  if (normalized.includes('glassdoor')) {
    return 'glassdoor';
  }

  if (normalized) {
    return 'other_supported_host';
  }

  return 'unknown';
};

export const categorizeExtensionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (!normalized) {
    return 'unknown';
  }

  if (normalized.includes('receiving end') || normalized.includes('message') || normalized.includes('port')) {
    return 'messaging_unavailable';
  }

  if (normalized.includes('active tab') || normalized.includes('tab')) {
    return 'active_tab_unavailable';
  }

  if (normalized.includes('permission') || normalized.includes('denied')) {
    return 'permission_denied';
  }

  if (normalized.includes('storage') || normalized.includes('quota')) {
    return 'storage_unavailable';
  }

  if (normalized.includes('required') || normalized.includes('validation')) {
    return 'validation';
  }

  if (normalized.includes('timeout') || normalized.includes('network')) {
    return 'transient_unavailable';
  }

  return 'unknown';
};

const createEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `extension-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizeString = (value: string) => value.replace(/[^\w .:-]/g, '').slice(0, 64);

const sanitizeMetadata = (metadata: Record<string, unknown> = {}) => {
  return Object.entries(metadata).reduce<Record<string, string | number | boolean>>((safe, [key, value]) => {
    if (!SAFE_METADATA_KEYS.has(key) || value === undefined || value === null) {
      return safe;
    }

    if (typeof value === 'boolean') {
      safe[key] = value;
      return safe;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
      return safe;
    }

    if (typeof value === 'string') {
      safe[key] = sanitizeString(value);
    }

    return safe;
  }, {});
};

const shouldRecord = async (forceLocal?: boolean) => {
  if (forceLocal) {
    return true;
  }

  try {
    return (await extStorage.get(EXTENSION_USAGE_DIAGNOSTICS_KEY)) === true;
  } catch (err) {
    console.warn('[extensionOperationalAnalytics] Could not read usage diagnostics setting:', err);
    return false;
  }
};

export const recordExtensionOperationalEvent = async ({
  area,
  event,
  metadata,
  forceLocal = false
}: RecordExtensionOperationalEventInput): Promise<void> => {
  try {
    if (!(await shouldRecord(forceLocal))) {
      return;
    }

    const current = (await extStorage.get(EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY)) as
      | ExtensionOperationalEvent[]
      | undefined;
    const existingEvents = Array.isArray(current) ? current : [];
    const nextEvent: ExtensionOperationalEvent = {
      id: createEventId(),
      occurredAt: new Date().toISOString(),
      source: 'talentsphere_companion',
      area,
      event,
      metadata: sanitizeMetadata(metadata)
    };

    await extStorage.set(EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY, [
      ...existingEvents.slice(-(MAX_LOCAL_EVENTS - 1)),
      nextEvent
    ]);
  } catch (err) {
    console.warn('[extensionOperationalAnalytics] Event capture failed:', err);
  }
};
