package com.talentsphere.company.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

public interface CompanyEventPublisher {
    void publishResourceUpdated(Map<String, Object> event);
}

@Component
class CompanyEventPublisherImpl implements CompanyEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public CompanyEventPublisherImpl(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishResourceUpdated(Map<String, Object> event) {
        String resourceType = (String) event.getOrDefault("resourceType", "unknown");
        rabbitTemplate.convertAndSend("talentsphere.events", "resource.updated." + resourceType.toLowerCase(), event);
    }
}
