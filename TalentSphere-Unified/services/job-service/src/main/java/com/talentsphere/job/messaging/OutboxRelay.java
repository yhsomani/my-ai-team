package com.talentsphere.job.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.job.entity.OutboxEvent;
import com.talentsphere.job.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class OutboxRelay {
    private final OutboxRepository outboxRepository;
    private final JobEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void relayEvents() {
        List<OutboxEvent> pendingEvents = outboxRepository.findByProcessedFalseOrderByCreatedAtAsc();
        if (pendingEvents.isEmpty()) return;

        log.debug("Outbox Relay: Processing {} pending events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                Map<String, Object> payload = objectMapper.readValue(event.getPayload(), new TypeReference<Map<String, Object>>() {});
                
                if ("JOB_CREATED".equals(event.getEventType())) {
                    eventPublisher.publishJobCreated(payload);
                } else if ("RESOURCE_UPDATED".equals(event.getEventType())) {
                    eventPublisher.publishResourceUpdated(payload);
                }
                
                event.setProcessed(true);
                event.setProcessedAt(LocalDateTime.now());
                outboxRepository.save(event);
                
                log.info("Outbox Relay: Successfully relayed event {} for aggregate {}", event.getId(), event.getAggregateId());
            } catch (Exception e) {
                log.error("Outbox Relay: Failed to relay event {}: {}", event.getId(), e.getMessage());
                // Event remains unprocessed for next cycle
            }
        }
    }
}
