import { supabase } from '../lib/supabaseClient';

export interface RecruiterStats {
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  hiredCount: number;
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

const activeRecruiterJobStatuses = ['DRAFT', 'PUBLISHED'];
const offerStatuses = ['OFFER'];

const mapApplicationResponse = (app: any): Application => ({
  id: app.id,
  userId: app.user_id,
  jobId: app.job_id,
  status: app.status,
  appliedAt: app.created_at,
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

const getRecruiterJobs = async (recruiterId: string): Promise<Array<{ id: string; status?: string }>> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status')
    .eq('posted_by', recruiterId);

  if (error) {
    console.error('Error fetching recruiter jobs:', error);
    throw new Error(`Failed to fetch recruiter jobs: ${error.message}`);
  }

  return data || [];
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

  getAllApplications: async (recruiterId: string, jobId?: string): Promise<Application[]> => {
    let jobIds: string[] = [];

    if (jobId) {
      jobIds = [jobId];
    } else {
      const jobs = await getRecruiterJobs(recruiterId);
      jobIds = jobs.map(j => j.id);
    }

    if (jobIds.length === 0) {
      return [];
    }

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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      throw new Error(`Failed to fetch applications: ${error.message}`);
    }

    return (data || []).map(mapApplicationResponse);
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

  updateApplicationStatus: async (applicationId: string, status: string): Promise<Application> => {
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

    return mapApplicationResponse(data);
  }
};
