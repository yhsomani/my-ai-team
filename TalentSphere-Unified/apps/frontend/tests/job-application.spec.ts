import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const jobRow: Record<string, unknown> = {
  id: 'job-northstar-frontend',
  title: 'Frontend Platform Engineer',
  description: 'Build accessible product workflows for TalentSphere teams.',
  company_id: 'company-northstar',
  location: 'Remote',
  job_type: 'FULL_TIME',
  salary_min: 140000,
  salary_max: 175000,
  requirements: ['React', 'TypeScript', 'Accessibility'],
  posted_at: '2026-06-26T09:00:00.000Z',
  status: 'PUBLISHED',
  companies: {
    id: 'company-northstar',
    name: 'Northstar Labs',
    logo_url: null,
    location: 'Remote',
    industry: 'Product Engineering',
  },
};

const profileRow: Record<string, unknown> = {
  id: 'profile-e2e-user',
  user_id: 'e2e-role_user',
  headline: 'frontend platform engineering',
  summary: 'I build accessible, reliable product workflows.',
  website: 'https://portfolio.example/e2e-user',
  profiles: {
    email: 'e2e@talentsphere.test',
    first_name: 'E2E',
    last_name: 'User',
    full_name: 'E2E User',
    avatar_url: null,
  },
  skills: [
    { id: 'skill-react', name: 'React' },
    { id: 'skill-typescript', name: 'TypeScript' },
  ],
  experiences: [
    {
      id: 'experience-frontend',
      title: 'Frontend Engineer',
      company: 'Orbit Apps',
      current: true,
      description: 'shipped design-system backed workflow surfaces.',
    },
  ],
  educations: [],
  certifications: [],
  languages: [],
  projects: [],
};

test.describe('job application workflow', () => {
  test('submits an editable application draft and opens submitted details', async ({ page }) => {
    const submittedApplications: Record<string, unknown>[] = [];
    const resumeUrl = 'https://resume.example/e2e-user.pdf';
    const coverLetter = 'I can help Northstar Labs ship accessible frontend workflows with React and TypeScript.';

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow],
        profile: profileRow,
        applications: [],
        applicationDraft: null,
        applicationDraftHistory: [],
        applicationStatusEvents: [],
        onApplicationInsert: (payload) => {
          submittedApplications.push(payload);
          return {
            id: 'application-northstar-001',
            job_id: payload.job_id,
            user_id: payload.user_id,
            resume_url: payload.resume_url,
            cover_letter: payload.cover_letter,
            status: 'PENDING',
            applied_at: '2026-06-27T10:00:00.000Z',
            created_at: '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/jobs');

    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible();
    await expect(page.getByText('Frontend Platform Engineer')).toBeVisible();
    await expect(page.getByText('Northstar Labs')).toBeVisible();

    await page.getByRole('button', { name: 'Apply Now' }).click();

    const reviewDialog = page.getByRole('dialog', { name: 'Review Application' });
    await expect(reviewDialog).toBeVisible();
    await expect(reviewDialog.getByText('Editable draft generated from your profile.')).toBeVisible();

    await reviewDialog.getByLabel('Resume or Profile URL').fill(resumeUrl);
    await reviewDialog.getByLabel('Cover Letter').fill(coverLetter);
    await reviewDialog.getByRole('button', { name: 'Submit Application' }).click();

    await expect.poll(() => submittedApplications.length).toBe(1);
    expect(submittedApplications[0]).toMatchObject({
      job_id: 'job-northstar-frontend',
      user_id: 'e2e-role_user',
      resume_url: resumeUrl,
      cover_letter: coverLetter,
      status: 'PENDING',
    });

    await expect(page.getByText('Application submitted successfully!')).toBeVisible();

    const detailsDialog = page.getByRole('dialog', { name: 'Application Details' });
    await expect(detailsDialog).toBeVisible();
    await expect(detailsDialog.getByText('Frontend Platform Engineer')).toBeVisible();
    await expect(detailsDialog.getByText(/^Northstar Labs · Applied/)).toBeVisible();
    await expect(detailsDialog.getByText('Status Timeline')).toBeVisible();
    await expect(detailsDialog.getByRole('link', { name: 'Resume link' })).toHaveAttribute('href', resumeUrl);
    await expect(detailsDialog.getByText(coverLetter)).toBeVisible();

    await detailsDialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('tab', { name: 'Applied' }).click();

    await expect(page.getByText('Frontend Platform Engineer')).toBeVisible();
    await expect(page.getByText('PENDING')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible();
  });
});
