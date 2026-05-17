// =============================================================================
// TalentSphere — LMS Service Client
// =============================================================================
// Architecture: API Gateway First → Supabase Fallback → Mock Data Fallback
//
// This service implements a resilient data fetching strategy:
// 1. Attempts to reach the API Gateway (/api/v1/lms/*)
// 2. Falls back to direct Supabase queries if the gateway is unreachable
// 3. Falls back to local mock data if both backends are unreachable
//
// This ensures the UI always renders meaningful content regardless of
// infrastructure availability.
// =============================================================================

import { apiClient } from '../api/axios';
import { supabase } from '../lib/supabaseClient';
import { Course, Enrollment } from '../types/lms';
import { MOCK_COURSES, MOCK_ENROLLMENTS } from '../api/mockData';

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

const fetchCoursesFromGateway = async (params?: { category?: string }): Promise<Course[]> => {
  const response = await apiClient.get('/api/v1/lms/courses', {
    params: params?.category ? { category: params.category } : undefined,
    timeout: 5000,
  });

  // The Spring Boot API returns ApiResponse<List<Course>>
  const apiData = response.data?.data || response.data;
  if (!Array.isArray(apiData)) return [];

  return apiData.map((course: any) => ({
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
  }));
};

const fetchCourseByIdFromGateway = async (courseId: string): Promise<Course> => {
  const response = await apiClient.get(`/api/v1/lms/courses/${courseId}`, { timeout: 5000 });
  const course = response.data?.data || response.data;

  // Fetch lessons for this course
  let lessons: any[] = [];
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
    lessons: lessons.map((l: any, idx: number) => ({
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
  return data.map((e: any) => ({
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

const fetchCoursesFromSupabase = async (params?: { category?: string; published?: boolean }): Promise<Course[]> => {
  let query = supabase
    .from('courses')
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `);

  if (params?.category) {
    query = query.eq('category', params.category);
  }

  if (params?.published !== undefined) {
    query = query.eq('is_published', params.published);
  } else {
    query = query.eq('is_published', true);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  // Fetch lesson counts per course for display
  const courseIds = data.map(c => c.id);
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('id, course_id, title, order_index, duration_minutes, is_free_preview')
    .in('course_id', courseIds)
    .order('order_index', { ascending: true });

  const lessonsByCourse: Record<string, any[]> = {};
  (lessonData || []).forEach(l => {
    if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
    lessonsByCourse[l.course_id].push(l);
  });

  return data.map(course => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    provider: course.profiles?.full_name || 'Unknown',
    status: 'NOT_STARTED' as const,
    progress: 0,
    description: course.description,
    xp: course.xp_reward || 0,
    category: course.category,
    duration: course.duration_hours ? `${course.duration_hours} hours` : 'Self-paced',
    difficulty: (course.level?.charAt(0).toUpperCase() + course.level?.slice(1)) as Course['difficulty'],
    lessons: (lessonsByCourse[course.id] || []).map((l: any) => ({
      id: l.id,
      courseId: course.id,
      title: l.title,
      content: '',
      orderIndex: l.order_index,
      durationMinutes: l.duration_minutes || 15,
      isFree: l.is_free_preview || false,
    })),
  }));
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

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    provider: data.profiles?.full_name || 'Unknown',
    status: 'NOT_STARTED',
    progress: 0,
    description: data.description,
    xp: data.xp_reward || 0,
    category: data.category,
    duration: data.duration_hours ? `${data.duration_hours} hours` : 'Self-paced',
    difficulty: (data.level?.charAt(0).toUpperCase() + data.level?.slice(1)) as Course['difficulty'],
    lessons: (data.lessons || []).map((l: any) => ({
      id: l.id,
      courseId: data.id,
      title: l.title,
      content: '',
      orderIndex: l.order_index,
      durationMinutes: l.duration_minutes || 15,
      isFree: l.is_free_preview || false,
    })),
  };
};

const enrollViaSupabase = async (courseId: string, userId: string): Promise<Enrollment> => {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      course_id: courseId,
      user_id: userId,
      status: 'ENROLLED',
    })
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

  return {
    id: data.id,
    userId: data.user_id,
    courseId: data.course_id,
    status: data.status,
    progress: data.progress_percentage || 0,
    enrolledAt: data.enrolled_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    completedLessonIds: [],
    certificateUrl: data.certificate_url,
  };
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

  return data.map(enrollment => ({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    status: enrollment.status,
    progress: enrollment.progress_percentage || 0,
    enrolledAt: enrollment.enrolled_at,
    startedAt: enrollment.started_at,
    completedAt: enrollment.completed_at,
    completedLessonIds: [],
    certificateUrl: enrollment.certificate_url,
  }));
};

// ---------------------------------------------------------------------------
// Mock Data Fetchers (Tertiary Fallback — local static data)
// ---------------------------------------------------------------------------

const fetchCoursesFromMock = (params?: { category?: string }): Course[] => {
  console.warn('[LMS] Using mock data — both API Gateway and Supabase are unreachable');
  let courses = [...MOCK_COURSES];
  if (params?.category) {
    courses = courses.filter(c => c.category === params.category);
  }
  return courses;
};

const fetchCourseByIdFromMock = (courseId: string): Course => {
  const course = MOCK_COURSES.find(c => c.id === courseId);
  if (!course) throw new Error(`Course ${courseId} not found in mock data`);
  return { ...course };
};

const enrollViaMock = (courseId: string, userId: string): Enrollment => {
  console.warn('[LMS] Mock enrollment — no backend persistence');
  return {
    id: `mock-enrollment-${Date.now()}`,
    userId,
    courseId,
    status: 'ENROLLED',
    progress: 0,
    enrolledAt: new Date().toISOString(),
    completedLessonIds: [],
  };
};

const fetchEnrollmentsFromMock = (_userId: string): Enrollment[] => {
  return [...MOCK_ENROLLMENTS];
};

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
  getCourses: async (params?: { category?: string; published?: boolean }): Promise<Course[]> => {
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

    // Tier 3: Mock Data (always succeeds)
    return fetchCoursesFromMock(params);
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

    return fetchCourseByIdFromMock(courseId);
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
    // No Supabase slug fallback implemented yet for simplicity
    return fetchCoursesFromMock().find(c => c.slug === slug) || fetchCourseByIdFromMock(slug);
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
        console.warn('[LMS] enrollInCourse: Supabase failed, using mock...', err);
      }
    }

    return enrollViaMock(courseId, userId);
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
        console.warn('[LMS] getUserEnrollments: Supabase failed, using mock...', err);
      }
    }

    return fetchEnrollmentsFromMock(userId);
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
        return data || [];
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
        const { data: existing } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .eq('lesson_id', lessonId)
          .single();

        if (existing) {
          await supabase
            .from('lesson_progress')
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('enrollment_id', enrollmentId)
            .eq('lesson_id', lessonId);
        } else {
          await supabase
            .from('lesson_progress')
            .insert({
              enrollment_id: enrollmentId,
              lesson_id: lessonId,
              completed: true,
              completed_at: new Date().toISOString(),
            });
        }

        // Update enrollment progress percentage
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('id', enrollmentId)
          .single();

        if (enrollmentData) {
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', enrollmentData.course_id);

          const { count: completedLessons } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('enrollment_id', enrollmentId)
            .eq('completed', true);

          const progress = totalLessons ? Math.round((completedLessons || 0) / totalLessons * 100) : 0;

          await supabase
            .from('enrollments')
            .update({
              progress_percentage: progress,
              status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
              completed_at: progress === 100 ? new Date().toISOString() : null,
            })
            .eq('id', enrollmentId);
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

    console.warn('[LMS] markLessonComplete: no backend available, operation skipped');
  },

  createCourse: async (course: Partial<Course>, instructorId: string): Promise<Course> => {
    // Try gateway first
    if (_gatewayReachable !== false) {
      try {
        const response = await apiClient.post('/api/v1/lms/courses', {
          title: course.title,
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
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: course.title,
            description: course.description,
            instructor_id: instructorId,
            category: course.category,
            price: 0,
            thumbnail_url: null,
            duration_hours: parseInt(course.duration || '0'),
            level: course.difficulty,
            is_published: false,
          })
          .select()
          .single();

        if (error) throw error;
        _supabaseReachable = true;

        return {
          id: data.id,
          title: data.title,
          provider: 'Unknown',
          status: 'NOT_STARTED',
          progress: 0,
          description: data.description,
          xp: data.xp_reward,
          category: data.category,
          duration: `${data.duration_hours} hours`,
          difficulty: data.level as Course['difficulty'],
        };
      } catch (err) {
        _supabaseReachable = false;
        console.warn('[LMS] createCourse: Supabase failed, using mock...', err);
      }
    }

    // Mock fallback
    console.warn('[LMS] createCourse: no backend available, returning mock');
    return {
      id: `mock-course-${Date.now()}`,
      title: course.title || 'Untitled Course',
      provider: 'Mock Instructor',
      status: 'NOT_STARTED',
      progress: 0,
      description: course.description,
      category: course.category,
    };
  },

  // Reset connectivity cache (useful after network recovery)
  resetConnectivityState: () => {
    _gatewayReachable = null;
    _supabaseReachable = null;
    console.info('[LMS] Connectivity state reset — will retry all backends');
  },
};
