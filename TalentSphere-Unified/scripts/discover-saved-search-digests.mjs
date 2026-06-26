import { createClient } from '@supabase/supabase-js';

const supportedDigestFrequencies = new Set(['daily', 'weekly']);
const dayMs = 24 * 60 * 60 * 1000;

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeJobType = (value) => String(value || '').toUpperCase().replace(/[\s-]+/g, '_');

const parseSalaryFilter = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const toNonNegativeInteger = (value) => (
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
);

const truncateText = (value, maxLength) => {
  const normalized = String(value || '').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
};

export const normalizeSavedSearch = (row) => ({
  id: row.id,
  userId: row.user_id || row.userId,
  name: row.name || 'Saved search',
  searchTerm: row.search_term || row.searchTerm || '',
  filters: {
    jobType: typeof row.filters?.jobType === 'string' ? row.filters.jobType : '',
    location: typeof row.filters?.location === 'string' ? row.filters.location : '',
    minSalary: typeof row.filters?.minSalary === 'string' ? row.filters.minSalary : '',
    maxSalary: typeof row.filters?.maxSalary === 'string' ? row.filters.maxSalary : '',
  },
  alertEnabled: Boolean(row.alert_enabled ?? row.alertEnabled),
  lastMatchCount: typeof row.last_match_count === 'number'
    ? row.last_match_count
    : typeof row.lastMatchCount === 'number'
      ? row.lastMatchCount
      : null,
  lastCheckedAt: row.last_checked_at || row.lastCheckedAt || null,
});

export const normalizeJob = (row) => ({
  id: row.id,
  title: row.title || '',
  description: row.description || '',
  companyName: row.companies?.name || row.company?.name || row.company_name || row.companyName || '',
  location: row.location || '',
  jobType: row.job_type || row.jobType || '',
  salaryMin: row.salary_min ?? row.salaryMin,
  salaryMax: row.salary_max ?? row.salaryMax,
  status: row.status || '',
});

export const normalizeNotificationSettings = (row) => ({
  userId: row.user_id || row.userId,
  digestFrequency: row.digest_frequency || row.digestFrequency || 'immediate',
  jobAlerts: row.job_alerts ?? row.jobAlerts ?? true,
});

export const doesJobMatchSavedSearch = (jobInput, savedSearchInput) => {
  const job = normalizeJob(jobInput);
  const savedSearch = normalizeSavedSearch(savedSearchInput);
  const lowerSearch = savedSearch.searchTerm.trim().toLowerCase();
  const location = savedSearch.filters.location.trim().toLowerCase();
  const minSalary = parseSalaryFilter(savedSearch.filters.minSalary);
  const maxSalary = parseSalaryFilter(savedSearch.filters.maxSalary);
  const salaryFloor = job.salaryMax ?? job.salaryMin;
  const salaryCeiling = job.salaryMin ?? job.salaryMax;
  const matchesSearch = !lowerSearch ||
    job.title.toLowerCase().includes(lowerSearch) ||
    job.description.toLowerCase().includes(lowerSearch) ||
    job.companyName.toLowerCase().includes(lowerSearch);
  const matchesType = !savedSearch.filters.jobType ||
    normalizeJobType(job.jobType) === savedSearch.filters.jobType;
  const matchesLocation = !location || job.location.toLowerCase().includes(location);
  const matchesMinSalary = minSalary === undefined ||
    (salaryFloor !== undefined && salaryFloor >= minSalary);
  const matchesMaxSalary = maxSalary === undefined ||
    (salaryCeiling !== undefined && salaryCeiling <= maxSalary);

  return matchesSearch && matchesType && matchesLocation && matchesMinSalary && matchesMaxSalary;
};

const getSavedSearchMatchCount = (jobs, savedSearch) => (
  jobs.filter((job) => doesJobMatchSavedSearch(job, savedSearch)).length
);

const getSavedSearchDigestDeliverAfter = (digestFrequency, nowIso) => {
  const now = new Date(nowIso);
  const delayMs = digestFrequency === 'weekly' ? 7 * dayMs : dayMs;
  return new Date(now.getTime() + delayMs).toISOString();
};

