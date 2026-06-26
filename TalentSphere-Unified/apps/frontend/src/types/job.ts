export interface Job {
  id: string;
  title: string;
  description: string;
  companyId: string;
  companyName?: string;
  companyLogoUrl?: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryRange?: string;
  requirements: string[];
  postedAt: string;
  status: string;
  matchScore?: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  status: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  appliedAt: string;
  resumeUrl?: string;
  coverLetter?: string;
  job?: Job;
}

export interface ApplicationStatusEvent {
  id: string;
  applicationId: string;
  previousStatus?: JobApplication['status'] | string | null;
  status: JobApplication['status'] | string;
  changedBy?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface CreateApplicationRequest {
  jobId: string;
  userId?: string;
  resumeUrl?: string;
  coverLetter?: string;
}
