import type { Message } from '../types/messaging';

export interface MessagingReplySuggestion {
  id: string;
  label: string;
  text: string;
}

interface BuildMessagingReplySuggestionsInput {
  messages: Message[];
  currentUserId?: string;
}

const compact = (value?: string | null) => (value || '').trim();

const getTimestampMs = (message: Message) => {
  const timestamp = new Date(message.timestamp).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const uniqueSuggestions = (suggestions: MessagingReplySuggestion[]) => {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = suggestion.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getLatestMessage = (messages: Message[]) => (
  [...messages].sort((a, b) => getTimestampMs(b) - getTimestampMs(a))[0]
);

export const buildMessagingReplySuggestions = ({
  messages,
  currentUserId,
}: BuildMessagingReplySuggestionsInput): MessagingReplySuggestion[] => {
  const latestMessage = getLatestMessage(messages);
  if (!latestMessage || !currentUserId || latestMessage.senderId === currentUserId) {
    return [];
  }

  const content = compact(latestMessage.content);
  if (!content) return [];

  const normalizedContent = content.toLowerCase();
  const suggestions: MessagingReplySuggestion[] = [];

  if (
    normalizedContent.includes('interview') ||
    normalizedContent.includes('schedule') ||
    normalizedContent.includes('available') ||
    normalizedContent.includes('meeting') ||
    normalizedContent.includes('slot') ||
    normalizedContent.includes('call')
  ) {
    suggestions.push({
      id: 'coordinate-time',
      label: 'Coordinate time',
      text: 'Thanks, I can coordinate on timing. Please share a few options that work for you.',
    });
  }

  if (
    normalizedContent.includes('resume') ||
    normalizedContent.includes('portfolio') ||
    normalizedContent.includes('attachment') ||
    normalizedContent.includes('link') ||
    normalizedContent.includes('review')
  ) {
    suggestions.push({
      id: 'review-details',
      label: 'Review details',
      text: 'Thanks for sending this. I’ll review the details and follow up with any questions.',
    });
  }

  if (normalizedContent.includes('?')) {
    suggestions.push({
      id: 'answer-soon',
      label: 'Answer soon',
      text: 'Thanks for the question. I’ll review this and get back to you shortly.',
    });
  }

  if (
    normalizedContent.includes('thank you') ||
    normalizedContent.includes('thanks') ||
    normalizedContent.includes('appreciate')
  ) {
    suggestions.push({
      id: 'acknowledge-thanks',
      label: 'Acknowledge',
      text: 'You’re welcome. Happy to help.',
    });
  }

  suggestions.push(
    {
      id: 'acknowledge-update',
      label: 'Acknowledge',
      text: 'Thanks for the update.',
    },
    {
      id: 'follow-up',
      label: 'Follow up',
      text: 'Sounds good. I’ll take a look and follow up.',
    }
  );

  return uniqueSuggestions(suggestions).slice(0, 3);
};
