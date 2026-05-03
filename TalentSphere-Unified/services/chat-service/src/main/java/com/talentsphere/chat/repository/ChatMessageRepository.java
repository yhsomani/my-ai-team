package com.talentsphere.chat.repository;

import com.talentsphere.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByChannelIdOrderByTimestampAsc(String channelId);
    List<ChatMessage> findBySenderIdOrRecipientIdOrderByTimestampAsc(String senderId, String recipientId);
}