const getDeliveryKey = ({
  userId,
  savedSearchId,
  digestFrequency,
  previousMatchCount,
  currentMatchCount,
}) => [
  'saved_search',
  String(userId || '').trim(),
  String(savedSearchId || '').trim(),
  digestFrequency,
  toNonNegativeInteger(previousMatchCount),
  toNonNegativeInteger(currentMatchCount),
].join(':');

export const buildSavedSearchDigestQueueRow = ({
  savedSearch,
  digestFrequency,
  previousMatchCount,
  currentMatchCount,
  nowIso,
}) => {
  const newMatchCount = Math.max(currentMatchCount - previousMatchCount, 0);
  const savedSearchName = truncateText(savedSearch.name || 'Saved search', 120);
  const plural = newMatchCount === 1 ? 'match' : 'matches';

  return {
    user_id: savedSearch.userId,
    source_type: 'saved_search',
    source_id: savedSearch.id,
    delivery_key: getDeliveryKey({
      userId: savedSearch.userId,
      savedSearchId: savedSearch.id,
      digestFrequency,
      previousMatchCount,
      currentMatchCount,
    }),
    digest_frequency: digestFrequency,
    title: truncateText(`Saved search: ${savedSearchName}`, 200),
    message: `${newMatchCount} new ${plural} for "${savedSearchName}".`,
    action_url: '/jobs',
    metadata: {
      kind: 'saved_search_digest_item',
      savedSearchId: savedSearch.id,
      savedSearchName,
      digestFrequency,
      newMatchCount,
      currentMatchCount,
      previousMatchCount,
      queuedAt: nowIso,
      discoveredBy: 'saved_search_digest_discovery',
    },
    deliver_after: getSavedSearchDigestDeliverAfter(digestFrequency, nowIso),
    status: 'pending',
  };
};

export const buildSavedSearchDigestDiscoveryPlan = ({
  savedSearches,
  jobs,
  notificationSettings,
  nowIso,
}) => {
  const settingsByUser = new Map(notificationSettings.map((row) => {
    const settings = normalizeNotificationSettings(row);
    return [settings.userId, settings];
  }));
  const queueRows = [];
  const baselineUpdates = [];
  const skipped = [];

  for (const row of savedSearches) {
    const savedSearch = normalizeSavedSearch(row);
    const settings = settingsByUser.get(savedSearch.userId);
    const currentMatchCount = getSavedSearchMatchCount(jobs, savedSearch);
    const baselineUpdate = {
      id: savedSearch.id,
      userId: savedSearch.userId,
      lastMatchCount: currentMatchCount,
      lastCheckedAt: nowIso,
    };

    if (!savedSearch.alertEnabled) {
      skipped.push({ savedSearchId: savedSearch.id, reason: 'alert_disabled' });
      continue;
    }

    if (!settings) {
      skipped.push({ savedSearchId: savedSearch.id, reason: 'missing_notification_settings' });
      continue;
    }

    if (settings.jobAlerts === false) {
      skipped.push({ savedSearchId: savedSearch.id, reason: 'job_alerts_disabled' });
      baselineUpdates.push(baselineUpdate);
      continue;
    }

    if (!supportedDigestFrequencies.has(settings.digestFrequency)) {
      skipped.push({ savedSearchId: savedSearch.id, reason: 'digest_not_enabled' });
      baselineUpdates.push(baselineUpdate);
      continue;
    }

    if (savedSearch.lastMatchCount === null) {
      baselineUpdates.push(baselineUpdate);
      skipped.push({ savedSearchId: savedSearch.id, reason: 'baseline_initialized' });
      continue;
    }

    if (currentMatchCount <= savedSearch.lastMatchCount) {
      baselineUpdates.push(baselineUpdate);
      skipped.push({ savedSearchId: savedSearch.id, reason: 'no_new_matches' });
      continue;
    }

    queueRows.push(buildSavedSearchDigestQueueRow({
      savedSearch,
      digestFrequency: settings.digestFrequency,
      previousMatchCount: savedSearch.lastMatchCount,
      currentMatchCount,
      nowIso,
    }));
    baselineUpdates.push(baselineUpdate);
  }

  return {
    queueRows,
    baselineUpdates,
    skipped,
  };
};

