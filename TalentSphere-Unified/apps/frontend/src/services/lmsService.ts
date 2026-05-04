import { supabase } from '../lib/supabaseClient';
import { Course, Enrollment } from '../types/lms';

export const lmsService = {
  // Course operations
  getCourses: async (params?: { category?: string; published?: boolean }): Promise<Course[]> => {
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
    
    return data.map(course => ({
      id: course.id,
      title: course.title,
      provider: course.profiles?.full_name || 'Unknown',
      status: 'NOT_STARTED',
      progress: 0,
      description: course.description,
      xp: course.xp_reward,
      category: course.category,
      duration: `${course.duration_hours} hours`,
      difficulty: course.level as 'Beginner' | 'Normal' | 'Advanced' | 'Expert',
      lessons: []
    }));
  },

  getCourseById: async (courseId: string): Promise<Course> => {
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
          order_number,
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
      provider: data.profiles?.full_name || 'Unknown',
      status: 'NOT_STARTED',
      progress: 0,
      description: data.description,
      xp: data.xp_reward,
      category: data.category,
      duration: `${data.duration_hours} hours`,
      difficulty: data.level as 'Beginner' | 'Normal' | 'Advanced' | 'Expert',
      lessons: data.lessons || []
    };
  },

  enrollInCourse: async (courseId: string, userId: string): Promise<Enrollment> => {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        course_id: courseId,
        user_id: userId,
        status: 'ENROLLED'
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
      certificateUrl: data.certificate_url
    };
  },

  getUserEnrollments: async (userId: string): Promise<Enrollment[]> => {
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
      certificateUrl: enrollment.certificate_url
    }));
  },

  getLessonProgress: async (enrollmentId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select(`
        *,
        lessons (
          id,
          title,
          order_number
        )
      `)
      .eq('enrollment_id', enrollmentId);
    
    if (error) throw error;
    
    return data || [];
  },

  markLessonComplete: async (enrollmentId: string, lessonId: string): Promise<void> => {
    // Check if already exists
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .eq('lesson_id', lessonId)
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from('lesson_progress')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('enrollment_id', enrollmentId)
        .eq('lesson_id', lessonId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('lesson_progress')
        .insert({
          enrollment_id: enrollmentId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        });
      
      if (error) throw error;
    }
    
    // Update enrollment progress percentage
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('id', enrollmentId)
      .single();
    
    if (!enrollmentData) return;
    
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
        completed_at: progress === 100 ? new Date().toISOString() : null
      })
      .eq('id', enrollmentId);
  },

  createCourse: async (course: Partial<Course>, instructorId: string): Promise<Course> => {
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
        is_published: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
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
      difficulty: data.level as 'Beginner' | 'Normal' | 'Advanced' | 'Expert'
    };
  }
};
