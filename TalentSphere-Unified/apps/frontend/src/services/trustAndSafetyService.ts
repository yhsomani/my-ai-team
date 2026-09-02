import { typedSupabase as supabase, isSupabaseConfigured, type Database } from '../lib/supabaseClient';

export type ReportTargetType = 'job_posting' | 'user_profile' | 'company' | 'message';

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'inappropriate_content'
  | 'misleading'
  | 'other';

export type ModerationStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type ModerationAction = 'under_review' | 'resolve' | 'dismiss';

export interface ModerationReport {
  id: string;
  reporter_id?: string;
  target_type: ReportTargetType;
  target_id: string;
  target_title?: string;
  reason: ReportReason;
  details?: string;
  status: ModerationStatus;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitReportInput {
  reporter_id?: string;
  target_type: ReportTargetType;
  target_id: string;
  target_title?: string;
  reason: ReportReason;
  details?: string;
}

export interface GetModerationReportsParams {
  status?: ModerationStatus | 'all';
  target_type?: ReportTargetType | 'all';
  limit?: number;
  offset?: number;
}

export interface PaginatedModerationReportsResult {
  reports: ModerationReport[];
  total: number;
  pendingCount: number;
  underReviewCount: number;
  resolvedCount: number;
  dismissedCount: number;
}

export interface ModerationStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
}

export const REPORT_SUBMITTED_EVENT = 'talentsphere:report-submitted';
export const REPORT_RESOLVED_EVENT = 'talentsphere:report-resolved';

const STORAGE_KEY = 'talentsphere:moderation_reports:local';

const initialFallbackReports: ModerationReport[] = [
  {
    id: 'rep-fallback-1',
    reporter_id: 'user-reporter-1',
    target_type: 'job_posting',
    target_id: 'job-flagged-101',
    target_title: 'Unverified Crypto Trader Position',
    reason: 'scam',
    details: 'Requests upfront payment for onboarding training materials.',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'rep-fallback-2',
    reporter_id: 'user-reporter-2',
    target_type: 'user_profile',
    target_id: 'usr-flagged-202',
    target_title: 'Suspicious Recruiter Bot',
    reason: 'spam',
    details: 'Sending automated bulk unsolicited promotional links in direct messages.',
    status: 'under_review',
    resolution_notes: 'Under review by security team.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const getStoredLocalReports = (): ModerationReport[] => {
  if (typeof window === 'undefined') return initialFallbackReports;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialFallbackReports));
      return initialFallbackReports;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialFallbackReports;
  } catch {
    return initialFallbackReports;
  }
};

const saveStoredLocalReports = (reports: ModerationReport[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('[TrustAndSafety] Failed to save local reports to localStorage:', err);
  }
};

