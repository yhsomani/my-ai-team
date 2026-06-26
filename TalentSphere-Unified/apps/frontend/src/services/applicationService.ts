import { supabase } from '../lib/supabaseClient';
import type { ApplicationDraftHistoryEntry, ApplicationDraftHistoryReason } from '../lib/applicationDraftHistory';
import type { ApplicationStatusEvent, JobApplication, CreateApplicationRequest } from '../types/job';

export type ApplicationDraftSource = 'manual' | 'profile' | 'ai';

export interface ApplicationDraftRecord {
  jobId: string;
  userId: string;
  resumeUrl: string;
  coverLetter: string;
  source: ApplicationDraftSource;
  updatedAt: string;
}

const mapApplicationResponse = (application: Record<string, any>): JobApplication => {
  const job = application.jobs || application.job;
  const company = Array.isArray(job?.companies) ? job.companies[0] : job?.companies;

  return {
    id: application.id,
    jobId: application.job_id || application.jobId || '',
    userId: application.user_id || application.userId || '',
    status: application.status || 'PENDING',
    appliedAt: application.applied_at || application.created_at || new Date().toISOString(),
    resumeUrl: application.resume_url || application.resumeUrl,
    coverLetter: application.cover_letter || application.coverLetter,
    job: job
      ? {
          id: job.id,
          title: job.title,
          description: job.description || '',
          companyId: job.company_id || job.companyId || '',
          companyName: company?.name || job.companyName,
          companyLogoUrl: company?.logo_url || job.companyLogoUrl,
          location: job.location || '',
          jobType: job.job_type || job.jobType || '',
          salaryMin: job.salary_min || job.salaryMin,
          salaryMax: job.salary_max || job.salaryMax,
          salaryRange: job.salary_range || job.salaryRange,
          requirements: job.requirements || [],
          postedAt: job.posted_at || job.postedAt || '',
          status: job.status || '',
        }
      : undefined,
  };
};

const mapStatusEventResponse = (event: Record<string, any>): ApplicationStatusEvent => ({
  id: event.id,
  applicationId: event.application_id || event.applicationId || '',
  previousStatus: event.previous_status ?? event.previousStatus ?? null,
  status: event.status,
  changedBy: event.changed_by ?? event.changedBy ?? null,
  reason: event.reason ?? null,
  createdAt: event.created_at || event.createdAt || new Date().toISOString(),
});

const mapApplicationDraftResponse = (draft: Record<string, any>): ApplicationDraftRecord => ({
  jobId: draft.job_id || draft.jobId || '',
  userId: draft.user_id || draft.userId || '',
  resumeUrl: draft.resume_url || draft.resumeUrl || '',
  coverLetter: draft.cover_letter || draft.coverLetter || '',
  source: draft.source === 'profile' || draft.source === 'ai' ? draft.source : 'manual',
  updatedAt: draft.updated_at || draft.updatedAt || new Date().toISOString(),
});

const mapApplicationDraftHistoryResponse = (draft: Record<string, any>): ApplicationDraftHistoryEntry => ({
  id: draft.id,
  jobId: draft.job_id || draft.jobId || '',
  userId: draft.user_id || draft.userId || '',
  resumeUrl: draft.resume_url || draft.resumeUrl || '',
  coverLetter: draft.cover_letter || draft.coverLetter || '',
  source: draft.source === 'profile' || draft.source === 'ai' ? draft.source : 'manual',
  reason: (draft.reason || draft.reasonCode || 'autosave') as ApplicationDraftHistoryReason,
  createdAt: draft.created_at || draft.createdAt || new Date().toISOString(),
  updatedAt: draft.updated_at || draft.updatedAt || draft.created_at || draft.createdAt || new Date().toISOString(),
});

const recordApplicationStatusEvent = async (event: {
  applicationId: string;
  previousStatus?: string | null;
  status: string;
  changedBy?: string | null;
  reason?: string;
}) => {
  try {
    const { error } = await supabase
      .from('application_status_events')
      .insert({
        application_id: event.applicationId,
        previous_status: event.previousStatus || null,
        status: event.status,
        changed_by: event.changedBy || null,
        reason: event.reason,
      });

    if (error) throw error;
  } catch (error) {
    console.warn('[Applications] status event not recorded; falling back to inferred timeline.', error);
  }
};

export const applicationService = {
  submitApplication: async (request: CreateApplicationRequest & { userId: string }): Promise<JobApplication> => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          user_id: request.userId,
          job_id: request.jobId,
          resume_url: request.resumeUrl,
          cover_letter: request.coverLetter,
          status: 'PENDING'
        })
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
      return (data || []).map(mapApplicationResponse);
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
    const { data, error } = await supabase
      .from('application_drafts')
      .upsert({
        user_id: userId,
        job_id: jobId,
        resume_url: draft.resumeUrl,
        cover_letter: draft.coverLetter,
        source: draft.source,
      }, {
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
    const { data, error } = await supabase
      .from('application_draft_versions')
      .upsert({
        id: entry.id,
        user_id: entry.userId,
        job_id: entry.jobId,
        resume_url: entry.resumeUrl,
        cover_letter: entry.coverLetter,
        source: entry.source,
        reason: entry.reason,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      }, {
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
      const { data, error } = await supabase
        .from('job_applications')
        .update({ status, updated_at: new Date().toISOString() })
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
