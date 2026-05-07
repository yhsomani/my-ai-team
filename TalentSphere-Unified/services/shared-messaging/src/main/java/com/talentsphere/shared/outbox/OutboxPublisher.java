package com.talentsphere.shared.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@ConditionalOnProperty(name = "talentsphere.outbox.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private final OutboxEventRepository repository;
    private final OutboxEventHandler handler;

    @Scheduled(fixedRateString = "${talentsphere.outbox.poll-interval-ms:1000}")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void pollAndPublish() {
        List<OutboxEvent> events = repository.findByStatusOrderByCreatedAtAsc(
                OutboxEvent.OutboxStatus.PENDING, 100);
        
        for (OutboxEvent event : events) {
            try {
                handler.handle(event);
                event.markPublished();
                repository.save(event);
                log.debug("Published outbox event: {}", event.getId());
            } catch (Exception e) {
                log.error("Failed to publish event {}: {}", event.getId(), e.getMessage());
                event.markFailed(e.getMessage());
                repository.save(event);
                
                if (event.getRetryCount() >= 3) {
                    log.error("Event {} exceeded max retries, marking as FAILED", event.getId());
                }
            }
        }
    }
}