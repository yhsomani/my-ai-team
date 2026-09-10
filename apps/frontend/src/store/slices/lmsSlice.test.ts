import { describe, expect, it } from 'vitest';
import lmsReducer, {
  clearLmsError,
  fetchCourses,
  selectAllCourses,
  selectCourseById,
} from './lmsSlice';
import type { Course } from '../../types/lms';

describe('lmsSlice', () => {
  const initial = {
    ids: [],
    entities: {},
    status: 'idle',
    error: null,
    courseTotal: null,
    coursePageSize: 12,
    courseOffset: 0,
    hasNextCoursePage: false,
    courseNextCursor: null,
  };

  const sampleCourse: Course = {
    id: 'course-1',
    title: 'Fullstack TypeScript Mastery',
    description: 'Learn end-to-end fullstack web development.',
    provider: 'TalentSphere Academy',
    status: 'NOT_STARTED',
    progress: 0,
    category: 'Engineering',
    difficulty: 'Normal',
  };

  it('handles initial state', () => {
    expect(lmsReducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('handles fetchCourses.pending', () => {
    const state = lmsReducer(initial, { type: fetchCourses.pending.type });
    expect(state.status).toBe('loading');
  });

  it('handles fetchCourses.fulfilled with pagination payload', () => {
    const payload = {
      courses: [sampleCourse],
      total: 45,
      limit: 12,
      offset: 0,
      hasNext: true,
      nextCursor: 'cursor-2',
    };

    const state = lmsReducer(initial, {
      type: fetchCourses.fulfilled.type,
      payload,
    });

    expect(state.status).toBe('succeeded');
    expect(state.ids).toEqual(['course-1']);
    expect(state.entities['course-1']).toEqual(sampleCourse);
    expect(state.courseTotal).toBe(45);
    expect(state.coursePageSize).toBe(12);
    expect(state.courseOffset).toBe(0);
    expect(state.hasNextCoursePage).toBe(true);
    expect(state.courseNextCursor).toBe('cursor-2');
  });

  it('handles fetchCourses.rejected', () => {
    const state = lmsReducer(initial, {
      type: fetchCourses.rejected.type,
      error: { message: 'Course catalog service unavailable' },
    });

    expect(state.status).toBe('failed');
    expect(state.error).toBe('Course catalog service unavailable');
  });

  it('clears LMS error with clearLmsError action', () => {
    const errorState = {
      ...initial,
      status: 'failed' as const,
      error: 'Failed to fetch courses',
    };

    const nextState = lmsReducer(errorState, clearLmsError());
    expect(nextState.error).toBeNull();
  });

  it('selects courses using entity adapter selectors', () => {
    const rootState: any = {
      lms: {
        ids: ['course-1'],
        entities: { 'course-1': sampleCourse },
        status: 'succeeded',
        error: null,
        courseTotal: 1,
        coursePageSize: 12,
        courseOffset: 0,
        hasNextCoursePage: false,
        courseNextCursor: null,
      },
    };

    expect(selectAllCourses(rootState)).toEqual([sampleCourse]);
    expect(selectCourseById(rootState, 'course-1')).toEqual(sampleCourse);
    expect(selectCourseById(rootState, 'course-999')).toBeUndefined();
  });
});
