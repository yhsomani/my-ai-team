package com.talentsphere.challenge.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "submissions",
    indexes = {
        @Index(name = "idx_sub_challenge", columnList = "challengeId"),
        @Index(name = "idx_sub_user", columnList = "userId"),
        @Index(name = "idx_sub_status", columnList = "status"),
        @Index(name = "idx_sub_submitted", columnList = "submittedAt")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Submission {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Version
  private Long version;

  private String challengeId;
  private String userId;
  private String language;
  
  @Column(columnDefinition = "TEXT")
  private String code;
  
  private String status; // PENDING, PASSED, FAILED
  private int score;
  private LocalDateTime submittedAt;
}
