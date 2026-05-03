export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  recipient?: PublicProfile;
  requester?: PublicProfile;
}

export interface PublicProfile {
  id: string; // Alias for userId or unique handle
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  headline?: string;
  currentRole?: string; // UI alias for headline
  location?: string;
  avatarUrl?: string;
  skills?: string[];
  mutualConnections?: number;
  isConnected?: boolean;
  alignment?: number;
  bio?: string;
  summary?: string;
}

export interface FeedItem {
  id: string;
  userId: string;
  user: PublicProfile;
  content: string;
  type: 'POST' | 'ACHIEVEMENT' | 'CERTIFICATION' | 'SYSTEM';
  metadata?: any;
  likes: number;
  comments: number;
  createdAt: string;
}

export interface SendConnectionRequest {
  recipientId: string;
}
