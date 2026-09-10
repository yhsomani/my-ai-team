package com.talentsphere.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "talentsphere.events";
    public static final String NOTIFICATION_QUEUE = "notification.queue";
    public static final String CHALLENGE_QUEUE = "challenge.queue";

    @Bean
    public TopicExchange eventExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Queue challengeQueue() {
        return new Queue(CHALLENGE_QUEUE, true);
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(notificationQueue).to(eventExchange).with("notification.#");
    }

    @Bean
    public Binding challengeBinding(Queue challengeQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(challengeQueue).to(eventExchange).with("challenge.#");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
