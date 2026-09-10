package com.talentsphere.chat.repository;

import com.talentsphere.chat.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByChannelIdOrderByTimestampAsc(String channelId);
    List<ChatMessage> findBySenderIdOrRecipientIdOrderByTimestampAsc(String senderId, String recipientId);
}
