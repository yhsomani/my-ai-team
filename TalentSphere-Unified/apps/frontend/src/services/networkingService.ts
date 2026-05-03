import { supabase } from '../lib/supabaseClient';
import { Connection, FeedItem, PublicProfile } from '../types/networking';

export const networkingService = {
  getFeed: async (userId: string): Promise<FeedItem[]> => {
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
    
    if (connectionIds.length === 0) return [];

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
            type: 'JOB_CHANGE',
            userId: profile.user_id,
            userName: profile.full_name,
            userAvatar: profile.avatar_url,
            headline: profile.headline,
            content: `Started new position as ${exp.title} at ${exp.company}`,
            timestamp: exp.created_at
          });
        });
      }
      
      if (profile.skills && profile.skills.length > 0) {
        profile.skills.slice(0, 3).forEach(skill => {
          feedItems.push({
            type: 'SKILL_ADDED',
            userId: profile.user_id,
            userName: profile.full_name,
            userAvatar: profile.avatar_url,
            headline: profile.headline,
            content: `Added new skill: ${skill.name}`,
            timestamp: skill.created_at
          });
        });
      }
    });
    
    return feedItems.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
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
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      requesterId: data.requester_id,
      receiverId: data.receiver_id,
      status: data.status,
      message: data.message,
      createdAt: data.created_at,
      requester: data.profiles
    };
  },

  getSuggestions: async (userId: string): Promise<PublicProfile[]> => {
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
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      headline: p.user_profiles?.headline,
      currentRole: p.user_profiles?.current_role,
      location: p.user_profiles?.location
    }));
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

  getConnections: async (userId: string): Promise<Connection[]> => {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url,
          user_profiles (headline)
        )
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'ACCEPTED');
    
    if (error) throw error;
    
    return data.map(c => ({
      id: c.id,
      requesterId: c.requester_id,
      receiverId: c.receiver_id,
      status: c.status,
      createdAt: c.created_at,
      requester: c.profiles
    }));
  }
};