const fetchSavedSearches = async (client, maxSearches) => {
  const { data, error } = await client
    .from('saved_job_searches')
    .select('*')
    .eq('alert_enabled', true)
    .order('updated_at', { ascending: true })
    .limit(maxSearches);

  if (error) throw new Error(`Failed to load saved searches: ${error.message}`);
  return data || [];
};

const fetchPublishedJobs = async (client, maxJobs) => {
  const { data, error } = await client
    .from('jobs')
    .select('*, companies (name)')
    .eq('status', 'PUBLISHED')
    .order('posted_at', { ascending: false })
    .limit(maxJobs);

  if (error) throw new Error(`Failed to load jobs: ${error.message}`);
  return data || [];
};

const fetchNotificationSettings = async (client, userIds) => {
  if (userIds.length === 0) return [];

  const { data, error } = await client
    .from('notification_settings')
    .select('user_id,digest_frequency,job_alerts')
    .in('user_id', userIds);

  if (error) throw new Error(`Failed to load notification settings: ${error.message}`);
  return data || [];
};

const upsertDigestRows = async (client, rows) => {
  if (rows.length === 0) return;

  const { error } = await client
    .from('notification_digest_items')
    .upsert(rows, { onConflict: 'delivery_key' });

  if (error) throw new Error(`Failed to queue saved-search digest items: ${error.message}`);
};

const updateSavedSearchBaselines = async (client, updates) => {
  for (const update of updates) {
    const { error } = await client
      .from('saved_job_searches')
      .update({
        last_match_count: update.lastMatchCount,
        last_checked_at: update.lastCheckedAt,
      })
      .eq('user_id', update.userId)
      .eq('id', update.id);

    if (error) throw new Error(`Failed to update saved-search baseline ${update.id}: ${error.message}`);
  }
};

export const runSavedSearchDigestDiscovery = async (client, options = {}) => {
  const dryRun = options.dryRun !== false;
  const nowIso = options.nowIso || new Date().toISOString();
  const maxSearches = toInteger(options.maxSearches, 200);
  const maxJobs = toInteger(options.maxJobs, 500);
  const savedSearches = await fetchSavedSearches(client, maxSearches);
  const userIds = Array.from(new Set(savedSearches.map((search) => search.user_id).filter(Boolean)));
  const [jobs, notificationSettings] = await Promise.all([
    fetchPublishedJobs(client, maxJobs),
    fetchNotificationSettings(client, userIds),
  ]);
  const plan = buildSavedSearchDigestDiscoveryPlan({
    savedSearches,
    jobs,
    notificationSettings,
    nowIso,
  });

  if (!dryRun) {
    await upsertDigestRows(client, plan.queueRows);
    await updateSavedSearchBaselines(client, plan.baselineUpdates);
  }

  return {
    dryRun,
    savedSearchesChecked: savedSearches.length,
    jobsScanned: jobs.length,
    digestItemsQueued: plan.queueRows.length,
    baselinesUpdated: plan.baselineUpdates.length,
    skipped: plan.skipped.length,
    skipReasons: plan.skipped.reduce((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {}),
  };
};

const getArgValue = (args, name) => {
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log([
      'Usage: node scripts/discover-saved-search-digests.mjs [--commit] [--max-searches=200] [--max-jobs=500]',
      '',
      'Runs in dry-run mode by default. Pass --commit from a scheduler/worker to queue digest items and update saved-search baselines.',
    ].join('\n'));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to discover saved-search digest items.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const result = await runSavedSearchDigestDiscovery(client, {
    dryRun: !args.includes('--commit'),
    maxSearches: getArgValue(args, '--max-searches') || process.env.SAVED_SEARCH_DIGEST_MAX_SEARCHES,
    maxJobs: getArgValue(args, '--max-jobs') || process.env.SAVED_SEARCH_DIGEST_MAX_JOBS,
  });

  console.log(JSON.stringify(result, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
