package com.talentsphere.gamification.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "leaderboard",
    indexes = {
        @Index(name = "idx_lb_user", columnList = "userId"),
        @Index(name = "idx_lb_totalxp", columnList = "totalXp"),
        @Index(name = "idx_lb_rank", columnList = "rank")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LeaderboardEntry {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Version
  private Long version;

  private String userId;
  private String userName;
  private int totalXp;
  private int rank;
  private int level;
  private LocalDateTime lastUpdated;
}
