package com.talentsphere.application.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "job_applications", 
    indexes = {
        @Index(name = "idx_job_app_user", columnList = "userId"),
        @Index(name = "idx_job_app_job", columnList = "jobId"),
        @Index(name = "idx_job_app_status", columnList = "status")
    },
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"jobId", "userId"}, name = "uk_job_user")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Getter @Setter
public class JobApplication {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  
  @Version
  private Long version;
  
  private String jobId;
  private String userId;
  private String status; // PENDING, REVIEWING, INTERVIEWING, OFFERED, REJECTED
  private LocalDateTime appliedAt;
  private String resumeUrl;
  private String coverLetter;
}
