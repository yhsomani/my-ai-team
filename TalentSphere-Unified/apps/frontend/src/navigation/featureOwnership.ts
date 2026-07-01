import { USER_ROLES, type AppRouteId, type UserRole } from './routeRegistry';

export type PublicRoutePath = '/' | '/login' | '/register' | '*';
export type ShellSurface = 'ResponsiveLayout' | 'Header' | 'Sidebar';
export type ExtensionSurface = 'Popup' | 'Options';
export type FeatureNecessity = 'necessary' | 'candidate-for-merge' | 'local-companion';
export type SecondaryEntryMode = 'summary' | 'link' | 'review-handoff' | 'preference-snapshot' | 'search-destination';

export type FeatureOwner =
  | {
      kind: 'route';
      routeId: AppRouteId;
      routePath: string;
    }
  | {
      kind: 'public-route';
      routePath: PublicRoutePath;
    }
  | {
      kind: 'shell';
      surface: ShellSurface;
    }
  | {
      kind: 'extension';
      surface: ExtensionSurface;
    };

export interface SecondaryFeatureEntryPoint {
  surface: string;
  mode: SecondaryEntryMode;
  routeId?: AppRouteId;
  routePath?: string;
  rationale: string;
}

export interface FeatureOwnershipDefinition {
  id: string;
  label: string;
  owner: FeatureOwner;
  necessity: FeatureNecessity;
  primaryPurpose: string;
  userJourneyValue: string;
  mergeEvaluation: string;
  allowedRoles?: readonly UserRole[];
  secondaryEntryPoints: readonly SecondaryFeatureEntryPoint[];
  consolidationDecision: string;
  behaviorPreservation: string;
}

export const publicRoutePaths = ['/', '/login', '/register', '*'] as const;

