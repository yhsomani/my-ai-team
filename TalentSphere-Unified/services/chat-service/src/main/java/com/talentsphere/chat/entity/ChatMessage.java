package com.talentsphere.chat.entity;

import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Document(collection = "chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @org.springframework.data.annotation.Id
    private String id;
    
    @Version
    private Long version;
    
    @Indexed
    private String senderId;
    
    @Indexed
    private String recipientId; // Null for group/topic messages
    
    @Indexed
    private String channelId;   // Group/Topic ID
    
    private String content;
    
    private String type; // CHAT, JOIN, LEAVE, etc.
    private LocalDateTime timestamp;

    public ChatMessage(String senderId, String recipientId, String channelId, String content, String type) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.channelId = channelId;
        this.content = content;
        this.type = type;
        this.timestamp = LocalDateTime.now();
    }
}
