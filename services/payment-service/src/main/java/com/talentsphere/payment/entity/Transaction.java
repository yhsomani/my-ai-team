package com.talentsphere.payment.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "transactions",
    indexes = {
        @Index(name = "idx_txn_user", columnList = "userId"),
        @Index(name = "idx_txn_session", columnList = "sessionId"),
        @Index(name = "idx_txn_status", columnList = "status"),
        @Index(name = "idx_txn_created", columnList = "createdAt")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Version
    private Long version;

    private String userId;
    private String sessionId;
    private double amount;
    private String currency;
    private String status; // PENDING, COMPLETED, FAILED
    private String description;
    private LocalDateTime createdAt;
}
