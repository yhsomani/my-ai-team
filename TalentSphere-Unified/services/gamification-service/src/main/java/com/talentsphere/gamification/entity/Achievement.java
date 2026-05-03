package com.talentsphere.gamification.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "achievements",
    indexes = {
        @Index(name = "idx_ach_user", columnList = "userId"),
        @Index(name = "idx_ach_unlocked", columnList = "unlockedAt")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Achievement {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Version
  private Long version;

  private String userId;
  private String title;
  private String description;
  private String iconUrl;
  private LocalDateTime unlockedAt;
}
