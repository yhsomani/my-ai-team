import { typedSupabase as supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { billingMode } from './paymentService';

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type EntitlementKey =
  // Candidate / General entitlements
  | 'unlimited_applications'
  | 'advanced_career_insights'
  | 'priority_applicant_badge'
  | 'resume_export_advanced'
  | 'challenge_solutions_view'
  | 'unlimited_ai_prompts'
  | 'learning_certifications'
  | 'direct_messaging_unlimited'
  // Recruiter entitlements
  | 'job_posting_unlimited'
  | 'candidate_insights'
  | 'bulk_candidate_actions'
  | 'candidate_profile_export'
  | 'custom_company_branding'
  | 'automated_candidate_matching'
  // Admin & Trust/Safety entitlements
  | 'admin_console_access'
  | 'content_moderation_triage'
  | 'scheduled_automation_ops';

export interface EntitlementQuota {
  applicationLimitMonthly: number | 'unlimited';
  aiPromptsDaily: number | 'unlimited';
  activeJobPostings: number | 'unlimited';
  savedSearchesMax: number | 'unlimited';
}

export interface EntitlementMetadata {
  source: 'live' | 'cached' | 'fallback';
  fetchedAt: string;
  billingMode: typeof billingMode;
  degraded?: boolean;
}

export interface EntitlementContext {
  userId: string;
  tier: SubscriptionTier;
  roles: string[];
  planName: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'FREE';
  expiresAt: string | null;
  entitlements: Record<EntitlementKey, boolean>;
  quotas: EntitlementQuota;
  meta: EntitlementMetadata;
}

export interface EntitlementCheckResult {
  granted: boolean;
  key: EntitlementKey;
  reason: string;
  requiredTier?: SubscriptionTier | 'role_admin';
  currentTier: SubscriptionTier;
  upgradePrompt?: string;
  billingMode: typeof billingMode;
}

export const TIER_ENTITLEMENTS: Record<SubscriptionTier, Record<EntitlementKey, boolean>> = {
  free: {
    unlimited_applications: false,
    advanced_career_insights: false,
    priority_applicant_badge: false,
    resume_export_advanced: false,
    challenge_solutions_view: false,
    unlimited_ai_prompts: false,
    learning_certifications: false,
    direct_messaging_unlimited: false,
    job_posting_unlimited: false,
    candidate_insights: false,
    bulk_candidate_actions: false,
    candidate_profile_export: false,
    custom_company_branding: false,
    automated_candidate_matching: false,
    admin_console_access: false,
    content_moderation_triage: false,
    scheduled_automation_ops: false,
  },
  pro: {
    unlimited_applications: true,
    advanced_career_insights: true,
    priority_applicant_badge: false,
    resume_export_advanced: true,
    challenge_solutions_view: true,
    unlimited_ai_prompts: true,
    learning_certifications: true,
    direct_messaging_unlimited: true,
    job_posting_unlimited: true,
    candidate_insights: true,
    bulk_candidate_actions: true,
    candidate_profile_export: true,
    custom_company_branding: false,
    automated_candidate_matching: true,
    admin_console_access: false,
    content_moderation_triage: false,
    scheduled_automation_ops: false,
  },
  premium: {
    unlimited_applications: true,
    advanced_career_insights: true,
    priority_applicant_badge: true,
    resume_export_advanced: true,
    challenge_solutions_view: true,
    unlimited_ai_prompts: true,
    learning_certifications: true,
    direct_messaging_unlimited: true,
    job_posting_unlimited: true,
    candidate_insights: true,
    bulk_candidate_actions: true,
    candidate_profile_export: true,
    custom_company_branding: true,
    automated_candidate_matching: true,
    admin_console_access: false,
    content_moderation_triage: false,
    scheduled_automation_ops: false,
  },
};

export const TIER_QUOTAS: Record<SubscriptionTier, EntitlementQuota> = {
  free: {
    applicationLimitMonthly: 10,
    aiPromptsDaily: 15,
    activeJobPostings: 2,
    savedSearchesMax: 5,
  },
  pro: {
    applicationLimitMonthly: 'unlimited',
    aiPromptsDaily: 'unlimited',
    activeJobPostings: 25,
    savedSearchesMax: 50,
  },
  premium: {
    applicationLimitMonthly: 'unlimited',
    aiPromptsDaily: 'unlimited',
    activeJobPostings: 'unlimited',
    savedSearchesMax: 'unlimited',
  },
};

export const ENTITLEMENT_TIER_REQUIREMENTS: Record<EntitlementKey, SubscriptionTier | 'role_admin'> = {
  unlimited_applications: 'pro',
  advanced_career_insights: 'pro',
  priority_applicant_badge: 'premium',
  resume_export_advanced: 'pro',
  challenge_solutions_view: 'pro',
  unlimited_ai_prompts: 'pro',
  learning_certifications: 'pro',
  direct_messaging_unlimited: 'pro',
  job_posting_unlimited: 'pro',
  candidate_insights: 'pro',
  bulk_candidate_actions: 'pro',
  candidate_profile_export: 'pro',
  custom_company_branding: 'premium',
  automated_candidate_matching: 'pro',
  admin_console_access: 'role_admin',
  content_moderation_triage: 'role_admin',
  scheduled_automation_ops: 'role_admin',
};

export const ENTITLEMENT_DESCRIPTIONS: Record<EntitlementKey, string> = {
  unlimited_applications: 'Submit unlimited job applications per month without monthly quota restrictions.',
  advanced_career_insights: 'Access AI-powered salary benchmarks, skill trajectory recommendations, and role fit analytics.',
  priority_applicant_badge: 'Stand out at the top of recruiter candidate searches with verified priority candidate status.',
  resume_export_advanced: 'Export multi-format, ATS-optimized PDF and DOCX resume variants.',
  challenge_solutions_view: 'Inspect verified community solutions and algorithmic breakdowns for completed coding challenges.',
  unlimited_ai_prompts: 'Unlimited daily interactions with TalentSphere AI career, resume, and interview assistants.',
  learning_certifications: 'Earn downloadable, shareable completion certificates for completed LMS learning paths.',
  direct_messaging_unlimited: 'Send unlimited direct outreach messages to recruiters and talent peers.',
  job_posting_unlimited: 'Post and manage unlimited concurrent active job requisitions.',
  candidate_insights: 'Unlock deep candidate behavioral and skill ranking metrics on job applications.',
  bulk_candidate_actions: 'Advance, reject, or message multiple candidate applicants simultaneously in one click.',
  candidate_profile_export: 'Export structured candidate dossiers and pipeline spreadsheets.',
  custom_company_branding: 'Showcase custom brand imagery, highlight videos, and custom application themes on job posts.',
  automated_candidate_matching: 'AI-assisted automated match scoring that pre-ranks arriving candidates against role requirements.',
  admin_console_access: 'Access operational service status, telemetry metrics, and platform administration tools.',
  content_moderation_triage: 'Review, action, and resolve flagged user, job, company, and message reports.',
  scheduled_automation_ops: 'Audit and trigger background digest jobs, candidate matching schedulers, and cron pipelines.',
};

// In-memory cache for user entitlements (5-minute TTL)
interface CacheEntry {
  context: EntitlementContext;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const entitlementCache = new Map<string, CacheEntry>();

export const normalizeTier = (planName?: string | null): SubscriptionTier => {
  if (!planName) return 'free';
  const lower = planName.toLowerCase().trim();
  if (lower.includes('premium') || lower.includes('enterprise')) return 'premium';
  if (lower.includes('pro') || lower.includes('growth') || lower.includes('plus')) return 'pro';
  return 'free';
};

export const computeEntitlements = (
  tier: SubscriptionTier,
  roles: string[] = []
): Record<EntitlementKey, boolean> => {
  const base = { ...TIER_ENTITLEMENTS[tier] };
  const isAdmin = roles.some((r) => r === 'ROLE_ADMIN' || r === 'admin');

  if (isAdmin) {
    base.admin_console_access = true;
    base.content_moderation_triage = true;
    base.scheduled_automation_ops = true;
  }

  return base;
};

export const createFallbackContext = (
  userId: string,
  roles: string[] = [],
  reason = 'Fallback defaults applied'
): EntitlementContext => {
  const isAdmin = roles.some((r) => r === 'ROLE_ADMIN' || r === 'admin');
  const tier: SubscriptionTier = 'free';

  return {
    userId,
    tier,
    roles,
    planName: 'Free',
    status: 'FREE',
    expiresAt: null,
    entitlements: computeEntitlements(tier, roles),
    quotas: TIER_QUOTAS[tier],
    meta: {
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      billingMode,
      degraded: true,
    },
  };
};

const getCacheKey = (userId: string, roles: string[] = []): string => {
  const roleKey = [...roles].sort().join(',');
  return `${userId}:${roleKey}`;
};

export const entitlementService = {
  /**
   * Clears the in-memory entitlement cache for a specific user or entirely.
   */
  invalidateCache: (userId?: string): void => {
    if (userId) {
      for (const key of entitlementCache.keys()) {
        if (key === userId || key.startsWith(`${userId}:`)) {
          entitlementCache.delete(key);
        }
      }
    } else {
      entitlementCache.clear();
    }
  },

  /**
   * Synchronously checks an entitlement from an already loaded EntitlementContext.
   */
  isEntitlementGrantedSync: (context: EntitlementContext, key: EntitlementKey): boolean => {
    return Boolean(context.entitlements[key]);
  },

  /**
   * Retrieves the full entitlement context for a user, decoupling raw subscription rows
   * and providing resilient cached/fallback states in accordance with ADR-005 demo billing.
   */
  getUserEntitlements: async (
    userId: string,
    roles: string[] = [],
    options?: { forceRefresh?: boolean }
  ): Promise<EntitlementContext> => {
    if (!userId) {
      return createFallbackContext('anonymous', roles, 'Anonymous user context');
    }

    const now = Date.now();
    const cacheKey = getCacheKey(userId, roles);
    const cached = entitlementCache.get(cacheKey);

    if (!options?.forceRefresh && cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return {
        ...cached.context,
        meta: {
          ...cached.context.meta,
          source: 'cached',
        },
      };
    }

    if (!isSupabaseConfigured) {
      const fallback = createFallbackContext(userId, roles, 'Supabase not configured');
      entitlementCache.set(cacheKey, { context: fallback, cachedAt: now });
      return fallback;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          status,
          current_period_end,
          cancel_at_period_end,
          subscription_plans:plan_id (
            name,
            price,
            currency,
            interval,
            features
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error) {
        console.warn('[entitlementService] Failed to load subscription row:', error.message);
        const fallback = createFallbackContext(userId, roles, error.message);
        entitlementCache.set(cacheKey, { context: fallback, cachedAt: now });
        return fallback;
      }

      const planData = data?.subscription_plans as any;
      const planName: string = planData?.name || 'Free';
      const tier = normalizeTier(planName);
      const entitlements = computeEntitlements(tier, roles);
      const quotas = TIER_QUOTAS[tier];

      const context: EntitlementContext = {
        userId,
        tier,
        roles,
        planName,
        status: data ? 'ACTIVE' : 'FREE',
        expiresAt: data?.current_period_end || null,
        entitlements,
        quotas,
        meta: {
          source: 'live',
          fetchedAt: new Date().toISOString(),
          billingMode,
          degraded: false,
        },
      };

      entitlementCache.set(cacheKey, { context, cachedAt: now });
      return context;
    } catch (err) {
      console.error('[entitlementService] Unexpected error querying entitlements:', err);
      const fallback = createFallbackContext(userId, roles, 'Unexpected error fetching entitlements');
      entitlementCache.set(cacheKey, { context: fallback, cachedAt: now });
      return fallback;
    }
  },

  /**
   * Checks whether a user has a specific functional entitlement granted.
   */
  hasEntitlement: async (
    userId: string,
    key: EntitlementKey,
    roles: string[] = []
  ): Promise<boolean> => {
    const context = await entitlementService.getUserEntitlements(userId, roles);
    return Boolean(context.entitlements[key]);
  },

  /**
   * Returns a detailed entitlement check result with upgrade guidance and demo billing status.
   */
  checkEntitlement: async (
    userId: string,
    key: EntitlementKey,
    roles: string[] = []
  ): Promise<EntitlementCheckResult> => {
    const context = await entitlementService.getUserEntitlements(userId, roles);
    const granted = Boolean(context.entitlements[key]);
    const requiredRequirement = ENTITLEMENT_TIER_REQUIREMENTS[key];

    if (granted) {
      return {
        granted: true,
        key,
        reason: `Entitlement granted under ${context.planName} tier / user role permissions.`,
        currentTier: context.tier,
        requiredTier: requiredRequirement,
        billingMode,
      };
    }

    const upgradeLabel =
      requiredRequirement === 'role_admin'
        ? 'Administrator role'
        : `${requiredRequirement.charAt(0).toUpperCase() + requiredRequirement.slice(1)} plan`;

    return {
      granted: false,
      key,
      reason: `Feature requires ${upgradeLabel}. Current tier is ${context.planName}.`,
      currentTier: context.tier,
      requiredTier: requiredRequirement,
      upgradePrompt: `Upgrade to ${upgradeLabel} to unlock ${ENTITLEMENT_DESCRIPTIONS[key]} (Demo Billing Mode).`,
      billingMode,
    };
  },

  /**
   * Returns default capabilities mapped for a subscription tier.
   */
  getTierEntitlements: (tier: SubscriptionTier, roles: string[] = []): Record<EntitlementKey, boolean> => {
    return computeEntitlements(tier, roles);
  },

  /**
   * Returns default quotas for a subscription tier.
   */
  getTierQuotas: (tier: SubscriptionTier): EntitlementQuota => {
    return TIER_QUOTAS[tier];
  },

  /**
   * Returns the current ADR-005 demo billing mode configuration.
   */
  getBillingMode: (): typeof billingMode => {
    return billingMode;
  },
};
