import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, ArrowLeft, CheckCheck, ChevronUp, Clock, ExternalLink, MessageSquare, Paperclip, Search, Send, Phone, RotateCcw, Sparkles, Video, MoreVertical, UploadCloud, X } from 'lucide-react';
import { typedSupabase as supabase } from '../../lib/supabaseClient';
import { messageReceived } from '../../store/slices/messagingSlice';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchConversations, fetchMessages, loadMoreConversations, loadOlderMessages, markConversationMessagesRead, setActiveConversation, sendMessage, selectAllConversations } from '../../store/slices/messagingSlice';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { SourceStatusBadge } from '../../components/shared/SourceStatusBadge';
import type { Conversation, Message } from '../../types/messaging';
import {
  getAttachmentFallbackContent,
  getAttachmentFileSizeBand,
  getAttachmentFileTypeCategory,
  getAttachmentLabel,
  inferAttachmentMessageType,
  isImageAttachment,
  normalizeAttachmentUrl,
  shouldHideAttachmentFallbackContent,
  validateMessageAttachmentFile,
} from '../../lib/messagingAttachments';
import { buildMessagingReplySuggestions, type MessagingReplySuggestion } from '../../lib/messagingReplySuggestions';
import { recordMessagingWorkflowAnalytics } from '../../lib/messagingWorkflowAnalytics';
import { fileUploadService } from '../../services/fileUploadService';

const mapRealtimeMessage = (row: Record<string, any>): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  content: row.content,
  messageType: row.message_type || 'TEXT',
  attachmentUrl: row.attachment_url || undefined,
  status: row.status || 'SENT',
  timestamp: row.created_at,
  readAt: row.read_at || undefined,
});

type LocalMessage = Message & {
  localStatus?: 'sending' | 'failed';
};

const messagingPanelClassName = 'surface-panel p-3';
const messagingInsetClassName = 'rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-3';
const messagingComposerPanelClassName = 'rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/70 p-3';
const conversationLoadFailureMessage = 'Conversation data did not respond. Retry to reload conversation list, unread counts, and recent activity.';
const messageHistoryLoadFailureMessage = 'Message history did not respond. Retry to reload the selected conversation without sending a message.';
const olderMessagesLoadFailureMessage = 'Older messages did not respond. Retry to reload previous thread history without changing the conversation.';
const messagingRealtimeActionFlags = {
  voiceCalls: false,
  videoCalls: false,
  moreActions: false,
};

const getParticipantInitials = (name?: string) => {
  const initials = (name || 'User')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'U';
};

