package com.talentsphere.user.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_profiles",
    indexes = {
        @Index(name = "idx_userprof_email", columnList = "email"),
        @Index(name = "idx_userprof_location", columnList = "location")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Version
  private Long version;

  @Column(unique = true, nullable = false)
  private String email;

  private String firstName;
  private String lastName;
  private String headline;
  private String bio;
  private String profilePictureUrl;
  private String location;
}
