package com.talentsphere.challenge.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "challenges")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Challenge {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String category;
  private String difficulty;
  private int xpReward;

  @Column(columnDefinition = "TEXT")
  private String starterCode;

  @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
  @JoinColumn(name = "challenge_id")
  private List<TestCase> testCases;
}
