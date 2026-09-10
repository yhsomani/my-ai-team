package com.talentsphere.messaging.repository;

import com.talentsphere.messaging.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {
    
    @Query("SELECT m FROM Message m WHERE (m.senderId = :user1 AND m.receiverId = :user2) OR (m.senderId = :user2 AND m.receiverId = :user1) ORDER BY m.timestamp ASC")
    List<Message> findConversation(String user1, String user2);
    
    List<Message> findByReceiverIdAndIsReadFalse(String receiverId);
    
    Long countByReceiverIdAndIsReadFalse(String receiverId);
}
