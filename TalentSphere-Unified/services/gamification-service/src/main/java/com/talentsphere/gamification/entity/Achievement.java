package com.talentsphere.gamification.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "achievements")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Achievement {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String userId;
  private String title;
  private String description;
  private String iconUrl;
  private LocalDateTime unlockedAt;
}
