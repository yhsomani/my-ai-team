import { supabase } from '../lib/supabaseClient';
import { Message, Conversation } from '../types/messaging';

export interface PaginatedMessagesResult {
  messages: Message[];
  total: number | null;
  limit?: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface PaginatedConversationsResult {
  conversations: Conversation[];
  total: number | null;
  limit?: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

const defaultConversationPageSize = 20;
const defaultMessagePageSize = 50;

const mapMessageResponse = (msg: any): Message => ({
  id: msg.id,
  conversationId: msg.conversation_id,
  senderId: msg.sender_id,
  content: msg.content,
  messageType: (msg.message_type as 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO') || 'TEXT',
  attachmentUrl: msg.attachment_url || undefined,
  status: (msg.status as 'SENT' | 'DELIVERED' | 'READ') || 'SENT',
  timestamp: msg.created_at || msg.createdAt || new Date(0).toISOString(),
  readAt: msg.read_at || undefined,
  sender: msg.profiles ? {
    id: msg.profiles.id,
    fullName: msg.profiles.full_name,
    avatarUrl: msg.profiles.avatar_url,
    status: 'offline' as const
  } : undefined
});

const encodeMessageCursor = (message: Message): string => {
  const payload = JSON.stringify({ timestamp: message.timestamp, id: message.id });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeMessageCursor = (cursor?: string): { timestamp: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.timestamp === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Messaging] Invalid message cursor.', error);
  }

  throw new Error('Invalid message cursor');
};

const encodeConversationCursor = (conversation: Conversation): string => {
  const payload = JSON.stringify({
    updatedAt: conversation.updatedAt || conversation.createdAt || new Date(0).toISOString(),
    id: conversation.id,
  });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeConversationCursor = (cursor?: string): { updatedAt: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.updatedAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Messaging] Invalid conversation cursor.', error);
  }

  throw new Error('Invalid conversation cursor');
};

const mapConversationResponse = (conv: any): Conversation => {
  const latestMessage = [...(conv.messages || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return {
    id: conv.id,
    isGroup: conv.is_group,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    participants: (conv.conversation_participants || []).map((p: any) => p.user_id),
    lastMessage: latestMessage ? {
      id: latestMessage.id,
      content: latestMessage.content,
      senderId: latestMessage.sender_id,
      timestamp: latestMessage.created_at,
      status: 'SENT'
    } : undefined
  };
};

const getEmbeddedConversation = (row: any) => (
  Array.isArray(row?.conversations) ? row.conversations[0] : row?.conversations
);

const getDisplayNameFromProfile = (profile: Record<string, any>) => {
  const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return name || profile.email || 'Connection';
};

const getParticipantProfilesById = async (
  participantIds: string[]
): Promise<Map<string, Record<string, any>>> => {
  const uniqueParticipantIds = Array.from(new Set(participantIds)).filter(Boolean);
  if (uniqueParticipantIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, first_name, last_name, email, avatar_url')
    .in('id', uniqueParticipantIds);

  if (error) {
    console.warn('[Messaging] Conversation participant profiles unavailable.', error);
    return new Map();
  }

  return new Map((data || [])
    .filter((profile: Record<string, any>) => typeof profile.id === 'string')
    .map((profile: Record<string, any>) => [profile.id, profile]));
};

const enrichConversationsWithParticipants = async (
  conversations: Conversation[],
  userId: string
) => {
  const participantIds = conversations
    .flatMap(conversation => conversation.participants || [])
    .filter(participantId => participantId !== userId);
  const profilesById = await getParticipantProfilesById(participantIds);

  return conversations.map(conversation => {
    const participantIdsForConversation = conversation.participants || [];
    const otherParticipantIds = participantIdsForConversation.filter(participantId => participantId !== userId);
    const primaryParticipantId = otherParticipantIds[0] || participantIdsForConversation[0];

    if (!primaryParticipantId) {
      return conversation;
    }

    if (conversation.isGroup) {
      const visibleParticipantCount = otherParticipantIds.length || participantIdsForConversation.length;
      return {
        ...conversation,
        participant: {
          id: primaryParticipantId,
          fullName: `${visibleParticipantCount} ${visibleParticipantCount === 1 ? 'participant' : 'participants'}`,
          avatarUrl: profilesById.get(primaryParticipantId)?.avatar_url || undefined,
          status: 'offline' as const,
        },
      };
    }

    const profile = profilesById.get(primaryParticipantId);
    return {
      ...conversation,
      participant: {
        id: primaryParticipantId,
        fullName: profile ? getDisplayNameFromProfile(profile) : 'Connection',
        avatarUrl: profile?.avatar_url || undefined,
        status: 'offline' as const,
      },
    };
  });
};

const getUnreadCountsByConversation = async (
  conversationIds: string[],
  userId: string
): Promise<Map<string, number>> => {
  if (conversationIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) {
    console.warn('[Messaging] Unread conversation counts unavailable.', error);
    return new Map();
  }

  const counts = new Map<string, number>();
  (data || []).forEach((message: Record<string, any>) => {
    if (typeof message.conversation_id !== 'string') return;
    counts.set(message.conversation_id, (counts.get(message.conversation_id) || 0) + 1);
  });

  return counts;
};

export const messagingService = {
  getConversationsPage: async (
    userId: string,
    options?: { limit?: number; offset?: number; cursor?: string }
  ): Promise<PaginatedConversationsResult> => {
    const decodedCursor = decodeConversationCursor(options?.cursor);
    const limit = options?.limit ?? defaultConversationPageSize;
    const offset = options?.offset ?? 0;

    const conversationSelect = `
        conversation_id,
        conversations!inner (
          id,
          name,
          is_group,
          created_at,
          updated_at,
          conversation_participants (
            user_id,
            last_read_at
          ),
          messages (
            id,
            content,
            sender_id,
            created_at
          )
        )
      `;

    let query = decodedCursor
      ? supabase.from('conversation_participants').select(conversationSelect)
      : supabase.from('conversation_participants').select(conversationSelect, { count: 'exact' });

    query = query
      .eq('user_id', userId)
      .is('left_at', null)
      .order('updated_at', { referencedTable: 'conversations', ascending: false })
      .order('id', { referencedTable: 'conversations', ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: false });

    if (decodedCursor) {
      query = query
        .or(`updated_at.lt.${decodedCursor.updatedAt},and(updated_at.eq.${decodedCursor.updatedAt},id.lt.${decodedCursor.id})`, { referencedTable: 'conversations' });
    }

    query = query.limit(1, { referencedTable: 'messages' });

    if (decodedCursor) {
      query = query.range(0, limit);
    } else if (limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;

    const rawRows = data || [];
    const visibleRows = decodedCursor ? rawRows.slice(0, limit) : rawRows;
    const conversations = visibleRows
      .map(getEmbeddedConversation)
      .filter(Boolean)
      .map(mapConversationResponse);
    const unreadCounts = await getUnreadCountsByConversation(
      conversations.map(conversation => conversation.id),
      userId
    );
    const conversationsWithUnread = conversations.map(conversation => ({
      ...conversation,
      unreadCount: unreadCounts.get(conversation.id) || 0,
    }));
    const enrichedConversations = await enrichConversationsWithParticipants(
      conversationsWithUnread,
      userId
    );

    const total = decodedCursor ? null : typeof count === 'number' ? count : null;
    const hasNext = decodedCursor
      ? rawRows.length > limit
      : total !== null
        ? offset + conversations.length < total
        : conversations.length === limit;
    const lastConversation = enrichedConversations[enrichedConversations.length - 1];

    return {
      conversations: enrichedConversations,
      total,
      limit,
      offset,
      hasNext,
      nextCursor: hasNext && lastConversation ? encodeConversationCursor(lastConversation) : null,
    };
  },

  getConversations: async (userId: string): Promise<Conversation[]> => {
    const page = await messagingService.getConversationsPage(userId, {
      limit: defaultConversationPageSize,
      offset: 0
    });
    return page.conversations;
  },

  getMessagesPage: async (
    conversationId: string,
    userId: string,
    options?: { limit?: number; offset?: number; cursor?: string }
  ): Promise<PaginatedMessagesResult> => {
    const decodedCursor = decodeMessageCursor(options?.cursor);
    const limit = options?.limit ?? defaultMessagePageSize;
    const offset = options?.offset ?? 0;

    const messageSelect = `
        *,
        profiles:sender_id (
          id,
          full_name,
          avatar_url
        )
      `;
    let query = decodedCursor
      ? supabase.from('messages').select(messageSelect)
      : supabase.from('messages').select(messageSelect, { count: 'exact' });

    query = query
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (decodedCursor) {
      query = query
        .or(`created_at.lt.${decodedCursor.timestamp},and(created_at.eq.${decodedCursor.timestamp},id.lt.${decodedCursor.id})`)
        .limit(limit + 1);
    } else if (limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;

    const rawRows = data || [];
    const visibleRows = decodedCursor ? rawRows.slice(0, limit) : rawRows;
    const messages = visibleRows
      .map(mapMessageResponse)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const total = decodedCursor ? null : typeof count === 'number' ? count : null;
    const hasNext = decodedCursor
      ? rawRows.length > limit
      : total !== null
        ? offset + messages.length < total
        : messages.length === limit;
    const oldestMessage = messages[0];
    
    return {
      messages,
      total,
      limit,
      offset,
      hasNext,
      nextCursor: hasNext && oldestMessage ? encodeMessageCursor(oldestMessage) : null
    };
  },

  getMessages: async (conversationId: string, userId: string): Promise<Message[]> => {
    const page = await messagingService.getMessagesPage(conversationId, userId, {
      limit: defaultMessagePageSize,
      offset: 0
    });
    return page.messages;
  },

  sendMessage: async (message: Partial<Message>): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        content: message.content,
        message_type: message.messageType || 'TEXT',
        attachment_url: message.attachmentUrl || null,
        status: 'SENT'
      })
      .select(`
        *,
        profiles:sender_id (id, full_name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversationId);
    
    return mapMessageResponse(data);
  },

  markMessageAsRead: async (messageId: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .update({ 
        read_at: new Date().toISOString(),
        status: 'READ'
      })
      .eq('id', messageId);
    
    if (error) throw error;
  },

  markConversationMessagesAsRead: async (
    conversationId: string,
    userId: string
  ): Promise<{ readAt: string }> => {
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from('messages')
      .update({
        read_at: readAt,
        status: 'READ'
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: readAt })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (participantError) {
      console.warn('[Messaging] Participant read marker could not be updated.', participantError);
    }

    return { readAt };
  },

  createConversation: async (participantIds: string[], createdBy: string, isGroup: boolean = false): Promise<any> => {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        is_group: isGroup,
        created_by: createdBy
      })
      .select()
      .single();
    
    if (convError) throw convError;
    
    // Add participants
    const participants = participantIds.map(id => ({
      conversation_id: conversation.id,
      user_id: id
    }));
    
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants);
    
    if (partError) throw partError;
    
    return conversation;
  }
};
