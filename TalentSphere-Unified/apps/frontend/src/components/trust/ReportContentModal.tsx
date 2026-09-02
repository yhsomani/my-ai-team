import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Flag,
  Info,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { AuraModal } from '../shared/AuraModal';
import { AuraButton } from '../shared/AuraButton';
import {
  trustAndSafetyService,
  type ModerationReport,
  type ReportReason,
  type ReportTargetType,
} from '../../services/trustAndSafetyService';

export interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  reporterId?: string;
  onReportSubmitted?: (report: ModerationReport) => void;
}

interface ReasonOption {
  value: ReportReason;
  label: string;
  description: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: 'scam',
    label: 'Scam or Fraud',
    description: 'Requests payment, cryptocurrency, or phishing for sensitive credentials.',
  },
  {
    value: 'spam',
    label: 'Spam or Promotional',
    description: 'Unsolicited advertising, automated bot messages, or repetitive junk.',
  },
  {
    value: 'misleading',
    label: 'Misleading or Inaccurate',
    description: 'Inaccurate company information, fake compensation, or misleading requirements.',
  },
  {
    value: 'harassment',
    label: 'Harassment or Abuse',
    description: 'Bullying, discriminatory behavior, or inappropriate conduct.',
  },
  {
    value: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Explicit, illegal, or policy-violating content.',
  },
  {
    value: 'other',
    label: 'Other Policy Violation',
    description: 'Any other issue that breaches platform trust and safety guidelines.',
  },
];

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  job_posting: 'Job Posting',
  user_profile: 'User Profile',
  company: 'Company Profile',
  message: 'Direct Message',
};

export const ReportContentModal: React.FC<ReportContentModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  reporterId,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('scam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setSelectedReason('scam');
    setDetails('');
    setError(null);
    setIsSuccess(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !targetType || !selectedReason) {
      setError('Please select a valid reason for this report.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await trustAndSafetyService.submitContentReport({
        target_id: targetId,
        target_type: targetType,
        target_title: targetTitle,
        reporter_id: reporterId,
        reason: selectedReason,
        details: details.trim(),
      });

      setIsSuccess(true);
      if (onReportSubmitted) {
        onReportSubmitted(created);
      }
    } catch (err: any) {
      console.error('[TrustAndSafety] Failed to submit report:', err);
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTargetType = TARGET_TYPE_LABELS[targetType] || targetType;

  return (
    <AuraModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Report ${formattedTargetType}`}
      size="md"
    >
      {isSuccess ? (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle size={28} aria-hidden="true" focusable="false" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Report Submitted Successfully
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Thank you for protecting our community. Our Trust & Safety team will investigate this {formattedTargetType.toLowerCase()} promptly.
            </p>
          </div>
          <div className="pt-2">
            <AuraButton variant="default" onClick={handleClose} className="w-full">
              Done
            </AuraButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Metadata Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" focusable="false" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">
                  {formattedTargetType}
                </span>
                <span className="truncate text-[var(--text-muted)]">ID: {targetId}</span>
              </div>
              {targetTitle && (
                <p className="mt-1 truncate font-medium text-[var(--text-primary)]">
                  {targetTitle}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle size={16} className="shrink-0" aria-hidden="true" focusable="false" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Select Reason <span className="text-destructive">*</span>
            </label>
            <div className="grid gap-2">
              {REASON_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                    selectedReason === opt.value
                      ? 'border-accent bg-accent/5'
                      : 'border-[var(--border-default)] bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={opt.value}
                    checked={selectedReason === opt.value}
                    onChange={() => setSelectedReason(opt.value)}
                    className="mt-1 text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-[var(--text-primary)]">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {opt.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Details input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="report-details" className="font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Additional Context (Optional)
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">
                {details.length}/500
              </span>
            </div>
            <textarea
              id="report-details"
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any relevant details, links, or context to assist the review team..."
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <AuraButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </AuraButton>
            <AuraButton
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" focusable="false" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Flag size={14} aria-hidden="true" focusable="false" />
                  <span>Submit Report</span>
                </>
              )}
            </AuraButton>
          </div>
        </form>
      )}
    </AuraModal>
  );
};
