/**
 * Unified Staged Activation Checklist Model (R-02 / PRD / BRD)
 *
 * Provides structured staged activation (Foundation -> Skill & Proof -> Market Engagement)
 * for Candidates and Recruiters on the TalentSphere dashboard.
 */

export type ActivationStageId = 'foundation' | 'skill_proof' | 'market_engagement';

export interface ActivationStageInfo {
  id: ActivationStageId;
  order: number;
  label: string;
  candidateGoal: string;
  recruiterGoal: string;
}

export const ACTIVATION_STAGES: Record<ActivationStageId, ActivationStageInfo> = {
  foundation: {
    id: 'foundation',
    order: 1,
    label: 'Stage 1: Foundation',
    candidateGoal: 'Establish your professional identity, title, and core skills.',
    recruiterGoal: 'Configure company profile and organization details.',
  },
  skill_proof: {
    id: 'skill_proof',
    order: 2,
    label: 'Stage 2: Proof & Skill',
    candidateGoal: 'Validate abilities through coding challenges, courses, or resume exports.',
    recruiterGoal: 'Publish verified job opportunities for candidates.',
  },
  market_engagement: {
    id: 'market_engagement',
    order: 3,
    label: 'Stage 3: Market Engagement',
    candidateGoal: 'Discover relevant roles, submit applications, and network with peers.',
    recruiterGoal: 'Evaluate applicants, manage candidate scorecards, and conduct outreach.',
  },
};

export interface ActivationTask {
  id: string;
  stage: ActivationStageId;
  label: string;
  description: string;
  complete: boolean;
  route: string;
  action: string;
  tip?: string;
}

export interface StageSummary {
  stage: ActivationStageId;
  label: string;
  description: string;
  total: number;
  completed: number;
  percent: number;
  isCurrent: boolean;
  isComplete: boolean;
  tasks: ActivationTask[];
}

export interface ActivationProgressSummary {
  totalTasks: number;
  completedTasks: number;
  percent: number;
  currentStage: ActivationStageId;
  nextRecommendedTask: ActivationTask | null;
  isAllComplete: boolean;
  stages: StageSummary[];
}

export interface CandidateActivationSignals {
  hasProfileDetails: boolean;
  skillCount: number;
  savedSearchCount: number;
  applicationCount: number;
  enrollmentCount: number;
  challengeSubmissionCount: number;
  resumeExportCount?: number;
  networkConnectionCount?: number;
}

export interface RecruiterActivationSignals {
  companyCount: number;
  activeJobs: number;
  totalApplications: number;
  hasRecentApplications: boolean;
  scorecardCount?: number;
}

/**
 * Builds candidate activation tasks categorized into 3 progressive stages.
 */
export function buildCandidateActivationTasks(signals: CandidateActivationSignals): ActivationTask[] {
  const profileComplete = signals.hasProfileDetails && signals.skillCount >= 3;
  const skillsComplete = signals.skillCount >= 3;

  return [
    // Stage 1: Foundation
    {
      id: 'talent_profile_basics',
      stage: 'foundation',
      label: 'Build your profile basics',
      description: profileComplete
        ? 'Profile basics and core skills are in place.'
        : 'Add your title, headline, location, and bio.',
      complete: signals.hasProfileDetails,
      route: '/profile',
      action: 'Update profile',
      tip: 'A complete profile increases recruiter visibility by 4x.',
    },
    {
      id: 'talent_skills',
      stage: 'foundation',
      label: 'Add at least 3 skills',
      description: skillsComplete
        ? `Added ${signals.skillCount} verified skills.`
        : 'List at least 3 core technical or domain skills.',
      complete: skillsComplete,
      route: '/profile',
      action: 'Add skills',
      tip: 'Skills power automated job match scoring.',
    },

    // Stage 2: Proof & Skill
    {
      id: 'talent_challenge',
      stage: 'skill_proof',
      label: 'Attempt a coding challenge',
      description: signals.challengeSubmissionCount > 0
        ? `Completed ${signals.challengeSubmissionCount} challenge submission(s).`
        : 'Run a coding arena challenge to verify your technical skills.',
      complete: signals.challengeSubmissionCount > 0,
      route: '/challenges',
      action: 'Try challenge',
      tip: 'Passed challenges award skill XP and badges on your public profile.',
    },
    {
      id: 'talent_learning',
      stage: 'skill_proof',
      label: 'Enroll in a course',
      description: signals.enrollmentCount > 0
        ? 'Course enrollment active in your learning catalog.'
        : 'Enroll in a curriculum tied to your target career role.',
      complete: signals.enrollmentCount > 0,
      route: '/lms',
      action: 'Browse courses',
      tip: 'Course completions feed verified proof into candidate scorecards.',
    },

    // Stage 3: Market Engagement
    {
      id: 'talent_saved_search',
      stage: 'market_engagement',
      label: 'Save a targeted job search',
      description: signals.savedSearchCount > 0
        ? 'Saved job filters are ready for recurring discovery.'
        : 'Save your preferred role, location, and salary filters.',
      complete: signals.savedSearchCount > 0,
      route: '/jobs',
      action: 'Search jobs',
      tip: 'Receive timely notifications when matching positions are posted.',
    },
    {
      id: 'talent_application',
      stage: 'market_engagement',
      label: 'Submit your first application',
      description: signals.applicationCount > 0
        ? `Submitted ${signals.applicationCount} job application(s).`
        : 'Find an open role and submit your application.',
      complete: signals.applicationCount > 0,
      route: '/jobs',
      action: 'Apply to jobs',
      tip: 'Tailor your resume preview before submitting.',
    },
  ];
}