const getTimestampMs = (value?: string | Date) => {
  if (!value) return 0;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatMessageTime = (value?: string | Date) => {
  const timestamp = getTimestampMs(value);
  if (!timestamp) return 'Time unavailable';

  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullTimestamp = (value?: string | Date) => {
  const timestamp = getTimestampMs(value);
  if (!timestamp) return 'Time unavailable';
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getConversationAccessibleLabel = (conversation: Conversation) => {
  const participantName = conversation.participant?.fullName || 'Unknown contact';
  const participantStatus = conversation.participant?.status
    ? `Status: ${conversation.participant.status.charAt(0).toUpperCase()}${conversation.participant.status.slice(1)}.`
    : 'Status unavailable.';
  const unreadCount = conversation.unreadCount || 0;
  const unreadLabel = unreadCount > 0
    ? `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`
    : 'No unread messages';
  const lastMessageLabel = conversation.lastMessage?.content
    ? `Last message: ${conversation.lastMessage.content}`
    : 'No messages yet';

  return `Open conversation with ${participantName}. ${unreadLabel}. ${lastMessageLabel}. ${participantStatus}`;
};

const getMessagingWorkflowErrorCategory = (error: unknown, fallback: string) => (
  error instanceof Error ? error.name : fallback
);

const MessagingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const conversations = useAppSelector(selectAllConversations);
  const {
    activeConversationId,
    messages,
    conversationTotal,
    conversationPageSize,
    hasMoreConversations,
    conversationNextCursor,
    messageTotal,
    messagePageSize,
    hasOlderMessages,
    messageNextCursor,
    messageHistoryStatus,
    messageHistoryError,
    status
  } = useAppSelector((state) => state.messaging);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [sendFeedback, setSendFeedback] = useState('');
  const [conversationFeedback, setConversationFeedback] = useState('');
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [showAttachmentField, setShowAttachmentField] = useState(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [attachmentSource, setAttachmentSource] = useState<'link' | 'upload' | null>(null);
  const [attachmentUploadStatus, setAttachmentUploadStatus] = useState<'idle' | 'uploading' | 'ready' | 'failed'>('idle');
  const [attachmentUploadFeedback, setAttachmentUploadFeedback] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentUrlInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const visibleConversationIds = useMemo(
    () => conversations.map(conversation => conversation.id).filter(Boolean).sort(),
    [conversations]
  );
  const visibleConversationSubscriptionKey = visibleConversationIds.join(',');
  const normalizedAttachmentUrl = useMemo(
    () => normalizeAttachmentUrl(attachmentUrlInput),
    [attachmentUrlInput]
  );
  const hasAttachmentDraft = attachmentUrlInput.trim().length > 0;
  const attachmentDraftInvalid = hasAttachmentDraft && !normalizedAttachmentUrl;

  useEffect(() => {
    if (status === 'idle' && user) {
      dispatch(fetchConversations(user.id));
    }
  }, [dispatch, status, user]);

  // Real-time listener setup
  useEffect(() => {
    const conversationIds = visibleConversationSubscriptionKey.split(',').filter(Boolean);
    if (conversationIds.length === 0) {
      setRealtimeStatus('idle');
      return;
    }

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`public:messages:visible-conversations:${user?.id || 'anonymous'}`);

    conversationIds.forEach(conversationId => {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        dispatch(messageReceived({
          message: mapRealtimeMessage(payload.new as Record<string, any>),
          currentUserId: user?.id,
        }));
      });
    });

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        return;
      }

      if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT' || subscriptionStatus === 'CLOSED') {
        setRealtimeStatus('disconnected');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch, visibleConversationSubscriptionKey, user?.id]);

  useEffect(() => {
    if (activeConversationId && user) {
      dispatch(fetchMessages({ conversationId: activeConversationId, userId: user.id }));
      setLocalMessages([]);
      setSendFeedback('');
      setAttachmentUrlInput('');
      setAttachmentSource(null);
      setAttachmentUploadStatus('idle');
      setAttachmentUploadFeedback('');
      setShowAttachmentField(false);
    }
  }, [dispatch, activeConversationId, user]);

  const focusAttachmentUrlInput = () => {
    window.requestAnimationFrame(() => attachmentUrlInputRef.current?.focus());
  };

  const filteredConvos = conversations.filter(c =>
    (c.participant?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeConvo = conversations.find(c => c.id === activeConversationId);
  const visibleMessages = useMemo<LocalMessage[]>(() => {
    const localIds = new Set(localMessages.map(message => message.id));
    return [
      ...messages.filter(message => !localIds.has(message.id)),
      ...localMessages
    ].sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp));
  }, [localMessages, messages]);
  const lastActivityTimestamp = activeConvo?.lastMessage?.timestamp || activeConvo?.updatedAt || activeConvo?.createdAt;
  const visibleIncomingUnreadCount = useMemo(() => (
    user?.id
      ? visibleMessages.filter(message => (
        message.senderId !== user.id &&
        !message.readAt &&
        message.status !== 'READ' &&
        !message.localStatus
      )).length
      : 0
  ), [user?.id, visibleMessages]);
  const replySuggestions = useMemo(() => buildMessagingReplySuggestions({
    messages: visibleMessages,
    currentUserId: user?.id,
  }), [user?.id, visibleMessages]);

  const handleSelectConversation = (conversationId: string) => {
    const selectedConversation = conversations.find(conversation => conversation.id === conversationId);

    recordMessagingWorkflowAnalytics({
      userId: user?.id,
      action: 'conversation_selected',
      conversationId,
      unreadCount: selectedConversation?.unreadCount || 0,
      loadedConversationCount: conversations.length,
    });
    dispatch(setActiveConversation(conversationId));
    setShowMobileConversations(false);
  };

  const retryLoadConversations = () => {
    if (!user?.id) return;
    recordMessagingWorkflowAnalytics({
      userId: user.id,
      action: 'conversation_load_retry_clicked',
      loadedConversationCount: conversations.length,
    });
    setConversationFeedback('');
    dispatch(fetchConversations(user.id));
  };

  const handleLoadMoreConversations = async () => {
    if (!user?.id || status === 'loadingMore') return;

    try {
      const page = await dispatch(loadMoreConversations({
        userId: user.id,
        offset: conversations.length,
        limit: conversationPageSize,
        cursor: conversationNextCursor
      })).unwrap();
      setConversationFeedback('');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'conversation_load_more_completed',
        loadedConversationCount: conversations.length + page.conversations.length,
      });
    } catch (error) {
      setConversationFeedback('More conversations could not load. Retry available.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'conversation_load_more_failed',
        loadedConversationCount: conversations.length,
        errorCategory: getMessagingWorkflowErrorCategory(error, 'conversation_load_more_failed'),
      });
    }
  };

  const retryLoadMessages = () => {
    if (!activeConversationId || !user?.id) return;
    recordMessagingWorkflowAnalytics({
      userId: user.id,
      action: 'message_history_retry_clicked',
      conversationId: activeConversationId,
      loadedMessageCount: messages.length,
    });
    dispatch(fetchMessages({ conversationId: activeConversationId, userId: user.id, limit: messagePageSize }));
  };

  const handleLoadOlderMessages = async () => {
    if (!activeConversationId || !user?.id || messageHistoryStatus === 'loadingMore') return;

    try {
      const page = await dispatch(loadOlderMessages({
        conversationId: activeConversationId,
        userId: user.id,
        offset: messages.length,
        limit: messagePageSize,
        cursor: messageNextCursor
      })).unwrap();
      setSendFeedback('Older messages loaded.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'message_history_loaded',
        conversationId: activeConversationId,
        loadedMessageCount: messages.length + page.messages.length,
      });
    } catch (error) {
      setSendFeedback('Older messages could not load. Retry available.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'message_history_failed',
        conversationId: activeConversationId,
        loadedMessageCount: messages.length,
        errorCategory: getMessagingWorkflowErrorCategory(error, 'message_history_load_failed'),
      });
    }
  };

  const handleMarkVisibleRead = async () => {
    if (!activeConversationId || !user?.id || visibleIncomingUnreadCount === 0 || isMarkingRead) return;

    setIsMarkingRead(true);
    try {
      await dispatch(markConversationMessagesRead({
        conversationId: activeConversationId,
        userId: user.id,
      })).unwrap();
      setSendFeedback(`${visibleIncomingUnreadCount} visible ${visibleIncomingUnreadCount === 1 ? 'message' : 'messages'} marked read.`);
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'visible_messages_marked_read',
        conversationId: activeConversationId,
        unreadCount: visibleIncomingUnreadCount,
        visibleMessageCount: visibleMessages.length,
      });
    } catch (error) {
      setSendFeedback('Visible messages could not be marked read. Retry available.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'visible_messages_mark_read_failed',
        conversationId: activeConversationId,
        unreadCount: visibleIncomingUnreadCount,
        visibleMessageCount: visibleMessages.length,
        errorCategory: getMessagingWorkflowErrorCategory(error, 'mark_visible_read_failed'),
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const sendMessageWithFeedback = async (
    content: string,
    existingLocalId?: string,
    attachmentUrl?: string,
    messageType?: Message['messageType'],
    messageAttachmentSource?: 'link' | 'upload'
  ) => {
    const normalizedUrl = normalizeAttachmentUrl(attachmentUrl);
    if ((attachmentUrl && !normalizedUrl) || (!content.trim() && !normalizedUrl) || !activeConversationId || !user?.id) return;

    const outgoingMessageType = normalizedUrl
      ? (messageType && messageType !== 'TEXT' ? messageType : inferAttachmentMessageType(normalizedUrl))
      : 'TEXT';
    const outgoingContent = content.trim() || (normalizedUrl ? getAttachmentFallbackContent(normalizedUrl) : '');

    const localId = existingLocalId || `local-${Date.now()}`;
    const optimisticMessage: LocalMessage = {
      id: localId,
      conversationId: activeConversationId,
      senderId: user.id,
      content: outgoingContent,
      messageType: outgoingMessageType,
      attachmentUrl: normalizedUrl || undefined,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      localStatus: 'sending'
    };

    setSendFeedback('Sending message...');
    setLocalMessages(prev => {
      const withoutExisting = prev.filter(message => message.id !== localId);
      return [...withoutExisting, optimisticMessage];
    });

    try {
      await dispatch(sendMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content: outgoingContent,
        messageType: outgoingMessageType,
        attachmentUrl: normalizedUrl || undefined,
      })).unwrap();
      setLocalMessages(prev => prev.filter(message => message.id !== localId));
      setSendFeedback('Message sent.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'message_sent',
        conversationId: activeConversationId,
        messageType: outgoingMessageType,
        hasText: Boolean(content.trim()),
        hasAttachment: Boolean(normalizedUrl),
        attachmentSource: normalizedUrl ? (messageAttachmentSource || 'link') : undefined,
        visibleMessageCount: visibleMessages.length,
      });
    } catch (error) {
      setLocalMessages(prev => prev.map(message => (
        message.id === localId ? { ...message, localStatus: 'failed' } : message
      )));
      setSendFeedback('Message failed to send. Retry available.');
      recordMessagingWorkflowAnalytics({
        userId: user.id,
        action: 'message_send_failed',
        conversationId: activeConversationId,
        messageType: outgoingMessageType,
        hasText: Boolean(content.trim()),
        hasAttachment: Boolean(normalizedUrl),
        attachmentSource: normalizedUrl ? (messageAttachmentSource || 'link') : undefined,
        visibleMessageCount: visibleMessages.length,
        errorCategory: getMessagingWorkflowErrorCategory(error, 'message_send_failed'),
      });
    }
  };

  const handleSendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = messageText.trim();
    if (attachmentDraftInvalid) {
      setSendFeedback('Attachment link must be a valid http or https URL.');
      recordMessagingWorkflowAnalytics({
        userId: user?.id,
        action: 'attachment_validation_failed',
        conversationId: activeConversationId,
        hasText: Boolean(content),
        hasAttachment: true,
        attachmentSource: attachmentSource || 'link',
        visibleMessageCount: visibleMessages.length,
        errorCategory: 'invalid_attachment_url',
      });
      return;
    }

    if (!content && !normalizedAttachmentUrl) return;

    const attachmentUrl = normalizedAttachmentUrl || undefined;
    const messageType = attachmentUrl ? inferAttachmentMessageType(attachmentUrl) : 'TEXT';
    const messageAttachmentSource = attachmentUrl ? (attachmentSource || 'link') : undefined;
    setMessageText('');
    setAttachmentUrlInput('');
    setAttachmentSource(null);
    setAttachmentUploadStatus('idle');
    setAttachmentUploadFeedback('');
    setShowAttachmentField(false);
    await sendMessageWithFeedback(content, undefined, attachmentUrl, messageType, messageAttachmentSource);
  };

  const retryMessage = async (message: LocalMessage) => {
    recordMessagingWorkflowAnalytics({
      userId: user?.id,
      action: 'message_retry_clicked',
      conversationId: message.conversationId,
      messageType: message.messageType,
      hasText: Boolean(message.content?.trim()),
      hasAttachment: Boolean(message.attachmentUrl),
      visibleMessageCount: visibleMessages.length,
    });
    await sendMessageWithFeedback(message.content, message.id, message.attachmentUrl, message.messageType);
  };

  const handleAttachmentFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !activeConversationId) return;

    const fileTypeCategory = getAttachmentFileTypeCategory(file);
    const fileSizeBand = getAttachmentFileSizeBand(file.size);
    const validationMessage = validateMessageAttachmentFile(file);

    setShowAttachmentField(true);
    setAttachmentSource('upload');
    setAttachmentUrlInput('');

    if (validationMessage) {
      setAttachmentUploadStatus('failed');
      setAttachmentUploadFeedback(validationMessage);
      recordMessagingWorkflowAnalytics({
        userId: user?.id,
        action: 'attachment_validation_failed',
        conversationId: activeConversationId,
        hasText: Boolean(messageText.trim()),
        hasAttachment: true,
        attachmentSource: 'upload',
        fileTypeCategory,
        fileSizeBand,
        visibleMessageCount: visibleMessages.length,
        errorCategory: fileSizeBand === 'empty' ? 'empty_file' : 'file_too_large',
      });
      return;
    }

    setAttachmentUploadStatus('uploading');
    setAttachmentUploadFeedback('Uploading attachment...');
    recordMessagingWorkflowAnalytics({
      userId: user?.id,
      action: 'attachment_upload_started',
      conversationId: activeConversationId,
      hasText: Boolean(messageText.trim()),
      hasAttachment: true,
      attachmentSource: 'upload',
      fileTypeCategory,
      fileSizeBand,
      visibleMessageCount: visibleMessages.length,
    });

    try {
      const result = await fileUploadService.uploadFile(file, 'messages');
      setAttachmentUrlInput(result.url);
      setAttachmentUploadStatus('ready');
      setAttachmentUploadFeedback(`${getAttachmentLabel(result.url)} uploaded. Review before sending.`);
      recordMessagingWorkflowAnalytics({
        userId: user?.id,
        action: 'attachment_upload_completed',
        conversationId: activeConversationId,
        hasText: Boolean(messageText.trim()),
        hasAttachment: true,
        attachmentSource: 'upload',
        fileTypeCategory,
        fileSizeBand,
        visibleMessageCount: visibleMessages.length,
      });
      composerInputRef.current?.focus();
    } catch (error) {
      setAttachmentUploadStatus('failed');
      setAttachmentUploadFeedback('File could not upload. Try again or add a link.');
      recordMessagingWorkflowAnalytics({
        userId: user?.id,
        action: 'attachment_upload_failed',
        conversationId: activeConversationId,
        hasText: Boolean(messageText.trim()),
        hasAttachment: true,
        attachmentSource: 'upload',
        fileTypeCategory,
        fileSizeBand,
        visibleMessageCount: visibleMessages.length,
        errorCategory: getMessagingWorkflowErrorCategory(error, 'attachment_upload_failed'),
      });
    }
  };

  const applyReplySuggestion = (suggestion: MessagingReplySuggestion) => {
    recordMessagingWorkflowAnalytics({
      userId: user?.id,
      action: 'reply_suggestion_inserted',
      conversationId: activeConversationId,
      suggestionId: suggestion.id,
      visibleMessageCount: visibleMessages.length,
    });
    setMessageText(suggestion.text);
    setSendFeedback('Suggested reply inserted as a draft. Review it before sending.');
    composerInputRef.current?.focus();
  };

  const getDeliveryLabel = (message: LocalMessage) => {
    if (message.localStatus === 'sending') return 'Sending...';
    if (message.localStatus === 'failed') return 'Failed to send';
    if (message.status === 'READ') return 'Read';
    if (message.status === 'DELIVERED') return 'Delivered';
    return 'Sent';
  };
  const loadedMessageCount = messages.length;
  const messageCountLabel = messageTotal !== null
    ? `${loadedMessageCount} of ${messageTotal} loaded`
    : `${loadedMessageCount} loaded`;
  const isSearchingConversations = Boolean(searchTerm.trim());
  const conversationCountLabel = conversationTotal !== null && !isSearchingConversations
    ? `${conversations.length} of ${conversationTotal} conversations loaded`
    : `${filteredConvos.length} ${filteredConvos.length === 1 ? 'conversation' : 'conversations'}`;
  const canSendMessage = Boolean(messageText.trim() || normalizedAttachmentUrl) && !attachmentDraftInvalid && attachmentUploadStatus !== 'uploading';
  const shouldShowReplySuggestions = replySuggestions.length > 0 && !messageText.trim() && !normalizedAttachmentUrl;
  const realtimeStatusLabel = realtimeStatus === 'connected'
    ? 'Realtime connected'
    : realtimeStatus === 'connecting'
      ? 'Realtime connecting'
      : realtimeStatus === 'disconnected'
        ? 'Realtime disconnected'
        : 'Realtime idle';
  const realtimeStatusClassName = realtimeStatus === 'connected'
    ? 'bg-success'
    : realtimeStatus === 'connecting'
      ? 'bg-warning'
      : realtimeStatus === 'disconnected'
        ? 'bg-destructive'
        : 'bg-[var(--text-muted)]';
  const hasRealtimeActions = Object.values(messagingRealtimeActionFlags).some(Boolean);

  const conversationList = (
    <>
      <div className={`${messagingPanelClassName} rounded-none border-x-0 border-t-0`}>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={14}
            aria-hidden="true"
            focusable="false"
          />
          <input
            type="text"
            aria-label="Search conversations"
            placeholder="Search..."
            className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] pl-8 pr-3 text-sm placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <p role="status" aria-live="polite" className="mt-2 text-[10px] text-[var(--text-muted)]">
          {conversationCountLabel}
        </p>
        {conversationFeedback && (
          <p role="alert" className="mt-1 text-[10px] text-destructive">
            {conversationFeedback}
          </p>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)]"
        role="list"
        aria-label="Conversations"
      >
        {status === 'loading' && [1,2,3].map(i => <Skeleton key={i} className="m-1 h-16 w-[calc(100%-0.5rem)]" />)}
        {status === 'failed' && conversations.length === 0 && (
          <div role="alert" className="flex flex-col items-center gap-2 p-6 text-center text-sm text-[var(--text-muted)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Messages could not load</p>
            <span>{conversationLoadFailureMessage}</span>
            <Button type="button" variant="outline" size="sm" onClick={retryLoadConversations}>
              <RotateCcw size={13} className="mr-1" aria-hidden="true" focusable="false" /> Retry conversations
            </Button>
          </div>
        )}
        {status !== 'loading' && status !== 'failed' && filteredConvos.length === 0 && (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
            {searchTerm ? 'No conversations match your search.' : 'No conversations yet.'}
          </div>
        )}
        {filteredConvos.map((convo) => (
          <div key={convo.id} role="listitem">
            <button
              type="button"
              onClick={() => handleSelectConversation(convo.id)}
              aria-current={activeConversationId === convo.id ? 'true' : undefined}
              aria-label={getConversationAccessibleLabel(convo)}
              className={`flex min-h-20 w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                activeConversationId === convo.id ? 'bg-accent/10' : 'hover:bg-[var(--bg-primary)]'
              }`}
            >
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent" aria-hidden="true">
                  {getParticipantInitials(convo.participant?.fullName)}
                </div>
                {convo.participant?.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-[var(--bg-secondary)]" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{convo.participant?.fullName}</span>
                  <div className="ml-2 flex shrink-0 items-center gap-1.5">
                    {Boolean(convo.unreadCount) && (
                      <span
                        className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-accent-foreground"
                        aria-label={`${convo.unreadCount} unread ${convo.unreadCount === 1 ? 'message' : 'messages'}`}
                      >
                        {convo.unreadCount && convo.unreadCount > 99 ? '99+' : convo.unreadCount}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatMessageTime(convo.lastMessage?.timestamp || convo.updatedAt || convo.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{convo.lastMessage?.content || 'No messages yet'}</p>
              </div>
            </button>
          </div>
        ))}
        {!isSearchingConversations && hasMoreConversations && (
          <div className="p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLoadMoreConversations}
              disabled={status === 'loadingMore'}
            >
              {status === 'loadingMore' ? 'Loading more...' : 'Load more conversations'}
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col gap-4">
      <PageHeader title="Messages" description="Chat with your connections." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Messaging source status">
        <SourceStatusBadge
          status="account"
          label="Account messages"
          description="Conversation history, unread counts, and sent messages use account-backed messaging tables when sync succeeds."
        />
        <SourceStatusBadge
          status="unavailable"
          label="Calls unavailable"
          description="Voice calls, video calls, and overflow actions are hidden until a provider-backed messaging action is implemented."
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Conversation List */}
        <Card className="hidden min-h-0 flex-col overflow-hidden md:flex">
          {conversationList}
        </Card>

        <Card className={`min-h-0 flex-col overflow-hidden md:hidden ${showMobileConversations || !activeConvo ? 'flex' : 'hidden'}`}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <div>
              <p className="text-sm font-semibold">Conversations</p>
              <p className="text-xs text-[var(--text-muted)]">{filteredConvos.length} available</p>
            </div>
            {activeConvo && (
              <Button variant="outline" size="sm" onClick={() => setShowMobileConversations(false)}>
                Open Chat
              </Button>
            )}
          </div>
          {conversationList}
        </Card>

        {/* Chat Window */}
        <Card className={`min-h-0 flex-col overflow-hidden ${showMobileConversations && !activeConvo ? 'hidden md:flex' : 'flex'} ${showMobileConversations && activeConvo ? 'hidden md:flex' : ''}`}>
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Back to conversations"
                    onClick={() => setShowMobileConversations(true)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" focusable="false" />
                  </Button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent" aria-hidden="true">
                    {getParticipantInitials(activeConvo.participant?.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{activeConvo.participant?.fullName}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
                      <span>{activeConvo.participant?.status === 'online' ? 'Online' : 'Offline'}</span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatusClassName}`} aria-hidden="true" />
                        {realtimeStatusLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} aria-hidden="true" focusable="false" />
                        {messageCountLabel}
                      </span>
                      {visibleIncomingUnreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkVisibleRead}
                          disabled={isMarkingRead}
                          aria-label={`Mark ${visibleIncomingUnreadCount} visible unread ${visibleIncomingUnreadCount === 1 ? 'message' : 'messages'} as read`}
                          className="inline-flex items-center gap-1 rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCheck size={11} aria-hidden="true" focusable="false" />
                          {isMarkingRead ? 'Marking read...' : `${visibleIncomingUnreadCount} unread`}
                        </button>
                      )}
                      <span>Last activity {formatMessageTime(lastActivityTimestamp)}</span>
                    </div>
                  </div>
                </div>
                {hasRealtimeActions && (
                  <div className="hidden shrink-0 items-center gap-1 sm:flex">
                    {messagingRealtimeActionFlags.voiceCalls && (
                      <Button variant="ghost" size="icon" aria-label="Start voice call" title="Start voice call"><Phone size={16} aria-hidden="true" focusable="false" /></Button>
                    )}
                    {messagingRealtimeActionFlags.videoCalls && (
                      <Button variant="ghost" size="icon" aria-label="Start video call" title="Start video call"><Video size={16} aria-hidden="true" focusable="false" /></Button>
                    )}
                    {messagingRealtimeActionFlags.moreActions && (
                      <Button variant="ghost" size="icon" aria-label="More messaging actions" title="More actions"><MoreVertical size={16} aria-hidden="true" focusable="false" /></Button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div
                className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-[var(--bg-secondary)] p-4"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-label={`Messages with ${activeConvo.participant?.fullName || 'selected conversation'}`}
              >
                {messageHistoryStatus === 'loading' && (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-10 w-1/2 ml-auto" />
                    <Skeleton className="h-10 w-3/5" />
                  </div>
                )}
                {messageHistoryStatus === 'failed' && (
                  <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-xs text-[var(--text-secondary)]">
                    <span>
                      {messageHistoryError === 'older'
                        ? olderMessagesLoadFailureMessage
                        : messageHistoryLoadFailureMessage}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={messageHistoryError === 'older' ? handleLoadOlderMessages : retryLoadMessages}
                    >
                      <RotateCcw size={13} className="mr-1" aria-hidden="true" focusable="false" />
                      {messageHistoryError === 'older' ? 'Retry older messages' : 'Retry message history'}
                    </Button>
                  </div>
                )}
                {messageHistoryStatus !== 'loading' && hasOlderMessages && messageHistoryError !== 'older' && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadOlderMessages}
                      disabled={messageHistoryStatus === 'loadingMore'}
                    >
                      <ChevronUp size={14} className="mr-1" aria-hidden="true" focusable="false" />
                      {messageHistoryStatus === 'loadingMore' ? 'Loading older...' : 'Load older messages'}
                    </Button>
                  </div>
                )}
                {visibleMessages.map((msg) => {
                  const isOwnMessage = msg.senderId === user?.id;
                  const isFailedMessage = msg.localStatus === 'failed';
                  const messageBubbleClassName = isFailedMessage
                    ? 'border border-destructive/30 bg-destructive/10 text-[var(--text-primary)]'
                    : isOwnMessage
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]';
                  const attachmentClassName = isOwnMessage && !isFailedMessage
                    ? 'border-accent-foreground/30 bg-accent-foreground/10 text-accent-foreground'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]';

                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-md px-4 py-2.5 text-sm leading-6 sm:max-w-[70%] ${messageBubbleClassName}`}>
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`block overflow-hidden rounded-md border text-xs transition-opacity hover:opacity-90 ${attachmentClassName}`}
                          >
                            {isImageAttachment(msg) && (
                              <img
                                src={msg.attachmentUrl}
                                alt=""
                                className="max-h-44 w-full object-cover"
                                loading="lazy"
                              />
                            )}
                            <span className="flex items-center gap-2 px-3 py-2">
                              <Paperclip size={13} aria-hidden="true" focusable="false" />
                              <span className="min-w-0 flex-1 truncate">{getAttachmentLabel(msg.attachmentUrl)}</span>
                              <ExternalLink size={12} aria-hidden="true" focusable="false" />
                            </span>
                          </a>
                        )}
                        {!shouldHideAttachmentFallbackContent(msg) && (
                          <p className={`break-words ${msg.attachmentUrl ? 'mt-2' : ''}`}>{msg.content}</p>
                        )}
                        <div
                          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] opacity-80 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          title={formatFullTimestamp(msg.timestamp)}
                        >
                          {isFailedMessage && <AlertCircle size={12} className="text-destructive" aria-hidden="true" focusable="false" />}
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isOwnMessage && <span>{getDeliveryLabel(msg as LocalMessage)}</span>}
                          {isFailedMessage && (
                            <button
                              type="button"
                              onClick={() => retryMessage(msg as LocalMessage)}
                              aria-label="Retry failed message"
                              className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
                            >
                              <RotateCcw size={11} aria-hidden="true" focusable="false" /> Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border-default)]">
                {showAttachmentField && (
                  <div id="message-attachment-panel" className={`mb-2 ${messagingComposerPanelClassName}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label htmlFor="message-attachment-url" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                        <Paperclip size={13} aria-hidden="true" focusable="false" /> Attachment link
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          recordMessagingWorkflowAnalytics({
                            userId: user?.id,
                            action: 'attachment_field_cleared',
                            conversationId: activeConversationId,
                            hasText: Boolean(messageText.trim()),
                            hasAttachment: Boolean(attachmentUrlInput.trim()),
                            attachmentSource: attachmentSource || undefined,
                            visibleMessageCount: visibleMessages.length,
                          });
                          setAttachmentUrlInput('');
                          setAttachmentSource(null);
                          setAttachmentUploadStatus('idle');
                          setAttachmentUploadFeedback('');
                          setShowAttachmentField(false);
                        }}
                        className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                        aria-label="Remove attachment link"
                      >
                        <X size={13} aria-hidden="true" focusable="false" />
                      </button>
                    </div>
                    <input
                      id="message-attachment-url"
                      ref={attachmentUrlInputRef}
                      type="url"
                      value={attachmentUrlInput}
                      onChange={(event) => {
                        setAttachmentUrlInput(event.target.value);
                        setAttachmentSource('link');
                        setAttachmentUploadStatus('idle');
                        setAttachmentUploadFeedback('');
                      }}
                      placeholder="https://example.com/file.pdf"
                      aria-invalid={attachmentDraftInvalid}
                      aria-describedby="message-attachment-status"
                      className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => attachmentFileInputRef.current?.click()}
                        disabled={attachmentUploadStatus === 'uploading'}
                        aria-controls="message-attachment-file"
                      >
                        <UploadCloud size={13} aria-hidden="true" focusable="false" />
                        {attachmentUploadStatus === 'uploading' ? 'Uploading...' : 'Upload file'}
                      </Button>
                      <input
                        ref={attachmentFileInputRef}
                        type="file"
                        id="message-attachment-file"
                        className="sr-only"
                        onChange={handleAttachmentFileSelected}
                        aria-label="Upload message attachment"
                        tabIndex={-1}
                      />
                      {attachmentUploadFeedback && (
                        <span
                          role={attachmentUploadStatus === 'failed' ? 'alert' : 'status'}
                          className={`text-[10px] ${attachmentUploadStatus === 'failed' ? 'text-destructive' : 'text-[var(--text-muted)]'}`}
                        >
                          {attachmentUploadFeedback}
                        </span>
                      )}
                    </div>
                    <p
                      id="message-attachment-status"
                      role={attachmentDraftInvalid ? 'alert' : 'status'}
                      className={`mt-1 text-[10px] ${attachmentDraftInvalid ? 'text-destructive' : 'text-[var(--text-muted)]'}`}
                    >
                      {attachmentDraftInvalid
                        ? 'Use a valid http or https URL.'
                        : normalizedAttachmentUrl
                          ? `${getAttachmentLabel(normalizedAttachmentUrl)} ready to attach.`
                          : 'Add a public link, then send it with an optional caption.'}
                    </p>
                  </div>
                )}
                {shouldShowReplySuggestions && (
                  <div className={`mb-2 ${messagingComposerPanelClassName}`}>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                      <Sparkles size={13} aria-hidden="true" focusable="false" />
                      <span>Suggested replies</span>
                    </div>
                    <div className="flex flex-wrap gap-2" aria-label="Suggested reply drafts">
                      {replySuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => applyReplySuggestion(suggestion)}
                          className="max-w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-accent hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                          title={`Insert draft: ${suggestion.label}`}
                        >
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={handleSendMessage}
                  aria-label="Message composer"
                  data-ui="messaging-composer-form"
                >
                  <Button
                    size="icon"
                    variant={showAttachmentField ? 'secondary' : 'outline'}
                    type="button"
                    aria-label={showAttachmentField ? 'Hide attachment link field' : 'Add attachment link'}
                    aria-pressed={showAttachmentField}
                    aria-controls="message-attachment-panel"
                    onClick={() => {
                      if (showAttachmentField) {
                        recordMessagingWorkflowAnalytics({
                          userId: user?.id,
                          action: 'attachment_field_cleared',
                          conversationId: activeConversationId,
                          hasText: Boolean(messageText.trim()),
                          hasAttachment: Boolean(attachmentUrlInput.trim()),
                          attachmentSource: attachmentSource || undefined,
                          visibleMessageCount: visibleMessages.length,
                        });
                        setAttachmentUrlInput('');
                        setAttachmentSource(null);
                        setAttachmentUploadStatus('idle');
                        setAttachmentUploadFeedback('');
                        setShowAttachmentField(false);
                        return;
                      }

                      recordMessagingWorkflowAnalytics({
                        userId: user?.id,
                        action: 'attachment_field_opened',
                        conversationId: activeConversationId,
                        hasText: Boolean(messageText.trim()),
                        hasAttachment: Boolean(attachmentUrlInput.trim()),
                        attachmentSource: attachmentSource || undefined,
                        visibleMessageCount: visibleMessages.length,
                      });
                      setShowAttachmentField(true);
                      focusAttachmentUrlInput();
                    }}
                  >
                    <Paperclip size={16} aria-hidden="true" focusable="false" />
                  </Button>
                  <label htmlFor="message-composer" className="sr-only">Message text</label>
                  <p id="message-composer-help" className="sr-only">
                    Review message text, reply suggestions, and attachment drafts before sending.
                  </p>
                  <input
                    id="message-composer"
                    ref={composerInputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={normalizedAttachmentUrl ? 'Add a caption...' : 'Type a message...'}
                    aria-describedby="message-composer-help message-send-status"
                    className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  <Button size="icon" type="submit" disabled={!canSendMessage} aria-label="Send message">
                    <Send size={16} aria-hidden="true" focusable="false" />
                  </Button>
                </form>
                <p id="message-send-status" className="sr-only" aria-live="polite">{sendFeedback}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className={messagingInsetClassName}>
                <EmptyState
                  title="Select a conversation"
                  description="Choose a contact from the list to start messaging."
                  icon={<MessageSquare size={24} />}
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagingPage;
