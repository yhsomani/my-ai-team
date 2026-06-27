import { expect, test, type Locator } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const recruiterId = 'e2e-role_recruiter';

const jobRow: Record<string, unknown> = {
  id: 'job-candidate-review',
  title: 'Product Design Lead',
  description: 'Lead product design reviews and cross-functional delivery.',
  company_id: 'company-acme',
  location: 'Remote',
  job_type: 'FULL_TIME',
  posted_at: '2026-06-24T09:00:00.000Z',
  created_at: '2026-06-24T09:00:00.000Z',
  updated_at: '2026-06-24T09:00:00.000Z',
  posted_by: recruiterId,
  status: 'PUBLISHED',
  companies: {
    name: 'Acme Talent',
    logo_url: null,
  },
};

const candidateApplicationRow: Record<string, unknown> = {
  id: 'application-ava-001',
  user_id: 'candidate-ava',
  job_id: 'job-candidate-review',
  resume_url: 'https://resume.example/ava-patel.pdf',
  cover_letter: 'I have led design systems, research synthesis, and launch reviews for enterprise product teams.',
  status: 'PENDING',
  applied_at: '2026-06-26T10:00:00.000Z',
  created_at: '2026-06-26T10:00:00.000Z',
  updated_at: '2026-06-26T10:00:00.000Z',
  profiles: {
    full_name: 'Ava Patel',
    email: 'ava.patel@example.com',
  },
  jobs: {
    title: 'Product Design Lead',
  },
};

const buildCandidateApplicationRow = ({
  id,
  name,
  email,
  status,
  createdAt,
}: {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}): Record<string, unknown> => ({
  id,
  user_id: `user-${id}`,
  job_id: 'job-candidate-review',
  resume_url: `https://resume.example/${id}.pdf`,
  cover_letter: `${name} submitted relevant product leadership context.`,
  status,
  applied_at: createdAt,
  created_at: createdAt,
  updated_at: createdAt,
  profiles: {
    full_name: name,
    email,
  },
  jobs: {
    title: 'Product Design Lead',
  },
});

const buildCandidatePaginationRows = (count: number) => Array.from({ length: count }, (_, index) => {
  const candidateNumber = index + 1;
  const candidateLabel = String(candidateNumber).padStart(2, '0');
  const isSearchTarget = candidateNumber === count;
  const name = isSearchTarget ? 'Zara Page' : `Candidate ${candidateLabel}`;
  const id = `application-page-${candidateLabel}`;

  return buildCandidateApplicationRow({
    id,
    name,
    email: isSearchTarget
      ? 'zara.page@example.com'
      : `candidate.${candidateLabel}@example.com`,
    status: 'PENDING',
    createdAt: new Date(Date.UTC(2026, 5, 27, 12, count - index, 0)).toISOString(),
  });
});

const buildCandidateProfileRows = (applicationRows: Record<string, unknown>[]) => applicationRows.map(row => {
  const profile = row.profiles as { full_name?: string; email?: string } | undefined;

  return {
    id: row.user_id,
    full_name: profile?.full_name,
    email: profile?.email,
    avatar_url: null,
  };
});

