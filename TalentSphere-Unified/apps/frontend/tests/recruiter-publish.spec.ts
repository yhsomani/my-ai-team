import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const recruiterId = 'e2e-role_recruiter';

const draftJobRow: Record<string, unknown> = {
  id: 'job-draft-publish',
  title: 'Senior Backend Engineer',
  description: 'Own the backend platform for recruiter and application workflows.',
  company_id: 'company-acme',
  location: 'Remote',
  job_type: 'FULL_TIME',
  salary_min: 150000,
  salary_max: 190000,
  requirements: ['Node.js', 'PostgreSQL', 'Event-driven systems'],
  posted_at: '2026-06-25T09:00:00.000Z',
  created_at: '2026-06-25T09:00:00.000Z',
  updated_at: '2026-06-25T09:00:00.000Z',
  posted_by: recruiterId,
  status: 'DRAFT',
  companies: {
    name: 'Acme Talent',
    logo_url: null,
  },
};

test.describe('recruiter publish workflow', () => {
  test('publishes a complete draft from reviewed My Posts checklist', async ({ page }) => {
    const jobUpdates: Array<{ id?: string; payload: Record<string, unknown> }> = [];

    await installNetworkStubs(page, {
      rest: {
        jobs: [draftJobRow],
        onJobUpdate: (payload, context) => {
          jobUpdates.push({ id: context.id, payload });
          return {
            ...draftJobRow,
            ...payload,
            id: context.id || draftJobRow.id,
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/jobs?tab=postings');

    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'My Posts' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Senior Backend Engineer')).toBeVisible();
    await expect(page.getByText('Acme Talent')).toBeVisible();

    await page.getByRole('button', { name: 'Review Publish' }).click();

    const reviewDialog = page.getByRole('dialog', { name: 'Review Before Publishing' });
    await expect(reviewDialog).toBeVisible();
    await expect(reviewDialog.getByText('This draft has title, description, location, company context, and requirements.')).toBeVisible();
    await expect(reviewDialog.getByText('Publishing makes this job visible in Explore.')).toBeVisible();

    await reviewDialog.getByRole('button', { name: 'Publish Job' }).click();

    await expect.poll(() => jobUpdates.length).toBe(1);
    expect(jobUpdates[0]).toMatchObject({
      id: 'job-draft-publish',
      payload: {
        status: 'PUBLISHED',
      },
    });

    await expect(page.getByText('Job published')).toBeVisible();
    await expect(reviewDialog).toBeHidden();
    await expect(page.locator('span').filter({ hasText: /^PUBLISHED$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible();
  });
});
