import { supabase } from '../lib/supabaseClient';
import { Job, JobApplication, CreateApplicationRequest } from '../types/job';
import { apiClient } from '../api/axios';
import type {
  JobPostDraftHistoryEntry,
  JobPostDraftHistoryReason,
} from '../lib/jobPostDraftHistory';
import type { JobPostTemplate } from '../lib/jobPostTemplates';
import type { HiddenExploreJob } from '../lib/hiddenExploreJobs';

export type JobQueryParams = {
  status?: string;
  job_type?: string;
  location?: string;
  search?: string;
  salary_min?: number;
  salary_max?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
};

export interface PaginatedJobsResult {
  jobs: Job[];
  total: number | null;
  limit?: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export type SavedJobSearchFilters = {
  jobType: string;
  location: string;
  minSalary: string;
  maxSalary: string;
};

export interface SavedJobSearchRecord {
  id: string;
  name: string;
  searchTerm: string;
  filters: SavedJobSearchFilters;
  createdAt: string;
  lastUsedAt?: string;
  alertEnabled?: boolean;
  lastMatchCount?: number;
  lastCheckedAt?: string;
}

type UpdateJobPayload = Omit<Partial<Job>, 'companyId'> & { companyId?: string | null };

const getErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return typeof error === 'string' ? error : '';
};

export const getJobPublishPolicyErrorMessage = (error: unknown) => {
  const message = getErrorText(error);
  const constraint = error && typeof error === 'object' && 'constraint' in error
    ? (error as { constraint?: unknown }).constraint
    : undefined;
  const code = error && typeof error === 'object' && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;

  if (
    constraint === 'job_publish_readiness' ||
    (code === '23514' && /publish job/i.test(message)) ||
    /Cannot publish job/i.test(message)
  ) {
    return 'This posting is missing required publish details. Open the draft, finish the checklist, and publish again.';
  }

  return null;
};

const mapJobResponse = (data: Record<string, any>): Job => ({
  id: data.id,
  title: data.title,
  description: data.description,
  companyId: data.company_id ?? data.companyId,
  companyName: data.companies?.name ?? data.company?.name ?? data.companyName,
  companyLogoUrl: data.companies?.logo_url ?? data.company?.logoUrl ?? data.companyLogoUrl,
  location: data.location,
  jobType: data.job_type ?? data.jobType,
  salaryMin: data.salary_min ?? data.salaryMin,
  salaryMax: data.salary_max ?? data.salaryMax,
  requirements: data.requirements || [],
  postedAt: data.posted_at ?? data.postedAt ?? data.created_at ?? data.createdAt ?? new Date(0).toISOString(),
  status: data.status
});

const normalizeSavedSearchFilters = (filters: any): SavedJobSearchFilters => ({
  jobType: typeof filters?.jobType === 'string' ? filters.jobType : '',
  location: typeof filters?.location === 'string' ? filters.location : '',
  minSalary: typeof filters?.minSalary === 'string' ? filters.minSalary : '',
  maxSalary: typeof filters?.maxSalary === 'string' ? filters.maxSalary : '',
});

const mapSavedSearchResponse = (data: Record<string, any>): SavedJobSearchRecord => ({
  id: data.id,
  name: data.name,
  searchTerm: data.search_term || '',
  filters: normalizeSavedSearchFilters(data.filters),
  createdAt: data.created_at || new Date().toISOString(),
  lastUsedAt: data.last_used_at || undefined,
  alertEnabled: Boolean(data.alert_enabled),
  lastMatchCount: typeof data.last_match_count === 'number' ? data.last_match_count : undefined,
  lastCheckedAt: data.last_checked_at || undefined,
});

const getHiddenExploreJobRecordId = (userId: string, jobId: string) => `${userId}:${jobId}`;

const mapHiddenExploreJobResponse = (data: Record<string, any>): HiddenExploreJob => ({
  jobId: data.job_id || data.jobId || '',
  title: data.title || 'Untitled job',
  companyName: data.company_name || data.companyName || undefined,
  jobType: data.job_type || data.jobType || undefined,
  location: data.location || undefined,
  hiddenAt: data.hidden_at || data.hiddenAt || data.created_at || data.createdAt || new Date().toISOString(),
});

