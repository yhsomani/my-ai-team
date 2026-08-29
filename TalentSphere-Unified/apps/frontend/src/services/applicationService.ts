import { typedSupabase as supabase, type Database } from '../lib/supabaseClient';
import type { ApplicationDraftHistoryEntry, ApplicationDraftHistoryReason } from '../lib/applicationDraftHistory';
import type { ApplicationStatusEvent, Job, JobApplication, CreateApplicationRequest } from '../types/job';

export type ApplicationDraftSource = 'manual' | 'profile' | 'ai';

type ApplicationStatus = Database['public']['Enums']['application_status'];
type JobApplicationRow = Database['public']['Tables']['job_applications']['Row'];
type JobApplicationInsert = Database['public']['Tables']['job_applications']['Insert'];
type JobApplicationUpdate = Database['public']['Tables']['job_applications']['Update'];
type ApplicationStatusEventRow = Database['public']['Tables']['application_status_events']['Row'];
type ApplicationStatusEventInsert = Database['public']['Tables']['application_status_events']['Insert'];
type ApplicationDraftRow = Database['public']['Tables']['application_drafts']['Row'];
type ApplicationDraftInsert = Database['public']['Tables']['application_drafts']['Insert'];
type ApplicationDraftVersionRow = Database['public']['Tables']['application_draft_versions']['Row'];
type ApplicationDraftVersionInsert = Database['public']['Tables']['application_draft_versions']['Insert'];

type CompanyReference = {
  name?: string | null;
  logo_url?: string | null;
};

type JobReference = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  company_id?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  location?: string | null;
  job_type?: string | null;
  jobType?: string | null;
  salary_min?: number | string | null;
  salaryMin?: number | string | null;
  salary_max?: number | string | null;
  salaryMax?: number | string | null;
  salary_range?: string | null;
  salaryRange?: string | null;
  requirements?: string[] | string | null;
  posted_at?: string | null;
  postedAt?: string | null;
  status?: string | null;
  companies?: CompanyReference | CompanyReference[] | null;
};

type ApplicationResponse = Partial<JobApplicationRow> & {
  jobId?: string;
  userId?: string;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  jobs?: unknown;
  job?: JobReference | null;
};

const APPLICATION_STATUSES: JobApplication['status'][] = ['PENDING', 'REVIEWED', 'INTERVIEW', 'OFFER', 'REJECTED'];

const normalizeApplicationStatus = (status: string | null | undefined): JobApplication['status'] => {
  return APPLICATION_STATUSES.includes(status as JobApplication['status'])
    ? status as JobApplication['status']
    : 'PENDING';
};

const toApplicationStatus = (status: string): ApplicationStatus => normalizeApplicationStatus(status) as ApplicationStatus;

const normalizeRequirements = (requirements: string[] | string | null | undefined): string[] => {
  if (Array.isArray(requirements)) return requirements;
  if (!requirements) return [];
  return requirements.split('\n').map((item) => item.trim()).filter(Boolean);
};

const normalizeOptionalNumber = (value: number | string | null | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDraftSource = (source: string | null | undefined): ApplicationDraftSource => {
  return source === 'profile' || source === 'ai' ? source : 'manual';
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toNullableString = (value: unknown): string | null | undefined => (
  typeof value === 'string' ? value : value === null ? null : undefined
);

const toJobReference = (value: unknown): JobReference | null => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate) || !('id' in candidate || 'title' in candidate)) {
    return null;
  }

  const companiesValue = candidate.companies;
  const companies = Array.isArray(companiesValue)
    ? companiesValue.filter(isRecord).map((company) => ({
        name: toNullableString(company.name),
        logo_url: toNullableString(company.logo_url),
      }))
    : isRecord(companiesValue)
      ? {
          name: toNullableString(companiesValue.name),
          logo_url: toNullableString(companiesValue.logo_url),
        }
      : null;
  const requirements = Array.isArray(candidate.requirements)
    ? candidate.requirements.filter((requirement): requirement is string => typeof requirement === 'string')
    : typeof candidate.requirements === 'string' || candidate.requirements === null
      ? candidate.requirements
      : undefined;

  return {
    id: toNullableString(candidate.id),
    title: toNullableString(candidate.title),
    description: toNullableString(candidate.description),
    company_id: toNullableString(candidate.company_id),
    companyId: toNullableString(candidate.companyId),
    companyName: toNullableString(candidate.companyName),
    companyLogoUrl: toNullableString(candidate.companyLogoUrl),
    location: toNullableString(candidate.location),
    job_type: toNullableString(candidate.job_type),
    jobType: toNullableString(candidate.jobType),
    salary_min: typeof candidate.salary_min === 'number' || typeof candidate.salary_min === 'string' || candidate.salary_min === null ? candidate.salary_min : undefined,
    salaryMin: typeof candidate.salaryMin === 'number' || typeof candidate.salaryMin === 'string' || candidate.salaryMin === null ? candidate.salaryMin : undefined,
    salary_max: typeof candidate.salary_max === 'number' || typeof candidate.salary_max === 'string' || candidate.salary_max === null ? candidate.salary_max : undefined,
    salaryMax: typeof candidate.salaryMax === 'number' || typeof candidate.salaryMax === 'string' || candidate.salaryMax === null ? candidate.salaryMax : undefined,
    salary_range: toNullableString(candidate.salary_range),
    salaryRange: toNullableString(candidate.salaryRange),
    requirements,
    posted_at: toNullableString(candidate.posted_at),
    postedAt: toNullableString(candidate.postedAt),
    status: toNullableString(candidate.status),
    companies,
  };
};

