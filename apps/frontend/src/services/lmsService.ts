// =============================================================================
// TalentSphere — LMS Service Client
// =============================================================================
// Architecture: API Gateway First → Supabase Fallback
//
// This service implements a resilient data fetching strategy:
// 1. Attempts to reach the API Gateway (/api/v1/lms/*)
// 2. Falls back to direct Supabase queries if the gateway is unreachable
// 3. Returns explicit errors for LMS user-progress reads and mutations when both backends are unreachable
//
// This keeps catalog browsing resilient while preventing progress state
// from looking successful when persistence is unavailable.
// =============================================================================

import { apiClient } from '../api/axios';
import { typedSupabase as supabase, type Database } from '../lib/supabaseClient';
import { Course, Enrollment } from '../types/lms';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CourseRow = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type LessonRow = Database['public']['Tables']['lessons']['Row'];
type EnrollmentRow = Database['public']['Tables']['enrollments']['Row'];
type EnrollmentInsert = Database['public']['Tables']['enrollments']['Insert'];
type EnrollmentUpdate = Database['public']['Tables']['enrollments']['Update'];
type LessonProgressRow = Database['public']['Tables']['lesson_progress']['Row'];
type LessonProgressInsert = Database['public']['Tables']['lesson_progress']['Insert'];
type LessonProgressUpdate = Database['public']['Tables']['lesson_progress']['Update'];

type CourseInstructorRow = Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'>;
type CourseLessonRow = Pick<LessonRow, 'id' | 'course_id' | 'title' | 'order_index' | 'duration_minutes' | 'is_free_preview'>;
type CourseWithInstructor = CourseRow & {
  profiles?: CourseInstructorRow | null;
};
type CourseWithLessons = CourseWithInstructor & {
  lessons?: CourseLessonRow[] | null;
};
type LessonProgressWithLesson = LessonProgressRow & {
  lessons?: Pick<LessonRow, 'id' | 'title' | 'order_index'> | null;
};

export type CourseProgressFilter = 'in-progress' | 'completed';

export interface CourseQueryParams {
  category?: string;
  published?: boolean;
  search?: string;
  userId?: string;
  progress?: CourseProgressFilter;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedCoursesResult {
  courses: Course[];
  total: number | null;
  limit?: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

const defaultCoursePageSize = 12;

// Track connectivity state to avoid redundant failed requests
let _gatewayReachable: boolean | null = null;
let _supabaseReachable: boolean | null = null;

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('failed to fetch') ||
           msg.includes('network error') ||
           msg.includes('err_name_not_resolved') ||
           msg.includes('econnrefused') ||
           msg.includes('timeout') ||
           msg.includes('net::') ||
           msg.includes('econnreset') ||
           msg.includes('socket hang up');
  }
  // Axios error with response status indicating backend is down
  if (typeof error === 'object' && error !== null) {
    const axiosErr = error as any;
    const status = axiosErr.status || axiosErr.response?.status;
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    // Axios network errors without response
    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNABORTED') {
      return true;
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// API Gateway Fetchers (Primary — targets Spring Boot microservices)
// ---------------------------------------------------------------------------

const mapGatewayCourse = (course: Record<string, any>): Course => ({
  id: course.id,
  title: course.title,
  slug: course.slug,
  provider: course.instructorId || 'TalentSphere',
  status: 'NOT_STARTED' as const,
  progress: 0,
  description: course.description,
  xp: course.xpReward || 0,
  category: course.category,
  duration: course.lessonIds
    ? `${course.lessonIds.length * 15} min`
    : 'Self-paced',
  difficulty: (course.level || 'Normal') as Course['difficulty'],
  lessons: (course.lessonIds || []).map((lid: string, idx: number) => ({
    id: lid,
    courseId: course.id,
    title: `Lesson ${idx + 1}`,
    content: '',
    orderIndex: idx + 1,
    durationMinutes: 15,
    isFree: idx === 0,
  })),
});

const getTotalFromResponse = (responseData: any): number | null => {
  if (typeof responseData?.total === 'number') return responseData.total;
  if (typeof responseData?.totalElements === 'number') return responseData.totalElements;
  if (typeof responseData?.data?.total === 'number') return responseData.data.total;
  if (typeof responseData?.data?.totalElements === 'number') return responseData.data.totalElements;
  return null;
};

const getArrayPayload = (responseData: any): any[] => {
  const payload = responseData?.data || responseData;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.courses)) return payload.courses;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const normalizeCourseSearch = (search?: string): string => {
  return search?.trim().replace(/\s+/g, ' ') ?? '';
};

type CourseCursor = {
  createdAt: string;
  id: string;
};

type CourseCursorSource = {
  id?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
};

const fallbackCourseCursorCreatedAt = '1970-01-01T00:00:00.000Z';

const getCourseCursorCreatedAt = (source: CourseCursorSource): string => {
  const createdAt = source.created_at ?? source.createdAt ?? source.updated_at ?? source.updatedAt;
  return typeof createdAt === 'string' && createdAt ? createdAt : fallbackCourseCursorCreatedAt;
};

const encodeCourseCursor = (source: CourseCursorSource): string | null => {
  if (typeof source.id !== 'string' || !source.id) return null;

  const payload = JSON.stringify({
    createdAt: getCourseCursorCreatedAt(source),
    id: source.id,
  });

  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeCourseCursor = (cursor?: string): CourseCursor | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[LMS] Invalid course cursor.', error);
  }

