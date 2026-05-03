package com.talentsphere.messaging.service;

import com.talentsphere.messaging.entity.Message;
import com.talentsphere.messaging.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessagingService {
    private final MessageRepository repository;

    @Transactional
    public Message sendMessage(String senderId, String receiverId, String content) {
        Message message = Message.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .build();
        return repository.save(message);
    }

    public List<Message> getConversation(String user1, String user2) {
        return repository.findConversation(user1, user2);
    }

    public Long getUnreadCount(String userId) {
        return repository.countByReceiverIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(String user1, String user2) {
        List<Message> messages = repository.findConversation(user1, user2);
        messages.forEach(m -> {
            if (m.getReceiverId().equals(user1)) {
                m.setRead(true);
            }
        });
        repository.saveAll(messages);
    }
}
