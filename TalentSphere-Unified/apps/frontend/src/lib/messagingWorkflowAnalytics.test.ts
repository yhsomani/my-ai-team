import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordMessagingWorkflowAnalytics } from './messagingWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('messagingWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records conversation selection as an explicit task start', () => {
    recordMessagingWorkflowAnalytics({
      userId: 'user-1',
      action: 'conversation_selected',
      conversationId: 'conversation-1',
      unreadCount: 2,
      loadedConversationCount: 10,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'messaging',
      eventName: 'task_started',
      source: 'messaging_page',
      objectType: 'conversation',
      objectId: 'conversation-1',
      metadata: {
        action: 'conversation_selected',
        conversationId: 'conversation-1',
        messageType: undefined,
        suggestionId: undefined,
        hasText: false,
        hasAttachment: false,
        attachmentSource: undefined,
        fileTypeCategory: undefined,
        fileSizeBand: undefined,
        unreadCount: 2,
        visibleMessageCount: undefined,
        loadedConversationCount: 10,
        loadedMessageCount: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'messaging_workflow',
      },
    });
  });

  it('records reply suggestion insertion as a prefill decision without message text', () => {
    recordMessagingWorkflowAnalytics({
      action: 'reply_suggestion_inserted',
      conversationId: 'conversation-1',
      suggestionId: 'follow-up',
      visibleMessageCount: 5,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'workflow_prefill_used',
      objectType: 'reply_suggestion',
      objectId: 'conversation-1',
      metadata: expect.objectContaining({
        action: 'reply_suggestion_inserted',
        suggestionId: 'follow-up',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        text: expect.anything(),
        content: expect.anything(),
      }),
    }));
  });

  it('records message send success without message content or attachment URLs', () => {
    recordMessagingWorkflowAnalytics({
      action: 'message_sent',
      conversationId: 'conversation-1',
      messageType: 'FILE',
      hasText: true,
      hasAttachment: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'message',
      objectId: 'conversation-1',
      metadata: expect.objectContaining({
        action: 'message_sent',
        messageType: 'FILE',
        hasText: true,
        hasAttachment: true,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        attachmentUrl: expect.anything(),
        url: expect.anything(),
        messageText: expect.anything(),
      }),
    }));
  });

  it('records provider-backed attachment upload outcomes without filenames or URLs', () => {
    recordMessagingWorkflowAnalytics({
      action: 'attachment_upload_completed',
      conversationId: 'conversation-1',
      hasAttachment: true,
      attachmentSource: 'upload',
      fileTypeCategory: 'document',
      fileSizeBand: 'small',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'message_attachment',
      objectId: 'conversation-1',
      metadata: expect.objectContaining({
        action: 'attachment_upload_completed',
        attachmentSource: 'upload',
        fileTypeCategory: 'document',
        fileSizeBand: 'small',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        fileName: expect.anything(),
        filename: expect.anything(),
        attachmentUrl: expect.anything(),
        url: expect.anything(),
      }),
    }));
  });

  it('records read marking and failures with counts and error category', () => {
    recordMessagingWorkflowAnalytics({
      action: 'visible_messages_marked_read',
      conversationId: 'conversation-1',
      unreadCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'conversation',
      metadata: expect.objectContaining({
        action: 'visible_messages_marked_read',
        unreadCount: 3,
      }),
    }));

    vi.clearAllMocks();

    recordMessagingWorkflowAnalytics({
      action: 'visible_messages_mark_read_failed',
      conversationId: 'conversation-1',
      unreadCount: 3,
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      metadata: expect.objectContaining({
        action: 'visible_messages_mark_read_failed',
        errorCategory: 'network_error',
      }),
    }));
  });

  it('records explicit retry actions as error recovery', () => {
    recordMessagingWorkflowAnalytics({
      action: 'message_retry_clicked',
      conversationId: 'conversation-1',
      messageType: 'TEXT',
      hasText: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'error_recovery_clicked',
      objectType: 'message',
      metadata: expect.objectContaining({
        action: 'message_retry_clicked',
      }),
    }));
  });
});
