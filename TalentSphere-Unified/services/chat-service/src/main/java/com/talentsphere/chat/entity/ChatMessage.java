package com.talentsphere.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String senderId;
    private String recipientId; // Null for group/topic messages
    private String channelId;   // Group/Topic ID
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    private String type; // CHAT, JOIN, LEAVE, etc.
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
