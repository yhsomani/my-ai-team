package com.talentsphere.shared.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxService {

    private final OutboxEventRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publish(String aggregateType, String aggregateId, String eventType, Object payload) {
        OutboxEvent event = OutboxEvent.create(aggregateType, aggregateId, eventType, payload);
        repository.save(event);
        log.info("Created outbox event: {} for {} {}", eventType, aggregateType, aggregateId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishUserRegistered(String userId, String email, String name) {
        publish("User", userId, "USER_REGISTERED", Map.of(
                "userId", userId,
                "email", email,
                "name", name
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishJobCreated(String jobId, String title, String companyId) {
        publish("Job", jobId, "JOB_CREATED", Map.of(
                "jobId", jobId,
                "title", title,
                "companyId", companyId
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishPaymentCompleted(String sessionId, String userId, double amount) {
        publish("Payment", sessionId, "PAYMENT_COMPLETED", Map.of(
                "sessionId", sessionId,
                "userId", userId,
                "amount", amount
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishApplicationSubmitted(String applicationId, String jobId, String applicantId) {
        publish("Application", applicationId, "APPLICATION_SUBMITTED", Map.of(
                "applicationId", applicationId,
                "jobId", jobId,
                "applicantId", applicantId
        ));
    }
}