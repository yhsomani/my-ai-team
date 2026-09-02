import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrustAndSafetyModerationQueue } from './TrustAndSafetyModerationQueue';
import {
  trustAndSafetyService,
  REPORT_SUBMITTED_EVENT,
  type ModerationReport,
  type PaginatedModerationReportsResult,
} from '../../services/trustAndSafetyService';

vi.mock('../../services/trustAndSafetyService', async () => {
  const actual = await vi.importActual<typeof import('../../services/trustAndSafetyService')>(
    '../../services/trustAndSafetyService'
  );

  return {
    ...actual,
    trustAndSafetyService: {
      ...actual.trustAndSafetyService,
      getModerationReports: vi.fn(),
      updateReportStatus: vi.fn(),
    },
  };
});

const mockReports: ModerationReport[] = [
  {
    id: 'rep-001',
    target_type: 'job_posting',
    target_id: 'job-101',
    target_title: 'Suspicious Crypto Trading Role',
    reason: 'scam',
    details: 'Asks for upfront payment for onboarding kit.',
    status: 'pending',
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
  },
  {
    id: 'rep-002',
    target_type: 'user_profile',
    target_id: 'usr-202',
    target_title: 'Spam Bot Profile',
    reason: 'spam',
    details: 'Sends repetitive bulk messages.',
    status: 'under_review',
    resolution_notes: 'Investigating network origin.',
    created_at: '2026-06-28T08:00:00.000Z',
    updated_at: '2026-06-28T09:00:00.000Z',
  },
  {
    id: 'rep-003',
    target_type: 'company',
    target_id: 'cmp-303',
    target_title: 'Unverified Entity LLC',
    reason: 'misleading',
    details: 'Fake address listed on profile.',
    status: 'resolved',
    resolution_notes: 'Company suspended after verification failure.',
    created_at: '2026-06-27T12:00:00.000Z',
    updated_at: '2026-06-27T15:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedModerationReportsResult = {
  reports: mockReports,
  total: 3,
  pendingCount: 1,
  underReviewCount: 1,
  resolvedCount: 1,
  dismissedCount: 0,
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('TrustAndSafetyModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trustAndSafetyService.getModerationReports).mockResolvedValue(mockPaginatedResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders queue header, summary KPIs, and moderation reports table', async () => {
    const { container } = render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Trust & Safety Moderation Queue/i })).toBeTruthy();
    });

    // KPI Summary
    const summary = screen.getByRole('list', { name: 'Moderation queue summary' });
    expect(within(summary).getByRole('listitem', { name: 'Pending Reports: 1' })).toBeTruthy();
    expect(within(summary).getByRole('listitem', { name: 'Under Review: 1' })).toBeTruthy();
    expect(within(summary).getByRole('listitem', { name: 'Resolved Reports: 1' })).toBeTruthy();
    expect(within(summary).getByRole('listitem', { name: 'Dismissed Reports: 0' })).toBeTruthy();

    // Table rows
    expect(screen.getByRole('table', { name: 'Content moderation reports' })).toBeTruthy();
    expect(screen.getByText('Suspicious Crypto Trading Role')).toBeTruthy();
    expect(screen.getByText('Spam Bot Profile')).toBeTruthy();
    expect(screen.getByText('Unverified Entity LLC')).toBeTruthy();

    expectDecorativeSvgIcons(container);
  });

  it('filters reports when switching status tabs', async () => {
    render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Trust & Safety Moderation Queue/i })).toBeTruthy();
    });

    const pendingTab = screen.getByRole('tab', { name: /Pending/i });
    fireEvent.click(pendingTab);

    await waitFor(() => {
      expect(trustAndSafetyService.getModerationReports).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
    });
  });

  it('filters reports when changing target type dropdown', async () => {
    render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Trust & Safety Moderation Queue/i })).toBeTruthy();
    });

    const typeSelect = screen.getByLabelText('Filter by target type');
    fireEvent.change(typeSelect, { target: { value: 'job_posting' } });

    await waitFor(() => {
      expect(trustAndSafetyService.getModerationReports).toHaveBeenCalledWith(
        expect.objectContaining({
          target_type: 'job_posting',
        })
      );
    });
  });

  it('marks a pending report as under review directly', async () => {
    vi.mocked(trustAndSafetyService.updateReportStatus).mockResolvedValue({
      ...mockReports[0],
      status: 'under_review',
    });

    render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(screen.getByText('Suspicious Crypto Trading Role')).toBeTruthy();
    });

    const reviewButton = screen.getByRole('button', { name: 'Review rep-001' });
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(trustAndSafetyService.updateReportStatus).toHaveBeenCalledWith('rep-001', 'under_review');
    });
  });

  it('opens resolution modal, enters resolution note, and submits resolution', async () => {
    vi.mocked(trustAndSafetyService.updateReportStatus).mockResolvedValue({
      ...mockReports[0],
      status: 'resolved',
      resolution_notes: 'Job removed from public listings.',
    });

    render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(screen.getByText('Suspicious Crypto Trading Role')).toBeTruthy();
    });

    const resolveButton = screen.getByRole('button', { name: 'Resolve rep-001' });
    fireEvent.click(resolveButton);

    // Modal appears
    expect(await screen.findByRole('dialog', { name: 'Resolve Moderation Report' })).toBeTruthy();

    const notesInput = screen.getByPlaceholderText(/Content removed, user warned/i);
    fireEvent.change(notesInput, {
      target: { value: 'Job removed from public listings.' },
    });

    const confirmButton = screen.getByRole('button', { name: 'Confirm Resolution' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(trustAndSafetyService.updateReportStatus).toHaveBeenCalledWith(
        'rep-001',
        'resolve',
        'Job removed from public listings.'
      );
    });
  });

  it('refreshes queue when a custom window event is dispatched', async () => {
    render(<TrustAndSafetyModerationQueue />);

    await waitFor(() => {
      expect(trustAndSafetyService.getModerationReports).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(
      new CustomEvent(REPORT_SUBMITTED_EVENT, {
        detail: { report: mockReports[0] },
      })
    );

    await waitFor(() => {
      expect(trustAndSafetyService.getModerationReports).toHaveBeenCalledTimes(2);
    });
  });

  it('handles load error gracefully with retry option', async () => {
    vi.mocked(trustAndSafetyService.getModerationReports).mockRejectedValueOnce(
      new Error('Failed to fetch from backend')
    );

    render(<TrustAndSafetyModerationQueue />);

    expect(await screen.findByText('Unable to load moderation queue. Please retry.')).toBeTruthy();

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(trustAndSafetyService.getModerationReports).toHaveBeenCalledTimes(2);
    });
  });
});
