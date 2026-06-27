import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const currentUserId = 'e2e-role_user';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const profileCards = (page: Page, name: string) => page
  .locator('.surface-card')
  .filter({ has: page.locator('p').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) }) });

const profileCard = (page: Page, name: string) => profileCards(page, name).first();

const buildProfile = ({
  id,
  name,
  role,
  location,
  skills,
}: {
  id: string;
  name: string;
  role: string;
  location: string;
  skills: string[];
}) => ({
  id,
  email: `${id}@example.test`,
  full_name: name,
  avatar_url: null,
  user_profiles: [{
    headline: role,
    current_role: role,
    location,
    skills: skills.map(name => ({ name })),
    experiences: [],
  }],
});

const profiles = [
  buildProfile({
    id: currentUserId,
    name: 'E2E User',
    role: 'Product Designer',
    location: 'Remote',
    skills: ['Design Systems', 'Research'],
  }),
  buildProfile({
    id: 'network-arya',
    name: 'Arya Rao',
    role: 'Design Systems Lead',
    location: 'Remote',
    skills: ['Design Systems', 'Accessibility'],
  }),
  buildProfile({
    id: 'network-ben',
    name: 'Ben Miles',
    role: 'Frontend Engineer',
    location: 'Austin',
    skills: ['React', 'TypeScript'],
  }),
  buildProfile({
    id: 'network-camila',
    name: 'Camila Reyes',
    role: 'Product Manager',
    location: 'Chicago',
    skills: ['Roadmapping', 'Research'],
  }),
  buildProfile({
    id: 'network-drew',
    name: 'Drew Kim',
    role: 'UX Researcher',
    location: 'Seattle',
    skills: ['Research', 'Interviewing'],
  }),
  buildProfile({
    id: 'network-eli',
    name: 'Eli Morgan',
    role: 'Hiring Partner',
    location: 'New York',
    skills: ['Hiring', 'Operations'],
  }),
  buildProfile({
    id: 'network-fay',
    name: 'Fay Lin',
    role: 'Engineering Manager',
    location: 'San Francisco',
    skills: ['Leadership', 'Platform'],
  }),
];

const networkingSuggestions = [
  {
    suggestedUserId: 'network-arya',
    mutualConnections: 2,
    recommendationScore: 92,
    recommendationReasons: ['Shares Design Systems', 'Based in Remote'],
  },
  {
    suggestedUserId: 'network-ben',
    mutualConnections: 1,
    recommendationScore: 81,
    recommendationReasons: ['Works in Frontend Engineering'],
  },
];

const connectionRows = [
  {
    id: 'connection-camila-incoming',
    requester_id: 'network-camila',
    receiver_id: currentUserId,
    status: 'PENDING',
    message: 'I would like to compare product discovery notes.',
    created_at: '2026-06-27T09:30:00.000Z',
    updated_at: '2026-06-27T09:30:00.000Z',
  },
  {
    id: 'connection-drew-incoming',
    requester_id: 'network-drew',
    receiver_id: currentUserId,
    status: 'PENDING',
    message: 'Open to sharing research playbooks.',
    created_at: '2026-06-27T09:00:00.000Z',
    updated_at: '2026-06-27T09:00:00.000Z',
  },
  {
    id: 'connection-eli-sent',
    requester_id: currentUserId,
    receiver_id: 'network-eli',
    status: 'PENDING',
    message: 'Following up after the talent ops discussion.',
    created_at: '2026-06-27T08:30:00.000Z',
    updated_at: '2026-06-27T08:30:00.000Z',
  },
  {
    id: 'connection-fay-accepted',
    requester_id: currentUserId,
    receiver_id: 'network-fay',
    status: 'ACCEPTED',
    message: null,
    created_at: '2026-06-26T08:00:00.000Z',
    updated_at: '2026-06-27T08:00:00.000Z',
  },
];

