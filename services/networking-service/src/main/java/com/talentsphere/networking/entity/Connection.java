package com.talentsphere.networking.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "connections", 
    indexes = {
        @Index(name = "idx_conn_requester", columnList = "requester_id"),
        @Index(name = "idx_conn_receiver", columnList = "receiver_id"),
        @Index(name = "idx_conn_status", columnList = "status")
    },
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"requester_id", "receiver_id"})
    })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Connection {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Version
    private Long version;
    
    @Column(name = "requester_id")
    private String requesterId;
    
    @Column(name = "receiver_id")
    private String receiverId;
    
    @Enumerated(EnumType.STRING)
    private ConnectionStatus status; // PENDING, ACCEPTED, BLOCKED
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ConnectionStatus {
        PENDING, ACCEPTED, BLOCKED
    }
}
