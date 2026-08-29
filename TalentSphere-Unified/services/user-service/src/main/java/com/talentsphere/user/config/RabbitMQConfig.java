package com.talentsphere.user.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "talentsphere.exchange";
    public static final String QUEUE_USER_CREATED = "user.created.queue";
    public static final String ROUTING_KEY_USER_CREATED = "user.created";

    // DLQ Configuration
    public static final String DLX_NAME = "talentsphere.dlx";
    public static final String DLQ_USER_CREATED = "user.created.dlq";
    public static final String ROUTING_KEY_DLQ = "user.created.dead";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX_NAME);
    }

    @Bean
    public Queue userCreatedQueue() {
        return QueueBuilder.durable(QUEUE_USER_CREATED)
                .withArgument("x-dead-letter-exchange", DLX_NAME)
                .withArgument("x-dead-letter-routing-key", ROUTING_KEY_DLQ)
                .build();
    }

    @Bean
    public Queue userCreatedDLQ() {
        return new Queue(DLQ_USER_CREATED, true);
    }

    @Bean
    public Binding bindingUserCreated(@org.springframework.beans.factory.annotation.Qualifier("userCreatedQueue") Queue userCreatedQueue, @org.springframework.beans.factory.annotation.Qualifier("exchange") DirectExchange exchange) {
        return BindingBuilder.bind(userCreatedQueue).to(exchange).with(ROUTING_KEY_USER_CREATED);
    }

    @Bean
    public Binding bindingDLQ(@org.springframework.beans.factory.annotation.Qualifier("userCreatedDLQ") Queue userCreatedDLQ, @org.springframework.beans.factory.annotation.Qualifier("deadLetterExchange") DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(userCreatedDLQ).to(deadLetterExchange).with(ROUTING_KEY_DLQ);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
