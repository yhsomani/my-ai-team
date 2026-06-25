import { supabase } from '../lib/supabaseClient';
import { Connection, FeedItem, PublicProfile } from '../types/networking';
import { apiClient } from '../api/axios';

const mapProfileRow = (profile: any): PublicProfile => ({
  id: profile.id,
  userId: profile.id,
  fullName: profile.full_name || undefined,
  firstName: profile.full_name?.split(' ')[0] || undefined,
  lastName: profile.full_name?.split(' ').slice(1).join(' ') || undefined,
  headline: profile.user_profiles?.[0]?.headline || undefined,
  currentRole: profile.user_profiles?.[0]?.current_role || profile.user_profiles?.[0]?.headline || undefined,
  location: profile.user_profiles?.[0]?.location || undefined,
  avatarUrl: profile.avatar_url || undefined
});

const fetchProfilesByIds = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, PublicProfile>();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      user_profiles (
        headline,
        current_role,
        location
      )
    `)
    .in('id', uniqueIds);

  if (error) throw error;

  return new Map((data || []).map((profile) => [profile.id, mapProfileRow(profile)]));
};

const mapConnectionRow = (row: any, profilesById: Map<string, PublicProfile>): Connection => ({
  id: row.id,
  requesterId: row.requester_id,
  receiverId: row.receiver_id,
  recipientId: row.receiver_id,
  status: row.status,
  message: row.message || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  requester: profilesById.get(row.requester_id),
  recipient: profilesById.get(row.receiver_id)
});

export const networkingService = {
  getFeed: async (userId: string): Promise<FeedItem[]> => {
    try {
      // Get user's connections first
      const { data: connections } = await supabase
        .from('connections')
        .select(`
          receiver_id,
          profiles (
            id,
            full_name,
            avatar_url,
            user_profiles (headline, current_role)
          )
        `)
        .eq('requester_id', userId)
        .eq('status', 'ACCEPTED');

      const connectionIds = connections?.map(c => c.receiver_id) || [];

      if (connectionIds.length === 0) {
        // Fallback to API gateway if no connections found
        const response = await apiClient.get('/api/v1/network/feed', { params: { userId } });
        return response.data?.data || [];
      }

      // Get recent activity from connections
      const { data: feedData, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          headline,
          experiences (
            id,
            company,
            title,
            created_at
          ),
          skills (
            id,
            name,
            created_at
          )
        `)
        .in('user_id', connectionIds)
        .limit(20);

      if (error) throw error;
      
      // Transform into feed items
      const feedItems: FeedItem[] = [];
      
      feedData?.forEach(profile => {
        if (profile.experiences && profile.experiences.length > 0) {
          profile.experiences.forEach(exp => {
            feedItems.push({
              type: 'JOB_CHANGE' as const,
              userId: profile.user_id,
              userName: profile.full_name,
              userAvatar: (profile as any).profiles?.avatar_url || undefined,
              headline: profile.headline || undefined,
              content: `Started new position as ${exp.title} at ${exp.company}`,
              timestamp: exp.created_at
            });
          });
        }
        
        if (profile.skills && profile.skills.length > 0) {
          profile.skills.slice(0, 3).forEach(skill => {
            feedItems.push({
              type: 'SKILL_ADDED' as const,
              userId: profile.user_id,
              userName: profile.full_name,
              userAvatar: (profile as any).profiles?.avatar_url || undefined,
              headline: profile.headline || undefined,
              content: `Added new skill: ${skill.name}`,
              timestamp: skill.created_at
            });
          });
        }
      });
      
      return feedItems.sort((a, b) => 
        new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime()
      );
    } catch (err) {
      console.warn('[Networking] Supabase feed fetch failed, using Gateway...', err);
      try {
        const response = await apiClient.get('/api/v1/network/feed', { params: { userId } });
        return response.data?.data || [];
      } catch (gatewayErr) {
        return [];
      }
    }
  },


  sendConnectionRequest: async (recipientId: string, senderId: string, message?: string): Promise<Connection> => {
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: senderId,
        receiver_id: recipientId,
        status: 'PENDING',
        message
      })
      .select('*')
      .single();
    
    if (error) throw error;

    const profilesById = await fetchProfilesByIds([data.requester_id, data.receiver_id]);
    return mapConnectionRow(data, profilesById);
  },

  getSuggestions: async (userId: string): Promise<PublicProfile[]> => {
    try {
      // Get users who are not already connected
      const { data: existingConnections } = await supabase
        .from('connections')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
      
      const connectedIds = existingConnections?.flatMap(c => [c.requester_id, c.receiver_id]) || [];
      const excludedIds = [...connectedIds, userId];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          user_profiles (
            headline,
            current_role,
            location
          )
        `)
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(10);
      
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        userId: p.id,
        fullName: p.full_name || undefined,
        firstName: p.full_name?.split(' ')[0] || undefined,
        lastName: p.full_name?.split(' ').slice(1).join(' ') || undefined,
        headline: p.user_profiles?.[0]?.headline || undefined,
        currentRole: p.user_profiles?.[0]?.current_role || undefined,
        location: p.user_profiles?.[0]?.location || undefined,
        avatarUrl: p.avatar_url || undefined
      }));
    } catch (err) {
      console.warn('[Networking] Supabase suggestions fetch failed, using Gateway...', err);
      try {
        const response = await apiClient.get('/api/v1/network/suggestions', { params: { userId } });
        return response.data?.data || [];
      } catch (gatewayErr) {
        return [];
      }
    }
  },


  acceptConnectionRequest: async (connectionId: string): Promise<void> => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'ACCEPTED' })
      .eq('id', connectionId);
    
    if (error) throw error;
  },

  rejectConnectionRequest: async (connectionId: string): Promise<void> => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'REJECTED' })
      .eq('id', connectionId);
    
    if (error) throw error;
  },

  getConnectionRequests: async (userId: string): Promise<{ incoming: Connection[]; sent: Connection[] }> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profilesById = await fetchProfilesByIds(
        (data || []).flatMap((connection) => [connection.requester_id, connection.receiver_id])
      );
      const connections = (data || []).map((connection) => mapConnectionRow(connection, profilesById));

      return {
        incoming: connections.filter((connection) => connection.receiverId === userId),
        sent: connections.filter((connection) => connection.requesterId === userId)
      };
    } catch (err) {
      console.warn('[Networking] Supabase request fetch failed, using empty request lists...', err);
      return { incoming: [], sent: [] };
    }
  },

  getConnections: async (userId: string): Promise<Connection[]> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'ACCEPTED')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const profilesById = await fetchProfilesByIds(
        (data || []).flatMap((connection) => [connection.requester_id, connection.receiver_id])
      );

      return (data || []).map((connection) => mapConnectionRow(connection, profilesById));
    } catch (err) {
      console.warn('[Networking] Supabase connections fetch failed, using Gateway...', err);
      try {
        const response = await apiClient.get('/api/v1/networking/connections/' + userId);
        return response.data?.data || [];
      } catch (gatewayErr) {
        return [];
      }
    }
  }
};
