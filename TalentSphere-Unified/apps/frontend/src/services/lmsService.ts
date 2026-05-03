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
    
    return data.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructorId: course.instructor_id,
      instructorName: course.profiles?.full_name,
      instructorAvatar: course.profiles?.avatar_url,
      category: course.category,
      price: parseFloat(course.price?.toString() || '0'),
      thumbnailUrl: course.thumbnail_url,
      durationHours: course.duration_hours,
      level: course.level,
      isPublished: course.is_published,
      createdAt: course.created_at
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
      description: data.description,
      instructorId: data.instructor_id,
      instructorName: data.profiles?.full_name,
      instructorAvatar: data.profiles?.avatar_url,
      category: data.category,
      price: parseFloat(data.price?.toString() || '0'),
      thumbnailUrl: data.thumbnail_url,
      durationHours: data.duration_hours,
      level: data.level,
      isPublished: data.is_published,
      createdAt: data.created_at,
      lessons: data.lessons
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
      courseId: data.course_id,
      userId: data.user_id,
      status: data.status,
      progressPercentage: data.progress_percentage,
      enrolledAt: data.enrolled_at,
      completedAt: data.completed_at,
      course: data.courses
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
    
    return data.map(enrollment => ({
      id: enrollment.id,
      courseId: enrollment.course_id,
      userId: enrollment.user_id,
      status: enrollment.status,
      progressPercentage: enrollment.progress_percentage,
      enrolledAt: enrollment.enrolled_at,
      completedAt: enrollment.completed_at,
      course: enrollment.courses
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
    
    return data;
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
    const { data: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('course_id', 
        supabase.from('enrollments').select('course_id').eq('id', enrollmentId).single()
      );
    
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact' })
      .eq('enrollment_id', enrollmentId)
      .eq('completed', true);
    
    const progress = totalLessons?.count ? Math.round((completedLessons?.count || 0) / totalLessons.count * 100) : 0;
    
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
        price: course.price || 0,
        thumbnail_url: course.thumbnailUrl,
        duration_hours: course.durationHours,
        level: course.level,
        is_published: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      instructorId: data.instructor_id,
      category: data.category,
      price: parseFloat(data.price?.toString() || '0'),
      thumbnailUrl: data.thumbnail_url,
      durationHours: data.duration_hours,
      level: data.level,
      isPublished: data.is_published,
      createdAt: data.created_at
    };
  }
};
