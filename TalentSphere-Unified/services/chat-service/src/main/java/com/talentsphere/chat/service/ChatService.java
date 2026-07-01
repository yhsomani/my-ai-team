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

    @SuppressWarnings("null")
    @CircuitBreaker(name = "chatPersistence", fallbackMethod = "saveMessageFallback")
    public ChatMessage saveMessage(ChatMessage message) {
        return repository.save(message);
    }

    public ChatMessage saveMessageFallback(ChatMessage message, Throwable t) {
        log.error("Chat persistence failure for channel {}: {}", message.getChannelId(), t.getMessage());
        throw new IllegalStateException("Chat message could not be persisted. Please retry.", t);
    }

    @CircuitBreaker(name = "chatHistory", fallbackMethod = "getChannelMessagesFallback")
    public List<ChatMessage> getChannelMessages(String channelId) {
        return repository.findByChannelIdOrderByTimestampAsc(channelId);
    }

    public List<ChatMessage> getChannelMessagesFallback(String channelId, Throwable t) {
        log.warn("Chat history unavailable for channel {}: {}. Returning cached messages.", channelId, t.getMessage());
        return Collections.emptyList();
    }

    @CircuitBreaker(name = "userConversations", fallbackMethod = "getUserConversationsFallback")
    public List<ChatMessage> getUserConversations(String userId) {
        return repository.findBySenderIdOrRecipientIdOrderByTimestampAsc(userId, userId);
    }

    public List<ChatMessage> getUserConversationsFallback(String userId, Throwable t) {
        log.warn("User conversations unavailable for user {}: {}", userId, t.getMessage());
        return Collections.emptyList();
    }
}
