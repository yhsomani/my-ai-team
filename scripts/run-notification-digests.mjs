import { createClient } from '@supabase/supabase-js';
import { runWithSchedulerAudit } from './scheduler-audit.mjs';

const supportedDigestFrequencies = new Set(['daily', 'weekly']);

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const chunkBy = (items, keyFn) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

export const normalizeDigestItem = (row) => ({
  id: row.id,
  userId: row.user_id || row.userId,
  sourceType: row.source_type || row.sourceType,
  sourceId: row.source_id || row.sourceId,
  digestFrequency: row.digest_frequency || row.digestFrequency,
  title: row.title,
  message: row.message,
  actionUrl: row.action_url || row.actionUrl || '/jobs',
  metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  deliverAfter: row.deliver_after || row.deliverAfter,
});

export const normalizeNotificationSettings = (row) => ({
  userId: row.user_id || row.userId,
  digestFrequency: row.digest_frequency || row.digestFrequency || 'immediate',
  jobAlerts: row.job_alerts ?? row.jobAlerts ?? true,
});

export const getDigestDeliveryDecision = (item, settings) => {
  if (!settings) {
    return { deliver: false, reason: 'missing_notification_settings' };
  }

  if (settings.jobAlerts === false) {
    return { deliver: false, reason: 'job_alerts_disabled' };
  }

  if (!supportedDigestFrequencies.has(settings.digestFrequency)) {
    return { deliver: false, reason: 'digest_not_enabled' };
  }

  if (settings.digestFrequency !== item.digestFrequency) {
    return { deliver: false, reason: 'digest_frequency_changed' };
  }

  return { deliver: true, reason: 'deliverable' };
};

export const classifyDigestItems = (items, settingsRows) => {
  const settingsByUser = new Map(settingsRows.map((row) => {
    const settings = normalizeNotificationSettings(row);
    return [settings.userId, settings];
  }));

  const deliverable = [];
  const skipped = [];

  for (const row of items) {
    const item = normalizeDigestItem(row);
    const decision = getDigestDeliveryDecision(item, settingsByUser.get(item.userId));

    if (decision.deliver) {
      deliverable.push(item);
    } else {
      skipped.push({ item, reason: decision.reason });
    }
  }

  return {
    deliverable,
    skipped,
  };
};

const getNewMatchCount = (item) => {
  const value = Number(item.metadata?.newMatchCount);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
};

export const buildDigestNotificationInsert = ({
  userId,
  digestFrequency,
  items,
  nowIso,
}) => {
  const itemCount = items.length;
  const totalNewMatches = items.reduce((sum, item) => sum + getNewMatchCount(item), 0);
  const savedSearches = items.slice(0, 10).map((item) => ({
    digestItemId: item.id,
    savedSearchId: item.metadata?.savedSearchId || item.sourceId,
    savedSearchName: item.metadata?.savedSearchName || item.title,
    newMatchCount: getNewMatchCount(item),
    currentMatchCount: item.metadata?.currentMatchCount,
    previousMatchCount: item.metadata?.previousMatchCount,
  }));
  const digestLabel = digestFrequency === 'weekly' ? 'Weekly' : 'Daily';
  const updateLabel = itemCount === 1 ? 'update' : 'updates';
  const matchLabel = totalNewMatches === 1 ? 'match' : 'matches';

  return {
    user_id: userId,
    type: 'JOB_ALERT',
    title: `${digestLabel} saved-search digest`,
    message: totalNewMatches > 0
      ? `${totalNewMatches} new saved-search ${matchLabel} across ${itemCount} ${updateLabel}.`
      : `${itemCount} saved-search ${updateLabel} ready to review.`,
    is_read: false,
    action_url: '/jobs',
    metadata: {
      kind: 'saved_search_digest',
      digestFrequency,
      digestItemIds: items.map((item) => item.id),
      itemCount,
      totalNewMatches,
      savedSearches,
    },
    created_at: nowIso,
  };
};

