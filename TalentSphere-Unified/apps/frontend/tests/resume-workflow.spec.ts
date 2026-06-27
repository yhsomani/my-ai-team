import { expect, type Page, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';
const profileId = 'profile-e2e-resume';
const uploadedResumeUrl = 'https://files.example/resumes/e2e-user-resume.pdf';

const buildResumeProfileFixture = (overrides: JsonRecord = {}): JsonRecord => ({
  id: profileId,
  user_id: userId,
  headline: 'Product operations lead',
  summary: 'I build workflow systems for recruiting teams.',
  current_role: 'Product operations lead',
  bio: 'I build workflow systems for recruiting teams.',
  location: 'Remote',
  phone: '+1 555 0100',
  website: 'https://portfolio.example/e2e',
  linkedin_url: '',
  github_url: '',
  created_at: '2025-01-10T10:00:00.000Z',
  updated_at: '2026-06-27T10:00:00.000Z',
  profiles: {
    id: userId,
    email: 'e2e@talentsphere.test',
    first_name: 'E2E',
    last_name: 'User',
    full_name: 'E2E User',
    avatar_url: null,
  },
  skills: [
    {
      id: 'skill-existing-sql',
      profile_id: profileId,
      name: 'SQL',
      proficiency: 'ADVANCED',
      years_of_experience: 4,
    },
  ],
  experiences: [
    {
      id: 'experience-existing',
      profile_id: profileId,
      title: 'Product Operations Lead',
      company: 'Northstar Labs',
      location: 'Remote',
      start_date: '2024-01-01',
      end_date: null,
      current: true,
      description: 'Own product operations for recruiting workflows.',
    },
  ],
  educations: [],
  certifications: [],
  languages: [],
  projects: [],
  ...overrides,
});

const resumeImportText = [
  'E2E User',
  'Product Analytics Manager',
  'Austin, TX',
  'e2e@talentsphere.test',
  '+1 555 0134',
  'https://resume.example/e2e',
  '',
  'Summary',
  'I lead measurable recruiting workflow launches with accessible systems and clear executive reporting.',
  '',
  'Skills',
  'React, TypeScript, Product Strategy, SQL',
  '',
  'Experience',
  'Principal Product Manager at Atlas Works | Austin',
  'Jan 2022 - Present',
  'Launched analytics loops for hiring teams and reduced manual review effort.',
  '',
  'Education',
  'State University | MBA Product Strategy',
  'Aug 2018 - May 2020',
].join('\n');

const aiResumeDraftText = [
  'Resume headline: Principal Talent Workflow Strategist',
  'Phone: +1 555 0199',
  'Location: Denver, CO',
  'Website: https://resume.example/ai-review',
  'Summary: I lead AI-assisted hiring systems from discovery through adoption with clear accessibility and governance practices.',
].join('\n');

const seedAiResumeDraftState = async (page: Page, recommendationText: string) => {
  await page.evaluate((draftText) => {
    window.history.replaceState({
      usr: {
        aiResumeDraft: {
          recommendationId: 'ai-resume-e2e-001',
          recommendationText: draftText,
          sourceLabel: 'TalentSphere AI assistant',
          openedAt: '2026-06-27T10:00:00.000Z',
        },
      },
      key: 'resume-ai-e2e',
      idx: 0,
    }, '', '/resume');
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  }, recommendationText);
};

const installClipboardCapture = async (page: Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { __lastResumeClipboard?: string }).__lastResumeClipboard = value;
        },
      },
    });
  });
};

const createCaptures = () => ({
  userProfileUpdates: [] as JsonRecord[],
  skillInserts: [] as JsonRecord[],
  experienceInserts: [] as JsonRecord[],
  educationInserts: [] as JsonRecord[],
  resumeExportUpserts: [] as JsonRecord[],
  resumeArtifactUpserts: [] as JsonRecord[],
  resumeArtifactUpdates: [] as Array<{ payload: JsonRecord; id?: string; userId?: string }>,
  fileUploads: [] as Array<{ contentType?: string; postData?: string }>,
  fileDeletes: [] as Array<{ url?: string | null }>,
});

