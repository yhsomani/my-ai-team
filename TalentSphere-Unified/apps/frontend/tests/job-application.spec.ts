import { expect, test, type Page } from '@playwright/test';
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

const secondaryJobRow: Record<string, unknown> = {
  id: 'job-northstar-backend',
  title: 'Backend API Engineer',
  description: 'Own platform APIs and integration reliability for TalentSphere customers.',
  company_id: 'company-northstar',
  location: 'Hybrid',
  job_type: 'FULL_TIME',
  salary_min: 135000,
  salary_max: 165000,
  requirements: ['Node.js', 'PostgreSQL', 'API design'],
  posted_at: '2026-06-25T09:00:00.000Z',
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const jobCard = (page: Page, title: string) => page.locator('.surface-card').filter({
  has: page.getByRole('heading', { name: new RegExp(`^${escapeRegExp(title)}$`) }),
}).first();

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

  test('saves, reapplies, deletes reviewed searches and restores hidden Explore jobs', async ({ page }) => {
    const savedSearchUpserts: Record<string, unknown>[] = [];
    const savedSearchDeletes: Array<{ id?: string; userId?: string }> = [];
    const hiddenExploreUpserts: Record<string, unknown>[] = [];
    const hiddenExploreDeletes: Array<{ jobId?: string; userId?: string }> = [];
    const hiddenExploreClears: Array<{ userId?: string }> = [];

    await installNetworkStubs(page, {
      rest: {
        jobs: [jobRow, secondaryJobRow],
        profile: profileRow,
        applications: [],
        applicationDraft: null,
        applicationDraftHistory: [],
        applicationStatusEvents: [],
        savedJobSearches: [],
        hiddenExploreJobs: [],
        onSavedJobSearchUpsert: (payload) => {
          savedSearchUpserts.push(payload);
          return {
            id: typeof payload.id === 'string' ? payload.id : 'saved-job-search-e2e-001',
            user_id: typeof payload.user_id === 'string' ? payload.user_id : 'e2e-role_user',
            name: payload.name,
            search_term: payload.search_term,
            filters: payload.filters,
            alert_enabled: payload.alert_enabled,
            last_match_count: payload.last_match_count ?? null,
            last_checked_at: payload.last_checked_at ?? null,
            last_used_at: payload.last_used_at ?? null,
            created_at: typeof payload.created_at === 'string' ? payload.created_at : '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onSavedJobSearchDelete: (context) => {
          savedSearchDeletes.push(context);
        },
        onHiddenExploreJobUpsert: (payload) => {
          hiddenExploreUpserts.push(payload);
          return {
            id: typeof payload.id === 'string' ? payload.id : 'hidden-explore-job-e2e-001',
            user_id: payload.user_id,
            job_id: payload.job_id,
            title: payload.title,
            company_name: payload.company_name,
            job_type: payload.job_type,
            location: payload.location,
            hidden_at: payload.hidden_at,
            created_at: payload.created_at,
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onHiddenExploreJobDelete: (context) => {
          hiddenExploreDeletes.push(context);
        },
        onHiddenExploreJobsClear: (context) => {
          hiddenExploreClears.push(context);
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/jobs');

    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible();
    await expect(jobCard(page, 'Frontend Platform Engineer')).toBeVisible();
    await expect(jobCard(page, 'Backend API Engineer')).toBeVisible();

    await page.getByLabel('Search jobs').fill('Frontend');
    await page.getByLabel('Location').fill('Remote');
    await page.getByRole('button', { name: 'Save Search' }).click();

    const saveDialog = page.getByRole('dialog', { name: 'Save Job Search' });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByLabel('Search Name').fill('Remote frontend roles');
    await saveDialog.getByLabel('Track new matches').check();
    await saveDialog.getByRole('button', { name: 'Save Search' }).click();

    await expect.poll(() => savedSearchUpserts.length).toBe(1);
    const savedSearchId = savedSearchUpserts[0].id;
    expect(savedSearchUpserts[0]).toMatchObject({
      user_id: 'e2e-role_user',
      name: 'Remote frontend roles',
      search_term: 'Frontend',
      filters: {
        jobType: '',
        location: 'Remote',
        minSalary: '',
        maxSalary: '',
      },
      alert_enabled: true,
    });

    const savedSearchButton = page.getByRole('button', { name: 'Remote frontend roles', exact: true });
    const deleteSavedSearchButton = page.getByRole('button', { name: 'Delete saved search Remote frontend roles', exact: true });

    await expect(savedSearchButton).toBeVisible();
    await page.getByLabel('Search jobs').fill('Backend');
    await expect(jobCard(page, 'Backend API Engineer')).toBeHidden();

    await savedSearchButton.click();
    await expect(page.getByLabel('Search jobs')).toHaveValue('Frontend');
    await expect(page.getByLabel('Location')).toHaveValue('Remote');
    await expect.poll(() => savedSearchUpserts.length).toBe(2);
    expect(savedSearchUpserts[1]).toMatchObject({
      id: savedSearchId,
      user_id: 'e2e-role_user',
      name: 'Remote frontend roles',
      search_term: 'Frontend',
      filters: {
        jobType: '',
        location: 'Remote',
        minSalary: '',
        maxSalary: '',
      },
      alert_enabled: true,
    });
    expect(savedSearchUpserts[1].last_used_at).toEqual(expect.any(String));

    await deleteSavedSearchButton.click();
    const deleteDialog = page.getByRole('dialog', { name: 'Delete Saved Search' });
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByText(/Saved filters and new-match tracking/)).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(savedSearchButton).toBeVisible();

    await deleteSavedSearchButton.click();
    await page.getByRole('dialog', { name: 'Delete Saved Search' }).getByRole('button', { name: 'Delete Search' }).click();
    await expect.poll(() => savedSearchDeletes.length).toBe(1);
    expect(savedSearchDeletes[0]).toEqual({
      id: savedSearchId,
      userId: 'e2e-role_user',
    });
    await expect(savedSearchButton).toBeHidden();

    await page.getByRole('button', { name: 'Hide Frontend Platform Engineer from Explore' }).click();
    await expect.poll(() => hiddenExploreUpserts.length).toBe(1);
    expect(hiddenExploreUpserts[0]).toMatchObject({
      id: 'e2e-role_user:job-northstar-frontend',
      user_id: 'e2e-role_user',
      job_id: 'job-northstar-frontend',
      title: 'Frontend Platform Engineer',
      company_name: 'Northstar Labs',
      job_type: 'FULL_TIME',
      location: 'Remote',
    });
    await expect(jobCard(page, 'Frontend Platform Engineer')).toBeHidden();
    await expect(page.getByText('1 hidden from Explore')).toBeVisible();
    await expect(page.getByText('Last hidden: Frontend Platform Engineer at Northstar Labs')).toBeVisible();

    await page.getByRole('button', { name: 'Restore Last' }).click();
    await expect.poll(() => hiddenExploreDeletes.length).toBe(1);
    expect(hiddenExploreDeletes[0]).toEqual({
      jobId: 'job-northstar-frontend',
      userId: 'e2e-role_user',
    });
    expect(hiddenExploreClears).toEqual([]);
    await expect(jobCard(page, 'Frontend Platform Engineer')).toBeVisible();
    await expect(page.getByText('Frontend Platform Engineer restored to Explore.')).toBeVisible();
  });
});
