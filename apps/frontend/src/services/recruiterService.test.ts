import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recruiterService } from './recruiterService';
import { typedSupabase } from '../lib/supabaseClient';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: mockSupabaseClient,
    typedSupabase: mockSupabaseClient,
  };
});

describe('recruiterService', () => {
  let jobsQueryBuilder: any;
  let applicationsQueryBuilder: any;
  let profilesQueryBuilder: any;
  let scorecardsQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    jobsQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'job-1', status: 'PUBLISHED', title: 'Frontend Engineer' },
          { id: 'job-2', status: 'DRAFT', title: 'Product Designer' },
        ],
        error: null,
      }),
    };

    applicationsQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((resolve, reject) => Promise.resolve({
        data: [
          {
            id: 'app-1',
            user_id: 'user-1',
            job_id: 'job-1',
            status: 'PENDING',
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-02T00:00:00.000Z',
            profiles: {
              full_name: 'Ava Candidate',
              email: 'ava@example.test',
            },
            jobs: {
              title: 'Frontend Engineer',
            },
            resume_url: 'https://example.test/resume.pdf',
            cover_letter: 'Hello',
          },
        ],
        error: null,
        count: 12,
      }).then(resolve, reject)),
    };

    profilesQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1' }],
        error: null,
      }),
    };

    scorecardsQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{
          application_id: 'app-1',
          recruiter_id: 'recruiter-1',
          ratings: {
            role_fit: 5,
            technical_depth: 4.6,
            communication: 0,
            execution: 'bad',
          },
          evidence: 'Strong portfolio',
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-02T00:00:00.000Z',
        }],
        error: null,
      }),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          application_id: 'app-1',
          recruiter_id: 'recruiter-1',
          ratings: {
            role_fit: 5,
            technical_depth: 4,
            communication: 3,
            execution: 2,
          },
          evidence: 'Evidence',
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-03T00:00:00.000Z',
        },
        error: null,
      }),
    };

    (typedSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'jobs') return jobsQueryBuilder;
      if (table === 'job_applications') return applicationsQueryBuilder;
      if (table === 'profiles') return profilesQueryBuilder;
      if (table === 'candidate_scorecards') return scorecardsQueryBuilder;
      return {};
    });
  });

  it('returns paginated application metadata for a recruiter', async () => {
    const result = await recruiterService.getApplicationsPage('recruiter-1', {
      limit: 10,
      offset: 10,
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('jobs');
    expect(jobsQueryBuilder.eq).toHaveBeenCalledWith('posted_by', 'recruiter-1');
    expect(typedSupabase.from).toHaveBeenCalledWith('job_applications');
    expect(applicationsQueryBuilder.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(applicationsQueryBuilder.in).toHaveBeenCalledWith('job_id', ['job-1', 'job-2']);
    expect(applicationsQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(applicationsQueryBuilder.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(applicationsQueryBuilder.range).toHaveBeenCalledWith(10, 19);
    expect(result.total).toBe(12);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.applications).toEqual([
      {
        id: 'app-1',
        userId: 'user-1',
        jobId: 'job-1',
        status: 'PENDING',
        appliedAt: '2026-06-01T00:00:00.000Z',
        user: {
          fullName: 'Ava Candidate',
          email: 'ava@example.test',
        },
        job: {
          title: 'Frontend Engineer',
        },
        resumeUrl: 'https://example.test/resume.pdf',
        coverLetter: 'Hello',
        updatedAt: '2026-06-02T00:00:00.000Z',
      },
    ]);
  });

  it('uses cursor lookahead for stable candidate pagination', async () => {
    applicationsQueryBuilder.then = vi.fn()
      .mockImplementationOnce((resolve, reject) => Promise.resolve({
        data: [
          {
            id: 'app-1',
            user_id: 'user-1',
            job_id: 'job-1',
            status: 'PENDING',
            created_at: '2026-06-01T00:00:00.000Z',
            profiles: {
              full_name: 'Ava Candidate',
              email: 'ava@example.test',
            },
            jobs: {
              title: 'Frontend Engineer',
            },
          },
        ],
        error: null,
        count: 3,
      }).then(resolve, reject))
      .mockImplementationOnce((resolve, reject) => Promise.resolve({
        data: [
          {
            id: 'app-0',
            user_id: 'user-2',
            job_id: 'job-2',
            status: 'REVIEWED',
            created_at: '2026-05-31T00:00:00.000Z',
            profiles: {
              full_name: 'Ben Candidate',
              email: 'ben@example.test',
            },
            jobs: {
              title: 'Product Designer',
            },
          },
          {
            id: 'app-overflow',
            user_id: 'user-3',
            job_id: 'job-1',
            status: 'PENDING',
            created_at: '2026-05-30T00:00:00.000Z',
            profiles: {
              full_name: 'Cam Candidate',
              email: 'cam@example.test',
            },
            jobs: {
              title: 'Frontend Engineer',
            },
          },
        ],
        error: null,
      }).then(resolve, reject));

    const firstPage = await recruiterService.getApplicationsPage('recruiter-1', {
      limit: 1,
      offset: 0,
    });
    const result = await recruiterService.getApplicationsPage('recruiter-1', {
      limit: 1,
      offset: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(applicationsQueryBuilder.select).toHaveBeenLastCalledWith(expect.any(String));
    expect(applicationsQueryBuilder.or).toHaveBeenCalledWith('created_at.lt.2026-06-01T00:00:00.000Z,and(created_at.eq.2026-06-01T00:00:00.000Z,id.lt.app-1)');
    expect(applicationsQueryBuilder.limit).toHaveBeenCalledWith(2);
    expect(applicationsQueryBuilder.range).toHaveBeenCalledTimes(1);
    expect(result.total).toBeNull();
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0].id).toBe('app-0');
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('combines candidate search filters with cursor pagination', async () => {
    applicationsQueryBuilder.then = vi.fn()
      .mockImplementationOnce((resolve, reject) => Promise.resolve({
        data: [
          {
            id: 'app-1',
            user_id: 'user-1',
            job_id: 'job-1',
            status: 'PENDING',
            created_at: '2026-06-01T00:00:00.000Z',
            profiles: {
              full_name: 'Ava Candidate',
              email: 'ava@example.test',
            },
            jobs: {
              title: 'Frontend Engineer',
            },
          },
        ],
        error: null,
        count: 3,
      }).then(resolve, reject))
      .mockImplementationOnce((resolve, reject) => Promise.resolve({
        data: [
          {
            id: 'app-0',
            user_id: 'user-1',
            job_id: 'job-2',
            status: 'REVIEWED',
            created_at: '2026-05-31T00:00:00.000Z',
            profiles: {
              full_name: 'Ava Candidate',
              email: 'ava@example.test',
            },
            jobs: {
              title: 'Product Designer',
            },
          },
          {
            id: 'app-overflow',
            user_id: 'user-1',
            job_id: 'job-1',
            status: 'PENDING',
            created_at: '2026-05-30T00:00:00.000Z',
            profiles: {
              full_name: 'Ava Candidate',
              email: 'ava@example.test',
            },
            jobs: {
              title: 'Frontend Engineer',
            },
          },
        ],
        error: null,
      }).then(resolve, reject));

    const firstPage = await recruiterService.getApplicationsPage('recruiter-1', {
      search: 'Ava',
      limit: 1,
      offset: 0,
    });
    const result = await recruiterService.getApplicationsPage('recruiter-1', {
      search: 'Ava',
      limit: 1,
      offset: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(applicationsQueryBuilder.or).toHaveBeenNthCalledWith(1, 'user_id.in.(user-1)');
    expect(applicationsQueryBuilder.or).toHaveBeenNthCalledWith(
      2,
      'and(created_at.lt.2026-06-01T00:00:00.000Z,or(user_id.in.(user-1))),and(created_at.eq.2026-06-01T00:00:00.000Z,id.lt.app-1,or(user_id.in.(user-1)))'
    );
    expect(result.total).toBeNull();
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0].id).toBe('app-0');
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('preserves array return shape for getAllApplications', async () => {
    const result = await recruiterService.getAllApplications('recruiter-1');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('app-1');
  });

  it('applies candidate search filters before paginating applications', async () => {
    const result = await recruiterService.getApplicationsPage('recruiter-1', {
      search: 'Ava',
      limit: 10,
      offset: 0,
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('profiles');
    expect(profilesQueryBuilder.or).toHaveBeenCalledWith('full_name.ilike.%Ava%,email.ilike.%Ava%');
    expect(profilesQueryBuilder.limit).toHaveBeenCalledWith(100);
    expect(applicationsQueryBuilder.in).toHaveBeenCalledWith('job_id', ['job-1', 'job-2']);
    expect(applicationsQueryBuilder.or).toHaveBeenCalledWith('user_id.in.(user-1)');
    expect(applicationsQueryBuilder.range).toHaveBeenCalledWith(0, 9);
    expect(result.total).toBe(12);
    expect(result.hasNext).toBe(true);
  });

  it('loads candidate scorecards with normalized rubric ratings', async () => {
    const result = await recruiterService.getCandidateScorecards('recruiter-1', ['app-1']);

    expect(typedSupabase.from).toHaveBeenCalledWith('candidate_scorecards');
    expect(scorecardsQueryBuilder.select).toHaveBeenCalledWith('*');
    expect(scorecardsQueryBuilder.eq).toHaveBeenCalledWith('recruiter_id', 'recruiter-1');
    expect(scorecardsQueryBuilder.in).toHaveBeenCalledWith('application_id', ['app-1']);
    expect(result['app-1']).toMatchObject({
      applicationId: 'app-1',
      recruiterId: 'recruiter-1',
      ratings: {
        role_fit: 5,
        technical_depth: 5,
        communication: 1,
        execution: 3,
      },
      evidence: 'Strong portfolio',
      source: 'server',
    });
  });

  it('saves candidate scorecards through an upsert without changing application status', async () => {
    const result = await recruiterService.saveCandidateScorecard('recruiter-1', 'app-1', {
      ratings: {
        role_fit: 5,
        technical_depth: 4,
        communication: 3,
        execution: 2,
      },
      evidence: ' Evidence ',
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('candidate_scorecards');
    expect(scorecardsQueryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      recruiter_id: 'recruiter-1',
      application_id: 'app-1',
      ratings: {
        role_fit: 5,
        technical_depth: 4,
        communication: 3,
        execution: 2,
      },
      evidence: 'Evidence',
      updated_at: expect.any(String),
    }), {
      onConflict: 'application_id,recruiter_id',
    });
    expect(scorecardsQueryBuilder.select).toHaveBeenCalled();
    expect(scorecardsQueryBuilder.single).toHaveBeenCalled();
    expect(result).toMatchObject({
      applicationId: 'app-1',
      ratings: {
        role_fit: 5,
        technical_depth: 4,
        communication: 3,
        execution: 2,
      },
      evidence: 'Evidence',
      source: 'server',
    });
  });
});
