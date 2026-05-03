export interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'Low' | 'Medium' | 'High' | 'Extreme';
    participantCount: number;
    xpReward: number;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
    category?: string;
    is_active?: boolean;
    created_at?: string;
}

export interface ChallengeSubmission {
    id: string;
    challenge_id: string;
    user_id: string;
    language: string;
    code: string;
    status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PENDING';
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
