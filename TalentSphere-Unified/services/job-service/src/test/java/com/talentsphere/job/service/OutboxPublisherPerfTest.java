package com.talentsphere.job.service;

import com.talentsphere.job.entity.OutboxEvent;
import com.talentsphere.job.repository.OutboxRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherPerfTest {

    @Mock
    private OutboxRepository outboxRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    private MeterRegistry meterRegistry = new SimpleMeterRegistry();

    private OutboxPublisher outboxPublisher;

    private List<OutboxEvent> mockEvents;
    private static final int BATCH_SIZE = 1000;

    @BeforeEach
    void setUp() {
        outboxPublisher = new OutboxPublisher(outboxRepository, rabbitTemplate, meterRegistry);
        mockEvents = new ArrayList<>();
        for (int i = 0; i < BATCH_SIZE; i++) {
            mockEvents.add(OutboxEvent.builder()
                    .id(UUID.randomUUID())
                    .aggregateId("agg-" + i)
                    .aggregateType("JOB")
                    .eventType("JOB_CREATED")
                    .payload("{\"test\":\"data\"}")
                    .processed(false)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
    }

    @Test
    void testPerformance() {
        when(outboxRepository.findByProcessedFalseOrderByCreatedAtAsc()).thenReturn(mockEvents);

        long startTime = System.currentTimeMillis();

        outboxPublisher.publishEvents();

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        System.out.println("=================================================");
        System.out.println("Performance Optimized Test Results");
        System.out.println("Processing " + BATCH_SIZE + " events took: " + duration + "ms");
        System.out.println("=================================================");

        // Verify saveAll was called exactly once
        verify(outboxRepository, times(1)).saveAll(any());
        // Verify individual saves were not called
        verify(outboxRepository, never()).save(any());
    }
}
