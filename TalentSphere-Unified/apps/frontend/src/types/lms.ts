export interface Course {
    id: string;
    title: string;
    provider: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    progress: number;
    description?: string;
    xp?: number;
    category?: string;
    duration?: string;
    difficulty?: 'Beginner' | 'Normal' | 'Advanced' | 'Expert';
    lessons?: any[];
}

export interface Enrollment {
    id: string;
    userId: string;
    courseId: string;
    status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
    progress: number;
    enrolledAt: string;
    startedAt?: string;
    completedAt?: string;
    completedLessonIds: string[];
    certificateUrl?: string;
}

export interface Lesson {
    id: string;
    courseId: string;
    title: string;
    content: string;
    orderNumber: number;
    videoUrl?: string;
    durationMinutes: number;
    prerequisiteLessonId?: string;
    isFree: boolean;
}

export interface LearningPath {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    courses: LearningPathCourse[];
}

export interface LearningPathCourse {
    courseId: string;
    orderIndex: number;
    isRequired: boolean;
}