export interface ApplicationDraftRecord {
  jobId: string;
  userId: string;
  resumeUrl: string;
  coverLetter: string;
  source: ApplicationDraftSource;
  updatedAt: string;
}

const mapApplicationResponse = (application: ApplicationResponse): JobApplication => {
  const job = toJobReference(application.jobs) || application.job || null;
  const company = Array.isArray(job?.companies) ? job.companies[0] : job?.companies;

  const mapped: JobApplication = {
    id: application.id || '',
    jobId: application.job_id || application.jobId || '',
    userId: application.user_id || application.userId || '',
    status: normalizeApplicationStatus(application.status),
    appliedAt: application.applied_at || application.created_at || new Date().toISOString(),
  };

  const resumeUrl = application.resume_url || application.resumeUrl;
  if (resumeUrl) mapped.resumeUrl = resumeUrl;

  const coverLetter = application.cover_letter || application.coverLetter;
  if (coverLetter) mapped.coverLetter = coverLetter;

  if (job) {
    const mappedJob: Job = {
      id: job.id || '',
      title: job.title || '',
      description: job.description || '',
      companyId: job.company_id || job.companyId || '',
      location: job.location || '',
      jobType: job.job_type || job.jobType || '',
      requirements: normalizeRequirements(job.requirements),
      postedAt: job.posted_at || job.postedAt || '',
      status: job.status || '',
    };
    const companyName = company?.name || job.companyName;
    if (companyName) mappedJob.companyName = companyName;
    const companyLogoUrl = company?.logo_url || job.companyLogoUrl;
    if (companyLogoUrl) mappedJob.companyLogoUrl = companyLogoUrl;
    const salaryMin = normalizeOptionalNumber(job.salary_min || job.salaryMin);
    if (salaryMin !== undefined) mappedJob.salaryMin = salaryMin;
    const salaryMax = normalizeOptionalNumber(job.salary_max || job.salaryMax);
    if (salaryMax !== undefined) mappedJob.salaryMax = salaryMax;
    const salaryRange = job.salary_range || job.salaryRange;
    if (salaryRange) mappedJob.salaryRange = salaryRange;
    mapped.job = mappedJob;
  }

  return mapped;
};

const mapStatusEventResponse = (event: ApplicationStatusEventRow): ApplicationStatusEvent => ({
  id: event.id,
  applicationId: event.application_id || '',
  previousStatus: event.previous_status ?? null,
  status: event.status,
  changedBy: event.changed_by ?? null,
  reason: event.reason ?? null,
  createdAt: event.created_at || new Date().toISOString(),
});

const mapApplicationDraftResponse = (draft: ApplicationDraftRow): ApplicationDraftRecord => ({
  jobId: draft.job_id || '',
  userId: draft.user_id || '',
  resumeUrl: draft.resume_url || '',
  coverLetter: draft.cover_letter || '',
  source: normalizeDraftSource(draft.source),
  updatedAt: draft.updated_at || new Date().toISOString(),
});

const mapApplicationDraftHistoryResponse = (draft: ApplicationDraftVersionRow): ApplicationDraftHistoryEntry => ({
  id: draft.id,
  jobId: draft.job_id || '',
  userId: draft.user_id || '',
  resumeUrl: draft.resume_url || '',
  coverLetter: draft.cover_letter || '',
  source: normalizeDraftSource(draft.source),
  reason: (draft.reason || 'autosave') as ApplicationDraftHistoryReason,
  createdAt: draft.created_at || new Date().toISOString(),
  updatedAt: draft.updated_at || draft.created_at || new Date().toISOString(),
});

const recordApplicationStatusEvent = async (event: {
  applicationId: string;
  previousStatus?: string | null;
  status: string;
  changedBy?: string | null;
  reason?: string;
}) => {
  try {
    const payload: ApplicationStatusEventInsert = {
      application_id: event.applicationId,
      previous_status: event.previousStatus ? toApplicationStatus(event.previousStatus) : null,
      status: toApplicationStatus(event.status),
      changed_by: event.changedBy || null,
      reason: event.reason,
    };

    const { error } = await supabase
      .from('application_status_events')
      .insert(payload);

    if (error) throw error;
  } catch (error) {
    console.warn('[Applications] status event not recorded; falling back to inferred timeline.', error);
  }
};

