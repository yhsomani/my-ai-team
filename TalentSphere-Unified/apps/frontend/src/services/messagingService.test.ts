import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagingService } from './messagingService';
import { supabase } from '../lib/supabaseClient';

// Mock the supabase client
vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('messagingService', () => {
  let mockSelect: any;
  let mockEq: any;
  let mockIn: any;
  let mockOrder: any;
  let mockSingle: any;
  let mockInsert: any;
  let mockUpdate: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockOrder = vi.fn();
    mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder, single: mockSingle });

    mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      single: mockSingle,
    });

    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    // Some insert calls use `.select()` immediately, while others just return directly
    // The easiest way is to mock an object that works as both a promise AND has the chained methods.
    mockInsert = vi.fn().mockImplementation(() => {
      // In createConversation:
      // const { data } = await ...insert({...}).select().single(); -> requires .select()
      // ... await ...insert(participants); -> requires direct awating
      //
      // To satisfy both, we'll make mockInsert return something that has select(),
      // but if we directly mock the Promise response, we'll do it by spying on `mockInsert` directly.
      const ret = {
        select: mockSelect,
        then: function(resolve: any, reject: any) {
           // Provide a default resolution if not explicitly mocked with mockResolvedValueOnce
           resolve({ error: null });
        }
      };
      return ret;
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
  });

  describe('getConversations', () => {
    it('returns empty array if user has no conversations', async () => {
      mockEq.mockResolvedValueOnce({ data: [], error: null });

      const result = await messagingService.getConversations('user-1');

      expect(result).toEqual([]);
      expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
      expect(mockSelect).toHaveBeenCalledWith('conversation_id');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('returns conversations with mapped participants and last message', async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ conversation_id: 'conv-1' }, { conversation_id: 'conv-2' }],
        error: null,
      });

      mockOrder.mockResolvedValueOnce({
        data: [
          {
            id: 'conv-1',
            is_group: false,
            created_at: '2023-01-01',
            updated_at: '2023-01-02',
            conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
            messages: [
              {
                id: 'msg-1',
                content: 'Hello',
                sender_id: 'user-2',
                created_at: '2023-01-02',
              },
            ],
          },
          {
            id: 'conv-2',
            is_group: true,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
            conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-3' }],
            messages: [],
          },
        ],
        error: null,
      });

      const result = await messagingService.getConversations('user-1');

      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(mockIn).toHaveBeenCalledWith('id', ['conv-1', 'conv-2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'conv-1',
        isGroup: false,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        participants: ['user-1', 'user-2'],
        lastMessage: {
          id: 'msg-1',
          content: 'Hello',
          senderId: 'user-2',
          timestamp: '2023-01-02',
          status: 'SENT',
        },
      });
      expect(result[1]).toEqual({
        id: 'conv-2',
        isGroup: true,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        participants: ['user-1', 'user-3'],
        lastMessage: null,
      });
    });

    it('throws error if fetching conversation participants fails', async () => {
      const dbError = new Error('Database error');
      mockEq.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(messagingService.getConversations('user-1')).rejects.toThrow('Database error');
    });

    it('throws error if fetching conversations fails', async () => {
      mockEq.mockResolvedValueOnce({ data: [{ conversation_id: 'conv-1' }], error: null });
      const dbError = new Error('Database error 2');
      mockOrder.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(messagingService.getConversations('user-1')).rejects.toThrow('Database error 2');
    });
  });

  describe('getMessages', () => {
    it('returns formatted messages for a conversation', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'Hello',
            message_type: 'TEXT',
            status: 'DELIVERED',
            created_at: '2023-01-02T10:00:00Z',
            profiles: {
              id: 'user-2',
              full_name: 'John Doe',
              avatar_url: 'avatar.jpg',
            },
          },
          {
            id: 'msg-2',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'No profiles test',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T10:05:00Z',
            profiles: null,
          }
        ],
        error: null,
      });

      const result = await messagingService.getMessages('conv-1', 'user-1');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'conv-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Hello',
        messageType: 'TEXT',
        attachmentUrl: undefined,
        status: 'DELIVERED',
        timestamp: '2023-01-02T10:00:00Z',
        readAt: undefined,
        sender: {
          id: 'user-2',
          fullName: 'John Doe',
          avatarUrl: 'avatar.jpg',
          status: 'offline',
        },
      });
      expect(result[1].sender).toBeUndefined();
    });

    it('throws an error if fetching messages fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: new Error('Msg error') });

      await expect(messagingService.getMessages('conv-1', 'user-1')).rejects.toThrow('Msg error');
    });
  });

  describe('sendMessage', () => {
    it('sends a message and updates conversation updated_at', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'new-msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          content: 'Hi there',
          message_type: 'TEXT',
          status: 'SENT',
          created_at: '2023-01-03T00:00:00Z',
          profiles: {
            id: 'user-1',
            full_name: 'Me',
            avatar_url: 'my-avatar.jpg',
          },
        },
        error: null,
      });

      mockEq.mockResolvedValueOnce({ error: null });

      const msg = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hi there',
      };

      const result = await messagingService.sendMessage(msg);

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith({
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hi there',
        message_type: 'TEXT',
        attachment_url: null,
        status: 'SENT',
      });
      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(mockUpdate).toHaveBeenCalledWith({ updated_at: expect.any(String) });
      expect(mockEq).toHaveBeenCalledWith('id', 'conv-1');

      expect(result.id).toBe('new-msg-1');
      expect(result.content).toBe('Hi there');
      expect(result.sender?.fullName).toBe('Me');
    });

    it('throws error if insert fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') });

      await expect(messagingService.sendMessage({ content: 'test' })).rejects.toThrow('Insert failed');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('markMessageAsRead', () => {
    it('updates read_at and status for a message', async () => {
      mockEq.mockResolvedValueOnce({ error: null });

      await messagingService.markMessageAsRead('msg-1');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockUpdate).toHaveBeenCalledWith({
        read_at: expect.any(String),
        status: 'READ',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'msg-1');
    });

    it('throws error if update fails', async () => {
      mockEq.mockResolvedValueOnce({ error: new Error('Update failed') });

      await expect(messagingService.markMessageAsRead('msg-1')).rejects.toThrow('Update failed');
    });
  });

  describe('createConversation', () => {
    it('creates a new conversation and adds participants', async () => {
      // Create conversation
      mockSingle.mockResolvedValueOnce({
        data: { id: 'new-conv-1', is_group: false, created_by: 'user-1' },
        error: null,
      });

      // Override the `.then` logic for the participant insert
      mockInsert.mockImplementationOnce(() => ({
        select: mockSelect,
      })).mockImplementationOnce(() => {
        return Promise.resolve({ error: null });
      });

      const result = await messagingService.createConversation(['user-1', 'user-2'], 'user-1');

      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(mockInsert).toHaveBeenCalledWith({ is_group: false, created_by: 'user-1' });

      expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
      expect(mockInsert).toHaveBeenCalledWith([
        { conversation_id: 'new-conv-1', user_id: 'user-1' },
        { conversation_id: 'new-conv-1', user_id: 'user-2' },
      ]);

      expect(result).toEqual({ id: 'new-conv-1', is_group: false, created_by: 'user-1' });
    });

    it('throws error if creating conversation fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Conv create failed') });

      await expect(messagingService.createConversation(['user-1', 'user-2'], 'user-1')).rejects.toThrow('Conv create failed');
    });

    it('throws error if adding participants fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'new-conv-1', is_group: false, created_by: 'user-1' },
        error: null,
      });
      // Participant insert
      mockInsert.mockImplementationOnce(() => ({
        select: mockSelect,
      })).mockImplementationOnce(() => {
        return Promise.resolve({ error: new Error('Participants insert failed') });
      });

      await expect(messagingService.createConversation(['user-1', 'user-2'], 'user-1')).rejects.toThrow('Participants insert failed');
    });
  });
});
