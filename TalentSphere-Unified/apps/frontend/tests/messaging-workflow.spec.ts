import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const currentUserId = 'e2e-role_user';
const conversationId = 'conversation-lena-001';
const participantId = 'candidate-lena-001';

const participantProfile = {
  id: participantId,
  full_name: 'Lena Ortiz',
  first_name: 'Lena',
  last_name: 'Ortiz',
  email: 'lena.ortiz@example.test',
  avatar_url: null,
};

const conversationParticipants = [
  {
    conversation_id: conversationId,
    conversations: {
      id: conversationId,
      name: null,
      is_group: false,
      created_by: participantId,
      created_at: '2026-06-27T08:00:00.000Z',
      updated_at: '2026-06-27T08:30:00.000Z',
      conversation_participants: [
        { user_id: currentUserId, last_read_at: null },
        { user_id: participantId, last_read_at: null },
      ],
      messages: [
        {
          id: 'message-preview-001',
          content: 'Can you share the latest portfolio link?',
          sender_id: participantId,
          created_at: '2026-06-27T08:30:00.000Z',
        },
      ],
    },
  },
];

const existingMessages = [
  {
    id: 'message-lena-001',
    conversation_id: conversationId,
    sender_id: participantId,
    content: 'Can you share the latest portfolio link?',
    message_type: 'TEXT',
    attachment_url: null,
    status: 'SENT',
    created_at: '2026-06-27T08:30:00.000Z',
    read_at: null,
    profiles: {
      id: participantId,
      full_name: 'Lena Ortiz',
      avatar_url: null,
    },
  },
];

const buildMessageHistory = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `message-history-${String(index + 1).padStart(3, '0')}`,
  conversation_id: conversationId,
  sender_id: index % 2 === 0 ? participantId : currentUserId,
  content: `History message ${index + 1}`,
  message_type: 'TEXT',
  attachment_url: null,
  status: 'SENT',
  created_at: new Date(Date.UTC(2026, 5, 27, 10, count - index, 0)).toISOString(),
  read_at: index % 2 === 0 ? null : '2026-06-27T10:00:00.000Z',
  profiles: {
    id: index % 2 === 0 ? participantId : currentUserId,
    full_name: index % 2 === 0 ? 'Lena Ortiz' : 'E2E User',
    avatar_url: null,
  },
}));

