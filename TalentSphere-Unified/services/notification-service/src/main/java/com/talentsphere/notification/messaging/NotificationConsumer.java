package com.talentsphere.notification.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {
    private final NotificationService service;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "notification.queue")
    public void consumeMessage(String message) {
        log.info("Received notification event: {}", message);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            
            String userId = (String) event.get("userId");
            String content = (String) event.get("content");
            String type = (String) event.get("type"); // INFO, SUCCESS, etc.

            if (userId != null && content != null) {
                service.createNotification(userId, content, type != null ? type : "INFO");
                log.info("Created notification for user: {}", userId);
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse notification event", e);
        }
    }
}
