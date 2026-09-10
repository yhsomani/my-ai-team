import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagingService } from './messagingService';
import { supabase } from '../lib/supabaseClient';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

// Mock the supabase client
vi.mock('../lib/supabaseClient', () => {
  return {
    supabase: mockSupabaseClient,
    typedSupabase: mockSupabaseClient,
  };
});

describe('messagingService', () => {
  let mockSelect: any;
  let mockEq: any;
  let mockIn: any;
  let mockOrder: any;
  let mockOr: any;
  let mockNeq: any;
  let mockRange: any;
  let mockIs: any;
  let mockLimit: any;
  let mockSingle: any;
  let mockInsert: any;
  let mockUpdate: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockRange = vi.fn();
    mockLimit = vi.fn().mockReturnValue({ range: mockRange });
    mockOrder = vi.fn();
    mockOr = vi.fn().mockReturnValue({ limit: mockLimit, range: mockRange });
    mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr });
    mockIs = vi.fn().mockReturnValue({
      order: mockOrder,
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    });
    mockEq = vi.fn();
    mockNeq = vi.fn();
    mockNeq.mockReturnValue({ is: mockIs, eq: mockEq });
    mockIn = vi.fn().mockReturnValue({
      order: mockOrder,
      neq: mockNeq,
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    });
    mockEq.mockReturnValue({ is: mockIs, order: mockOrder, single: mockSingle, or: mockOr, neq: mockNeq, eq: mockEq });

    mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      neq: mockNeq,
      order: mockOrder,
      or: mockOr,
      limit: mockLimit,
      range: mockRange,
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
      mockRange.mockResolvedValueOnce({ data: [], error: null, count: 0 });

      const result = await messagingService.getConversations('user-1');

      expect(result).toEqual([]);
      expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
      expect(mockSelect).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockIs).toHaveBeenCalledWith('left_at', null);
      expect(mockOrder).toHaveBeenCalledWith('updated_at', { referencedTable: 'conversations', ascending: false });
      expect(mockOrder).toHaveBeenCalledWith('id', { referencedTable: 'conversations', ascending: false });
      expect(mockOrder).toHaveBeenCalledWith('created_at', { referencedTable: 'messages', ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(1, { referencedTable: 'messages' });
      expect(mockRange).toHaveBeenCalledWith(0, 19);
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('returns paginated conversations with mapped participants and last message', async () => {
      mockIs
        .mockReturnValueOnce({ order: mockOrder })
        .mockResolvedValueOnce({
          data: [
            { id: 'unread-1', conversation_id: 'conv-1' },
            { id: 'unread-2', conversation_id: 'conv-1' },
            { id: 'unread-3', conversation_id: 'conv-2' },
          ],
          error: null,
        });
      mockIn
        .mockReturnValueOnce({ order: mockOrder, neq: mockNeq })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'user-2',
              full_name: 'Ada Lovelace',
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              avatar_url: 'ada.png',
            },
            {
              id: 'user-3',
              full_name: 'Grace Hopper',
              first_name: 'Grace',
              last_name: 'Hopper',
              email: 'grace@example.com',
              avatar_url: 'grace.png',
            },
          ],
          error: null,
        });

      mockRange.mockResolvedValueOnce({
        data: [
          {
            conversation_id: 'conv-1',
            conversations: {
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
          },
          {
            conversation_id: 'conv-2',
            conversations: {
              id: 'conv-2',
              is_group: true,
              created_at: '2023-01-01',
              updated_at: '2023-01-01',
              conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-3' }],
              messages: [],
            },
          },
        ],
        error: null,
        count: 4,
      });

      const result = await messagingService.getConversationsPage('user-1', {
        limit: 2,
        offset: 0,
      });

      expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockIs).toHaveBeenCalledWith('left_at', null);
      expect(mockRange).toHaveBeenCalledWith(0, 1);
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockSelect).toHaveBeenCalledWith('id, conversation_id');
      expect(mockIn).toHaveBeenCalledWith('conversation_id', ['conv-1', 'conv-2']);
      expect(mockNeq).toHaveBeenCalledWith('sender_id', 'user-1');
      expect(mockIs).toHaveBeenCalledWith('read_at', null);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id, full_name, first_name, last_name, email, avatar_url');
      expect(mockIn).toHaveBeenCalledWith('id', ['user-2', 'user-3']);

      expect(result.total).toBe(4);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0]).toEqual({
        id: 'conv-1',
        isGroup: false,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        participants: ['user-1', 'user-2'],
        participant: {
          id: 'user-2',
          fullName: 'Ada Lovelace',
          avatarUrl: 'ada.png',
          status: 'offline',
        },
        lastMessage: {
          id: 'msg-1',
          content: 'Hello',
          senderId: 'user-2',
          timestamp: '2023-01-02',
          status: 'SENT',
        },
        unreadCount: 2,
      });
      expect(result.conversations[1]).toEqual({
        id: 'conv-2',
        isGroup: true,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        participants: ['user-1', 'user-3'],
        participant: {
          id: 'user-3',
          fullName: '1 participant',
          avatarUrl: 'grace.png',
          status: 'offline',
        },
        lastMessage: undefined,
        unreadCount: 1,
      });
    });

    it('preserves array return shape for getConversations', async () => {
      mockRange.mockResolvedValueOnce({
        data: [
          {
            conversation_id: 'conv-1',
            conversations: {
              id: 'conv-1',
              is_group: false,
              created_at: '2023-01-01',
              updated_at: '2023-01-02',
              conversation_participants: [{ user_id: 'user-1' }],
              messages: [],
            },
          },
        ],
        error: null,
        count: 1,
      });

      const result = await messagingService.getConversations('user-1');

      expect(Array.isArray(result)).toBe(true);
      expect(mockRange).toHaveBeenCalledWith(0, 19);
      expect(result[0].id).toBe('conv-1');
    });

    it('uses cursor lookahead for stable older conversation pagination', async () => {
      mockRange
        .mockResolvedValueOnce({
          data: [
            {
              conversation_id: 'conv-2',
              conversations: {
                id: 'conv-2',
                is_group: false,
                created_at: '2023-01-01',
                updated_at: '2023-01-03',
                conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
                messages: [
                  {
                    id: 'msg-2',
                    content: 'Newest conversation',
                    sender_id: 'user-2',
                    created_at: '2023-01-03',
                  },
                ],
              },
            },
          ],
          error: null,
          count: 3,
        })
        .mockResolvedValueOnce({
          data: [
            {
              conversation_id: 'conv-1',
              conversations: {
                id: 'conv-1',
                is_group: false,
                created_at: '2023-01-01',
                updated_at: '2023-01-02',
                conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-3' }],
                messages: [
                  {
                    id: 'msg-1',
                    content: 'Older conversation',
                    sender_id: 'user-3',
                    created_at: '2023-01-02',
                  },
                ],
              },
            },
            {
              conversation_id: 'conv-overflow',
              conversations: {
                id: 'conv-overflow',
                is_group: true,
                created_at: '2023-01-01',
                updated_at: '2023-01-01',
                conversation_participants: [{ user_id: 'user-1' }, { user_id: 'user-4' }],
                messages: [],
              },
            },
          ],
          error: null,
        });

      const firstPage = await messagingService.getConversationsPage('user-1', {
        limit: 1,
        offset: 0,
      });
      const result = await messagingService.getConversationsPage('user-1', {
        limit: 1,
        offset: 1,
        cursor: firstPage.nextCursor || undefined,
      });

      expect(mockSelect).toHaveBeenLastCalledWith(expect.any(String));
      expect(mockOr).toHaveBeenCalledWith(
        'updated_at.lt.2023-01-03,and(updated_at.eq.2023-01-03,id.lt.conv-2)',
        { referencedTable: 'conversations' }
      );
      expect(mockRange).toHaveBeenCalledWith(0, 1);
      expect(result.total).toBeNull();
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].id).toBe('conv-1');
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('throws error if fetching conversations fails', async () => {
      const dbError = new Error('Database error');
      mockRange.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(messagingService.getConversations('user-1')).rejects.toThrow('Database error');
    });
  });

  describe('getMessages', () => {
    it('returns paginated formatted messages for a conversation', async () => {
      mockRange.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-2',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'No profiles test',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T10:05:00Z',
            profiles: null,
          },
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
          }
        ],
        error: null,
        count: 3,
      });

      const result = await messagingService.getMessagesPage('conv-1', 'user-1', {
        limit: 2,
        offset: 0,
      });

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockSelect).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'conv-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockOrder).toHaveBeenCalledWith('id', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 1);

      expect(result.total).toBe(3);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
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
      expect(result.messages[1].sender).toBeUndefined();
    });

    it('uses cursor lookahead for stable older message pagination', async () => {
      mockRange.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-2',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'Newest',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T10:05:00Z',
            profiles: null,
          },
        ],
        error: null,
        count: 3,
      });
      mockLimit.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'Older',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T10:00:00Z',
            profiles: null,
          },
          {
            id: 'msg-overflow',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'Overflow',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T09:55:00Z',
            profiles: null,
          },
        ],
        error: null,
      });

      const firstPage = await messagingService.getMessagesPage('conv-1', 'user-1', {
        limit: 1,
        offset: 0,
      });
      const result = await messagingService.getMessagesPage('conv-1', 'user-1', {
        limit: 1,
        offset: 1,
        cursor: firstPage.nextCursor || undefined,
      });

      expect(mockSelect).toHaveBeenLastCalledWith(expect.any(String));
      expect(mockOr).toHaveBeenCalledWith('created_at.lt.2023-01-02T10:05:00Z,and(created_at.eq.2023-01-02T10:05:00Z,id.lt.msg-2)');
      expect(mockLimit).toHaveBeenCalledWith(2);
      expect(result.total).toBeNull();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-1');
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('preserves array return shape for getMessages', async () => {
      mockRange.mockResolvedValueOnce({
        data: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'user-2',
            content: 'Hello',
            message_type: 'TEXT',
            status: 'SENT',
            created_at: '2023-01-02T10:00:00Z',
            profiles: null,
          }
        ],
        error: null,
        count: 1,
      });

      const result = await messagingService.getMessages('conv-1', 'user-1');

      expect(Array.isArray(result)).toBe(true);
      expect(mockRange).toHaveBeenCalledWith(0, 49);
      expect(result[0].id).toBe('msg-1');
    });

    it('throws an error if fetching messages fails', async () => {
      mockRange.mockResolvedValueOnce({ data: null, error: new Error('Msg error') });

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

      await expect(messagingService.sendMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'test'
      })).rejects.toThrow('Insert failed');

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

    it('marks incoming conversation messages read and updates the participant marker', async () => {
      await messagingService.markConversationMessagesAsRead('conv-1', 'user-1');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(mockUpdate).toHaveBeenNthCalledWith(1, {
        read_at: expect.any(String),
        status: 'READ',
      });
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'conv-1');
      expect(mockNeq).toHaveBeenCalledWith('sender_id', 'user-1');
      expect(mockIs).toHaveBeenCalledWith('read_at', null);
      expect(supabase.from).toHaveBeenCalledWith('conversation_participants');
      expect(mockUpdate).toHaveBeenNthCalledWith(2, {
        last_read_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('throws if conversation messages cannot be marked read', async () => {
      mockIs.mockResolvedValueOnce({ error: new Error('Read failed') });

      await expect(messagingService.markConversationMessagesAsRead('conv-1', 'user-1')).rejects.toThrow('Read failed');

      expect(supabase.from).not.toHaveBeenCalledWith('conversation_participants');
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
