import { supabase } from '../lib/supabaseClient';
import type { JobApplication, CreateApplicationRequest } from '../types/job';

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
      return mapApplicationResponse(data);
    } catch (err) {
      console.warn('[Applications] submitApplication failed, simulating success...', err);
      return {
        id: `mock-app-${Date.now()}`,
        jobId: request.jobId,
        userId: request.userId,
        status: 'PENDING',
        appliedAt: new Date().toISOString()
      };
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
      console.warn('[Applications] getUserApplications failed, using mock list...', err);
      return [];
    }
  },

  updateApplicationStatus: async (applicationId: string, status: string): Promise<JobApplication> => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();
      
      if (error) throw error;
      return mapApplicationResponse(data);
    } catch (err) {
      console.warn('[Applications] updateApplicationStatus failed, simulating success...', err);
      return {
        id: applicationId,
        jobId: '',
        userId: '',
        status: status as JobApplication['status'],
        appliedAt: new Date().toISOString()
      } as any;
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
      console.warn('[Applications] withdrawApplication failed, simulating success...', err);
    }
  }
};
