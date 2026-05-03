package com.talentsphere.gamification.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "leaderboard")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LeaderboardEntry {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String userId;
  private String userName;
  private int totalXp;
  private int rank;
  private int level;
  private LocalDateTime lastUpdated;
}