test.describe('messaging workflow', () => {
  test('selects a conversation and sends a reviewed text message', async ({ page }) => {
    const sentMessages: Record<string, unknown>[] = [];
    const reply = 'Thanks, I will send the portfolio link before our call.';

    await installNetworkStubs(page, {
      rest: {
        conversationParticipants,
        messages: existingMessages,
        profiles: [participantProfile],
        onMessageInsert: (payload) => {
          sentMessages.push(payload);
          return {
            id: 'message-e2e-sent-001',
            conversation_id: payload.conversation_id,
            sender_id: payload.sender_id,
            content: payload.content,
            message_type: payload.message_type || 'TEXT',
            attachment_url: payload.attachment_url || null,
            status: 'SENT',
            created_at: '2026-06-27T10:00:00.000Z',
            read_at: null,
            profiles: {
              id: currentUserId,
              full_name: 'E2E User',
              avatar_url: null,
            },
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/messaging');

    const conversationButton = page.getByRole('button', { name: /Lena Ortiz/ }).first();

    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();
    await expect(conversationButton).toBeVisible();
    await expect(conversationButton).toContainText('Can you share the latest portfolio link?');

    await conversationButton.click();

    const messageLog = page.getByRole('log', { name: 'Messages with Lena Ortiz' });
    await expect(messageLog).toBeVisible();
    await expect(messageLog.getByText('Can you share the latest portfolio link?')).toBeVisible();

    await page.getByLabel('Message text').fill(reply);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect.poll(() => sentMessages.length).toBe(1);
    expect(sentMessages[0]).toMatchObject({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: reply,
      message_type: 'TEXT',
      status: 'SENT',
    });

    await expect(page.locator('#message-send-status')).toHaveText('Message sent.');
    await expect(messageLog.getByText(reply)).toBeVisible();
    await expect(messageLog.getByText('Sent').last()).toBeVisible();
  });

  test('sends a reviewed attachment link from the keyboard composer path', async ({ page }) => {
    const sentMessages: Record<string, unknown>[] = [];
    const attachmentUrl = 'https://portfolio.example/lena/portfolio.pdf';
    const caption = 'Portfolio link attached.';

    await installNetworkStubs(page, {
      rest: {
        conversationParticipants,
        messages: existingMessages,
        profiles: [participantProfile],
        onMessageInsert: (payload) => {
          sentMessages.push(payload);
          return {
            id: 'message-e2e-attachment-001',
            conversation_id: payload.conversation_id,
            sender_id: payload.sender_id,
            content: payload.content,
            message_type: payload.message_type || 'TEXT',
            attachment_url: payload.attachment_url || null,
            status: 'SENT',
            created_at: '2026-06-27T10:05:00.000Z',
            read_at: null,
            profiles: {
              id: currentUserId,
              full_name: 'E2E User',
              avatar_url: null,
            },
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/messaging');
    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();

    const conversationButton = page.getByRole('button', { name: /Lena Ortiz/ }).first();
    await conversationButton.focus();
    await page.keyboard.press('Enter');

    const messageLog = page.getByRole('log', { name: 'Messages with Lena Ortiz' });
    await expect(messageLog).toBeVisible();

    const attachmentButton = page.getByRole('button', { name: 'Add attachment link' });
    await attachmentButton.focus();
    await page.keyboard.press('Enter');

    const attachmentInput = page.getByRole('textbox', { name: 'Attachment link' });
    await expect(attachmentInput).toBeFocused();
    await attachmentInput.fill(attachmentUrl);
    await expect(page.getByText('portfolio.pdf ready to attach.')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Upload file' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Hide attachment link field' })).toBeFocused();

    const messageInput = page.getByLabel('Message text');
    await page.keyboard.press('Tab');
    await expect(messageInput).toBeFocused();
    await messageInput.fill(caption);
    await messageInput.press('Enter');

    await expect.poll(() => sentMessages.length).toBe(1);
    expect(sentMessages[0]).toMatchObject({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: caption,
      message_type: 'FILE',
      attachment_url: attachmentUrl,
      status: 'SENT',
    });

    await expect(page.locator('#message-send-status')).toHaveText('Message sent.');
    await expect(messageLog.getByRole('link', { name: /portfolio\.pdf/ })).toBeVisible();
    await expect(messageLog.getByText(caption)).toBeVisible();
  });

  test('marks visible incoming messages read from the keyboard', async ({ page }) => {
    const messageUpdates: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      rest: {
        conversationParticipants,
        messages: existingMessages,
        profiles: [participantProfile],
        onMessageUpdate: (payload, context) => {
          messageUpdates.push({ ...payload, conversation_id: context.conversationId });
          return {
            id: 'message-lena-001',
            conversation_id: context.conversationId || conversationId,
            sender_id: participantId,
            content: 'Can you share the latest portfolio link?',
            message_type: 'TEXT',
            attachment_url: null,
            status: payload.status || 'READ',
            created_at: '2026-06-27T08:30:00.000Z',
            read_at: payload.read_at,
          };
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/messaging');
    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();

    const conversationButton = page.getByRole('button', { name: /Lena Ortiz/ }).first();
    await conversationButton.focus();
    await page.keyboard.press('Enter');

    const markReadButton = page.getByRole('button', { name: '1 unread', exact: true });
    await markReadButton.focus();
    await expect(markReadButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => messageUpdates.length).toBe(1);
    expect(messageUpdates[0]).toMatchObject({
      conversation_id: conversationId,
      status: 'READ',
    });
    expect(messageUpdates[0].read_at).toEqual(expect.any(String));
    await expect(page.locator('#message-send-status')).toHaveText('1 visible message marked read.');
    await expect(markReadButton).toBeHidden();
  });

  test('loads older thread history from the keyboard', async ({ page }) => {
    await installNetworkStubs(page, {
      rest: {
        conversationParticipants,
        messages: buildMessageHistory(52),
        profiles: [participantProfile],
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/messaging');
    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();

    const conversationButton = page.getByRole('button', { name: /Lena Ortiz/ }).first();
    await conversationButton.focus();
    await page.keyboard.press('Enter');

    const messageLog = page.getByRole('log', { name: 'Messages with Lena Ortiz' });
    await expect(messageLog.locator('p').filter({ hasText: /^History message 50$/ })).toBeVisible();
    await expect(messageLog.locator('p').filter({ hasText: /^History message 52$/ })).toBeHidden();

    const loadOlderButton = page.getByRole('button', { name: 'Load older messages' });
    await loadOlderButton.focus();
    await expect(loadOlderButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(messageLog.locator('p').filter({ hasText: /^History message 52$/ })).toBeVisible();
    await expect(page.locator('#message-send-status')).toHaveText('Older messages loaded.');
    await expect(loadOlderButton).toBeHidden();
  });
});
