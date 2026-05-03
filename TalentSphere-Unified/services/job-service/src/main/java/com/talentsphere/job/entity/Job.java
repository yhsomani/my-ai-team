package com.talentsphere.job.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Job {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

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
