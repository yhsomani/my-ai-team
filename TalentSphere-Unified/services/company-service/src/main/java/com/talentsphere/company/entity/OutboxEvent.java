package com.talentsphere.company.entity;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "outbox_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {
    @Id
    private String id;

    private String aggregateId;

    private String aggregateType;

    private String eventType;

    private String payload;

    @CreatedDate
    private LocalDateTime createdAt;

    private boolean processed;
    private LocalDateTime processedAt;
}
