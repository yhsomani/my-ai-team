import { type JobPostFormDraft, toJobPostRequirements } from './jobPostTemplates';

export interface JobPostReviewSummary {
  title: string;
  descriptionPreview: string;
  location: string;
  jobTypeLabel: string;
  salaryLabel: string;
  requirements: string[];
  requirementCount: number;
}

export interface JobPostDuplicateCandidate {
  id?: string;
  title?: string;
  location?: string;
  jobType?: string;
  job_type?: string;
  status?: string;
}

export interface JobPostDuplicateMatch {
  id: string;
  title: string;
  location: string;
  jobTypeLabel: string;
  status: string;
}

export interface JobPostCompanyContext {
  id?: string;
  name?: string;
  verified?: boolean;
  location?: string;
  industry?: string;
  website?: string;
  description?: string;
  employeeCount?: number | string | null;
}

export interface JobPostCompanyContextSummary {
  label: string;
  detail: string;
  isAttached: boolean;
}

export interface JobPostDraftChange {
  label: string;
  before: string;
  after: string;
}

export interface JobPostDraftChangeSummaryOptions {
  originalCompanyAttached?: boolean;
  originalCompanyId?: string;
  originalCompanyLabel?: string;
  nextCompanyAttached?: boolean;
  nextCompanyId?: string;
  nextCompanyLabel?: string;
}

export interface RecruiterPostingCandidate {
  title?: string;
  description?: string;
  location?: string;
  requirements?: unknown;
  companyId?: string;
  company_id?: string;
  companyName?: string;
  company?: {
    name?: string;
  } | null;
  companies?: {
    name?: string;
  } | null;
}

const compact = (value?: string | null) => (value || '').trim();
const normalizeComparableText = (value?: string | null) => compact(value).toLowerCase().replace(/\s+/g, ' ');
const activeDuplicateStatuses = new Set(['DRAFT', 'PUBLISHED']);

const buildRequirementSignature = (requirements: string) => (
  toJobPostRequirements(requirements).map(requirement => normalizeComparableText(requirement)).join('|')
);

const describeRequirementCount = (requirements: string) => {
  const count = toJobPostRequirements(requirements).length;
  return `${count} ${count === 1 ? 'requirement' : 'requirements'}`;
};

const buildCompanyComparisonValue = (
  isAttached?: boolean,
  id?: string,
  label?: string
) => (
  isAttached
    ? compact(id) || normalizeComparableText(label) || 'attached'
    : 'not-attached'
);

const buildCompanyDisplayLabel = (isAttached?: boolean, label?: string) => (
  isAttached ? compact(label) || 'Attached company' : 'No company attached'
);

const countRecruiterPostingRequirements = (requirements: unknown) => {
  if (Array.isArray(requirements)) {
    return requirements.filter(requirement => compact(String(requirement))).length;
  }

  if (typeof requirements === 'string') {
    return toJobPostRequirements(requirements).length;
  }

  return 0;
};

const jobTypeLabels: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
};

const formatCurrency = (value: string) => {
  const compactValue = compact(value);
  if (!compactValue) return '';

  const numericValue = Number(compactValue);
  if (!Number.isFinite(numericValue)) return compactValue;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numericValue);
};

export const buildJobPostDraftMissingFields = (draft: JobPostFormDraft) => {
  const missingFields: string[] = [];

  if (!compact(draft.title)) missingFields.push('job title');
  if (!compact(draft.description)) missingFields.push('job description');
  if (!compact(draft.location)) missingFields.push('location');
  if (toJobPostRequirements(draft.requirements).length === 0) missingFields.push('at least one requirement');

  return missingFields;
};

export const canReviewJobPostDraft = (draft: JobPostFormDraft) => (
  buildJobPostDraftMissingFields(draft).length === 0
);

export const buildJobPostSalaryLabel = (draft: JobPostFormDraft) => {
  const salaryMin = formatCurrency(draft.salaryMin);
  const salaryMax = formatCurrency(draft.salaryMax);

  if (salaryMin && salaryMax) return `${salaryMin} - ${salaryMax}`;
  if (salaryMin) return `${salaryMin}+`;
  if (salaryMax) return `Up to ${salaryMax}`;
  return 'Not specified';
};

export const buildJobPostDuplicateMatches = (
  draft: JobPostFormDraft,
  existingJobs: JobPostDuplicateCandidate[],
  maxMatches = 3
): JobPostDuplicateMatch[] => {
  const title = normalizeComparableText(draft.title);
  const location = normalizeComparableText(draft.location);
  const jobType = normalizeComparableText(draft.jobType);

  if (!title || !location) return [];

  return existingJobs.reduce<JobPostDuplicateMatch[]>((matches, job) => {
    if (matches.length >= maxMatches) return matches;

    const candidateStatus = compact(job.status).toUpperCase();
    if (!activeDuplicateStatuses.has(candidateStatus)) return matches;

    const candidateTitle = normalizeComparableText(job.title);
    const candidateLocation = normalizeComparableText(job.location);
    const candidateJobType = normalizeComparableText(job.jobType || job.job_type);
    const matchesJobType = !candidateJobType || !jobType || candidateJobType === jobType;

    if (candidateTitle === title && candidateLocation === location && matchesJobType) {
      matches.push({
        id: compact(job.id) || `${candidateTitle}-${candidateLocation}`,
        title: compact(job.title) || draft.title,
        location: compact(job.location) || draft.location,
        jobTypeLabel: jobTypeLabels[compact(job.jobType || job.job_type)] || compact(job.jobType || job.job_type) || 'Job type not set',
        status: candidateStatus,
      });
    }

    return matches;
  }, []);
};

