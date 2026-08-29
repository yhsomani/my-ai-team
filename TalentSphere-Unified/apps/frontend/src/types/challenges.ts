export interface ChallengeTestCase {
    id?: string;
    input?: string;
    expectedOutput?: string;
    expected_output?: string;
    test_case?: string;
    description?: string;
}

export interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'Low' | 'Medium' | 'High' | 'Extreme' | 'Easy' | 'Hard' | 'EASY' | 'MEDIUM' | 'HARD' | string;
    participantCount?: number;
    participantsCount?: number;
    xpReward?: number;
    xp_reward?: number;
    status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | string;
    category?: string;
    duration?: string;
    timeLimit?: string;
    starterCode?: string;
    starter_code?: string;
    testCases?: ChallengeTestCase[];
    test_cases?: ChallengeTestCase[];
    is_active?: boolean;
    created_at?: string;
}

export interface ChallengeSubmission {
    id: string;
    challenge_id: string;
    user_id: string;
    language: string;
    code: string;
    status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'PASSED' | 'FAILED' | string;
    score?: number;
    feedback?: string;
    submitted_at: string;
    created_at?: string;
}

export interface LeaderboardEntry {
    rank: number;
    name: string;
    xp: number;
    node: string;
}
