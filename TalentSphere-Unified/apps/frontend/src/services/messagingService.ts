import { supabase } from '../lib/supabaseClient';
import { Message, Conversation } from '../types/messaging';

export const messagingService = {
  getConversations: async (userId: string): Promise<Conversation[]> => {
    // First get user's conversation IDs
    const { data: participantData, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    if (partError) throw partError;
    
    const conversationIds = (participantData || []).map(p => p.conversation_id);
    
    if (conversationIds.length === 0) {
      return [];
    }
    
    // Get conversations with details
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
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
      `)
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(conv => ({
      id: conv.id,
      isGroup: conv.is_group,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      participants: conv.conversation_participants.map((p: any) => p.user_id),
      lastMessage: conv.messages?.[0] ? {
        id: conv.messages[0].id,
        content: conv.messages[0].content,
        senderId: conv.messages[0].sender_id,
        timestamp: conv.messages[0].created_at
      } : null
    }));
  },

  getMessages: async (conversationId: string, userId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      messageType: (msg.message_type as 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO') || 'TEXT',
      attachmentUrl: msg.attachment_url,
      status: (msg.status as 'SENT' | 'DELIVERED' | 'READ') || 'SENT',
      timestamp: msg.created_at,
      readAt: msg.read_at,
      sender: msg.profiles ? {
        id: msg.profiles.id,
        fullName: msg.profiles.full_name,
        avatarUrl: msg.profiles.avatar_url
      } : undefined
    }));
  },

  sendMessage: async (message: Partial<Message>): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        content: message.content,
        message_type: message.messageType || 'TEXT',
        attachment_url: message.attachmentUrl,
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
    
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      content: data.content,
      messageType: (data.message_type as 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO') || 'TEXT',
      attachmentUrl: data.attachment_url,
      status: (data.status as 'SENT' | 'DELIVERED' | 'READ') || 'SENT',
      timestamp: data.created_at,
      readAt: data.read_at,
      sender: data.profiles ? {
        id: data.profiles.id,
        fullName: data.profiles.full_name,
        avatarUrl: data.profiles.avatar_url
      } : undefined
    };
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
