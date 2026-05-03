package com.talentsphere.payment.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "transactions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String userId;
    private String sessionId;
    private double amount;
    private String currency;
    private String status; // PENDING, COMPLETED, FAILED
    private String description;
    private LocalDateTime createdAt;
}
