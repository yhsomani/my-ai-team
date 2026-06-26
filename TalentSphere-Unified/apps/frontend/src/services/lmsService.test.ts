import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/axios';
import { supabase } from '../lib/supabaseClient';
import { lmsService } from './lmsService';

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const makeGatewayCourse = (id: string, title = `Course ${id}`) => ({
  id,
  title,
  slug: title.toLowerCase().replace(/ /g, '-'),
  instructorId: 'instructor-1',
  description: `${title} description`,
  xpReward: 50,
  category: 'Frontend',
  level: 'Beginner',
  lessonIds: [`${id}-lesson-1`, `${id}-lesson-2`],
});

const makeSupabaseCourse = (id: string, createdAt: string, title = `Course ${id}`) => ({
  id,
  title,
  slug: title.toLowerCase().replace(/ /g, '-'),
  description: `${title} description`,
  xp_reward: 50,
  category: 'Frontend',
  level: 'beginner',
  duration_hours: 2,
  is_published: true,
  created_at: createdAt,
  profiles: {
    full_name: 'Instructor One',
  },
});

const makeCourseQueryBuilder = (response: Record<string, unknown>) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue(response),
  limit: vi.fn().mockResolvedValue(response),
});

const makeLessonsQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
});

const makeMutationQueryBuilder = (singleResponse: Record<string, unknown> | Promise<unknown>) => ({
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => singleResponse instanceof Promise ? singleResponse : Promise.resolve(singleResponse)),
});

const makeEnrollmentListQueryBuilder = (orderResult: Record<string, unknown> | Promise<unknown>) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => orderResult instanceof Promise ? orderResult : Promise.resolve(orderResult)),
});

