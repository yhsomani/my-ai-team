package com.talentsphere.shared.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String TALENTSPHERE_EXCHANGE = "talentsphere.events";
    public static final String DLX_EXCHANGE = "talentsphere.dlx";
    
    public static final String DEAD_LETTER_QUEUE = "talentsphere.dead-letter";
    public static final String DEAD_LETTER_ROUTING_KEY = "dead-letter";

    @Bean
    public TopicExchange talentsphereExchange() {
        return new TopicExchange(TALENTSPHERE_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX_EXCHANGE, true, false);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE)
            .withArgument("x-dead-letter-exchange", TALENTSPHERE_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", DEAD_LETTER_ROUTING_KEY)
            .build();
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder
            .bind(deadLetterQueue())
            .to(deadLetterExchange())
            .with(DEAD_LETTER_ROUTING_KEY);
    }

    public static Queue createQueueWithDLQ(String queueName, String routingKey) {
        return QueueBuilder.durable(queueName)
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", routingKey)
            .withArgument("x-message-ttl", 86400000)
            .build();
    }

    public static Binding createBinding(Queue queue, TopicExchange exchange, String routingKey) {
        return BindingBuilder
            .bind(queue)
            .to(exchange)
            .with(routingKey);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        template.setExchange(TALENTSPHERE_EXCHANGE);
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        factory.setDefaultRequeueRejected(false);
        factory.setPrefetchCount(10);
        return factory;
    }
}