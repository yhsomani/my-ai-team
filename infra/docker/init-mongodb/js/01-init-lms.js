// =============================================================================
// TalentSphere LMS Service — MongoDB Seed Data
// Mirrors the PostgreSQL seed-data.sql courses/lessons/enrollments for MongoDB
// =============================================================================

// Switch to the LMS database
db = db.getSiblingDB('talentsphere_lms');

// Drop existing collections for idempotency
db.courses.drop();
db.lessons.drop();
db.enrollments.drop();
db.learningPaths.drop();

// =============================================================================
// COURSES
// =============================================================================
db.courses.insertMany([
  {
    _id: "course-react-patterns",
    title: "Advanced React Patterns",
    slug: "adv-react-patterns",
    description: "Master render props, hooks, and compound components. Build scalable, maintainable React applications using advanced composition patterns.",
    instructorId: "david-power-user",
    category: "Development",
    level: "Advanced",
    xpReward: 500,
    price: 49.99,
    rating: "4.8",
    studentCount: 1247,
    imageUrl: "https://via.placeholder.com/400x200?text=React+Patterns",
    lessonIds: ["lesson-react-1", "lesson-react-2", "lesson-react-3"]
  },
  {
    _id: "course-python-basics",
    title: "Python for Beginners",
    slug: "python-basics",
    description: "Learn Python programming from scratch. Cover data types, control flow, functions, and object-oriented programming fundamentals.",
    instructorId: "david-power-user",
    category: "Development",
    level: "Beginner",
    xpReward: 300,
    price: 29.99,
    rating: "4.6",
    studentCount: 3892,
    imageUrl: "https://via.placeholder.com/400x200?text=Python+Basics",
    lessonIds: ["lesson-python-1", "lesson-python-2", "lesson-python-3", "lesson-python-4"]
  },
  {
    _id: "course-system-design",
    title: "System Design Interview Prep",
    slug: "sys-design-prep",
    description: "Ace your system design interviews. Learn to design scalable distributed systems, load balancers, databases, and caching strategies.",
    instructorId: "david-power-user",
    category: "Career",
    level: "Expert",
    xpReward: 750,
    price: 99.99,
    rating: "4.9",
    studentCount: 856,
    imageUrl: "https://via.placeholder.com/400x200?text=System+Design",
    lessonIds: ["lesson-sysdesign-1", "lesson-sysdesign-2", "lesson-sysdesign-3", "lesson-sysdesign-4", "lesson-sysdesign-5"]
  },
  {
    _id: "course-docker-k8s",
    title: "Docker & Kubernetes Mastery",
    slug: "docker-k8s-mastery",
    description: "From containers to orchestration. Learn Docker fundamentals, multi-stage builds, Kubernetes deployments, and Helm charts.",
    instructorId: "david-power-user",
    category: "DevOps",
    level: "Intermediate",
    xpReward: 600,
    price: 79.99,
    rating: "4.7",
    studentCount: 2103,
    imageUrl: "https://via.placeholder.com/400x200?text=Docker+K8s",
    lessonIds: ["lesson-dk-1", "lesson-dk-2", "lesson-dk-3", "lesson-dk-4"]
  },
  {
    _id: "course-ml-fundamentals",
    title: "Machine Learning Fundamentals",
    slug: "ml-fundamentals",
    description: "Introduction to machine learning concepts. Covers supervised and unsupervised learning, neural networks, and model evaluation.",
    instructorId: "david-power-user",
    category: "Data Science",
    level: "Intermediate",
    xpReward: 700,
    price: 89.99,
    rating: "4.5",
    studentCount: 1567,
    imageUrl: "https://via.placeholder.com/400x200?text=ML+Fundamentals",
    lessonIds: ["lesson-ml-1", "lesson-ml-2", "lesson-ml-3"]
  },
  {
    _id: "course-typescript-deep",
    title: "TypeScript Deep Dive",
    slug: "typescript-deep-dive",
    description: "Advanced TypeScript patterns including generics, conditional types, mapped types, and building type-safe libraries.",
    instructorId: "david-power-user",
    category: "Development",
    level: "Advanced",
    xpReward: 450,
    price: 59.99,
    rating: "4.8",
    studentCount: 982,
    imageUrl: "https://via.placeholder.com/400x200?text=TypeScript",
    lessonIds: ["lesson-ts-1", "lesson-ts-2", "lesson-ts-3", "lesson-ts-4"]
  }
]);

