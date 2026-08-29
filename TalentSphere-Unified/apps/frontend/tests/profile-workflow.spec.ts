import { expect, type Page, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';
const profileId = 'profile-e2e-user';
const currentAvatarUrl = 'https://files.example/avatars/current-profile.jpg';
const uploadedAvatarUrl = 'https://files.example/avatars/profile-uploaded.jpg';

const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);
const pngFixtureDataUrl = `data:image/png;base64,${pngFixture.toString('base64')}`;

const buildProfileFixture = (overrides: JsonRecord = {}): JsonRecord => ({
  id: profileId,
  user_id: userId,
  headline: '',
  summary: '',
  current_role: '',
  bio: '',
  location: '',
  phone: '',
  website: 'https://portfolio.example',
  linkedin_url: '',
  github_url: '',
  connectionCount: 7,
  applicationCount: 3,
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
  skills: [],
  experiences: [
    {
      id: 'experience-current',
      profile_id: profileId,
      title: 'Product Designer',
      company: 'Northstar Labs',
      location: 'Remote',
      start_date: '2024-01-01',
      end_date: null,
      current: true,
      description: 'Design systems and React component libraries for hiring workflows.',
    },
  ],
  educations: [],
  achievements: [
    {
      title: 'Profile Builder',
      description: 'Completed a first profile pass.',
    },
  ],
  ...overrides,
});

