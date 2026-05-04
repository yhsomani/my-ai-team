import { supabase } from '../lib/supabaseClient';
import { Job, JobApplication, CreateApplicationRequest } from '../types/job';

export const jobService = {
  getJobs: async (params?: { 
    status?: string; 
    job_type?: string; 
    location?: string; 
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Job[]> => {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        companies (
          id,
          name,
          logo_url,
          location,
          industry
        )
      `)
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

    query = query.order('posted_at', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Transform to match frontend Job interface
    return data.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      companyId: job.company_id,
      companyName: job.companies?.name,
      companyLogoUrl: job.companies?.logo_url,
      location: job.location,
      jobType: job.job_type,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      requirements: job.requirements || [],
      postedAt: job.posted_at,
      status: job.status
    }));
  },

  getJobById: async (id: string): Promise<Job> => {
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
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      companyId: data.company_id,
      companyName: data.companies?.name,
      companyLogoUrl: data.companies?.logo_url,
      location: data.location,
      jobType: data.job_type,
      salaryMin: data.salary_min,
      salaryMax: data.salary_max,
      requirements: data.requirements || [],
      postedAt: data.posted_at,
      status: data.status
    };
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
    const matchedJobs = (data || []).filter((job: any) => 
      job.requirements?.some((req: string) => 
        skillNames.some(skill => 
          req.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );

    return matchedJobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      companyId: job.company_id,
      companyName: job.companies?.name,
      companyLogoUrl: job.companies?.logo_url,
      location: job.location,
      jobType: job.job_type,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      requirements: job.requirements || [],
      postedAt: job.posted_at,
      status: job.status
    }));
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
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      companyId: data.company_id,
      location: data.location,
      jobType: data.job_type,
      salaryMin: data.salary_min,
      salaryMax: data.salary_max,
      requirements: data.requirements || [],
      postedAt: data.posted_at,
      status: data.status
    };
  },

  updateJob: async (id: string, jobData: Partial<Job>): Promise<Job> => {
    const updateData: any = {};
    if (jobData.title) updateData.title = jobData.title;
    if (jobData.description) updateData.description = jobData.description;
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
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      companyId: data.company_id,
      location: data.location,
      jobType: data.job_type,
      salaryMin: data.salary_min,
      salaryMax: data.salary_max,
      requirements: data.requirements || [],
      postedAt: data.posted_at,
      status: data.status
    };
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
  applyToJob: async (application: CreateApplicationRequest, userId: string): Promise<JobApplication> => {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: application.jobId,
        user_id: userId,
        resume_url: application.resumeUrl,
        cover_letter: application.coverLetter,
        status: 'PENDING'
      })
      .select(`
        *,
        jobs (
          id,
          title,
          companies (name, logo_url)
        )
      `)
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