// =============================================================================
// LESSONS
// =============================================================================
db.lessons.insertMany([
  // React Patterns lessons
  { _id: "lesson-react-1", courseId: "course-react-patterns", title: "Introduction to Render Props", content: "# Render Props\n\nLearn the fundamentals of the render props pattern...", orderIndex: 1, videoUrl: "https://youtube.com/watch?v=react-1", durationMinutes: 10, isFree: true },
  { _id: "lesson-react-2", courseId: "course-react-patterns", title: "Custom Hooks Deep Dive", content: "# Custom Hooks\n\nBuild reusable logic with custom hooks...", orderIndex: 2, videoUrl: "https://youtube.com/watch?v=react-2", durationMinutes: 15, isFree: false },
  { _id: "lesson-react-3", courseId: "course-react-patterns", title: "Compound Components", content: "# Compound Components\n\nCreate flexible component APIs...", orderIndex: 3, videoUrl: "https://youtube.com/watch?v=react-3", durationMinutes: 13, isFree: false },

  // Python lessons
  { _id: "lesson-python-1", courseId: "course-python-basics", title: "Variables & Data Types", content: "# Python Basics\n\nLearn about variables...", orderIndex: 1, videoUrl: "https://youtube.com/watch?v=python-1", durationMinutes: 12, isFree: true },
  { _id: "lesson-python-2", courseId: "course-python-basics", title: "Control Flow", content: "# Control Flow\n\nIf statements, loops...", orderIndex: 2, videoUrl: "https://youtube.com/watch?v=python-2", durationMinutes: 14, isFree: false },
  { _id: "lesson-python-3", courseId: "course-python-basics", title: "Functions & Modules", content: "# Functions\n\nDefining and using functions...", orderIndex: 3, videoUrl: "https://youtube.com/watch?v=python-3", durationMinutes: 16, isFree: false },
  { _id: "lesson-python-4", courseId: "course-python-basics", title: "OOP in Python", content: "# OOP\n\nClasses, inheritance, polymorphism...", orderIndex: 4, videoUrl: "https://youtube.com/watch?v=python-4", durationMinutes: 20, isFree: false },

  // System Design lessons
  { _id: "lesson-sysdesign-1", courseId: "course-system-design", title: "Scalability Fundamentals", content: "# Scalability\n\nHorizontal vs vertical scaling...", orderIndex: 1, videoUrl: null, durationMinutes: 25, isFree: true },
  { _id: "lesson-sysdesign-2", courseId: "course-system-design", title: "Database Design", content: "# Database Design\n\nSQL vs NoSQL decisions...", orderIndex: 2, videoUrl: null, durationMinutes: 30, isFree: false },
  { _id: "lesson-sysdesign-3", courseId: "course-system-design", title: "Caching Strategies", content: "# Caching\n\nRedis, Memcached, CDN...", orderIndex: 3, videoUrl: null, durationMinutes: 22, isFree: false },
  { _id: "lesson-sysdesign-4", courseId: "course-system-design", title: "Load Balancing", content: "# Load Balancing\n\nRound robin, consistent hashing...", orderIndex: 4, videoUrl: null, durationMinutes: 18, isFree: false },
  { _id: "lesson-sysdesign-5", courseId: "course-system-design", title: "Message Queues", content: "# Message Queues\n\nRabbitMQ, Kafka patterns...", orderIndex: 5, videoUrl: null, durationMinutes: 20, isFree: false },

  // Docker & K8s lessons
  { _id: "lesson-dk-1", courseId: "course-docker-k8s", title: "Docker Basics", content: "# Docker\n\nContainerization fundamentals...", orderIndex: 1, videoUrl: null, durationMinutes: 15, isFree: true },
  { _id: "lesson-dk-2", courseId: "course-docker-k8s", title: "Multi-stage Builds", content: "# Multi-stage Builds\n\nOptimize your images...", orderIndex: 2, videoUrl: null, durationMinutes: 12, isFree: false },
  { _id: "lesson-dk-3", courseId: "course-docker-k8s", title: "Kubernetes Architecture", content: "# K8s\n\nPods, services, deployments...", orderIndex: 3, videoUrl: null, durationMinutes: 25, isFree: false },
  { _id: "lesson-dk-4", courseId: "course-docker-k8s", title: "Helm Charts", content: "# Helm\n\nPackaging K8s applications...", orderIndex: 4, videoUrl: null, durationMinutes: 18, isFree: false },

  // ML lessons
  { _id: "lesson-ml-1", courseId: "course-ml-fundamentals", title: "Supervised Learning", content: "# Supervised Learning\n\nRegression, classification...", orderIndex: 1, videoUrl: null, durationMinutes: 30, isFree: true },
  { _id: "lesson-ml-2", courseId: "course-ml-fundamentals", title: "Unsupervised Learning", content: "# Unsupervised Learning\n\nClustering, dimensionality reduction...", orderIndex: 2, videoUrl: null, durationMinutes: 25, isFree: false },
  { _id: "lesson-ml-3", courseId: "course-ml-fundamentals", title: "Neural Networks", content: "# Neural Networks\n\nPerceptrons, backpropagation...", orderIndex: 3, videoUrl: null, durationMinutes: 35, isFree: false },

  // TypeScript lessons
  { _id: "lesson-ts-1", courseId: "course-typescript-deep", title: "Advanced Generics", content: "# Generics\n\nConstraints, inference, conditional types...", orderIndex: 1, videoUrl: null, durationMinutes: 20, isFree: true },
  { _id: "lesson-ts-2", courseId: "course-typescript-deep", title: "Mapped Types", content: "# Mapped Types\n\nPartial, Required, Record...", orderIndex: 2, videoUrl: null, durationMinutes: 18, isFree: false },
  { _id: "lesson-ts-3", courseId: "course-typescript-deep", title: "Template Literal Types", content: "# Template Literals\n\nString manipulation at type level...", orderIndex: 3, videoUrl: null, durationMinutes: 15, isFree: false },
  { _id: "lesson-ts-4", courseId: "course-typescript-deep", title: "Type-safe Libraries", content: "# Type-safe Libraries\n\nBuilding robust APIs...", orderIndex: 4, videoUrl: null, durationMinutes: 22, isFree: false }
]);

