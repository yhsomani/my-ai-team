package com.talentsphere.messaging.service;

import com.talentsphere.messaging.entity.Message;
import com.talentsphere.messaging.repository.MessageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {

    @Mock
    private MessageRepository repository;

    @InjectMocks
    private MessagingService messagingService;

    @Test
    void sendMessage_ShouldSaveMessageAndReturn_WhenValidData() {
        // Arrange
        String senderId = "user1";
        String receiverId = "user2";
        String content = "Hello, this is a test message";
        
        Message savedMessage = Message.builder()
                .id("msg-123")
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .isRead(false)
                .build();
        
        when(repository.save(any(Message.class))).thenReturn(savedMessage);

        // Act
        Message result = messagingService.sendMessage(senderId, receiverId, content);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("msg-123");
        assertThat(result.getSenderId()).isEqualTo(senderId);
        assertThat(result.getReceiverId()).isEqualTo(receiverId);
        assertThat(result.getContent()).isEqualTo(content);
        verify(repository, times(1)).save(any(Message.class));
    }

    @Test
    void sendMessageFallback_ShouldReturnTemporaryMessage_WhenServiceFails() {
        // Arrange
        String senderId = "user1";
        String receiverId = "user2";
        String content = "Test message";
        Throwable error = new RuntimeException("Database unavailable");

        // Act
        Message result = messagingService.sendMessageFallback(senderId, receiverId, content, error);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).startsWith("TEMP_");
        assertThat(result.getSenderId()).isEqualTo(senderId);
        assertThat(result.getReceiverId()).isEqualTo(receiverId);
        assertThat(result.getContent()).isEqualTo(content);
        assertThat(result.getIsRead()).isFalse();
    }

    @Test
    void getConversation_ShouldReturnListOfMessages_WhenConversationExists() {
        // Arrange
        String user1 = "user1";
        String user2 = "user2";
        
        List<Message> messages = List.of(
            Message.builder().id("msg-1").senderId(user1).receiverId(user2).content("Hi").isRead(true).build(),
            Message.builder().id("msg-2").senderId(user2).receiverId(user1).content("Hello").isRead(false).build()
        );
        
        when(repository.findConversation(user1, user2)).thenReturn(messages);

        // Act
        List<Message> result = messagingService.getConversation(user1, user2);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getContent()).isEqualTo("Hi");
        assertThat(result.get(1).getContent()).isEqualTo("Hello");
        verify(repository, times(1)).findConversation(user1, user2);
    }

    @Test
    void getConversationFallback_ShouldReturnEmptyList_WhenServiceFails() {
        // Arrange
        String user1 = "user1";
        String user2 = "user2";
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        List<Message> result = messagingService.getConversationFallback(user1, user2, error);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    void getUnreadCount_ShouldReturnCount_WhenUserHasUnreadMessages() {
        // Arrange
        String userId = "user1";
        Long expectedCount = 5L;
        
        when(repository.countByReceiverIdAndIsReadFalse(userId)).thenReturn(expectedCount);

        // Act
        Long result = messagingService.getUnreadCount(userId);

        // Assert
        assertThat(result).isEqualTo(expectedCount);
        verify(repository, times(1)).countByReceiverIdAndIsReadFalse(userId);
    }

    @Test
    void getUnreadCountFallback_ShouldReturnZero_WhenServiceFails() {
        // Arrange
        String userId = "user1";
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        Long result = messagingService.getUnreadCountFallback(userId, error);

        // Assert
        assertThat(result).isEqualTo(0L);
    }

    @Test
    void markAsRead_ShouldUpdateMessages_WhenConversationExists() {
        // Arrange
        String user1 = "user1";
        String user2 = "user2";
        
        Message message1 = Message.builder().id("msg-1").senderId(user1).receiverId(user2).content("Hi").isRead(false).build();
        Message message2 = Message.builder().id("msg-2").senderId(user2).receiverId(user1).content("Hello").isRead(false).build();
        
        when(repository.findConversation(user1, user2)).thenReturn(List.of(message1, message2));
        when(repository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        messagingService.markAsRead(user1, user2);

        // Assert
        verify(repository, times(1)).findConversation(user1, user2);
        verify(repository, times(1)).saveAll(anyList());
    }

    @Test
    void markAsReadFallback_ShouldLogWarning_WhenServiceFails() {
        // Arrange
        String user1 = "user1";
        String user2 = "user2";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert - should not throw exception
        messagingService.markAsReadFallback(user1, user2, error);
    }

    @Test
    void getConversation_ShouldReturnEmptyList_WhenNoMessagesExist() {
        // Arrange
        String user1 = "user1";
        String user2 = "user2";
        
        when(repository.findConversation(user1, user2)).thenReturn(List.of());

        // Act
        List<Message> result = messagingService.getConversation(user1, user2);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    void sendMessage_ShouldHandleEmptyContent_WhenContentIsEmptyString() {
        // Arrange
        String senderId = "user1";
        String receiverId = "user2";
        String content = "";
        
        Message savedMessage = Message.builder()
                .id("msg-empty")
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .isRead(false)
                .build();
        
        when(repository.save(any(Message.class))).thenReturn(savedMessage);

        // Act
        Message result = messagingService.sendMessage(senderId, receiverId, content);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }
}
