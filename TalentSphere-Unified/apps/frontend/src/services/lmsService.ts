import { apiClient } from '../api/axios';
import { Course, Enrollment } from '../types/lms';

export const lmsService = {
  // Course operations
  getCourses: async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>('/api/v1/lms/courses');
    return response.data;
  },

  getCourseById: async (courseId: string): Promise<Course> => {
    const response = await apiClient.get<Course>(`/api/v1/lms/courses/${courseId}`);
    return response.data;
  },

  enrollInCourse: async (courseId: string, userId: string): Promise<Enrollment> => {
    const response = await apiClient.post<Enrollment>(`/api/v1/lms/courses/${courseId}/enroll?userId=${userId}`);
    return response.data;
  }
};
