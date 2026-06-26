import { supabase } from '../lib/supabaseClient';
import {
  normalizeCandidateScorecardRatings,
  type CandidateScorecardRatings,
} from '../lib/candidateInterviewPlanner';

export interface RecruiterStats {
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  hiredCount: number;
}

export interface RecruiterOnboardingSignals {
  companyCount: number;
  activeJobs: number;
  totalApplications: number;
  hasRecentApplications: boolean;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | string;
  appliedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  job?: {
    title: string;
  };
  resumeUrl?: string;
  coverLetter?: string;
  updatedAt?: string;
}

export interface PaginatedApplicationsResult {
  applications: Application[];
  total: number | null;
  limit?: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface CandidateNote {
  applicationId: string;
  recruiterId?: string;
  note: string;
  createdAt?: string;
  updatedAt: string;
  source?: 'server' | 'local';
}

export interface CandidateScorecard {
  applicationId: string;
  recruiterId?: string;
  ratings: CandidateScorecardRatings;
  evidence: string;
  createdAt?: string;
  updatedAt: string;
  source?: 'server' | 'local';
}

const activeRecruiterJobStatuses = ['DRAFT', 'PUBLISHED'];
const offerStatuses = ['OFFER'];

const normalizeCandidateSearch = (search?: string) => search?.trim().replace(/\s+/g, ' ') ?? '';
const sanitizeCandidateSearch = (search: string) => search.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();

const mapApplicationResponse = (app: any): Application => ({
  id: app.id,
  userId: app.user_id,
  jobId: app.job_id,
  status: app.status,
  appliedAt: app.created_at || app.appliedAt || app.updated_at || new Date(0).toISOString(),
  user: {
    fullName: app.profiles?.full_name || 'Unknown',
    email: app.profiles?.email || ''
  },
  job: {
    title: app.jobs?.title || 'Unknown'
  },
  resumeUrl: app.resume_url,
  coverLetter: app.cover_letter,
  updatedAt: app.updated_at
});

const mapCandidateNoteResponse = (note: any): CandidateNote => ({
  applicationId: note.application_id,
  recruiterId: note.recruiter_id,
  note: note.note || '',
  createdAt: note.created_at,
  updatedAt: note.updated_at || note.created_at || new Date().toISOString(),
  source: 'server'
});

const mapCandidateScorecardResponse = (scorecard: any): CandidateScorecard => ({
  applicationId: scorecard.application_id,
  recruiterId: scorecard.recruiter_id,
  ratings: normalizeCandidateScorecardRatings(scorecard.ratings || {}),
  evidence: scorecard.evidence || '',
  createdAt: scorecard.created_at,
  updatedAt: scorecard.updated_at || scorecard.created_at || new Date().toISOString(),
  source: 'server'
});

const encodeApplicationCursor = (application: Application): string => {
  const payload = JSON.stringify({ appliedAt: application.appliedAt, id: application.id });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeApplicationCursor = (cursor?: string): { appliedAt: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.appliedAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Recruiter] Invalid application cursor.', error);
  }

  throw new Error('Invalid application cursor');
};

const buildApplicationCursorFilter = (
  cursor: { appliedAt: string; id: string },
  searchFilters: string[] = []
) => {
  const olderCreatedAt = `created_at.lt.${cursor.appliedAt}`;
  const sameCreatedAtOlderId = `and(created_at.eq.${cursor.appliedAt},id.lt.${cursor.id})`;

  if (searchFilters.length === 0) {
    return `${olderCreatedAt},${sameCreatedAtOlderId}`;
  }

  const searchFilter = `or(${searchFilters.join(',')})`;
  return `and(${olderCreatedAt},${searchFilter}),and(created_at.eq.${cursor.appliedAt},id.lt.${cursor.id},${searchFilter})`;
};

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
    console.warn('[Recruiter] status event not recorded; candidate status was still updated.', error);
  }
};

const getRecruiterJobs = async (recruiterId: string): Promise<Array<{ id: string; status?: string; title?: string }>> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, title')
    .eq('posted_by', recruiterId);

  if (error) {
    console.error('Error fetching recruiter jobs:', error);
    throw new Error(`Failed to fetch recruiter jobs: ${error.message}`);
  }

  return data || [];
};

const getMatchingProfileIds = async (search: string): Promise<string[]> => {
  const safeSearch = sanitizeCandidateSearch(search);
  if (!safeSearch) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
    .limit(100);

  if (error) {
    console.warn('[Recruiter] candidate profile search unavailable.', error);
    return [];
  }

  return (data || [])
    .map((profile: { id?: string }) => profile.id)
    .filter((id): id is string => Boolean(id));
};

const countApplications = async (
  jobIds: string[],
  options?: { since?: string; statuses?: string[] }
): Promise<number> => {
  if (jobIds.length === 0) return 0;

  let query = supabase
    .from('job_applications')
    .select('id', { count: 'exact', head: true })
    .in('job_id', jobIds);

  if (options?.since) {
    query = query.gte('created_at', options.since);
  }

  if (options?.statuses?.length) {
    query = query.in('status', options.statuses);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting applications:', error);
    throw new Error(`Failed to count applications: ${error.message}`);
  }

  return count || 0;
};

