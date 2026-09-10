package com.talentsphere.auth.repository;

import com.talentsphere.auth.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OutboxRepository extends JpaRepository<OutboxEvent, String> {
    List<OutboxEvent> findByProcessedFalseOrderByCreatedAtAsc();
}
