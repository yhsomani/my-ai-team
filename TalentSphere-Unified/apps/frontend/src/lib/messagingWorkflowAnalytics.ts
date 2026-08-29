import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { Message } from '../types/messaging';
import type {
  MessagingAttachmentFileSizeBand,
  MessagingAttachmentFileTypeCategory
} from './messagingAttachments';

export type MessagingWorkflowAnalyticsAction =
  | 'conversation_selected'
  | 'conversation_load_more_completed'
  | 'conversation_load_more_failed'
  | 'conversation_load_retry_clicked'
  | 'message_history_loaded'
  | 'message_history_failed'
  | 'message_history_retry_clicked'
  | 'visible_messages_marked_read'
  | 'visible_messages_mark_read_failed'
  | 'reply_suggestion_inserted'
  | 'attachment_field_opened'
  | 'attachment_field_cleared'
  | 'attachment_validation_failed'
  | 'attachment_upload_started'
  | 'attachment_upload_completed'
  | 'attachment_upload_failed'
  | 'message_sent'
  | 'message_send_failed'
  | 'message_retry_clicked';

interface MessagingWorkflowAnalyticsInput {
  userId?: string | null;
  action: MessagingWorkflowAnalyticsAction;
  conversationId?: string | null;
  messageType?: Message['messageType'];
  suggestionId?: string | null;
  hasText?: boolean;
  hasAttachment?: boolean;
  attachmentSource?: 'link' | 'upload';
  fileTypeCategory?: MessagingAttachmentFileTypeCategory;
  fileSizeBand?: MessagingAttachmentFileSizeBand;
  unreadCount?: number;
  visibleMessageCount?: number;
  loadedConversationCount?: number;
  loadedMessageCount?: number;
  errorCategory?: string;
}

const getEventName = (action: MessagingWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'conversation_load_retry_clicked':
    case 'message_history_retry_clicked':
    case 'message_retry_clicked':
      return 'error_recovery_clicked';
    case 'conversation_load_more_completed':
    case 'message_history_loaded':
    case 'visible_messages_marked_read':
    case 'attachment_upload_completed':
    case 'message_sent':
      return 'task_completed';
    case 'conversation_load_more_failed':
    case 'message_history_failed':
    case 'visible_messages_mark_read_failed':
    case 'attachment_validation_failed':
    case 'attachment_upload_failed':
    case 'message_send_failed':
      return 'task_failed';
    case 'reply_suggestion_inserted':
      return 'workflow_prefill_used';
    case 'attachment_field_cleared':
      return 'workflow_prefill_rejected';
    case 'conversation_selected':
    case 'attachment_field_opened':
    case 'attachment_upload_started':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: MessagingWorkflowAnalyticsAction) => {
  switch (action) {
    case 'message_sent':
    case 'message_send_failed':
    case 'message_retry_clicked':
      return 'message';
    case 'reply_suggestion_inserted':
      return 'reply_suggestion';
    case 'attachment_field_opened':
    case 'attachment_field_cleared':
    case 'attachment_validation_failed':
    case 'attachment_upload_started':
    case 'attachment_upload_completed':
    case 'attachment_upload_failed':
      return 'message_attachment';
    default:
      return 'conversation';
  }
};

export const recordMessagingWorkflowAnalytics = ({
  userId,
  action,
  conversationId,
  messageType,
  suggestionId,
  hasText,
  hasAttachment,
  attachmentSource,
  fileTypeCategory,
  fileSizeBand,
  unreadCount,
  visibleMessageCount,
  loadedConversationCount,
  loadedMessageCount,
  errorCategory,
}: MessagingWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'messaging',
    eventName: getEventName(action),
    source: 'messaging_page',
    objectType: getObjectType(action),
    objectId: conversationId || undefined,
    metadata: {
      action,
      conversationId,
      messageType,
      suggestionId,
      hasText: Boolean(hasText),
      hasAttachment: Boolean(hasAttachment),
      attachmentSource,
      fileTypeCategory,
      fileSizeBand,
      unreadCount,
      visibleMessageCount,
      loadedConversationCount,
      loadedMessageCount,
      errorCategory,
      userControl: 'explicit',
      mutationScope: 'messaging_workflow',
    },
  });
};
