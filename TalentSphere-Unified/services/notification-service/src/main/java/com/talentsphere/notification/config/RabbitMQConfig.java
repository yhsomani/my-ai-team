package com.talentsphere.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "talentsphere.events";
    public static final String QUEUE = "notification.queue";
    public static final String ROUTING_KEY_PATTERN = "*.submitted";
    public static final String ROUTING_KEY_CHALLENGE = "challenge.passed";
    public static final String ROUTING_KEY_LMS = "course.completed";

    public static final String DLX = "talentsphere.dlx";
    public static final String DLQ = "notification.dlq";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX);
    }

    @Bean
    public Queue deadLetterQueue() {
        return new Queue(DLQ, true);
    }

    @Bean
    public Queue queue() {
        return QueueBuilder.durable(QUEUE)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", "notification.error")
                .build();
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with("notification.error");
    }

    @Bean
    public Binding bindingApplication(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("application.#");
    }

    @Bean
    public Binding bindingChallenge(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("challenge.#");
    }

    @Bean
    public Binding bindingLMS(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("course.#");
    }

    @Bean
    public Binding bindingGamification(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("gamification.#");
    }
}
