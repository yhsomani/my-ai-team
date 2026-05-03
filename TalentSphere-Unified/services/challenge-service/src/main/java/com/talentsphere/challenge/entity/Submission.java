package com.talentsphere.challenge.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "submissions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Submission {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String challengeId;
  private String userId;
  private String language;
  
  @Column(columnDefinition = "TEXT")
  private String code;
  
  private String status; // PENDING, PASSED, FAILED
  private int score;
  private LocalDateTime submittedAt;
}
