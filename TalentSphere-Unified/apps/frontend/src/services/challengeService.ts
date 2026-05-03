import { supabase } from '../lib/supabaseClient';
import { Challenge, ChallengeSubmission } from '../types/challenges';

export const challengeService = {
  getChallenges: async (isActive?: boolean): Promise<Challenge[]> => {
    let query = supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching challenges:', error);
      throw new Error(`Failed to fetch challenges: ${error.message}`);
    }

    return data || [];
  },

  getChallengeById: async (challengeId: string): Promise<Challenge | null> => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching challenge:', error);
      throw new Error(`Failed to fetch challenge: ${error.message}`);
    }

    return data || null;
  },

  submitChallengeSolution: async (
    challengeId: string, 
    userId: string, 
    language: string, 
    code: string
  ): Promise<ChallengeSubmission> => {
    const submission = {
      challenge_id: challengeId,
      user_id: userId,
      language,
      code,
      status: 'SUBMITTED' as const,
      submitted_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('challenge_submissions')
      .insert([submission])
      .select()
      .single();

    if (error) {
      console.error('Error submitting challenge solution:', error);
      throw new Error(`Failed to submit solution: ${error.message}`);
    }

    return data;
  },

  getUserSubmissions: async (userId: string, challengeId?: string): Promise<ChallengeSubmission[]> => {
    let query = supabase
      .from('challenge_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (challengeId) {
      query = query.eq('challenge_id', challengeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    return data || [];
  }
};
