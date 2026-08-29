package com.talentsphere.job.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

public interface JobEventPublisher {
    void publishJobCreated(Map<String, Object> event);
    void publishResourceUpdated(Map<String, Object> event);
}

@Component
class JobEventPublisherImpl implements JobEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public JobEventPublisherImpl(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishJobCreated(Map<String, Object> event) {
        rabbitTemplate.convertAndSend("talentsphere.events", "job.created", event);
    }

    @Override
    public void publishResourceUpdated(Map<String, Object> event) {
        String resourceType = (String) event.getOrDefault("resourceType", "unknown");
        rabbitTemplate.convertAndSend("talentsphere.events", "resource.updated." + resourceType.toLowerCase(), event);
    }
}
