import { typedSupabase as supabase, type Database } from '../lib/supabaseClient';
import { buildResumeArtifactRecord, type ResumeArtifactRecord } from '../lib/resumeArtifactLibrary';
import type { ResumeExportMethod, ResumeExportRecord, ResumeExportStatus } from '../lib/resumeExportHistory';
import type { UserProfile, Resume, WorkExperience, Education } from '../types/profile';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
type SkillRow = Database['public']['Tables']['skills']['Row'];
type SkillInsert = Database['public']['Tables']['skills']['Insert'];
type SkillUpdate = Database['public']['Tables']['skills']['Update'];
type ExperienceRow = Database['public']['Tables']['experiences']['Row'];
type ExperienceInsert = Database['public']['Tables']['experiences']['Insert'];
type ExperienceUpdate = Database['public']['Tables']['experiences']['Update'];
type EducationRow = Database['public']['Tables']['educations']['Row'];
type EducationInsert = Database['public']['Tables']['educations']['Insert'];
type EducationUpdate = Database['public']['Tables']['educations']['Update'];
type CertificationRow = Database['public']['Tables']['certifications']['Row'];
type LanguageRow = Database['public']['Tables']['languages']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ResumeExportRow = Database['public']['Tables']['resume_export_events']['Row'];
type ResumeExportInsert = Database['public']['Tables']['resume_export_events']['Insert'];
type ResumeArtifactRow = Database['public']['Tables']['resume_artifacts']['Row'];
type ResumeArtifactInsert = Database['public']['Tables']['resume_artifacts']['Insert'];
type ResumeArtifactUpdate = Database['public']['Tables']['resume_artifacts']['Update'];
type ProficiencyLevel = Database['public']['Enums']['proficiency_level'];
type ProfileIdentityRow = Pick<ProfileRow, 'email' | 'first_name' | 'last_name' | 'full_name' | 'avatar_url'>;
type ProfileQueryRow = UserProfileRow & {
  profiles?: ProfileIdentityRow | null;
  skills?: SkillRow[];
  experiences?: ExperienceRow[];
  educations?: EducationRow[];
  certifications?: CertificationRow[];
  languages?: LanguageRow[];
  projects?: ProjectRow[];
};
type ProfileServiceProfile = ProfileQueryRow & {
  fullName: string;
  full_name: string | null;
};

const PROFICIENCY_LEVELS: readonly ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const normalizeProficiencyLevel = (value?: string): ProficiencyLevel => (
  PROFICIENCY_LEVELS.includes(value as ProficiencyLevel) ? (value as ProficiencyLevel) : 'INTERMEDIATE'
);

const getUserProfileId = async (userId: string): Promise<UserProfileRow['id'] | null> => {
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  return profileData?.id ?? null;
};

const getProfileDisplayName = (profile?: ProfileIdentityRow | null) => (
  profile?.full_name
  || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
);

const mapProfileResponse = (record: ProfileQueryRow): ProfileServiceProfile => {
  const fullName = getProfileDisplayName(record.profiles);

  return {
    ...record,
    fullName,
    full_name: (record.profiles?.full_name ?? fullName) || null,
  };
};

const mapResumeExportRecordResponse = (record: ResumeExportRow): ResumeExportRecord => ({
  id: record.id,
  userId: record.user_id,
  status: (record.status || 'ready') as ResumeExportStatus,
  method: (record.method || 'browser-print') as ResumeExportMethod,
  fileName: record.file_name || 'Resume export',
  detail: record.detail || '',
  createdAt: record.created_at || new Date().toISOString(),
  persistedTo: 'server',
});

const mapResumeArtifactRecordResponse = (record: ResumeArtifactRow): ResumeArtifactRecord => {
  const artifact = buildResumeArtifactRecord({
    id: record.id,
    user_id: record.user_id,
    file_name: record.file_name,
    file_url: record.file_url,
    uploaded_at: record.uploaded_at,
    deleted_at: record.deleted_at,
    status: record.status,
    persisted_to: 'server',
  });

  if (!artifact) {
    throw new Error('Resume artifact record did not include a usable file URL.');
  }

  return artifact;
};