/**
 * Builds recruiter activation tasks categorized into 3 progressive stages.
 */
export function buildRecruiterActivationTasks(signals: RecruiterActivationSignals): ActivationTask[] {
  const companyReady = signals.companyCount > 0;
  const jobsReady = signals.activeJobs > 0;
  const applicantsReady = signals.totalApplications > 0;

  return [
    // Stage 1: Foundation
    {
      id: 'recruiter_company_profile',
      stage: 'foundation',
      label: 'Set up company profile',
      description: companyReady
        ? 'Company branding and details are configured.'
        : 'Set up your company overview, logo, and hiring domain.',
      complete: companyReady,
      route: '/jobs/post?companySetup=1',
      action: companyReady ? 'Review company' : 'Add company',
      tip: 'Candidates trust job posts with transparent company information.',
    },

    // Stage 2: Proof & Skill
    {
      id: 'recruiter_post_job',
      stage: 'skill_proof',
      label: 'Post your first job opening',
      description: jobsReady
        ? `${signals.activeJobs} active job listing(s) published.`
        : 'Create and publish a role to attract candidate applications.',
      complete: jobsReady,
      route: '/jobs/post',
      action: 'Post job',
      tip: 'Include clear salary ranges and core technical requirements.',
    },

    // Stage 3: Market Engagement
    {
      id: 'recruiter_review_candidates',
      stage: 'market_engagement',
      label: 'Manage candidate pipeline',
      description: applicantsReady
        ? `${signals.totalApplications} applicant(s) in review.`
        : 'Review incoming applications, evaluate scorecards, and update status.',
      complete: applicantsReady,
      route: '/candidates',
      action: 'Open candidates',
      tip: 'Maintain under 7-day review cycles to keep talent engaged.',
    },
    {
      id: 'recruiter_outreach',
      stage: 'market_engagement',
      label: 'Conduct candidate outreach',
      description: signals.hasRecentApplications
        ? 'Candidate communication channel active.'
        : 'Message top applicants directly to schedule interviews.',
      complete: signals.hasRecentApplications,
      route: '/messaging',
      action: 'Open messages',
      tip: 'Direct recruiter messages have high candidate response rates.',
    },
  ];
}

/**
 * Calculates complete activation progress and stage summaries.
 */
export function calculateActivationProgress(
  tasks: ActivationTask[],
  role: 'talent' | 'recruiter'
): ActivationProgressSummary {
  const stageOrder: ActivationStageId[] = ['foundation', 'skill_proof', 'market_engagement'];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.complete).length;
  const percent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

  const stages: StageSummary[] = stageOrder.map((stageId) => {
    const stageTasks = tasks.filter((t) => t.stage === stageId);
    const stageTotal = stageTasks.length;
    const stageCompleted = stageTasks.filter((t) => t.complete).length;
    const stagePercent = stageTotal === 0 ? 100 : Math.round((stageCompleted / stageTotal) * 100);
    const stageInfo = ACTIVATION_STAGES[stageId];

    return {
      stage: stageId,
      label: stageInfo.label,
      description: role === 'recruiter' ? stageInfo.recruiterGoal : stageInfo.candidateGoal,
      total: stageTotal,
      completed: stageCompleted,
      percent: stagePercent,
      isCurrent: false, // Calculated next
      isComplete: stageCompleted === stageTotal && stageTotal > 0,
      tasks: stageTasks,
    };
  });

  // Determine current active stage (first incomplete stage, or last stage if all complete)
  let currentStage: ActivationStageId = 'market_engagement';
  for (const s of stages) {
    if (!s.isComplete) {
      currentStage = s.stage;
      s.isCurrent = true;
      break;
    }
  }

  // If all stages are complete, mark the last stage as current
  if (!stages.some((s) => s.isCurrent) && stages.length > 0) {
    stages[stages.length - 1].isCurrent = true;
  }

  // Next recommended task is the first incomplete task in the current stage or across all tasks
  const nextRecommendedTask = tasks.find((t) => !t.complete) || null;

  return {
    totalTasks,
    completedTasks,
    percent,
    currentStage,
    nextRecommendedTask,
    isAllComplete: completedTasks === totalTasks && totalTasks > 0,
    stages,
  };
}
