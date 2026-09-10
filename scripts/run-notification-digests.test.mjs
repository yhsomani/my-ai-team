import assert from 'node:assert/strict';
import {
  buildDigestNotificationGroups,
  buildDigestNotificationInsert,
  getDigestDeliveryDecision,
} from './run-notification-digests.mjs';

const nowIso = '2026-06-26T10:00:00.000Z';

const digestItem = {
  id: 'digest-item-1',
  user_id: 'user-1',
  source_type: 'saved_search',
  source_id: 'search-1',
  digest_frequency: 'daily',
  title: 'Saved search: Remote frontend roles',
  message: '3 new matches for "Remote frontend roles".',
  action_url: '/jobs',
  metadata: {
    savedSearchId: 'search-1',
    savedSearchName: 'Remote frontend roles',
    newMatchCount: 3,
    currentMatchCount: 8,
    previousMatchCount: 5,
  },
};

assert.deepEqual(
  getDigestDeliveryDecision(
    { userId: 'user-1', digestFrequency: 'daily' },
    { userId: 'user-1', digestFrequency: 'daily', jobAlerts: true }
  ),
  { deliver: true, reason: 'deliverable' }
);

assert.equal(
  getDigestDeliveryDecision(
    { userId: 'user-1', digestFrequency: 'daily' },
    { userId: 'user-1', digestFrequency: 'weekly', jobAlerts: true }
  ).reason,
  'digest_frequency_changed'
);

assert.equal(
  getDigestDeliveryDecision(
    { userId: 'user-1', digestFrequency: 'daily' },
    { userId: 'user-1', digestFrequency: 'daily', jobAlerts: false }
  ).reason,
  'job_alerts_disabled'
);

const notification = buildDigestNotificationInsert({
  userId: 'user-1',
  digestFrequency: 'daily',
  items: [{
    id: 'digest-item-1',
    userId: 'user-1',
    sourceId: 'search-1',
    digestFrequency: 'daily',
    title: 'Saved search: Remote frontend roles',
    message: '3 new matches for "Remote frontend roles".',
    actionUrl: '/jobs',
    metadata: digestItem.metadata,
  }],
  nowIso,
});

assert.equal(notification.user_id, 'user-1');
assert.equal(notification.type, 'JOB_ALERT');
assert.equal(notification.title, 'Daily saved-search digest');
assert.equal(notification.message, '3 new saved-search matches across 1 update.');
assert.equal(notification.action_url, '/jobs');
assert.deepEqual(notification.metadata.digestItemIds, ['digest-item-1']);
assert.equal(notification.metadata.totalNewMatches, 3);

const grouped = buildDigestNotificationGroups([
  digestItem,
  {
    ...digestItem,
    id: 'digest-item-2',
    source_id: 'search-2',
    digest_frequency: 'weekly',
    metadata: {
      ...digestItem.metadata,
      savedSearchId: 'search-2',
      savedSearchName: 'Backend roles',
      newMatchCount: 1,
    },
  },
], [
  { user_id: 'user-1', digest_frequency: 'daily', job_alerts: true },
], nowIso);

assert.equal(grouped.notifications.length, 1);
assert.equal(grouped.notifications[0].metadata.itemCount, 1);
assert.equal(grouped.skipped.length, 1);
assert.equal(grouped.skipped[0].reason, 'digest_frequency_changed');

console.log('run-notification-digests tests passed');
