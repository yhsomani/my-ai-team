import { USER_ROLES } from '../../src/navigation/routeRegistry';

const talentProfileRow: Record<string, unknown> = {
  id: 'profile-e2e-user',
  user_id: 'e2e-role_user',
  headline: 'Frontend Platform Engineer',
  location: 'Remote',
  bio: 'I build accessible, reliable product workflows.',
  summary: 'I build accessible, reliable product workflows.',
  website: 'https://portfolio.example/e2e-user',
  profiles: {
    email: 'e2e@talentsphere.test',
    first_name: 'E2E',
    last_name: 'User',
    full_name: 'E2E User',
    avatar_url: null,
  },
  skills: [
    { id: 'skill-react', name: 'React' },
    { id: 'skill-typescript', name: 'TypeScript' },
  ],
  experiences: [
    {
      id: 'experience-frontend',
      title: 'Frontend Engineer',
      company: 'Orbit Apps',
      current: true,
      description: 'Shipped design-system backed workflow surfaces.',
    },
  ],
  educations: [],
  certifications: [],
  languages: [],
  projects: [],
};

const jobRow: Record<string, unknown> = {
  id: 'job-visual-audit',
  title: 'Frontend Platform Engineer',
  description: 'Build accessible product workflows for TalentSphere teams.',
  company_id: 'company-northstar',
  location: 'Remote',
  job_type: 'FULL_TIME',
  salary_min: 140000,
  salary_max: 175000,
  requirements: ['React', 'TypeScript', 'Accessibility'],
  posted_at: '2026-06-26T09:00:00.000Z',
  status: 'PUBLISHED',
  companies: {
    id: 'company-northstar',
    name: 'Northstar Labs',
    logo_url: null,
    location: 'Remote',
    industry: 'Product Engineering',
  },
};

const conversationId = 'conversation-visual-audit';
const participantId = 'candidate-lena-visual';

const participantProfile = {
  id: participantId,
  full_name: 'Lena Ortiz',
  first_name: 'Lena',
  last_name: 'Ortiz',
  email: 'lena.ortiz@example.test',
  avatar_url: null,
};

const conversationParticipants = [
  {
    conversation_id: conversationId,
    conversations: {
      id: conversationId,
      name: null,
      is_group: false,
      created_by: participantId,
      created_at: '2026-06-27T08:00:00.000Z',
      updated_at: '2026-06-27T08:30:00.000Z',
      conversation_participants: [
        { user_id: 'e2e-role_user', last_read_at: null },
        { user_id: participantId, last_read_at: null },
      ],
      messages: [
        {
          id: 'message-preview-001',
          content: 'Can you share the latest portfolio link?',
          sender_id: participantId,
          created_at: '2026-06-27T08:30:00.000Z',
        },
      ],
    },
  },
];

const existingMessages = [
  {
    id: 'message-lena-001',
    conversation_id: conversationId,
    sender_id: participantId,
    content: 'Can you share the latest portfolio link?',
    message_type: 'TEXT',
    attachment_url: null,
    status: 'SENT',
    created_at: '2026-06-27T08:30:00.000Z',
    read_at: null,
    profiles: {
      id: participantId,
      full_name: 'Lena Ortiz',
      avatar_url: null,
    },
  },
];

export const defaultRouteAuditRestFixtures = {
  jobs: [jobRow],
  profile: talentProfileRow,
  applications: [],
  applicationDraft: null,
  applicationDraftHistory: [],
  applicationStatusEvents: [],
  candidateNotes: [],
  candidateScorecards: [],
  conversationParticipants,
  messages: existingMessages,
  profiles: [participantProfile],
};

export type ViewportCase = {
  name: string;
  width: number;
  height: number;
};

export type RouteAuditCase = {
  name: string;
  path: string;
  heading: RegExp;
  roles: readonly string[] | null;
  viewports: readonly ViewportCase[];
};

const desktop: ViewportCase = { name: 'desktop', width: 1440, height: 1000 };
const mobile: ViewportCase = { name: 'mobile', width: 390, height: 844 };
const allViewports = [desktop, mobile] as const;

export const routeAuditCases: readonly RouteAuditCase[] = [
  { name: 'landing', path: '/', heading: /^TalentSphere$/, roles: null, viewports: allViewports },
  { name: 'login', path: '/login', heading: /^Sign in to TalentSphere$/, roles: null, viewports: allViewports },
  { name: 'register', path: '/register', heading: /^Create your account$/, roles: null, viewports: allViewports },
  { name: 'not found recovery', path: '/missing-route-for-audit', heading: /^Page not found$/, roles: null, viewports: allViewports },
  { name: 'talent dashboard', path: '/dashboard', heading: /^Welcome back, E2E User$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'talent jobs', path: '/jobs', heading: /^Jobs$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'learning', path: '/lms', heading: /^Learning$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'challenges', path: '/challenges', heading: /^Challenges$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'network', path: '/networking', heading: /^Network$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'ai assistant', path: '/ai', heading: /^AI Assistant$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'messages', path: '/messaging', heading: /^Messages$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'billing', path: '/billing', heading: /^Billing$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'settings', path: '/settings', heading: /^Settings$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'own profile', path: '/profile', heading: /^Profile$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'profile detail', path: '/profile/e2e-role_user', heading: /^Profile$/, roles: [USER_ROLES.user], viewports: [desktop] },
  { name: 'resume builder', path: '/resume', heading: /^Resume Builder$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'career paths', path: '/career-path', heading: /^Career Paths$/, roles: [USER_ROLES.user], viewports: allViewports },
  { name: 'recruiter dashboard', path: '/dashboard', heading: /^Recruiter Console$/, roles: [USER_ROLES.recruiter], viewports: allViewports },
  { name: 'recruiter candidates', path: '/candidates', heading: /^Candidates$/, roles: [USER_ROLES.recruiter], viewports: allViewports },
  { name: 'recruiter post job', path: '/jobs/post', heading: /^(Create Job Draft|Edit Job Draft)$/, roles: [USER_ROLES.recruiter], viewports: allViewports },
  { name: 'admin console', path: '/admin', heading: /^Admin Console$/, roles: [USER_ROLES.admin], viewports: allViewports },
] as const;
