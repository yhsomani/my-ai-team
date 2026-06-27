import { createClient } from '@supabase/supabase-js';
import { runWithSchedulerAudit } from './scheduler-audit.mjs';

const networkingReminderKind = 'networking_follow_up_reminder';

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeMetadata = (value) => (isRecord(value) ? value : {});

const toValidDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRecipientLabel = (metadata) => {
  const recipientName = typeof metadata.recipientName === 'string' ? metadata.recipientName.trim() : '';
  return recipientName || 'this connection';
};

export const normalizeNetworkingReminderNotification = (row) => {
  const metadata = normalizeMetadata(row?.metadata);

  return {
    id: row?.id,
    userId: row?.user_id || row?.userId,
    isRead: Boolean(row?.is_read ?? row?.isRead),
    title: row?.title || 'Connection follow-up reminder',
    message: row?.message || '',
    actionUrl: row?.action_url || row?.actionUrl || '/networking',
    metadata,
    createdAt: row?.created_at || row?.createdAt,
  };
};

export const getNetworkingReminderDeliveryDecision = (notification, nowIso) => {
  if (!notification.id || !notification.userId) {
    return { deliver: false, reason: 'missing_identity' };
  }

  if (notification.isRead) {
    return { deliver: false, reason: 'already_read' };
  }

  if (notification.metadata?.kind !== networkingReminderKind) {
    return { deliver: false, reason: 'not_networking_reminder' };
  }

  if (typeof notification.metadata?.reminderDeliveredAt === 'string' && notification.metadata.reminderDeliveredAt.trim()) {
    return { deliver: false, reason: 'already_delivered' };
  }

  const dueAt = toValidDate(notification.metadata?.remindAt);
  if (!dueAt) {
    return { deliver: false, reason: 'invalid_remind_at' };
  }

  const now = toValidDate(nowIso);
  if (!now) {
    throw new Error(`Invalid scheduler time: ${nowIso}`);
  }

  if (dueAt.getTime() > now.getTime()) {
    return { deliver: false, reason: 'not_due' };
  }

  return { deliver: true, reason: 'deliverable' };
};

export const buildNetworkingReminderDeliveryPatch = (notification, nowIso) => {
  const metadata = normalizeMetadata(notification.metadata);
  const recipientLabel = getRecipientLabel(metadata);

  return {
    title: 'Connection follow-up due',
    message: `Follow up with ${recipientLabel} about your pending connection request.`,
    action_url: notification.actionUrl || '/networking',
    metadata: {
      ...metadata,
      reminderDeliveredAt: nowIso,
      reminderDeliverySource: 'scheduler',
    },
    created_at: nowIso,
  };
};

export const buildNetworkingReminderDeliveryPlan = (rows, nowIso) => {
  const deliverable = [];
  const skipped = [];

  for (const row of rows) {
    const notification = normalizeNetworkingReminderNotification(row);
    const decision = getNetworkingReminderDeliveryDecision(notification, nowIso);

    if (decision.deliver) {
      deliverable.push(notification);
    } else {
      skipped.push({ notification, reason: decision.reason });
    }
  }

  return {
    deliverable,
    skipped,
  };
};

const fetchPendingNetworkingReminders = async (client, { maxItems }) => {
  const { data, error } = await client
    .from('notifications')
    .select('id,user_id,title,message,is_read,action_url,metadata,created_at')
    .eq('is_read', false)
    .contains('metadata', { kind: networkingReminderKind })
    .order('created_at', { ascending: true })
    .limit(maxItems);

  if (error) throw new Error(`Failed to load networking reminders: ${error.message}`);
  return data || [];
};

const promoteNetworkingReminder = async (client, notification, nowIso) => {
  const patch = buildNetworkingReminderDeliveryPatch(notification, nowIso);
  const { error } = await client
    .from('notifications')
    .update(patch)
    .eq('id', notification.id)
    .eq('user_id', notification.userId);

  if (error) throw new Error(`Failed to promote networking reminder ${notification.id}: ${error.message}`);
};

const countSkipped = (skipped, reason) => skipped.filter((entry) => entry.reason === reason).length;

const runNetworkingReminderDeliveryCore = async (client, options = {}) => {
  const nowIso = options.nowIso || new Date().toISOString();
  const maxItems = toInteger(options.maxItems, 200);
  const dryRun = options.dryRun !== false;
  const rows = await fetchPendingNetworkingReminders(client, { maxItems });
  const plan = buildNetworkingReminderDeliveryPlan(rows, nowIso);

  if (!dryRun) {
    for (const notification of plan.deliverable) {
      await promoteNetworkingReminder(client, notification, nowIso);
    }
  }

  return {
    dryRun,
    scannedReminders: rows.length,
    dueReminders: plan.deliverable.length,
    remindersPromoted: dryRun ? 0 : plan.deliverable.length,
    futureReminders: countSkipped(plan.skipped, 'not_due'),
    alreadyDeliveredReminders: countSkipped(plan.skipped, 'already_delivered'),
    invalidReminders: plan.skipped.filter((entry) => (
      entry.reason !== 'not_due' &&
      entry.reason !== 'already_delivered'
    )).length,
  };
};

export const runNetworkingReminderDelivery = async (client, options = {}) => {
  const dryRun = options.dryRun !== false;

  return runWithSchedulerAudit(client, {
    jobName: 'networking_reminder_delivery',
    dryRun,
    audit: options.audit,
    auditDryRun: options.auditDryRun,
    runId: options.runId,
    startedAt: options.startedAt || options.nowIso,
  }, () => runNetworkingReminderDeliveryCore(client, options));
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
      'Usage: node scripts/run-networking-reminders.mjs [--commit] [--max-items=200]',
      '',
      'Runs in dry-run mode by default. Pass --commit from a scheduler/worker to promote due networking follow-up reminders.',
    ].join('\n'));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run networking reminders.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const result = await runNetworkingReminderDelivery(client, {
    dryRun: !args.includes('--commit'),
    maxItems: getArgValue(args, '--max-items') || process.env.NETWORKING_REMINDER_MAX_ITEMS,
  });

  console.log(JSON.stringify(result, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
