import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileService } from './profileService';
import { supabase } from '../lib/supabaseClient';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

// Mock the supabase client
vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabaseClient,
  typedSupabase: mockSupabaseClient,
}));

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = '123-abc';
  const mockProfileId = 'profile-123';

  // Helper to create chained supabase mocks
  const createSupabaseMock = (methods: Record<string, any>) => {
    const mock = methods;
    Object.keys(methods).forEach(key => {
      if (typeof methods[key] === 'function') {
        mock[key] = methods[key];
      } else {
        mock[key] = vi.fn().mockReturnValue(mock);
      }
    });
    return mock;
  };

  describe('getProfile', () => {
    it('should return profile data on success', async () => {
      const mockData = { id: mockProfileId, user_id: mockUserId, profiles: { first_name: 'John' } };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await profileService.getProfile(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockData);
    });

    it('should throw an error if supabase returns an error', async () => {
      const mockError = new Error('Database error');

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      await expect(profileService.getProfile(mockUserId)).rejects.toThrow('Database error');
    });
  });

  describe('updateProfile', () => {
    it('should return updated profile data on success', async () => {
      const updateData = { headline: 'New Headline' };
      const mockData = { id: mockProfileId, headline: 'New Headline' };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any);

      const result = await profileService.updateProfile(mockUserId, updateData);

      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ headline: 'New Headline' }));
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockData);
    });

    it('should throw an error on update failure', async () => {
      const mockError = new Error('Update failed');
      const updateData = { headline: 'New Headline' };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any);

      await expect(profileService.updateProfile(mockUserId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('getSkills', () => {
    it('should return empty array if profile not found', async () => {
      // Mock getting profile_id returning null
      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await profileService.getSkills(mockUserId);
      expect(result).toEqual([]);
    });

    it('should return skills on success', async () => {
      const mockSkillsData = [{ id: 'skill-1', name: 'React' }];

      // We need to implement a more complex mock here since getSkills calls from() twice

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'skills') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockSkillsData, error: null })
            })
          } as any;
        }
        return {} as any;
      });

      const result = await profileService.getSkills(mockUserId);
      expect(result).toEqual(mockSkillsData);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(supabase.from).toHaveBeenCalledWith('skills');
    });

    it('should throw error if getting skills fails', async () => {
      const mockError = new Error('Fetch skills failed');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'skills') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: mockError })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.getSkills(mockUserId)).rejects.toThrow('Fetch skills failed');
    });
  });

  describe('addSkill', () => {
    it('should throw error if profile not found', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addSkill(mockUserId, { name: 'React' })).rejects.toThrow('Profile not found');
    });

    it('should return added skill data on success', async () => {
      const skillData = { name: 'React', proficiency: 'EXPERT' };
      const mockAddedSkill = { id: 'skill-1', ...skillData };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'skills') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockAddedSkill, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      const result = await profileService.addSkill(mockUserId, skillData);
      expect(result).toEqual(mockAddedSkill);
    });

    it('should throw error on insert failure', async () => {
      const mockError = new Error('Insert failed');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'skills') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: mockError })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addSkill(mockUserId, { name: 'React' })).rejects.toThrow('Insert failed');
    });
  });

  describe('deleteSkill', () => {
    it('should delete skill on success', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete
      } as any);

      await profileService.deleteSkill('skill-1');

      expect(supabase.from).toHaveBeenCalledWith('skills');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'skill-1');
    });

    it('should throw error if delete fails', async () => {
      const mockError = new Error('Delete failed');
      const mockEq = vi.fn().mockResolvedValue({ error: mockError });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete
      } as any);

      await expect(profileService.deleteSkill('skill-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('addExperience', () => {
    it('should throw error if profile not found', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addExperience(mockUserId, { company: 'Acme', title: 'Dev', startDate: '2020-01-01' } as any)).rejects.toThrow('Profile not found');
    });

    it('should return added experience on success', async () => {
      const expData = { company: 'Acme', title: 'Dev', startDate: '2020-01-01' };
      const mockAddedExp = { id: 'exp-1', ...expData };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'experiences') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockAddedExp, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      const result = await profileService.addExperience(mockUserId, expData as any);
      expect(result).toEqual(mockAddedExp);
    });

    it('should throw error if insert fails', async () => {
      const mockError = new Error('Insert failed');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'experiences') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: mockError })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addExperience(mockUserId, { company: 'Acme', title: 'Dev', startDate: '2020-01-01' } as any)).rejects.toThrow('Insert failed');
    });
  });

  describe('addEducation', () => {
    it('should throw error if profile not found', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addEducation(mockUserId, { institution: 'MIT', degree: 'BS', startDate: '2016-01-01' } as any)).rejects.toThrow('Profile not found');
    });

    it('should return added education on success', async () => {
      const eduData = { institution: 'MIT', degree: 'BS', startDate: '2016-01-01' };
      const mockAddedEdu = { id: 'edu-1', ...eduData };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'educations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockAddedEdu, error: null })
              })
            })
          } as any;
        }
        return {} as any;
      });

      const result = await profileService.addEducation(mockUserId, eduData as any);
      expect(result).toEqual(mockAddedEdu);
    });

    it('should throw error if insert fails', async () => {
      const mockError = new Error('Insert failed');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: mockProfileId }, error: null })
              })
            })
          } as any;
        } else if (table === 'educations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: mockError })
              })
            })
          } as any;
        }
        return {} as any;
      });

      await expect(profileService.addEducation(mockUserId, { institution: 'MIT', degree: 'BS', startDate: '2016-01-01' } as any)).rejects.toThrow('Insert failed');
    });
  });

  describe('saveResume', () => {
    it('should save resume data successfully', async () => {
      const resumeData = { summary: 'A great dev' };
      const mockData = { id: mockProfileId, summary: 'A great dev' };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any);

      const result = await profileService.saveResume(mockUserId, resumeData as any);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ summary: 'A great dev' }));
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockData);
    });

    it('should throw error on save resume failure', async () => {
      const mockError = new Error('Update failed');
      const resumeData = { summary: 'A great dev' };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any);

      await expect(profileService.saveResume(mockUserId, resumeData as any)).rejects.toThrow('Update failed');
    });
  });

  describe('getResume', () => {
    it('should return resume data on success', async () => {
      const mockData = { summary: 'A great dev', experiences: [] };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      const result = await profileService.getResume(mockUserId);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockData);
    });

    it('should throw an error if supabase returns an error', async () => {
      const mockError = new Error('Database error');

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      await expect(profileService.getResume(mockUserId)).rejects.toThrow('Database error');
    });
  });
});