  throw new Error('Invalid course cursor');
};

const getNextCursorFromResponse = (responseData: any): string | null => {
  const payload = responseData?.data || responseData;
  return responseData?.nextCursor || payload?.nextCursor || null;
};

const sanitizeSupabaseSearch = (search: string): string => {
  return search.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();
};

const courseMatchesSearch = (course: Course, search: string): boolean => {
  if (!search) return true;

  const haystack = [
    course.title,
    course.description,
    course.category,
    course.provider,
  ].filter(Boolean).join(' ').toLowerCase();

  return haystack.includes(search.toLowerCase());
};

const mapGatewayEnrollment = (enrollment: Record<string, any>): Enrollment => ({
  id: enrollment.id,
  userId: enrollment.userId,
  courseId: enrollment.courseId,
  status: enrollment.status,
  progress: enrollment.progress || 0,
  enrolledAt: enrollment.enrolledAt,
  startedAt: enrollment.startedAt,
  completedAt: enrollment.completedAt,
  completedLessonIds: enrollment.completedLessonIds || [],
});

const mapSupabaseEnrollment = (enrollment: EnrollmentRow): Enrollment => ({
  id: enrollment.id,
  userId: enrollment.user_id,
  courseId: enrollment.course_id,
  status: enrollment.status || 'ENROLLED',
  progress: enrollment.progress_percentage || 0,
  enrolledAt: enrollment.enrolled_at || new Date().toISOString(),
  startedAt: enrollment.started_at || undefined,
  completedAt: enrollment.completed_at || undefined,
  completedLessonIds: [],
  certificateUrl: enrollment.certificate_url || undefined,
});

