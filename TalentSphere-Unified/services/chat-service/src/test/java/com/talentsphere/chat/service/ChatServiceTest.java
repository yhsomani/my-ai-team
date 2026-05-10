package com.talentsphere.chat.service;

import com.talentsphere.chat.entity.ChatMessage;
import com.talentsphere.chat.repository.ChatMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChatServiceTest {

    @Mock
    private ChatMessageRepository repository;

    @InjectMocks
    private ChatService chatService;

    private ChatMessage testMessage;

    @BeforeEach
    void setUp() {
        testMessage = new ChatMessage();
        testMessage.setId("msg-1");
        testMessage.setSenderId("user-1");
        testMessage.setRecipientId("user-2");
        testMessage.setContent("Hello World");
        testMessage.setTimestamp(LocalDateTime.now());
        testMessage.setType("CHAT");
    }

    @Test
    void testSaveMessage_Success() {
        when(repository.save(any(ChatMessage.class))).thenReturn(testMessage);

        ChatMessage savedMessage = chatService.saveMessage(testMessage);

        assertNotNull(savedMessage);
        assertEquals("msg-1", savedMessage.getId());
        verify(repository, times(1)).save(testMessage);
    }

    @Test
    void testSaveMessageFallback() {
        ChatMessage messageWithoutId = new ChatMessage();
        messageWithoutId.setContent("Fallback test");

        RuntimeException exception = new RuntimeException("Database down");

        ChatMessage result = chatService.saveMessageFallback(messageWithoutId, exception);

        assertNotNull(result);
        assertTrue(result.getId().startsWith("BUFFERED_"));
        assertEquals("Fallback test", result.getContent());
    }

    @Test
    void testGetChannelMessages_Success() {
        List<ChatMessage> mockMessages = Arrays.asList(testMessage);
        when(repository.findByChannelIdOrderByTimestampAsc("channel-1")).thenReturn(mockMessages);

        List<ChatMessage> result = chatService.getChannelMessages("channel-1");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("msg-1", result.get(0).getId());
        verify(repository, times(1)).findByChannelIdOrderByTimestampAsc("channel-1");
    }

    @Test
    void testGetChannelMessagesFallback() {
        RuntimeException exception = new RuntimeException("Database down");

        List<ChatMessage> result = chatService.getChannelMessagesFallback("channel-1", exception);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetUserConversations_Success() {
        List<ChatMessage> mockMessages = Arrays.asList(testMessage);
        when(repository.findBySenderIdOrRecipientIdOrderByTimestampAsc("user-1", "user-1")).thenReturn(mockMessages);

        List<ChatMessage> result = chatService.getUserConversations("user-1");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("msg-1", result.get(0).getId());
        verify(repository, times(1)).findBySenderIdOrRecipientIdOrderByTimestampAsc("user-1", "user-1");
    }

    @Test
    void testGetUserConversationsFallback() {
        RuntimeException exception = new RuntimeException("Database down");

        List<ChatMessage> result = chatService.getUserConversationsFallback("user-1", exception);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }
}
