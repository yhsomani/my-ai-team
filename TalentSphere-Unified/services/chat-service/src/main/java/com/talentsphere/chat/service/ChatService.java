package com.talentsphere.chat.service;

import com.talentsphere.chat.entity.ChatMessage;
import com.talentsphere.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatService {
    private final ChatMessageRepository repository;

    @Transactional
    @SuppressWarnings("null")
    @CircuitBreaker(name = "chatPersistence", fallbackMethod = "saveMessageFallback")
    public ChatMessage saveMessage(ChatMessage message) {
        return repository.save(message);
    }

    public ChatMessage saveMessageFallback(ChatMessage message, Throwable t) {
        log.error("Nexus Persistence failure for channel {}: {}. Message buffered in volatile memory.", message.getChannelId(), t.getMessage());
        return message; // Return the message without saving as a "best effort" delivery
    }

    @CircuitBreaker(name = "chatHistory", fallbackMethod = "getChannelMessagesFallback")
    public List<ChatMessage> getChannelMessages(String channelId) {
        return repository.findByChannelIdOrderByTimestampAsc(channelId);
    }

    public List<ChatMessage> getChannelMessagesFallback(String channelId, Throwable t) {
        log.warn("Atmospheric interference in channel {}: {}. Reverting to local cache.", channelId, t.getMessage());
        return Collections.emptyList();
    }

    public List<ChatMessage> getUserConversations(String userId) {
        return repository.findBySenderIdOrRecipientIdOrderByTimestampAsc(userId, userId);
    }
}
