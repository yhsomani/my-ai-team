import { supabase } from '../lib/supabaseClient';
import type { UserProfile, Resume, WorkExperience, Education } from '../types/profile';

export const profileService = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        profiles (email, first_name, last_name, avatar_url),
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
    return data;
  },

  updateProfile: async (userId: string, profile: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        headline: profile.headline,
        summary: profile.summary,
        current_role: profile.currentRole,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        linkedin_url: profile.linkedinUrl,
        github_url: profile.githubUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getSkills: async (userId: string) => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .in('profile_id', 
        supabase.from('user_profiles').select('id').eq('user_id', userId)
      );
    
    if (error) throw error;
    return data;
  },

  addSkill: async (userId: string, skill: { name: string; proficiency?: string; years_of_experience?: number }) => {
    // First get the profile_id
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (!profileData) throw new Error('Profile not found');

    const { data, error } = await supabase
      .from('skills')
      .insert({
        profile_id: profileData.id,
        name: skill.name,
        proficiency: skill.proficiency || 'INTERMEDIATE',
        years_of_experience: skill.years_of_experience
      })
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
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (!profileData) throw new Error('Profile not found');

    const { data, error } = await supabase
      .from('experiences')
      .insert({
        profile_id: profileData.id,
        company: experience.company,
        title: experience.title,
        location: experience.location,
        start_date: experience.startDate,
        end_date: experience.endDate || null,
        current: experience.current,
        description: experience.description
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  addEducation: async (userId: string, education: Omit<Education, 'id'>) => {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (!profileData) throw new Error('Profile not found');

    const { data, error } = await supabase
      .from('educations')
      .insert({
        profile_id: profileData.id,
        institution: education.institution,
        degree: education.degree,
        field_of_study: education.fieldOfStudy,
        start_date: education.startDate,
        end_date: education.endDate || null,
        gpa: education.gpa
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  saveResume: async (userId: string, resume: Omit<Resume, 'id' | 'userId'>) => {
    // This would typically store resume data in a resumés table or as JSONB
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        summary: resume.summary,
        updated_at: new Date().toISOString()
      })
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
  }
};