test.describe('networking workflow', () => {
  test('previews, hides, restores, and sends a reviewed connection request', async ({ page }) => {
    const connectionInserts: Record<string, unknown>[] = [];
    const preferenceUpserts: Record<string, unknown>[] = [];
    const preferenceDeletes: Array<{ suggestedUserId?: string; userId?: string }> = [];
    const connectionNote = 'Would like to compare accessible design system patterns.';

    await installNetworkStubs(page, {
      api: {
        networkingSuggestions,
      },
      rest: {
        connections: [],
        networkingSuggestionPreferences: [],
        profiles,
        onConnectionInsert: (payload) => {
          connectionInserts.push(payload);
          return {
            id: 'connection-arya-sent',
            ...payload,
            created_at: '2026-06-27T10:00:00.000Z',
            updated_at: '2026-06-27T10:00:00.000Z',
          };
        },
        onNetworkingSuggestionPreferenceUpsert: (payload) => {
          preferenceUpserts.push(payload);
          return {
            id: `preference-${payload.suggested_user_id}`,
            ...payload,
            created_at: '2026-06-27T10:01:00.000Z',
            updated_at: '2026-06-27T10:01:00.000Z',
          };
        },
        onNetworkingSuggestionPreferenceDelete: (context) => {
          preferenceDeletes.push(context);
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/networking');

    await expect(page.getByRole('heading', { name: /^Network$/ })).toBeVisible();
    await expect(page.getByText(/2 visible suggestions, 0 hidden/)).toBeVisible();
    await expect(profileCard(page, 'Arya Rao')).toBeVisible();
    await expect(profileCard(page, 'Ben Miles')).toBeVisible();

    await page.getByRole('button', { name: 'Preview Arya Rao' }).click();
    const previewDialog = page.getByRole('dialog', { name: 'Arya Rao' });
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByText('92% fit')).toBeVisible();
    await expect(previewDialog.getByText('Shares Design Systems')).toBeVisible();
    await previewDialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(previewDialog).toBeHidden();

    await page.getByRole('button', { name: 'Hide suggestion Ben Miles' }).click();
    await expect.poll(() => preferenceUpserts.length).toBe(1);
    expect(preferenceUpserts[0]).toMatchObject({
      user_id: currentUserId,
      suggested_user_id: 'network-ben',
      status: 'dismissed',
      reason: 'dismissed_from_discover',
    });
    await expect(profileCards(page, 'Ben Miles')).toHaveCount(0);
    await expect(page.getByText(/1 visible suggestions, 1 hidden/)).toBeVisible();

    await page.getByRole('button', { name: 'Show hidden' }).click();
    await expect.poll(() => preferenceDeletes.length).toBe(1);
    expect(preferenceDeletes[0]).toEqual({
      suggestedUserId: undefined,
      userId: currentUserId,
    });
    await expect(profileCard(page, 'Ben Miles')).toBeVisible();
    await expect(page.getByText(/2 visible suggestions, 0 hidden/)).toBeVisible();

    await page.getByLabel('Connection note for Arya Rao').fill(connectionNote);
    await page.getByRole('button', { name: /^Connect$/ }).first().click();

    await expect.poll(() => connectionInserts.length).toBe(1);
    expect(connectionInserts[0]).toMatchObject({
      requester_id: currentUserId,
      receiver_id: 'network-arya',
      status: 'PENDING',
      message: connectionNote,
    });
    await expect(page.getByRole('heading', { name: 'Request Sent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request Sent' })).toBeVisible();
  });

  test('reviews incoming, sent, reminder, withdraw, and accepted connection workflows', async ({ page }) => {
    const connectionUpdates: Array<{ id?: string; payload: Record<string, unknown> }> = [];

    await installNetworkStubs(page, {
      api: {
        networkingSuggestions: [],
      },
      rest: {
        connections: connectionRows,
        networkingSuggestionPreferences: [],
        notifications: [],
        profiles,
        onConnectionUpdate: (payload, context) => {
          connectionUpdates.push({ id: context.id, payload });
          return {
            ...(connectionRows.find(row => row.id === context.id) || connectionRows[0]),
            ...payload,
            updated_at: '2026-06-27T10:10:00.000Z',
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/networking');
    await expect(page.getByRole('heading', { name: /^Network$/ })).toBeVisible();

    await page.getByRole('tab', { name: /Incoming/ }).click();
    await expect(profileCard(page, 'Camila Reyes')).toBeVisible();
    await expect(profileCard(page, 'Drew Kim')).toBeVisible();

    await profileCard(page, 'Camila Reyes').getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => connectionUpdates.length).toBe(1);
    expect(connectionUpdates[0]).toMatchObject({
      id: 'connection-camila-incoming',
      payload: {
        status: 'ACCEPTED',
      },
    });
    await expect(page.getByRole('heading', { name: 'Connection accepted' })).toBeVisible();
    await expect(profileCards(page, 'Camila Reyes')).toHaveCount(0);

    await profileCard(page, 'Drew Kim').getByRole('button', { name: 'Decline' }).click();
    await expect.poll(() => connectionUpdates.length).toBe(2);
    expect(connectionUpdates[1]).toMatchObject({
      id: 'connection-drew-incoming',
      payload: {
        status: 'REJECTED',
      },
    });
    await expect(page.getByRole('heading', { name: 'Request declined' })).toBeVisible();
    await expect(profileCards(page, 'Drew Kim')).toHaveCount(0);

    await page.getByRole('tab', { name: /Sent/ }).click();
    await expect(profileCard(page, 'Eli Morgan')).toBeVisible();
    await page.getByLabel('Reminder timing for Eli Morgan').selectOption('tomorrow');
    await profileCard(page, 'Eli Morgan').getByRole('button', { name: 'Remind Me' }).click();
    await expect(profileCard(page, 'Eli Morgan').getByRole('button', { name: 'Clear Reminder' })).toBeVisible();
    await expect(page.getByText(/1 sent requests, 1 follow-up reminders/)).toBeVisible();

    await profileCard(page, 'Eli Morgan').getByRole('button', { name: 'Clear Reminder' }).click();
    await expect(profileCard(page, 'Eli Morgan').getByRole('button', { name: 'Remind Me' })).toBeVisible();
    await expect(page.getByText(/1 sent requests, 0 follow-up reminders/)).toBeVisible();

    await profileCard(page, 'Eli Morgan').getByRole('button', { name: 'Withdraw' }).click();
    await expect.poll(() => connectionUpdates.length).toBe(3);
    expect(connectionUpdates[2]).toMatchObject({
      id: 'connection-eli-sent',
      payload: {
        status: 'REJECTED',
      },
    });
    await expect(page.getByRole('heading', { name: 'Request withdrawn' })).toBeVisible();
    await expect(profileCards(page, 'Eli Morgan')).toHaveCount(0);

    await page.getByRole('tab', { name: /Connections/ }).click();
    await expect(profileCard(page, 'Fay Lin')).toBeVisible();
    await expect(profileCard(page, 'Camila Reyes')).toBeVisible();

    await profileCard(page, 'Fay Lin').getByRole('button', { name: 'Open Profile' }).click();
    const profileDialog = page.getByRole('dialog', { name: 'Fay Lin' });
    await expect(profileDialog).toBeVisible();
    await expect(profileDialog.getByText('Engineering Manager').first()).toBeVisible();
    await profileDialog.getByRole('button', { name: 'Close profile preview' }).click();
    await expect(profileDialog).toBeHidden();
  });

  test('opens accepted profile preview and full profile route from keyboard actions', async ({ page }) => {
    await installNetworkStubs(page, {
      api: {
        networkingSuggestions: [],
      },
      rest: {
        connections: connectionRows,
        networkingSuggestionPreferences: [],
        notifications: [],
        profiles,
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/networking');
    await expect(page.getByRole('heading', { name: /^Network$/ })).toBeVisible();

    const connectionsTab = page.getByRole('tab', { name: /Connections/ });
    await connectionsTab.focus();
    await expect(connectionsTab).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(profileCard(page, 'Fay Lin')).toBeVisible();

    const openProfileButton = profileCard(page, 'Fay Lin').getByRole('button', { name: 'Open Profile' });
    await openProfileButton.focus();
    await expect(openProfileButton).toBeFocused();
    await page.keyboard.press('Enter');

    const profileDialog = page.getByRole('dialog', { name: 'Fay Lin' });
    await expect(profileDialog).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    const fullProfileButton = profileDialog.getByRole('button', { name: 'Full Profile' });
    await fullProfileButton.focus();
    await expect(fullProfileButton).toBeFocused();
    await page.keyboard.press('Enter');

    const profilePage = await popupPromise;
    await expect(profilePage).toHaveURL(/\/profile\/network-fay$/);
    await profilePage.close();
  });
});
