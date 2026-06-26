import { supabase } from '../lib/supabaseClient';
import { Connection, FeedItem, PublicProfile } from '../types/networking';
import { apiClient } from '../api/axios';

type ProfileSignal = {
  skills: string[];
  companies: string[];
  location?: string;
  role?: string;
};

export type NetworkingSuggestionPreferenceStatus = 'dismissed';

export interface NetworkingSuggestionPreference {
  id: string;
  userId: string;
  suggestedUserId: string;
  status: NetworkingSuggestionPreferenceStatus;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

type MutualConnectionCountRow = {
  suggested_user_id: string;
  mutual_count: number;
};

type BackendNetworkingSuggestion = {
  suggestedUserId?: string;
  suggested_user_id?: string;
  mutualConnections?: number;
  mutual_connections?: number;
  recommendationScore?: number;
  recommendation_score?: number;
  recommendationReasons?: string[];
  recommendation_reasons?: string[];
  source?: string;
};

type NormalizedNetworkingSuggestion = {
  suggestedUserId: string;
  mutualConnections: number;
  recommendationScore?: number;
  recommendationReasons: string[];
};

const normalizeValue = (value?: string | null) => (value || '').trim();

const normalizeKey = (value?: string | null) => normalizeValue(value).toLowerCase();

const normalizeNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueValues = (values: Array<string | undefined | null>) => Array.from(new Set(
  values
    .map(normalizeValue)
    .filter(Boolean)
));

const firstNestedProfile = (profile: any) => Array.isArray(profile?.user_profiles)
  ? profile.user_profiles[0]
  : profile?.user_profiles;

const getProfileSkills = (profile: any) => uniqueValues(
  (firstNestedProfile(profile)?.skills || []).map((skill: any) => skill?.name)
);

const getCurrentCompanies = (profile: any) => uniqueValues(
  (firstNestedProfile(profile)?.experiences || [])
    .filter((experience: any) => experience?.current)
    .map((experience: any) => experience?.company)
);

const getRoleTerms = (role?: string) => normalizeKey(role)
  .split(/[^a-z0-9+#.]+/)
  .filter(term => term.length > 2);

const getSharedValues = (candidateValues: string[], currentValues: string[]) => {
  const currentKeys = new Set(currentValues.map(normalizeKey));
  return candidateValues.filter(value => currentKeys.has(normalizeKey(value)));
};

const mapProfileRow = (profile: any): PublicProfile => ({
  id: profile.id,
  userId: profile.id,
  fullName: profile.full_name || undefined,
  firstName: profile.full_name?.split(' ')[0] || undefined,
  lastName: profile.full_name?.split(' ').slice(1).join(' ') || undefined,
  headline: firstNestedProfile(profile)?.headline || undefined,
  currentRole: firstNestedProfile(profile)?.current_role || firstNestedProfile(profile)?.headline || undefined,
  location: firstNestedProfile(profile)?.location || undefined,
  avatarUrl: profile.avatar_url || undefined,
  skills: getProfileSkills(profile),
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
        location,
        skills (name)
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

const mapSuggestionPreferenceRow = (row: any): NetworkingSuggestionPreference => ({
  id: row.id,
  userId: row.user_id,
  suggestedUserId: row.suggested_user_id,
  status: 'dismissed',
  reason: row.reason || undefined,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

const getCurrentProfileSignal = async (userId: string): Promise<ProfileSignal> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      headline,
      current_role,
      location,
      skills (name),
      experiences (company, current)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn('[Networking] current profile signal unavailable.', error);
    return { skills: [], companies: [] };
  }

  return {
    skills: uniqueValues((data.skills || []).map((skill: any) => skill?.name)),
    companies: uniqueValues((data.experiences || [])
      .filter((experience: any) => experience?.current)
      .map((experience: any) => experience?.company)),
    location: data.location || undefined,
    role: data.current_role || data.headline || undefined,
  };
};

const getMutualConnectionCounts = async (userId: string, candidateIds: string[]) => {
  const uniqueCandidateIds = Array.from(new Set(candidateIds.filter(Boolean)));
  if (uniqueCandidateIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabase.rpc('get_mutual_connection_counts', {
    p_current_user_id: userId,
    p_candidate_ids: uniqueCandidateIds,
  });

  if (error) {
    console.warn('[Networking] mutual connection counts unavailable; suggestions will use profile-only ranking.', error);
    return new Map<string, number>();
  }

  return new Map(
    ((data || []) as MutualConnectionCountRow[]).map((row) => [
      row.suggested_user_id,
      Number(row.mutual_count) || 0,
    ])
  );
};

const formatMutualConnectionReason = (mutualConnections: number) => {
  if (mutualConnections <= 0) return '';
  return `${mutualConnections} mutual ${mutualConnections === 1 ? 'connection' : 'connections'}`;
};

const mapBackendSuggestion = (row: BackendNetworkingSuggestion | null | undefined): NormalizedNetworkingSuggestion | null => {
  if (!row || typeof row !== 'object') return null;

  const suggestedUserId = normalizeValue(row.suggestedUserId || row.suggested_user_id);
  if (!suggestedUserId) return null;

  const mutualConnections = Math.max(0, normalizeNumber(row.mutualConnections ?? row.mutual_connections));
  const recommendationScore = row.recommendationScore ?? row.recommendation_score;
  const recommendationReasons = Array.isArray(row.recommendationReasons)
    ? row.recommendationReasons
    : Array.isArray(row.recommendation_reasons)
      ? row.recommendation_reasons
      : [];

  return {
    suggestedUserId,
    mutualConnections,
    recommendationScore: recommendationScore === undefined
      ? undefined
      : Math.max(0, Math.min(100, normalizeNumber(recommendationScore, 0))),
    recommendationReasons: recommendationReasons.map(normalizeValue).filter(Boolean),
  };
};

const getBackendNetworkingSuggestions = async (userId: string): Promise<NormalizedNetworkingSuggestion[]> => {
  const response = await apiClient.get(`/api/v1/networking/suggestions/${encodeURIComponent(userId)}`, {
    params: { limit: 20 },
  });
  const rows: Array<BackendNetworkingSuggestion | null | undefined> = Array.isArray(response.data?.data)
    ? response.data.data
    : Array.isArray(response.data)
      ? response.data
      : [];

  const seen = new Set<string>();
  return rows
    .map(mapBackendSuggestion)
    .filter((suggestion): suggestion is NormalizedNetworkingSuggestion => Boolean(suggestion))
    .filter((suggestion) => {
      if (seen.has(suggestion.suggestedUserId)) return false;
      seen.add(suggestion.suggestedUserId);
      return true;
    });
};

const hydrateBackendSuggestions = async (suggestions: NormalizedNetworkingSuggestion[]): Promise<PublicProfile[]> => {
  if (suggestions.length === 0) return [];

  const profilesById = await fetchProfilesByIds(suggestions.map(suggestion => suggestion.suggestedUserId));

  const hydratedProfiles = suggestions
    .map((suggestion): PublicProfile | null => {
      const profile = profilesById.get(suggestion.suggestedUserId);
      if (!profile) return null;

      const score = suggestion.recommendationScore ?? Math.min(95, 40 + Math.min(suggestion.mutualConnections, 5) * 10);
      const reasons = suggestion.recommendationReasons.length > 0
        ? suggestion.recommendationReasons
        : [
            formatMutualConnectionReason(suggestion.mutualConnections),
            'Suggested from your accepted network',
          ].filter(Boolean);

      return {
        ...profile,
        mutualConnections: suggestion.mutualConnections,
        recommendationScore: score,
        recommendationReasons: reasons,
        alignment: score,
      };
    });

  return hydratedProfiles
    .filter((profile): profile is PublicProfile => Boolean(profile))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
    .slice(0, 10);
};

const enrichRecommendation = (
  profile: any,
  currentProfile: ProfileSignal,
  mutualConnections = 0
): PublicProfile => {
  const publicProfile = mapProfileRow(profile);
  const candidateCompanies = getCurrentCompanies(profile);
  const sharedSkills = getSharedValues(publicProfile.skills || [], currentProfile.skills);
  const sharedCompanies = getSharedValues(candidateCompanies, currentProfile.companies);
  const candidateRoleTerms = new Set(getRoleTerms(publicProfile.currentRole || publicProfile.headline));
  const sharedRoleTerms = getRoleTerms(currentProfile.role).filter(term => candidateRoleTerms.has(term));
  const sameLocation = Boolean(
    publicProfile.location &&
      currentProfile.location &&
      normalizeKey(publicProfile.location) === normalizeKey(currentProfile.location)
  );

  const reasons = [
    formatMutualConnectionReason(mutualConnections),
    sharedSkills.length > 0 ? `Shares ${sharedSkills.slice(0, 2).join(', ')}` : '',
    sharedCompanies.length > 0 ? `Has current-company overlap: ${sharedCompanies.slice(0, 2).join(', ')}` : '',
    sameLocation && publicProfile.location ? `Based in ${publicProfile.location}` : '',
    sharedRoleTerms.length > 0 && currentProfile.role ? `Role context overlaps with ${currentProfile.role}` : '',
    publicProfile.currentRole ? `Works in ${publicProfile.currentRole}` : '',
    publicProfile.headline ? 'Has profile context to review before connecting' : '',
  ].filter(Boolean).slice(0, 3);

  const recommendationScore = Math.min(98,
    35 +
      Math.min(sharedSkills.length, 3) * 12 +
      Math.min(sharedCompanies.length, 2) * 16 +
      Math.min(sharedRoleTerms.length, 2) * 8 +
      Math.min(mutualConnections, 5) * 6 +
      (sameLocation ? 10 : 0) +
      (publicProfile.headline ? 5 : 0)
  );

  return {
    ...publicProfile,
    recommendationScore,
    recommendationReasons: reasons.length > 0
      ? reasons
      : ['Suggested because this profile is outside your current network'],
    sharedSkills,
    sharedCompanies,
    mutualConnections,
    alignment: recommendationScore,
  };
};

const getClientRankedSuggestions = async (userId: string): Promise<PublicProfile[]> => {
  // Get users who are not already connected
  const { data: existingConnections, error: connectionError } = await supabase
    .from('connections')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (connectionError) throw connectionError;

  const connectedIds = existingConnections?.flatMap(c => [c.requester_id, c.receiver_id]) || [];
  const excludedIds = [...connectedIds, userId];
  const currentProfile = await getCurrentProfileSignal(userId);

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      user_profiles (
        id,
        headline,
        current_role,
        location,
        skills (name),
        experiences (company, current)
      )
    `)
    .not('id', 'in', `(${excludedIds.join(',')})`)
    .limit(20);

  if (error) throw error;

  const profiles = data || [];
  const mutualConnectionCounts = await getMutualConnectionCounts(
    userId,
    profiles.map(profile => profile.id)
  );

  return profiles
    .map(profile => enrichRecommendation(
      profile,
      currentProfile,
      mutualConnectionCounts.get(profile.id) || 0
    ))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
    .slice(0, 10);
};

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
        const response = await apiClient.get('/api/v1/networking/feed', { params: { userId } });
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
        const response = await apiClient.get('/api/v1/networking/feed', { params: { userId } });
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
      const backendSuggestions = await getBackendNetworkingSuggestions(userId);
      const hydratedSuggestions = await hydrateBackendSuggestions(backendSuggestions);
      if (hydratedSuggestions.length > 0) {
        return hydratedSuggestions;
      }
    } catch (err) {
      console.warn('[Networking] API recommendations unavailable; using Supabase suggestion fallback.', err);
    }

    try {
      return await getClientRankedSuggestions(userId);
    } catch (err) {
      console.warn('[Networking] Supabase recommendations fetch failed; using empty suggestion list.', err);
      return [];
    }
  },

  getSuggestionPreferences: async (userId: string): Promise<NetworkingSuggestionPreference[]> => {
    const { data, error } = await supabase
      .from('networking_suggestion_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'dismissed')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[Networking] suggestion preferences unavailable; using local hidden suggestions.', error);
      throw new Error(`Failed to fetch networking suggestion preferences: ${error.message}`);
    }

    return (data || []).map(mapSuggestionPreferenceRow);
  },

  saveSuggestionPreference: async (
    userId: string,
    suggestedUserId: string,
    reason = 'dismissed_from_discover'
  ): Promise<NetworkingSuggestionPreference> => {
    const { data, error } = await supabase
      .from('networking_suggestion_preferences')
      .upsert({
        user_id: userId,
        suggested_user_id: suggestedUserId,
        status: 'dismissed',
        reason,
      }, {
        onConflict: 'user_id,suggested_user_id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Networking] suggestion preference not synced; using local hidden suggestions.', error);
      throw new Error(`Failed to save networking suggestion preference: ${error.message}`);
    }

    return mapSuggestionPreferenceRow(data);
  },

  deleteSuggestionPreference: async (userId: string, suggestedUserId: string): Promise<void> => {
    const { error } = await supabase
      .from('networking_suggestion_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('suggested_user_id', suggestedUserId);

    if (error) {
      console.warn('[Networking] suggestion preference delete not synced; using local hidden suggestions.', error);
      throw new Error(`Failed to delete networking suggestion preference: ${error.message}`);
    }
  },

  clearSuggestionPreferences: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('networking_suggestion_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('[Networking] suggestion preference restore not synced; using local hidden suggestions.', error);
      throw new Error(`Failed to clear networking suggestion preferences: ${error.message}`);
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
