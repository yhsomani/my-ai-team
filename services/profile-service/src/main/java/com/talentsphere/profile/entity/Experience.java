package com.talentsphere.profile.entity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "experiences")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Experience {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String userId;
  private String company;
  private String title;
  private String location;
  private LocalDate startDate;
  private LocalDate endDate;
  private boolean current;
  private String description;
  @CreatedDate
  private LocalDateTime createdAt;
}
