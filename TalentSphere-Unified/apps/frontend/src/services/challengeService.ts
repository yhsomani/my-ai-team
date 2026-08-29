import { typedSupabase as supabase, type Database, type Json } from '../lib/supabaseClient';
import { Challenge, ChallengeSubmission, ChallengeTestCase } from '../types/challenges';

type ChallengeRow = Database['public']['Tables']['challenges']['Row'];
type ChallengeSubmissionRow = Database['public']['Tables']['challenge_submissions']['Row'];
type ChallengeSubmissionInsert = Database['public']['Tables']['challenge_submissions']['Insert'];

const mapTestCases = (value: Json | null): ChallengeTestCase[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => item as ChallengeTestCase);
};

const mapChallenge = (row: ChallengeRow): Challenge => ({
  id: row.id,
  title: row.title,
  description: row.description,
  difficulty: row.difficulty,
  category: row.category,
  xpReward: row.xp_reward,
  xp_reward: row.xp_reward,
  starterCode: row.starter_code ?? undefined,
  starter_code: row.starter_code ?? undefined,
  testCases: mapTestCases(row.test_cases),
  test_cases: mapTestCases(row.test_cases),
  timeLimit: row.time_limit_minutes ? `${row.time_limit_minutes} min` : undefined,
  is_active: row.is_published ?? undefined,
  status: row.is_published ? 'OPEN' : 'DRAFT',
  created_at: row.created_at ?? undefined,
});

const mapSubmissionStatus = (row: ChallengeSubmissionRow): ChallengeSubmission['status'] => {
  if (row.passed_tests === true) return 'PASSED';
  if (row.passed_tests === false) return 'FAILED';
  return 'SUBMITTED';
};

const mapSubmission = (row: ChallengeSubmissionRow): ChallengeSubmission => ({
  id: row.id,
  challenge_id: row.challenge_id,
  user_id: row.user_id,
  language: row.language ?? '',
  code: row.code_submitted,
  status: mapSubmissionStatus(row),
  score: row.score ?? undefined,
  feedback: row.feedback ?? undefined,
  submitted_at: row.submitted_at ?? '',
  created_at: row.submitted_at ?? undefined,
});

export const challengeService = {
  getChallenges: async (isActive?: boolean): Promise<Challenge[]> => {
    let query = supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (isActive !== undefined) {
      query = query.eq('is_published', isActive);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching challenges:', error);
      throw new Error(`Failed to fetch challenges: ${error.message}`);
    }

    return (data || []).map(mapChallenge);
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

    return data ? mapChallenge(data) : null;
  },

  submitChallengeSolution: async (
    challengeId: string, 
    userId: string, 
    language: string, 
    code: string
  ): Promise<ChallengeSubmission> => {
    const submission: ChallengeSubmissionInsert = {
      challenge_id: challengeId,
      user_id: userId,
      language,
      code_submitted: code,
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

    return mapSubmission(data);
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

    return (data || []).map(mapSubmission);
  }
};
