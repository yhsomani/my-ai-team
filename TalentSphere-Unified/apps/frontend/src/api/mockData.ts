// =============================================================================
// TalentSphere — Local Development Mock Data Fallback
// =============================================================================
// This module provides realistic mock data when backend services (Supabase,
// API Gateway) are unreachable. It is activated ONLY when VITE_ENABLE_MOCKS
// is set to 'true' or when the runtime detects network failures.
// =============================================================================

import { Course, Enrollment, Lesson, LearningPath } from '../types/lms';

// ---------------------------------------------------------------------------
// Mock Users (Test Personas)
// ---------------------------------------------------------------------------
export const MOCK_USERS = {
  alice: {
    id: 'mock-user-alice-001',
    email: 'alice.dev@talentsphere.test',
    full_name: 'Alice Dev',
    avatar_url: null,
    roles: ['ROLE_USER'],
  },
  bob: {
    id: 'mock-user-bob-002',
    email: 'bob.recruiter@talentsphere.test',
    full_name: 'Bob Recruiter',
    avatar_url: null,
    roles: ['ROLE_RECRUITER'],
  },
  eve: {
    id: 'mock-user-eve-005',
    email: 'eve.admin@talentsphere.test',
    full_name: 'Eve Admin',
    avatar_url: null,
    roles: ['ROLE_ADMIN'],
  },
};

