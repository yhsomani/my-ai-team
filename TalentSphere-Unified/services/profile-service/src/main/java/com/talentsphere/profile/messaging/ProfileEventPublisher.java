package com.talentsphere.profile.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;

public interface ProfileEventPublisher {
    void publishProfileUpdated(Map<String, Object> event);
}

@Component
class ProfileEventPublisherImpl implements ProfileEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public ProfileEventPublisherImpl(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishProfileUpdated(Map<String, Object> event) {
        // Using "user.updated" as search-service expects "user.#" for profiles
        rabbitTemplate.convertAndSend("talentsphere.events", "user.updated", event);
    }
}
