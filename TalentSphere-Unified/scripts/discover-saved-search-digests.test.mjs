import assert from 'node:assert/strict';
import {
  buildSavedSearchDigestDiscoveryPlan,
  buildSavedSearchDigestQueueRow,
  doesJobMatchSavedSearch,
} from './discover-saved-search-digests.mjs';

const nowIso = '2026-06-26T10:00:00.000Z';

const remoteFrontendSearch = {
  id: 'search-1',
  user_id: 'user-1',
  name: 'Remote frontend roles',
  search_term: 'frontend',
  filters: {
    jobType: 'FULL_TIME',
    location: 'Remote',
    minSalary: '100000',
    maxSalary: '180000',
  },
  alert_enabled: true,
  last_match_count: 1,
};

const matchingJob = {
  id: 'job-1',
  title: 'Frontend Engineer',
  description: 'Build product interfaces',
  companies: { name: 'TalentSphere' },
  location: 'Remote - US',
  job_type: 'FULL_TIME',
  salary_min: 120000,
  salary_max: 170000,
  status: 'PUBLISHED',
};

assert.equal(doesJobMatchSavedSearch(matchingJob, remoteFrontendSearch), true);
assert.equal(doesJobMatchSavedSearch({
  ...matchingJob,
  job_type: 'CONTRACT',
}, remoteFrontendSearch), false);
assert.equal(doesJobMatchSavedSearch({
  ...matchingJob,
  location: 'New York',
}, remoteFrontendSearch), false);
assert.equal(doesJobMatchSavedSearch({
  ...matchingJob,
  salary_min: 90000,
  salary_max: 95000,
}, remoteFrontendSearch), false);

const queueRow = buildSavedSearchDigestQueueRow({
  savedSearch: {
    id: 'search-1',
    userId: 'user-1',
    name: 'Remote frontend roles',
  },
  digestFrequency: 'daily',
  previousMatchCount: 1,
  currentMatchCount: 3,
  nowIso,
});

assert.equal(queueRow.user_id, 'user-1');
assert.equal(queueRow.delivery_key, 'saved_search:user-1:search-1:daily:1:3');
assert.equal(queueRow.message, '2 new matches for "Remote frontend roles".');
assert.equal(queueRow.deliver_after, '2026-06-27T10:00:00.000Z');
assert.equal(queueRow.metadata.discoveredBy, 'saved_search_digest_discovery');

const discoveryPlan = buildSavedSearchDigestDiscoveryPlan({
  savedSearches: [
    remoteFrontendSearch,
    {
      ...remoteFrontendSearch,
      id: 'search-baseline',
      last_match_count: null,
    },
    {
      ...remoteFrontendSearch,
      id: 'search-disabled',
      alert_enabled: false,
    },
    {
      ...remoteFrontendSearch,
      id: 'search-immediate',
      user_id: 'user-2',
    },
    {
      ...remoteFrontendSearch,
      id: 'search-job-alerts-off',
      user_id: 'user-3',
    },
  ],
  jobs: [
    matchingJob,
    {
      ...matchingJob,
      id: 'job-2',
      title: 'Senior Frontend Engineer',
      salary_min: 130000,
      salary_max: 175000,
    },
  ],
  notificationSettings: [
    { user_id: 'user-1', digest_frequency: 'daily', job_alerts: true },
    { user_id: 'user-2', digest_frequency: 'immediate', job_alerts: true },
    { user_id: 'user-3', digest_frequency: 'daily', job_alerts: false },
  ],
  nowIso,
});

assert.equal(discoveryPlan.queueRows.length, 1);
assert.equal(discoveryPlan.queueRows[0].source_id, 'search-1');
assert.equal(discoveryPlan.queueRows[0].metadata.newMatchCount, 1);
assert.equal(discoveryPlan.baselineUpdates.length, 4);
assert.deepEqual(
  discoveryPlan.skipped.map((item) => item.reason).sort(),
  ['alert_disabled', 'baseline_initialized', 'digest_not_enabled', 'job_alerts_disabled']
);

console.log('discover-saved-search-digests tests passed');
