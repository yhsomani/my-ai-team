import {
  Briefcase,
  Cpu,
  GraduationCap,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Settings,
  Share2,
  ShieldCheck,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export const USER_ROLES = {
  user: 'ROLE_USER',
  recruiter: 'ROLE_RECRUITER',
  admin: 'ROLE_ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type RouteNavSection = 'main' | 'account';
export type MobilePriorityGroup = 'default' | 'recruiter' | 'admin';

export interface AppRouteDefinition {
  id: string;
  path: string;
  label: string;
  allowedRoles?: readonly UserRole[];
  navSection?: RouteNavSection;
  icon?: LucideIcon;
  mobilePriority?: Partial<Record<MobilePriorityGroup, number>>;
  search?: {
    description: string;
    keywords: string;
    icon?: LucideIcon;
  };
}

const recruiterRoles = [USER_ROLES.user, USER_ROLES.recruiter] as const;
const userOnlyRoles = [USER_ROLES.user] as const;
const recruiterOnlyRoles = [USER_ROLES.recruiter] as const;
const adminOnlyRoles = [USER_ROLES.admin] as const;

export const appRouteRegistry: readonly AppRouteDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    navSection: 'main',
    icon: LayoutDashboard,
    mobilePriority: { default: 1, recruiter: 1, admin: 1 },
  },
  {
    id: 'jobs',
    path: '/jobs',
    label: 'Jobs',
    allowedRoles: recruiterRoles,
    navSection: 'main',
    icon: Briefcase,
    mobilePriority: { default: 2, recruiter: 2 },
    search: {
      description: 'Find roles, saved searches, and applications',
      keywords: 'jobs roles applications search saved apply',
    },
  },
  {
    id: 'candidates',
    path: '/candidates',
    label: 'Candidates',
    allowedRoles: recruiterOnlyRoles,
    navSection: 'main',
    icon: UserRound,
    mobilePriority: { recruiter: 3 },
    search: {
      description: 'Review applicants and notes',
      keywords: 'candidates applicants notes review offer reject',
    },
  },
  {
    id: 'learning',
    path: '/lms',
    label: 'Learning',
    allowedRoles: userOnlyRoles,
    navSection: 'main',
    icon: GraduationCap,
    mobilePriority: { default: 3 },
    search: {
      description: 'Continue courses and lessons',
      keywords: 'learning courses lms lessons progress',
    },
  },
  {
    id: 'challenges',
    path: '/challenges',
    label: 'Challenges',
    allowedRoles: userOnlyRoles,
    navSection: 'main',
    icon: Trophy,
    mobilePriority: { default: 4 },
    search: {
      description: 'Solve coding challenges',
      keywords: 'challenges arena coding submissions',
    },
  },
  {
    id: 'networking',
    path: '/networking',
    label: 'Network',
    navSection: 'main',
    icon: Share2,
    mobilePriority: { recruiter: 5 },
    search: {
      description: 'Manage connections and requests',
      keywords: 'network connections requests people',
      icon: UserRound,
    },
  },
  {
    id: 'ai',
    path: '/ai',
    label: 'AI Assistant',
    navSection: 'main',
    icon: Cpu,
    search: {
      description: 'Draft career questions and review AI guidance',
      keywords: 'ai assistant career draft guidance',
      icon: ShieldCheck,
    },
  },
  {
    id: 'messaging',
    path: '/messaging',
    label: 'Messages',
    navSection: 'main',
    icon: MessageSquare,
    mobilePriority: { default: 5, recruiter: 4, admin: 3 },
    search: {
      description: 'Open recruiter and network conversations',
      keywords: 'messages chat conversation recruiter network',
    },
  },
  {
    id: 'admin',
    path: '/admin',
    label: 'Admin Console',
    allowedRoles: adminOnlyRoles,
    navSection: 'main',
    icon: Layers,
    mobilePriority: { admin: 2 },
    search: {
      description: 'Inspect platform health and services',
      keywords: 'admin console health services telemetry',
      icon: ShieldCheck,
    },
  },
  {
    id: 'billing',
    path: '/billing',
    label: 'Billing',
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    navSection: 'account',
    icon: Settings,
    mobilePriority: { admin: 5 },
    search: {
      description: 'Manage notifications, security, and billing snapshot',
      keywords: 'settings notifications security billing password',
    },
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Profile',
    navSection: 'account',
    icon: UserRound,
    mobilePriority: { admin: 4 },
    search: {
      description: 'Update profile, skills, experience, and education',
      keywords: 'profile skills experience education resume',
    },
  },
  {
    id: 'profile-detail',
    path: '/profile/:userId',
    label: 'Profile Detail',
  },
  {
    id: 'resume',
    path: '/resume',
    label: 'Resume',
  },
  {
    id: 'career-path',
    path: '/career-path',
    label: 'Career Path',
  },
  {
    id: 'job-post',
    path: '/jobs/post',
    label: 'Post Job',
    allowedRoles: recruiterOnlyRoles,
  },
] as const;

export type AppRouteId = string;

export const canAccessRoute = (route: AppRouteDefinition, roles: readonly string[] = []) => (
  !route.allowedRoles || roles.some((role) => route.allowedRoles?.includes(role as UserRole))
);

export const getRouteById = (id: AppRouteId) => appRouteRegistry.find((route) => route.id === id);

export const getAccessibleNavRoutes = (
  section: RouteNavSection,
  roles: readonly string[] = [],
) => appRouteRegistry.filter((route) => route.navSection === section && canAccessRoute(route, roles));

const getMobilePriorityGroup = (roles: readonly string[] = []): MobilePriorityGroup => {
  if (roles.includes(USER_ROLES.recruiter)) return 'recruiter';
  if (roles.includes(USER_ROLES.admin)) return 'admin';
  return 'default';
};

export const getMobileNavRoutes = (roles: readonly string[] = []) => {
  const priorityGroup = getMobilePriorityGroup(roles);
  return appRouteRegistry
    .filter((route) => route.navSection && canAccessRoute(route, roles))
    .filter((route) => typeof route.mobilePriority?.[priorityGroup] === 'number')
    .sort((a, b) => (a.mobilePriority?.[priorityGroup] ?? 99) - (b.mobilePriority?.[priorityGroup] ?? 99))
    .slice(0, 5);
};

export const getSearchDestinations = (roles: readonly string[] = []) => appRouteRegistry
  .filter((route) => route.search && canAccessRoute(route, roles))
  .map((route) => ({
    label: route.label,
    description: route.search?.description || '',
    path: route.path,
    icon: route.search?.icon || route.icon || LayoutDashboard,
    keywords: route.search?.keywords || '',
  }));

export const protectedAppRoutes = appRouteRegistry;
