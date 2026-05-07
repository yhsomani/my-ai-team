package com.talentsphere.shared.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {
    List<OutboxEvent> findByStatusOrderByCreatedAtAsc(OutboxEvent.OutboxStatus status, int limit);
    List<OutboxEvent> findByAggregateIdAndStatus(String aggregateId, OutboxEvent.OutboxStatus status);
}