export const buildJobPostCompanyContextSummary = (
  company: JobPostCompanyContext | null | undefined,
  attachCompany: boolean
): JobPostCompanyContextSummary => {
  const companyName = compact(company?.name);

  if (companyName && attachCompany) {
    const verification = company?.verified ? 'Verified' : 'Unverified';
    return {
      label: companyName,
      detail: `${verification} company profile will be attached to this draft.`,
      isAttached: true,
    };
  }

  if (companyName) {
    return {
      label: 'No company attached',
      detail: `${companyName} is available but will not be attached to this draft.`,
      isAttached: false,
    };
  }

  return {
    label: 'No company attached',
    detail: 'No recruiter company profile is available for this draft.',
    isAttached: false,
  };
};

export const buildJobPostDraftChangeSummary = (
  originalDraft: JobPostFormDraft,
  nextDraft: JobPostFormDraft,
  options: JobPostDraftChangeSummaryOptions = {}
): JobPostDraftChange[] => {
  const changes: JobPostDraftChange[] = [];
  const addChange = (label: string, before: string, after: string) => {
    changes.push({ label, before, after });
  };

  if (normalizeComparableText(originalDraft.title) !== normalizeComparableText(nextDraft.title)) {
    addChange('Title', compact(originalDraft.title) || 'Untitled role', compact(nextDraft.title) || 'Untitled role');
  }

  if (normalizeComparableText(originalDraft.description) !== normalizeComparableText(nextDraft.description)) {
    addChange(
      'Description',
      compact(originalDraft.description) ? `${compact(originalDraft.description).length} characters` : 'No description',
      compact(nextDraft.description) ? `${compact(nextDraft.description).length} characters` : 'No description'
    );
  }

  if (normalizeComparableText(originalDraft.location) !== normalizeComparableText(nextDraft.location)) {
    addChange('Location', compact(originalDraft.location) || 'Location not set', compact(nextDraft.location) || 'Location not set');
  }

  if (compact(originalDraft.jobType) !== compact(nextDraft.jobType)) {
    addChange(
      'Job type',
      jobTypeLabels[compact(originalDraft.jobType)] || compact(originalDraft.jobType) || 'Job type not set',
      jobTypeLabels[compact(nextDraft.jobType)] || compact(nextDraft.jobType) || 'Job type not set'
    );
  }

  if (buildJobPostSalaryLabel(originalDraft) !== buildJobPostSalaryLabel(nextDraft)) {
    addChange('Salary range', buildJobPostSalaryLabel(originalDraft), buildJobPostSalaryLabel(nextDraft));
  }

  if (buildRequirementSignature(originalDraft.requirements) !== buildRequirementSignature(nextDraft.requirements)) {
    addChange('Requirements', describeRequirementCount(originalDraft.requirements), describeRequirementCount(nextDraft.requirements));
  }

  const originalCompanyValue = buildCompanyComparisonValue(
    options.originalCompanyAttached,
    options.originalCompanyId,
    options.originalCompanyLabel
  );
  const nextCompanyValue = buildCompanyComparisonValue(
    options.nextCompanyAttached,
    options.nextCompanyId,
    options.nextCompanyLabel
  );

  if (originalCompanyValue !== nextCompanyValue) {
    addChange(
      'Company',
      buildCompanyDisplayLabel(options.originalCompanyAttached, options.originalCompanyLabel),
      buildCompanyDisplayLabel(options.nextCompanyAttached, options.nextCompanyLabel)
    );
  }

  return changes;
};

export const buildRecruiterPostingPublishIssues = (job: RecruiterPostingCandidate) => {
  const requirements = countRecruiterPostingRequirements(job.requirements);
  const companyId = compact(job.companyId || job.company_id);
  const companyName = compact(job.companyName || job.company?.name || job.companies?.name);
  const issues: string[] = [];

  if (!compact(job.title)) issues.push('Add a job title');
  if (!compact(job.description)) issues.push('Add a job description');
  if (!compact(job.location)) issues.push('Add a job location');
  if (!companyId && !companyName) issues.push('Attach company context');
  if (requirements === 0) issues.push('Add at least one requirement');

  return issues;
};

export const canPublishRecruiterPosting = (job: RecruiterPostingCandidate) => (
  buildRecruiterPostingPublishIssues(job).length === 0
);

export const buildJobPostReviewSummary = (draft: JobPostFormDraft): JobPostReviewSummary => {
  const description = compact(draft.description);
  const requirements = toJobPostRequirements(draft.requirements);

  return {
    title: compact(draft.title) || 'Untitled role',
    descriptionPreview: description.length > 220 ? `${description.slice(0, 217).trimEnd()}...` : description,
    location: compact(draft.location) || 'Location not set',
    jobTypeLabel: jobTypeLabels[compact(draft.jobType)] || compact(draft.jobType) || 'Job type not set',
    salaryLabel: buildJobPostSalaryLabel(draft),
    requirements,
    requirementCount: requirements.length,
  };
};
