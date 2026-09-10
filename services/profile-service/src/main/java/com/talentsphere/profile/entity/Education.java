package com.talentsphere.profile.entity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "educations")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Education {
  @Id @GeneratedValue(strategy = GenerationType.UUID)
  private String id;
  private String userId;
  private String institution;
  private String degree;
  private String fieldOfStudy;
  private LocalDate startDate;
  private LocalDate endDate;
  private String description;
  @CreatedDate
  private LocalDateTime createdAt;
}