// =============================================================================
// LEARNING PATHS
// =============================================================================
db.learningPaths.insertMany([
  {
    _id: "path-fullstack",
    name: "Full-Stack Developer Path",
    description: "From frontend to backend to deployment — become a complete full-stack developer.",
    imageUrl: "https://via.placeholder.com/400x200?text=FullStack+Path",
    courses: [
      { courseId: "course-typescript-deep", orderIndex: 1, isRequired: true },
      { courseId: "course-react-patterns", orderIndex: 2, isRequired: true },
      { courseId: "course-python-basics", orderIndex: 3, isRequired: false },
      { courseId: "course-docker-k8s", orderIndex: 4, isRequired: true },
      { courseId: "course-system-design", orderIndex: 5, isRequired: true }
    ]
  },
  {
    _id: "path-ml-engineer",
    name: "ML Engineer Path",
    description: "Build intelligent systems from the ground up.",
    imageUrl: "https://via.placeholder.com/400x200?text=ML+Engineer+Path",
    courses: [
      { courseId: "course-python-basics", orderIndex: 1, isRequired: true },
      { courseId: "course-ml-fundamentals", orderIndex: 2, isRequired: true },
      { courseId: "course-docker-k8s", orderIndex: 3, isRequired: false }
    ]
  }
]);

// Create indexes
db.courses.createIndex({ title: 1 });
db.courses.createIndex({ slug: 1 }, { unique: true });
db.courses.createIndex({ category: 1 });
db.courses.createIndex({ instructorId: 1 });
db.lessons.createIndex({ courseId: 1 });
db.lessons.createIndex({ courseId: 1, orderIndex: 1 });
db.enrollments.createIndex({ userId: 1 });
db.enrollments.createIndex({ courseId: 1, userId: 1 }, { unique: true });
db.learningPaths.createIndex({ name: 1 });

print("✅ LMS MongoDB seed data inserted successfully");
print("   - Courses: " + db.courses.countDocuments());
print("   - Lessons: " + db.lessons.countDocuments());
print("   - Learning Paths: " + db.learningPaths.countDocuments());
