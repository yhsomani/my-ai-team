export type NotificationDigestFrequency = 'immediate' | 'daily' | 'weekly' | 'off';

export const notificationDigestFrequencyOptions: Array<{
  value: NotificationDigestFrequency;
  label: string;
  description: string;
}> = [
  {
    value: 'immediate',
    label: 'Immediate',
    description: 'Show opted-in alerts as they are created.',
  },
  {
    value: 'daily',
    label: 'Daily Digest',
    description: 'Group lower-priority alerts into a daily summary.',
  },
  {
    value: 'weekly',
    label: 'Weekly Digest',
    description: 'Group lower-priority alerts into a weekly summary.',
  },
  {
    value: 'off',
    label: 'No Digest',
    description: 'Keep only explicitly enabled real-time alerts.',
  },
];

const notificationDigestValues = new Set<NotificationDigestFrequency>(
  notificationDigestFrequencyOptions.map(option => option.value)
);

const quietTimePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const normalizeNotificationDigestFrequency = (
  value: unknown
): NotificationDigestFrequency => (
  typeof value === 'string' && notificationDigestValues.has(value as NotificationDigestFrequency)
    ? value as NotificationDigestFrequency
    : 'immediate'
);

export const normalizeNotificationQuietTime = (
  value: unknown,
  fallback: string
) => {
  if (typeof value !== 'string' || !quietTimePattern.test(value)) {
    return fallback;
  }

  return value.slice(0, 5);
};

export const buildNotificationDeliverySummary = (settings: {
  digest_frequency?: unknown;
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start?: unknown;
  quiet_hours_end?: unknown;
}) => {
  const digestFrequency = normalizeNotificationDigestFrequency(settings.digest_frequency);
  const quietHoursEnabled = Boolean(settings.quiet_hours_enabled);
  const quietStart = normalizeNotificationQuietTime(settings.quiet_hours_start, '18:00');
  const quietEnd = normalizeNotificationQuietTime(settings.quiet_hours_end, '09:00');
  const digestLabel = notificationDigestFrequencyOptions.find(option => option.value === digestFrequency)?.label || 'Immediate';

  return {
    digestFrequency,
    digestLabel,
    quietHoursEnabled,
    quietStart,
    quietEnd,
    summary: quietHoursEnabled
      ? `${digestLabel}; quiet hours ${quietStart}-${quietEnd}`
      : `${digestLabel}; quiet hours off`,
  };
};

export type LowerPriorityNotificationDelivery = 'deliver_now' | 'defer_to_digest' | 'suppressed';

export const getLowerPriorityNotificationDelivery = ({
  digestFrequency,
  channelEnabled,
}: {
  digestFrequency?: unknown;
  channelEnabled: boolean;
}): LowerPriorityNotificationDelivery => {
  if (!channelEnabled) return 'suppressed';

  const normalizedDigest = normalizeNotificationDigestFrequency(digestFrequency);
  return normalizedDigest === 'daily' || normalizedDigest === 'weekly'
    ? 'defer_to_digest'
    : 'deliver_now';
};
