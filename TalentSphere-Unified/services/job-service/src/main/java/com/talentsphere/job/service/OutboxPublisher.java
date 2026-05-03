package com.talentsphere.job.service;

import com.talentsphere.job.entity.OutboxEvent;
import com.talentsphere.job.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class OutboxPublisher {
    private final OutboxRepository outboxRepository;
    private final RabbitTemplate rabbitTemplate;

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void publishEvents() {
        List<OutboxEvent> pendingEvents = outboxRepository.findByProcessedFalseOrderByCreatedAtAsc();
        if (pendingEvents.isEmpty()) return;

        log.info("Processing {} pending outbox events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                // Determine routing key based on event type
                String routingKey = determineRoutingKey(event.getEventType());
                
                // Publish to RabbitMQ
                rabbitTemplate.convertAndSend("talentsphere.exchange", routingKey, event.getPayload());
                
                // Mark as processed
                event.setProcessed(true);
                event.setProcessedAt(LocalDateTime.now());
                outboxRepository.save(event);
                
                log.info("Successfully published event {} to RabbitMQ", event.getEventType());
            } catch (Exception e) {
                log.error("Failed to publish event {}: {}", event.getEventType(), e.getMessage());
                // In a real system, we would increment a retry count
            }
        }
    }

    private String determineRoutingKey(String eventType) {
        return switch (eventType) {
            case "JOB_CREATED" -> "job.created";
            case "RESOURCE_UPDATED" -> "resource.updated";
            default -> "misc.event";
        };
    }
}
