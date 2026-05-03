export interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'Low' | 'Medium' | 'High' | 'Extreme';
    participantCount: number;
    xpReward: number;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
    category?: string;
}

export interface LeaderboardEntry {
    rank: number;
    name: string;
    xp: number;
    node: string;
}
