package com.talentsphere.job.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs",
    indexes = {
        @Index(name = "idx_job_company", columnList = "companyId"),
        @Index(name = "idx_job_location", columnList = "location"),
        @Index(name = "idx_job_posted", columnList = "postedAt"),
        @Index(name = "idx_job_active", columnList = "active")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Job {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Version
  private Long version;

  private String companyId;
  private String companyName;
  private String companyLogoUrl;
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String location;
  private String jobType;
  private BigDecimal salaryMin;
  private BigDecimal salaryMax;
  private String currency;
  private LocalDateTime postedAt;
  
  @Builder.Default
  private boolean active = true;
}
