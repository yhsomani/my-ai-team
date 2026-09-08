import React, { useState, useEffect, useCallback } from 'react';
import Card from '../shared/GlassCard';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/AuraButton';
import { Skeleton } from '../shared/Skeleton';
import { EmptyState } from '../shared/EmptyState';
import { Download, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { adminService, triggerCsvDownload, type RetentionPolicy } from '../../services/adminService';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

interface DataCompliancePanelProps {
  onRecordAdminAction?: (action: string, extra?: Record<string, unknown>) => void;
}

const defaultPolicyNote = 'Audit log records are retained for the configured TTL period. On-demand CSV export is available to data controllers to satisfy GDPR/CCPA subject-access and data-retention-disposition workflows.';

const getAnalyticsErrorCategory = (error: unknown) => {
  if (!error) return 'unknown_error';
  if (error instanceof TypeError) return 'network_error';
  return 'request_error';
};

export const DataCompliancePanel: React.FC<DataCompliancePanelProps> = ({ onRecordAdminAction }) => {
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Retention policy draft state
  const [ttlDraft, setTtlDraft] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingRetention, setSavingRetention] = useState(false);

  // CSV export state
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const loadPolicy = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const result = await adminService.getRetentionPolicy();
      setPolicy(result);
      setTtlDraft(String(result.auditLogRetentionTtlDays));
      setNoteDraft(result.policyNote);
      if (!isSilent) setFeedback(null);
    } catch (err) {
      console.error('[DataCompliance] Failed to load retention policy:', err);
      setError('Retention policy could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const handleSaveRetention = async () => {
    const parsedTtl = Number(ttlDraft);
    if (!Number.isFinite(parsedTtl) || parsedTtl < 1 || Math.floor(parsedTtl) !== parsedTtl) {
      setFeedback({ kind: 'error', message: 'Retention TTL must be a positive whole number of days.' });
      return;
    }
    if (!noteDraft.trim()) {
      setFeedback({ kind: 'error', message: 'Retention policy note cannot be empty.' });
      return;
    }
    if (
      policy
      && parsedTtl === policy.auditLogRetentionTtlDays
      && noteDraft.trim() === policy.policyNote
    ) {
      setFeedback({ kind: 'error', message: 'No changes to save.' });
      return;
    }

    setSavingRetention(true);
    setFeedback(null);
    try {
      await adminService.saveRetentionPolicy(parsedTtl, noteDraft.trim());
      onRecordAdminAction?.('admin_retention_policy_updated', {
        settingKey: 'data_retention',
        settingAction: 'update',
        retentionTtlDays: parsedTtl,
      });
      setFeedback({ kind: 'success', message: `Retention policy updated — audit logs retained for ${parsedTtl} days.` });
      await loadPolicy(true);
    } catch (err) {
      console.error('[DataCompliance] Failed to save retention policy:', err);
      onRecordAdminAction?.('admin_retention_policy_update_failed', {
        settingKey: 'data_retention',
        settingAction: 'update',
        errorCategory: getAnalyticsErrorCategory(err),
      });
      setFeedback({ kind: 'error', message: 'Could not save retention policy. Please retry.' });
    } finally {
      setSavingRetention(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    setExportFeedback(null);
    onRecordAdminAction?.('admin_audit_csv_export_started');

    try {
      const result = await adminService.exportAuditLogCsv();
      triggerCsvDownload(result.csv, result.filename);
      onRecordAdminAction?.('admin_audit_csv_export_completed', {
        visibleItemCount: result.rowCount,
      });
      setExportFeedback({
        kind: 'success',
        message: result.rowCount === 0
          ? 'No audit log rows to export.'
          : `Exported ${result.rowCount} audit log row${result.rowCount === 1 ? '' : 's'} as CSV.`,
      });
    } catch (err) {
      console.error('[DataCompliance] Failed to export audit CSV:', err);
      onRecordAdminAction?.('admin_audit_csv_export_failed', {
        errorCategory: getAnalyticsErrorCategory(err),
      });
      setExportFeedback({ kind: 'error', message: 'Could not export audit log. Please retry.' });
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Card role="region" aria-label="Data Export & Retention">
      <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Data Export & Retention</h3>
          <p className="text-xs text-[var(--text-muted)]">
            GDPR/CCPA retention policy and on-demand audit log CSV export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {feedback && (
            <span
              className={`text-xs ${feedback.kind === 'success' ? 'text-success' : 'text-destructive'}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </span>
          )}
          {exportFeedback && (
            <span
              className={`text-xs ${exportFeedback.kind === 'success' ? 'text-success' : 'text-destructive'}`}
              role="status"
              aria-live="polite"
            >
              {exportFeedback.message}
            </span>
          )}
          {error && <Badge variant="warning">Needs retry</Badge>}
          <Button variant="outline" size="sm" onClick={() => void loadPolicy()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadPolicy()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Retry
          </Button>
        </div>
      ) : !policy ? (
        <div className="p-6">
          <EmptyState
            icon={<ShieldCheck {...decorativeIconProps} className="h-12 w-12 text-[var(--text-muted)]" />}
            title="No retention policy configured"
            description="Set a retention TTL and policy note to begin compliance management."
          />
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {/* Retention Policy Section */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Retention Policy</h4>
            <div className="rounded-lg border border-[var(--border-default)] p-4 space-y-4">
              <div>
                <label
                  htmlFor="retention-ttl-input"
                  className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Audit Log Retention TTL (days)
                </label>
                <input
                  id="retention-ttl-input"
                  aria-label="Audit log retention TTL in days"
                  data-ui="input"
                  type="number"
                  min={1}
                  value={ttlDraft}
                  onChange={(event) => setTtlDraft(event.target.value)}
                  className="w-full max-w-xs h-9 rounded-lg border border-[var(--border-default)] bg-transparent px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Audit log rows older than this TTL may be purged during scheduled retention jobs.
                </p>
              </div>

              <div>
                <label
                  htmlFor="retention-note-textarea"
                  className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Policy Note (visible to admins; describes the platform's retention posture)
                </label>
                <textarea
                  id="retention-note-textarea"
                  aria-label="Retention policy note"
                  data-ui="textarea"
                  rows={3}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder={defaultPolicyNote}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSaveRetention()}
                  isLoading={savingRetention}
                >
                  <Save {...decorativeIconProps} size={14} />
                  Save Policy
                </Button>
                {policy.updatedAt && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Last updated {new Date(policy.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Audit Log CSV Export Section */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Audit Log CSV Export</h4>
            <div className="rounded-lg border border-[var(--border-default)] p-4 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Export all audit log records as a CSV file. The export includes safe, curated columns
                (id, timestamp, action, entity, actor, IP) suitable for compliance review and
                GDPR/CCPA subject-access requests. Raw value payloads are excluded to prevent PII leakage.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExportCsv()}
                isLoading={exportingCsv}
              >
                <Download {...decorativeIconProps} size={14} />
                Export Audit Log CSV
              </Button>
            </div>
          </section>

          {/* Data Subject Access Description */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Data Subject Access (GDPR/CCPA)</h4>
            <div className="rounded-lg border border-[var(--border-default)] p-4 text-xs text-[var(--text-muted)] space-y-2">
              <p>{policy.policyNote}</p>
              <p>
                Admins may use the CSV export above to produce a machine-readable record of audit events
                for a given subject. Retention TTL is enforced at the configured interval
                ({policy.auditLogRetentionTtlDays} days). Update the retention policy above to adjust
                the compliance posture.
              </p>
            </div>
          </section>
        </div>
      )}
    </Card>
  );
};