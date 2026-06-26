import type { Connection } from '../types/networking';

export type ReminderDelayOption = 'tomorrow' | 'three-days' | 'one-week';

export interface NetworkingReminderState {
  dueAt?: string;
  delay?: ReminderDelayOption;
}

export interface NetworkingReminderBackfillItem {
  connectionId: string;
  recipientId: string;
  recipientName?: string;
  remindAt: string;
}

export const reminderDelayOptions: Array<{ id: ReminderDelayOption; label: string; days: number }> = [
  { id: 'tomorrow', label: 'Tomorrow', days: 1 },
  { id: 'three-days', label: 'In 3 days', days: 3 },
  { id: 'one-week', label: 'In 1 week', days: 7 },
];

export const defaultReminderDelay: ReminderDelayOption = 'three-days';

export const getNetworkingReminderStorageKey = (userId?: string) => `talentsphere.networking.reminders.${userId || 'guest'}`;

export const getReminderDelay = (delayId: ReminderDelayOption) => (
  reminderDelayOptions.find(option => option.id === delayId) || reminderDelayOptions[1]
);

export const getReminderDueAt = (delayId: ReminderDelayOption, baseDate = new Date()) => {
  const dueAt = new Date(baseDate);
  dueAt.setDate(dueAt.getDate() + getReminderDelay(delayId).days);
  dueAt.setHours(9, 0, 0, 0);
  return dueAt.toISOString();
};

export const formatReminderDueLabel = (value?: string) => {
  if (!value) return 'Reminder set';
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) return 'Reminder set';

  return `Due ${dueAt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

export const normalizeStoredReminders = (value: unknown): Record<string, NetworkingReminderState> => {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, NetworkingReminderState>>((next, item) => {
      if (typeof item === 'string') {
        next[item] = {};
      }
      return next;
    }, {});
  }

  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, NetworkingReminderState>>((next, [requestId, item]) => {
    if (typeof requestId !== 'string') return next;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      next[requestId] = {};
      return next;
    }

    const reminder = item as Record<string, unknown>;
    const dueAt = typeof reminder.dueAt === 'string' ? reminder.dueAt : undefined;
    const delay = reminderDelayOptions.some(option => option.id === reminder.delay)
      ? reminder.delay as ReminderDelayOption
      : undefined;
    next[requestId] = { dueAt, delay };
    return next;
  }, {});
};

const isValidIsoDate = (value?: string) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp);
};

export const buildNetworkingReminderBackfillPlan = (
  remindersByRequestId: Record<string, NetworkingReminderState>,
  sentRequests: Connection[],
  currentUserId?: string
): NetworkingReminderBackfillItem[] => {
  if (!currentUserId) return [];

  return sentRequests.reduce<NetworkingReminderBackfillItem[]>((plan, connection) => {
    const reminder = remindersByRequestId[connection.id];
    if (!reminder || !isValidIsoDate(reminder.dueAt)) return plan;

    const recipient = connection.requesterId === currentUserId ? connection.recipient : connection.requester;
    const recipientId = connection.requesterId === currentUserId ? connection.receiverId : connection.requesterId;
    if (!recipientId) return plan;

    plan.push({
      connectionId: connection.id,
      recipientId,
      recipientName: recipient?.fullName,
      remindAt: reminder.dueAt!,
    });
    return plan;
  }, []);
};