export const applicationService = {
  submitApplication: async (request: CreateApplicationRequest & { userId: string }): Promise<JobApplication> => {
    try {
      const payload: JobApplicationInsert = {
        user_id: request.userId,
        job_id: request.jobId,
        resume_url: request.resumeUrl,
        cover_letter: request.coverLetter,
        status: 'PENDING',
      };

      const { data, error } = await supabase
        .from('job_applications')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      const application = mapApplicationResponse(data);
      await recordApplicationStatusEvent({
        applicationId: application.id,
        previousStatus: null,
        status: application.status,
        changedBy: request.userId,
        reason: 'Application submitted',
      });
      return application;
    } catch (err) {
      console.warn('[Applications] submitApplication failed; no application was created.', err);
      throw new Error('Application could not be submitted. Your draft was not sent. Please try again.');
    }
  },

  getUserApplications: async (userId: string): Promise<JobApplication[]> => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          jobs (
            id,
            title,
            description,
            company_id,
            location,
            job_type,
            salary_min,
            salary_max,
            requirements,
            posted_at,
            status,
            companies (name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data || []) as unknown as ApplicationResponse[]).map(mapApplicationResponse);
    } catch (err) {
      console.warn('[Applications] getUserApplications failed; applications were not loaded.', err);
      throw new Error('Applications could not be loaded. Please try again.');
    }
  },

  getApplicationStatusEvents: async (applicationId: string): Promise<ApplicationStatusEvent[]> => {
    try {
      const { data, error } = await supabase
        .from('application_status_events')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapStatusEventResponse);
    } catch (err) {
      console.warn('[Applications] status events unavailable; using inferred timeline.', err);
      return [];
    }
  },

  getApplicationDraft: async (userId: string, jobId: string): Promise<ApplicationDraftRecord | null> => {
    const { data, error } = await supabase
      .from('application_drafts')
      .select('*')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      console.warn('[Applications] draft unavailable; using local draft fallback.', error);
      throw new Error(`Failed to fetch application draft: ${error.message}`);
    }

    return data ? mapApplicationDraftResponse(data) : null;
  },

  saveApplicationDraft: async (
    userId: string,
    jobId: string,
    draft: {
      resumeUrl: string;
      coverLetter: string;
      source: ApplicationDraftSource;
    }
  ): Promise<ApplicationDraftRecord> => {
    const payload: ApplicationDraftInsert = {
      user_id: userId,
      job_id: jobId,
      resume_url: draft.resumeUrl,
      cover_letter: draft.coverLetter,
      source: draft.source,
    };

    const { data, error } = await supabase
      .from('application_drafts')
      .upsert(payload, {
        onConflict: 'user_id,job_id'
      })
      .select()
      .single();

    if (error) {
      console.warn('[Applications] draft not synced; using local draft fallback.', error);
      throw new Error(`Failed to save application draft: ${error.message}`);
    }

    return mapApplicationDraftResponse(data);
  },

  deleteApplicationDraft: async (userId: string, jobId: string): Promise<void> => {
    const { error } = await supabase
      .from('application_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    if (error) {
      console.warn('[Applications] draft delete not synced; using local draft fallback.', error);
      throw new Error(`Failed to delete application draft: ${error.message}`);
    }
  },

  getApplicationDraftHistory: async (
    userId: string,
    jobId: string,
    limit = 5
  ): Promise<ApplicationDraftHistoryEntry[]> => {
    const { data, error } = await supabase
      .from('application_draft_versions')
      .select('*')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Applications] draft history unavailable; using local history fallback.', error);
      throw new Error(`Failed to fetch application draft history: ${error.message}`);
    }

    return (data || []).map(mapApplicationDraftHistoryResponse);
  },

  saveApplicationDraftHistoryEntry: async (
    entry: ApplicationDraftHistoryEntry
  ): Promise<ApplicationDraftHistoryEntry> => {
    const payload: ApplicationDraftVersionInsert = {
      id: entry.id,
      user_id: entry.userId,
      job_id: entry.jobId,
      resume_url: entry.resumeUrl,
      cover_letter: entry.coverLetter,
      source: entry.source,
      reason: entry.reason,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    };

    const { data, error } = await supabase
      .from('application_draft_versions')
      .upsert(payload, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Applications] draft history not synced; using local history fallback.', error);
      throw new Error(`Failed to save application draft history: ${error.message}`);
    }

    return mapApplicationDraftHistoryResponse(data);
  },

  updateApplicationStatus: async (
    applicationId: string,
    status: string,
    options?: { changedBy?: string; previousStatus?: string; reason?: string }
  ): Promise<JobApplication> => {
    try {
      const payload: JobApplicationUpdate = {
        status: toApplicationStatus(status),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('job_applications')
        .update(payload)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      const application = mapApplicationResponse(data);
      await recordApplicationStatusEvent({
        applicationId,
        previousStatus: options?.previousStatus || null,
        status,
        changedBy: options?.changedBy || null,
        reason: options?.reason || 'Application status updated',
      });
      return application;
    } catch (err) {
      console.warn('[Applications] updateApplicationStatus failed; status was not changed.', err);
      throw new Error('Application status could not be updated. Please try again.');
    }
  },

  withdrawApplication: async (applicationId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;
    } catch (err) {
      console.warn('[Applications] withdrawApplication failed; application was not withdrawn.', err);
      throw new Error('Application could not be withdrawn. Please try again.');
    }
  }
};
