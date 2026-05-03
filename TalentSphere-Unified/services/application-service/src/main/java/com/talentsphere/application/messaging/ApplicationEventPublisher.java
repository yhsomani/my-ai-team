package com.talentsphere.application.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

public interface ApplicationEventPublisher {
    void publishApplicationSubmitted(Map<String, Object> event);
}

@Component
class ApplicationEventPublisherImpl implements ApplicationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public ApplicationEventPublisherImpl(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishApplicationSubmitted(Map<String, Object> event) {
        rabbitTemplate.convertAndSend("talentsphere.events", "application.submitted", event);
    }
}
