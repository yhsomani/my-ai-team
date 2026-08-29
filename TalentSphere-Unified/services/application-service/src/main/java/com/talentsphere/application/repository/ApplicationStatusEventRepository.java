package com.talentsphere.application.repository;

import com.talentsphere.application.entity.ApplicationStatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationStatusEventRepository extends JpaRepository<ApplicationStatusEvent, String> {
  List<ApplicationStatusEvent> findByApplicationIdOrderByCreatedAtAsc(String applicationId);
}
