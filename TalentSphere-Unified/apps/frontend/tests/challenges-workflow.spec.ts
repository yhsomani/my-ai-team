import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const currentUserId = 'e2e-role_user';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const challengeCards = (page: Page, title: string) => page
  .locator('.surface-card')
  .filter({ hasText: new RegExp(escapeRegExp(title)) });

const catalogChallengeCard = (page: Page, title: string) => challengeCards(page, title).last();

const starterCode = [
  'function solve(input) {',
  '  return input.trim();',
  '}',
].join('\n');

const passingSolution = [
  'function solve(input) {',
  '  return input.trim().toUpperCase();',
  '}',
].join('\n');

const challengeRows = [
  {
    id: 'challenge-string-normalizer',
    title: 'String Normalizer',
    description: 'Normalize text input and return a canonical uppercase answer.',
    category: 'ALGORITHMS',
    difficulty: 'MEDIUM',
    xp_reward: 80,
    starter_code: starterCode,
    test_cases: [
      {
        id: 'case-uppercase-1',
        description: 'Trims and uppercases a two-word phrase.',
        input: 'level up',
        expectedOutput: 'LEVEL UP',
      },
      {
        id: 'case-uppercase-2',
        description: 'Preserves numbers while normalizing letters.',
        input: 'plan 2026',
        expectedOutput: 'PLAN 2026',
      },
    ],
    time_limit_minutes: 30,
    is_published: true,
    created_at: '2026-06-27T10:00:00.000Z',
    updated_at: '2026-06-27T10:00:00.000Z',
  },
  {
    id: 'challenge-layout-review',
    title: 'Interface Layout Review',
    description: 'Review a compact interface and identify hierarchy issues.',
    category: 'DESIGN',
    difficulty: 'EASY',
    xp_reward: 50,
    starter_code: starterCode,
    test_cases: [],
    time_limit_minutes: 20,
    is_published: true,
    created_at: '2026-06-26T10:00:00.000Z',
    updated_at: '2026-06-26T10:00:00.000Z',
  },
];

