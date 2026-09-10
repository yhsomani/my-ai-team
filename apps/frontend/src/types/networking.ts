export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  recipientId?: string; // Alias for compatibility
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  message?: string;
  recipient?: PublicProfile;
  requester?: PublicProfile;
}

export interface PublicProfile {
  id: string; // Alias for userId or unique handle
  userId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  currentRole?: string; // UI alias for headline
  location?: string;
  avatarUrl?: string;
  skills?: string[];
  mutualConnections?: number;
  isConnected?: boolean;
  alignment?: number;
  recommendationScore?: number;
  recommendationReasons?: string[];
  sharedSkills?: string[];
  sharedCompanies?: string[];
  bio?: string;
  summary?: string;
}

export interface FeedItem {
  id?: string;
  userId: string;
  user?: PublicProfile;
  userName?: string;
  userAvatar?: string;
  headline?: string;
  content: string;
  type: 'POST' | 'ACHIEVEMENT' | 'CERTIFICATION' | 'SYSTEM' | 'JOB_CHANGE' | 'SKILL_ADDED';
  metadata?: any;
  likes?: number;
  comments?: number;
  timestamp?: string;
  createdAt?: string;
}

export interface SendConnectionRequest {
  recipientId: string;
}
