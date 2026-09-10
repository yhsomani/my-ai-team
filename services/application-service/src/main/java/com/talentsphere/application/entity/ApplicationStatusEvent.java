package com.talentsphere.application.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "application_status_events",
    indexes = {
        @Index(name = "idx_app_status_event_application", columnList = "applicationId"),
        @Index(name = "idx_app_status_event_created", columnList = "createdAt")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationStatusEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String applicationId;
  private String previousStatus;
  private String status;
  private String changedBy;

  @Column(columnDefinition = "TEXT")
  private String reason;

  private LocalDateTime createdAt;

  @PrePersist
  public void prePersist() {
    if (createdAt == null) {
      createdAt = LocalDateTime.now();
    }
  }
}
