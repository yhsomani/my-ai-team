import { normalizeNotificationDigestFrequency, type NotificationDigestFrequency } from '../lib/notificationPreferences';
import { typedSupabase as supabase, type Database, type Json } from '../lib/supabaseClient';

type NotificationDigestItemInsert = Database['public']['Tables']['notification_digest_items']['Insert'];

export interface SavedSearchDigestQueueInput {
  savedSearchId: string;
  savedSearchName: string;
  digestFrequency: NotificationDigestFrequency;
  newMatchCount: number;
  currentMatchCount: number;
  previousMatchCount: number;
  queuedAt?: string;
}

export interface NotificationDigestItem {
  userId: string;
  sourceType: 'saved_search';
  sourceId: string;
  deliveryKey: string;
  digestFrequency: 'daily' | 'weekly';
  title: string;
  message: string;
  actionUrl: string;
  metadata: Record<string, unknown>;
  deliverAfter: string;
}

const dayMs = 24 * 60 * 60 * 1000;

const toNonNegativeInteger = (value: number) => (
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
);

const truncateText = (value: string, maxLength: number) => {
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
};

const getSavedSearchDigestFrequency = (value: unknown): 'daily' | 'weekly' => {
  const digestFrequency = normalizeNotificationDigestFrequency(value);
  if (digestFrequency !== 'daily' && digestFrequency !== 'weekly') {
    throw new Error('Saved-search digest queue requires daily or weekly digest frequency.');
  }

  return digestFrequency;
};

export const buildSavedSearchDigestDeliverAfter = (
  digestFrequency: NotificationDigestFrequency,
  now = new Date()
) => {
  const normalizedDigest = getSavedSearchDigestFrequency(digestFrequency);
  const delayMs = normalizedDigest === 'weekly' ? 7 * dayMs : dayMs;
  return new Date(now.getTime() + delayMs).toISOString();
};

export const buildSavedSearchDigestDeliveryKey = ({
  userId,
  savedSearchId,
  digestFrequency,
  previousMatchCount,
  currentMatchCount,
}: {
  userId: string;
  savedSearchId: string;
  digestFrequency: NotificationDigestFrequency;
  previousMatchCount: number;
  currentMatchCount: number;
}) => {
  const normalizedDigest = getSavedSearchDigestFrequency(digestFrequency);
  return [
    'saved_search',
    userId.trim(),
    savedSearchId.trim(),
    normalizedDigest,
    toNonNegativeInteger(previousMatchCount),
    toNonNegativeInteger(currentMatchCount),
  ].join(':');
};

export const buildSavedSearchDigestItem = (
  userId: string,
  input: SavedSearchDigestQueueInput,
  now = new Date(input.queuedAt || Date.now())
): NotificationDigestItem => {
  const normalizedDigest = getSavedSearchDigestFrequency(input.digestFrequency);
  const savedSearchName = truncateText(input.savedSearchName || 'Saved search', 120);
  const newMatchCount = toNonNegativeInteger(input.newMatchCount);
  const currentMatchCount = toNonNegativeInteger(input.currentMatchCount);
  const previousMatchCount = toNonNegativeInteger(input.previousMatchCount);
  const plural = newMatchCount === 1 ? 'match' : 'matches';

  return {
    userId: userId.trim(),
    sourceType: 'saved_search',
    sourceId: input.savedSearchId.trim(),
    deliveryKey: buildSavedSearchDigestDeliveryKey({
      userId,
      savedSearchId: input.savedSearchId,
      digestFrequency: normalizedDigest,
      previousMatchCount,
      currentMatchCount,
    }),
    digestFrequency: normalizedDigest,
    title: truncateText(`Saved search: ${savedSearchName}`, 200),
    message: `${newMatchCount} new ${plural} for "${savedSearchName}".`,
    actionUrl: '/jobs',
    metadata: {
      kind: 'saved_search_digest_item',
      savedSearchId: input.savedSearchId.trim(),
      savedSearchName,
      digestFrequency: normalizedDigest,
      newMatchCount,
      currentMatchCount,
      previousMatchCount,
      queuedAt: now.toISOString(),
    },
    deliverAfter: buildSavedSearchDigestDeliverAfter(normalizedDigest, now),
  };
};

export const notificationDigestService = {
  queueSavedSearchDigestItem: async (
    userId: string,
    input: SavedSearchDigestQueueInput
  ): Promise<NotificationDigestItem> => {
    const digestItem = buildSavedSearchDigestItem(userId, input);
    const payload: NotificationDigestItemInsert = {
      user_id: digestItem.userId,
      source_type: digestItem.sourceType,
      source_id: digestItem.sourceId,
      delivery_key: digestItem.deliveryKey,
      digest_frequency: digestItem.digestFrequency,
      title: digestItem.title,
      message: digestItem.message,
      action_url: digestItem.actionUrl,
      metadata: digestItem.metadata as Json,
      deliver_after: digestItem.deliverAfter,
      status: 'pending',
    };

    const { error } = await supabase
      .from('notification_digest_items')
      .upsert(payload, {
        onConflict: 'delivery_key',
      });

    if (error) {
      throw new Error(`Failed to queue saved-search digest item: ${error.message}`);
    }

    return digestItem;
  },
};
