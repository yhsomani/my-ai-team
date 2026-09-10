import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const recruiterId = 'e2e-role_recruiter';

const duplicateJobRow: Record<string, unknown> = {
  id: 'job-existing-applied-ml',
  title: 'Applied ML Engineer',
  description: 'Existing active role used for duplicate review coverage.',
  company_id: 'company-existing',
  location: 'Remote',
  job_type: 'FULL_TIME',
  salary_min: 155000,
  salary_max: 190000,
  requirements: ['Python', 'ML systems'],
  posted_at: '2026-06-25T09:00:00.000Z',
  created_at: '2026-06-25T09:00:00.000Z',
  updated_at: '2026-06-25T09:00:00.000Z',
  posted_by: recruiterId,
  status: 'DRAFT',
  companies: {
    name: 'Existing Co',
    logo_url: null,
  },
};

const draftHistoryRow: Record<string, unknown> = {
  id: 'job-post-history-platform-design',
  recruiter_id: recruiterId,
  draft_key: 'new',
  job_id: null,
  title: 'Platform Design Lead',
  description: 'Restore a prior design-system leadership draft.',
  location: 'Austin',
  job_type: 'CONTRACT',
  salary_min: '90000',
  salary_max: '120000',
  requirements: 'Design systems\nRoadmaps',
  salary_range: null,
  category: null,
  company_id: 'company-history',
  company_name: 'History Co',
  company_attached: true,
  reason: 'saved',
  created_at: '2026-06-25T09:00:00.000Z',
  updated_at: '2026-06-26T09:00:00.000Z',
};

