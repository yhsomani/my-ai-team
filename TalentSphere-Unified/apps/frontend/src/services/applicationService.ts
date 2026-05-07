import { supabase } from '../lib/supabaseClient';
import type { JobApplication, CreateApplicationRequest } from '../types/job';

export const applicationService = {
  submitApplication: async (request: CreateApplicationRequest & { userId: string }): Promise<JobApplication> => {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        user_id: request.userId,
        job_id: request.jobId,
        cover_letter: request.coverLetter,
        status: 'PENDING'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as JobApplication;
  },

  getUserApplications: async (userId: string): Promise<JobApplication[]> => {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        jobs (
          id,
          title,
          company_id,
          companies (name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as unknown as JobApplication[];
  },

  updateApplicationStatus: async (applicationId: string, status: string): Promise<JobApplication> => {
    const { data, error } = await supabase
      .from('job_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as JobApplication;
  },

  withdrawApplication: async (applicationId: string): Promise<void> => {
    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', applicationId);
    
    if (error) throw error;
  }
};
