package com.talentsphere.shared.outbox;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;


@Entity
@Table(name = "outbox_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String eventType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private OutboxStatus status;

    @Column
    private Integer retryCount;

    @Column
    private String lastError;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime publishedAt;

    public enum OutboxStatus {
        PENDING,
        PUBLISHED,
        FAILED
    }

    public static OutboxEvent create(String aggregateType, String aggregateId, String eventType, Object payload) {
        return OutboxEvent.builder()
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(toJson(payload))
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .build();
    }

    private static String toJson(Object obj) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize outbox event", e);
        }
    }

    public void markPublished() {
        this.status = OutboxStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
    }

    public void markFailed(String error) {
        this.status = OutboxStatus.FAILED;
        this.lastError = error;
        this.retryCount = (this.retryCount == null ? 0 : this.retryCount) + 1;
    }
}