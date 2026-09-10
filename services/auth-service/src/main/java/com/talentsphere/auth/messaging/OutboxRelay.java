package com.talentsphere.auth.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.auth.entity.OutboxEvent;
import com.talentsphere.auth.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
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
    private final AmqpTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void relayEvents() {
        List<OutboxEvent> pendingEvents = outboxRepository.findByProcessedFalseOrderByCreatedAtAsc();
        if (pendingEvents.isEmpty()) return;

        for (OutboxEvent event : pendingEvents) {
            try {
                Map<String, Object> payload = objectMapper.readValue(event.getPayload(), new TypeReference<Map<String, Object>>() {});
                
                if ("USER_REGISTERED".equals(event.getEventType())) {
                    rabbitTemplate.convertAndSend("auth.exchange", "user.registered", payload);
                }
                
                event.setProcessed(true);
                event.setProcessedAt(LocalDateTime.now());
                outboxRepository.save(event);
                
                log.info("Auth Outbox Relay: Relayed event {} for user {}", event.getId(), event.getAggregateId());
            } catch (Exception e) {
                log.error("Auth Outbox Relay: Failed to relay event {}: {}", event.getId(), e.getMessage());
            }
        }
    }
}
