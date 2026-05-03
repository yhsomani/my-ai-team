package com.talentsphere.user.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_profiles")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(unique = true, nullable = false)
  private String email;

  private String firstName;
  private String lastName;
  private String headline;
  private String bio;
  private String profilePictureUrl;
  private String location;
}