export const featureOwnershipRegistry: readonly FeatureOwnershipDefinition[] = [
  {
    id: 'public-entry',
    label: 'Public Entry',
    owner: { kind: 'public-route', routePath: '/' },
    necessity: 'necessary',
    primaryPurpose: 'Introduce TalentSphere and route unauthenticated visitors to the correct auth handoff.',
    userJourneyValue: 'Gives new visitors one clear product overview and a role-specific next step before any account state exists.',
    mergeEvaluation: 'Do not merge into the authenticated shell; public discovery has different audience, state, and access needs.',
    secondaryEntryPoints: [],
    consolidationDecision: 'Keep separate from the authenticated shell so public onboarding does not duplicate logged-in workflows.',
    behaviorPreservation: 'Preserve public stats, fallback stats, login/register CTAs, and role-selection destinations.',
  },
  {
    id: 'login',
    label: 'Login',
    owner: { kind: 'public-route', routePath: '/login' },
    necessity: 'necessary',
    primaryPurpose: 'Authenticate existing users and redirect authenticated users back into the app.',
    userJourneyValue: 'Lets returning users resume their saved work quickly without scanning registration or public marketing content.',
    mergeEvaluation: 'Keep separate from Registration until unified-auth validation proves shared errors and redirects stay clearer.',
    secondaryEntryPoints: [
      {
        surface: 'Public landing navigation',
        mode: 'link',
        routePath: '/',
        rationale: 'A public link reduces auth discovery cost without duplicating the login form.',
      },
    ],
    consolidationDecision: 'Keep Login focused and separate from registration so error handling and redirect behavior stay clear.',
    behaviorPreservation: 'Preserve Supabase auth behavior, invalid-credential errors, and authenticated redirect behavior.',
  },
  {
    id: 'registration',
    label: 'Registration',
    owner: { kind: 'public-route', routePath: '/register' },
    necessity: 'necessary',
    primaryPurpose: 'Create new user accounts and capture role-specific onboarding intent.',
    userJourneyValue: 'Starts the correct talent or recruiter journey early so first-run guidance and post-auth routes stay relevant.',
    mergeEvaluation: 'Keep separate from Login because role-intent capture and first-run handoff are different user tasks.',
    secondaryEntryPoints: [
      {
        surface: 'Public landing role CTAs',
        mode: 'link',
        routePath: '/',
        rationale: 'Role CTAs deep-link to registration intent without duplicating registration fields.',
      },
    ],
    consolidationDecision: 'Keep Registration focused and separate from Login until product validation supports a unified auth surface.',
    behaviorPreservation: 'Preserve role query parameters, registration analytics, and existing auth-service submission flow.',
  },
  {
    id: 'not-found-recovery',
    label: 'Not Found Recovery',
    owner: { kind: 'public-route', routePath: '*' },
    necessity: 'necessary',
    primaryPurpose: 'Recover invalid or unavailable routes with safe public auth links or role-valid app destinations.',
    userJourneyValue: 'Prevents dead ends by giving visitors and signed-in users safe recovery options matched to their access state.',
    mergeEvaluation: 'Do not merge into Dashboard or Landing; wildcard recovery must stay a neutral fallback with no domain ownership.',
    secondaryEntryPoints: [],
    consolidationDecision: 'Keep as the wildcard recovery surface rather than merging it into Dashboard or the public landing page.',
    behaviorPreservation: 'Preserve the catch-all route, back navigation, home/dashboard recovery, auth entry links, and role-based destination filtering.',
  },
  {
    id: 'dashboard-launchpad',
    label: 'Dashboard Launchpad',
    owner: { kind: 'route', routeId: 'dashboard', routePath: '/dashboard' },
    necessity: 'necessary',
    primaryPurpose: 'Provide role-specific status, recovery, and shortcut summaries for authenticated users.',
    userJourneyValue: 'Reduces daily orientation cost by showing what changed, what needs attention, and where to continue work.',
    mergeEvaluation: 'Do not merge domain workflows into Dashboard; it remains a summary launchpad with handoffs to owners.',
    secondaryEntryPoints: [
      {
        surface: 'Primary navigation',
        mode: 'link',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'The route is the default authenticated landing point and primary launchpad.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Route discovery can return users to the launchpad without duplicating dashboard summaries elsewhere.',
      },
    ],
    consolidationDecision: 'Keep Dashboard as summary-only; detailed work stays in Jobs, Learning, Candidates, Messages, Profile, or Admin.',
    behaviorPreservation: 'Preserve talent/recruiter branching, service calls, analytics events, and destination routes.',
  },
  {
    id: 'jobs-workspace',
    label: 'Jobs Workspace',
    owner: { kind: 'route', routeId: 'jobs', routePath: '/jobs' },
    necessity: 'necessary',
    primaryPurpose: 'Own job discovery, saved searches, hidden preferences, applications, and recruiter posting lists.',
    userJourneyValue: 'Keeps job search, application, and posting follow-up in one predictable workspace for both sides of hiring.',
    mergeEvaluation: 'Keep as the single job-domain owner; Dashboard, Profile, and AI may link or hand off but must not own job actions.',
    allowedRoles: [USER_ROLES.user, USER_ROLES.recruiter],
    secondaryEntryPoints: [
      {
        surface: 'Dashboard job summaries',
        mode: 'summary',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Dashboard cards show status and route users back to Jobs for detailed actions.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        rationale: 'Route discovery is allowed because Jobs remains the only owner of job actions.',
      },
    ],
    consolidationDecision: 'Keep Jobs as the single owner for search, saved-search, hidden-job, application, and posting-list workflows.',
    behaviorPreservation: 'Preserve tabs, filters, saved searches, application review, recruiter publish review, and route query behavior.',
  },
  {
    id: 'job-posting',
    label: 'Job Posting',
    owner: { kind: 'route', routeId: 'job-post', routePath: '/jobs/post' },
    necessity: 'necessary',
    primaryPurpose: 'Own recruiter job draft creation, company context setup, template use, and review-before-save.',
    userJourneyValue: 'Gives recruiters a focused creation path with review controls before a listing affects applicants.',
    mergeEvaluation: 'Keep as a command route until validated evidence shows the full draft workflow can merge into Jobs without clutter.',
    allowedRoles: [USER_ROLES.recruiter],
    secondaryEntryPoints: [
      {
        surface: 'Recruiter dashboard',
        mode: 'link',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Recruiter quick actions can start a draft but do not duplicate the draft form.',
      },
      {
        surface: 'Jobs recruiter postings tab',
        mode: 'link',
        routeId: 'jobs',
        routePath: '/jobs',
        rationale: 'The posting list can open the command route while keeping draft editing in Post Job.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        routeId: 'job-post',
        routePath: '/jobs/post',
        rationale: 'Role-filtered route discovery can open Post Job while the form, draft, template, and publish controls remain owned by this route.',
      },
    ],
    consolidationDecision: 'Keep as a command route discovered from Jobs and recruiter dashboard; do not merge into Dashboard.',
    behaviorPreservation: 'Preserve templates, draft history, company setup, duplicate checks, review-before-save, and navigation return behavior.',
  },
  {
    id: 'candidate-review',
    label: 'Candidate Review',
    owner: { kind: 'route', routeId: 'candidates', routePath: '/candidates' },
    necessity: 'necessary',
    primaryPurpose: 'Own recruiter application review, private notes, scorecards, queue navigation, and status decisions.',
    userJourneyValue: 'Concentrates high-risk candidate decisions in one recruiter-only queue with context, notes, and review states.',
    mergeEvaluation: 'Do not merge into Dashboard or Jobs; candidate notes, scorecards, and status decisions need a dedicated review surface.',
    allowedRoles: [USER_ROLES.recruiter],
    secondaryEntryPoints: [
      {
        surface: 'Recruiter dashboard metrics',
        mode: 'summary',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Metrics summarize pipeline state while detailed decisions remain in Candidates.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        rationale: 'Route discovery is allowed because Candidates remains the only owner of candidate decisions.',
      },
    ],
    consolidationDecision: 'Keep Candidates separate from Jobs because notes, scorecards, queue state, and status decisions have different risk.',
    behaviorPreservation: 'Preserve candidate search, cursor state, private notes, scorecards, interview drafts, status reviews, and bulk reviews.',
  },
  {
    id: 'learning',
    label: 'Learning',
    owner: { kind: 'route', routeId: 'learning', routePath: '/lms' },
    necessity: 'necessary',
    primaryPurpose: 'Own course discovery, enrollment, active progress, curriculum review, and lesson completion.',
    userJourneyValue: 'Helps talent users move from skill gaps to active coursework without mixing training with assessments.',
    mergeEvaluation: 'Keep separate from Challenges and Dashboard because course enrollment and progress semantics differ from assessments.',
    allowedRoles: [USER_ROLES.user],
    secondaryEntryPoints: [
      {
        surface: 'Talent dashboard quick actions',
        mode: 'summary',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Dashboard can resume learning but does not duplicate course catalog or lesson controls.',
      },
      {
        surface: 'AI Assistant handoff',
        mode: 'review-handoff',
        routeId: 'ai',
        routePath: '/ai',
        rationale: 'AI may suggest catalog searches, but Learning owns explicit enrollment and progress changes.',
      },
    ],
    consolidationDecision: 'Keep Learning separate from Challenges because courses and assessments have different completion semantics.',
    behaviorPreservation: 'Preserve Redux query state, catalog search, enrollment, lesson completion, AI suggestion review, and analytics.',
  },
  {
    id: 'challenges',
    label: 'Challenges',
    owner: { kind: 'route', routeId: 'challenges', routePath: '/challenges' },
    necessity: 'necessary',
    primaryPurpose: 'Own assessment discovery, coding workspace, sample checks, submissions, reset review, and retry history.',
    userJourneyValue: 'Provides a dedicated practice and assessment workspace where code execution, resets, and submissions are explicit.',
    mergeEvaluation: 'Keep separate from Learning because coding execution, reset review, and submission history need a focused workspace.',
    allowedRoles: [USER_ROLES.user],
    secondaryEntryPoints: [
      {
        surface: 'Talent dashboard challenge summaries',
        mode: 'summary',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Dashboard may summarize active challenges but does not duplicate solving or submission commands.',
      },
    ],
    consolidationDecision: 'Keep Challenges separate from Learning because code execution and submission review require a dedicated workspace.',
    behaviorPreservation: 'Preserve category filters, workspace open, language selection, local runner, reset review, submissions, and retry history.',
  },
  {
    id: 'networking',
    label: 'Networking',
    owner: { kind: 'route', routeId: 'networking', routePath: '/networking' },
    necessity: 'necessary',
    primaryPurpose: 'Own suggestions, connection requests, accepted connections, hidden preferences, and follow-up reminders.',
    userJourneyValue: 'Turns relationship discovery into clear request, reminder, and follow-up actions without duplicating message threads.',
    mergeEvaluation: 'Keep separate from Messaging; relationships and reminders can link to threads but should not merge with conversation work.',
    secondaryEntryPoints: [
      {
        surface: 'Header notification reminders',
        mode: 'link',
        rationale: 'Due reminders can navigate to the relationship workspace without duplicating connection state.',
      },
      {
        surface: 'Messaging links',
        mode: 'link',
        routeId: 'messaging',
        routePath: '/messaging',
        rationale: 'Accepted relationships can lead to conversations, but Messaging owns the thread.',
      },
    ],
    consolidationDecision: 'Keep Networking as the relationship owner; do not duplicate message thread work here.',
    behaviorPreservation: 'Preserve suggestion fetch, request mutations, hidden preferences, reminder sync, preview behavior, and analytics.',
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    owner: { kind: 'route', routeId: 'ai', routePath: '/ai' },
    necessity: 'necessary',
    primaryPurpose: 'Own chat prompts, draft guidance, recommendation review queue, persistence, and explicit workflow handoffs.',
    userJourneyValue: 'Keeps generative help review-first so users can compare drafts before applying them in owning workflows.',
    mergeEvaluation: 'Keep separate as the AI review hub; destination workflows can receive reviewed drafts but retain final mutation ownership.',
    secondaryEntryPoints: [
      {
        surface: 'Profile, Resume, Jobs, and Learning review flows',
        mode: 'review-handoff',
        rationale: 'Destination workflows may receive reviewed AI draft state but own final mutation decisions.',
      },
    ],
    consolidationDecision: 'Keep AI as a review hub; output remains draft-only until accepted in the owning workflow.',
    behaviorPreservation: 'Preserve chat persistence, provider degradation, suggestion save/dismiss, audit logging, workflow handoffs, and local fallback.',
  },
  {
    id: 'messaging',
    label: 'Messaging',
    owner: { kind: 'route', routeId: 'messaging', routePath: '/messaging' },
    necessity: 'necessary',
    primaryPurpose: 'Own conversation discovery, active thread review, realtime status, attachments, sends, retries, and read state.',
    userJourneyValue: 'Keeps direct communication, failed-send recovery, attachments, and unread state in one conversation workspace.',
    mergeEvaluation: 'Keep separate from Networking and Dashboard; message reading, sending, retries, and attachments need one thread owner.',
    secondaryEntryPoints: [
      {
        surface: 'Dashboard unread summaries',
        mode: 'summary',
        routeId: 'dashboard',
        routePath: '/dashboard',
        rationale: 'Dashboard can show unread count while all reading, sending, and retrying stays in Messages.',
      },
      {
        surface: 'Networking connection cards',
        mode: 'link',
        routeId: 'networking',
        routePath: '/networking',
        rationale: 'Relationship cards can lead to Messages without duplicating thread state.',
      },
    ],
    consolidationDecision: 'Keep Messaging as the single owner for direct conversation work.',
    behaviorPreservation: 'Preserve Redux fetches, realtime subscription, pagination, mark-read, optimistic send/retry, attachments, and analytics.',
  },
  {
    id: 'admin-console',
    label: 'Admin Console',
    owner: { kind: 'route', routeId: 'admin', routePath: '/admin' },
    necessity: 'necessary',
    primaryPurpose: 'Own operational metrics, service health, scheduler status, audit logs, and analytics insights.',
    userJourneyValue: 'Separates operational risk review from user work so admins can inspect source state and service health directly.',
    mergeEvaluation: 'Do not merge with user Dashboard; admin-only operational source states and audit risk require a separate console.',
    allowedRoles: [USER_ROLES.admin],
    secondaryEntryPoints: [
      {
        surface: 'Admin navigation',
        mode: 'link',
        routeId: 'admin',
        routePath: '/admin',
        rationale: 'Admins need direct access, but no non-admin route duplicates operational actions.',
      },
    ],
    consolidationDecision: 'Keep separate from user and recruiter dashboard because operational source semantics and risk differ.',
    behaviorPreservation: 'Preserve role gate, admin service calls, scheduler reads, audit pagination, observability links, refresh, and analytics.',
  },
  {
    id: 'billing',
    label: 'Billing',
    owner: { kind: 'route', routeId: 'billing', routePath: '/billing' },
    necessity: 'necessary',
    primaryPurpose: 'Own plan comparison, checkout handoff review, payment-method review, history, and demo/provider source labeling.',
    userJourneyValue: 'Keeps money-adjacent decisions, provider state, and payment history in a single clearly labeled billing surface.',
    mergeEvaluation: 'Keep separate from Settings; Settings may show a snapshot, but plan management and provider handoffs stay in Billing.',
    secondaryEntryPoints: [
      {
        surface: 'Settings billing tab',
        mode: 'preference-snapshot',
        routeId: 'settings',
        routePath: '/settings',
        rationale: 'Settings may summarize billing and deep-link to Billing without duplicating plan management.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        routeId: 'billing',
        routePath: '/billing',
        rationale: 'Route discovery can open Billing while money-handling review, checkout, provider handoffs, and history stay in Billing.',
      },
    ],
    consolidationDecision: 'Keep Billing as the money-handling owner; Settings remains a handoff and preference surface.',
    behaviorPreservation: 'Preserve billing load, explicit demo mode, checkout requests, portal handoffs, review modals, retry, and analytics.',
  },
  {
    id: 'settings',
    label: 'Settings',
    owner: { kind: 'route', routeId: 'settings', routePath: '/settings' },
    necessity: 'necessary',
    primaryPurpose: 'Own account preferences, notification preferences, security review actions, and account deactivation review.',
    userJourneyValue: 'Gives users one predictable place for account-level preferences without duplicating domain workspaces.',
    mergeEvaluation: 'Keep as preferences-only; do not merge Profile editing, Billing management, or domain CRUD into Settings.',
    secondaryEntryPoints: [
      {
        surface: 'Account navigation',
        mode: 'link',
        routeId: 'settings',
        routePath: '/settings',
        rationale: 'Settings is an account-level destination and should remain predictable from navigation.',
      },
    ],
    consolidationDecision: 'Keep Settings as preferences-only; domain details stay in Profile and Billing.',
    behaviorPreservation: 'Preserve tabs, preference saves, password reset review, account deactivation review, billing handoff, and analytics.',
  },
  {
    id: 'profile',
    label: 'Profile',
    owner: { kind: 'route', routeId: 'profile', routePath: '/profile' },
    necessity: 'necessary',
    primaryPurpose: 'Own durable identity details, avatar, skills, experience, education, achievements, suggestions, and profile AI drafts.',
    userJourneyValue: 'Keeps durable career identity editing together so profile updates are reviewed apart from document-specific resume work.',
    mergeEvaluation: 'Keep separate from Resume and Settings because durable public identity CRUD has different review and persistence needs.',
    secondaryEntryPoints: [
      {
        surface: 'Resume Builder imports',
        mode: 'review-handoff',
        routeId: 'resume',
        routePath: '/resume',
        rationale: 'Resume may save reviewed profile-backed rows, but Profile remains the full identity workspace.',
      },
      {
        surface: 'AI Assistant handoff',
        mode: 'review-handoff',
        routeId: 'ai',
        routePath: '/ai',
        rationale: 'AI can draft profile fields, but Profile owns review and persistence.',
      },
    ],
    consolidationDecision: 'Keep Profile separate from Resume and Settings because it owns public identity data and row-level profile CRUD.',
    behaviorPreservation: 'Preserve profile loading, edit modals, AI draft review, suggestions, avatar flows, row mutations, tabs, toasts, and analytics.',
  },
  {
    id: 'profile-detail',
    label: 'Profile Detail',
    owner: { kind: 'route', routeId: 'profile-detail', routePath: '/profile/:userId' },
    necessity: 'necessary',
    primaryPurpose: 'Own authenticated read-only profile review for another user.',
    userJourneyValue: 'Lets recruiters and network contacts inspect a profile without exposing the full editable owner workspace.',
    mergeEvaluation: 'Keep as a profile route variant; linked previews should not duplicate or merge full profile-detail behavior elsewhere.',
    secondaryEntryPoints: [
      {
        surface: 'Candidates profile preview',
        mode: 'link',
        routeId: 'candidates',
        routePath: '/candidates',
        rationale: 'Candidate review may link to profile detail without duplicating Profile route behavior.',
      },
      {
        surface: 'Networking profile preview',
        mode: 'link',
        routeId: 'networking',
        routePath: '/networking',
        rationale: 'Networking may preview or open a profile while this route owns the full detail view.',
      },
    ],
    consolidationDecision: 'Keep as a route alias to Profile behavior for external profile review and analytics context.',
    behaviorPreservation: 'Preserve profile route parameter loading, read-only behavior, source analytics, and fallback state.',
  },
  {
    id: 'resume',
    label: 'Resume Builder',
    owner: { kind: 'route', routeId: 'resume', routePath: '/resume' },
    necessity: 'necessary',
    primaryPurpose: 'Own resume editor fields, import review, AI draft review, exports, uploaded artifacts, and preview.',
    userJourneyValue: 'Keeps document import, editing, export, and artifact review together so users can manage resumes end to end.',
    mergeEvaluation: 'Keep separate from Profile because document artifacts, import review, and export commands are a distinct workflow.',
    secondaryEntryPoints: [
      {
        surface: 'Profile handoff',
        mode: 'link',
        routeId: 'profile',
        routePath: '/profile',
        rationale: 'Profile can link to document work without duplicating resume export or artifact controls.',
      },
      {
        surface: 'AI Assistant handoff',
        mode: 'review-handoff',
        routeId: 'ai',
        routePath: '/ai',
        rationale: 'AI can draft resume content, but Resume owns review and export commands.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        routeId: 'resume',
        routePath: '/resume',
        rationale: 'Route discovery can open Resume without duplicating document import, export, artifact, or review controls.',
      },
    ],
    consolidationDecision: 'Keep Resume separate from Profile because document artifacts, import, and export workflows are distinct.',
    behaviorPreservation: 'Preserve import parsing, selected-field application, profile row saves, PDF/HTML/print exports, artifacts, local sync, and analytics.',
  },
  {
    id: 'career-path',
    label: 'Career Paths',
    owner: { kind: 'route', routeId: 'career-path', routePath: '/career-path' },
    necessity: 'candidate-for-merge',
    primaryPurpose: 'Own generated career-path guidance, required skills, milestones, provider unavailable state, and retry.',
    userJourneyValue: 'Provides a focused guidance review path while merge evidence with AI Assistant remains unproven.',
    mergeEvaluation: 'Candidate for future AI Assistant merge only after route analytics, tab UX, and user-flow validation prove it reduces friction.',
    secondaryEntryPoints: [
      {
        surface: 'AI Assistant navigation',
        mode: 'link',
        routeId: 'ai',
        routePath: '/ai',
        rationale: 'Career guidance is AI-adjacent, but this route remains the owner until merge validation exists.',
      },
      {
        surface: 'Learning navigation',
        mode: 'link',
        routeId: 'learning',
        routePath: '/lms',
        rationale: 'Required skills may link toward Learning without duplicating course ownership.',
      },
      {
        surface: 'Header search',
        mode: 'search-destination',
        routeId: 'career-path',
        routePath: '/career-path',
        rationale: 'Route discovery can open the current Career Path owner while merge validation with AI Assistant remains unresolved.',
      },
    ],
    consolidationDecision: 'Keep separate until route analytics and user-flow validation justify merging into AI Assistant as a tab.',
    behaviorPreservation: 'Preserve AI generation call, normalization, retry, provider-unavailable state, Learning navigation, and review-only semantics.',
  },
  {
    id: 'shell-navigation',
    label: 'Shell Navigation And Notifications',
    owner: { kind: 'shell', surface: 'Header' },
    necessity: 'necessary',
    primaryPurpose: 'Own route discovery, account notifications, reminder visibility, and shell-level navigation affordances.',
    userJourneyValue: 'Keeps cross-route discovery, notifications, reminders, theme, and sign-out reachable without becoming a workflow owner.',
    mergeEvaluation: 'Keep as a shell surface; it can discover routes but must not merge or own domain workflows.',
    secondaryEntryPoints: [
      {
        surface: 'Sidebar and mobile nav',
        mode: 'link',
        rationale: 'Sidebar and mobile nav render route links from the same registry rather than owning feature workflows.',
      },
    ],
    consolidationDecision: 'Keep shell navigation as discovery only; routes own product workflows and mutations.',
    behaviorPreservation: 'Preserve route-registry search, keyboard focus, notification popover, reminder navigation, theme toggle, and sign out.',
  },
  {
    id: 'extension-popup',
    label: 'Extension Popup',
    owner: { kind: 'extension', surface: 'Popup' },
    necessity: 'local-companion',
    primaryPurpose: 'Own local tracked jobs, scanned page drafts, diagnostics review, and sanitized analytics export.',
    userJourneyValue: 'Gives users a fast local companion for portal-side tracking and diagnostics without requiring account sync.',
    mergeEvaluation: 'Keep separate from the web app and Options because MV3 popup constraints make it a compact local companion surface.',
    secondaryEntryPoints: [
      {
        surface: 'Extension options',
        mode: 'link',
        rationale: 'Options can expose deeper local tools while Popup remains the quick companion workflow.',
      },
    ],
    consolidationDecision: 'Keep separate from the web shell because MV3 local storage and local-only posture are intentional.',
    behaviorPreservation: 'Preserve storage keys, local fallback, content/background messaging, scanned drafts, tracker mutations, diagnostics export, and local-only sync posture.',
  },
  {
    id: 'extension-options',
    label: 'Extension Options',
    owner: { kind: 'extension', surface: 'Options' },
    necessity: 'local-companion',
    primaryPurpose: 'Own local resume match preview, interview planner, local settings, and sync-disabled review copy.',
    userJourneyValue: 'Keeps deeper local extension tools in a stable settings-style surface separate from the quick popup.',
    mergeEvaluation: 'Keep separate from Popup and web routes because deeper extension settings and local review tools need a stable options surface.',
    secondaryEntryPoints: [
      {
        surface: 'Extension popup',
        mode: 'link',
        rationale: 'Popup can open deeper options without duplicating match preview or settings ownership.',
      },
    ],
    consolidationDecision: 'Keep separate from Popup because options own deeper local review and settings workflows.',
    behaviorPreservation: 'Preserve local storage, keyword extraction, delayed match preview, prep cards, local settings, and cloud-sync disabled behavior.',
  },
];

export const getFeatureOwnershipById = (id: string) => (
  featureOwnershipRegistry.find((feature) => feature.id === id)
);

export const getPrimaryFeatureForRoute = (routeId: AppRouteId) => (
  featureOwnershipRegistry.find((feature) => feature.owner.kind === 'route' && feature.owner.routeId === routeId)
);

export const getSecondaryFeatureEntryPointsForRoute = (routeId: AppRouteId) => (
  featureOwnershipRegistry.flatMap((feature) => (
    feature.secondaryEntryPoints
      .filter((entry) => entry.routeId === routeId)
      .map((entry) => ({ feature, entry }))
  ))
);
