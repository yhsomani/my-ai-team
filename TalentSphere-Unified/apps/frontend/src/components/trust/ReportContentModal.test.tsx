import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportContentModal } from './ReportContentModal';
import {
  trustAndSafetyService,
  type ModerationReport,
} from '../../services/trustAndSafetyService';

vi.mock('../../services/trustAndSafetyService', async () => {
  const actual = await vi.importActual<typeof import('../../services/trustAndSafetyService')>(
    '../../services/trustAndSafetyService'
  );

  return {
    ...actual,
    trustAndSafetyService: {
      ...actual.trustAndSafetyService,
      submitContentReport: vi.fn(),
    },
  };
});

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('ReportContentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render dialog content when isOpen is false', () => {
    render(
      <ReportContentModal
        isOpen={false}
        onClose={vi.fn()}
        targetType="job_posting"
        targetId="job-101"
      />
    );

    expect(screen.queryByRole('dialog', { name: 'Report Job Posting' })).toBeNull();
  });

  it('renders modal with target context, reasons, and form controls when open', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ReportContentModal
        isOpen={true}
        onClose={onClose}
        targetType="job_posting"
        targetId="job-101"
        targetTitle="Suspicious Senior Frontend Role"
      />
    );

    expect(await screen.findByRole('dialog', { name: 'Report Job Posting' })).toBeTruthy();
    expect(screen.getByText('Job Posting')).toBeTruthy();
    expect(screen.getByText('ID: job-101')).toBeTruthy();
    expect(screen.getByText('Suspicious Senior Frontend Role')).toBeTruthy();

    expect(screen.getByText('Scam or Fraud')).toBeTruthy();
    expect(screen.getByText('Spam or Promotional')).toBeTruthy();
    expect(screen.getByText('Misleading or Inaccurate')).toBeTruthy();
    expect(screen.getByText('Harassment or Abuse')).toBeTruthy();
    expect(screen.getByText('Inappropriate Content')).toBeTruthy();
    expect(screen.getByText('Other Policy Violation')).toBeTruthy();

    expect(screen.getByPlaceholderText(/Provide any relevant details/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Submit Report/i })).toBeTruthy();

    expectDecorativeSvgIcons(container);
  });

  it('submits report with selected reason and details then shows success state', async () => {
    const mockReport: ModerationReport = {
      id: 'rep-test-999',
      target_type: 'job_posting',
      target_id: 'job-101',
      target_title: 'Suspicious Senior Frontend Role',
      reason: 'misleading',
      details: 'Company does not exist at listed address.',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(trustAndSafetyService.submitContentReport).mockResolvedValue(mockReport);

    const onSubmitted = vi.fn();
    const onClose = vi.fn();

    render(
      <ReportContentModal
        isOpen={true}
        onClose={onClose}
        targetType="job_posting"
        targetId="job-101"
        targetTitle="Suspicious Senior Frontend Role"
        reporterId="user-rep-1"
        onReportSubmitted={onSubmitted}
      />
    );

    // Select reason 'misleading'
    const misleadingRadio = screen.getByLabelText(/Misleading or Inaccurate/i);
    fireEvent.click(misleadingRadio);

    // Fill in details
    const detailsInput = screen.getByPlaceholderText(/Provide any relevant details/i);
    fireEvent.change(detailsInput, {
      target: { value: 'Company does not exist at listed address.' },
    });

    const submitButton = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(trustAndSafetyService.submitContentReport).toHaveBeenCalledWith({
        target_id: 'job-101',
        target_type: 'job_posting',
        target_title: 'Suspicious Senior Frontend Role',
        reporter_id: 'user-rep-1',
        reason: 'misleading',
        details: 'Company does not exist at listed address.',
      });
    });

    expect(onSubmitted).toHaveBeenCalledWith(mockReport);

    // Success screen
    expect(await screen.findByText('Report Submitted Successfully')).toBeTruthy();
    const doneButton = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('handles submission error gracefully and displays error banner', async () => {
    vi.mocked(trustAndSafetyService.submitContentReport).mockRejectedValueOnce(
      new Error('Rate limit exceeded for reports. Please try again later.')
    );

    render(
      <ReportContentModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="user_profile"
        targetId="usr-bad-1"
      />
    );

    const submitButton = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitButton);

    expect(
      await screen.findByText('Rate limit exceeded for reports. Please try again later.')
    ).toBeTruthy();
  });
});