const mapJobPostDraftHistoryResponse = (data: Record<string, any>): JobPostDraftHistoryEntry => ({
  id: data.id,
  recruiterId: data.recruiter_id || data.recruiterId || '',
  draftKey: data.draft_key || data.draftKey || 'new',
  jobId: data.job_id || data.jobId || null,
  title: data.title || '',
  description: data.description || '',
  location: data.location || '',
  salaryMin: data.salary_min || data.salaryMin || '',
  salaryMax: data.salary_max || data.salaryMax || '',
  requirements: data.requirements || '',
  jobType: data.job_type || data.jobType || 'FULL_TIME',
  salaryRange: data.salary_range || data.salaryRange || '',
  category: data.category || '',
  companyId: data.company_id || data.companyId || null,
  companyName: data.company_name || data.companyName || '',
  companyAttached: Boolean(data.company_attached ?? data.companyAttached),
  reason: (data.reason || 'autosave') as JobPostDraftHistoryReason,
  persistedTo: 'server',
  createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  updatedAt: data.updated_at || data.updatedAt || data.created_at || data.createdAt || new Date().toISOString(),
});

const mapJobPostTemplateResponse = (data: Record<string, any>): JobPostTemplate => ({
  id: data.id,
  recruiterId: data.recruiter_id || data.recruiterId || '',
  name: data.name || data.title || 'Untitled role',
  title: data.title || '',
  description: data.description || '',
  location: data.location || '',
  salaryMin: data.salary_min || data.salaryMin || '',
  salaryMax: data.salary_max || data.salaryMax || '',
  requirements: data.requirements || '',
  jobType: data.job_type || data.jobType || 'FULL_TIME',
  salaryRange: data.salary_range || data.salaryRange || '',
  category: data.category || '',
  persistedTo: 'server',
  createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  updatedAt: data.updated_at || data.updatedAt || data.created_at || data.createdAt || new Date().toISOString(),
});

const encodeJobCursor = (job: Job): string => {
  const payload = JSON.stringify({ postedAt: job.postedAt, id: job.id });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeJobCursor = (cursor?: string): { postedAt: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.postedAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Jobs] Invalid job cursor.', error);
  }

  throw new Error('Invalid job cursor');
};

const sortJobs = (jobs: Job[]) => (
  [...jobs].sort((a, b) => {
    const timeDelta = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    return b.id.localeCompare(a.id);
  })
);

const isJobAfterCursor = (
  job: Job,
  cursor: { postedAt: string; id: string }
) => (
  job.postedAt < cursor.postedAt ||
  (job.postedAt === cursor.postedAt && job.id < cursor.id)
);

const paginateJobs = (
  jobs: Job[],
  options: { limit: number; offset: number; cursor?: { postedAt: string; id: string } | null }
) => {
  const sorted = sortJobs(jobs);
  const filtered = options.cursor
    ? sorted.filter(job => isJobAfterCursor(job, options.cursor!))
    : sorted.slice(options.offset);
  const page = filtered.slice(0, options.limit);
  const hasNext = filtered.length > options.limit;
  const lastJob = page[page.length - 1];

  return {
    jobs: page,
    hasNext,
    nextCursor: hasNext && lastJob ? encodeJobCursor(lastJob) : null,
  };
};

