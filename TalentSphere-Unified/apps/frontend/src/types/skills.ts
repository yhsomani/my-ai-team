export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnailUrl: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: string; // e.g., "12 hours"
  enrollments: number;
  rating: number;
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  content: string;
  duration: string;
  isCompleted: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  points: number;
  participants: number;
  deadline: string;
  requirements: string[];
  status?: 'OPEN' | 'COMPLETED' | 'EXPIRED';
}

export interface EnrollRequest {
  courseId: string;
}

export interface JoinChallengeRequest {
  challengeId: string;
}