export const profileService = {
  getProfile: async (userId: string): Promise<ProfileServiceProfile> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        profiles (email, first_name, last_name, full_name, avatar_url),
        skills (*),
        experiences (*),
        educations (*),
        certifications (*),
        languages (*),
        projects (*)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return mapProfileResponse(data as ProfileQueryRow);
  },

  updateProfile: async (userId: string, profile: Partial<UserProfile>) => {
    const update: UserProfileUpdate = {
      headline: profile.headline,
      summary: profile.summary,
      current_role: profile.currentRole,
      bio: profile.bio,
      location: profile.location,
      phone: profile.phone,
      website: profile.website,
      linkedin_url: profile.linkedinUrl,
      github_url: profile.githubUrl,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateAvatar: async (userId: string, avatarUrl: string | null) => {
    const update: ProfileUpdate = {
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('id, avatar_url')
      .single();

    if (error) throw error;
    return {
      ...data,
      avatarUrl: data?.avatar_url || avatarUrl || '',
    };
  },

  getSkills: async (userId: string) => {
    const profileId = await getUserProfileId(userId);
    
    if (!profileId) return [];

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', profileId);
    
    if (error) throw error;
    return data;
  },

  addSkill: async (userId: string, skill: { name: string; proficiency?: string; years_of_experience?: number }) => {
    const profileId = await getUserProfileId(userId);
    
    if (!profileId) throw new Error('Profile not found');

    const insert: SkillInsert = {
      profile_id: profileId,
      name: skill.name,
      proficiency: normalizeProficiencyLevel(skill.proficiency),
      years_of_experience: skill.years_of_experience
    };

    const { data, error } = await supabase
      .from('skills')
      .insert(insert)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateSkill: async (skillId: string, skill: { name: string; proficiency?: string; years_of_experience?: number }) => {
    const update: SkillUpdate = {
      name: skill.name,
      proficiency: normalizeProficiencyLevel(skill.proficiency),
      years_of_experience: skill.years_of_experience
    };

    const { data, error } = await supabase
      .from('skills')
      .update(update)
      .eq('id', skillId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteSkill: async (skillId: string) => {
    const { error } = await supabase.from('skills').delete().eq('id', skillId);
    if (error) throw error;
  },

  addExperience: async (userId: string, experience: Omit<WorkExperience, 'id'>) => {
    const profileId = await getUserProfileId(userId);
    
    if (!profileId) throw new Error('Profile not found');

    const insert: ExperienceInsert = {
      profile_id: profileId,
      company: experience.company,
      title: experience.title,
      location: experience.location,
      start_date: experience.startDate,
      end_date: experience.endDate || null,
      current: experience.current,
      description: experience.description
    };

    const { data, error } = await supabase
      .from('experiences')
      .insert(insert)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateExperience: async (experienceId: string, experience: Omit<WorkExperience, 'id'>) => {
    const update: ExperienceUpdate = {
      company: experience.company,
      title: experience.title,
      location: experience.location,
      start_date: experience.startDate,
      end_date: experience.endDate || null,
      current: experience.current,
      description: experience.description
    };

    const { data, error } = await supabase
      .from('experiences')
      .update(update)
      .eq('id', experienceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteExperience: async (experienceId: string) => {
    const { error } = await supabase.from('experiences').delete().eq('id', experienceId);
    if (error) throw error;
  },

  addEducation: async (userId: string, education: Omit<Education, 'id'>) => {
    const profileId = await getUserProfileId(userId);
    
    if (!profileId) throw new Error('Profile not found');

    const insert: EducationInsert = {
      profile_id: profileId,
      institution: education.institution,
      degree: education.degree,
      field_of_study: education.fieldOfStudy,
      start_date: education.startDate,
      end_date: education.endDate || null,
      gpa: education.gpa
    };

    const { data, error } = await supabase
      .from('educations')
      .insert(insert)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateEducation: async (educationId: string, education: Omit<Education, 'id'>) => {
    const update: EducationUpdate = {
      institution: education.institution,
      degree: education.degree,
      field_of_study: education.fieldOfStudy,
      start_date: education.startDate,
      end_date: education.endDate || null,
      gpa: education.gpa
    };

    const { data, error } = await supabase
      .from('educations')
      .update(update)
      .eq('id', educationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteEducation: async (educationId: string) => {
    const { error } = await supabase.from('educations').delete().eq('id', educationId);
    if (error) throw error;
  },

  saveResume: async (userId: string, resume: Omit<Resume, 'id' | 'userId'>) => {
    const update: UserProfileUpdate = {
      summary: resume.summary,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getResume: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        summary,
        experiences (*),
        educations (*),
        skills (name),
        certifications (name),
        languages (language, proficiency)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  getResumeExportHistory: async (userId: string, limit = 5): Promise<ResumeExportRecord[]> => {
    const { data, error } = await supabase
      .from('resume_export_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Profile] resume export history unavailable; using local fallback.', error);
      throw error;
    }

    return (data || []).map(mapResumeExportRecordResponse);
  },

  saveResumeExportRecord: async (record: ResumeExportRecord): Promise<ResumeExportRecord> => {
    const insert: ResumeExportInsert = {
      id: record.id,
      user_id: record.userId,
      status: record.status,
      method: record.method,
      file_name: record.fileName,
      detail: record.detail,
      created_at: record.createdAt,
    };

    const { data, error } = await supabase
      .from('resume_export_events')
      .upsert(insert, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Profile] resume export history not synced; using local fallback.', error);
      throw error;
    }

    return mapResumeExportRecordResponse(data);
  },

  getResumeArtifacts: async (userId: string, limit = 5): Promise<ResumeArtifactRecord[]> => {
    const { data, error } = await supabase
      .from('resume_artifacts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Profile] resume artifacts unavailable; using local fallback.', error);
      throw error;
    }

    return (data || []).map(mapResumeArtifactRecordResponse);
  },

  saveResumeArtifactRecord: async (
    record: ResumeArtifactRecord & { userId: string }
  ): Promise<ResumeArtifactRecord> => {
    const insert: ResumeArtifactInsert = {
      id: record.id,
      user_id: record.userId,
      file_name: record.fileName,
      file_url: record.url,
      status: record.status,
      uploaded_at: record.uploadedAt,
      deleted_at: record.deletedAt || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('resume_artifacts')
      .upsert(insert, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Profile] resume artifact not synced; using local fallback.', error);
      throw error;
    }

    return mapResumeArtifactRecordResponse(data);
  },

  markResumeArtifactDeleted: async (
    record: { id: string; userId: string; deletedAt: string }
  ): Promise<ResumeArtifactRecord> => {
    const update: ResumeArtifactUpdate = {
      status: 'deleted',
      deleted_at: record.deletedAt,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('resume_artifacts')
      .update(update)
      .eq('id', record.id)
      .eq('user_id', record.userId)
      .select()
      .single();

    if (error) {
      console.warn('[Profile] resume artifact delete metadata not synced; using local fallback.', error);
      throw error;
    }

    return mapResumeArtifactRecordResponse(data);
  },
};