const installResumeWorkflowStubs = async (
  page: Page,
  profile: JsonRecord,
  captures: ReturnType<typeof createCaptures>,
) => {
  await installNetworkStubs(page, {
    api: {
      onFileUpload: (context) => {
        captures.fileUploads.push(context);
        return { data: { url: uploadedResumeUrl } };
      },
      onFileDelete: (context) => {
        captures.fileDeletes.push(context);
      },
    },
    rest: {
      profile,
      resumeExportEvents: [],
      resumeArtifacts: [],
      onUserProfileUpdate: (payload, context) => {
        captures.userProfileUpdates.push(payload);
        return {
          ...profile,
          ...payload,
          user_id: context.userId || profile.user_id,
          updated_at: '2026-06-27T10:05:00.000Z',
        };
      },
      onSkillInsert: (payload) => {
        captures.skillInserts.push(payload);
        return {
          id: `skill-import-${captures.skillInserts.length}`,
          profile_id: profileId,
          created_at: '2026-06-27T10:05:00.000Z',
          updated_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
      onExperienceInsert: (payload) => {
        captures.experienceInserts.push(payload);
        return {
          id: `experience-import-${captures.experienceInserts.length}`,
          profile_id: profileId,
          created_at: '2026-06-27T10:05:00.000Z',
          updated_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
      onEducationInsert: (payload) => {
        captures.educationInserts.push(payload);
        return {
          id: `education-import-${captures.educationInserts.length}`,
          profile_id: profileId,
          created_at: '2026-06-27T10:05:00.000Z',
          updated_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
      onResumeExportEventUpsert: (payload) => {
        captures.resumeExportUpserts.push(payload);
        return payload;
      },
      onResumeArtifactUpsert: (payload) => {
        captures.resumeArtifactUpserts.push(payload);
        return payload;
      },
      onResumeArtifactUpdate: (payload, context) => {
        captures.resumeArtifactUpdates.push({ payload, id: context.id, userId: context.userId });
        return {
          id: context.id || 'resume-artifact-e2e',
          user_id: context.userId || userId,
          file_name: 'E2E-User-resume.pdf',
          file_url: uploadedResumeUrl,
          uploaded_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
    },
  });
};

test.describe('resume builder workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
  });

  test('imports reviewed resume text, saves profile rows, exports, uploads, copies, and deletes artifacts', async ({ page }) => {
    const captures = createCaptures();
    await installClipboardCapture(page);
    await installResumeWorkflowStubs(page, buildResumeProfileFixture(), captures);

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();

    await page.getByRole('button', { name: 'Import Text' }).click();
    const importDialog = page.getByRole('dialog', { name: 'Import Resume Text' });
    await expect(importDialog).toBeVisible();
    await importDialog.getByLabel('Resume text').fill(resumeImportText);
    await importDialog.getByRole('button', { name: 'Generate Draft' }).click();

    await expect(importDialog.getByText('Review detected fields')).toBeVisible();
    await expect(importDialog.getByText('Product Analytics Manager', { exact: true })).toBeVisible();
    await expect(importDialog.getByText('Review detected skills')).toBeVisible();
    await expect(importDialog.getByText('Principal Product Manager', { exact: true })).toBeVisible();
    await expect(importDialog.getByText('State University', { exact: true })).toBeVisible();

    await importDialog.getByRole('button', { name: 'Save Skills' }).click();
    await expect.poll(() => captures.skillInserts.length).toBeGreaterThan(0);
    expect(captures.skillInserts.map(payload => payload.name)).toEqual(expect.arrayContaining([
      'React',
      'TypeScript',
      'Product Strategy',
    ]));
    expect(captures.skillInserts[0]).toMatchObject({
      profile_id: profileId,
      proficiency: 'INTERMEDIATE',
    });

    await importDialog.getByRole('button', { name: 'Save Rows' }).click();
    await expect.poll(() => captures.experienceInserts.length).toBe(1);
    await expect.poll(() => captures.educationInserts.length).toBe(1);
    expect(captures.experienceInserts[0]).toMatchObject({
      profile_id: profileId,
      title: 'Principal Product Manager',
      company: 'Atlas Works',
      start_date: '2022-01-01',
      current: true,
    });
    expect(captures.educationInserts[0]).toMatchObject({
      profile_id: profileId,
      institution: 'State University',
      degree: 'MBA',
      field_of_study: 'Product Strategy',
      start_date: '2018-08-01',
      end_date: '2020-05-01',
    });

    await importDialog.getByRole('button', { name: 'Apply Selected' }).click();
    await expect(importDialog).toBeHidden();
    await expect(page.getByLabel('Headline')).toHaveValue('Product Analytics Manager');
    await expect(page.getByLabel('Phone')).toHaveValue('+1 555 0134');
    await expect(page.getByLabel('Location')).toHaveValue('Austin, TX');
    await expect(page.getByLabel('Website')).toHaveValue('https://resume.example/e2e');
    await expect(page.getByText('I lead measurable recruiting workflow launches')).toBeVisible();

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect.poll(() => captures.userProfileUpdates.length).toBe(1);
    expect(captures.userProfileUpdates[0]).toMatchObject({
      headline: 'Product Analytics Manager',
      phone: '+1 555 0134',
      location: 'Austin, TX',
      website: 'https://resume.example/e2e',
      summary: 'I lead measurable recruiting workflow launches with accessible systems and clear executive reporting.',
    });

    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(page.getByRole('heading', { name: 'E2E User' })).toBeVisible();
    await expect(page.getByText('Product Analytics Manager', { exact: true })).toBeVisible();

    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    await expect((await pdfDownloadPromise).suggestedFilename()).toBe('E2E-User-resume.pdf');

    const htmlDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download HTML' }).click();
    await expect((await htmlDownloadPromise).suggestedFilename()).toBe('E2E-User-resume.html');
    await expect.poll(() => captures.resumeExportUpserts.some(payload => payload.method === 'native-pdf')).toBe(true);
    await expect.poll(() => captures.resumeExportUpserts.some(payload => payload.method === 'html-download')).toBe(true);

    await page.getByRole('button', { name: 'Upload PDF' }).click();
    await expect.poll(() => captures.fileUploads.length).toBe(1);
    expect(captures.fileUploads[0].contentType).toContain('multipart/form-data');
    expect(captures.fileUploads[0].postData || '').toContain('name="folder"');
    expect(captures.fileUploads[0].postData || '').toContain('resumes');
    await expect(page.getByRole('link', { name: 'Open PDF' })).toHaveAttribute('href', uploadedResumeUrl);
    await expect.poll(() => captures.resumeArtifactUpserts.length).toBe(1);
    expect(captures.resumeArtifactUpserts[0]).toMatchObject({
      user_id: userId,
      file_name: 'E2E-User-resume.pdf',
      file_url: uploadedResumeUrl,
      status: 'active',
    });
    await expect.poll(() => captures.resumeExportUpserts.some(payload => payload.method === 'provider-pdf')).toBe(true);

    await page.getByRole('button', { name: 'Copy Link' }).click();
    await expect.poll(() => page.evaluate(() => (
      (window as Window & { __lastResumeClipboard?: string }).__lastResumeClipboard
    ))).toBe(uploadedResumeUrl);

    await page.getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Delete Uploaded PDF' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(deleteDialog).toBeHidden();
    expect(captures.fileDeletes).toEqual([]);

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete Uploaded PDF' }).getByRole('button', { name: 'Delete PDF' }).click();
    await expect.poll(() => captures.fileDeletes.length).toBe(1);
    expect(captures.fileDeletes[0]).toEqual({ url: uploadedResumeUrl });
    await expect.poll(() => captures.resumeArtifactUpdates.length).toBe(1);
    expect(captures.resumeArtifactUpdates[0].payload).toMatchObject({
      status: 'deleted',
    });
    expect(captures.resumeArtifactUpdates[0].id).toBe(String(captures.resumeArtifactUpserts[0].id));
    await expect(page.getByText('Deleted PDF Receipts')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open PDF' })).toBeHidden();
  });

  test('reviews an AI resume draft, applies selected fields, and saves after review', async ({ page }) => {
    const captures = createCaptures();
    await installResumeWorkflowStubs(page, buildResumeProfileFixture(), captures);

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
    await seedAiResumeDraftState(page, aiResumeDraftText);

    const importDialog = page.getByRole('dialog', { name: 'Review AI Resume Draft' });
    await expect(importDialog).toBeVisible();
    await expect(importDialog.getByText('AI resume draft', { exact: true })).toBeVisible();
    await expect(importDialog.getByText('Principal Talent Workflow Strategist', { exact: true })).toBeVisible();

    await importDialog.getByLabel(/Phone/).uncheck();
    await importDialog.getByRole('button', { name: 'Apply Selected' }).click();
    await expect(importDialog).toBeHidden();

    await expect(page.getByLabel('Headline')).toHaveValue('Principal Talent Workflow Strategist');
    await expect(page.getByLabel('Phone')).toHaveValue('+1 555 0100');
    await expect(page.getByLabel('Location')).toHaveValue('Denver, CO');
    await expect(page.getByLabel('Website')).toHaveValue('https://resume.example/ai-review');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect.poll(() => captures.userProfileUpdates.length).toBe(1);
    expect(captures.userProfileUpdates[0]).toMatchObject({
      headline: 'Principal Talent Workflow Strategist',
      phone: '+1 555 0100',
      location: 'Denver, CO',
      website: 'https://resume.example/ai-review',
      summary: 'I lead AI-assisted hiring systems from discovery through adoption with clear accessibility and governance practices.',
    });
  });

  test('discards an AI resume draft without saving editor fields', async ({ page }) => {
    const captures = createCaptures();
    await installResumeWorkflowStubs(page, buildResumeProfileFixture(), captures);

    await page.goto('/resume');
    await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible();
    await seedAiResumeDraftState(page, aiResumeDraftText);

    const importDialog = page.getByRole('dialog', { name: 'Review AI Resume Draft' });
    await expect(importDialog).toBeVisible();
    await importDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(importDialog).toBeHidden();

    await expect(page.getByLabel('Headline')).toHaveValue('Product operations lead');
    await expect(page.getByLabel('Phone')).toHaveValue('+1 555 0100');
    await expect(page.getByLabel('Location')).toHaveValue('Remote');
    await expect(page.getByLabel('Website')).toHaveValue('https://portfolio.example/e2e');
    expect(captures.userProfileUpdates).toEqual([]);
  });
});
