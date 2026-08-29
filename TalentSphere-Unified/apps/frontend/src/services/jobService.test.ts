import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getJobPublishPolicyErrorMessage, jobService } from './jobService';
import { typedSupabase } from '../lib/supabaseClient';
import { apiClient } from '../api/axios';

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('jobService', () => {
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej)),
    };

    // @ts-expect-error mock
    typedSupabase.from.mockReturnValue(mockQueryBuilder);
  });

  describe('getJobPublishPolicyErrorMessage', () => {
    it('returns a user-facing publish policy message for the database readiness constraint', () => {
      expect(getJobPublishPolicyErrorMessage({
        code: '23514',
        constraint: 'job_publish_readiness',
        message: 'Cannot publish job without a location',
      })).toBe('This posting is missing required publish details. Open the draft, finish the checklist, and publish again.');
    });

    it('returns a user-facing publish policy message for Supabase publish readiness errors without constraint metadata', () => {
      expect(getJobPublishPolicyErrorMessage(new Error('Cannot publish job without at least one requirement'))).toBe('This posting is missing required publish details. Open the draft, finish the checklist, and publish again.');
    });

    it('ignores unrelated job update failures', () => {
      expect(getJobPublishPolicyErrorMessage(new Error('Network unavailable'))).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should build a basic query with PUBLISHED status when no params are provided', async () => {
      await jobService.getJobs();
      expect(typedSupabase.from).toHaveBeenCalledWith('jobs');
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

    it('should append salary range filters if provided', async () => {
      await jobService.getJobs({ salary_min: 100000, salary_max: 160000 });
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('salary_max', 100000);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('salary_min', 160000);
    });

    it('should apply limit if provided', async () => {
      await jobService.getJobs({ limit: 5 });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should apply range if offset is provided', async () => {
      await jobService.getJobs({ offset: 10 });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it('should return paginated metadata when requested', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: [
          { id: 'job-1', title: 'Engineer', job_type: 'FULL_TIME', requirements: [], status: 'PUBLISHED' },
          { id: 'job-2', title: 'Designer', job_type: 'CONTRACT', requirements: [], status: 'PUBLISHED' },
        ],
        error: null,
        count: 8,
      }).then(res, rej));

      const result = await jobService.getJobsPage({ limit: 2, offset: 2 });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('id', { ascending: false });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(2, 3);
      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(8);
      expect(result.offset).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('should use cursor lookahead for stable job pagination', async () => {
      mockQueryBuilder.then = vi.fn()
        .mockImplementationOnce((res, rej) => Promise.resolve({
          data: [
            {
              id: 'job-1',
              title: 'Engineer',
              job_type: 'FULL_TIME',
              requirements: [],
              status: 'PUBLISHED',
              posted_at: '2026-06-01T10:00:00.000Z',
            },
          ],
          error: null,
          count: 3,
        }).then(res, rej))
        .mockImplementationOnce((res, rej) => Promise.resolve({
          data: [
            {
              id: 'job-0',
              title: 'Older Engineer',
              job_type: 'FULL_TIME',
              requirements: [],
              status: 'PUBLISHED',
              posted_at: '2026-05-31T10:00:00.000Z',
            },
            {
              id: 'job-overflow',
              title: 'Overflow Engineer',
              job_type: 'FULL_TIME',
              requirements: [],
              status: 'PUBLISHED',
              posted_at: '2026-05-30T10:00:00.000Z',
            },
          ],
          error: null,
        }).then(res, rej));

      const firstPage = await jobService.getJobsPage({ limit: 1, offset: 0 });
      const result = await jobService.getJobsPage({
        limit: 1,
        offset: 1,
        cursor: firstPage.nextCursor || undefined,
      });

      expect(mockQueryBuilder.select).toHaveBeenLastCalledWith(expect.any(String));
      expect(mockQueryBuilder.or).toHaveBeenCalledWith('posted_at.lt.2026-06-01T10:00:00.000Z,and(posted_at.eq.2026-06-01T10:00:00.000Z,id.lt.job-1)');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(2);
      expect(result.total).toBeNull();
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].id).toBe('job-0');
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('should preserve array return shape for getJobs', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: [
          { id: 'job-1', title: 'Engineer', job_type: 'FULL_TIME', requirements: [], status: 'PUBLISHED' },
        ],
        error: null,
        count: 1,
      }).then(res, rej));

      const result = await jobService.getJobs({ limit: 1 });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('job-1');
    });

    it('should throw an error if the query fails', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: null, error: new Error('DB Error') }).then(res, rej));
      // @ts-expect-error mock
      apiClient.get.mockRejectedValueOnce(new Error('DB Error'));
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
      typedSupabase.from.mockImplementation((table) => {
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
      const result = await jobService.postJob({
        title: 'Backend',
        description: 'Build APIs',
        companyId: 'company-1',
        location: 'Remote',
      }, 'user-1');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Backend',
        description: 'Build APIs',
        company_id: 'company-1',
        location: 'Remote',
      }));
      expect(result.id).toBe('job-new');
    });

    it('rejects posting a job without schema-required fields', async () => {
      await expect(jobService.postJob({ title: 'Backend' }, 'user-1')).rejects.toThrow('Job description is required');
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should update a job successfully', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: { id: 'job-1', title: 'Updated' }, error: null }).then(res, rej));
      const result = await jobService.updateJob('job-1', { title: 'Updated', companyId: 'company-1' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated',
        company_id: 'company-1',
      }));
      expect(result.id).toBe('job-1');
    });

    it('rejects clearing a schema-required company from a job', async () => {
      await expect(jobService.updateJob('job-1', { companyId: null })).rejects.toThrow('Company cannot be cleared');
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should delete a job successfully', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ error: null }).then(res, rej));
      await jobService.deleteJob('job-1');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });

  describe('job post draft history', () => {
    it('loads recruiter draft history for a draft key', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: [
          {
            id: 'history-1',
            recruiter_id: 'recruiter-1',
            draft_key: 'draft-1',
            job_id: 'job-1',
            title: 'Frontend Engineer',
            description: 'Build UI',
            location: 'Remote',
            salary_min: '100000',
            salary_max: '140000',
            requirements: '- React',
            job_type: 'FULL_TIME',
            company_attached: true,
            company_id: 'company-1',
            company_name: 'Acme',
            reason: 'saved',
            created_at: '2026-06-26T10:00:00.000Z',
            updated_at: '2026-06-26T10:00:00.000Z',
          },
        ],
        error: null,
      }).then(res, rej));

      const result = await jobService.getJobPostDraftHistory('recruiter-1', 'draft-1', 3);

      expect(typedSupabase.from).toHaveBeenCalledWith('job_post_draft_versions');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('recruiter_id', 'recruiter-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('draft_key', 'draft-1');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3);
      expect(result[0]).toMatchObject({
        id: 'history-1',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        companyAttached: true,
        persistedTo: 'server',
      });
    });

    it('upserts recruiter draft history entries', async () => {
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: {
          id: 'history-1',
          recruiter_id: 'recruiter-1',
          draft_key: 'draft-1',
          job_id: 'job-1',
          title: 'Frontend Engineer',
          description: 'Build UI',
          location: 'Remote',
          salary_min: '100000',
          salary_max: '140000',
          requirements: '- React',
          job_type: 'FULL_TIME',
          company_attached: false,
          reason: 'reviewed',
          created_at: '2026-06-26T10:00:00.000Z',
          updated_at: '2026-06-26T10:00:00.000Z',
        },
        error: null,
      });

      const result = await jobService.saveJobPostDraftHistoryEntry({
        id: 'history-1',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        jobId: 'job-1',
        title: 'Frontend Engineer',
        description: 'Build UI',
        location: 'Remote',
        salaryMin: '100000',
        salaryMax: '140000',
        requirements: '- React',
        jobType: 'FULL_TIME',
        salaryRange: '',
        category: '',
        companyId: null,
        companyName: '',
        companyAttached: false,
        reason: 'reviewed',
        persistedTo: 'local',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      });

      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'history-1',
        recruiter_id: 'recruiter-1',
        draft_key: 'draft-1',
        job_id: 'job-1',
        title: 'Frontend Engineer',
        company_attached: false,
        reason: 'reviewed',
      }), { onConflict: 'id' });
      expect(result).toMatchObject({
        id: 'history-1',
        persistedTo: 'server',
      });
    });
  });

  describe('hidden Explore jobs', () => {
    it('loads account hidden Explore preferences', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: [
          {
            job_id: 'job-1',
            title: 'Frontend Engineer',
            company_name: 'Acme Labs',
            job_type: 'FULL_TIME',
            location: 'Remote',
            hidden_at: '2026-06-26T10:00:00.000Z',
          },
        ],
        error: null,
      }).then(res, rej));

      const result = await jobService.getHiddenExploreJobs('user-1', 25);

      expect(typedSupabase.from).toHaveBeenCalledWith('hidden_explore_jobs');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('hidden_at', { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
      expect(result).toEqual([
        {
          jobId: 'job-1',
          title: 'Frontend Engineer',
          companyName: 'Acme Labs',
          jobType: 'FULL_TIME',
          location: 'Remote',
          hiddenAt: '2026-06-26T10:00:00.000Z',
        },
      ]);
    });

    it('upserts a hidden Explore preference for an account', async () => {
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: {
          job_id: 'job-1',
          title: 'Frontend Engineer',
          company_name: 'Acme Labs',
          job_type: 'FULL_TIME',
          location: 'Remote',
          hidden_at: '2026-06-26T10:00:00.000Z',
        },
        error: null,
      });

      const result = await jobService.saveHiddenExploreJob('user-1', {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        companyName: 'Acme Labs',
        jobType: 'FULL_TIME',
        location: 'Remote',
        hiddenAt: '2026-06-26T10:00:00.000Z',
      });

      expect(typedSupabase.from).toHaveBeenCalledWith('hidden_explore_jobs');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'user-1:job-1',
        user_id: 'user-1',
        job_id: 'job-1',
        title: 'Frontend Engineer',
        company_name: 'Acme Labs',
        job_type: 'FULL_TIME',
        location: 'Remote',
        hidden_at: '2026-06-26T10:00:00.000Z',
      }), { onConflict: 'user_id,job_id' });
      expect(result).toMatchObject({
        jobId: 'job-1',
        title: 'Frontend Engineer',
      });
    });

    it('deletes one hidden Explore preference for an account', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        error: null,
      }).then(res, rej));

      await jobService.deleteHiddenExploreJob('user-1', 'job-1');

      expect(typedSupabase.from).toHaveBeenCalledWith('hidden_explore_jobs');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('job_id', 'job-1');
    });

    it('clears account hidden Explore preferences', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        error: null,
      }).then(res, rej));

      await jobService.clearHiddenExploreJobs('user-1');

      expect(typedSupabase.from).toHaveBeenCalledWith('hidden_explore_jobs');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  describe('job post templates', () => {
    it('loads recruiter job-post templates', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: [
          {
            id: 'template-1',
            recruiter_id: 'recruiter-1',
            name: 'Frontend Engineer - Remote',
            title: 'Frontend Engineer',
            description: 'Build UI',
            location: 'Remote',
            salary_min: '100000',
            salary_max: '140000',
            requirements: '- React',
            job_type: 'FULL_TIME',
            created_at: '2026-06-26T10:00:00.000Z',
            updated_at: '2026-06-26T10:00:00.000Z',
          },
        ],
        error: null,
      }).then(res, rej));

      const result = await jobService.getJobPostTemplates('recruiter-1', 4);

      expect(typedSupabase.from).toHaveBeenCalledWith('job_post_templates');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('recruiter_id', 'recruiter-1');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(4);
      expect(result[0]).toMatchObject({
        id: 'template-1',
        recruiterId: 'recruiter-1',
        persistedTo: 'server',
      });
    });

    it('upserts recruiter job-post templates', async () => {
      mockQueryBuilder.single = vi.fn().mockResolvedValue({
        data: {
          id: 'template-1',
          recruiter_id: 'recruiter-1',
          name: 'Frontend Engineer - Remote',
          title: 'Frontend Engineer',
          description: 'Build UI',
          location: 'Remote',
          salary_min: '100000',
          salary_max: '140000',
          requirements: '- React',
          job_type: 'FULL_TIME',
          created_at: '2026-06-26T10:00:00.000Z',
          updated_at: '2026-06-26T10:00:00.000Z',
        },
        error: null,
      });

      const result = await jobService.saveJobPostTemplate('recruiter-1', {
        id: 'template-1',
        recruiterId: 'recruiter-1',
        name: 'Frontend Engineer - Remote',
        title: 'Frontend Engineer',
        description: 'Build UI',
        location: 'Remote',
        salaryMin: '100000',
        salaryMax: '140000',
        requirements: '- React',
        jobType: 'FULL_TIME',
        salaryRange: '',
        category: '',
        persistedTo: 'local',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      });

      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'template-1',
        recruiter_id: 'recruiter-1',
        name: 'Frontend Engineer - Remote',
        title: 'Frontend Engineer',
        requirements: '- React',
      }), { onConflict: 'id' });
      expect(result).toMatchObject({
        id: 'template-1',
        persistedTo: 'server',
      });
    });

    it('deletes recruiter job-post templates', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        error: null,
      }).then(res, rej));

      await jobService.deleteJobPostTemplate('recruiter-1', 'template-1');

      expect(typedSupabase.from).toHaveBeenCalledWith('job_post_templates');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('recruiter_id', 'recruiter-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'template-1');
    });
  });

  describe('applications', () => {
    it('should apply to job', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: { id: 'app-1', job_id: 'job-1' }, error: null }).then(res, rej));
      const result = await jobService.applyToJob({ jobId: 'job-1' } as any, 'user-1');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(result.id).toBe('app-1');
    });

    it('should not fabricate an application when applying fails', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({
        data: null,
        error: new Error('database unavailable'),
      }).then(res, rej));

      await expect(jobService.applyToJob({ jobId: 'job-1' } as any, 'user-1')).rejects.toThrow('Application could not be submitted');

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        job_id: 'job-1',
        user_id: 'user-1',
        status: 'PENDING',
        resume_url: null,
        cover_letter: null,
        applied_at: expect.any(String),
      });
    });

    it('should get user applications', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((res, rej) => Promise.resolve({ data: [{ id: 'app-1' }], error: null }).then(res, rej));
      const result = await jobService.getUserApplications('user-1');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });
  });
});