export const trustAndSafetyService = {
  /**
   * Submits a new content moderation report.
   */
  submitContentReport: async (input: SubmitReportInput): Promise<ModerationReport> => {
    if (!input.target_id || !input.target_type || !input.reason) {
      throw new Error('Missing required report parameters.');
    }

    const newReport: ModerationReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      reporter_id: input.reporter_id,
      target_type: input.target_type,
      target_id: input.target_id,
      target_title: input.target_title || `${input.target_type} #${input.target_id}`,
      reason: input.reason,
      details: input.details?.trim() || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const current = getStoredLocalReports();
      const updated = [newReport, ...current];
      saveStoredLocalReports(updated);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_SUBMITTED_EVENT, { detail: { report: newReport } })
        );
      }
      return newReport;
    }

    try {
      // Attempt supabase insert if content_reports table exists
      const { data, error } = await (supabase as any)
        .from('content_reports')
        .insert({
          target_type: newReport.target_type,
          target_id: newReport.target_id,
          target_title: newReport.target_title,
          reporter_id: newReport.reporter_id,
          reason: newReport.reason,
          details: newReport.details,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const created = (data as ModerationReport) || newReport;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_SUBMITTED_EVENT, { detail: { report: created } })
        );
      }
      return created;
    } catch (err) {
      console.warn('[TrustAndSafety] Supabase insert failed; using resilient local storage.', err);
      const current = getStoredLocalReports();
      const updated = [newReport, ...current];
      saveStoredLocalReports(updated);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_SUBMITTED_EVENT, { detail: { report: newReport } })
        );
      }
      return newReport;
    }
  },

  /**
   * Retrieves paginated moderation reports with filter options.
   */
  getModerationReports: async (
    params: GetModerationReportsParams = {}
  ): Promise<PaginatedModerationReportsResult> => {
    const { status = 'all', target_type = 'all', limit = 20, offset = 0 } = params;

    const getFromLocal = (): PaginatedModerationReportsResult => {
      let local = getStoredLocalReports();

      const pendingCount = local.filter((r) => r.status === 'pending').length;
      const underReviewCount = local.filter((r) => r.status === 'under_review').length;
      const resolvedCount = local.filter((r) => r.status === 'resolved').length;
      const dismissedCount = local.filter((r) => r.status === 'dismissed').length;

      if (status !== 'all') {
        local = local.filter((r) => r.status === status);
      }
      if (target_type !== 'all') {
        local = local.filter((r) => r.target_type === target_type);
      }

      const paginated = local.slice(offset, offset + limit);

      return {
        reports: paginated,
        total: local.length,
        pendingCount,
        underReviewCount,
        resolvedCount,
        dismissedCount,
      };
    };

    if (!isSupabaseConfigured) {
      return getFromLocal();
    }

    try {
      let query = (supabase as any)
        .from('content_reports')
        .select('*', { count: 'exact' });

      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (target_type !== 'all') {
        query = query.eq('target_type', target_type);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      const allReports: ModerationReport[] = data || [];
      const total = count ?? allReports.length;

      const pendingCount = allReports.filter((r) => r.status === 'pending').length;
      const underReviewCount = allReports.filter((r) => r.status === 'under_review').length;
      const resolvedCount = allReports.filter((r) => r.status === 'resolved').length;
      const dismissedCount = allReports.filter((r) => r.status === 'dismissed').length;

      return {
        reports: allReports,
        total,
        pendingCount,
        underReviewCount,
        resolvedCount,
        dismissedCount,
      };
    } catch (err) {
      console.warn('[TrustAndSafety] Supabase query failed; fetching local moderation queue.', err);
      let local = getStoredLocalReports();

      const pendingCount = local.filter((r) => r.status === 'pending').length;
      const underReviewCount = local.filter((r) => r.status === 'under_review').length;
      const resolvedCount = local.filter((r) => r.status === 'resolved').length;
      const dismissedCount = local.filter((r) => r.status === 'dismissed').length;

      if (status !== 'all') {
        local = local.filter((r) => r.status === status);
      }
      if (target_type !== 'all') {
        local = local.filter((r) => r.target_type === target_type);
      }

      const paginated = local.slice(offset, offset + limit);

      return {
        reports: paginated,
        total: local.length,
        pendingCount,
        underReviewCount,
        resolvedCount,
        dismissedCount,
      };
    }
  },

  /**
   * Updates report moderation status (review, resolve, dismiss).
   */
  updateReportStatus: async (
    reportId: string,
    action: ModerationAction,
    notes?: string
  ): Promise<ModerationReport> => {
    let newStatus: ModerationStatus = 'under_review';
    if (action === 'resolve') newStatus = 'resolved';
    if (action === 'dismiss') newStatus = 'dismissed';

    const now = new Date().toISOString();

    const updateInLocal = (): ModerationReport => {
      const local = getStoredLocalReports();
      const index = local.findIndex((r) => r.id === reportId);
      if (index === -1) {
        throw new Error(`Report with id ${reportId} not found.`);
      }

      const updated: ModerationReport = {
        ...local[index],
        status: newStatus,
        resolution_notes: notes || local[index].resolution_notes,
        updated_at: now,
      };

      local[index] = updated;
      saveStoredLocalReports(local);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_RESOLVED_EVENT, { detail: { report: updated } })
        );
      }
      return updated;
    };

    if (!isSupabaseConfigured) {
      return updateInLocal();
    }

    try {
      const { data, error } = await (supabase as any)
        .from('content_reports')
        .update({
          status: newStatus,
          resolution_notes: notes || null,
          updated_at: now,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as ModerationReport;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_RESOLVED_EVENT, { detail: { report: updated } })
        );
      }
      return updated;
    } catch (err) {
      console.warn('[TrustAndSafety] Supabase status update failed; updating local record.', err);
      const local = getStoredLocalReports();
      const index = local.findIndex((r) => r.id === reportId);
      if (index === -1) {
        throw new Error(`Report with id ${reportId} not found.`);
      }

      const updated: ModerationReport = {
        ...local[index],
        status: newStatus,
        resolution_notes: notes || local[index].resolution_notes,
        updated_at: now,
      };

      local[index] = updated;
      saveStoredLocalReports(local);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(REPORT_RESOLVED_EVENT, { detail: { report: updated } })
        );
      }
      return updated;
    }
  },

  /**
   * Returns aggregated moderation stats.
   */
  getReportStats: async (): Promise<ModerationStats> => {
    const result = await trustAndSafetyService.getModerationReports({ limit: 1000 });
    return {
      total: result.total,
      pending: result.pendingCount,
      underReview: result.underReviewCount,
      resolved: result.resolvedCount,
      dismissed: result.dismissedCount,
    };
  },
};
