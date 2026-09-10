package com.talentsphere.notification.messaging;

import com.talentsphere.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class XPEchoConsumer {

    private final NotificationService notificationService;

    @RabbitListener(queues = "notification.queue")
    public void consumeXPEcho(Map<String, Object> payload) {
        log.info("Intercepted Neural Signal: {}", payload);
        
        String type = (String) payload.get("type");
        if ("gamification.xp.added".equals(type)) {
            String userId = (String) payload.get("userId");
            Integer amount = (Integer) payload.get("amount");
            String reason = (String) payload.get("reason");
            
            String message = String.format("XP Echo: +%d XP synthesized [%s]. Your resonance is stabilizing.", 
                amount, reason != null ? reason : "Architectural Mastery");
            
            notificationService.createNotification(userId, message, "XP_ECHO");
            log.info("Neural Notification Synthesized for Node {}", userId);
        }
    }
}
