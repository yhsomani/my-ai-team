import React, { useState, useEffect, useCallback } from 'react';
import Card from '../shared/GlassCard';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/AuraButton';
import { Skeleton } from '../shared/Skeleton';
import { EmptyState } from '../shared/EmptyState';
import { AuraModal } from '../shared/AuraModal';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Check,
  Ban,
  Eye,
  FileText,
} from 'lucide-react';
import {
  trustAndSafetyService,
  REPORT_SUBMITTED_EVENT,
  REPORT_RESOLVED_EVENT,
  type ModerationReport,
  type ModerationStatus,
  type ReportTargetType,
  type ReportReason,
  type ModerationAction,
} from '../../services/trustAndSafetyService';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const REASON_LABELS: Record<ReportReason, string> = {
  scam: 'Scam / Fraud',
  spam: 'Spam',
  misleading: 'Misleading',
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate',
  other: 'Other Policy',
};

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  job_posting: 'Job Posting',
  user_profile: 'User Profile',
  company: 'Company',
  message: 'Message',
};

interface ResolutionModalState {
  isOpen: boolean;
  report: ModerationReport | null;
  action: ModerationAction;
  notes: string;
  isSubmitting: boolean;
}

export const TrustAndSafetyModerationQueue: React.FC = () => {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'all'>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<ReportTargetType | 'all'>('all');

  const [pendingCount, setPendingCount] = useState(0);
  const [underReviewCount, setUnderReviewCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [resolutionModal, setResolutionModal] = useState<ResolutionModalState>({
    isOpen: false,
    report: null,
    action: 'resolve',
    notes: '',
    isSubmitting: false,
  });

  const loadReports = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const result = await trustAndSafetyService.getModerationReports({
        status: statusFilter,
        target_type: targetTypeFilter,
        limit: 50,
      });

      setReports(result.reports);
      setTotalCount(result.total);
      setPendingCount(result.pendingCount);
      setUnderReviewCount(result.underReviewCount);
      setResolvedCount(result.resolvedCount);
      setDismissedCount(result.dismissedCount);
    } catch (err: any) {
      console.error('[TrustAndSafety] Failed to load moderation reports:', err);
      setError('Unable to load moderation queue. Please retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, targetTypeFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Event listener for live updates
  useEffect(() => {
    const handleReportEvent = () => {
      loadReports(true);
    };

    window.addEventListener(REPORT_SUBMITTED_EVENT, handleReportEvent);
    window.addEventListener(REPORT_RESOLVED_EVENT, handleReportEvent);

    return () => {
      window.removeEventListener(REPORT_SUBMITTED_EVENT, handleReportEvent);
      window.removeEventListener(REPORT_RESOLVED_EVENT, handleReportEvent);
    };
  }, [loadReports]);

  const handleQuickAction = async (report: ModerationReport, action: ModerationAction) => {
    if (action === 'under_review') {
      try {
        await trustAndSafetyService.updateReportStatus(report.id, 'under_review');
        await loadReports(true);
      } catch (err: any) {
        console.error('[TrustAndSafety] Failed to mark under review:', err);
        setError('Failed to update report status.');
      }
    } else {
      setResolutionModal({
        isOpen: true,
        report,
        action,
        notes: '',
        isSubmitting: false,
      });
    }
  };

  const handleConfirmResolution = async () => {
    if (!resolutionModal.report) return;

    setResolutionModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await trustAndSafetyService.updateReportStatus(
        resolutionModal.report.id,
        resolutionModal.action,
        resolutionModal.notes.trim() || undefined
      );

      setResolutionModal({
        isOpen: false,
        report: null,
        action: 'resolve',
        notes: '',
        isSubmitting: false,
      });

      await loadReports(true);
    } catch (err: any) {
      console.error('[TrustAndSafety] Failed to complete moderation action:', err);
      setError('Failed to complete moderation action. Please try again.');
      setResolutionModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getReasonBadgeVariant = (reason: ReportReason): 'destructive' | 'warning' | 'default' | 'outline' => {
    switch (reason) {
      case 'scam':
        return 'destructive';
      case 'harassment':
      case 'inappropriate_content':
        return 'destructive';
      case 'misleading':
      case 'spam':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: ModerationStatus): 'warning' | 'default' | 'success' | 'outline' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'default';
      case 'resolved':
        return 'success';
      case 'dismissed':
        return 'outline';
    }
  };

  const getStatusLabel = (status: ModerationStatus): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'resolved':
        return 'Resolved';
      case 'dismissed':
        return 'Dismissed';
    }
  };

  return (
    <Card role="region" aria-label="Trust & Safety Moderation Queue">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <ShieldAlert {...decorativeIconProps} size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Trust &amp; Safety Moderation Queue</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Review, triage, and resolve user-submitted content flags and security reports.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="warning">
              {pendingCount} Pending
            </Badge>
          )}
          {underReviewCount > 0 && (
            <Badge variant="default">
              {underReviewCount} Under Review
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReports()}
            isLoading={refreshing}
            aria-label="Refresh Moderation Queue"
          >
            <RefreshCw {...decorativeIconProps} size={14} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/30" role="list" aria-label="Moderation queue summary">
        <div role="listitem" aria-label={`Pending Reports: ${pendingCount}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Pending</span>
            <AlertTriangle {...decorativeIconProps} size={14} className="text-amber-500" />
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{pendingCount}</p>
        </div>
        <div role="listitem" aria-label={`Under Review: ${underReviewCount}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Under Review</span>
            <Clock {...decorativeIconProps} size={14} className="text-blue-500" />
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{underReviewCount}</p>
        </div>
        <div role="listitem" aria-label={`Resolved Reports: ${resolvedCount}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Resolved</span>
            <CheckCircle2 {...decorativeIconProps} size={14} className="text-emerald-500" />
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{resolvedCount}</p>
        </div>
        <div role="listitem" aria-label={`Dismissed Reports: ${dismissedCount}`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Dismissed</span>
            <XCircle {...decorativeIconProps} size={14} className="text-[var(--text-muted)]" />
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{dismissedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 border-b border-[var(--border-default)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter reports by status">
          {(
            [
              { id: 'all', label: 'All', count: totalCount },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'under_review', label: 'Under Review', count: underReviewCount },
              { id: 'resolved', label: 'Resolved', count: resolvedCount },
              { id: 'dismissed', label: 'Dismissed', count: dismissedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--border-default)] text-[var(--text-muted)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Target Type Selector */}
        <div className="flex items-center gap-2">
          <Filter {...decorativeIconProps} size={13} className="text-[var(--text-muted)]" />
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value as ReportTargetType | 'all')}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-accent focus:outline-none"
            aria-label="Filter by target type"
          >
            <option value="all">All Content Types</option>
            <option value="job_posting">Job Postings</option>
            <option value="user_profile">User Profiles</option>
            <option value="company">Company Profiles</option>
            <option value="message">Direct Messages</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle {...decorativeIconProps} size={16} />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadReports()}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Retry
          </Button>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ShieldAlert {...decorativeIconProps} className="h-12 w-12 text-success" />}
            title="Queue is clear"
            description="No content moderation reports matching the selected filters."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="Content moderation reports">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-5 py-3 font-medium">Target Content</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Details / Evidence</th>
                <th className="px-5 py-3 font-medium">Reported</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                  aria-label={`Report ${report.id}: ${report.target_title || report.target_id} (${report.reason}) - ${report.status}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="min-w-0 max-w-xs">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {report.target_title || report.target_id}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <span className="rounded bg-[var(--bg-secondary)] px-1 py-0.5 font-medium">
                          {TARGET_TYPE_LABELS[report.target_type] || report.target_type}
                        </span>
                        <span className="truncate">ID: {report.target_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Badge variant={getReasonBadgeVariant(report.reason)}>
                      {REASON_LABELS[report.reason] || report.reason}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="max-w-xs text-xs text-[var(--text-secondary)]">
                      {report.details ? (
                        <p className="line-clamp-2">{report.details}</p>
                      ) : (
                        <span className="italic text-[var(--text-muted)]">No details provided</span>
                      )}
                      {report.resolution_notes && (
                        <div className="mt-1 flex items-start gap-1 rounded bg-[var(--bg-secondary)] p-1 text-[10px] text-accent">
                          <FileText {...decorativeIconProps} size={11} className="mt-0.5 shrink-0" />
                          <span className="truncate">Note: {report.resolution_notes}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                    {formatTimestamp(report.created_at)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(report.status)}>
                      {getStatusLabel(report.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {report.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          onClick={() => handleQuickAction(report, 'under_review')}
                          aria-label={`Review ${report.id}`}
                        >
                          <Eye {...decorativeIconProps} size={12} />
                          Review
                        </Button>
                      )}

                      {(report.status === 'pending' || report.status === 'under_review') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => handleQuickAction(report, 'resolve')}
                            aria-label={`Resolve ${report.id}`}
                          >
                            <Check {...decorativeIconProps} size={12} />
                            Resolve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleQuickAction(report, 'dismiss')}
                            aria-label={`Dismiss ${report.id}`}
                          >
                            <Ban {...decorativeIconProps} size={12} />
                            Dismiss
                          </Button>
                        </>
                      )}

                      {(report.status === 'resolved' || report.status === 'dismissed') && (
                        <span className="text-[11px] italic text-[var(--text-muted)]">
                          Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolution Notes Modal */}
      <AuraModal
        isOpen={resolutionModal.isOpen}
        onClose={() =>
          setResolutionModal({
            isOpen: false,
            report: null,
            action: 'resolve',
            notes: '',
            isSubmitting: false,
          })
        }
        title={
          resolutionModal.action === 'resolve'
            ? 'Resolve Moderation Report'
            : 'Dismiss Moderation Report'
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs">
            <p className="font-semibold text-[var(--text-primary)]">
              {resolutionModal.report?.target_title || resolutionModal.report?.target_id}
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">
              Reason: {resolutionModal.report ? REASON_LABELS[resolutionModal.report.reason] : ''} · Target: {resolutionModal.report?.target_type}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="resolution-notes"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              {resolutionModal.action === 'resolve'
                ? 'Resolution Notes / Actions Taken'
                : 'Dismissal Reason / Notes'}
            </label>
            <textarea
              id="resolution-notes"
              rows={3}
              value={resolutionModal.notes}
              onChange={(e) =>
                setResolutionModal((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={
                resolutionModal.action === 'resolve'
                  ? 'e.g., Content removed, user warned or account suspended for scam violation.'
                  : 'e.g., Verified company authenticity. No policy violation identified.'
              }
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setResolutionModal({
                  isOpen: false,
                  report: null,
                  action: 'resolve',
                  notes: '',
                  isSubmitting: false,
                })
              }
              disabled={resolutionModal.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={resolutionModal.action === 'resolve' ? 'default' : 'outline'}
              size="sm"
              onClick={handleConfirmResolution}
              disabled={resolutionModal.isSubmitting}
              isLoading={resolutionModal.isSubmitting}
            >
              {resolutionModal.action === 'resolve' ? 'Confirm Resolution' : 'Confirm Dismissal'}
            </Button>
          </div>
        </div>
      </AuraModal>
    </Card>
  );
};
