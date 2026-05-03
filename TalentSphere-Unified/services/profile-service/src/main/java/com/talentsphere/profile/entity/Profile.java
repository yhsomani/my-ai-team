package com.talentsphere.profile.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.Version;

import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "profiles",
    indexes = {
        @Index(name = "idx_profile_user", columnList = "userId"),
        @Index(name = "idx_profile_location", columnList = "location")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String fullName;
    private String headline;
    private String bio;
    private String location;
    private String website;
    private String githubUrl;
    private String linkedinUrl;
    private String avatarUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Version
    private Long version;

    @PrePersist
    @PreUpdate
    private void validateTemporalData() {
        if (dateOfBirth != null) {
            if (dateOfBirth.isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Date of birth cannot be in the future");
            }
            if (dateOfBirth.isBefore(LocalDate.now().minus(150, ChronoUnit.YEARS))) {
                throw new IllegalArgumentException("Date of birth cannot be more than 150 years ago");
            }
        }
    }

    public int getAge() {
        if (dateOfBirth == null) return 0;
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }
}