test.describe('challenges workflow', () => {
  test('solves a challenge with local checks, reset review, submission, and retry history', async ({ page, browserName }) => {
    const submissionRows: Record<string, unknown>[] = [
      {
        id: 'challenge-submission-prior',
        challenge_id: 'challenge-string-normalizer',
        user_id: currentUserId,
        language: 'javascript',
        code_submitted: 'function solve(input) { return input; }',
        passed_tests: false,
        score: 40,
        feedback: 'Visible sample case 1 did not match.',
        submitted_at: '2026-06-26T09:00:00.000Z',
      },
    ];
    const submissionWrites: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        challenges: challengeRows,
        challengeSubmissions: submissionRows,
        onChallengeSubmissionInsert: (payload) => {
          submissionWrites.push(payload);
          const response = {
            id: 'challenge-submission-latest',
            challenge_id: payload.challenge_id,
            user_id: payload.user_id,
            language: payload.language,
            code_submitted: payload.code_submitted,
            passed_tests: true,
            score: 100,
            execution_time_ms: 38,
            memory_used_kb: 256,
            feedback: 'All visible sample cases passed.',
            submitted_at: '2026-06-27T10:30:00.000Z',
          };
          submissionRows.unshift(response);
          return response;
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/challenges');
    await expect(page.getByRole('heading', { name: /^Challenges$/ })).toBeVisible();
    await expect(catalogChallengeCard(page, 'String Normalizer')).toBeVisible();

    await page.getByRole('button', { name: 'Algorithms' }).click();
    await expect(page.getByRole('button', { name: 'Algorithms' })).toHaveAttribute('aria-pressed', 'true');
    await expect(catalogChallengeCard(page, 'String Normalizer')).toBeVisible();
    await expect(challengeCards(page, 'Interface Layout Review')).toHaveCount(0);

    await catalogChallengeCard(page, 'String Normalizer').getByRole('button', { name: 'Solve String Normalizer' }).click();
    const challengeDialog = page.getByRole('dialog', { name: 'String Normalizer' });
    await expect(challengeDialog).toBeVisible();
    await expect(challengeDialog.getByText('Prompt')).toBeVisible();
    await expect(challengeDialog.getByText('Sample Cases')).toBeVisible();
    await expect(challengeDialog.getByText('Retry History')).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 1')).toBeVisible();
    await expect(challengeDialog).toContainText('FAILED');
    await expect(challengeDialog.getByText('Score 40')).toBeVisible();

    const codeEditor = challengeDialog.getByLabel('Solution code');
    await expect(codeEditor).toHaveValue(starterCode);
    await codeEditor.fill(passingSolution);

    await challengeDialog.getByRole('button', { name: 'Run Local Check' }).click();
    if (browserName === 'webkit') {
      await expect(page.getByRole('heading', { name: 'Review local check' })).toBeVisible();
      await expect(challengeDialog.getByText(/0\/2 visible sample cases matched locally\./)).toBeVisible();
      await expect(challengeDialog.getByText('Could not run', { exact: true })).toHaveCount(2);
    } else {
      await expect(page.getByRole('heading', { name: 'Local check passed' })).toBeVisible();
      await expect(challengeDialog.getByText('2/2 visible sample cases matched locally.')).toBeVisible();
      await expect(challengeDialog.getByText('Matched', { exact: true })).toHaveCount(2);
    }

    await challengeDialog.getByRole('button', { name: 'Reset' }).click();
    await expect(challengeDialog.getByRole('alert')).toContainText('Reset solution to starter code?');
    await challengeDialog.getByRole('button', { name: 'Keep Code' }).click();
    await expect(codeEditor).toHaveValue(passingSolution);

    await challengeDialog.getByRole('button', { name: 'Reset' }).click();
    await challengeDialog.getByRole('button', { name: 'Reset Code' }).click();
    await expect(codeEditor).toHaveValue(starterCode);
    await codeEditor.fill(passingSolution);

    await challengeDialog.getByRole('button', { name: 'Submit Solution' }).click();
    await expect.poll(() => submissionWrites.length).toBe(1);
    expect(submissionWrites[0]).toMatchObject({
      challenge_id: 'challenge-string-normalizer',
      user_id: currentUserId,
      language: 'javascript',
      code_submitted: passingSolution,
    });

    await expect(page.getByRole('heading', { name: 'Solution submitted' })).toBeVisible();
    await expect(challengeDialog).toContainText('PASSED');
    await expect(challengeDialog.getByText('Score: 100')).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 2')).toBeVisible();
    await expect(challengeDialog).toContainText('All visible sample cases passed.');

    await challengeDialog.getByRole('button', { name: 'Refresh submission history' }).click();
    await expect(challengeDialog.getByText('Attempt 2')).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 1')).toBeVisible();
  });

  test('handles unsupported local-check languages and hidden sample cases without submitting', async ({ page }) => {
    const submissionWrites: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        challenges: challengeRows,
        challengeSubmissions: [],
        onChallengeSubmissionInsert: (payload) => {
          submissionWrites.push(payload);
          return payload;
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/challenges');
    await expect(page.getByRole('heading', { name: /^Challenges$/ })).toBeVisible();

    await catalogChallengeCard(page, 'String Normalizer').getByRole('button', { name: 'Solve String Normalizer' }).click();
    const codeChallengeDialog = page.getByRole('dialog', { name: 'String Normalizer' });
    await expect(codeChallengeDialog).toBeVisible();
    await codeChallengeDialog.getByLabel('Language').selectOption('python');
    await expect(codeChallengeDialog.getByLabel('Language')).toHaveValue('python');
    await codeChallengeDialog.getByLabel('Solution code').fill('print("LEVEL UP")');
    await codeChallengeDialog.getByRole('button', { name: 'Run Local Check' }).click();
    await expect(page.getByRole('heading', { name: 'Local check unavailable' })).toBeVisible();
    await expect(codeChallengeDialog.getByText('Matched', { exact: true })).toHaveCount(0);

    await codeChallengeDialog.getByRole('button', { name: 'Close modal' }).click();
    await page.getByRole('button', { name: 'Design' }).click();
    await expect(page.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true');
    await expect(catalogChallengeCard(page, 'Interface Layout Review')).toBeVisible();
    await expect(challengeCards(page, 'String Normalizer')).toHaveCount(0);

    await catalogChallengeCard(page, 'Interface Layout Review').getByRole('button', { name: 'Solve Interface Layout Review' }).click();
    const hiddenSampleDialog = page.getByRole('dialog', { name: 'Interface Layout Review' });
    await expect(hiddenSampleDialog).toBeVisible();
    await expect(hiddenSampleDialog.getByText('Test cases are hidden for this challenge.')).toBeVisible();
    await hiddenSampleDialog.getByLabel('Solution code').fill(passingSolution);
    await hiddenSampleDialog.getByRole('button', { name: 'Run Local Check' }).click();
    await expect(page.getByRole('heading', { name: 'No visible sample cases' })).toBeVisible();
    await expect.poll(() => submissionWrites.length).toBe(0);
  });

  test('keeps the workspace open and retry history unchanged when submission fails', async ({ page }) => {
    const submissionRows: Record<string, unknown>[] = [
      {
        id: 'challenge-submission-prior',
        challenge_id: 'challenge-string-normalizer',
        user_id: currentUserId,
        language: 'javascript',
        code_submitted: starterCode,
        passed_tests: false,
        score: 40,
        feedback: 'Visible sample case 1 did not match.',
        submitted_at: '2026-06-26T09:00:00.000Z',
      },
    ];
    const submissionWrites: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        challenges: challengeRows,
        challengeSubmissions: submissionRows,
        onChallengeSubmissionInsert: (payload) => {
          submissionWrites.push(payload);
          throw new Error('Submission sync failed in E2E fixture');
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/challenges');
    await expect(page.getByRole('heading', { name: /^Challenges$/ })).toBeVisible();
    await catalogChallengeCard(page, 'String Normalizer').getByRole('button', { name: 'Solve String Normalizer' }).click();

    const challengeDialog = page.getByRole('dialog', { name: 'String Normalizer' });
    await expect(challengeDialog).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 1')).toBeVisible();

    await challengeDialog.getByLabel('Solution code').fill(passingSolution);
    await challengeDialog.getByRole('button', { name: 'Submit Solution' }).click();
    await expect.poll(() => submissionWrites.length).toBe(1);
    expect(submissionWrites[0]).toMatchObject({
      challenge_id: 'challenge-string-normalizer',
      user_id: currentUserId,
      language: 'javascript',
      code_submitted: passingSolution,
    });

    await expect(page.getByRole('heading', { name: 'Submission failed' })).toBeVisible();
    await expect(challengeDialog).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 1')).toBeVisible();
    await expect(challengeDialog.getByText('Attempt 2')).toHaveCount(0);
    await expect(challengeDialog).toContainText('FAILED');
    await expect(challengeDialog.getByText('Score: 40')).toBeVisible();
  });
});
