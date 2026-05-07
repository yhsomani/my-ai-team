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
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED' | string;
  appliedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  job?: {
    title: string;
  };
  resumeUrl?: string;
}

export const recruiterService = {
  getStats: async (recruiterId: string): Promise<RecruiterStats> => {
    // Get active jobs count
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('recruiter_id', recruiterId)
      .eq('status', 'ACTIVE');

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw new Error(`Failed to fetch stats: ${jobsError.message}`);
    }

    // Get total applications for recruiter's jobs
    const { data: appsData, error: appsError } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .in(
        'job_id',
        (jobsData || []).map(j => j.id)
      );

    if (appsError) {
      console.error('Error fetching applications:', appsError);
      throw new Error(`Failed to fetch stats: ${appsError.message}`);
    }

    // Get new applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: newAppsData, error: newAppsError } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .in(
        'job_id',
        (jobsData || []).map(j => j.id)
      )
      .gte('created_at', sevenDaysAgo.toISOString());

    if (newAppsError) {
      console.error('Error fetching new applications:', newAppsError);
      throw new Error(`Failed to fetch stats: ${newAppsError.message}`);
    }

    // Get hired count
    const { data: hiredData, error: hiredError } = await supabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .in(
        'job_id',
        (jobsData || []).map(j => j.id)
      )
      .eq('status', 'HIRED');

    if (hiredError) {
      console.error('Error fetching hired count:', hiredError);
      throw new Error(`Failed to fetch stats: ${hiredError.message}`);
    }

    return {
      activeJobs: jobsData?.length || 0,
      totalApplications: appsData?.length || 0,
      newApplications: newAppsData?.length || 0,
      hiredCount: hiredData?.length || 0
    };
  },

  getRecentApplications: async (recruiterId: string, limit: number = 10): Promise<Application[]> => {
    // First get recruiter's jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('recruiter_id', recruiterId);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      throw new Error(`Failed to fetch applications: ${jobsError.message}`);
    }

    const jobIds = (jobs || []).map(j => j.id);

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

    return (data || []).map((app: any) => ({
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
      resumeUrl: app.resume_url
    }));
  },

  getAllApplications: async (recruiterId: string, jobId?: string): Promise<Application[]> => {
    let jobIds: string[] = [];

    if (jobId) {
      jobIds = [jobId];
    } else {
      // Get all recruiter's jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('recruiter_id', recruiterId);

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        throw new Error(`Failed to fetch applications: ${jobsError.message}`);
      }

      jobIds = (jobs || []).map(j => j.id);
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

    return (data || []).map((app: any) => ({
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
      resumeUrl: app.resume_url
    }));
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
      .eq('recruiter_id', recruiterId)
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

    return {
      id: data.id,
      userId: data.user_id,
      jobId: data.job_id,
      status: data.status,
      appliedAt: data.created_at,
      user: {
        fullName: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || ''
      },
      job: {
        title: data.jobs?.title || 'Unknown'
      },
      resumeUrl: data.resume_url
    };
  }
};