const setRating = async (rating: Locator, targetValue: number) => {
  await rating.evaluate((input, value) => {
    const element = input as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, targetValue);
};

test.describe('candidate review workflow', () => {
  test('saves scorecard and notes before confirming a status transition', async ({ page }) => {
    const scorecardUpserts: Record<string, unknown>[] = [];
    const noteUpserts: Record<string, unknown>[] = [];
    const applicationUpdates: Array<{ id?: string; payload: Record<string, unknown> }> = [];
    const statusEvents: Record<string, unknown>[] = [];
    const evidence = 'Portfolio shows strong design-system leadership, stakeholder synthesis, and launch discipline.';
    const note = 'Follow up on dashboard IA tradeoffs and ask for a metrics review example.';

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow],
        applications: [candidateApplicationRow],
        candidateNotes: [],
        candidateScorecards: [],
        applicationStatusEvents: [],
        onCandidateScorecardUpsert: (payload) => {
          scorecardUpserts.push(payload);
          return {
            ...payload,
            created_at: '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onCandidateNoteUpsert: (payload) => {
          noteUpserts.push(payload);
          return {
            ...payload,
            created_at: '2026-06-27T10:01:00.000Z',
            updated_at: '2026-06-27T10:01:00.000Z',
          };
        },
        onApplicationUpdate: (payload, context) => {
          applicationUpdates.push({ id: context.id, payload });
          return {
            ...candidateApplicationRow,
            ...payload,
            id: context.id || candidateApplicationRow.id,
            updated_at: '2026-06-27T10:02:00.000Z',
          };
        },
        onApplicationStatusEventInsert: (payload) => {
          statusEvents.push(payload);
          return {
            id: 'status-event-ava-interview',
            ...payload,
            created_at: '2026-06-27T10:02:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/candidates');

    await expect(page.getByRole('heading', { name: /^Candidates$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ava Patel' })).toBeVisible();
    await expect(page.getByText('Product Design Lead')).toBeVisible();
    await expect(page.getByText('ava.patel@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Details' }).click();

    const detailsDialog = page.getByRole('dialog', { name: 'Candidate Details' });
    await expect(detailsDialog).toBeVisible();
    await expect(detailsDialog.getByText('Ava Patel')).toBeVisible();
    await expect(detailsDialog.getByText('Product Design Lead')).toBeVisible();
    await expect(detailsDialog.getByText('No resume link was submitted.')).toBeHidden();

    await setRating(detailsDialog.getByLabel('Role Fit'), 5);
    await setRating(detailsDialog.getByLabel('Technical Depth'), 4);
    await setRating(detailsDialog.getByLabel('Communication'), 4);
    await setRating(detailsDialog.getByLabel('Execution'), 5);
    await detailsDialog.getByLabel('Evidence notes').fill(evidence);
    await detailsDialog.getByRole('button', { name: 'Save Scorecard' }).last().click();

    await expect.poll(() => scorecardUpserts.length).toBe(1);
    expect(scorecardUpserts[0]).toMatchObject({
      recruiter_id: recruiterId,
      application_id: 'application-ava-001',
      evidence,
      ratings: {
        role_fit: 5,
        technical_depth: 4,
        communication: 4,
        execution: 5,
      },
    });
    await expect(page.getByRole('heading', { name: 'Scorecard saved' })).toBeVisible();

    await detailsDialog.getByLabel('Private recruiter notes').fill(note);
    await detailsDialog.getByRole('button', { name: 'Save Note' }).last().click();

    await expect.poll(() => noteUpserts.length).toBe(1);
    expect(noteUpserts[0]).toMatchObject({
      recruiter_id: recruiterId,
      application_id: 'application-ava-001',
      note,
    });
    await expect(page.getByRole('heading', { name: 'Recruiter note saved' })).toBeVisible();

    await detailsDialog.getByRole('button', { name: /^Interview$/ }).click();

    const statusDialog = page.getByRole('dialog', { name: 'Confirm Interview Status' });
    await expect(statusDialog).toBeVisible();
    await expect(statusDialog.getByText('Move this application to Interview?')).toBeVisible();
    await expect(statusDialog.getByText('Ava Patel')).toBeVisible();
    await statusDialog.getByRole('button', { name: 'Confirm Interview' }).click();

    await expect.poll(() => applicationUpdates.length).toBe(1);
    expect(applicationUpdates[0]).toMatchObject({
      id: 'application-ava-001',
      payload: {
        status: 'INTERVIEW',
      },
    });

    await expect.poll(() => statusEvents.length).toBe(1);
    expect(statusEvents[0]).toMatchObject({
      application_id: 'application-ava-001',
      previous_status: 'PENDING',
      status: 'INTERVIEW',
      changed_by: recruiterId,
      reason: 'Recruiter moved candidate to interview',
    });

    await expect(statusDialog).toBeHidden();
    await expect(detailsDialog.locator('span').filter({ hasText: /^INTERVIEW$/ })).toBeVisible();
  });

  test('navigates the review queue and bulk moves only eligible interview candidates to offer', async ({ page }) => {
    const applicationRows = [
      buildCandidateApplicationRow({
        id: 'application-mila-pending',
        name: 'Mila Chen',
        email: 'mila.chen@example.com',
        status: 'PENDING',
        createdAt: '2026-06-27T12:00:00.000Z',
      }),
      buildCandidateApplicationRow({
        id: 'application-nora-interview',
        name: 'Nora Ali',
        email: 'nora.ali@example.com',
        status: 'INTERVIEW',
        createdAt: '2026-06-27T11:00:00.000Z',
      }),
      buildCandidateApplicationRow({
        id: 'application-owen-offer',
        name: 'Owen Li',
        email: 'owen.li@example.com',
        status: 'OFFER',
        createdAt: '2026-06-27T10:00:00.000Z',
      }),
    ];
    const rowById = new Map(applicationRows.map(row => [row.id, row]));
    const applicationUpdates: Array<{ id?: string; payload: Record<string, unknown> }> = [];
    const statusEvents: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow],
        applications: applicationRows,
        candidateNotes: [],
        candidateScorecards: [],
        applicationStatusEvents: [],
        onApplicationUpdate: (payload, context) => {
          applicationUpdates.push({ id: context.id, payload });
          return {
            ...(rowById.get(context.id) || applicationRows[0]),
            ...payload,
            id: context.id || applicationRows[0].id,
            updated_at: '2026-06-27T12:30:00.000Z',
          };
        },
        onApplicationStatusEventInsert: (payload) => {
          statusEvents.push(payload);
          return {
            id: `status-event-${statusEvents.length}`,
            ...payload,
            created_at: '2026-06-27T12:30:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/candidates');

    await expect(page.getByRole('heading', { name: 'Mila Chen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nora Ali' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Owen Li' })).toBeVisible();

    await page.getByRole('button', { name: /Open Mila Chen for Product Design Lead/ }).click();

    const detailsDialog = page.getByRole('dialog', { name: 'Candidate Details' });
    await expect(detailsDialog).toBeVisible();
    await expect(detailsDialog.getByText('Candidate 1 of 3 in current queue')).toBeVisible();
    await expect(detailsDialog.getByRole('heading', { name: 'Mila Chen' })).toBeVisible();

    await detailsDialog.getByRole('button', { name: 'Review next candidate in current queue' }).click();
    await expect(detailsDialog.getByText('Candidate 2 of 3 in current queue')).toBeVisible();
    await expect(detailsDialog.getByRole('heading', { name: 'Nora Ali' })).toBeVisible();

    await detailsDialog.getByRole('button', { name: 'Review previous candidate in current queue' }).click();
    await expect(detailsDialog.getByText('Candidate 1 of 3 in current queue')).toBeVisible();
    await expect(detailsDialog.getByRole('heading', { name: 'Mila Chen' })).toBeVisible();

    await detailsDialog.getByRole('button', { name: 'Review next candidate in current queue' }).click();
    await expect(detailsDialog.getByText('Candidate 2 of 3 in current queue')).toBeVisible();
    await expect(detailsDialog.getByRole('heading', { name: 'Nora Ali' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(detailsDialog).toBeHidden();

    await page.getByLabel('Select visible').check();
    await expect(page.getByText('3 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Review Offer Move' }).click();

    const bulkDialog = page.getByRole('dialog', { name: 'Review Bulk Offer Move' });
    await expect(bulkDialog).toBeVisible();
    await expect(bulkDialog.getByText('Move selected Interview candidates to Offer?')).toBeVisible();
    await expect(bulkDialog.getByText('Eligible Applications')).toBeVisible();
    await expect(bulkDialog.getByText('Skipped Applications')).toBeVisible();
    await expect(bulkDialog.getByText('Nora Ali')).toBeVisible();
    await expect(bulkDialog.getByText('Mila Chen')).toBeVisible();
    await expect(bulkDialog.getByText('Owen Li')).toBeVisible();
    await expect(bulkDialog.getByText('Only Interview candidates are eligible for bulk Offer.')).toHaveCount(2);
    await bulkDialog.getByRole('button', { name: 'Confirm Offer Moves (1)' }).click();

    await expect.poll(() => applicationUpdates.length).toBe(1);
    expect(applicationUpdates[0]).toMatchObject({
      id: 'application-nora-interview',
      payload: {
        status: 'OFFER',
      },
    });

    await expect.poll(() => statusEvents.length).toBe(1);
    expect(statusEvents[0]).toMatchObject({
      application_id: 'application-nora-interview',
      previous_status: 'INTERVIEW',
      status: 'OFFER',
      changed_by: recruiterId,
      reason: 'Recruiter moved selected candidates to offer',
    });

    await expect(bulkDialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Selected candidates moved' })).toBeVisible();
  });

  test('reviews and resets unsaved private candidate notes without saving', async ({ page }) => {
    const noteUpserts: Record<string, unknown>[] = [];
    const draftNote = 'Draft-only calibration note for the interview panel.';

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow],
        applications: [candidateApplicationRow],
        candidateNotes: [],
        candidateScorecards: [],
        applicationStatusEvents: [],
        onCandidateNoteUpsert: (payload) => {
          noteUpserts.push(payload);
          return {
            ...payload,
            created_at: '2026-06-27T10:03:00.000Z',
            updated_at: '2026-06-27T10:03:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/candidates');
    await page.getByRole('button', { name: 'Details' }).click();

    const detailsDialog = page.getByRole('dialog', { name: 'Candidate Details' });
    const notesField = detailsDialog.getByLabel('Private recruiter notes');

    await expect(detailsDialog).toBeVisible();
    await notesField.fill(draftNote);
    await expect(detailsDialog.getByText('Unsaved note changes')).toBeVisible();
    await detailsDialog.getByRole('button', { name: 'Reset Changes' }).click();
    await expect(detailsDialog.getByRole('alert')).toContainText('Reset unsaved private review edits?');

    await detailsDialog.getByRole('button', { name: 'Keep Changes' }).click();
    await expect(notesField).toHaveValue(draftNote);
    await expect(detailsDialog.getByRole('alert')).toBeHidden();

    await detailsDialog.getByRole('button', { name: 'Reset Changes' }).click();
    await detailsDialog.getByRole('button', { name: 'Reset Drafts' }).click();

    await expect(notesField).toHaveValue('');
    await expect(detailsDialog.getByText('Unsaved note changes')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Review drafts reset' })).toBeVisible();
    expect(noteUpserts).toHaveLength(0);
  });

  test('paginates, searches, and applies review focus without mutating candidates', async ({ page }) => {
    const applicationRows = buildCandidatePaginationRows(12);
    const profiles = buildCandidateProfileRows(applicationRows);
    const scoredApplication = applicationRows[0];

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow],
        applications: applicationRows,
        profiles,
        candidateNotes: [],
        candidateScorecards: [
          {
            recruiter_id: recruiterId,
            application_id: scoredApplication.id,
            ratings: {
              role_fit: 5,
              technical_depth: 5,
              communication: 4,
              execution: 5,
            },
            evidence: 'Strong product leadership signal.',
            created_at: '2026-06-27T12:30:00.000Z',
            updated_at: '2026-06-27T12:30:00.000Z',
          },
        ],
        applicationStatusEvents: [],
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/candidates');

    await expect(page.getByRole('heading', { name: /^Candidates$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate 10' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate 11' })).toBeHidden();
    await expect(page.getByText(/Showing\s+1-10\s+candidates/)).toBeVisible();

    await page.getByLabel('Next candidates page').click();
    await expect(page.getByRole('heading', { name: 'Candidate 11' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zara Page' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeHidden();
    await expect(page.getByText(/Showing\s+11-12\s+candidates/)).toBeVisible();

    await page.getByLabel('Previous candidates page').click();
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeVisible();

    const searchCandidates = page.getByLabel('Search candidates');
    await searchCandidates.fill('Zara');
    await expect(page.getByRole('heading', { name: 'Zara Page' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeHidden();
    await expect(page.getByText(/Showing\s+1-1\s+matching candidates/)).toBeVisible();

    await searchCandidates.fill('');
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeVisible();
    await expect(page.getByText(/Showing\s+1-10\s+candidates/)).toBeVisible();
    await expect(page.getByText('1/10')).toBeVisible();

    await page.getByLabel('Focus candidates').selectOption('needs_scorecard');
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Candidate 02' })).toBeVisible();
    await expect(page.getByText(/Showing\s+1-9\s+candidates in focus/)).toBeVisible();

    await page.getByLabel('Show all candidates on the current page').click();
    await expect(page.getByRole('heading', { name: 'Candidate 01' })).toBeVisible();
    await expect(page.getByText(/Showing\s+1-10\s+candidates/)).toBeVisible();
  });
});
