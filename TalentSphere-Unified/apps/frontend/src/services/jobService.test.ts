import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobService } from './jobService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('jobService', () => {
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej)),
    };

    // @ts-expect-error mock
    supabase.from.mockReturnValue(mockQueryBuilder);
  });

  describe('getJobs', () => {
    it('should build a basic query with PUBLISHED status when no params are provided', async () => {
      await jobService.getJobs();
      expect(supabase.from).toHaveBeenCalledWith('jobs');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('posted_at', { ascending: false });
    });

    it('should override status if provided', async () => {
      await jobService.getJobs({ status: 'DRAFT' });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'DRAFT');
    });

    it('should append job_type filter if provided', async () => {
      await jobService.getJobs({ job_type: 'FULL_TIME' });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('job_type', 'FULL_TIME');
    });

    it('should append location filter using ilike if provided', async () => {
      await jobService.getJobs({ location: 'New York' });
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('location', '%New York%');
    });

    it('should append search filter using or if provided', async () => {
      await jobService.getJobs({ search: 'developer' });
      expect(mockQueryBuilder.or).toHaveBeenCalledWith('title.ilike.%developer%,description.ilike.%developer%');
    });

    it('should apply limit if provided', async () => {
      await jobService.getJobs({ limit: 5 });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should apply range if offset is provided', async () => {
      await jobService.getJobs({ offset: 10 });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it('should throw an error if the query fails', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: null, error: new Error('DB Error') }).then(res, rej));
      await expect(jobService.getJobs()).rejects.toThrow('DB Error');
    });
  });

  describe('mapJobResponse indirectly via getJobById', () => {
    it('should map db response to Job interface correctly', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: {
          id: 'job-1',
          title: 'Software Engineer',
          companies: { name: 'Tech Corp', logo_url: 'logo.png' },
          status: 'PUBLISHED'
        },
        error: null
      }).then(res, rej));

      const job = await jobService.getJobById('job-1');
      expect(job.id).toBe('job-1');
      expect(job.title).toBe('Software Engineer');
      expect(job.companyName).toBe('Tech Corp');
    });
  });

  describe('getRecommendedJobs', () => {
    it('should return recommended jobs based on user skills', async () => {
      // Create specific builders for this test
      const mockProfileQuery = { ...mockQueryBuilder, single: vi.fn().mockResolvedValue({ data: { id: 'u1', skills: [{ name: 'React' }] }, error: null }) };
      const mockJobsQuery = { ...mockQueryBuilder, limit: vi.fn().mockResolvedValue({ data: [{ id: 'job-1', requirements: ['React'] }], error: null }) };

      // @ts-expect-error mock
      supabase.from.mockImplementation((table) => {
        if (table === 'user_profiles') return mockProfileQuery;
        if (table === 'jobs') return mockJobsQuery;
      });

      const jobs = await jobService.getRecommendedJobs('user-1');
      expect(jobs.length).toBe(1);
      expect(jobs[0].id).toBe('job-1');
    });
  });

  describe('mutations', () => {
    it('should post a job successfully', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: { id: 'job-new', title: 'Backend' }, error: null }).then(res, rej));
      const result = await jobService.postJob({ title: 'Backend' }, 'user-1');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(result.id).toBe('job-new');
    });

    it('should update a job successfully', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: { id: 'job-1', title: 'Updated' }, error: null }).then(res, rej));
      const result = await jobService.updateJob('job-1', { title: 'Updated' });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(result.id).toBe('job-1');
    });

    it('should delete a job successfully', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ error: null }).then(res, rej));
      await jobService.deleteJob('job-1');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });

  describe('applications', () => {
    it('should apply to job', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: { id: 'app-1', job_id: 'job-1' }, error: null }).then(res, rej));
      const result = await jobService.applyToJob({ jobId: 'job-1' } as any, 'user-1');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(result.id).toBe('app-1');
    });

    it('should get user applications', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: [{ id: 'app-1' }], error: null }).then(res, rej));
      const result = await jobService.getUserApplications('user-1');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });
  });
});
