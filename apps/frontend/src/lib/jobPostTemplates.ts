export interface JobPostFormDraft {
  title: string;
  description: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  requirements: string;
  jobType: string;
  salaryRange?: string;
  category?: string;
}

export type JobPostTemplatePersistedTo = 'server' | 'local';

export interface JobPostTemplate extends JobPostFormDraft {
  id: string;
  name: string;
  recruiterId?: string;
  persistedTo: JobPostTemplatePersistedTo;
  createdAt: string;
  updatedAt: string;
}

export const defaultJobPostDraft: JobPostFormDraft = {
  title: '',
  description: '',
  location: '',
  salaryMin: '',
  salaryMax: '',
  requirements: '',
  jobType: 'FULL_TIME',
  salaryRange: '',
  category: '',
};

const compact = (value?: string | null) => (value || '').trim();

export const getJobPostTemplateStorageKey = (recruiterId?: string) => (
  `talentsphere.jobPostTemplates.${recruiterId || 'guest'}`
);

export const hasJobPostDraftContent = (draft: JobPostFormDraft) => (
  Boolean(
    compact(draft.title) ||
    compact(draft.description) ||
    compact(draft.location) ||
    compact(draft.requirements)
  )
);

export const buildJobPostTemplateName = (draft: JobPostFormDraft) => {
  const title = compact(draft.title) || 'Untitled role';
  const location = compact(draft.location);
  return location ? `${title} - ${location}` : title;
};

export const buildJobPostTemplateFromDraft = (
  draft: JobPostFormDraft,
  existing?: JobPostTemplate,
  now = new Date()
): JobPostTemplate => {
  const timestamp = now.toISOString();

  return {
    id: existing?.id || `job-template-${now.getTime()}`,
    name: buildJobPostTemplateName(draft),
    recruiterId: existing?.recruiterId,
    persistedTo: existing?.persistedTo === 'server' ? 'server' : 'local',
    title: compact(draft.title),
    description: compact(draft.description),
    location: compact(draft.location),
    salaryMin: compact(draft.salaryMin),
    salaryMax: compact(draft.salaryMax),
    requirements: compact(draft.requirements),
    jobType: compact(draft.jobType) || defaultJobPostDraft.jobType,
    salaryRange: compact(draft.salaryRange),
    category: compact(draft.category),
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
};

export const sanitizeJobPostTemplates = (value: unknown): JobPostTemplate[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value.reduce<JobPostTemplate[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;

    const candidate = item as Partial<JobPostTemplate>;
    const id = compact(candidate.id);
    if (!id || seen.has(id)) return acc;

    seen.add(id);
    acc.push({
      id,
      name: compact(candidate.name) || buildJobPostTemplateName({
        ...defaultJobPostDraft,
        title: candidate.title || '',
        location: candidate.location || '',
      }),
      recruiterId: compact(candidate.recruiterId),
      persistedTo: candidate.persistedTo === 'server' ? 'server' : 'local',
      title: compact(candidate.title),
      description: compact(candidate.description),
      location: compact(candidate.location),
      salaryMin: compact(candidate.salaryMin),
      salaryMax: compact(candidate.salaryMax),
      requirements: compact(candidate.requirements),
      jobType: compact(candidate.jobType) || defaultJobPostDraft.jobType,
      salaryRange: compact(candidate.salaryRange),
      category: compact(candidate.category),
      createdAt: compact(candidate.createdAt) || new Date(0).toISOString(),
      updatedAt: compact(candidate.updatedAt) || compact(candidate.createdAt) || new Date(0).toISOString(),
    });

    return acc;
  }, []);
};

export const mergeJobPostTemplates = (
  primary: JobPostTemplate[],
  fallback: JobPostTemplate[],
  maxItems = 5
) => sanitizeJobPostTemplates([...primary, ...fallback])
  .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  .slice(0, maxItems);

export const applyJobPostTemplate = (template: JobPostTemplate): JobPostFormDraft => ({
  title: template.title,
  description: template.description,
  location: template.location,
  salaryMin: template.salaryMin,
  salaryMax: template.salaryMax,
  requirements: template.requirements,
  jobType: template.jobType || defaultJobPostDraft.jobType,
  salaryRange: template.salaryRange || '',
  category: template.category || '',
});

export const toJobPostRequirements = (value: string) => (
  value
    .split('\n')
    .map(requirement => compact(requirement).replace(/^[-*]\s*/, ''))
    .filter(Boolean)
);
