import { jobService } from '../services/jobService';
import { lmsService } from '../services/lmsService';
import { challengeService } from '../services/challengeService';
import type { Job } from '../types/job';
import type { Course } from '../types/lms';
import type { Challenge } from '../types/challenges';

export const UNIFIED_SEARCH_MIN_TERM_LENGTH = 2;

export interface UnifiedSearchSourceError {
  source: 'jobs' | 'courses' | 'challenges';
  message: string;
}

export interface UnifiedSearchResponse {
  jobs: Job[];
  courses: Course[];
  challenges: Challenge[];
  errors: UnifiedSearchSourceError[];
}

const normalizeTerm = (term: string) => term.trim().toLowerCase();

const matchesTerm = (term: string, values: Array<string | undefined | null>) => {
  const normalized = normalizeTerm(term);
  if (!normalized) return false;

  return values.some(value => (value || '').toLowerCase().includes(normalized));
};

export const isUnifiedSearchTermValid = (term: string) => (
  term.trim().length >= UNIFIED_SEARCH_MIN_TERM_LENGTH
);

export const searchJobsForUnifiedSearch = async (term: string): Promise<Job[]> => {
  const page = await jobService.getJobsPage({ search: term.trim(), limit: 4, status: 'PUBLISHED' });
  return page.jobs;
};

export const searchCoursesForUnifiedSearch = async (term: string): Promise<Course[]> => {
  const page = await lmsService.getCoursesPage({ search: term.trim(), limit: 3 });
  return page.courses.filter(course => matchesTerm(term, [course.title, course.category, course.provider]));
};

export const searchChallengesForUnifiedSearch = async (term: string): Promise<Challenge[]> => {
  const challenges = await challengeService.getChallenges(true);
  return challenges
    .filter(challenge => matchesTerm(term, [challenge.title, challenge.category, challenge.description]))
    .slice(0, 3);
};

export const runUnifiedSearch = async (term: string): Promise<UnifiedSearchResponse> => {
  if (!isUnifiedSearchTermValid(term)) {
    return { jobs: [], courses: [], challenges: [], errors: [] };
  }

  const [jobsSettled, coursesSettled, challengesSettled] = await Promise.allSettled([
    searchJobsForUnifiedSearch(term),
    searchCoursesForUnifiedSearch(term),
    searchChallengesForUnifiedSearch(term),
  ]);

  const errors: UnifiedSearchSourceError[] = [];

  const jobs = jobsSettled.status === 'fulfilled' ? jobsSettled.value : [];
  if (jobsSettled.status === 'rejected') {
    errors.push({ source: 'jobs', message: 'Job search is unavailable right now.' });
  }

  const courses = coursesSettled.status === 'fulfilled' ? coursesSettled.value : [];
  if (coursesSettled.status === 'rejected') {
    errors.push({ source: 'courses', message: 'Course search is unavailable right now.' });
  }

  const challenges = challengesSettled.status === 'fulfilled' ? challengesSettled.value : [];
  if (challengesSettled.status === 'rejected') {
    errors.push({ source: 'challenges', message: 'Challenge search is unavailable right now.' });
  }

  return { jobs, courses, challenges, errors };
};
