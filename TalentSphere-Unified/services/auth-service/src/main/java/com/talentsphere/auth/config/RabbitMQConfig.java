package com.talentsphere.auth.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "talentsphere.events";
    public static final String TOPIC_EXCHANGE = "talentsphere.events";
    public static final String QUEUE_USER_CREATED = "user.created.queue";
    public static final String ROUTING_KEY_USER_CREATED = "user.created";
    public static final String QUEUE_NOTIFICATION = "notification.queue";
    public static final String ROUTING_KEY_NOTIFICATION = "notification.#";
    public static final String QUEUE_SEARCH_JOB = "search.job.queue";
    public static final String ROUTING_KEY_JOB_CREATED = "job.created";

    @Bean
    public TopicExchange talentsphereExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, true);
    }

    @Bean
    public Queue userCreatedQueue() {
        return new Queue(QUEUE_USER_CREATED, true);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(QUEUE_NOTIFICATION, true);
    }

    @Bean
    public Queue searchJobQueue() {
        return QueueBuilder.durable(QUEUE_SEARCH_JOB).build();
    }

    @Bean
    public Binding bindingUserCreated() {
        return BindingBuilder.bind(userCreatedQueue()).to(talentsphereExchange()).with(ROUTING_KEY_USER_CREATED);
    }

    @Bean
    public Binding bindingNotification() {
        return BindingBuilder.bind(notificationQueue()).to(talentsphereExchange()).with(ROUTING_KEY_NOTIFICATION);
    }

    @Bean
    public Binding bindingSearchJob() {
        return BindingBuilder.bind(searchJobQueue()).to(talentsphereExchange()).with(ROUTING_KEY_JOB_CREATED);
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