const courseStatusFromEnrollment = (enrollment?: Enrollment): Course['status'] => {
  if (!enrollment || enrollment.status === 'DROPPED') return 'NOT_STARTED';
  if (enrollment.status === 'COMPLETED' || enrollment.progress >= 100) return 'COMPLETED';
  if (enrollment.status === 'IN_PROGRESS' || enrollment.progress > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
};

const courseMatchesProgress = (enrollment: Enrollment | undefined, progress?: CourseProgressFilter): boolean => {
  if (!progress) return true;
  if (!enrollment || enrollment.status === 'DROPPED') return false;

  if (progress === 'completed') {
    return enrollment.status === 'COMPLETED' || enrollment.progress >= 100;
  }

  return enrollment.status === 'IN_PROGRESS' || (enrollment.progress > 0 && enrollment.progress < 100);
};

const applyEnrollmentToCourse = (course: Course, enrollment?: Enrollment): Course => ({
  ...course,
  progress: enrollment?.progress ?? course.progress,
  status: courseStatusFromEnrollment(enrollment),
});

const mapSupabaseCourseDifficulty = (level: string | null | undefined): Course['difficulty'] => {
  switch ((level || '').trim().toLowerCase()) {
    case 'beginner':
      return 'Beginner';
    case 'advanced':
      return 'Advanced';
    case 'expert':
      return 'Expert';
    default:
      return 'Normal';
  }
};

const mapSupabaseLesson = (lesson: CourseLessonRow, courseId: string): NonNullable<Course['lessons']>[number] => ({
  id: lesson.id,
  courseId,
  title: lesson.title,
  content: '',
  orderIndex: lesson.order_index,
  durationMinutes: lesson.duration_minutes || 15,
  isFree: lesson.is_free_preview || false,
});

const mapSupabaseCourse = (
  course: CourseWithInstructor,
  lessons: CourseLessonRow[] = [],
  enrollment?: Enrollment
): Course => ({
  id: course.id,
  title: course.title,
  slug: course.slug || undefined,
  provider: course.profiles?.full_name || 'Unknown',
  status: courseStatusFromEnrollment(enrollment),
  progress: enrollment?.progress ?? 0,
  description: course.description || undefined,
  xp: course.xp_reward || 0,
  category: course.category || undefined,
  duration: course.duration_hours ? `${course.duration_hours} hours` : 'Self-paced',
  difficulty: mapSupabaseCourseDifficulty(course.level),
  lessons: lessons.map(lesson => mapSupabaseLesson(lesson, course.id)),
});

const mapEnrollmentsByCourseId = (enrollments: Enrollment[]): Map<string, Enrollment> => {
  return new Map(enrollments.map(enrollment => [enrollment.courseId, enrollment]));
};

const getGatewayEnrollmentMap = async (userId: string): Promise<Map<string, Enrollment>> => {
  const response = await apiClient.get(`/api/v1/lms/enrollments/${userId}`, { timeout: 5000 });
  const data = getArrayPayload(response.data);
  return mapEnrollmentsByCourseId(data.map(mapGatewayEnrollment));
};

const getSupabaseEnrollmentMap = async (userId: string): Promise<Map<string, Enrollment>> => {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, student_id, status, progress_percentage, enrolled_at, started_at, completed_at, certificate_url')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return mapEnrollmentsByCourseId((data || []).map(mapSupabaseEnrollment));
};

const fetchCoursesPageFromGateway = async (params?: CourseQueryParams): Promise<PaginatedCoursesResult> => {
  const search = normalizeCourseSearch(params?.search);
  const progress = params?.progress;
  const enrollmentMap = progress && params?.userId
    ? await getGatewayEnrollmentMap(params.userId)
    : new Map<string, Enrollment>();

  if (progress && (!params?.userId || enrollmentMap.size === 0)) {
    return {
      courses: [],
      total: 0,
      limit: params?.limit,
      offset: params?.offset ?? 0,
      hasNext: false,
      nextCursor: null,
    };
  }

  const response = await apiClient.get('/api/v1/lms/courses', {
    params: {
      ...(params?.category ? { category: params.category } : {}),
      ...(params?.published !== undefined ? { published: params.published } : {}),
      ...(search ? { search } : {}),
      ...(params?.userId ? { userId: params.userId } : {}),
      ...(progress ? { progress } : {}),
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
      ...(params?.offset !== undefined ? { offset: params.offset } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    timeout: 5000,
  });

  const limit = params?.limit;
  const offset = params?.offset ?? 0;
  const responseTotal = getTotalFromResponse(response.data);
  const responseNextCursor = getNextCursorFromResponse(response.data);
  const rawCourses = getArrayPayload(response.data);
  const mappedCourses = rawCourses
    .map(mapGatewayCourse)
    .map(course => applyEnrollmentToCourse(course, enrollmentMap.get(course.id)));
  const queryFilteredCourses = mappedCourses
    .filter(course => courseMatchesProgress(enrollmentMap.get(course.id), progress))
    .filter(course => courseMatchesSearch(course, search));
  const shouldSliceLocally = limit !== undefined && responseTotal === null && (
    rawCourses.length > limit ||
    offset > 0 ||
    queryFilteredCourses.length !== mappedCourses.length
  );
  const courses = shouldSliceLocally
    ? queryFilteredCourses.slice(offset, offset + limit)
    : queryFilteredCourses;
  const total = responseTotal
    ?? (limit !== undefined && (shouldSliceLocally || queryFilteredCourses.length !== mappedCourses.length) ? queryFilteredCourses.length : null);
  const hasNext = responseNextCursor
    ? true
    : total !== null
      ? offset + courses.length < total
      : limit !== undefined && courses.length === limit;
  const lastCourse = courses[courses.length - 1];
  const lastRawCourse = lastCourse
    ? rawCourses.find(course => course.id === lastCourse.id) ?? lastCourse
    : null;

  return {
    courses,
    total,
    limit,
    offset,
    hasNext,
    nextCursor: responseNextCursor || (hasNext && lastRawCourse ? encodeCourseCursor(lastRawCourse) : null),
  };
};

const fetchCoursesFromGateway = async (params?: CourseQueryParams): Promise<Course[]> => {
  const page = await fetchCoursesPageFromGateway(params);
  return page.courses;
};

const fetchCourseByIdFromGateway = async (courseId: string): Promise<Course> => {
  const response = await apiClient.get(`/api/v1/lms/courses/${courseId}`, { timeout: 5000 });
  const course = response.data?.data || response.data;

  // Fetch lessons for this course
  let lessons: Record<string, any>[] = [];
  try {
    const lessonsResponse = await apiClient.get(`/api/v1/lms/courses/${courseId}/lessons`, { timeout: 5000 });
    lessons = lessonsResponse.data?.data || lessonsResponse.data || [];
  } catch {
    // Lessons fetch failed, continue with empty
  }

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    provider: course.instructorId || 'TalentSphere',
    status: 'NOT_STARTED',
    progress: 0,
    description: course.description,
    xp: course.xpReward || 0,
    category: course.category,
    duration: `${lessons.length * 15} min`,
    difficulty: (course.level || 'Normal') as Course['difficulty'],
    lessons: lessons.map((l: Record<string, any>, idx: number) => ({
      id: l.id,
      courseId: course.id,
      title: l.title,
      content: l.content || '',
      orderIndex: l.orderIndex || idx + 1,
      videoUrl: l.videoUrl,
      durationMinutes: l.durationMinutes || 15,
      isFree: idx === 0,
    })),
  };
};

const fetchCourseBySlugFromGateway = async (slug: string): Promise<Course> => {
  const response = await apiClient.get(`/api/v1/lms/courses/slug/${slug}`, { timeout: 5000 });
  const course = response.data?.data || response.data;
  return fetchCourseByIdFromGateway(course.id);
};

const enrollViaGateway = async (courseId: string, userId: string): Promise<Enrollment> => {
  const response = await apiClient.post(
    `/api/v1/lms/courses/${courseId}/enroll`,
    null,
    { params: { userId }, timeout: 5000 }
  );
  const data = response.data?.data || response.data;
  return {
    id: data.id,
    userId: data.userId || userId,
    courseId: data.courseId || courseId,
    status: data.status || 'ENROLLED',
    progress: data.progress || 0,
    enrolledAt: data.enrolledAt || new Date().toISOString(),
    completedLessonIds: data.completedLessonIds || [],
  };
};

const fetchEnrollmentsFromGateway = async (userId: string): Promise<Enrollment[]> => {
  const response = await apiClient.get(`/api/v1/lms/enrollments/${userId}`, { timeout: 5000 });
  const data = response.data?.data || response.data || [];
  return data.map((e: Record<string, any>) => ({
    id: e.id,
    userId: e.userId,
    courseId: e.courseId,
    status: e.status,
    progress: e.progress || 0,
    enrolledAt: e.enrolledAt,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    completedLessonIds: e.completedLessonIds || [],
  }));
};

const markLessonCompleteViaGateway = async (courseId: string, lessonId: string, userId: string): Promise<void> => {
  await apiClient.post(
    `/api/v1/lms/courses/${courseId}/lessons/${lessonId}/complete`,
    null,
    { params: { userId }, timeout: 5000 }
  );
};

// ---------------------------------------------------------------------------
// Supabase Fetchers (Secondary Fallback — direct PostgreSQL)
// ---------------------------------------------------------------------------

const fetchCoursesPageFromSupabase = async (params?: CourseQueryParams): Promise<PaginatedCoursesResult> => {
  const limit = params?.limit;
  const offset = params?.offset ?? 0;
  const decodedCursor = decodeCourseCursor(params?.cursor);
  const cursorLimit = decodedCursor ? limit ?? defaultCoursePageSize : undefined;
  const search = normalizeCourseSearch(params?.search);
  const progress = params?.progress;
  const enrollmentMap = progress && params?.userId
    ? await getSupabaseEnrollmentMap(params.userId)
    : new Map<string, Enrollment>();
  const progressMatchedCourseIds = progress
    ? Array.from(enrollmentMap.entries())
      .filter(([, enrollment]) => courseMatchesProgress(enrollment, progress))
      .map(([courseId]) => courseId)
    : [];

  if (progress && (!params?.userId || progressMatchedCourseIds.length === 0)) {
    return {
      courses: [],
      total: 0,
      limit,
      offset,
      hasNext: false,
      nextCursor: null
    };
  }

  const coursesSelect = `
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `;
  let query = decodedCursor
    ? supabase.from('courses').select(coursesSelect)
    : supabase
    .from('courses')
    .select(coursesSelect, { count: 'exact' });

  if (params?.category) {
    query = query.eq('category', params.category);
  }

  if (params?.published !== undefined) {
    query = query.eq('is_published', params.published);
  } else {
    query = query.eq('is_published', true);
  }

  if (progress) {
    query = query.in('id', progressMatchedCourseIds);
  }

  if (search) {
    const safeSearch = sanitizeSupabaseSearch(search);
    if (safeSearch) {
      query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
    }
  }

  query = query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (decodedCursor) {
    query = query
      .or(`created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`)
      .limit(cursorLimit! + 1);
  } else if (limit !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  if (!data) {
    return {
      courses: [],
      total: 0,
      limit,
      offset,
      hasNext: false,
      nextCursor: null
    };
  }

  const courseRows = decodedCursor
    ? (data as CourseWithInstructor[]).slice(0, cursorLimit)
    : (data as CourseWithInstructor[]);

  // Fetch lesson counts per course for display
  const courseIds = courseRows.map(c => c.id);
  if (courseIds.length === 0) {
    const total = decodedCursor ? null : typeof count === 'number' ? count : 0;
    return {
      courses: [],
      total,
      limit,
      offset,
      hasNext: false,
      nextCursor: null
    };
  }

  const { data: lessonData } = await supabase
    .from('lessons')
    .select('id, course_id, title, order_index, duration_minutes, is_free_preview')
    .in('course_id', courseIds)
    .order('order_index', { ascending: true });

  const lessonsByCourse: Record<string, CourseLessonRow[]> = {};
  ((lessonData || []) as CourseLessonRow[]).forEach(l => {
    if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
    lessonsByCourse[l.course_id].push(l);
  });

  const courses = courseRows.map(course => (
    mapSupabaseCourse(course, lessonsByCourse[course.id] || [], enrollmentMap.get(course.id))
  ));

  const total = decodedCursor ? null : typeof count === 'number' ? count : null;
  const hasNext = decodedCursor
    ? data.length > cursorLimit!
    : total !== null
      ? offset + courses.length < total
      : limit !== undefined && courses.length === limit;
  const lastCourseRow = courseRows[courseRows.length - 1];

  return {
    courses,
    total,
    limit,
    offset,
    hasNext,
    nextCursor: hasNext && lastCourseRow ? encodeCourseCursor(lastCourseRow) : null,
  };
};

const fetchCoursesFromSupabase = async (params?: CourseQueryParams): Promise<Course[]> => {
  const page = await fetchCoursesPageFromSupabase(params);
  return page.courses;
};

const fetchCourseByIdFromSupabase = async (courseId: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      ),
      lessons (
        id,
        title,
        order_index,
        duration_minutes,
        is_free_preview
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) throw error;

  const course = data as CourseWithLessons;
  return mapSupabaseCourse(course, course.lessons || []);
};

const enrollViaSupabase = async (courseId: string, userId: string): Promise<Enrollment> => {
  const insert: EnrollmentInsert = {
    course_id: courseId,
    user_id: userId,
    status: 'ENROLLED',
  };

  const { data, error } = await supabase
    .from('enrollments')
    .insert(insert)
    .select(`
      *,
      courses (
        id,
        title,
        thumbnail_url
      )
    `)
    .single();

  if (error) throw error;

  return mapSupabaseEnrollment(data as EnrollmentRow);
};

const fetchEnrollmentsFromSupabase = async (userId: string): Promise<Enrollment[]> => {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      courses (
        id,
        title,
        thumbnail_url,
        duration_hours
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as EnrollmentRow[]).map(mapSupabaseEnrollment);
};

// Tertiary fallback removed


// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const mapDifficulty = (rating: string | undefined): Course['difficulty'] => {
  if (!rating) return 'Normal';
  const num = parseFloat(rating);
  if (num >= 4.8) return 'Expert';
  if (num >= 4.5) return 'Advanced';
  if (num >= 4.0) return 'Normal';
  return 'Beginner';
};

// ---------------------------------------------------------------------------
// Exported Service — Resilient Three-Tier Fetching
// ---------------------------------------------------------------------------

export const lmsService = {
  getCoursesPage: async (params?: CourseQueryParams): Promise<PaginatedCoursesResult> => {
    const queryParams = {
      ...params,
      limit: params?.limit ?? defaultCoursePageSize,
      offset: params?.offset ?? 0
    };

    // Tier 1: API Gateway
    if (_gatewayReachable !== false) {
      try {
        const result = await fetchCoursesPageFromGateway(queryParams);
        _gatewayReachable = true;
        return result;
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] API Gateway failed, falling back to Supabase...', err);
      }
    }

    // Tier 2: Supabase
    if (_supabaseReachable !== false) {
      try {
        const result = await fetchCoursesPageFromSupabase(queryParams);
        _supabaseReachable = true;
        return result;
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] Supabase failed, returning empty course page...', err);
      }
    }

    return {
      courses: [],
      total: 0,
      limit: queryParams.limit,
      offset: queryParams.offset,
      hasNext: false,
      nextCursor: null
    };
  },

  getCourses: async (params?: CourseQueryParams): Promise<Course[]> => {
    // Tier 1: API Gateway
    if (_gatewayReachable !== false) {
      try {
        const result = await fetchCoursesFromGateway(params);
        _gatewayReachable = true;
        return result;
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] API Gateway failed, falling back to Supabase...', err);
      }
    }

    // Tier 2: Supabase
    if (_supabaseReachable !== false) {
      try {
        const result = await fetchCoursesFromSupabase(params);
        _supabaseReachable = true;
        return result;
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] Supabase failed, falling back to mock data...', err);
      }
    }

    return [];
  },

  getCourseById: async (courseId: string): Promise<Course> => {
    if (_gatewayReachable !== false) {
      try {
        return await fetchCourseByIdFromGateway(courseId);
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] getCourseById: gateway failed, trying Supabase...', err);
      }
    }

    if (_supabaseReachable !== false) {
      try {
        return await fetchCourseByIdFromSupabase(courseId);
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] getCourseById: Supabase failed, using mock...', err);
      }
    }

    throw new Error('Course not found and both backends are unreachable');
  },

  getCourseBySlug: async (slug: string): Promise<Course> => {
    if (_gatewayReachable !== false) {
      try {
        return await fetchCourseBySlugFromGateway(slug);
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] getCourseBySlug: gateway failed, trying mock...', err);
      }
    }
    throw new Error('Course not found and both backends are unreachable');
  },

  enrollInCourse: async (courseId: string, userId: string): Promise<Enrollment> => {
    if (_gatewayReachable !== false) {
      try {
        return await enrollViaGateway(courseId, userId);
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] enrollInCourse: gateway failed, trying Supabase...', err);
      }
    }

    if (_supabaseReachable !== false) {
      try {
        return await enrollViaSupabase(courseId, userId);
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] enrollInCourse: Supabase failed; enrollment was not saved.', err);
      }
    }

    throw new Error('Failed to enroll, both backends unreachable');
  },

  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
    if (_gatewayReachable !== false) {
      try {
        return await fetchEnrollmentsFromGateway(userId);
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] getUserEnrollments: gateway failed, trying Supabase...', err);
      }
    }

    if (_supabaseReachable !== false) {
      try {
        return await fetchEnrollmentsFromSupabase(userId);
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] getUserEnrollments: Supabase failed; progress was not loaded.', err);
      }
    }

    throw new Error('Learning progress could not be loaded. Please try again.');
  },

  getLessonProgress: async (enrollmentId: string, userId?: string, courseId?: string): Promise<any[]> => {
    // Try Gateway first if we have userId and courseId
    if (userId && courseId && _gatewayReachable !== false) {
      try {
        const response = await apiClient.get(`/api/v1/lms/courses/${courseId}/enrollment`, {
            params: { userId },
            timeout: 5000
        });
        const enrollment = response.data?.data;
        if (enrollment) {
            _gatewayReachable = true;
            // Map completedLessonIds to the progress format the UI expects
            return (enrollment.completedLessonIds || []).map((lid: string) => ({
                lesson_id: lid,
                completed: true
            }));
        }
      } catch (err) {
        console.warn('[LMS] getLessonProgress: gateway failed, trying Supabase...', err);
      }
    }

    // Tier 2: Supabase
    if (_supabaseReachable !== false) {
      try {
        const { data, error } = await supabase
          .from('lesson_progress')
          .select(`
            *,
            lessons (
              id,
              title,
              order_index
            )
          `)
          .eq('enrollment_id', enrollmentId);

        if (error) throw error;
        _supabaseReachable = true;
        return (data || []) as LessonProgressWithLesson[];
      } catch (err) {
        if (isNetworkError(err)) {
          _supabaseReachable = false;
        }
      }
    }

    return [];
  },

  markLessonComplete: async (enrollmentId: string, lessonId: string, userId?: string, courseId?: string): Promise<void> => {
    // Try Gateway first
    if (userId && courseId && _gatewayReachable !== false) {
      try {
        await markLessonCompleteViaGateway(courseId, lessonId, userId);
        _gatewayReachable = true;
        return;
      } catch (err) {
        console.warn('[LMS] markLessonComplete: gateway failed, trying Supabase...', err);
      }
    }

    if (_supabaseReachable !== false) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          const update: LessonProgressUpdate = {
            completed: true,
            completed_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('lesson_progress')
            .update(update)
            .eq('enrollment_id', enrollmentId)
            .eq('lesson_id', lessonId);

          if (updateError) throw updateError;
        } else {
          const insert: LessonProgressInsert = {
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          };

          const { error: insertError } = await supabase
            .from('lesson_progress')
            .insert(insert);

          if (insertError) throw insertError;
        }

        // Update enrollment progress percentage
        const { data: enrollmentData, error: enrollmentLookupError } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('id', enrollmentId)
          .single();

        if (enrollmentLookupError) throw enrollmentLookupError;

        if (enrollmentData) {
          const { count: totalLessons, error: totalLessonsError } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', enrollmentData.course_id);

          if (totalLessonsError) throw totalLessonsError;

          const { count: completedLessons, error: completedLessonsError } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('enrollment_id', enrollmentId)
            .eq('completed', true);

          if (completedLessonsError) throw completedLessonsError;

          const progress = totalLessons ? Math.round((completedLessons || 0) / totalLessons * 100) : 0;
          const enrollmentUpdate: EnrollmentUpdate = {
            progress_percentage: progress,
            status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            completed_at: progress === 100 ? new Date().toISOString() : null,
          };

          const { error: enrollmentUpdateError } = await supabase
            .from('enrollments')
            .update(enrollmentUpdate)
            .eq('id', enrollmentId);

          if (enrollmentUpdateError) throw enrollmentUpdateError;
        }

        _supabaseReachable = true;
        return;
      } catch (err) {
        if (isNetworkError(err)) {
          _supabaseReachable = false;
        } else {
          throw err;
        }
      }
    }

    console.warn('[LMS] markLessonComplete: no backend available; progress was not saved');
    throw new Error('Lesson progress could not be saved. Please try again.');
  },

  createCourse: async (course: Partial<Course>, instructorId: string): Promise<Course> => {
    const title = course.title?.trim();
    if (!title) {
      throw new Error('Course title is required');
    }

    // Try gateway first
    if (_gatewayReachable !== false) {
      try {
        const response = await apiClient.post('/api/v1/lms/courses', {
          title,
          description: course.description,
          instructorId,
          category: course.category,
          price: 0,
        }, { timeout: 5000 });

        const data = response.data?.data || response.data;
        _gatewayReachable = true;
        return {
          id: data.id,
          title: data.title,
          provider: instructorId,
          status: 'NOT_STARTED',
          progress: 0,
          description: data.description,
          category: data.category,
        };
      } catch (err) {
        _gatewayReachable = false;
        console.warn('[LMS] createCourse: gateway failed, trying Supabase...', err);
      }
    }

    // Supabase fallback
    if (_supabaseReachable !== false) {
      try {
        const durationHours = Number.parseInt(course.duration || '0', 10);
        const insert: CourseInsert = {
          title,
          description: course.description,
          instructor_id: instructorId,
          category: course.category,
          price: 0,
          thumbnail_url: null,
          duration_hours: Number.isFinite(durationHours) ? durationHours : 0,
          level: course.difficulty,
          is_published: false,
        };

        const { data, error } = await supabase
          .from('courses')
          .insert(insert)
          .select()
          .single();

        if (error) throw error;
        _supabaseReachable = true;
        return mapSupabaseCourse(data as CourseRow);
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] createCourse: Supabase failed, using mock...', err);
      }
    }

    throw new Error('Failed to create course, no backend available');
  },

  // Reset connectivity cache (useful after network recovery)
  resetConnectivityState: () => {
    _gatewayReachable = null;
    _supabaseReachable = null;
    console.info('[LMS] Connectivity state reset — will retry all backends');
  },
};
