package com.talentsphere.job.service;

import com.talentsphere.job.entity.OutboxEvent;
import com.talentsphere.job.repository.OutboxRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class OutboxPublisher {
    private final OutboxRepository outboxRepository;
    private final RabbitTemplate rabbitTemplate;
    private final Counter successCounter;
    private final Counter failureCounter;

    public OutboxPublisher(OutboxRepository outboxRepository,
                           RabbitTemplate rabbitTemplate,
                           MeterRegistry meterRegistry) {
        this.outboxRepository = outboxRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.successCounter = Counter.builder("outbox.publish.success")
                .description("Number of successfully published outbox events")
                .register(meterRegistry);
        this.failureCounter = Counter.builder("outbox.publish.failure")
                .description("Number of failed outbox event publications")
                .register(meterRegistry);
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void publishEvents() {
        List<OutboxEvent> pendingEvents = outboxRepository.findByProcessedFalseOrderByCreatedAtAsc();
        if (pendingEvents.isEmpty()) return;

        log.info("Processing {} pending outbox events", pendingEvents.size());

        List<OutboxEvent> successfullyProcessedEvents = new ArrayList<>();

        for (OutboxEvent event : pendingEvents) {
            try {
                // Determine routing key based on event type
                String routingKey = determineRoutingKey(event.getEventType());
                
                // Publish to RabbitMQ
                rabbitTemplate.convertAndSend("talentsphere.exchange", routingKey, event.getPayload());
                
                // Mark as processed
                event.setProcessed(true);
                event.setProcessedAt(LocalDateTime.now());
                successfullyProcessedEvents.add(event);
                
                successCounter.increment();
                log.info("Successfully published event {} to RabbitMQ", event.getEventType());
            } catch (Exception e) {
                failureCounter.increment();
                log.error("Failed to publish event {}: {}", event.getEventType(), e.getMessage());
                // In a real system, we would increment a retry count
            }
        }

        // Batch save the processed events
        if (!successfullyProcessedEvents.isEmpty()) {
            outboxRepository.saveAll(successfullyProcessedEvents);
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