test.describe('post job workflow', () => {
  test('creates company context, manages templates, restores history, and saves a reviewed duplicate draft', async ({ page }) => {
    const companyInserts: Record<string, unknown>[] = [];
    const templateUpserts: Record<string, unknown>[] = [];
    const templateDeletes: Array<{ id?: string; recruiterId?: string }> = [];
    const draftVersionUpserts: Record<string, unknown>[] = [];
    const jobInserts: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        jobs: [duplicateJobRow],
        companies: [],
        jobPostTemplates: [],
        jobPostDraftVersions: [draftHistoryRow],
        onCompanyInsert: (payload) => {
          companyInserts.push(payload);
          return {
            id: 'company-northstar-recruiting',
            name: payload.name,
            description: payload.description ?? null,
            website: payload.website ?? null,
            location: payload.location ?? null,
            logo_url: null,
            industry: payload.industry ?? null,
            employee_count: payload.employee_count ?? null,
            owner_user_id: payload.owner_user_id,
            verified: false,
            verified_at: null,
            created_at: '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onJobPostTemplateUpsert: (payload) => {
          templateUpserts.push(payload);
          return {
            id: payload.id,
            recruiter_id: payload.recruiter_id,
            name: payload.name,
            title: payload.title,
            description: payload.description,
            location: payload.location,
            job_type: payload.job_type,
            salary_min: payload.salary_min ?? null,
            salary_max: payload.salary_max ?? null,
            requirements: payload.requirements,
            salary_range: payload.salary_range ?? null,
            category: payload.category ?? null,
            created_at: payload.created_at,
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onJobPostTemplateDelete: (context) => {
          templateDeletes.push(context);
        },
        onJobPostDraftVersionUpsert: (payload) => {
          draftVersionUpserts.push(payload);
          return {
            id: payload.id,
            recruiter_id: payload.recruiter_id,
            draft_key: payload.draft_key,
            job_id: payload.job_id ?? null,
            title: payload.title,
            description: payload.description,
            location: payload.location,
            job_type: payload.job_type,
            salary_min: payload.salary_min ?? null,
            salary_max: payload.salary_max ?? null,
            requirements: payload.requirements,
            salary_range: payload.salary_range ?? null,
            category: payload.category ?? null,
            company_id: payload.company_id ?? null,
            company_name: payload.company_name ?? null,
            company_attached: payload.company_attached,
            reason: payload.reason,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
          };
        },
        onJobInsert: (payload) => {
          jobInserts.push(payload);
          return {
            id: 'job-new-reviewed-draft',
            ...payload,
            posted_at: '2026-06-27T10:00:00.000Z',
            created_at: '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/jobs/post');

    await expect(page.getByRole('heading', { name: 'Create Job Draft' })).toBeVisible();
    await expect(page.getByText('Recent draft versions')).toBeVisible();
    await expect(page.getByText('Platform Design Lead')).toBeVisible();

    await page.getByLabel('Company Name').fill('Northstar Recruiting');
    await page.getByLabel('Industry').fill('Software');
    await page.getByLabel('Company Location').fill('Remote');
    await page.getByLabel('Website').fill('https://northstar.example');
    await page.getByLabel('Employee Count').fill('240');
    await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Builds hiring tools for product teams.');
    await page.getByRole('button', { name: 'Create & Attach Company' }).click();

    await expect.poll(() => companyInserts.length).toBe(1);
    expect(companyInserts[0]).toMatchObject({
      name: 'Northstar Recruiting',
      industry: 'Software',
      location: 'Remote',
      website: 'https://northstar.example',
      description: 'Builds hiring tools for product teams.',
      employee_count: 240,
      owner_user_id: recruiterId,
    });
    await expect(page.getByText('Northstar Recruiting created and attached. Review remains required before saving.').first()).toBeVisible();
    await expect(page.getByLabel('Attach company')).toBeChecked();

    await page.getByLabel('Job Title').fill('Applied ML Engineer');
    await page.getByLabel('Job Description').fill('Build production ML workflows for recruiting teams.');
    await page.getByLabel('Location', { exact: true }).fill('Remote');
    await page.getByLabel('Min Salary (USD)').fill('160000');
    await page.getByLabel('Max Salary (USD)').fill('200000');
    await page.getByLabel('Requirements (One per line)').fill('Python\nModel operations');

    await page.getByRole('button', { name: 'Save Current' }).click();
    await expect.poll(() => templateUpserts.length).toBe(1);
    const templateId = templateUpserts[0].id;
    expect(templateUpserts[0]).toMatchObject({
      recruiter_id: recruiterId,
      name: 'Applied ML Engineer - Remote',
      title: 'Applied ML Engineer',
      description: 'Build production ML workflows for recruiting teams.',
      location: 'Remote',
      job_type: 'FULL_TIME',
      salary_min: '160000',
      salary_max: '200000',
      requirements: 'Python\nModel operations',
    });
    await expect(page.getByText('Applied ML Engineer - Remote saved as a reusable draft. Review every field before saving.')).toBeVisible();

    await page.getByRole('button', { name: 'Use Template' }).click();
    await expect(page.getByText('Applied ML Engineer - Remote inserted as an editable draft. Nothing has been posted.')).toBeVisible();
    await expect.poll(() => draftVersionUpserts.some(payload => payload.reason === 'template_applied')).toBe(true);

    const deleteTemplateToolbarButton = page.getByRole('button', { name: 'Delete', exact: true });
    await deleteTemplateToolbarButton.click();
    const deleteTemplateDialog = page.getByRole('dialog', { name: 'Delete Job Template' });
    await expect(deleteTemplateDialog).toBeVisible();
    await expect(deleteTemplateDialog.getByText('Current form fields, draft history, saved jobs, published jobs, candidates, and notifications are unchanged.')).toBeVisible();
    await deleteTemplateDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(deleteTemplateDialog).toBeHidden();
    expect(templateDeletes).toEqual([]);
    await expect(page.getByLabel('Job Title')).toHaveValue('Applied ML Engineer');

    await deleteTemplateToolbarButton.click();
    await page.getByRole('dialog', { name: 'Delete Job Template' }).getByRole('button', { name: 'Delete Template' }).click();
    await expect.poll(() => templateDeletes.length).toBe(1);
    expect(templateDeletes[0]).toEqual({
      id: templateId as string,
      recruiterId,
    });
    await expect(page.getByText('Applied ML Engineer - Remote template deleted. Current form fields are unchanged.')).toBeVisible();
    await expect(page.getByLabel('Job Title')).toHaveValue('Applied ML Engineer');

    const restoredHistoryRow = page.locator('div.rounded-md').filter({
      has: page.getByText('Platform Design Lead'),
    }).filter({
      has: page.getByRole('button', { name: 'Restore' }),
    }).first();
    await restoredHistoryRow.getByRole('button', { name: 'Restore' }).first().click();
    await expect(page.getByLabel('Job Title')).toHaveValue('Platform Design Lead');
    await expect(page.getByLabel('Location', { exact: true })).toHaveValue('Austin');
    await expect(page.getByText('History Co restored for this draft.')).toBeVisible();

    await page.getByLabel('Job Title').fill('Applied ML Engineer');
    await page.getByLabel('Location', { exact: true }).fill('Remote');
    await page.getByLabel('Job Type').selectOption('FULL_TIME');

    await page.getByRole('button', { name: 'Review Draft' }).click();
    await expect(page.getByRole('heading', { name: 'Applied ML Engineer' })).toBeVisible();
    await expect(page.getByText('Possible duplicate job')).toBeVisible();
    await expect(page.getByText('An active draft or published job already matches this title, location, and job type.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Draft Anyway' })).toBeVisible();
    await expect.poll(() => draftVersionUpserts.some(payload => payload.reason === 'reviewed')).toBe(true);

    await page.getByRole('button', { name: 'Save Draft Anyway' }).click();
    await expect.poll(() => jobInserts.length).toBe(1);
    expect(jobInserts[0]).toMatchObject({
      title: 'Applied ML Engineer',
      description: 'Restore a prior design-system leadership draft.',
      company_id: 'company-history',
      location: 'Remote',
      job_type: 'FULL_TIME',
      salary_min: 90000,
      salary_max: 120000,
      requirements: ['Design systems', 'Roadmaps'],
      status: 'DRAFT',
      posted_by: recruiterId,
    });
    await expect.poll(() => draftVersionUpserts.some(payload => payload.reason === 'saved')).toBe(true);
    await expect(page).toHaveURL(/\/jobs\?tab=postings$/);
  });
});
