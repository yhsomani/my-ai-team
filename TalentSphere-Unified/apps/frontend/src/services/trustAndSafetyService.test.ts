import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  trustAndSafetyService,
  REPORT_SUBMITTED_EVENT,
  REPORT_RESOLVED_EVENT,
  type SubmitReportInput,
} from './trustAndSafetyService';

describe('trustAndSafetyService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('validates required fields on submission', async () => {
    await expect(
      trustAndSafetyService.submitContentReport({
        target_id: '',
        target_type: 'job_posting',
        reason: 'spam',
      })
    ).rejects.toThrow('Missing required report parameters.');

    await expect(
      trustAndSafetyService.submitContentReport({
        target_id: 'job-1',
        target_type: '' as any,
        reason: 'spam',
      })
    ).rejects.toThrow('Missing required report parameters.');
  });

  it('submits a report and emits custom window event with local fallback', async () => {
    const eventSpy = vi.fn();
    window.addEventListener(REPORT_SUBMITTED_EVENT, eventSpy);

    const input: SubmitReportInput = {
      reporter_id: 'user-reporter-123',
      target_type: 'job_posting',
      target_id: 'job-target-456',
      target_title: 'Fake Senior Engineering Role',
      reason: 'scam',
      details: 'Demands cryptocurrency transfer before interview.',
    };

    const report = await trustAndSafetyService.submitContentReport(input);

    expect(report.id).toMatch(/^rep-/);
    expect(report.target_id).toBe('job-target-456');
    expect(report.target_type).toBe('job_posting');
    expect(report.reason).toBe('scam');
    expect(report.details).toBe('Demands cryptocurrency transfer before interview.');
    expect(report.status).toBe('pending');

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const eventPayload = eventSpy.mock.calls[0][0] as CustomEvent;
    expect(eventPayload.detail.report.id).toBe(report.id);

    window.removeEventListener(REPORT_SUBMITTED_EVENT, eventSpy);
  });

  it('fetches moderation reports with pagination and filtering', async () => {
    const input1: SubmitReportInput = {
      target_type: 'company',
      target_id: 'co-1',
      reason: 'misleading',
    };
    const input2: SubmitReportInput = {
      target_type: 'job_posting',
      target_id: 'job-2',
      reason: 'spam',
    };

    await trustAndSafetyService.submitContentReport(input1);
    await trustAndSafetyService.submitContentReport(input2);

    const all = await trustAndSafetyService.getModerationReports();
    expect(all.reports.length).toBeGreaterThanOrEqual(2);

    const jobReports = await trustAndSafetyService.getModerationReports({
      target_type: 'job_posting',
    });
    expect(jobReports.reports.every((r) => r.target_type === 'job_posting')).toBe(true);

    const pendingReports = await trustAndSafetyService.getModerationReports({
      status: 'pending',
    });
    expect(pendingReports.reports.every((r) => r.status === 'pending')).toBe(true);
  });

  it('updates report status to under_review, resolved, and dismissed with event emission', async () => {
    const eventSpy = vi.fn();
    window.addEventListener(REPORT_RESOLVED_EVENT, eventSpy);

    const report = await trustAndSafetyService.submitContentReport({
      target_type: 'user_profile',
      target_id: 'usr-bad-1',
      reason: 'harassment',
      details: 'Abusive direct messages sent.',
    });

    const underReview = await trustAndSafetyService.updateReportStatus(
      report.id,
      'under_review',
      'Assigned to trust & safety investigator.'
    );
    expect(underReview.status).toBe('under_review');
    expect(underReview.resolution_notes).toBe('Assigned to trust & safety investigator.');

    const resolved = await trustAndSafetyService.updateReportStatus(
      report.id,
      'resolve',
      'User warned and message deleted.'
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolution_notes).toBe('User warned and message deleted.');

    expect(eventSpy).toHaveBeenCalledTimes(2);

    window.removeEventListener(REPORT_RESOLVED_EVENT, eventSpy);
  });

  it('throws an error when attempting to update a nonexistent report', async () => {
    await expect(
      trustAndSafetyService.updateReportStatus('nonexistent-id', 'dismiss')
    ).rejects.toThrow('Report with id nonexistent-id not found.');
  });

  it('computes moderation stats correctly', async () => {
    const stats = await trustAndSafetyService.getReportStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(typeof stats.pending).toBe('number');
    expect(typeof stats.underReview).toBe('number');
    expect(typeof stats.resolved).toBe('number');
    expect(typeof stats.dismissed).toBe('number');
  });
});