const countRecruiterCompanies = async (recruiterId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', recruiterId);

  if (error) {
    console.warn('[Recruiter] company onboarding signal unavailable.', error);
    return 0;
  }

  return count || 0;
};

export const recruiterService = {
  getStats: async (recruiterId: string): Promise<RecruiterStats> => {
    const jobsData = await getRecruiterJobs(recruiterId);
    const jobIds = jobsData.map(j => j.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalApplications, newApplications, hiredCount] = await Promise.all([
      countApplications(jobIds),
      countApplications(jobIds, { since: sevenDaysAgo.toISOString() }),
      countApplications(jobIds, { statuses: offerStatuses })
    ]);

    return {
      activeJobs: jobsData.filter(job => activeRecruiterJobStatuses.includes(job.status || '')).length,
      totalApplications,
      newApplications,
      hiredCount
    };
  },

  getOnboardingSignals: async (recruiterId: string): Promise<RecruiterOnboardingSignals> => {
    const jobsData = await getRecruiterJobs(recruiterId).catch(() => []);
    const jobIds = jobsData.map(j => j.id);
    const [companyCount, totalApplications] = await Promise.all([
      countRecruiterCompanies(recruiterId),
      countApplications(jobIds).catch(() => 0)
    ]);

    return {
      companyCount,
      activeJobs: jobsData.filter(job => activeRecruiterJobStatuses.includes(job.status || '')).length,
      totalApplications,
      hasRecentApplications: totalApplications > 0
    };
  },

  getRecentApplications: async (recruiterId: string, limit: number = 10): Promise<Application[]> => {
    const jobs = await getRecruiterJobs(recruiterId);
    const jobIds = jobs.map(j => j.id);

    if (jobIds.length === 0) {
      return [];
    }

    // Get recent applications
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        ),
        jobs:job_id (
          title
        )
      `)
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching applications:', error);
      throw new Error(`Failed to fetch applications: ${error.message}`);
    }

    return (data || []).map(mapApplicationResponse);
  },

  getApplicationsPage: async (
    recruiterId: string,
    options?: { jobId?: string; limit?: number; offset?: number; search?: string; cursor?: string }
  ): Promise<PaginatedApplicationsResult> => {
    let jobIds: string[] = [];
    const decodedCursor = decodeApplicationCursor(options?.cursor);
    const limit = decodedCursor ? (options?.limit ?? 10) : options?.limit;
    const cursorLimit = decodedCursor ? limit ?? 10 : undefined;
    const offset = options?.offset ?? 0;
    const search = normalizeCandidateSearch(options?.search);
    let searchMatchedJobIds: string[] = [];
    let searchMatchedUserIds: string[] = [];

    if (options?.jobId) {
      jobIds = [options.jobId];
    } else {
      const jobs = await getRecruiterJobs(recruiterId);
      jobIds = jobs.map(j => j.id);
      if (search) {
        const lowerSearch = search.toLowerCase();
        searchMatchedJobIds = jobs
          .filter(job => job.title?.toLowerCase().includes(lowerSearch))
          .map(job => job.id);
      }
    }

    if (jobIds.length === 0) {
      return {
        applications: [],
        total: 0,
        limit,
        offset,
        hasNext: false,
        nextCursor: null
      };
    }

    if (search) {
      searchMatchedUserIds = await getMatchingProfileIds(search);
      if (searchMatchedUserIds.length === 0 && searchMatchedJobIds.length === 0) {
        return {
          applications: [],
          total: 0,
          limit,
          offset,
          hasNext: false,
          nextCursor: null
        };
      }
    }

    const applicationSelect = `
        *,
        profiles:user_id (
          full_name,
          email
        ),
        jobs:job_id (
          title
        )
      `;
    let query = decodedCursor
      ? supabase.from('job_applications').select(applicationSelect)
      : supabase.from('job_applications').select(applicationSelect, { count: 'exact' });

    query = query
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    const searchFilters = search ? [
      ...(searchMatchedUserIds.length > 0 ? [`user_id.in.(${searchMatchedUserIds.join(',')})`] : []),
      ...(searchMatchedJobIds.length > 0 ? [`job_id.in.(${searchMatchedJobIds.join(',')})`] : []),
    ] : [];
    if (search) {
      if (searchFilters.length > 0 && !decodedCursor) {
        query = query.or(searchFilters.join(','));
      }
    }

    if (decodedCursor) {
      query = query
        .or(buildApplicationCursorFilter(decodedCursor, searchFilters))
        .limit(cursorLimit! + 1);
    } else if (limit !== undefined && options?.offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit !== undefined) {
      query = query.limit(limit);
    } else if (options?.offset !== undefined) {
      query = query.range(offset, offset + 9);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      throw new Error(`Failed to fetch applications: ${error.message}`);
    }

    const mappedApplications = (data || []).map(mapApplicationResponse);
    const applications = decodedCursor ? mappedApplications.slice(0, cursorLimit) : mappedApplications;
    const total = decodedCursor ? null : typeof count === 'number' ? count : null;
    const hasNext = decodedCursor
      ? mappedApplications.length > cursorLimit!
      : total !== null
        ? offset + applications.length < total
        : limit !== undefined && applications.length === limit;
    const lastApplication = applications[applications.length - 1];

    return {
      applications,
      total,
      limit,
      offset,
      hasNext,
      nextCursor: hasNext && lastApplication ? encodeApplicationCursor(lastApplication) : null
    };
  },

  getAllApplications: async (recruiterId: string, jobId?: string, search?: string): Promise<Application[]> => {
    const page = await recruiterService.getApplicationsPage(recruiterId, { jobId, search });
    return page.applications;
  },

  getRecruiterJobs: async (recruiterId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        companies:company_id (
          name,
          logo_url
        )
      `)
      .eq('posted_by', recruiterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recruiter jobs:', error);
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    return (data || []).map((job: any) => ({
      ...job,
      company: job.companies
    }));
  },

  getCandidateNotes: async (recruiterId: string, applicationIds: string[]): Promise<Record<string, CandidateNote>> => {
    if (applicationIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from('candidate_notes')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .in('application_id', applicationIds);

    if (error) {
      console.warn('[Recruiter] candidate notes unavailable; using local notes fallback.', error);
      throw new Error(`Failed to fetch candidate notes: ${error.message}`);
    }

    return (data || []).reduce<Record<string, CandidateNote>>((acc, note) => {
      const mapped = mapCandidateNoteResponse(note);
      acc[mapped.applicationId] = mapped;
      return acc;
    }, {});
  },

  saveCandidateNote: async (recruiterId: string, applicationId: string, note: string): Promise<CandidateNote | null> => {
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      const { error } = await supabase
        .from('candidate_notes')
        .delete()
        .eq('recruiter_id', recruiterId)
        .eq('application_id', applicationId);

      if (error) {
        console.warn('[Recruiter] candidate note delete unavailable; using local notes fallback.', error);
        throw new Error(`Failed to delete candidate note: ${error.message}`);
      }

      return null;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('candidate_notes')
      .upsert({
        recruiter_id: recruiterId,
        application_id: applicationId,
        note: trimmedNote,
        updated_at: now
      }, {
        onConflict: 'application_id,recruiter_id'
      })
      .select()
      .single();

    if (error) {
      console.warn('[Recruiter] candidate note save unavailable; using local notes fallback.', error);
      throw new Error(`Failed to save candidate note: ${error.message}`);
    }

    return mapCandidateNoteResponse(data);
  },

  getCandidateScorecards: async (recruiterId: string, applicationIds: string[]): Promise<Record<string, CandidateScorecard>> => {
    if (applicationIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from('candidate_scorecards')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .in('application_id', applicationIds);

    if (error) {
      console.warn('[Recruiter] candidate scorecards unavailable; using local scorecards fallback.', error);
      throw new Error(`Failed to fetch candidate scorecards: ${error.message}`);
    }

    return (data || []).reduce<Record<string, CandidateScorecard>>((acc, scorecard) => {
      const mapped = mapCandidateScorecardResponse(scorecard);
      acc[mapped.applicationId] = mapped;
      return acc;
    }, {});
  },

  saveCandidateScorecard: async (
    recruiterId: string,
    applicationId: string,
    scorecard: { ratings: CandidateScorecardRatings; evidence: string }
  ): Promise<CandidateScorecard> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('candidate_scorecards')
      .upsert({
        recruiter_id: recruiterId,
        application_id: applicationId,
        ratings: normalizeCandidateScorecardRatings(scorecard.ratings),
        evidence: scorecard.evidence.trim(),
        updated_at: now
      }, {
        onConflict: 'application_id,recruiter_id'
      })
      .select()
      .single();

    if (error) {
      console.warn('[Recruiter] candidate scorecard save unavailable; using local scorecards fallback.', error);
      throw new Error(`Failed to save candidate scorecard: ${error.message}`);
    }

    return mapCandidateScorecardResponse(data);
  },

  updateApplicationStatus: async (
    applicationId: string,
    status: string,
    options?: { changedBy?: string; previousStatus?: string; reason?: string }
  ): Promise<Application> => {
    const { data, error } = await supabase
      .from('job_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        ),
        jobs:job_id (
          title
        )
      `)
      .single();

    if (error) {
      console.error('Error updating application status:', error);
      throw new Error(`Failed to update application: ${error.message}`);
    }

    const application = mapApplicationResponse(data);
    await recordApplicationStatusEvent({
      applicationId,
      previousStatus: options?.previousStatus || null,
      status,
      changedBy: options?.changedBy || null,
      reason: options?.reason || 'Recruiter updated application status',
    });

    return application;
  }
};
