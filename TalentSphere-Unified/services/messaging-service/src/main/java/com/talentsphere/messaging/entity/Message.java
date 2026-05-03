package com.talentsphere.messaging.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages",
    indexes = {
        @Index(name = "idx_msg_sender", columnList = "senderId"),
        @Index(name = "idx_msg_receiver", columnList = "receiverId"),
        @Index(name = "idx_msg_timestamp", columnList = "timestamp")
    })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Version
    private Long version;
    
    private String senderId;
    private String receiverId;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    private boolean isRead;
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
        isRead = false;
    }
}