const seedAiProfileDraftState = async (page: Page, recommendationText: string) => {
  await page.evaluate((draftText) => {
    window.history.replaceState({
      usr: {
        aiProfileDraft: {
          recommendationId: 'ai-profile-e2e-001',
          recommendationText: draftText,
          sourceLabel: 'TalentSphere AI assistant',
          openedAt: '2026-06-27T10:00:00.000Z',
        },
      },
      key: 'profile-ai-e2e',
      idx: 0,
    }, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  }, recommendationText);
};

const installProfileWorkflowStubs = async (
  page: Page,
  profile: JsonRecord,
  captures: {
    userProfileUpdates: JsonRecord[];
    avatarUpdates: JsonRecord[];
    skillInserts: JsonRecord[];
    skillUpdates: Array<{ payload: JsonRecord; id?: string }>;
    skillDeletes: Array<{ id?: string }>;
    experienceUpdates: Array<{ payload: JsonRecord; id?: string }>;
    experienceDeletes: Array<{ id?: string }>;
    educationInserts: JsonRecord[];
    educationUpdates: Array<{ payload: JsonRecord; id?: string }>;
    educationDeletes: Array<{ id?: string }>;
    fileUploads: Array<{ contentType?: string; postData?: string }>;
    fileDeletes: Array<{ url?: string | null }>;
  },
) => {
  await installNetworkStubs(page, {
    api: {
      onFileUpload: (context) => {
        captures.fileUploads.push(context);
        return { data: { url: uploadedAvatarUrl } };
      },
      onFileDelete: (context) => {
        captures.fileDeletes.push(context);
      },
    },
    rest: {
      profile,
      onUserProfileUpdate: (payload, context) => {
        captures.userProfileUpdates.push(payload);
        return {
          ...profile,
          ...payload,
          user_id: context.userId || profile.user_id,
          updated_at: '2026-06-27T10:05:00.000Z',
        };
      },
      onProfileIdentityUpdate: (payload, context) => {
        captures.avatarUpdates.push(payload);
        return {
          id: context.id || userId,
          avatar_url: typeof payload.avatar_url === 'string' ? payload.avatar_url : null,
          updated_at: '2026-06-27T10:05:00.000Z',
        };
      },
      onSkillInsert: (payload) => {
        captures.skillInserts.push(payload);
        return {
          id: 'skill-react-e2e',
          profile_id: profileId,
          created_at: '2026-06-27T10:05:00.000Z',
          updated_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
      onSkillUpdate: (payload, context) => {
        captures.skillUpdates.push({ payload, id: context.id });
        return {
          id: context.id || 'skill-react-e2e',
          profile_id: profileId,
          updated_at: '2026-06-27T10:06:00.000Z',
          ...payload,
        };
      },
      onSkillDelete: (context) => {
        captures.skillDeletes.push(context);
      },
      onExperienceUpdate: (payload, context) => {
        captures.experienceUpdates.push({ payload, id: context.id });
        return {
          id: context.id || 'experience-current',
          profile_id: profileId,
          updated_at: '2026-06-27T10:06:00.000Z',
          ...payload,
        };
      },
      onExperienceDelete: (context) => {
        captures.experienceDeletes.push(context);
      },
      onEducationInsert: (payload) => {
        captures.educationInserts.push(payload);
        return {
          id: 'education-state-e2e',
          profile_id: profileId,
          created_at: '2026-06-27T10:05:00.000Z',
          updated_at: '2026-06-27T10:05:00.000Z',
          ...payload,
        };
      },
      onEducationUpdate: (payload, context) => {
        captures.educationUpdates.push({ payload, id: context.id });
        return {
          id: context.id || 'education-state-e2e',
          profile_id: profileId,
          updated_at: '2026-06-27T10:06:00.000Z',
          ...payload,
        };
      },
      onEducationDelete: (context) => {
        captures.educationDeletes.push(context);
      },
    },
  });
};

const createCaptures = () => ({
  userProfileUpdates: [] as JsonRecord[],
  avatarUpdates: [] as JsonRecord[],
  skillInserts: [] as JsonRecord[],
  skillUpdates: [] as Array<{ payload: JsonRecord; id?: string }>,
  skillDeletes: [] as Array<{ id?: string }>,
  experienceUpdates: [] as Array<{ payload: JsonRecord; id?: string }>,
  experienceDeletes: [] as Array<{ id?: string }>,
  educationInserts: [] as JsonRecord[],
  educationUpdates: [] as Array<{ payload: JsonRecord; id?: string }>,
  educationDeletes: [] as Array<{ id?: string }>,
  fileUploads: [] as Array<{ contentType?: string; postData?: string }>,
  fileDeletes: [] as Array<{ url?: string | null }>,
});

test.describe('profile workflow', () => {
  test('reviews AI draft, applies suggestions, manages rows, and switches profile tabs', async ({ page }) => {
    const captures = createCaptures();
    const profile = buildProfileFixture();

    await installProfileWorkflowStubs(page, profile, captures);
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await seedAiProfileDraftState(page, [
      'Headline: Design Systems Lead',
      'Location: Remote',
      'Bio: I build accessible hiring workflows with measurable product outcomes.',
    ].join('\n'));
    const aiDraftDialog = page.getByRole('dialog', { name: 'Review AI Profile Draft' });
    await expect(aiDraftDialog).toBeVisible();
    await expect(aiDraftDialog.getByText('Design Systems Lead')).toBeVisible();
    await aiDraftDialog.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => captures.userProfileUpdates.length).toBe(1);
    expect(captures.userProfileUpdates[0]).toMatchObject({
      headline: 'Design Systems Lead',
      location: 'Remote',
      bio: 'I build accessible hiring workflows with measurable product outcomes.',
    });
    await expect(aiDraftDialog).toBeHidden();
    await expect(page.getByText('Profile Updated')).toBeVisible();
    await expect(page.getByText('Design Systems Lead')).toBeVisible();
    await expect(page.getByText('I build accessible hiring workflows with measurable product outcomes.')).toBeVisible();

    await page.getByRole('button', { name: 'Review skill' }).click();
    const addSkillDialog = page.getByRole('dialog', { name: 'Add Skill' });
    await expect(addSkillDialog).toBeVisible();
    await expect(addSkillDialog.getByLabel('Skill')).toHaveValue('React');
    await addSkillDialog.getByLabel('Years').fill('5');
    await addSkillDialog.getByRole('button', { name: 'Save' }).click();

    await expect.poll(() => captures.skillInserts.length).toBe(1);
    expect(captures.skillInserts[0]).toMatchObject({
      profile_id: profileId,
      name: 'React',
      proficiency: 'INTERMEDIATE',
      years_of_experience: 5,
    });
    await expect(page.getByText('React')).toBeVisible();

    await page.getByRole('button', { name: 'Edit skill React' }).click();
    const editSkillDialog = page.getByRole('dialog', { name: 'Edit Skill' });
    await editSkillDialog.getByLabel('Skill').fill('React Native');
    await editSkillDialog.getByLabel('Proficiency').selectOption('EXPERT');
    await editSkillDialog.getByLabel('Years').fill('6');
    await editSkillDialog.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => captures.skillUpdates.length).toBe(1);
    expect(captures.skillUpdates[0]).toMatchObject({
      id: 'skill-react-e2e',
      payload: {
        name: 'React Native',
        proficiency: 'EXPERT',
        years_of_experience: 6,
      },
    });
    await expect(page.getByText('React Native')).toBeVisible();

    await page.getByRole('button', { name: 'Remove skill React Native' }).click();
    const removeSkillDialog = page.getByRole('dialog', { name: 'Remove Profile Item' });
    await expect(removeSkillDialog).toBeVisible();
    await removeSkillDialog.getByRole('button', { name: 'Remove' }).click();

    await expect.poll(() => captures.skillDeletes.length).toBe(1);
    expect(captures.skillDeletes[0]).toEqual({ id: 'skill-react-e2e' });
    await expect(page.getByRole('button', { name: 'Edit skill React Native' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Experience' }).click();
    await expect(page.getByText('Product Designer')).toBeVisible();
    await page.getByRole('button', { name: 'Edit experience Product Designer' }).click();
    const editExperienceDialog = page.getByRole('dialog', { name: 'Edit Work Experience' });
    await editExperienceDialog.getByLabel('Title').fill('Principal Product Designer');
    await editExperienceDialog.getByLabel('Company').fill('Northstar Labs');
    await editExperienceDialog.getByLabel('Location').fill('Remote');
    await editExperienceDialog.getByLabel('Start Date').fill('2024-01-01');
    await editExperienceDialog.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => captures.experienceUpdates.length).toBe(1);
    expect(captures.experienceUpdates[0]).toMatchObject({
      id: 'experience-current',
      payload: {
        title: 'Principal Product Designer',
        company: 'Northstar Labs',
        location: 'Remote',
        start_date: '2024-01-01',
        current: true,
      },
    });
    await expect(page.getByText('Principal Product Designer')).toBeVisible();

    await page.getByRole('button', { name: 'Remove experience Principal Product Designer' }).click();
    const removeExperienceDialog = page.getByRole('dialog', { name: 'Remove Profile Item' });
    await expect(removeExperienceDialog.getByText('Principal Product Designer')).toBeVisible();
    await removeExperienceDialog.getByRole('button', { name: 'Remove' }).click();

    await expect.poll(() => captures.experienceDeletes.length).toBe(1);
    expect(captures.experienceDeletes[0]).toEqual({ id: 'experience-current' });
    await expect(page.getByText('No work experience added yet.')).toBeVisible();

    await page.getByRole('tab', { name: 'Education' }).click();
    await expect(page.getByText('No education history added yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Add education' }).click();
    const addEducationDialog = page.getByRole('dialog', { name: 'Add Education' });
    await addEducationDialog.getByLabel('Institution').fill('State University');
    await addEducationDialog.getByLabel('Degree').fill('B.S.');
    await addEducationDialog.getByLabel('Field of Study').fill('Human Computer Interaction');
    await addEducationDialog.getByLabel('Start Date').fill('2017-09-01');
    await addEducationDialog.getByLabel('End Date').fill('2021-05-15');
    await addEducationDialog.getByLabel('GPA').fill('3.8');
    await addEducationDialog.getByRole('button', { name: 'Save' }).click();

    await expect.poll(() => captures.educationInserts.length).toBe(1);
    expect(captures.educationInserts[0]).toMatchObject({
      profile_id: profileId,
      institution: 'State University',
      degree: 'B.S.',
      field_of_study: 'Human Computer Interaction',
      start_date: '2017-09-01',
      end_date: '2021-05-15',
      gpa: 3.8,
    });
    await expect(page.getByText('State University')).toBeVisible();

    await page.getByRole('button', { name: 'Edit education State University' }).click();
    const editEducationDialog = page.getByRole('dialog', { name: 'Edit Education' });
    await editEducationDialog.getByLabel('Institution').fill('State University Honors');
    await expect(editEducationDialog.getByLabel('Institution')).toHaveValue('State University Honors');
    await editEducationDialog.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => captures.educationUpdates.length).toBe(1);
    expect(captures.educationUpdates[0]).toMatchObject({
      id: 'education-state-e2e',
      payload: {
        institution: 'State University Honors',
      },
    });
    await expect(page.getByText('State University Honors')).toBeVisible();

    await page.getByRole('button', { name: 'Remove education State University Honors' }).click();
    const removeEducationDialog = page.getByRole('dialog', { name: 'Remove Profile Item' });
    await expect(removeEducationDialog.getByText('State University Honors')).toBeVisible();
    await removeEducationDialog.getByRole('button', { name: 'Remove' }).click();

    await expect.poll(() => captures.educationDeletes.length).toBe(1);
    expect(captures.educationDeletes[0]).toEqual({ id: 'education-state-e2e' });
    await expect(page.getByText('No education history added yet.')).toBeVisible();

    await page.getByRole('tab', { name: 'Achievements' }).click();
    await expect(page.getByText('Profile Builder')).toBeVisible();
  });

  test('discards an AI profile draft without saving profile fields', async ({ page }) => {
    const captures = createCaptures();
    const profile = buildProfileFixture();

    await installProfileWorkflowStubs(page, profile, captures);
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await seedAiProfileDraftState(page, 'Headline: Product Strategy Lead\nLocation: Austin\nBio: Draft copy that should not save.');
    const aiDraftDialog = page.getByRole('dialog', { name: 'Review AI Profile Draft' });
    await expect(aiDraftDialog).toBeVisible();
    await aiDraftDialog.getByRole('button', { name: 'Discard AI draft' }).click();
    await expect(page.getByText('AI draft discarded')).toBeVisible();
    await page.getByRole('dialog', { name: 'Edit Profile' }).getByRole('button', { name: 'Cancel' }).click();

    await expect.poll(() => captures.userProfileUpdates.length).toBe(0);
    await expect(page.getByText('Product Strategy Lead')).toHaveCount(0);
    await expect(page.getByText('No bio provided yet.')).toBeVisible();
  });

  test('uploads and removes a reviewed profile photo', async ({ browserName, page }) => {
    const captures = createCaptures();
    const profile = buildProfileFixture({
      headline: 'Product Designer',
      location: 'Remote',
      bio: 'Builds profile workflows.',
      profiles: {
        id: userId,
        email: 'e2e@talentsphere.test',
        first_name: 'E2E',
        last_name: 'User',
        full_name: 'E2E User',
        avatar_url: currentAvatarUrl,
      },
    });

    if (browserName === 'webkit') {
      await page.addInitScript((avatarDataUrl) => {
        const originalCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
        window.URL.createObjectURL = (value) => (
          value instanceof File && value.type.startsWith('image/')
            ? avatarDataUrl
            : originalCreateObjectURL(value)
        );
      }, pngFixtureDataUrl);
    }
    await installProfileWorkflowStubs(page, profile, captures);
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/profile');

    await expect(page.getByRole('button', { name: 'Update profile photo' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'profile-photo.png',
      mimeType: 'image/png',
      buffer: pngFixture,
    });

    const uploadDialog = page.getByRole('dialog', { name: 'Update Profile Photo' });
    await expect(uploadDialog).toBeVisible();
    await uploadDialog.getByLabel('Zoom').fill('150');
    await uploadDialog.getByRole('button', { name: 'Upload Photo' }).click();

    await expect.poll(() => captures.fileUploads.length, { timeout: 15000 }).toBe(1);
    expect(captures.fileUploads[0].postData).toContain('name="folder"');
    expect(captures.fileUploads[0].postData).toContain('avatars');
    await expect.poll(() => captures.avatarUpdates.length, { timeout: 15000 }).toBe(1);
    expect(captures.avatarUpdates[0]).toMatchObject({ avatar_url: uploadedAvatarUrl });
    await expect(page.getByText('Profile photo updated')).toBeVisible();

    await page.getByRole('button', { name: 'Remove profile photo' }).click();
    const removePhotoDialog = page.getByRole('dialog', { name: 'Remove Profile Photo' });
    await expect(removePhotoDialog).toBeVisible();
    await removePhotoDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(removePhotoDialog).toBeHidden();
    await expect.poll(() => captures.fileDeletes.length).toBe(0);

    await page.getByRole('button', { name: 'Remove profile photo' }).click();
    await page.getByRole('dialog', { name: 'Remove Profile Photo' }).getByRole('button', { name: 'Remove Photo' }).click();

    await expect.poll(() => captures.avatarUpdates.length).toBe(2);
    expect(captures.avatarUpdates[1]).toMatchObject({ avatar_url: null });
    await expect.poll(() => captures.fileDeletes.length).toBe(1);
    expect(captures.fileDeletes[0]).toEqual({ url: uploadedAvatarUrl });
    await expect(page.getByText('Profile photo removed')).toBeVisible();
  });
});