export const jobService = {
  getJobsPage: async (params?: JobQueryParams): Promise<PaginatedJobsResult> => {
    const decodedCursor = decodeJobCursor(params?.cursor);
    const limit = decodedCursor ? (params?.limit ?? 10) : params?.limit;
    const cursorLimit = decodedCursor ? limit ?? 10 : undefined;
    const offset = params?.offset ?? 0;

    try {
      const jobsSelect = `
          *,
          companies (
            id,
            name,
            logo_url,
            location,
            industry
          )
        `;
      let query = decodedCursor
        ? supabase.from('jobs').select(jobsSelect)
        : supabase.from('jobs').select(jobsSelect, { count: 'exact' });

      query = query
        .eq('status', params?.status || 'PUBLISHED');

      if (params?.job_type) {
        query = query.eq('job_type', params.job_type);
      }

      if (params?.location) {
        query = query.ilike('location', `%${params.location}%`);
      }

      if (params?.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      if (params?.salary_min !== undefined) {
        query = query.gte('salary_max', params.salary_min);
      }

      if (params?.salary_max !== undefined) {
        query = query.lte('salary_min', params.salary_max);
      }

      query = query
        .order('posted_at', { ascending: false })
        .order('id', { ascending: false });

      if (decodedCursor) {
        query = query
          .or(`posted_at.lt.${decodedCursor.postedAt},and(posted_at.eq.${decodedCursor.postedAt},id.lt.${decodedCursor.id})`)
          .limit(cursorLimit! + 1);
      } else if (limit !== undefined && params?.offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
      } else if (limit !== undefined) {
        query = query.limit(limit);
      } else if (params?.offset !== undefined) {
        query = query.range(offset, offset + 9);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const mappedJobs = (data || []).map(mapJobResponse);
      const jobs = decodedCursor ? mappedJobs.slice(0, cursorLimit) : mappedJobs;
      const total = decodedCursor ? null : typeof count === 'number' ? count : null;
      const hasNext = decodedCursor
        ? mappedJobs.length > cursorLimit!
        : total !== null
          ? offset + jobs.length < total
          : limit !== undefined && jobs.length === limit;
      const lastJob = jobs[jobs.length - 1];

      return {
        jobs,
        total,
        limit,
        offset,
        hasNext,
        nextCursor: hasNext && lastJob ? encodeJobCursor(lastJob) : null,
      };
    } catch (err) {
      console.warn('[Jobs] Supabase failed, trying API Gateway...', err);
      const response = await apiClient.get('/api/v1/jobs', {
        params: decodedCursor && limit !== undefined
          ? { ...params, limit: limit + 1 }
          : params
      });
      const payload = response.data?.data ?? response.data;
      const rows = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.jobs || payload?.content || [];
      const total = typeof response.data?.total === 'number'
        ? response.data.total
        : typeof response.data?.totalElements === 'number'
          ? response.data.totalElements
          : typeof payload?.total === 'number'
            ? payload.total
            : typeof payload?.totalElements === 'number'
              ? payload.totalElements
              : null;
      const responseNextCursor = response.data?.nextCursor || payload?.nextCursor || null;
      const mappedJobs = rows.map(mapJobResponse);
      const paged = decodedCursor && !responseNextCursor && limit !== undefined
        ? paginateJobs(mappedJobs, { limit, offset, cursor: decodedCursor })
        : null;
      const jobs = paged
        ? paged.jobs
        : limit !== undefined
          ? mappedJobs.slice(0, limit)
          : mappedJobs;
      const hasNext = paged
        ? paged.hasNext
        : responseNextCursor
          ? true
          : total !== null
            ? offset + jobs.length < total
            : limit !== undefined && mappedJobs.length > limit;
      const lastJob = jobs[jobs.length - 1];

      return {
        jobs,
        total: decodedCursor ? null : total,
        limit,
        offset,
        hasNext,
        nextCursor: responseNextCursor || paged?.nextCursor || (hasNext && lastJob ? encodeJobCursor(lastJob) : null),
      };
    }
  },

  getJobs: async (params?: JobQueryParams): Promise<Job[]> => {
    const result = await jobService.getJobsPage(params);
    return result.jobs;
  },

  getSavedSearches: async (userId: string): Promise<SavedJobSearchRecord[]> => {
    const { data, error } = await supabase
      .from('saved_job_searches')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('[Jobs] saved searches unavailable; using local saved searches.', error);
      throw new Error(`Failed to fetch saved searches: ${error.message}`);
    }

    return (data || []).map(mapSavedSearchResponse);
  },

  saveSavedSearch: async (userId: string, savedSearch: SavedJobSearchRecord): Promise<SavedJobSearchRecord> => {
    const { data, error } = await supabase
      .from('saved_job_searches')
      .upsert({
        id: savedSearch.id,
        user_id: userId,
        name: savedSearch.name,
        search_term: savedSearch.searchTerm,
        filters: savedSearch.filters,
        alert_enabled: Boolean(savedSearch.alertEnabled),
        last_match_count: savedSearch.lastMatchCount ?? null,
        last_checked_at: savedSearch.lastCheckedAt ?? null,
        last_used_at: savedSearch.lastUsedAt ?? null,
        created_at: savedSearch.createdAt,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.warn('[Jobs] saved search not synced; using local saved searches.', error);
      throw new Error(`Failed to save search: ${error.message}`);
    }

    return mapSavedSearchResponse(data);
  },

  deleteSavedSearch: async (userId: string, savedSearchId: string): Promise<void> => {
    const { error } = await supabase
      .from('saved_job_searches')
      .delete()
      .eq('user_id', userId)
      .eq('id', savedSearchId);

    if (error) {
      console.warn('[Jobs] saved search delete not synced; using local saved searches.', error);
      throw new Error(`Failed to delete saved search: ${error.message}`);
    }
  },

  getHiddenExploreJobs: async (userId: string, limit = 50): Promise<HiddenExploreJob[]> => {
    const { data, error } = await supabase
      .from('hidden_explore_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('hidden_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Jobs] hidden Explore preferences unavailable; using local fallback.', error);
      throw new Error(`Failed to fetch hidden Explore jobs: ${error.message}`);
    }

    return (data || []).map(mapHiddenExploreJobResponse);
  },

  saveHiddenExploreJob: async (
    userId: string,
    hiddenJob: HiddenExploreJob
  ): Promise<HiddenExploreJob> => {
    const hiddenAt = hiddenJob.hiddenAt || new Date().toISOString();
    const { data, error } = await supabase
      .from('hidden_explore_jobs')
      .upsert({
        id: getHiddenExploreJobRecordId(userId, hiddenJob.jobId),
        user_id: userId,
        job_id: hiddenJob.jobId,
        title: hiddenJob.title,
        company_name: hiddenJob.companyName || null,
        job_type: hiddenJob.jobType || null,
        location: hiddenJob.location || null,
        hidden_at: hiddenAt,
        created_at: hiddenAt,
      }, {
        onConflict: 'user_id,job_id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Jobs] hidden Explore preference not synced; using local fallback.', error);
      throw new Error(`Failed to save hidden Explore job: ${error.message}`);
    }

    return mapHiddenExploreJobResponse(data);
  },

  deleteHiddenExploreJob: async (userId: string, jobId: string): Promise<void> => {
    const { error } = await supabase
      .from('hidden_explore_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    if (error) {
      console.warn('[Jobs] hidden Explore preference delete not synced; using local fallback.', error);
      throw new Error(`Failed to delete hidden Explore job: ${error.message}`);
    }
  },

  clearHiddenExploreJobs: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('hidden_explore_jobs')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('[Jobs] hidden Explore preference clear not synced; using local fallback.', error);
      throw new Error(`Failed to clear hidden Explore jobs: ${error.message}`);
    }
  },

  getJobPostDraftHistory: async (
    recruiterId: string,
    draftKey: string,
    limit = 5
  ): Promise<JobPostDraftHistoryEntry[]> => {
    const { data, error } = await supabase
      .from('job_post_draft_versions')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .eq('draft_key', draftKey)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Jobs] job-post draft history unavailable; using local fallback.', error);
      throw new Error(`Failed to fetch job-post draft history: ${error.message}`);
    }

    return (data || []).map(mapJobPostDraftHistoryResponse);
  },

  saveJobPostDraftHistoryEntry: async (
    entry: JobPostDraftHistoryEntry
  ): Promise<JobPostDraftHistoryEntry> => {
    const { data, error } = await supabase
      .from('job_post_draft_versions')
      .upsert({
        id: entry.id,
        recruiter_id: entry.recruiterId,
        draft_key: entry.draftKey,
        job_id: entry.jobId || null,
        title: entry.title,
        description: entry.description,
        location: entry.location,
        salary_min: entry.salaryMin || null,
        salary_max: entry.salaryMax || null,
        requirements: entry.requirements,
        job_type: entry.jobType,
        salary_range: entry.salaryRange || null,
        category: entry.category || null,
        company_id: entry.companyAttached ? entry.companyId || null : null,
        company_name: entry.companyAttached ? entry.companyName || null : null,
        company_attached: entry.companyAttached,
        reason: entry.reason,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Jobs] job-post draft history not synced; using local fallback.', error);
      throw new Error(`Failed to save job-post draft history: ${error.message}`);
    }

    return mapJobPostDraftHistoryResponse(data);
  },

  getJobPostTemplates: async (
    recruiterId: string,
    limit = 5
  ): Promise<JobPostTemplate[]> => {
    const { data, error } = await supabase
      .from('job_post_templates')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Jobs] job-post templates unavailable; using local fallback.', error);
      throw new Error(`Failed to fetch job-post templates: ${error.message}`);
    }

    return (data || []).map(mapJobPostTemplateResponse);
  },

  saveJobPostTemplate: async (
    recruiterId: string,
    template: JobPostTemplate
  ): Promise<JobPostTemplate> => {
    const { data, error } = await supabase
      .from('job_post_templates')
      .upsert({
        id: template.id,
        recruiter_id: recruiterId,
        name: template.name,
        title: template.title,
        description: template.description,
        location: template.location,
        salary_min: template.salaryMin || null,
        salary_max: template.salaryMax || null,
        requirements: template.requirements,
        job_type: template.jobType,
        salary_range: template.salaryRange || null,
        category: template.category || null,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Jobs] job-post template not synced; using local fallback.', error);
      throw new Error(`Failed to save job-post template: ${error.message}`);
    }

    return mapJobPostTemplateResponse(data);
  },

  deleteJobPostTemplate: async (
    recruiterId: string,
    templateId: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('job_post_templates')
      .delete()
      .eq('recruiter_id', recruiterId)
      .eq('id', templateId);

    if (error) {
      console.warn('[Jobs] job-post template delete not synced; using local fallback.', error);
      throw new Error(`Failed to delete job-post template: ${error.message}`);
    }
  },


  getJobById: async (id: string): Promise<Job> => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (
            id,
            name,
            logo_url,
            location,
            industry,
            description,
            website
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return mapJobResponse(data);
    } catch (err) {
      console.warn(`[Jobs] getJobById failed for ${id}, trying API Gateway...`, err);
      const response = await apiClient.get(`/api/v1/jobs/${id}`);
      return mapJobResponse(response.data?.data || response.data);
    }
  },

  getRecommendedJobs: async (userId: string): Promise<Job[]> => {
    // Get user's skills first
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select(`
        id,
        skills (name)
      `)
      .eq('user_id', userId)
      .single();

    if (!profileData || !profileData.skills) {
      // Fallback to trending jobs
      return jobService.getJobs({ limit: 10 });
    }

    const skillNames = profileData.skills.map(s => s.name);

    // Find jobs that might match based on requirements containing user skills
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        companies (id, name, logo_url)
      `)
      .eq('status', 'PUBLISHED')
      .order('posted_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Simple client-side matching (can be improved with full-text search)
    const matchedJobs = (data || []).filter((job: Record<string, any>) =>
      job.requirements?.some((req: string) =>
        skillNames.some(skill =>
          req.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );

    return matchedJobs.map(mapJobResponse);
  },

  postJob: async (jobData: Partial<Job>, postedBy: string): Promise<Job> => {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title: jobData.title,
        description: jobData.description,
        company_id: jobData.companyId,
        location: jobData.location,
        job_type: jobData.jobType || 'FULL_TIME',
        salary_min: jobData.salaryMin,
        salary_max: jobData.salaryMax,
        requirements: jobData.requirements,
        status: jobData.status || 'DRAFT',
        posted_by: postedBy
      })
      .select()
      .single();

    if (error) throw error;

    return mapJobResponse(data);
  },

  updateJob: async (id: string, jobData: UpdateJobPayload): Promise<Job> => {
    const updateData: Record<string, any> = {};
    if (jobData.title) updateData.title = jobData.title;
    if (jobData.description) updateData.description = jobData.description;
    if ('companyId' in jobData) updateData.company_id = jobData.companyId;
    if (jobData.location) updateData.location = jobData.location;
    if (jobData.jobType) updateData.job_type = jobData.jobType;
    if (jobData.salaryMin !== undefined) updateData.salary_min = jobData.salaryMin;
    if (jobData.salaryMax !== undefined) updateData.salary_max = jobData.salaryMax;
    if (jobData.requirements) updateData.requirements = jobData.requirements;
    if (jobData.status) updateData.status = jobData.status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapJobResponse(data);
  },

  deleteJob: async (id: string): Promise<void> => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) throw error;
  },

  searchJobs: async (location: string, searchTerm?: string): Promise<Job[]> => {
    return jobService.getJobs({
      location,
      search: searchTerm,
      status: 'PUBLISHED'
    });
  },

  // Job Applications
  applyToJob: async (application: CreateApplicationRequest, userId?: string): Promise<JobApplication> => {
    const applicantId = application.userId || userId;
    if (!applicantId) {
      throw new Error('User ID is required to apply for a job');
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          job_id: application.jobId,
          user_id: applicantId,
          status: 'PENDING',
          applied_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Jobs] applyToJob failed; no application was created.', err);
      throw new Error('Application could not be submitted. Your draft was not sent. Please try again.');
    }
  },

  getApplications: async (userId: string): Promise<JobApplication[]> => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          jobs (
            *,
            companies (*)
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Jobs] getApplications failed, returning empty mock list...', err);
      return [];
    }
  },

  getUserApplications: async (userId: string): Promise<JobApplication[]> => {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        jobs (
          id,
          title,
          companies (name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    return data.map(app => ({
      id: app.id,
      jobId: app.job_id,
      userId: app.user_id,
      status: app.status,
      appliedAt: app.applied_at,
      resumeUrl: app.resume_url,
      coverLetter: app.cover_letter,
      job: app.jobs
    }));
  },

  getApplicationStatus: async (applicationId: string): Promise<JobApplication> => {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        jobs (id, title, companies (name))
      `)
      .eq('id', applicationId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      jobId: data.job_id,
      userId: data.user_id,
      status: data.status,
      appliedAt: data.applied_at,
      resumeUrl: data.resume_url,
      coverLetter: data.cover_letter
    };
  },

  withdrawApplication: async (applicationId: string): Promise<void> => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: 'REJECTED' })
      .eq('id', applicationId);

    if (error) throw error;
  }
};