export const buildDigestNotificationGroups = (items, settingsRows, nowIso) => {
  const { deliverable, skipped } = classifyDigestItems(items, settingsRows);
  const groups = chunkBy(deliverable, (item) => `${item.userId}:${item.digestFrequency}`);
  const notifications = Array.from(groups.values()).map((groupItems) => buildDigestNotificationInsert({
    userId: groupItems[0].userId,
    digestFrequency: groupItems[0].digestFrequency,
    items: groupItems,
    nowIso,
  }));

  return {
    notifications,
    deliveredItemIdsByNotification: notifications.map((notification) => notification.metadata.digestItemIds),
    skipped,
  };
};

const fetchDueDigestItems = async (client, { nowIso, maxItems }) => {
  const { data, error } = await client
    .from('notification_digest_items')
    .select('*')
    .eq('status', 'pending')
    .lte('deliver_after', nowIso)
    .order('deliver_after', { ascending: true })
    .limit(maxItems);

  if (error) throw new Error(`Failed to load due digest items: ${error.message}`);
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

const markDigestItems = async (client, ids, patch) => {
  if (ids.length === 0) return;

  const { error } = await client
    .from('notification_digest_items')
    .update(patch)
    .in('id', ids);

  if (error) throw new Error(`Failed to update digest items: ${error.message}`);
};

const runNotificationDigestDeliveryCore = async (client, options = {}) => {
  const nowIso = options.nowIso || new Date().toISOString();
  const maxItems = toInteger(options.maxItems, 200);
  const dryRun = options.dryRun !== false;
  const dueItems = await fetchDueDigestItems(client, { nowIso, maxItems });
  const userIds = Array.from(new Set(dueItems.map((item) => item.user_id).filter(Boolean)));
  const settingsRows = await fetchNotificationSettings(client, userIds);
  const grouped = buildDigestNotificationGroups(dueItems, settingsRows, nowIso);

  if (dryRun) {
    return {
      dryRun,
      dueItems: dueItems.length,
      notificationsCreated: grouped.notifications.length,
      deliveredItems: grouped.deliveredItemIdsByNotification.flat().length,
      skippedItems: grouped.skipped.length,
    };
  }

  const skippedByReason = chunkBy(grouped.skipped, (entry) => entry.reason);
  for (const [reason, entries] of skippedByReason.entries()) {
    await markDigestItems(client, entries.map((entry) => entry.item.id), {
      status: 'skipped',
      delivered_at: nowIso,
      skip_reason: reason,
    });
  }

  for (const notification of grouped.notifications) {
    const { error } = await client
      .from('notifications')
      .insert(notification);

    if (error) throw new Error(`Failed to create digest notification: ${error.message}`);

    await markDigestItems(client, notification.metadata.digestItemIds, {
      status: 'delivered',
      delivered_at: nowIso,
    });
  }

  return {
    dryRun,
    dueItems: dueItems.length,
    notificationsCreated: grouped.notifications.length,
    deliveredItems: grouped.deliveredItemIdsByNotification.flat().length,
    skippedItems: grouped.skipped.length,
  };
};

export const runNotificationDigestDelivery = async (client, options = {}) => {
  const dryRun = options.dryRun !== false;

  return runWithSchedulerAudit(client, {
    jobName: 'notification_digest_delivery',
    dryRun,
    audit: options.audit,
    auditDryRun: options.auditDryRun,
    runId: options.runId,
    startedAt: options.startedAt || options.nowIso,
  }, () => runNotificationDigestDeliveryCore(client, options));
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
      'Usage: node scripts/run-notification-digests.mjs [--commit] [--max-items=200]',
      '',
      'Runs in dry-run mode by default. Pass --commit from a scheduler/worker to create digest notifications and mark items processed.',
    ].join('\n'));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run notification digests.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const result = await runNotificationDigestDelivery(client, {
    dryRun: !args.includes('--commit'),
    maxItems: getArgValue(args, '--max-items') || process.env.NOTIFICATION_DIGEST_MAX_ITEMS,
  });

  console.log(JSON.stringify(result, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
