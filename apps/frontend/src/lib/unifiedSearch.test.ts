import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  isUnifiedSearchTermValid,
  runUnifiedSearch,
  searchChallengesForUnifiedSearch,
  UNIFIED_SEARCH_MIN_TERM_LENGTH,
} from './unifiedSearch';
import type { Job } from '../types/job';
import type { Course } from '../types/lms';
import type { Challenge } from '../types/challenges';

vi.mock('../services/jobService', () => ({
  jobService: {
    getJobsPage: vi.fn(),
  },
}));

vi.mock('../services/lmsService', () => ({
  lmsService: {
    getCoursesPage: vi.fn(),
  },
}));

vi.mock('../services/challengeService', () => ({
  challengeService: {
    getChallenges: vi.fn(),
  },
}));

const { jobService } = await import('../services/jobService');
const { lmsService } = await import('../services/lmsService');
const { challengeService } = await import('../services/challengeService');

const mockedGetJobsPage = jobService.getJobsPage as ReturnType<typeof vi.fn>;
const mockedGetCoursesPage = lmsService.getCoursesPage as ReturnType<typeof vi.fn>;
const mockedGetChallenges = challengeService.getChallenges as ReturnType<typeof vi.fn>;

const buildJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  title: 'Frontend Engineer',
  description: '',
  companyId: 'company-1',
  companyName: 'Acme',
  location: 'Berlin',
  jobType: 'FULL_TIME',
  requirements: [],
  postedAt: new Date().toISOString(),
  status: 'PUBLISHED',
  ...overrides,
});

const buildCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  title: 'Advanced TypeScript',
  provider: 'Internal Academy',
  status: 'NOT_STARTED',
  progress: 0,
  category: 'Engineering',
  ...overrides,
});

const buildChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
  id: 'challenge-1',
  title: 'Typing Speed Run',
  description: 'Type fast under time pressure.',
  difficulty: 'Normal',
  category: 'Algorithms',
  xpReward: 120,
  xp_reward: 120,
  ...overrides,
} as Challenge);

describe('unifiedSearch', () => {
  beforeEach(() => {
    mockedGetJobsPage.mockReset();
    mockedGetCoursesPage.mockReset();
    mockedGetChallenges.mockReset();
  });

  it('treats terms below the minimum length as invalid search input', () => {
    expect(UNIFIED_SEARCH_MIN_TERM_LENGTH).toBe(2);
    expect(isUnifiedSearchTermValid('')).toBe(false);
    expect(isUnifiedSearchTermValid(' a ')).toBe(false);
    expect(isUnifiedSearchTermValid('re')).toBe(true);
  });

  it('returns an empty response without querying services for short terms', async () => {
    const response = await runUnifiedSearch('  ');

    expect(response).toEqual({ jobs: [], courses: [], challenges: [], errors: [] });
    expect(mockedGetJobsPage).not.toHaveBeenCalled();
    expect(mockedGetCoursesPage).not.toHaveBeenCalled();
    expect(mockedGetChallenges).not.toHaveBeenCalled();
  });

  it('aggregates jobs, courses, and challenges for a valid term', async () => {
    mockedGetJobsPage.mockResolvedValue({
      jobs: [buildJob()],
      total: 1,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    mockedGetCoursesPage.mockResolvedValue({
      courses: [buildCourse(), buildCourse({ id: 'course-2', title: 'Cooking Basics' })],
      total: 2,
      limit: 3,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    mockedGetChallenges.mockResolvedValue([
      buildChallenge(),
      buildChallenge({ id: 'challenge-2', title: 'Database Joins Drill', description: 'Practice join logic.' }),
    ]);

    const response = await runUnifiedSearch('type');

    expect(mockedGetJobsPage).toHaveBeenCalledWith({ search: 'type', limit: 4, status: 'PUBLISHED' });
    expect(mockedGetCoursesPage).toHaveBeenCalledWith({ search: 'type', limit: 3 });
    expect(mockedGetChallenges).toHaveBeenCalledWith(true);

    expect(response.jobs).toHaveLength(1);
    expect(response.courses.map(course => course.id)).toEqual(['course-1']);
    expect(response.challenges.map(challenge => challenge.id)).toEqual(['challenge-1']);
    expect(response.errors).toEqual([]);
  });

  it('isolates per-source failures and reports which sources degraded', async () => {
    mockedGetJobsPage.mockRejectedValue(new Error('jobs unavailable'));
    mockedGetCoursesPage.mockResolvedValue({
      courses: [buildCourse()],
      total: 1,
      limit: 3,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    mockedGetChallenges.mockRejectedValue(new Error('challenges unavailable'));

    const response = await runUnifiedSearch('eng');

    expect(response.jobs).toEqual([]);
    expect(response.courses).toHaveLength(1);
    expect(response.challenges).toEqual([]);
    expect(response.errors.map(error => error.source)).toEqual(['jobs', 'challenges']);
  });

  it('filters challenges client-side across title, category, and description', async () => {
    mockedGetChallenges.mockResolvedValue([
      buildChallenge(),
      buildChallenge({ id: 'challenge-2', title: 'Graph Traversal', description: 'BFS and DFS practice.', category: 'Algorithms' }),
      buildChallenge({ id: 'challenge-3', title: 'SQL Windows', category: 'Database' }),
    ]);

    const byCategory = await searchChallengesForUnifiedSearch('algorithms');
    expect(byCategory.map(challenge => challenge.id)).toEqual(['challenge-1', 'challenge-2']);

    const byDescription = await searchChallengesForUnifiedSearch('dfs');
    expect(byDescription.map(challenge => challenge.id)).toEqual(['challenge-2']);
  });
});
