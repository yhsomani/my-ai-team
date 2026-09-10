package com.talentsphere.messaging.service;

import com.talentsphere.messaging.entity.Message;
import com.talentsphere.messaging.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class MessagingService {
    private final MessageRepository repository;

    @Transactional
    @CircuitBreaker(name = "messagePersistence", fallbackMethod = "sendMessageFallback")
    public Message sendMessage(String senderId, String receiverId, String content) {
        Message message = Message.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .build();
        return repository.save(message);
    }

    public Message sendMessageFallback(String senderId, String receiverId, String content, Throwable t) {
        log.error("Message persistence failed for sender {} to receiver {}: {}", senderId, receiverId, t.getMessage());
        throw new IllegalStateException("Message could not be persisted. Please retry.", t);
    }

    @CircuitBreaker(name = "conversationHistory", fallbackMethod = "getConversationFallback")
    public List<Message> getConversation(String user1, String user2) {
        return repository.findConversation(user1, user2);
    }

    public List<Message> getConversationFallback(String user1, String user2, Throwable t) {
        log.warn("Conversation history unavailable for users {} and {}: {}", user1, user2, t.getMessage());
        return List.of();
    }

    @CircuitBreaker(name = "unreadCount", fallbackMethod = "getUnreadCountFallback")
    public Long getUnreadCount(String userId) {
        return repository.countByReceiverIdAndIsReadFalse(userId);
    }

    public Long getUnreadCountFallback(String userId, Throwable t) {
        log.warn("Unread count unavailable for user {}: {}", userId, t.getMessage());
        return 0L;
    }

    @Transactional
    @CircuitBreaker(name = "markAsRead", fallbackMethod = "markAsReadFallback")
    public void markAsRead(String user1, String user2) {
        List<Message> messages = repository.findConversation(user1, user2);
        messages.forEach(m -> {
            if (m.getReceiverId().equals(user1)) {
                m.setRead(true);
            }
        });
        repository.saveAll(messages);
    }

    public void markAsReadFallback(String user1, String user2, Throwable t) {
        log.warn("Failed to mark messages as read for users {} and {}: {}", user1, user2, t.getMessage());
        throw new IllegalStateException("Message read state could not be persisted. Please retry.", t);
    }
}
