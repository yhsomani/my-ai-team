import assert from 'node:assert/strict';
import {
  buildNetworkingReminderDeliveryPatch,
  buildNetworkingReminderDeliveryPlan,
  getNetworkingReminderDeliveryDecision,
  runNetworkingReminderDelivery,
} from './run-networking-reminders.mjs';

const nowIso = '2026-06-26T10:00:00.000Z';

const dueReminder = {
  id: 'notification-1',
  user_id: 'user-1',
  title: 'Connection follow-up reminder',
  message: 'Follow up with Ada on Jun 26.',
  is_read: false,
  action_url: '/networking',
  metadata: {
    kind: 'networking_follow_up_reminder',
    connectionId: 'connection-1',
    recipientId: 'user-2',
    recipientName: 'Ada Lovelace',
    remindAt: '2026-06-26T09:00:00.000Z',
  },
  created_at: '2026-06-23T10:00:00.000Z',
};

assert.deepEqual(
  getNetworkingReminderDeliveryDecision({
    id: 'notification-1',
    userId: 'user-1',
    isRead: false,
    metadata: {
      kind: 'networking_follow_up_reminder',
      remindAt: '2026-06-26T09:00:00.000Z',
    },
  }, nowIso),
  { deliver: true, reason: 'deliverable' }
);

assert.equal(
  getNetworkingReminderDeliveryDecision({
    id: 'notification-2',
    userId: 'user-1',
    isRead: false,
    metadata: {
      kind: 'networking_follow_up_reminder',
      remindAt: '2026-06-27T09:00:00.000Z',
    },
  }, nowIso).reason,
  'not_due'
);

assert.equal(
  getNetworkingReminderDeliveryDecision({
    id: 'notification-3',
    userId: 'user-1',
    isRead: false,
    metadata: {
      kind: 'networking_follow_up_reminder',
      remindAt: '2026-06-25T09:00:00.000Z',
      reminderDeliveredAt: '2026-06-25T09:10:00.000Z',
    },
  }, nowIso).reason,
  'already_delivered'
);

const patch = buildNetworkingReminderDeliveryPatch({
  id: 'notification-1',
  userId: 'user-1',
  actionUrl: '/networking',
  metadata: dueReminder.metadata,
}, nowIso);

assert.equal(patch.title, 'Connection follow-up due');
assert.equal(patch.message, 'Follow up with Ada Lovelace about your pending connection request.');
assert.equal(patch.created_at, nowIso);
assert.equal(patch.metadata.reminderDeliveredAt, nowIso);
assert.equal(patch.metadata.reminderDeliverySource, 'scheduler');
assert.equal(patch.metadata.connectionId, 'connection-1');

const plan = buildNetworkingReminderDeliveryPlan([
  dueReminder,
  {
    ...dueReminder,
    id: 'notification-2',
    metadata: {
      ...dueReminder.metadata,
      connectionId: 'connection-2',
      remindAt: '2026-06-27T09:00:00.000Z',
    },
  },
  {
    ...dueReminder,
    id: 'notification-3',
    metadata: {
      ...dueReminder.metadata,
      connectionId: 'connection-3',
      remindAt: 'not-a-date',
    },
  },
], nowIso);

assert.equal(plan.deliverable.length, 1);
assert.equal(plan.deliverable[0].id, 'notification-1');
assert.equal(plan.skipped.length, 2);
assert.equal(plan.skipped[0].reason, 'not_due');
assert.equal(plan.skipped[1].reason, 'invalid_remind_at');

const createFakeClient = (rows) => {
  const calls = {
    filters: [],
    updates: [],
  };

  return {
    calls,
    from(table) {
      assert.equal(table, 'notifications');

      return {
        select(columns) {
          calls.select = columns;
          return this;
        },
        eq(column, value) {
          calls.filters.push(['eq', column, value]);
          return this;
        },
        contains(column, value) {
          calls.filters.push(['contains', column, value]);
          return this;
        },
        order(column, options) {
          calls.filters.push(['order', column, options]);
          return this;
        },
        limit(limit) {
          calls.limit = limit;
          return Promise.resolve({ data: rows, error: null });
        },
        update(patch) {
          const update = { patch, filters: [] };
          calls.updates.push(update);
          const updateBuilder = {
            eq(column, value) {
              update.filters.push(['eq', column, value]);
              return update.filters.length >= 2
                ? Promise.resolve({ error: null })
                : updateBuilder;
            },
          };
          return updateBuilder;
        },
      };
    },
  };
};

const dryRunClient = createFakeClient([dueReminder]);
const dryRunResult = await runNetworkingReminderDelivery(dryRunClient, {
  nowIso,
  maxItems: 25,
});

assert.equal(dryRunResult.dryRun, true);
assert.equal(dryRunResult.scannedReminders, 1);
assert.equal(dryRunResult.dueReminders, 1);
assert.equal(dryRunResult.remindersPromoted, 0);
assert.equal(dryRunClient.calls.limit, 25);
assert.deepEqual(dryRunClient.calls.updates, []);

const commitClient = createFakeClient([dueReminder]);
const commitResult = await runNetworkingReminderDelivery(commitClient, {
  nowIso,
  maxItems: 25,
  dryRun: false,
});

assert.equal(commitResult.dryRun, false);
assert.equal(commitResult.remindersPromoted, 1);
assert.equal(commitClient.calls.updates.length, 1);
assert.equal(commitClient.calls.updates[0].patch.metadata.reminderDeliveredAt, nowIso);
assert.deepEqual(commitClient.calls.updates[0].filters, [
  ['eq', 'id', 'notification-1'],
  ['eq', 'user_id', 'user-1'],
]);

console.log('run-networking-reminders tests passed');