// ---------------------------------------------------------------------------
// Mock Courses
// ---------------------------------------------------------------------------
export const MOCK_COURSES: Course[] = [
  {
    id: 'course-react-patterns',
    title: 'Advanced React Patterns',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'Master render props, hooks, and compound components. Build scalable, maintainable React applications using advanced composition patterns.',
    xp: 500,
    category: 'Development',
    duration: '6 hours',
    difficulty: 'Advanced',
    lessons: [
      { id: 'lesson-react-1', courseId: 'course-react-patterns', title: 'Introduction to Render Props', content: '', orderIndex: 1, videoUrl: '', durationMinutes: 10, isFree: true },
      { id: 'lesson-react-2', courseId: 'course-react-patterns', title: 'Custom Hooks Deep Dive', content: '', orderIndex: 2, videoUrl: '', durationMinutes: 15, isFree: false },
      { id: 'lesson-react-3', courseId: 'course-react-patterns', title: 'Compound Components', content: '', orderIndex: 3, videoUrl: '', durationMinutes: 13, isFree: false },
    ],
  },
  {
    id: 'course-python-basics',
    title: 'Python for Beginners',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'Learn Python programming from scratch. Cover data types, control flow, functions, and object-oriented programming fundamentals.',
    xp: 300,
    category: 'Development',
    duration: '10 hours',
    difficulty: 'Beginner',
    lessons: [
      { id: 'lesson-python-1', courseId: 'course-python-basics', title: 'Variables & Data Types', content: '', orderIndex: 1, videoUrl: '', durationMinutes: 12, isFree: true },
      { id: 'lesson-python-2', courseId: 'course-python-basics', title: 'Control Flow', content: '', orderIndex: 2, videoUrl: '', durationMinutes: 14, isFree: false },
      { id: 'lesson-python-3', courseId: 'course-python-basics', title: 'Functions & Modules', content: '', orderIndex: 3, videoUrl: '', durationMinutes: 16, isFree: false },
      { id: 'lesson-python-4', courseId: 'course-python-basics', title: 'OOP in Python', content: '', orderIndex: 4, videoUrl: '', durationMinutes: 20, isFree: false },
    ],
  },
  {
    id: 'course-system-design',
    title: 'System Design Interview Prep',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'Ace your system design interviews. Learn to design scalable distributed systems, load balancers, databases, and caching strategies.',
    xp: 750,
    category: 'Career',
    duration: '12 hours',
    difficulty: 'Expert',
    lessons: [
      { id: 'lesson-sysdesign-1', courseId: 'course-system-design', title: 'Scalability Fundamentals', content: '', orderIndex: 1, durationMinutes: 25, isFree: true },
      { id: 'lesson-sysdesign-2', courseId: 'course-system-design', title: 'Database Design', content: '', orderIndex: 2, durationMinutes: 30, isFree: false },
      { id: 'lesson-sysdesign-3', courseId: 'course-system-design', title: 'Caching Strategies', content: '', orderIndex: 3, durationMinutes: 22, isFree: false },
      { id: 'lesson-sysdesign-4', courseId: 'course-system-design', title: 'Load Balancing', content: '', orderIndex: 4, durationMinutes: 18, isFree: false },
      { id: 'lesson-sysdesign-5', courseId: 'course-system-design', title: 'Message Queues', content: '', orderIndex: 5, durationMinutes: 20, isFree: false },
    ],
  },
  {
    id: 'course-docker-k8s',
    title: 'Docker & Kubernetes Mastery',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'From containers to orchestration. Learn Docker fundamentals, multi-stage builds, Kubernetes deployments, and Helm charts.',
    xp: 600,
    category: 'DevOps',
    duration: '8 hours',
    difficulty: 'Normal',
    lessons: [
      { id: 'lesson-dk-1', courseId: 'course-docker-k8s', title: 'Docker Basics', content: '', orderIndex: 1, durationMinutes: 15, isFree: true },
      { id: 'lesson-dk-2', courseId: 'course-docker-k8s', title: 'Multi-stage Builds', content: '', orderIndex: 2, durationMinutes: 12, isFree: false },
      { id: 'lesson-dk-3', courseId: 'course-docker-k8s', title: 'Kubernetes Architecture', content: '', orderIndex: 3, durationMinutes: 25, isFree: false },
      { id: 'lesson-dk-4', courseId: 'course-docker-k8s', title: 'Helm Charts', content: '', orderIndex: 4, durationMinutes: 18, isFree: false },
    ],
  },
  {
    id: 'course-ml-fundamentals',
    title: 'Machine Learning Fundamentals',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'Introduction to machine learning concepts. Covers supervised and unsupervised learning, neural networks, and model evaluation.',
    xp: 700,
    category: 'Data Science',
    duration: '15 hours',
    difficulty: 'Advanced',
    lessons: [
      { id: 'lesson-ml-1', courseId: 'course-ml-fundamentals', title: 'Supervised Learning', content: '', orderIndex: 1, durationMinutes: 30, isFree: true },
      { id: 'lesson-ml-2', courseId: 'course-ml-fundamentals', title: 'Unsupervised Learning', content: '', orderIndex: 2, durationMinutes: 25, isFree: false },
      { id: 'lesson-ml-3', courseId: 'course-ml-fundamentals', title: 'Neural Networks', content: '', orderIndex: 3, durationMinutes: 35, isFree: false },
    ],
  },
  {
    id: 'course-typescript-deep',
    title: 'TypeScript Deep Dive',
    provider: 'David Power',
    status: 'NOT_STARTED',
    progress: 0,
    description: 'Advanced TypeScript patterns including generics, conditional types, mapped types, and building type-safe libraries.',
    xp: 450,
    category: 'Development',
    duration: '7 hours',
    difficulty: 'Advanced',
    lessons: [
      { id: 'lesson-ts-1', courseId: 'course-typescript-deep', title: 'Advanced Generics', content: '', orderIndex: 1, durationMinutes: 20, isFree: true },
      { id: 'lesson-ts-2', courseId: 'course-typescript-deep', title: 'Mapped Types', content: '', orderIndex: 2, durationMinutes: 18, isFree: false },
      { id: 'lesson-ts-3', courseId: 'course-typescript-deep', title: 'Template Literal Types', content: '', orderIndex: 3, durationMinutes: 15, isFree: false },
      { id: 'lesson-ts-4', courseId: 'course-typescript-deep', title: 'Type-safe Libraries', content: '', orderIndex: 4, durationMinutes: 22, isFree: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock Enrollments
// ---------------------------------------------------------------------------
export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enrollment-001',
    userId: MOCK_USERS.alice.id,
    courseId: 'course-react-patterns',
    status: 'IN_PROGRESS',
    progress: 45,
    enrolledAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    startedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    completedLessonIds: ['lesson-react-1'],
  },
];

// ---------------------------------------------------------------------------
// Mock Learning Paths
// ---------------------------------------------------------------------------
export const MOCK_LEARNING_PATHS: LearningPath[] = [
  {
    id: 'path-fullstack',
    name: 'Full-Stack Developer Path',
    description: 'From frontend to backend to deployment — become a complete full-stack developer.',
    imageUrl: 'https://via.placeholder.com/400x200?text=FullStack+Path',
    courses: [
      { courseId: 'course-typescript-deep', orderIndex: 1, isRequired: true },
      { courseId: 'course-react-patterns', orderIndex: 2, isRequired: true },
      { courseId: 'course-python-basics', orderIndex: 3, isRequired: false },
      { courseId: 'course-docker-k8s', orderIndex: 4, isRequired: true },
      { courseId: 'course-system-design', orderIndex: 5, isRequired: true },
    ],
  },
  {
    id: 'path-ml-engineer',
    name: 'ML Engineer Path',
    description: 'Build intelligent systems from the ground up.',
    imageUrl: 'https://via.placeholder.com/400x200?text=ML+Engineer+Path',
    courses: [
      { courseId: 'course-python-basics', orderIndex: 1, isRequired: true },
      { courseId: 'course-ml-fundamentals', orderIndex: 2, isRequired: true },
      { courseId: 'course-docker-k8s', orderIndex: 3, isRequired: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock Jobs
// ---------------------------------------------------------------------------
export const MOCK_JOBS = [
  {
    id: 'job-001',
    title: 'Senior Frontend Engineer',
    company_id: 'comp-001',
    companies: { name: 'TechCorp', logo_url: 'https://via.placeholder.com/100?text=TechCorp' },
    location: 'Remote',
    job_type: 'FULL_TIME',
    salary_min: 120000,
    salary_max: 180000,
    description: 'Build next-generation UI experiences using React and TypeScript.',
    requirements: ['5+ years React', 'TypeScript', 'System Design'],
    posted_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'PUBLISHED',
    company_id: 'comp-1',
    location: 'Remote',
    job_type: 'FULL_TIME',
    salary_range: '$120k - $160k',
    description: 'We are looking for a Senior Frontend Engineer to join our team...',
    requirements: ['React', 'TypeScript', 'Tailwind CSS'],
    posted_at: new Date().toISOString(),
    status: 'PUBLISHED',
    companies: {
      id: 'comp-1',
      name: 'TechFlow Systems',
      logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=TF',
      location: 'San Francisco, CA',
      industry: 'Software Development'
    }
  },
  {
    id: 'job-2',
    title: 'Product Designer',
    company_id: 'comp-2',
    location: 'New York, NY',
    job_type: 'CONTRACT',
    salary_range: '$80/hr - $100/hr',
    description: 'Join our design team to build beautiful user experiences...',
    requirements: ['Figma', 'UI/UX', 'Prototyping'],
    posted_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'PUBLISHED',
    companies: {
      id: 'comp-2',
      name: 'CreativePulse',
      logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=CP',
      location: 'New York, NY',
      industry: 'Design Services'
    }
  }
];

export const mockFeed: any[] = [
  {
    id: 'feed-1',
    type: 'JOB_CHANGE',
    userId: 'user-2',
    userName: 'Sarah Jenkins',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    headline: 'Senior Product Manager @ InnovateIQ',
    content: 'Started new position as Head of Product at InnovateIQ',
    timestamp: new Date().toISOString()
  },
  {
    id: 'feed-2',
    type: 'SKILL_ADDED',
    userId: 'user-3',
    userName: 'Marcus Chen',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    headline: 'Full Stack Developer',
    content: 'Added new skill: Kubernetes',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

export const mockSuggestions: any[] = [
  {
    id: 'user-4',
    userId: 'user-4',
    fullName: 'Elena Rodriguez',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    headline: 'UX Researcher',
    currentRole: 'Senior Researcher',
    location: 'Austin, TX',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena'
  },
  {
    id: 'user-5',
    userId: 'user-5',
    fullName: 'David Kim',
    firstName: 'David',
    lastName: 'Kim',
    headline: 'Backend Lead',
    currentRole: 'Principal Engineer',
    location: 'Seattle, WA',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
  }
];

export const fetchJobsFromMock = async (params?: any) => {
  await new Promise(r => setTimeout(r, 500));
  let filtered = [...MOCK_JOBS];
  if (params?.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(j => j.title.toLowerCase().includes(s) || j.description.toLowerCase().includes(s));
  }
  return filtered;
};


export const fetchFeedFromMock = async () => {
  await new Promise(r => setTimeout(r, 500));
  return mockFeed;
};

export const fetchSuggestionsFromMock = async () => {
  await new Promise(r => setTimeout(r, 500));
  return mockSuggestions;
};
