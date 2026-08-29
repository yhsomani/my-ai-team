#!/usr/bin/env node

/**
 * TalentSphere Mock Server
 * 
 * Provides a lightweight mock API for frontend preview without requiring
 * Supabase or backend microservices.
 * 
 * Features:
 * - Mock authentication (register/login)
 * - Mock user profiles
 * - Mock job listings
 * - Mock applications
 * - Mock learning courses
 * - Mock challenges
 * - Mock networking connections
 * - Mock messaging
 * - Mock notifications
 * 
 * Usage:
 *   npm run mock-server
 * 
 * Or directly:
 *   node scripts/mock-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.MOCK_PORT || 3001;
const HOST = 'localhost';

// In-memory "database"
let users = [
  {
    id: 'mock-user-dev-001',
    email: 'demo@talentsphere.dev',
    password: 'demo123',
    role: 'ROLE_USER',
    profile: {
      firstName: 'Demo',
      lastName: 'User',
      headline: 'Full Stack Developer',
      avatarUrl: null,
      location: 'San Francisco, CA',
      bio: 'Passionate developer building innovative solutions.',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      experience: [],
      education: []
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'recruiter-001',
    email: 'recruiter@techcorp.com',
    password: 'demo123',
    role: 'ROLE_RECRUITER',
    profile: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      headline: 'Technical Recruiter at TechCorp',
      avatarUrl: null,
      company: 'TechCorp Inc.',
      location: 'New York, NY'
    },
    createdAt: new Date().toISOString()
  }
];

let jobs = [
  {
    id: 'job-001',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp Inc.',
    companyId: 'company-001',
    location: 'San Francisco, CA (Remote)',
    type: 'FULL_TIME',
    level: 'SENIOR',
    salary: { min: 150000, max: 200000, currency: 'USD' },
    description: 'We are looking for an experienced Frontend Engineer to join our team...',
    requirements: ['5+ years React experience', 'TypeScript proficiency', 'CSS/Tailwind expertise'],
    postedBy: 'recruiter-001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'job-002',
    title: 'Backend Developer',
    company: 'StartupXYZ',
    companyId: 'company-002',
    location: 'New York, NY (Hybrid)',
    type: 'FULL_TIME',
    level: 'MID',
    salary: { min: 120000, max: 160000, currency: 'USD' },
    description: 'Join our fast-growing startup as a Backend Developer...',
    requirements: ['3+ years Java/Spring Boot', 'PostgreSQL experience', 'Microservices architecture'],
    postedBy: 'recruiter-001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'job-003',
    title: 'Full Stack Engineer',
    company: 'Innovation Labs',
    companyId: 'company-003',
    location: 'Remote',
    type: 'CONTRACT',
    level: 'SENIOR',
    salary: { min: 80, max: 120, currency: 'USD', period: 'hourly' },
    description: 'Contract opportunity for an experienced Full Stack Engineer...',
    requirements: ['React', 'Node.js', 'AWS', 'Agile methodology'],
    postedBy: 'recruiter-001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let courses = [
  {
    id: 'course-001',
    title: 'Advanced React Patterns',
    instructor: 'John Doe',
    description: 'Master advanced React concepts including hooks, context, and performance optimization.',
    thumbnailUrl: 'https://via.placeholder.com/400x225?text=React+Course',
    duration: 8.5,
    level: 'ADVANCED',
    category: 'Frontend Development',
    rating: 4.8,
    studentsEnrolled: 1234,
    price: 49.99,
    createdAt: new Date().toISOString()
  },
  {
    id: 'course-002',
    title: 'Spring Boot Microservices',
    instructor: 'Jane Smith',
    description: 'Build scalable microservices with Spring Boot and Spring Cloud.',
    thumbnailUrl: 'https://via.placeholder.com/400x225?text=Spring+Boot',
    duration: 12.0,
    level: 'INTERMEDIATE',
    category: 'Backend Development',
    rating: 4.7,
    studentsEnrolled: 892,
    price: 59.99,
    createdAt: new Date().toISOString()
  },
  {
    id: 'course-003',
    title: 'System Design Fundamentals',
    instructor: 'Mike Johnson',
    description: 'Learn to design large-scale distributed systems.',
    thumbnailUrl: 'https://via.placeholder.com/400x225?text=System+Design',
    duration: 10.0,
    level: 'ADVANCED',
    category: 'Architecture',
    rating: 4.9,
    studentsEnrolled: 2156,
    price: 69.99,
    createdAt: new Date().toISOString()
  }
];

let challenges = [
  {
    id: 'challenge-001',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'EASY',
    category: 'ARRAYS',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
    ],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n  \n}`,
      python: `def two_sum(nums, target):\n    # Write your solution here\n    pass`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        \n    }\n}`
    },
    testCases: [
      { input: [[2,7,11,15], 9], expected: [0,1] },
      { input: [[3,2,4], 6], expected: [1,2] },
      { input: [[3,3], 6], expected: [0,1] }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'challenge-002',
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
    difficulty: 'EASY',
    category: 'STACK',
    examples: [
      { input: 's = "()[]"', output: 'true', explanation: '' },
      { input: 's = "(]"', output: 'false', explanation: '' }
    ],
    constraints: ['1 <= s.length <= 10^4'],
    starterCode: {
      javascript: `function isValid(s) {\n  // Write your solution here\n  \n}`,
      python: `def is_valid(s):\n    # Write your solution here\n    pass`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        \n    }\n}`
    },
    testCases: [
      { input: ['()'], expected: true },
      { input: ['()[]{}'], expected: true },
      { input: ['(]'], expected: false }
    ],
    createdAt: new Date().toISOString()
  }
];

let connections = [
  {
    id: 'conn-001',
    fromUserId: 'mock-user-dev-001',
    toUserId: 'user-002',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  }
];

let messages = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    senderId: 'user-002',
    content: 'Hi! I saw your profile and would love to connect.',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read: false
  }
];

let applications = [];
let notifications = [];

// ============================================================================
// Helper Functions
// ============================================================================

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function error(res, message, statusCode = 400) {
  json(res, { error: message }, statusCode);
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function findUserById(id) {
  return users.find(u => u.id === id);
}

// ============================================================================
// Route Handlers
// ============================================================================

const routes = {
  // Authentication
  'POST /api/v1/auth/register': async (req, res) => {
    const { email, password, role = 'ROLE_USER', profile } = await parseBody(req);
    
    if (!email || !password) {
      return error(res, 'Email and password are required');
    }
    
    if (findUserByEmail(email)) {
      return error(res, 'User already exists', 409);
    }
    
    const user = {
      id: generateId('user'),
      email,
      password, // In real app, hash this!
      role,
      profile: profile || {
        firstName: 'New',
        lastName: 'User',
        headline: 'Professional'
      },
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    console.log(`[MOCK] User registered: ${email}`);
    json(res, { 
      user: { id: user.id, email: user.email, role: user.role },
      token: `mock-token-${user.id}`
    }, 201);
  },
  
  'POST /api/v1/auth/login': async (req, res) => {
    const { email, password } = await parseBody(req);
    
    if (!email || !password) {
      return error(res, 'Email and password are required');
    }
    
    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      return error(res, 'Invalid credentials', 401);
    }
    
    console.log(`[MOCK] User logged in: ${email}`);
    json(res, {
      user: { id: user.id, email: user.email, role: user.role, profile: user.profile },
      token: `mock-token-${user.id}`
    });
  },
  
  'GET /api/v1/auth/me': (req, res) => {
    // Mock authenticated user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return error(res, 'Unauthorized', 401);
    }
    
    const user = users[0]; // Return demo user
    json(res, {
      user: { id: user.id, email: user.email, role: user.role, profile: user.profile }
    });
  },
  
  // Jobs
  'GET /api/v1/jobs': (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type');
    const level = url.searchParams.get('level');
    
    let filtered = [...jobs];
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    }
    
    if (type) filtered = filtered.filter(j => j.type === type);
    if (level) filtered = filtered.filter(j => j.level === level);
    
    json(res, { jobs: filtered, total: filtered.length });
  },
  
  'GET /api/v1/jobs/:id': (req, res) => {
    const id = req.url.split('/').pop();
    const job = jobs.find(j => j.id === id);
    
    if (!job) {
      return error(res, 'Job not found', 404);
    }
    
    json(res, { job });
  },
  
  'POST /api/v1/jobs': async (req, res) => {
    const jobData = await parseBody(req);
    
    const job = {
      id: generateId('job'),
      ...jobData,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    jobs.push(job);
    console.log(`[MOCK] Job created: ${job.title}`);
    json(res, { job }, 201);
  },
  
  // Applications
  'POST /api/v1/applications': async (req, res) => {
    const appData = await parseBody(req);
    
    const application = {
      id: generateId('app'),
      ...appData,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString()
    };
    
    applications.push(application);
    console.log(`[MOCK] Application submitted for job ${appData.jobId}`);
    json(res, { application }, 201);
  },
  
  'GET /api/v1/applications': (req, res) => {
    json(res, { applications, total: applications.length });
  },
  
  // Courses
  'GET /api/v1/courses': (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const category = url.searchParams.get('category');
    
    let filtered = [...courses];
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }
    
    json(res, { courses: filtered, total: filtered.length });
  },
  
  'GET /api/v1/courses/:id': (req, res) => {
    const id = req.url.split('/').pop();
    const course = courses.find(c => c.id === id);
    
    if (!course) {
      return error(res, 'Course not found', 404);
    }
    
    json(res, { course });
  },
  
  // Challenges
  'GET /api/v1/challenges': (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const difficulty = url.searchParams.get('difficulty');
    const category = url.searchParams.get('category');
    
    let filtered = [...challenges];
    if (difficulty) filtered = filtered.filter(c => c.difficulty === difficulty);
    if (category) filtered = filtered.filter(c => c.category === category);
    
    json(res, { challenges: filtered, total: filtered.length });
  },
  
  'GET /api/v1/challenges/:id': (req, res) => {
    const id = req.url.split('/').pop();
    const challenge = challenges.find(c => c.id === id);
    
    if (!challenge) {
      return error(res, 'Challenge not found', 404);
    }
    
    json(res, { challenge });
  },
  
  'POST /api/v1/challenges/:id/submit': async (req, res) => {
    const submission = await parseBody(req);
    console.log('[MOCK] Challenge submission received:', submission);
    
    // Mock evaluation - always passes for demo
    json(res, {
      submission: {
        id: generateId('sub'),
        ...submission,
        status: 'ACCEPTED',
        executedAt: new Date().toISOString()
      }
    });
  },
  
  // Networking
  'GET /api/v1/connections': (req, res) => {
    json(res, { connections, total: connections.length });
  },
  
  'POST /api/v1/connections': async (req, res) => {
    const { toUserId } = await parseBody(req);
    
    const connection = {
      id: generateId('conn'),
      fromUserId: 'mock-user-dev-001',
      toUserId,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    
    connections.push(connection);
    json(res, { connection }, 201);
  },
  
  // Messages
  'GET /api/v1/conversations': (req, res) => {
    const conversations = [{
      id: 'conv-001',
      participants: ['mock-user-dev-001', 'user-002'],
      lastMessage: messages[messages.length - 1],
      unreadCount: 1
    }];
    
    json(res, { conversations, total: conversations.length });
  },
  
  'GET /api/v1/conversations/:id/messages': (req, res) => {
    json(res, { messages, total: messages.length });
  },
  
  'POST /api/v1/messages': async (req, res) => {
    const msgData = await parseBody(req);
    
    const message = {
      id: generateId('msg'),
      ...msgData,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    messages.push(message);
    json(res, { message }, 201);
  },
  
  // Notifications
  'GET /api/v1/notifications': (req, res) => {
    const notifs = [
      {
        id: 'notif-001',
        userId: 'mock-user-dev-001',
        type: 'JOB_MATCH',
        title: 'New job matching your preferences',
        content: 'Senior Frontend Engineer at TechCorp',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'notif-002',
        userId: 'mock-user-dev-001',
        type: 'CONNECTION_REQUEST',
        title: 'New connection request',
        content: 'John Doe wants to connect',
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    json(res, { notifications: notifs, total: notifs.length });
  },
  
  'PATCH /api/v1/notifications/:id/read': (req, res) => {
    json(res, { success: true });
  },
  
  'PATCH /api/v1/notifications/read-all': (req, res) => {
    json(res, { success: true });
  },
  
  // Profile
  'GET /api/v1/profile': (req, res) => {
    const user = users[0];
    json(res, { profile: user.profile });
  },
  
  'PUT /api/v1/profile': async (req, res) => {
    const profileData = await parseBody(req);
    users[0].profile = { ...users[0].profile, ...profileData };
    json(res, { profile: users[0].profile });
  },
  
  // Dashboard stats
  'GET /api/v1/dashboard/stats': (req, res) => {
    json(res, {
      stats: {
        totalJobs: jobs.length,
        totalApplications: applications.length,
        totalCourses: courses.length,
        totalConnections: connections.length,
        unreadNotifications: 2
      }
    });
  },
  
  // Health check
  'GET /api/v1/health': (req, res) => {
    json(res, { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      mode: 'mock'
    });
  }
};

// ============================================================================
// HTTP Server
// ============================================================================

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const method = req.method;
  const pathname = url.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  console.log(`[MOCK] ${method} ${pathname}`);
  
  // Try exact match first
  const routeKey = `${method} ${pathname}`;
  if (routes[routeKey]) {
    try {
      await routes[routeKey](req, res);
    } catch (e) {
      console.error('[MOCK ERROR]', e);
      error(res, 'Internal server error', 500);
    }
    return;
  }
  
  // Try pattern match for parameterized routes
  for (const key of Object.keys(routes)) {
    const [kMethod, kPath] = key.split(' ');
    if (kMethod !== method) continue;
    
    const kParts = kPath.split('/');
    const pathParts = pathname.split('/');
    
    if (kParts.length !== pathParts.length) continue;
    
    let matches = true;
    for (let i = 0; i < kParts.length; i++) {
      if (kParts[i].startsWith(':')) continue; // Parameter
      if (kParts[i] !== pathParts[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      try {
        await routes[key](req, res);
      } catch (e) {
        console.error('[MOCK ERROR]', e);
        error(res, 'Internal server error', 500);
      }
      return;
    }
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
});

// ============================================================================
// Start Server
// ============================================================================

server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎯 TalentSphere Mock Server                          ║
║                                                           ║
║     Running at: http://${HOST}:${PORT}                     ║
║                                                           ║
║     Endpoints:                                            ║
║     • POST /api/v1/auth/register                         ║
║     • POST /api/v1/auth/login                            ║
║     • GET  /api/v1/auth/me                               ║
║     • GET  /api/v1/jobs                                  ║
║     • POST /api/v1/jobs                                  ║
║     • GET  /api/v1/applications                          ║
║     • POST /api/v1/applications                          ║
║     • GET  /api/v1/courses                               ║
║     • GET  /api/v1/challenges                            ║
║     • POST /api/v1/challenges/:id/submit                 ║
║     • GET  /api/v1/connections                           ║
║     • GET  /api/v1/conversations                         ║
║     • GET  /api/v1/notifications                         ║
║     • GET  /api/v1/profile                               ║
║     • GET  /api/v1/dashboard/stats                       ║
║     • GET  /api/v1/health                                ║
║                                                           ║
║     Demo Credentials:                                     ║
║     • Email: demo@talentsphere.dev                       ║
║     • Password: demo123                                  ║
║                                                           ║
║     Press Ctrl+C to stop                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[MOCK] Shutting down...');
  server.close(() => {
    console.log('[MOCK] Server closed');
    process.exit(0);
  });
});