describe('lmsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lmsService.resetConnectivityState();
  });

  it('returns paginated course metadata from the API gateway', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [makeGatewayCourse('course-2', 'React Query')],
        total: 3,
      },
    });

    const result = await lmsService.getCoursesPage({
      category: 'Frontend',
      published: true,
      search: 'React Query',
      limit: 1,
      offset: 1,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/lms/courses', {
      params: {
        category: 'Frontend',
        published: true,
        search: 'React Query',
        limit: 1,
        offset: 1,
      },
      timeout: 5000,
    });
    expect(result.total).toBe(3);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(1);
    expect(result.hasNext).toBe(true);
    expect(result.courses[0]).toMatchObject({
      id: 'course-2',
      title: 'React Query',
      provider: 'instructor-1',
      xp: 50,
      category: 'Frontend',
      difficulty: 'Beginner',
    });
    expect(result.courses[0].lessons).toHaveLength(2);
  });

  it('preserves array return shape for getCourses', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [makeGatewayCourse('course-1', 'Platform Basics')],
      },
    });

    const result = await lmsService.getCourses();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/lms/courses', {
      params: {},
      timeout: 5000,
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('course-1');
  });

  it('paginates legacy full-array gateway responses on the client', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [
          makeGatewayCourse('course-1'),
          makeGatewayCourse('course-2'),
          makeGatewayCourse('course-3'),
          makeGatewayCourse('course-4'),
          makeGatewayCourse('course-5'),
        ],
      },
    });

    const result = await lmsService.getCoursesPage({
      limit: 2,
      offset: 2,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/lms/courses', {
      params: {
        limit: 2,
        offset: 2,
      },
      timeout: 5000,
    });
    expect(result.total).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.courses.map(course => course.id)).toEqual(['course-3', 'course-4']);
  });

  it('filters legacy full-array gateway responses before paginating search results', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [
          makeGatewayCourse('course-1', 'React Basics'),
          makeGatewayCourse('course-2', 'Design Systems'),
          makeGatewayCourse('course-3', 'Advanced React Patterns'),
        ],
      },
    });

    const result = await lmsService.getCoursesPage({
      search: 'React',
      limit: 1,
      offset: 1,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/lms/courses', {
      params: {
        search: 'React',
        limit: 1,
        offset: 1,
      },
      timeout: 5000,
    });
    expect(result.total).toBe(2);
    expect(result.hasNext).toBe(false);
    expect(result.courses.map(course => course.id)).toEqual(['course-3']);
  });

  it('filters gateway course responses by enrollment progress before paginating', async () => {
    (apiClient.get as any)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'enrollment-1',
              userId: 'user-1',
              courseId: 'course-2',
              status: 'IN_PROGRESS',
              progress: 45,
              enrolledAt: '2026-06-01T00:00:00.000Z',
              completedLessonIds: ['lesson-1'],
            },
            {
              id: 'enrollment-2',
              userId: 'user-1',
              courseId: 'course-3',
              status: 'COMPLETED',
              progress: 100,
              enrolledAt: '2026-06-02T00:00:00.000Z',
              completedAt: '2026-06-03T00:00:00.000Z',
              completedLessonIds: ['lesson-1', 'lesson-2'],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            makeGatewayCourse('course-1', 'Career Basics'),
            makeGatewayCourse('course-2', 'React Query'),
            makeGatewayCourse('course-3', 'Design Systems'),
          ],
        },
      });

    const result = await lmsService.getCoursesPage({
      userId: 'user-1',
      progress: 'in-progress',
      limit: 1,
      offset: 0,
    });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/lms/enrollments/user-1', {
      timeout: 5000,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/lms/courses', {
      params: {
        userId: 'user-1',
        progress: 'in-progress',
        limit: 1,
        offset: 0,
      },
      timeout: 5000,
    });
    expect(result.total).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      id: 'course-2',
      title: 'React Query',
      status: 'IN_PROGRESS',
      progress: 45,
    });
  });

  it('uses Supabase cursor lookahead for stable course pagination', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('API unavailable'));

    const firstCoursesQuery = makeCourseQueryBuilder({
      data: [
        makeSupabaseCourse('course-1', '2026-06-01T10:00:00.000Z', 'React Query'),
      ],
      error: null,
      count: 3,
    });
    const secondCoursesQuery = makeCourseQueryBuilder({
      data: [
        makeSupabaseCourse('course-0', '2026-05-31T10:00:00.000Z', 'Older React'),
        makeSupabaseCourse('course-overflow', '2026-05-30T10:00:00.000Z', 'Overflow React'),
      ],
      error: null,
    });
    const lessonQueries = [
      makeLessonsQueryBuilder(),
      makeLessonsQueryBuilder(),
    ];
    const courseQueries = [firstCoursesQuery, secondCoursesQuery];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'courses') return courseQueries.shift();
      if (table === 'lessons') return lessonQueries.shift();
      throw new Error(`Unexpected table ${table}`);
    });

    const firstPage = await lmsService.getCoursesPage({ limit: 1, offset: 0 });
    const result = await lmsService.getCoursesPage({
      limit: 1,
      offset: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(firstCoursesQuery.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(firstCoursesQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(firstCoursesQuery.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(firstCoursesQuery.range).toHaveBeenCalledWith(0, 0);
    expect(secondCoursesQuery.select).toHaveBeenCalledWith(expect.any(String));
    expect(secondCoursesQuery.or).toHaveBeenCalledWith('created_at.lt.2026-06-01T10:00:00.000Z,and(created_at.eq.2026-06-01T10:00:00.000Z,id.lt.course-1)');
    expect(secondCoursesQuery.limit).toHaveBeenCalledWith(2);
    expect(result.total).toBeNull();
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      id: 'course-0',
      title: 'Older React',
      provider: 'Instructor One',
    });
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('does not fabricate enrollment when gateway and Supabase enrollment fail', async () => {
    (apiClient.post as any).mockRejectedValueOnce(new Error('Network Error'));
    const enrollmentQuery = makeMutationQueryBuilder({
      data: null,
      error: new Error('Network Error'),
    });
    (supabase.from as any).mockReturnValue(enrollmentQuery);

    await expect(lmsService.enrollInCourse('course-1', 'user-1')).rejects.toThrow('Failed to enroll');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/lms/courses/course-1/enroll', null, {
      params: { userId: 'user-1' },
      timeout: 5000,
    });
    expect(supabase.from).toHaveBeenCalledWith('enrollments');
    expect(enrollmentQuery.insert).toHaveBeenCalledWith({
      course_id: 'course-1',
      user_id: 'user-1',
      status: 'ENROLLED',
    });
  });

  it('does not show an empty progress state when enrollment loading fails', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('Network Error'));
    const enrollmentQuery = makeEnrollmentListQueryBuilder({
      data: null,
      error: new Error('Network Error'),
    });
    (supabase.from as any).mockReturnValue(enrollmentQuery);

    await expect(lmsService.getUserEnrollments('user-1')).rejects.toThrow('Learning progress could not be loaded');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/lms/enrollments/user-1', {
      timeout: 5000,
    });
    expect(supabase.from).toHaveBeenCalledWith('enrollments');
    expect(enrollmentQuery.order).toHaveBeenCalledWith('enrolled_at', { ascending: false });
  });

  it('does not silently complete lessons when progress persistence fails', async () => {
    (apiClient.post as any).mockRejectedValueOnce(new Error('Network Error'));
    const progressQuery = makeMutationQueryBuilder(Promise.reject(new Error('Network Error')));
    (supabase.from as any).mockReturnValue(progressQuery);

    await expect(lmsService.markLessonComplete(
      'enrollment-1',
      'lesson-1',
      'user-1',
      'course-1'
    )).rejects.toThrow('Lesson progress could not be saved');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/lms/courses/course-1/lessons/lesson-1/complete', null, {
      params: { userId: 'user-1' },
      timeout: 5000,
    });
    expect(supabase.from).toHaveBeenCalledWith('lesson_progress');
    expect(progressQuery.select).toHaveBeenCalledWith('id');
  });
});
