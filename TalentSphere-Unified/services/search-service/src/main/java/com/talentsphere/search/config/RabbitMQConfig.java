package com.talentsphere.search.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "talentsphere.events";
    public static final String JOB_QUEUE = "search.job.queue";
    public static final String PROFILE_QUEUE = "search.profile.queue";
    
    public static final String DLX = "talentsphere.dlx";
    public static final String JOB_DLQ = "search.job.dlq";
    public static final String PROFILE_DLQ = "search.profile.dlq";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX);
    }

    @Bean
    public Queue jobQueue() {
        return QueueBuilder.durable(JOB_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", "search.job.error")
                .build();
    }

    @Bean
    public Queue profileQueue() {
        return QueueBuilder.durable(PROFILE_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", "search.profile.error")
                .build();
    }

    @Bean
    public Queue jobDLQ() {
        return new Queue(JOB_DLQ, true);
    }

    @Bean
    public Queue profileDLQ() {
        return new Queue(PROFILE_DLQ, true);
    }

    @Bean
    public Binding bindingJob(Queue jobQueue, TopicExchange exchange) {
        return BindingBuilder.bind(jobQueue).to(exchange).with("job.#");
    }

    @Bean
    public Binding bindingProfile(Queue profileQueue, TopicExchange exchange) {
        return BindingBuilder.bind(profileQueue).to(exchange).with("user.#");
    }

    @Bean
    public Binding jobDLQBinding(Queue jobDLQ, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(jobDLQ).to(deadLetterExchange).with("search.job.error");
    }

    @Bean
    public Binding profileDLQBinding(Queue profileDLQ, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(profileDLQ).to(deadLetterExchange).with("search.profile.error");
    }

    @Bean
    public org.springframework.amqp.support.converter.MessageConverter jsonMessageConverter() {
        return new org.springframework.amqp.support.converter.Jackson2JsonMessageConverter();
    }
}
