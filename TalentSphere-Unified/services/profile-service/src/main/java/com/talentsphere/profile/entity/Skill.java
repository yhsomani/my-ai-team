package com.talentsphere.profile.entity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import java.time.LocalDateTime;

@Entity @Table(name = "skills")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Skill {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String userId;
  private String name;
  private String level;
  private String category;
  private int proficiency;
  @CreatedDate
  private LocalDateTime createdAt;
}
