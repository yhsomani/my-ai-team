package com.talentsphere.chat.service;

import com.talentsphere.chat.entity.ChatMessage;
import com.talentsphere.chat.repository.ChatMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ChatService.
 * Covers message sending, retrieval, conversation management, and circuit breaker fallbacks.
 */
@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ChatService chatService;

    private ChatMessage testMessage;
    private List<ChatMessage> testMessages;

    @BeforeEach
    void setUp() {
        testMessage = new ChatMessage();
        testMessage.setId("msg-123");
        testMessage.setChannelId("channel-abc");
        testMessage.setSenderId("user-1");
        testMessage.setRecipientId("user-2");
        testMessage.setContent("Hello, this is a test message!");
        testMessage.setType(ChatMessage.MessageType.TEXT);
        testMessage.setTimestamp(Instant.now());
        testMessage.setIsRead(false);

        testMessages = Arrays.asList(testMessage);
    }

    @Test
    void sendMessage_ShouldSaveAndBroadcast_WhenValidMessage() {
        // Arrange
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(testMessage);

        // Act
        ChatMessage result = chatService.sendMessage(testMessage);

        // Assert
        assertNotNull(result);
        assertEquals("Hello, this is a test message!", result.getContent());
        verify(chatMessageRepository, times(1)).save(testMessage);
        verify(messagingTemplate, times(1))
                .convertAndSend(eq("/topic/messages/" + testMessage.getChannelId()), eq(testMessage));
    }

    @Test
    void sendMessage_ShouldHandleException_AndInvokeFallback() {
        // Arrange
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenThrow(new RuntimeException("Database unavailable"));

        // Act
        ChatMessage result = chatService.sendMessage(testMessage);

        // Assert
        assertNotNull(result);
        assertTrue(result.getContent().startsWith("BUFFERED_"));
        verify(chatMessageRepository, times(1)).save(any(ChatMessage.class));
        verify(messagingTemplate, never()).convertAndSend(anyString(), any());
    }

    @Test
    void getMessagesByChannelId_ShouldReturnListOfMessages() {
        // Arrange
        String channelId = "channel-abc";
        when(chatMessageRepository.findByChannelIdOrderByTimestampAsc(channelId))
                .thenReturn(testMessages);

        // Act
        List<ChatMessage> result = chatService.getMessagesByChannelId(channelId);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Hello, this is a test message!", result.get(0).getContent());
        verify(chatMessageRepository, times(1)).findByChannelIdOrderByTimestampAsc(channelId);
    }

    @Test
    void getMessagesByChannelId_ShouldReturnEmptyList_WhenNoMessagesFound() {
        // Arrange
        String channelId = "empty-channel";
        when(chatMessageRepository.findByChannelIdOrderByTimestampAsc(channelId))
                .thenReturn(Arrays.asList());

        // Act
        List<ChatMessage> result = chatService.getMessagesByChannelId(channelId);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatMessageRepository, times(1)).findByChannelIdOrderByTimestampAsc(channelId);
    }

    @Test
    void markAsRead_ShouldUpdateMessageReadStatus() {
        // Arrange
        String messageId = "msg-123";
        when(chatMessageRepository.findById(messageId)).thenReturn(Optional.of(testMessage));
        when(chatMessageRepository.save(testMessage)).thenReturn(testMessage);

        // Act
        ChatMessage result = chatService.markAsRead(messageId);

        // Assert
        assertNotNull(result);
        assertTrue(result.getIsRead());
        verify(chatMessageRepository, times(1)).findById(messageId);
        verify(chatMessageRepository, times(1)).save(testMessage);
    }

    @Test
    void markAsRead_ShouldReturnNull_WhenMessageNotFound() {
        // Arrange
        String messageId = "non-existent";
        when(chatMessageRepository.findById(messageId)).thenReturn(Optional.empty());

        // Act
        ChatMessage result = chatService.markAsRead(messageId);

        // Assert
        assertNull(result);
        verify(chatMessageRepository, times(1)).findById(messageId);
        verify(chatMessageRepository, never()).save(any());
    }

    @Test
    void getUserConversations_ShouldReturnListOfChannels() {
        // Arrange
        String userId = "user-1";
        List<String> expectedChannels = Arrays.asList("channel-abc", "channel-xyz");
        when(chatMessageRepository.findDistinctChannelIdsBySenderIdOrRecipientId(userId, userId))
                .thenReturn(expectedChannels);

        // Act
        List<String> result = chatService.getUserConversations(userId);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.contains("channel-abc"));
        verify(chatMessageRepository, times(1))
                .findDistinctChannelIdsBySenderIdOrRecipientId(userId, userId);
    }

    @Test
    void getUserConversations_ShouldReturnEmptyList_WhenNoConversationsFound() {
        // Arrange
        String userId = "new-user";
        when(chatMessageRepository.findDistinctChannelIdsBySenderIdOrRecipientId(userId, userId))
                .thenReturn(Arrays.asList());

        // Act
        List<String> result = chatService.getUserConversations(userId);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatMessageRepository, times(1))
                .findDistinctChannelIdsBySenderIdOrRecipientId(userId, userId);
    }

    @Test
    void getUnreadCount_ShouldReturnCorrectCount() {
        // Arrange
        String userId = "user-2";
        long expectedCount = 5L;
        when(chatMessageRepository.countByRecipientIdAndIsReadFalse(userId)).thenReturn(expectedCount);

        // Act
        long result = chatService.getUnreadCount(userId);

        // Assert
        assertEquals(5L, result);
        verify(chatMessageRepository, times(1)).countByRecipientIdAndIsReadFalse(userId);
    }

    @Test
    void saveMessageFallback_ShouldFail_WhenMessageWasNotPersisted() {
        // Arrange
        ChatMessage fallbackMessage = new ChatMessage();
        fallbackMessage.setContent("Original message");

        // Act & Assert
        assertThrows(IllegalStateException.class, () ->
                chatService.saveMessageFallback(fallbackMessage, new RuntimeException("DB Down")));
    }
}
